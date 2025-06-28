#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * Square API Test Script for Deno/Supabase Environment
 *
 * This script allows you to test Square API calls in the Supabase/Deno environment.
 * It includes both live API testing and mock data testing.
 *
 * Usage:
 *   deno run --allow-env --allow-net test-square-api-deno.ts --help
 *   deno run --allow-env --allow-net test-square-api-deno.ts --mock
 *   deno run --allow-env --allow-net test-square-api-deno.ts --live --token YOUR_ACCESS_TOKEN
 */

import { SquareClient, SquareEnvironment } from "square";

// ANSI colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Mock data for testing
const MOCK_DATA = {
  merchant: {
    id: "MERCHANT_123",
    businessName: "Test Business",
    country: "US",
    languageCode: "en-US",
    currency: "USD",
  },
  locations: [
    {
      id: "LOCATION_123",
      name: "Main Store",
      address: {
        addressLine1: "123 Main Street",
        addressLine2: "Suite 100",
        locality: "San Francisco",
        administrativeDistrictLevel1: "CA",
        postalCode: "94105",
        country: "US",
      },
      phoneNumber: "+1-555-123-4567",
      businessHours: {
        periods: [
          {
            dayOfWeek: "MON",
            startLocalTime: "09:00",
            endLocalTime: "17:00",
          },
          {
            dayOfWeek: "TUE",
            startLocalTime: "09:00",
            endLocalTime: "17:00",
          },
          {
            dayOfWeek: "WED",
            startLocalTime: "09:00",
            endLocalTime: "17:00",
          },
          {
            dayOfWeek: "THU",
            startLocalTime: "09:00",
            endLocalTime: "17:00",
          },
          {
            dayOfWeek: "FRI",
            startLocalTime: "09:00",
            endLocalTime: "17:00",
          },
        ],
      },
      timezone: "America/Los_Angeles",
    },
  ],
  catalog: {
    items: [
      {
        id: "ITEM_123",
        itemData: {
          name: "Coffee",
          description: "Premium coffee blend",
          variations: [
            {
              id: "VAR_123",
              itemVariationData: {
                name: "Small",
                priceMoney: {
                  amount: 250,
                  currency: "USD",
                },
              },
            },
            {
              id: "VAR_124",
              itemVariationData: {
                name: "Large",
                priceMoney: {
                  amount: 350,
                  currency: "USD",
                },
              },
            },
          ],
        },
      },
    ],
    services: [
      {
        id: "SERVICE_123",
        itemData: {
          name: "Consultation",
          description: "Business consultation service",
          variations: [
            {
              id: "VAR_125",
              itemVariationData: {
                name: "1 Hour",
                priceMoney: {
                  amount: 10000,
                  currency: "USD",
                },
                serviceDuration: 3600000, // 1 hour in milliseconds
              },
            },
          ],
        },
      },
    ],
  },
};

class SquareAPITester {
  private client?: SquareClient;
  private mockMode: boolean;

  constructor(accessToken?: string, environment = SquareEnvironment.Sandbox) {
    if (accessToken) {
      this.client = new SquareClient({
        accessToken,
        environment,
      });
    }
    this.mockMode = !accessToken;
  }

