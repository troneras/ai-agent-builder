import {
  CreateBookingRequest,
  SearchAvailabilityRequest,
  SquareAppointmentsService,
  SquareAvailability,
} from "./square-bookings-service.ts";
import { MerchantDataService } from "./merchant-service.ts";
import { SupabaseClient } from "@supabase/supabase-js";

export interface BookingSearchRequest {
  serviceName: string;
  merchantId: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  locationId?: string;
  preferredTeamMemberId?: string;
}

export interface BookingCreateRequest {
  serviceName: string;
  merchantId: string;
  selectedTime: string; // ISO 8601 timestamp
  locationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  teamMemberId?: string;
  notes?: string;
}

export interface AvailableTimeSlot {
  startTime: string;
  endTime: string;
  duration: number;
  serviceVariationId: string;
  teamMemberId: string;
  teamMemberName?: string;
  locationId: string;
}

export interface BookingResult {
  bookingId: string;
  orderNumber?: string;
  startTime: string;
  serviceName: string;
  teamMemberName?: string;
  locationName?: string;
  customerName: string;
  status: string;
  confirmationDetails: {
    bookingId: string;
    startTime: string;
    endTime: string;
    service: string;
    location: string;
    teamMember?: string;
    customerInfo: {
      name: string;
      email?: string;
      phone?: string;
    };
  };
}

export class SquareBookingsActions {
  private appointmentsService: SquareAppointmentsService;
  private merchantService: MerchantDataService;
  private userId: string;

  constructor(
    accessToken: string,
    supabaseClient: SupabaseClient,
    userId: string,
    useSandbox = false,
  ) {
    this.appointmentsService = new SquareAppointmentsService(
      accessToken,
      useSandbox,
    );
    this.merchantService = new MerchantDataService(supabaseClient);
    this.userId = userId;
  }

