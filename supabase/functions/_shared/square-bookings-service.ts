import { Square, SquareClient, SquareEnvironment } from "square";

export interface SquareAvailability {
  startAt: string; // RFC 3339 timestamp
  locationId: string;
  appointmentSegments: SquareAppointmentSegment[];
}

export interface SquareAppointmentSegment {
  durationMinutes: number;
  serviceVariationId: string;
  teamMemberId: string;
  serviceVariationVersion?: number;
  intermissionMinutes?: number;
  anyTeamMember?: boolean;
  resourceIds?: string[];
}

export interface SquareBooking {
  id?: string;
  version?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  startAt?: string;
  locationId?: string;
  orderNumber?: string;
  note?: string;
  customerId?: string;
  customerNote?: string;
  sellerNote?: string;
  appointmentSegments?: SquareAppointmentSegment[];
  transitionTimeMinutes?: number;
  allDay?: boolean;
  locationType?: string;
}

export interface SearchAvailabilityRequest {
  startAtMin: string; // RFC 3339 timestamp
  startAtMax: string; // RFC 3339 timestamp
  locationId?: string;
  segmentFilters?: Array<{
    serviceVariationId: string;
    teamMemberIdFilter?: {
      any?: string[];
      all?: string[];
      none?: string[];
    };
  }>;
}

export interface CreateBookingRequest {
  booking: {
    startAt: string;
    locationId: string;
    appointmentSegments: Array<{
      durationMinutes: number;
      serviceVariationId: string;
      teamMemberId: string;
    }>;
    customerId?: string;
    customerNote?: string;
    sellerNote?: string;
  };
}

export class SquareAppointmentsService {
  private client: SquareClient;

  constructor(accessToken: string, useSandbox = false) {
    this.client = new SquareClient({
      token: accessToken,
      environment: useSandbox
        ? SquareEnvironment.Sandbox
        : SquareEnvironment.Production,
    });
  }

