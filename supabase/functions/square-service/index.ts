/*
  # Square Service

  This service handles Square API interactions:
  1. Fetches business data from Square
  2. Retrieves locations, items, and other business information
  3. Uses Nango connection credentials for authentication
  4. Stores fetched data in Supabase for the AI phone system

  ## Security
  - Uses Nango connection credentials
  - Validates data before storage
  - Implements proper error handling
*/

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NangoService } from "../_shared/nango-service.ts";
import {
  SquareBusinessInfo,
  SquareService,
} from "../_shared/square-service.ts";
import {
  createCorsResponse,
  createErrorResponse,
  createInternalErrorResponse,
  createSuccessResponse,
} from "../_shared/response-utils.ts";
import {
  getSquareProviderConfigKey,
  isSquareProduction,
} from "../_shared/square-config.ts";

// Type definitions
interface RequestBody {
  action: "fetch_business_data";
  userId: string;
  connectionId?: string;
}

// Utility functions

// Helper to get Square service from Nango connection
async function getSquareService(
  nangoService: NangoService,
  connectionId: string,
): Promise<SquareService> {
  try {
    const connectionInfo = await nangoService.getConnection(
      connectionId,
      getSquareProviderConfigKey(),
    );

    return new SquareService(
      connectionInfo.credentials.access_token,
      !isSquareProduction(),
    ); // true for sandbox, false for production
  } catch (error) {
    console.error("Error getting Square service:", error);
    throw new Error(
      `Failed to get Square service: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

// Convert SquareBusinessInfo to database storage format
function formatBusinessDataForStorage(
  businessInfo: SquareBusinessInfo,
) {
  const locations = businessInfo.locations?.map((location) => ({
    id: location.id,
    name: location.name || "",
    address: location.address
      ? {
        address_line_1: location.address.addressLine1,
        address_line_2: location.address.addressLine2,
        locality: location.address.locality,
        administrative_district_level_1:
          location.address.administrativeDistrictLevel1,
        postal_code: location.address.postalCode,
        country: location.address.country,
      }
      : undefined,
    phone_number: location.phoneNumber,
    business_hours: location.businessHours?.periods
      ? {
        periods: location.businessHours.periods.map((period) => ({
          day_of_week: period.dayOfWeek,
          start_local_time: period.startLocalTime || "",
          end_local_time: period.endLocalTime || "",
        })),
      }
      : undefined,
  })) || [];

  // Extract services from catalog
  const services = SquareService.extractServices(businessInfo.catalog);

  // Convert services to items format (simplified)
  const items = services.map((serviceName, index) => ({
    id: `service_${index}`,
    name: serviceName,
    description: undefined,
    categories: [],
    variations: [{
      id: `var_${index}`,
      name: "Standard",
      pricing_type: "FIXED_PRICING",
      price_money: undefined,
    }],
  }));

  return {
    locations,
    items,
    categories: [],
    merchant: businessInfo.merchant,
    catalog: businessInfo.catalog,
  };
}

// Helper to fetch business data using SquareService
async function fetchSquareBusinessData(
  squareService: SquareService,
): Promise<SquareBusinessInfo> {
  try {
    const businessInfo = await squareService.getBusinessInformation();
    return businessInfo;
  } catch (error) {
    console.error("Error fetching Square business data:", error);
    throw new Error(
      `Failed to fetch Square data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

// Helper to store business data in Supabase
async function storeBusinessData(
  supabaseClient: SupabaseClient,
  userId: string,
  businessInfo: SquareBusinessInfo,
): Promise<void> {
  try {
    const formattedData = formatBusinessDataForStorage(businessInfo);

    // Store locations
    if (formattedData.locations.length > 0) {
      const primaryLocation = formattedData.locations[0];

      if (primaryLocation) {
        await supabaseClient
          .from("user_profiles")
          .update({
            business_data: {
              ...formattedData,
              primary_location: {
                id: primaryLocation.id,
                name: primaryLocation.name,
                address: primaryLocation.address,
                phone_number: primaryLocation.phone_number,
                business_hours: primaryLocation.business_hours,
              },
              square_data: {
                locations: formattedData.locations,
                items: formattedData.items,
                categories: formattedData.categories,
                last_sync: new Date().toISOString(),
              },
            },
          })
          .eq("id", userId);
      }
    }

    console.log("Business data stored successfully");
  } catch (error) {
    console.error("Error storing business data:", error);
    throw new Error(
      `Failed to store business data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const nangoSecretKey = Deno.env.get("NANGO_SECRET_KEY");

    if (!supabaseUrl || !supabaseKey || !nangoSecretKey) {
      return createErrorResponse("Missing required environment variables", 500);
    }

    // Initialize clients
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const nangoService = new NangoService(
      nangoSecretKey,
      supabaseUrl,
      supabaseKey,
    );

    // Parse and validate request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON in request body");
    }

    const { action, userId, connectionId } = body;

    if (!userId) {
      return createErrorResponse("User ID is required");
    }

    if (action === "fetch_business_data") {
      try {
        // Get the user's Square connection
        let connectionIdToUse = connectionId;

        if (!connectionIdToUse) {
          const { data: connection } = await supabaseClient
            .from("connections")
            .select("connection_id")
            .eq("user_id", userId)
            .eq("status", "active")
            .single();

          if (!connection) {
            return createErrorResponse(
              "No active Square connection found for user",
              404,
            );
          }

          connectionIdToUse = connection.connection_id;
        }

        // Ensure we have a valid connection ID
        if (!connectionIdToUse) {
          return createErrorResponse(
            "No valid connection ID available",
            400,
          );
        }

        // Get Square service
        const squareService = await getSquareService(
          nangoService,
          connectionIdToUse,
        );

        // Fetch business data
        const businessInfo = await fetchSquareBusinessData(squareService);

        // Store the data
        await storeBusinessData(supabaseClient, userId, businessInfo);

        // Update connection last sync time
        await supabaseClient
          .from("connections")
          .update({
            last_sync_at: new Date().toISOString(),
          })
          .eq("connection_id", connectionIdToUse);

        const formattedData = formatBusinessDataForStorage(businessInfo);

        return createSuccessResponse({
          success: true,
          message: "Business data fetched and stored successfully",
          data: {
            locations_count: formattedData.locations.length,
            items_count: formattedData.items.length,
            categories_count: formattedData.categories.length,
          },
        });
      } catch (error) {
        console.error("Error in fetch_business_data:", error);
        return createErrorResponse(
          `Failed to fetch business data: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          500,
        );
      }
    }

    return createErrorResponse("Invalid action");
  } catch (error: unknown) {
    console.error("Error in square-service function:", error);
    return createInternalErrorResponse(error);
  }
});
