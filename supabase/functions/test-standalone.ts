#!/usr/bin/env -S deno run --allow-env

// Standalone test for Square service logic
import { Square, SquareClient, SquareEnvironment } from "square";

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

// Type guards
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

// Test the data processing logic
function testSquareDataProcessing() {
  console.log("🧪 Testing Square data processing logic...\n");

  const locations = MOCK_SQUARE_DATA.locations;
  const catalogObjects =
    MOCK_SQUARE_DATA.catalogObjects as Square.CatalogObject[];

  // Filter items and categories
  const items = catalogObjects.filter(isCatalogItem);
  const categories = catalogObjects.filter(isCatalogCategory);

  console.log(
    `📊 Processing ${items.length} items and ${categories.length} categories`
  );

  const processedData = {
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
                  amount: Number(variation.itemVariationData.priceMoney.amount),
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

  console.log("✅ Data processing successful!");
  console.log("\n📋 Processed data summary:");
  console.log(`   - Locations: ${processedData.locations.length}`);
  console.log(`   - Items: ${processedData.items.length}`);
  console.log(`   - Categories: ${processedData.categories.length}`);

  console.log("\n🏪 Sample location:", processedData.locations[0]?.name);
  console.log(
    "🍕 Sample items:",
    processedData.items.map((item) => item.name).join(", ")
  );
  console.log(
    "📂 Sample categories:",
    processedData.categories.map((cat) => cat.name).join(", ")
  );

  console.log("\n🔍 Full processed data:");
  console.log(JSON.stringify(processedData, null, 2));

  return processedData;
}

// Run the test
testSquareDataProcessing();