  async testMerchantInfo() {
    log("\n📋 Testing Merchant Information...", colors.cyan);

    if (this.mockMode) {
      log("Using mock data", colors.yellow);
      const merchant = MOCK_DATA.merchant;
      log(`✅ Merchant ID: ${merchant.id}`, colors.green);
      log(`✅ Business Name: ${merchant.businessName}`, colors.green);
      log(`✅ Country: ${merchant.country}`, colors.green);
      log(`✅ Currency: ${merchant.currency}`, colors.green);
      return merchant;
    }

    if (!this.client) {
      throw new Error("Client not initialized");
    }

    try {
      const response = await this.client.merchantsApi.retrieveMerchant("me");

      if (response.result.merchant) {
        const merchant = response.result.merchant;
        log(`✅ Merchant ID: ${merchant.id}`, colors.green);
        log(
          `✅ Business Name: ${merchant.businessName || "N/A"}`,
          colors.green,
        );
        log(`✅ Country: ${merchant.country}`, colors.green);
        log(`✅ Currency: ${merchant.currency || "N/A"}`, colors.green);
        return merchant;
      }
    } catch (error) {
      log(
        `❌ Error fetching merchant info: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        colors.red,
      );
      throw error;
    }
  }

  async testLocations() {
    log("\n🏪 Testing Locations...", colors.cyan);

    if (this.mockMode) {
      log("Using mock data", colors.yellow);
      const locations = MOCK_DATA.locations;
      locations.forEach((location, index) => {
        log(`✅ Location ${index + 1}: ${location.name}`, colors.green);
        log(
          `   Address: ${location.address.addressLine1}, ${location.address.locality}, ${location.address.administrativeDistrictLevel1}`,
          colors.green,
        );
        log(`   Phone: ${location.phoneNumber}`, colors.green);
      });
      return locations;
    }

    if (!this.client) {
      throw new Error("Client not initialized");
    }

    try {
      const response = await this.client.locationsApi.listLocations();

      if (response.result.locations) {
        const locations = response.result.locations;
        log(`✅ Found ${locations.length} location(s)`, colors.green);

        locations.forEach((location, index) => {
          log(
            `   Location ${index + 1}: ${location.name || "Unnamed"}`,
            colors.green,
          );
          if (location.address) {
            log(
              `   Address: ${location.address.addressLine1 || ""}, ${
                location.address.locality || ""
              }, ${location.address.administrativeDistrictLevel1 || ""}`,
              colors.green,
            );
          }
          if (location.phoneNumber) {
            log(`   Phone: ${location.phoneNumber}`, colors.green);
          }
        });

        return locations;
      }
    } catch (error) {
      log(
        `❌ Error fetching locations: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        colors.red,
      );
      throw error;
    }
    return undefined;
  }

  async testCatalog() {
    log("\n📦 Testing Catalog...", colors.cyan);

    if (this.mockMode) {
      log("Using mock data", colors.yellow);
      const catalog = MOCK_DATA.catalog;

      log(`✅ Found ${catalog.items.length} item(s)`, colors.green);
      catalog.items.forEach((item, index) => {
        log(`   Item ${index + 1}: ${item.itemData.name}`, colors.green);
        log(`   Variations: ${item.itemData.variations.length}`, colors.green);
      });

      log(`✅ Found ${catalog.services.length} service(s)`, colors.green);
      catalog.services.forEach((service, index) => {
        log(`   Service ${index + 1}: ${service.itemData.name}`, colors.green);
      });

      return catalog;
    }

    if (!this.client) {
      throw new Error("Client not initialized");
    }

    try {
      const response = await this.client.catalogApi.listCatalog(
        undefined,
        "ITEM",
      );

      if (response.result.objects) {
        const objects = response.result.objects;
        const items = objects.filter((obj) =>
          obj.itemData && !this.isService(obj)
        );
        const services = objects.filter((obj) =>
          obj.itemData && this.isService(obj)
        );

        log(`✅ Found ${items.length} item(s)`, colors.green);
        items.slice(0, 5).forEach((item: any, index: number) => {
          if (item.itemData?.name) {
            log(`   Item ${index + 1}: ${item.itemData.name}`, colors.green);
          }
        });

        if (items.length > 5) {
          log(`   ... and ${items.length - 5} more items`, colors.green);
        }

        log(`✅ Found ${services.length} service(s)`, colors.green);
        services.forEach((service, index) => {
          if (service.itemData?.name) {
            log(
              `   Service ${index + 1}: ${service.itemData.name}`,
              colors.green,
            );
          }
        });

        return { items, services };
      }
    } catch (error) {
      log(`❌ Error fetching catalog: ${error.message}`, colors.red);
      throw error;
    }
  }

