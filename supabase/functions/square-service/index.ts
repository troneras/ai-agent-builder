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
import { Square, SquareClient, SquareEnvironment } from "square";

// Constants
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
} as const;

// Test mode flag - set to true to use mock data
const TEST_MODE = Deno.env.get("TEST_MODE") === "true";

// Mock Square data for testing
const MOCK_SQUARE_DATA = {
  locations: [
    {
      id: "LOCATION_1",
      name: "Test Restaurant",
      address: {
        addressLine1: "123 Test Street",
        addressLine2: "Suite 100",
        locality: "Test City",
        administrativeDistrictLevel1: "CA",
        postalCode: "12345",
        country: "US",
      },
      phoneNumber: "+1-555-123-4567",
      businessHours: {
        periods: [
          {
            dayOfWeek: "MONDAY",
            startLocalTime: "09:00",
            endLocalTime: "17:00",
          },
          {
            dayOfWeek: "TUESDAY",
            startLocalTime: "09:00",
            endLocalTime: "17:00",
          },
        ],
      },
    },
  ],
  catalogObjects: [
    {
      id: "ITEM_1",
      type: "ITEM",
      itemData: {
        name: "Margherita Pizza",
        descriptionHtml: "<p>Classic tomato and mozzarella pizza</p>",
        categories: [{ categoryId: "CAT_1" }],
        variations: [
          {
            id: "VAR_1",
            type: "ITEM_VARIATION",
            itemVariationData: {
              name: "Regular",
              pricingType: "FIXED_PRICING",
              priceMoney: {
                amount: 1500,
                currency: "USD",
              },
            },
          },
          {
            id: "VAR_2",
            type: "ITEM_VARIATION",
            itemVariationData: {
              name: "Large",
              pricingType: "FIXED_PRICING",
              priceMoney: {
                amount: 2000,
                currency: "USD",
              },
            },
          },
        ],
      },
    },
    {
      id: "ITEM_2",
      type: "ITEM",
      itemData: {
        name: "Caesar Salad",
        descriptionHtml: "<p>Fresh romaine lettuce with Caesar dressing</p>",
        categories: [{ categoryId: "CAT_2" }],
        variations: [
          {
            id: "VAR_3",
            type: "ITEM_VARIATION",
            itemVariationData: {
              name: "Regular",
              pricingType: "FIXED_PRICING",
              priceMoney: {
                amount: 1200,
                currency: "USD",
              },
            },
          },
        ],
      },
    },
    {
      id: "CAT_1",
      type: "CATEGORY",
      categoryData: {
        name: "Pizza",
      },
    },
    {
      id: "CAT_2",
      type: "CATEGORY",
      categoryData: {
        name: "Salads",
      },
    },
  ],
};

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
    category?: {
      id: string;
      name: string;
    };
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

