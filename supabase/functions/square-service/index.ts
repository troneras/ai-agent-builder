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
import { Nango } from "@nangohq/node";
import {
  SquareBusinessInfo,
  SquareService,
} from "../_shared/square-service.ts";

// Constants
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
} as const;

// Test mode flag - set to true to use mock data
const TEST_MODE = Deno.env.get("TEST_MODE") === "true";

// Type definitions
interface SquareBusinessData {
  locations: Array<{
    id: string;
    name: string;
    address?: {
      address_line_1?: string;
      address_line_2?: string;
      locality?: string;
      administrative_district_level_1?: string;
      postal_code?: string;
      country?: string;
    };
    phone_number?: string;
    business_hours?: {
      periods: Array<{
        day_of_week: string;
        start_local_time: string;
        end_local_time: string;
      }>;
    };
  }>;
  items: Array<{
    id: string;
    name: string;
    description?: string;
    categories: Array<{
      id: string;
      name: string;
    }>;
    variations: Array<{
      id: string;
      name: string;
      pricing_type: string;
      price_money?: {
        amount: number;
        currency: string;
      };
    }>;
  }>;
  categories: Array<{
    id: string;
    name: string;
  }>;
}

interface RequestBody {
  action: "fetch_business_data" | "test_data";
  userId: string;
  connectionId?: string;
}

interface NangoCredentials {
  access_token: string;
}

// Utility functions
function createErrorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function createSuccessResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Helper to get Square service from Nango connection
async function getSquareService(
  nango: Nango,
  connectionId: string,
): Promise<SquareService> {
  try {
    const connection = await nango.getConnection(
      connectionId,
      "squareup-sandbox",
    );

    if (!connection || !connection.credentials) {
      throw new Error("No valid connection credentials found");
    }

    const credentials = connection.credentials as NangoCredentials;
    return new SquareService(credentials.access_token, true); // true for sandbox
  } catch (error) {
    console.error("Error getting Square service:", error);
    throw new Error(
      `Failed to get Square service: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

// Convert SquareBusinessInfo to our expected format
function convertBusinessInfo(
  businessInfo: SquareBusinessInfo,
): SquareBusinessData {
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
  };
}

// Mock data for testing
function getMockBusinessData(): SquareBusinessData {
  return {
    locations: [
      {
        id: "LOCATION_1",
        name: "Test Restaurant",
        address: {
          address_line_1: "123 Test Street",
          address_line_2: "Suite 100",
          locality: "Test City",
          administrative_district_level_1: "CA",
          postal_code: "12345",
          country: "US",
        },
        phone_number: "+1-555-123-4567",
        business_hours: {
          periods: [
            {
              day_of_week: "MONDAY",
              start_local_time: "09:00",
              end_local_time: "17:00",
            },
            {
              day_of_week: "TUESDAY",
              start_local_time: "09:00",
              end_local_time: "17:00",
            },
          ],
        },
      },
    ],
    items: [
      {
        id: "ITEM_1",
        name: "Margherita Pizza",
        description: "Classic tomato and mozzarella pizza",
        categories: [{ id: "CAT_1", name: "Pizza" }],
        variations: [
          {
            id: "VAR_1",
            name: "Regular",
            pricing_type: "FIXED_PRICING",
            price_money: {
              amount: 1500,
              currency: "USD",
            },
          },
          {
            id: "VAR_2",
            name: "Large",
            pricing_type: "FIXED_PRICING",
            price_money: {
              amount: 2000,
              currency: "USD",
            },
          },
        ],
      },
      {
        id: "ITEM_2",
        name: "Caesar Salad",
        description: "Fresh romaine lettuce with Caesar dressing",
        categories: [{ id: "CAT_2", name: "Salads" }],
        variations: [
          {
            id: "VAR_3",
            name: "Regular",
            pricing_type: "FIXED_PRICING",
            price_money: {
              amount: 1200,
              currency: "USD",
            },
          },
        ],
      },
    ],
    categories: [
      { id: "CAT_1", name: "Pizza" },
      { id: "CAT_2", name: "Salads" },
    ],
  };
}

// Helper to fetch business data using SquareService
async function fetchSquareBusinessData(
  squareService: SquareService,
): Promise<SquareBusinessData> {
  try {
    if (TEST_MODE) {
      console.log("🧪 Running in TEST_MODE - using mock Square data");
      return getMockBusinessData();
    }

    const businessInfo = await squareService.getBusinessInformation();
    return convertBusinessInfo(businessInfo);
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
  businessData: SquareBusinessData,
): Promise<void> {
  try {
    // Store locations
    if (businessData.locations.length > 0) {
      const primaryLocation = businessData.locations[0];

      if (primaryLocation) {
        await supabaseClient
          .from("user_profiles")
          .update({
            business_data: {
              ...businessData,
              primary_location: {
                id: primaryLocation.id,
                name: primaryLocation.name,
                address: primaryLocation.address,
                phone_number: primaryLocation.phone_number,
                business_hours: primaryLocation.business_hours,
              },
              square_data: {
                locations: businessData.locations,
                items: businessData.items,
                categories: businessData.categories,
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
    return new Response(null, { headers: CORS_HEADERS });
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
    const nango = new Nango({ secretKey: nangoSecretKey });

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

        if (!connectionIdToUse && !TEST_MODE) {
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

        // Get Square service (or use mock in test mode)
        let squareService: SquareService;
        if (TEST_MODE) {
          squareService = new SquareService("test-token", true);
        } else {
          squareService = await getSquareService(nango, connectionIdToUse!);
        }

        // Fetch business data
        const businessData = await fetchSquareBusinessData(squareService);

        // Store the data
        await storeBusinessData(supabaseClient, userId, businessData);

        // Update connection last sync time (skip in test mode)
        if (!TEST_MODE && connectionIdToUse) {
          await supabaseClient
            .from("connections")
            .update({
              last_sync_at: new Date().toISOString(),
            })
            .eq("connection_id", connectionIdToUse);
        }

        return createSuccessResponse({
          success: true,
          message: TEST_MODE
            ? "Test data fetched and stored successfully"
            : "Business data fetched and stored successfully",
          test_mode: TEST_MODE,
          data: {
            locations_count: businessData.locations.length,
            items_count: businessData.items.length,
            categories_count: businessData.categories.length,
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

    if (action === "test_data") {
      // Test endpoint that returns mock data without storing
      try {
        const mockService = new SquareService("test-token", true);
        const businessData = await fetchSquareBusinessData(mockService);

        return createSuccessResponse({
          success: true,
          message: "Test data generated successfully",
          test_mode: true,
          data: businessData,
        });
      } catch (error) {
        console.error("Error in test_data:", error);
        return createErrorResponse(
          `Failed to generate test data: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          500,
        );
      }
    }

    return createErrorResponse("Invalid action");
  } catch (error: unknown) {
    console.error("Error in square-service function:", error);

    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
