import { beforeAll, describe, expect, it } from "vitest";
import { SquareService } from "../../supabase/functions/_shared/square-service";

// Integration tests that use real Square API credentials
// Set SQUARE_ACCESS_TOKEN environment variable to run these tests
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const USE_SANDBOX = process.env.SQUARE_ENVIRONMENT !== "production";

// Skip these tests if no access token is provided
const describeIf = SQUARE_ACCESS_TOKEN ? describe : describe.skip;

describeIf("SquareService Integration Tests (Real API)", () => {
    let squareService: SquareService;

    beforeAll(() => {
        if (!SQUARE_ACCESS_TOKEN) {
            throw new Error(
                "SQUARE_ACCESS_TOKEN environment variable is required for integration tests",
            );
        }

        squareService = new SquareService(SQUARE_ACCESS_TOKEN, USE_SANDBOX);
        console.log(
            `Running integration tests with ${
                USE_SANDBOX ? "SANDBOX" : "PRODUCTION"
            } environment`,
        );
    });

    it("should retrieve real business information", async () => {
        const result = await squareService.getBusinessInformation();

        console.log("=== REAL SQUARE API RESPONSE ===");
        console.log(JSON.stringify(result, null, 2));
        console.log("=== END RESPONSE ===");

        // Basic structure validation
        expect(result).toBeDefined();
        expect(typeof result).toBe("object");

        // Log what we received for debugging
        if (result.merchant) {
            console.log("\n📋 Merchant Info:");
            console.log(`  ID: ${result.merchant.id}`);
            console.log(
                `  Business Name: ${result.merchant.businessName || "N/A"}`,
            );
            console.log(`  Country: ${result.merchant.country}`);
            console.log(`  Currency: ${result.merchant.currency || "N/A"}`);
        }

        if (result.locations && result.locations.length > 0) {
            console.log("\n🏪 Locations:");
            result.locations.forEach((location, index) => {
                console.log(
                    `  Location ${index + 1}: ${location.name || location.id}`,
                );
                if (location.address) {
                    console.log(
                        `    Address: ${
                            location.address.addressLine1 || "N/A"
                        }`,
                    );
                    console.log(
                        `    City: ${location.address.locality || "N/A"}`,
                    );
                    console.log(
                        `    State: ${
                            location.address.administrativeDistrictLevel1 ||
                            "N/A"
                        }`,
                    );
                }
                console.log(`    Phone: ${location.phoneNumber || "N/A"}`);
            });
        }

        if (result.catalog) {
            console.log("\n📦 Catalog:");
            console.log(`  Services: ${result.catalog.services?.length || 0}`);
            console.log(`  Items: ${result.catalog.items?.length || 0}`);

            if (result.catalog.services && result.catalog.services.length > 0) {
                console.log("  Service names:");
                result.catalog.services.forEach((service, index) => {
                    const name = (service as any).itemData?.name || "Unnamed";
                    console.log(`    ${index + 1}. ${name}`);
                });
            }

            if (result.catalog.items && result.catalog.items.length > 0) {
                console.log("  Item names (first 5):");
                result.catalog.items.slice(0, 5).forEach((item, index) => {
                    const name = (item as any).itemData?.name || "Unnamed";
                    console.log(`    ${index + 1}. ${name}`);
                });
                if (result.catalog.items.length > 5) {
                    console.log(
                        `    ... and ${result.catalog.items.length - 5} more`,
                    );
                }
            }
        }

        // Validate merchant data if present
        if (result.merchant) {
            expect(result.merchant.id).toBeDefined();
            expect(typeof result.merchant.id).toBe("string");
            expect(result.merchant.country).toBeDefined();
        }

        // Validate locations if present
        if (result.locations) {
            expect(Array.isArray(result.locations)).toBe(true);
            result.locations.forEach((location) => {
                expect(location.id).toBeDefined();
                expect(typeof location.id).toBe("string");
            });
        }

        // Validate catalog if present
        if (result.catalog) {
            if (result.catalog.services) {
                expect(Array.isArray(result.catalog.services)).toBe(true);
            }
            if (result.catalog.items) {
                expect(Array.isArray(result.catalog.items)).toBe(true);
            }
        }
    }, 30000); // 30 second timeout for API calls

    it("should extract services from real catalog data", async () => {
        const result = await squareService.getBusinessInformation();

        const services = SquareService.extractServices(result.catalog);

        console.log("\n🎯 Extracted Services:");
        services.forEach((service, index) => {
            console.log(`  ${index + 1}. ${service}`);
        });

        expect(Array.isArray(services)).toBe(true);

        // Each service should be a non-empty string
        services.forEach((service) => {
            expect(typeof service).toBe("string");
            expect(service.length).toBeGreaterThan(0);
        });
    }, 30000);

    it("should format business hours from real location data", async () => {
        const result = await squareService.getBusinessInformation();

        if (result.locations && result.locations.length > 0) {
            const location = result.locations[0];

            if (location.businessHours?.periods) {
                const formatted = SquareService.formatBusinessHours(
                    location.businessHours.periods,
                );

                console.log("\n⏰ Formatted Business Hours:");
                console.log(formatted);

                expect(typeof formatted).toBe("string");
                expect(formatted.length).toBeGreaterThan(0);
                expect(formatted).not.toBe("Hours not specified");

                // Should contain day names
                const dayNames = [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                ];
                const containsSomeDay = dayNames.some((day) =>
                    formatted.includes(day)
                );
                expect(containsSomeDay).toBe(true);
            } else {
                console.log("\n⏰ No business hours found in location data");
            }
        } else {
            console.log("\n🏪 No locations found to test business hours");
        }
    }, 30000);

    it(
        "should handle API errors gracefully with real credentials",
        async () => {
            // Create a service with an invalid token to test error handling
            const invalidService = new SquareService(
                "invalid-token",
                USE_SANDBOX,
            );

            await expect(invalidService.getBusinessInformation()).rejects
                .toThrow();
        },
        30000,
    );
});

// Conditional test for when no credentials are provided
describe.skipIf(SQUARE_ACCESS_TOKEN)(
    "SquareService Integration Tests (No Credentials)",
    () => {
        it("should skip integration tests when no credentials provided", () => {
            console.log(
                "ℹ️  Integration tests skipped - no SQUARE_ACCESS_TOKEN provided",
            );
            console.log(
                "ℹ️  To run integration tests, set environment variables:",
            );
            console.log("   export SQUARE_ACCESS_TOKEN=your_sandbox_token");
            console.log(
                "   export SQUARE_ENVIRONMENT=sandbox  # or production",
            );
            console.log("   npm run test:integration");
            expect(true).toBe(true);
        });
    },
);