// Helper to get Square client from Nango connection
async function getSquareClient(
  nango: Nango,
  connectionId: string
): Promise<SquareClient> {
  try {
    // Get the connection details from Nango
    const connection = await nango.getConnection(
      connectionId,
      "squareup-sandbox"
    );

    if (!connection || !connection.credentials) {
      throw new Error("No valid connection credentials found");
    }

    // Create Square client with the access token
    const client = new SquareClient({
      token: (connection.credentials as any).access_token,
      environment: SquareEnvironment.Sandbox, // Change to Production for live
    });

    return client;
  } catch (error) {
    console.error("Error getting Square client:", error);
    throw new Error(
      `Failed to get Square client: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// --- Type Guards for Square CatalogObject ---
function isCatalogItem(
  obj: Square.CatalogObject
): obj is Square.CatalogObject & { itemData: Square.CatalogItem } {
  return obj.type === "ITEM" && !!obj.itemData;
}
function isCatalogCategory(
  obj: Square.CatalogObject
): obj is Square.CatalogObject & { categoryData: Square.CatalogCategory } {
  return obj.type === "CATEGORY" && !!obj.categoryData;
}
function isCatalogItemVariation(
  obj: Square.CatalogObject
): obj is Square.CatalogObject & {
  itemVariationData: Square.CatalogItemVariation;
} {
  return obj.type === "ITEM_VARIATION" && !!obj.itemVariationData;
}

// Helper to fetch business data from Square
async function fetchSquareBusinessData(
  squareClient: SquareClient
): Promise<SquareBusinessData> {
  try {
    let locations: any[] = [];
    let catalogObjects: Square.CatalogObject[] = [];

    if (TEST_MODE) {
      console.log("🧪 Running in TEST_MODE - using mock Square data");
      locations = MOCK_SQUARE_DATA.locations;
      catalogObjects =
        MOCK_SQUARE_DATA.catalogObjects as Square.CatalogObject[];
    } else {
      // Fetch locations
      const locationsResponse = await squareClient.locations.list();
      locations = locationsResponse.locations || [];

      // Fetch catalog objects
      const catalogResponse = await squareClient.catalog.list({
        types: "ITEM,CATEGORY,ITEM_VARIATION",
      });
      catalogObjects = catalogResponse.data || [];
    }

    // Filter items and categories
    const items = catalogObjects.filter(isCatalogItem);
    const categories = catalogObjects.filter(isCatalogCategory);

    console.log(
      `📊 Processing ${items.length} items and ${categories.length} categories`
    );

    return {
      locations: locations.map((location) => ({
        id: location.id!,
        name: location.name!,
        address: location.address
          ? {
              address_line_1: location.address.addressLine1 || undefined,
              address_line_2: location.address.addressLine2 || undefined,
              locality: location.address.locality || undefined,
              administrative_district_level_1:
                location.address.administrativeDistrictLevel1 || undefined,
              postal_code: location.address.postalCode || undefined,
              country: location.address.country || undefined,
            }
          : undefined,
        phone_number: location.phoneNumber || undefined,
        business_hours: location.businessHours?.periods
          ? {
              periods: location.businessHours.periods.map(
                (period: {
                  dayOfWeek: string;
                  startLocalTime: string;
                  endLocalTime: string;
                }) => ({
                  day_of_week: period.dayOfWeek!,
                  start_local_time: period.startLocalTime!,
                  end_local_time: period.endLocalTime!,
                })
              ),
            }
          : undefined,
      })),
      items: items.map((item) => ({
        id: item.id!,
        name: item.itemData.name ?? "",
        description: item.itemData.descriptionHtml ?? undefined,
        categories:
          item.itemData.categories?.map((cat: any) => ({
            id: cat.categoryId,
            name:
              categories.find((c) => c.id === cat.categoryId)?.categoryData
                ?.name ?? "Unknown",
          })) ?? [],
        variations: (item.itemData.variations ?? [])
          .filter(isCatalogItemVariation)
          .map(
            (
              variation: Square.CatalogObject & {
                itemVariationData: Square.CatalogItemVariation;
              }
            ) => ({
              id: variation.id!,
              name: variation.itemVariationData.name ?? "",
              pricing_type: variation.itemVariationData.pricingType ?? "",
              price_money: variation.itemVariationData.priceMoney
                ? {
                    amount: Number(
                      variation.itemVariationData.priceMoney.amount
                    ),
                    currency:
                      variation.itemVariationData.priceMoney.currency ?? "",
                  }
                : undefined,
            })
          ),
      })),
      categories: categories.map((category) => ({
        id: category.id!,
        name: category.categoryData.name ?? "",
      })),
    };
  } catch (error) {
    console.error("Error fetching Square business data:", error);
    throw new Error(
      `Failed to fetch Square data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Helper to store business data in Supabase
async function storeBusinessData(
  supabaseClient: SupabaseClient,
  userId: string,
  businessData: SquareBusinessData
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

    // Store items in a separate table if needed
    // This could be expanded to store items, categories, etc. in dedicated tables

    console.log("Business data stored successfully");
  } catch (error) {
    console.error("Error storing business data:", error);
    throw new Error(
      `Failed to store business data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
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
              404
            );
          }

          connectionIdToUse = connection.connection_id;
        }

        // Get Square client (or use mock in test mode)
        let squareClient: SquareClient;
        if (TEST_MODE) {
          // Create a mock client for testing
          squareClient = new SquareClient({
            token: "test-token",
            environment: SquareEnvironment.Sandbox,
          });
        } else {
          squareClient = await getSquareClient(nango, connectionIdToUse!);
        }

        // Fetch business data
        const businessData = await fetchSquareBusinessData(squareClient);

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
          500
        );
      }
    }

    if (action === "test_data") {
      // Test endpoint that returns mock data without storing
      try {
        const mockClient = new SquareClient({
          token: "test-token",
          environment: SquareEnvironment.Sandbox,
        });

        const businessData = await fetchSquareBusinessData(mockClient);

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
          500
        );
      }
    }

    return createErrorResponse("Invalid action");
  } catch (error: unknown) {
    console.error("Error in square-service function:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