  /**
   * Search for available appointment slots
   */
  async searchAvailability(
    request: SearchAvailabilityRequest,
  ): Promise<SquareAvailability[]> {
    try {
      const result = await this.client.bookings.searchAvailability({
        query: {
          filter: {
            startAtRange: {
              startAt: request.startAtMin,
              endAt: request.startAtMax,
            },
            locationId: request.locationId,
            segmentFilters: request.segmentFilters?.map((filter) => ({
              serviceVariationId: filter.serviceVariationId,
              teamMemberIdFilter: filter.teamMemberIdFilter,
            })),
          },
        },
      });

      if (result.availabilities) {
        return result.availabilities.map((
          availability: Square.Availability,
        ) => ({
          startAt: availability.startAt || "",
          locationId: availability.locationId || "",
          appointmentSegments: availability.appointmentSegments?.map(
            (segment: Square.AppointmentSegment) => ({
              durationMinutes: segment.durationMinutes || 0,
              serviceVariationId: segment.serviceVariationId || "",
              teamMemberId: segment.teamMemberId || "",
              serviceVariationVersion: segment.serviceVariationVersion
                ? Number(segment.serviceVariationVersion)
                : undefined,
              intermissionMinutes: segment.intermissionMinutes,
              anyTeamMember: segment.anyTeamMember,
              resourceIds: segment.resourceIds,
            }),
          ) || [],
        }));
      }

      return [];
    } catch (error) {
      console.error("Error searching availability:", error);
      throw new Error(
        `Failed to search availability: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(request: CreateBookingRequest): Promise<SquareBooking> {
    try {
      const result = await this.client.bookings.create({
        booking: {
          startAt: request.booking.startAt,
          locationId: request.booking.locationId,
          appointmentSegments: request.booking.appointmentSegments.map(
            (segment) => ({
              durationMinutes: segment.durationMinutes,
              serviceVariationId: segment.serviceVariationId,
              teamMemberId: segment.teamMemberId,
            }),
          ),
          customerId: request.booking.customerId,
          customerNote: request.booking.customerNote,
          sellerNote: request.booking.sellerNote,
        },
      });

      if (result.booking) {
        return this.mapBookingFromSquare(result.booking);
      }

      throw new Error("No booking returned from Square API");
    } catch (error) {
      console.error("Error creating booking:", error);
      throw new Error(
        `Failed to create booking: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Retrieve a booking by ID
   */
  async getBooking(bookingId: string): Promise<SquareBooking | null> {
    try {
      const result = await this.client.bookings.get({
        bookingId: bookingId,
      });

      if (result.booking) {
        return this.mapBookingFromSquare(result.booking);
      }

      return null;
    } catch (error) {
      console.error("Error retrieving booking:", error);
      throw new Error(
        `Failed to retrieve booking: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Update an existing booking
   */
  async updateBooking(
    bookingId: string,
    booking: Partial<CreateBookingRequest["booking"]>,
    version: number,
  ): Promise<SquareBooking> {
    try {
      const result = await this.client.bookings.update({
        bookingId: bookingId,
        booking: {
          version,
          ...booking,
        },
      });

      if (result.booking) {
        return this.mapBookingFromSquare(result.booking);
      }

      throw new Error("No booking returned from Square API");
    } catch (error) {
      console.error("Error updating booking:", error);
      throw new Error(
        `Failed to update booking: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    bookingId: string,
    version: number,
  ): Promise<SquareBooking> {
    try {
      const result = await this.client.bookings.cancel({
        bookingId: bookingId,
        bookingVersion: version,
        idempotencyKey: crypto.randomUUID(),
      });

      if (result.booking) {
        return this.mapBookingFromSquare(result.booking);
      }

      throw new Error("No booking returned from Square API");
    } catch (error) {
      console.error("Error canceling booking:", error);
      throw new Error(
        `Failed to cancel booking: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * List bookings with optional filters (single page)
   */
  async listBookings(options?: {
    locationId?: string;
    startAtMin?: string;
    startAtMax?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    bookings: SquareBooking[];
    cursor?: string;
    hasNextPage: boolean;
  }> {
    try {
      const bookingsPager = await this.client.bookings.list({
        locationId: options?.locationId,
        startAtMin: options?.startAtMin,
        startAtMax: options?.startAtMax,
        cursor: options?.cursor,
        limit: options?.limit,
      });

      // Get current page data
      const bookings = bookingsPager.data?.map((booking) =>
        this.mapBookingFromSquare(booking)
      ) || [];

      return {
        bookings,
        cursor: undefined, // Cursor is managed internally by the pager
        hasNextPage: bookingsPager.hasNextPage(),
      };
    } catch (error) {
      console.error("Error listing bookings:", error);
      throw new Error(
        `Failed to list bookings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * List all bookings with automatic pagination
   * Uses the for await pattern from the Square SDK guide
   */
  async listAllBookings(options?: {
    locationId?: string;
    startAtMin?: string;
    startAtMax?: string;
    limit?: number;
  }): Promise<SquareBooking[]> {
    try {
      const allBookings: SquareBooking[] = [];

      const bookingsPager = await this.client.bookings.list({
        locationId: options?.locationId,
        startAtMin: options?.startAtMin,
        startAtMax: options?.startAtMax,
        limit: options?.limit,
      });

      // Use the for await pattern recommended in the Square SDK guide
      for await (const booking of bookingsPager) {
        allBookings.push(this.mapBookingFromSquare(booking));
      }

      return allBookings;
    } catch (error) {
      console.error("Error listing all bookings:", error);
      throw new Error(
        `Failed to list all bookings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Get next page of bookings from a pager
   */
  async getNextBookingsPage(
    bookingsPager: Awaited<ReturnType<typeof this.client.bookings.list>>,
  ): Promise<{
    bookings: SquareBooking[];
    cursor?: string;
    hasNextPage: boolean;
  }> {
    try {
      if (!bookingsPager.hasNextPage()) {
        return {
          bookings: [],
          cursor: undefined,
          hasNextPage: false,
        };
      }

      const nextPage = await bookingsPager.getNextPage();

      const bookings = nextPage.data?.map((booking: Square.Booking) =>
        this.mapBookingFromSquare(booking)
      ) || [];

      return {
        bookings,
        cursor: undefined, // Cursor is managed internally by the pager
        hasNextPage: nextPage.hasNextPage(),
      };
    } catch (error) {
      console.error("Error getting next bookings page:", error);
      throw new Error(
        `Failed to get next bookings page: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Map Square booking object to our interface
   */
  private mapBookingFromSquare(booking: Square.Booking): SquareBooking {
    return {
      id: booking.id,
      version: booking.version,
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      startAt: booking.startAt || "",
      locationId: booking.locationId || "",
      customerId: booking.customerId || "",
      customerNote: booking.customerNote || "",
      sellerNote: booking.sellerNote || "",
      appointmentSegments: booking.appointmentSegments?.map((segment) => ({
        durationMinutes: segment.durationMinutes || 0,
        serviceVariationId: segment.serviceVariationId || "",
        teamMemberId: segment.teamMemberId || "",
        serviceVariationVersion: segment.serviceVariationVersion
          ? Number(segment.serviceVariationVersion)
          : undefined,
        intermissionMinutes: segment.intermissionMinutes,
        anyTeamMember: segment.anyTeamMember,
        resourceIds: segment.resourceIds,
      })),
      transitionTimeMinutes: booking.transitionTimeMinutes,
      allDay: booking.allDay,
      locationType: booking.locationType,
    };
  }

  /**
   * Format availability time slots for display
   */
  static formatAvailabilitySlots(
    availabilities: SquareAvailability[],
  ): string[] {
    return availabilities.map((availability) => {
      const date = new Date(availability.startAt);
      const timeString = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateString = date.toLocaleDateString();

      return `${dateString} at ${timeString}`;
    });
  }

  /**
   * Check if a time slot is available
   */
  static isTimeSlotAvailable(
    availabilities: SquareAvailability[],
    targetTime: string,
  ): boolean {
    return availabilities.some((availability) =>
      availability.startAt === targetTime
    );
  }
}