  private isService(catalogObject: any): boolean {
    if (!catalogObject.itemData || !catalogObject.itemData.variations) {
      return false;
    }

    return catalogObject.itemData.variations.some((variation: any) =>
      variation.itemVariationData?.serviceDuration !== undefined ||
      (variation.itemVariationData?.itemOptionValues || []).some((
        option: string,
      ) =>
        option.toLowerCase().includes("service") ||
        option.toLowerCase().includes("appointment")
      )
    );
  }

  async runFullTest() {
    log(
      "🧪 Starting Square API Test Suite (Deno)",
      colors.bright + colors.blue,
    );
    log(`Mode: ${this.mockMode ? "MOCK DATA" : "LIVE API"}`, colors.yellow);
    log("=".repeat(50), colors.blue);

    const results: any = {};

    try {
      results.merchant = await this.testMerchantInfo();
      results.locations = await this.testLocations();
      results.catalog = await this.testCatalog();

      log(
        "\n🎉 All tests completed successfully!",
        colors.bright + colors.green,
      );

      // Summary
      log("\n📊 Summary:", colors.bright + colors.cyan);
      log(
        `   Merchant: ${
          results.merchant?.businessName || results.merchant?.id || "Retrieved"
        }`,
        colors.green,
      );
      log(`   Locations: ${results.locations?.length || 0}`, colors.green);
      log(`   Items: ${results.catalog?.items?.length || 0}`, colors.green);
      log(
        `   Services: ${results.catalog?.services?.length || 0}`,
        colors.green,
      );

      return results;
    } catch (error) {
      log(
        `\n💥 Test suite failed: ${error.message}`,
        colors.bright + colors.red,
      );
      throw error;
    }
  }
}

// CLI handling
function showHelp() {
  log("Square API Independent Test Script (Deno)", colors.bright + colors.blue);
  log("\nUsage:", colors.bright);
  log(
    "  deno run --allow-env --allow-net test-square-api-deno.ts [options]",
    colors.cyan,
  );
  log("\nOptions:", colors.bright);
  log(
    "  --mock              Run tests with mock data (no API calls)",
    colors.green,
  );
  log("  --live --token TOKEN Run tests with live API calls", colors.green);
  log("  --sandbox           Use sandbox environment (default)", colors.green);
  log("  --production        Use production environment", colors.green);
  log("  --help              Show this help message", colors.green);
  log("\nExamples:", colors.bright);
  log(
    "  deno run --allow-env --allow-net test-square-api-deno.ts --mock",
    colors.cyan,
  );
  log(
    "  deno run --allow-env --allow-net test-square-api-deno.ts --live --token YOUR_ACCESS_TOKEN",
    colors.cyan,
  );
  log(
    "  deno run --allow-env --allow-net test-square-api-deno.ts --live --token YOUR_ACCESS_TOKEN --production",
    colors.cyan,
  );
  log("\nEnvironment Variables:", colors.bright);
  log("  SQUARE_ACCESS_TOKEN  Your Square access token", colors.green);
  log(
    '  SQUARE_ENVIRONMENT   "sandbox" or "production" (default: sandbox)',
    colors.green,
  );
}

async function main() {
  const args = Deno.args;

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  const mockMode = args.includes("--mock");
  const liveMode = args.includes("--live");
  const tokenIndex = args.indexOf("--token");
  const useProduction = args.includes("--production");

  let accessToken: string | undefined = undefined;
  const environment = useProduction
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

  if (liveMode) {
    if (tokenIndex !== -1 && tokenIndex + 1 < args.length) {
      accessToken = args[tokenIndex + 1];
    } else {
      accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    }

    if (!accessToken) {
      log(
        "❌ Access token required for live mode. Use --token TOKEN or set SQUARE_ACCESS_TOKEN environment variable.",
        colors.red,
      );
      Deno.exit(1);
    }
  } else if (!mockMode) {
    // Default to mock mode if neither specified
    log(
      "No mode specified, defaulting to mock mode. Use --live or --mock to be explicit.",
      colors.yellow,
    );
  }

  const tester = new SquareAPITester(accessToken, environment);
  await tester.runFullTest();
}

// Run if this file is executed directly
if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    log(`💥 Script failed: ${error.message}`, colors.bright + colors.red);
    Deno.exit(1);
  }
}
