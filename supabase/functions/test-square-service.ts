#!/usr/bin/env -S deno run --allow-env --allow-net

// Test script for Square service
const TEST_USER_ID = "test-user-123";

async function testSquareService() {
  console.log("🧪 Testing Square Service with mock data...\n");

  try {
    // Test the test_data endpoint
    const response = await fetch(
      "http://localhost:54321/functions/v1/square-service",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          action: "test_data",
          userId: TEST_USER_ID,
        }),
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Test successful!");
      console.log("📊 Data summary:");
      console.log(`   - Locations: ${result.data.locations.length}`);
      console.log(`   - Items: ${result.data.items.length}`);
      console.log(`   - Categories: ${result.data.categories.length}`);

      console.log("\n📋 Sample data:");
      console.log("   Locations:", result.data.locations[0]?.name);
      console.log(
        "   Items:",
        result.data.items.map((item: any) => item.name).join(", ")
      );
      console.log(
        "   Categories:",
        result.data.categories.map((cat: any) => cat.name).join(", ")
      );

      console.log("\n🔍 Full response:", JSON.stringify(result, null, 2));
    } else {
      console.error("❌ Test failed:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("Error details:", errorText);
    }
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

// Run the test
testSquareService();
