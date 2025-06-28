import { beforeEach, describe, expect, it, vi } from "vitest";

// Create hoisted mocks that can be accessed both in mock factory and test code
const mockSquareClient = vi.hoisted(() => ({
    merchants: {
        list: vi.fn(),
    },
    locations: {
        list: vi.fn(),
    },
    catalog: {
        list: vi.fn(),
    },
}));

const mockSquareEnvironment = vi.hoisted(() => ({
    Sandbox: "sandbox",
    Production: "production",
}));

// Mock the entire Square module
vi.mock("square", () => ({
    SquareClient: vi.fn(() => mockSquareClient),
    SquareEnvironment: mockSquareEnvironment,
    Square: {},
}));

// Import the service after mocking
import { SquareService } from "../../supabase/functions/_shared/square-service";

describe("SquareService Unit Tests", () => {
    let squareService: SquareService;

    beforeEach(() => {
        vi.clearAllMocks();
        squareService = new SquareService("test-token", true);
    });

    describe("Constructor", () => {
        it("should create SquareService instance", () => {
            expect(squareService).toBeInstanceOf(SquareService);
        });
    });

    describe("getBusinessInformation", () => {
        it("should return comprehensive business information when all APIs succeed", async () => {
            // Mock successful responses
            mockSquareClient.merchants.list.mockResolvedValue({
                data: [{
                    id: "MERCHANT_123",
                    businessName: "Test Business",
                    country: "US",
                    languageCode: "en-US",
                    currency: "USD",
                }],
            });

            mockSquareClient.locations.list.mockResolvedValue({
                locations: [{
                    id: "LOCATION_123",
                    name: "Main Store",
                    address: {
                        addressLine1: "123 Main St",
                        locality: "San Francisco",
                        administrativeDistrictLevel1: "CA",
                        postalCode: "94105",
                        country: "US",
                    },
                    phoneNumber: "+1-555-123-4567",
                    businessHours: {
                        periods: [{
                            dayOfWeek: "MON",
                            startLocalTime: "09:00",
                            endLocalTime: "17:00",
                        }],
                    },
                    timezone: "America/Los_Angeles",
                }],
            });

            mockSquareClient.catalog.list.mockResolvedValue({
                data: [
                    {
                        id: "ITEM_123",
                        type: "ITEM",
                        itemData: {
                            name: "Coffee",
                            variations: [{
                                id: "VAR_123",
                                itemVariationData: {
                                    name: "Small",
                                    priceMoney: {
                                        amount: 250,
                                        currency: "USD",
                                    },
                                },
                            }],
                        },
                    },
                    {
                        id: "SERVICE_123",
                        type: "ITEM",
                        itemData: {
                            name: "Consultation",
                            variations: [{
                                id: "VAR_124",
                                itemVariationData: {
                                    name: "1 Hour",
                                    priceMoney: {
                                        amount: 10000,
                                        currency: "USD",
                                    },
                                    serviceDuration: 3600000,
                                },
                            }],
                        },
                    },
                ],
            });

            const result = await squareService.getBusinessInformation();

            expect(result.merchant).toEqual({
                id: "MERCHANT_123",
                businessName: "Test Business",
                country: "US",
                languageCode: "en-US",
                currency: "USD",
            });

            expect(result.locations).toHaveLength(1);
            expect(result.locations![0]).toEqual({
                id: "LOCATION_123",
                name: "Main Store",
                address: {
                    addressLine1: "123 Main St",
                    addressLine2: undefined,
                    locality: "San Francisco",
                    administrativeDistrictLevel1: "CA",
                    postalCode: "94105",
                    country: "US",
                },
                phoneNumber: "+1-555-123-4567",
                businessHours: {
                    periods: [{
                        dayOfWeek: "MON",
                        startLocalTime: "09:00",
                        endLocalTime: "17:00",
                    }],
                },
                timezone: "America/Los_Angeles",
                coordinates: undefined,
            });

            expect(result.catalog).toBeDefined();
            expect(result.catalog!.services).toHaveLength(1);
            expect(result.catalog!.items).toHaveLength(1);
        });

        it("should handle empty responses gracefully", async () => {
            mockSquareClient.merchants.list.mockResolvedValue({ data: [] });
            mockSquareClient.locations.list.mockResolvedValue({
                locations: [],
            });
            mockSquareClient.catalog.list.mockResolvedValue({ data: [] });

            const result = await squareService.getBusinessInformation();

            expect(result).toEqual({
                catalog: {
                    services: undefined,
                    items: undefined,
                },
            });
        });

        it("should handle API errors and continue processing other APIs", async () => {
            mockSquareClient.merchants.list.mockRejectedValue(
                new Error("API Error"),
            );
            mockSquareClient.locations.list.mockResolvedValue({
                locations: [],
            });
            mockSquareClient.catalog.list.mockResolvedValue({ data: [] });

            const result = await squareService.getBusinessInformation();

            // Should continue processing despite merchant API error
            expect(result.merchant).toBeUndefined();
            expect(result.catalog).toEqual({
                services: undefined,
                items: undefined,
            });
        });

        it("should continue processing even if individual API calls fail", async () => {
            // Merchant API fails
            mockSquareClient.merchants.list.mockRejectedValue(
                new Error("Merchant API Error"),
            );

            // But locations and catalog succeed
            mockSquareClient.locations.list.mockResolvedValue({
                locations: [{
                    id: "LOCATION_123",
                    name: "Main Store",
                }],
            });

            mockSquareClient.catalog.list.mockResolvedValue({
                data: [{
                    id: "ITEM_123",
                    type: "ITEM",
                    itemData: { name: "Coffee" },
                }],
            });

            const result = await squareService.getBusinessInformation();

            // Should not have merchant data but should have locations and catalog
            expect(result.merchant).toBeUndefined();
            expect(result.locations).toHaveLength(1);
            expect(result.catalog).toBeDefined();
        });
    });

    describe("Static utility methods", () => {
        describe("formatBusinessHours", () => {
            it("should format business hours correctly", () => {
                const periods = [
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
                        dayOfWeek: "FRI",
                        startLocalTime: "10:00",
                        endLocalTime: "16:00",
                    },
                ];

                const formatted = SquareService.formatBusinessHours(periods);

                expect(formatted).toContain("Monday: 09:00 - 17:00");
                expect(formatted).toContain("Tuesday: 09:00 - 17:00");
                expect(formatted).toContain("Friday: 10:00 - 16:00");
                expect(formatted.split("\n")).toHaveLength(3);
            });

            it("should handle empty periods array", () => {
                const formatted = SquareService.formatBusinessHours([]);
                expect(formatted).toBe("Hours not specified");
            });

            it("should handle undefined periods", () => {
                const formatted = SquareService.formatBusinessHours(undefined);
                expect(formatted).toBe("Hours not specified");
            });

            it("should handle periods with missing times", () => {
                const periods = [
                    {
                        dayOfWeek: "MON",
                        startLocalTime: "09:00",
                        endLocalTime: "17:00",
                    },
                    { dayOfWeek: "TUE" }, // Missing times
                ];

                const formatted = SquareService.formatBusinessHours(periods);

                expect(formatted).toContain("Monday: 09:00 - 17:00");
                expect(formatted).not.toContain("Tuesday");
            });
        });

        describe("extractServices", () => {
            it("should extract services from catalog services array", () => {
                const catalog = {
                    services: [
                        {
                            id: "SERVICE_1",
                            type: "ITEM" as const,
                            itemData: { name: "Consultation" },
                        },
                        {
                            id: "SERVICE_2",
                            type: "ITEM" as const,
                            itemData: { name: "Training" },
                        },
                    ],
                };

                const services = SquareService.extractServices(catalog);
                expect(services).toEqual(["Consultation", "Training"]);
            });

            it("should extract services from catalog items array", () => {
                const catalog = {
                    items: [
                        {
                            id: "ITEM_1",
                            type: "ITEM" as const,
                            itemData: { name: "Coffee" },
                        },
                        {
                            id: "ITEM_2",
                            type: "ITEM" as const,
                            itemData: { name: "Pastry" },
                        },
                    ],
                };

                const services = SquareService.extractServices(catalog);
                expect(services).toEqual(["Coffee", "Pastry"]);
            });

            it("should extract services from both services and items arrays", () => {
                const catalog = {
                    services: [
                        {
                            id: "SERVICE_1",
                            type: "ITEM" as const,
                            itemData: { name: "Consultation" },
                        },
                    ],
                    items: [
                        {
                            id: "ITEM_1",
                            type: "ITEM" as const,
                            itemData: { name: "Coffee" },
                        },
                    ],
                };

                const services = SquareService.extractServices(catalog);
                expect(services).toEqual(["Consultation", "Coffee"]);
            });

            it("should handle empty catalog object", () => {
                const services = SquareService.extractServices({});
                expect(services).toEqual([]);
            });

            it("should handle undefined catalog", () => {
                const services = SquareService.extractServices(undefined);
                expect(services).toEqual([]);
            });

            it("should handle items without names", () => {
                const catalog = {
                    services: [
                        {
                            id: "SERVICE_1",
                            type: "ITEM" as const,
                            itemData: {}, // No name
                        },
                        {
                            id: "SERVICE_2",
                            type: "ITEM" as const,
                            itemData: { name: "Valid Service" },
                        },
                    ],
                };

                const services = SquareService.extractServices(catalog);
                expect(services).toEqual(["Valid Service"]);
            });
        });
    });

    describe("Integration scenarios", () => {
        it("should handle a realistic business with multiple locations and mixed catalog", async () => {
            mockSquareClient.merchants.list.mockResolvedValue({
                data: [{
                    id: "MERCHANT_REAL",
                    businessName: "Coffee & Consulting Co.",
                    country: "US",
                    languageCode: "en-US",
                    currency: "USD",
                }],
            });

            mockSquareClient.locations.list.mockResolvedValue({
                locations: [
                    {
                        id: "LOCATION_MAIN",
                        name: "Main Cafe",
                        address: {
                            addressLine1: "123 Coffee St",
                            locality: "Seattle",
                            administrativeDistrictLevel1: "WA",
                            postalCode: "98101",
                            country: "US",
                        },
                        phoneNumber: "+1-206-555-0123",
                    },
                    {
                        id: "LOCATION_BRANCH",
                        name: "Branch Office",
                        address: {
                            addressLine1: "456 Business Ave",
                            locality: "Seattle",
                            administrativeDistrictLevel1: "WA",
                            postalCode: "98102",
                            country: "US",
                        },
                    },
                ],
            });

            mockSquareClient.catalog.list.mockResolvedValue({
                data: [
                    // Coffee items
                    {
                        id: "ITEM_COFFEE",
                        type: "ITEM",
                        itemData: {
                            name: "Espresso",
                            variations: [{
                                id: "VAR_COFFEE",
                                itemVariationData: { name: "Single" },
                            }],
                        },
                    },
                    // Consulting services
                    {
                        id: "SERVICE_CONSULT",
                        type: "ITEM",
                        itemData: {
                            name: "Business Consultation",
                            variations: [{
                                id: "VAR_CONSULT",
                                itemVariationData: {
                                    name: "1 Hour",
                                    serviceDuration: 3600000,
                                },
                            }],
                        },
                    },
                ],
            });

            const result = await squareService.getBusinessInformation();

            expect(result.merchant?.businessName).toBe(
                "Coffee & Consulting Co.",
            );
            expect(result.locations).toHaveLength(2);
            expect(result.locations![0].name).toBe("Main Cafe");
            expect(result.locations![1].name).toBe("Branch Office");
            expect(result.catalog?.services).toHaveLength(1);
            expect(result.catalog?.items).toHaveLength(1);
        });
    });
});