  /**
   * Find available appointment times for a specific service
   */
  async findAvailableTimesForService(
    request: BookingSearchRequest,
  ): Promise<AvailableTimeSlot[]> {
    try {
      // Get service from stored merchant data
      const service = await this.merchantService.findServiceByName(
        this.userId,
        request.serviceName,
      );

      if (!service) {
        throw new Error(`Service "${request.serviceName}" not found`);
      }

      // Get the first bookable variation
      const bookableVariation = service.variations?.find(
        (variation) => variation.is_bookable === true,
      );

      if (!bookableVariation) {
        throw new Error(
          `No bookable variations found for service "${request.serviceName}"`,
        );
      }

      // Use specified location or get primary location
      let locationId = request.locationId;
      if (!locationId) {
        const primaryLocation = await this.merchantService.getPrimaryLocation(
          this.userId,
        );
        locationId = primaryLocation?.id;
      }

      if (!locationId) {
        throw new Error("No location available for booking");
      }

      // Create date range for search
      const startAtMin = `${request.startDate}T00:00:00Z`;
      const startAtMax = `${request.endDate}T23:59:59Z`;

      // Build search request
      const searchRequest: SearchAvailabilityRequest = {
        startAtMin,
        startAtMax,
        locationId,
        segmentFilters: [
          {
            serviceVariationId: bookableVariation.id,
            ...(request.preferredTeamMemberId && {
              teamMemberIdFilter: {
                // any: [request.preferredTeamMemberId],
                all: ["TME9AA7n6dOcqI_S"], // TODO: Just for the demo
              },
            }),
          },
        ],
      };

      // Search for availability
      const availabilities = await this.appointmentsService.searchAvailability(
        searchRequest,
      );

      // Convert to time slots
      return this.convertAvailabilitiesToTimeSlots(
        availabilities,
        bookableVariation.duration_minutes || 60,
      );
    } catch (error) {
      console.error("Error finding available times:", error);
      throw new Error(
        `Failed to find available times: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Create a new appointment booking
   */
  async bookAppointment(
    request: BookingCreateRequest,
  ): Promise<BookingResult> {
    try {
      // Get service from stored merchant data
      const service = await this.merchantService.findServiceByName(
        this.userId,
        request.serviceName,
      );

      if (!service) {
        throw new Error(`Service "${request.serviceName}" not found`);
      }

      // Get the first bookable variation
      const bookableVariation = service.variations?.find(
        (variation) => variation.is_bookable === true,
      );

      if (!bookableVariation) {
        throw new Error(
          `No bookable variations found for service "${request.serviceName}"`,
        );
      }

      // Use a default team member if not specified (this would need to be fetched from team API in real implementation)
      const teamMemberId = request.teamMemberId || "TME9AA7n6dOcqI_S"; // TODO: Just for the demo

      // Create booking request
      const createRequest: CreateBookingRequest = {
        booking: {
          startAt: this.ensureISOFormat(request.selectedTime),
          locationId: request.locationId,
          appointmentSegments: [
            {
              durationMinutes: bookableVariation.duration_minutes || 60,
              serviceVariationId: bookableVariation.id,
              teamMemberId: teamMemberId,
            },
          ],
          customerNote: request.notes,
          sellerNote:
            `Booking created for ${request.firstName} ${request.lastName}`,
        },
      };

      // Create the booking
      const booking = await this.appointmentsService.createBooking(
        createRequest,
      );

      // Get location from stored merchant data
      const locations = await this.merchantService.getMerchantLocations(
        this.userId,
      );
      const location = locations.find(
        (loc) => loc.id === request.locationId,
      );

      // Build result
      const result: BookingResult = {
        bookingId: booking.id || "",
        orderNumber: undefined, // Not available in simplified booking interface
        startTime: booking.startAt || request.selectedTime,
        serviceName: service.name,
        teamMemberName: "Staff Member", // Would be fetched from team API in real implementation
        locationName: location?.name || "Main Location",
        customerName: `${request.firstName} ${request.lastName}`,
        status: booking.status || "CONFIRMED",
        confirmationDetails: {
          bookingId: booking.id || "",
          startTime: booking.startAt || request.selectedTime,
          endTime: this.calculateEndTime(
            booking.startAt || request.selectedTime,
            bookableVariation.duration_minutes || 60,
          ),
          service: service.name,
          location: location?.name || "Main Location",
          teamMember: "Staff Member",
          customerInfo: {
            name: `${request.firstName} ${request.lastName}`,
            email: request.email,
            phone: request.phone,
          },
        },
      };

      return result;
    } catch (error) {
      console.error("Error booking appointment:", error);
      throw new Error(
        `Failed to book appointment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Get available dates for a service within a date range
   */
  async getAvailableDatesForService(
    serviceName: string,
    merchantId: string,
    startDate: string,
    endDate: string,
    locationId?: string,
  ): Promise<string[]> {
    try {
      const availableSlots = await this.findAvailableTimesForService({
        serviceName,
        merchantId,
        startDate,
        endDate,
        locationId,
      });

      // Extract unique dates
      const uniqueDates = new Set<string>();
      availableSlots.forEach((slot) => {
        const date = new Date(slot.startTime).toISOString().split("T")[0];
        uniqueDates.add(date);
      });

      return Array.from(uniqueDates).sort();
    } catch (error) {
      console.error("Error getting available dates:", error);
      throw new Error(
        `Failed to get available dates: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Get available time slots for a specific date
   */
  async getAvailableTimesForDate(
    serviceName: string,
    merchantId: string,
    date: string, // YYYY-MM-DD
    locationId?: string,
  ): Promise<AvailableTimeSlot[]> {
    return this.findAvailableTimesForService({
      serviceName,
      merchantId,
      startDate: date,
      endDate: date,
      locationId,
    });
  }

  /**
   * Convert Square availability objects to time slots
   */
  private convertAvailabilitiesToTimeSlots(
    availabilities: SquareAvailability[],
    defaultDuration: number,
  ): AvailableTimeSlot[] {
    return availabilities.map((availability) => {
      const duration = availability.appointmentSegments[0]?.durationMinutes ||
        defaultDuration;

      return {
        startTime: availability.startAt,
        endTime: this.calculateEndTime(availability.startAt, duration),
        duration,
        serviceVariationId:
          availability.appointmentSegments[0]?.serviceVariationId || "",
        teamMemberId: availability.appointmentSegments[0]?.teamMemberId || "",
        teamMemberName: "Available Staff", // Would be fetched from team API in real implementation
        locationId: availability.locationId,
      };
    });
  }

  /**
   * Calculate end time based on start time and duration
   */
  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return endDate.toISOString();
  }

  /**
   * Ensure time is in ISO format
   */
  private ensureISOFormat(time: string): string {
    const date = new Date(time);
    return date.toISOString();
  }

  /**
   * Format available times for display
   */
  static formatTimeSlots(slots: AvailableTimeSlot[]): string[] {
    return slots.map((slot) => {
      const startTime = new Date(slot.startTime);
      const endTime = new Date(slot.endTime);

      const timeFormat = {
        hour: "2-digit" as const,
        minute: "2-digit" as const,
      };

      const startFormatted = startTime.toLocaleTimeString([], timeFormat);
      const endFormatted = endTime.toLocaleTimeString([], timeFormat);

      return `${startFormatted} - ${endFormatted}`;
    });
  }

  /**
   * Check if a specific time slot is available
   */
  static isTimeSlotAvailable(
    slots: AvailableTimeSlot[],
    targetTime: string,
  ): boolean {
    return slots.some((slot) => slot.startTime === targetTime);
  }

  /**
   * Get the next available appointment slot
   */
  async getNextAvailableSlot(
    serviceName: string,
    merchantId: string,
    locationId?: string,
  ): Promise<AvailableTimeSlot | null> {
    try {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const startDate = today.toISOString().split("T")[0];
      const endDate = nextWeek.toISOString().split("T")[0];

      const availableSlots = await this.findAvailableTimesForService({
        serviceName,
        merchantId,
        startDate,
        endDate,
        locationId,
      });

      // Return the earliest available slot
      if (availableSlots.length > 0) {
        return availableSlots.sort((a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )[0];
      }

      return null;
    } catch (error) {
      console.error("Error getting next available slot:", error);
      return null;
    }
  }
}
