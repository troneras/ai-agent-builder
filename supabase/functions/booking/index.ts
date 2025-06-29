import { createClient } from "@supabase/supabase-js";
import { SquareBookingsActions } from "../_shared/bookings-actions.ts";
import { NangoService } from "../_shared/nango-service.ts";
import { isSquareProduction } from "../_shared/square-config.ts";
import { getSquareAccessToken } from "../_shared/square-auth-utils.ts";
import {
  createCorsResponse,
  createErrorResponse,
  createInternalErrorResponse,
  createSuccessResponse,
} from "../_shared/response-utils.ts";

interface FindAvailableTimesRequest {
  action: "findAvailableTimesForService";
  serviceId: string;
  variationId: string;
  merchantId: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  locationId?: string;
  preferredTeamMemberId?: string;
}

interface BookAppointmentRequest {
  action: "bookAppointment";
  serviceId: string;
  variationId: string;
  serviceVariationVersion: number;
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

type BookingRequest = FindAvailableTimesRequest | BookAppointmentRequest;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse("Missing authorization header", 401);
    }

    // Initialize Supabase client and Nango service
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const nangoSecretKey = Deno.env.get("NANGO_SECRET_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const nangoService = new NangoService(
      nangoSecretKey,
      supabaseUrl,
      supabaseServiceKey,
    );

    // Verify the user token and get user info
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );

    if (authError || !user) {
      return createErrorResponse("Invalid authorization token", 401);
    }

    // Parse the request body
    const requestData: BookingRequest = await req.json();

    // Get Square access token using shared utility
    let squareConnection;
    try {
      squareConnection = await getSquareAccessToken(
        user.id,
        supabase,
        nangoService,
      );
    } catch (error) {
      return createErrorResponse(
        error instanceof Error
          ? error.message
          : "Failed to get Square connection",
        400,
      );
    }

    // Initialize the Square Bookings Actions service
    const useSandbox = !isSquareProduction();
    const bookingsActions = new SquareBookingsActions(
      squareConnection.accessToken,
      supabase,
      user.id,
      useSandbox,
    );

    let result;

    // Handle different actions
    switch (requestData.action) {
      case "findAvailableTimesForService":
        result = await bookingsActions.findAvailableTimesForService({
          serviceId: requestData.serviceId,
          variationId: requestData.variationId,
          merchantId: requestData.merchantId,
          startDate: requestData.startDate,
          endDate: requestData.endDate,
          locationId: requestData.locationId,
          preferredTeamMemberId: requestData.preferredTeamMemberId,
        });
        break;

      case "bookAppointment":
        result = await bookingsActions.bookAppointment({
          serviceId: requestData.serviceId,
          variationId: requestData.variationId,
          serviceVariationVersion: requestData.serviceVariationVersion,
          merchantId: requestData.merchantId,
          selectedTime: requestData.selectedTime,
          locationId: requestData.locationId,
          firstName: requestData.firstName,
          lastName: requestData.lastName,
          email: requestData.email,
          phone: requestData.phone,
          teamMemberId: requestData.teamMemberId,
          notes: requestData.notes,
        });
        break;

      default:
        return createErrorResponse("Invalid action specified", 400);
    }

    return createSuccessResponse({
      success: true,
      data: result,
      action: requestData.action,
    });
  } catch (error) {
    console.error("Booking function error:", error);
    return createInternalErrorResponse(error);
  }
});
