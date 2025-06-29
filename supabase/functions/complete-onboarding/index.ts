import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "supabase";
import { MerchantDataService } from "../_shared/merchant-service.ts";
import { SquareBusinessInfo } from "../_shared/square-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  userId: string;
}

interface OnboardingRecord {
  user_id: string;
  merchant_id?: string;
  business_name?: string;
  phone_number?: string;
  business_city?: string;
  full_address?: string;
  opening_hours?: string;
  primary_location_id?: string;
  catalog_data?: any; // This contains the enhanced catalog data from Square
  current_step: number;
  completed: boolean;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId }: RequestBody = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Completing onboarding for user:", userId);

    // 1. Get onboarding data
    const { data: onboardingData, error: onboardingError } = await supabase
      .from("onboarding")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (onboardingError || !onboardingData) {
      console.error("Error fetching onboarding data:", onboardingError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch onboarding data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const onboarding = onboardingData as OnboardingRecord;

    // 2. Get connection ID for metadata
    const { data: connection } = await supabase
      .from("connections")
      .select("connection_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    const connectionId = connection?.connection_id;

    // 3. Transform onboarding data to SquareBusinessInfo format
    const businessInfo: SquareBusinessInfo =
      transformOnboardingToSquareBusinessInfo(onboarding);

    // 4. Use MerchantDataService to store the formatted data
    const merchantService = new MerchantDataService(supabase);
    await merchantService.storeMerchantData(userId, businessInfo, connectionId);

    // 5. Mark onboarding as completed
    const { error: updateError } = await supabase
      .from("onboarding")
      .update({
        completed: true,
        current_step: 999, // Final step
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error completing onboarding:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to complete onboarding" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Onboarding completed successfully for user:", userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Onboarding completed successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error
          ? error.message
          : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * Transform onboarding data to SquareBusinessInfo format
 * This reconstructs the format that MerchantDataService expects
 */
function transformOnboardingToSquareBusinessInfo(
  onboarding: OnboardingRecord,
): SquareBusinessInfo {
  // Basic merchant information
  const merchant = {
    id: onboarding.merchant_id || "",
    businessName: onboarding.business_name,
    country: "US", // We might need to extract this from somewhere else
    languageCode: "en-US", // We might need to extract this from somewhere else
    currency: "USD", // We might need to extract this from somewhere else
  };

  // Location information - we need to reconstruct this from the stored data
  const locations = [];
  if (
    onboarding.full_address || onboarding.business_city ||
    onboarding.phone_number
  ) {
    // Parse the full address back into components if possible
    const addressParts = onboarding.full_address?.split(", ") || [];

    const location = {
      id: onboarding.primary_location_id || "primary_location", // Use the actual Square location ID
      name: onboarding.business_name || "Primary Location",
      address: {
        addressLine1: addressParts[0] || undefined,
        addressLine2: addressParts[1] || undefined,
        locality: onboarding.business_city || addressParts[2] || undefined,
        administrativeDistrictLevel1: addressParts[3] || undefined,
        postalCode: addressParts[4] || undefined,
        country: "US",
      },
      phoneNumber: onboarding.phone_number,
      businessHours: onboarding.opening_hours
        ? parseBusinessHours(onboarding.opening_hours)
        : undefined,
      timezone: "America/Los_Angeles", // Default timezone - we might need to determine this better
    };

    locations.push(location);
  }

  // Catalog information - this is stored as enhanced_catalog_data in the onboarding
  const catalog = onboarding.catalog_data || undefined;

  return {
    merchant,
    locations: locations.length > 0 ? locations : undefined,
    catalog,
  };
}

/**
 * Parse business hours string back to Square format
 * This reverses the formatting done by SquareService.formatBusinessHours
 */
function parseBusinessHours(businessHoursString: string) {
  try {
    const lines = businessHoursString.split("\n");
    const periods = [];

    const dayMap: { [key: string]: string } = {
      "Monday": "MON",
      "Tuesday": "TUE",
      "Wednesday": "WED",
      "Thursday": "THU",
      "Friday": "FRI",
      "Saturday": "SAT",
      "Sunday": "SUN",
    };

    for (const line of lines) {
      // Format: "Monday: 09:00 - 17:00"
      const match = line.match(/^(\w+):\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
      if (match) {
        const [, dayName, startTime, endTime] = match;
        if (dayName && dayMap[dayName]) {
          const dayOfWeek = dayMap[dayName];
          periods.push({
            dayOfWeek,
            startLocalTime: startTime,
            endLocalTime: endTime,
          });
        }
      }
    }

    return periods.length > 0 ? { periods } : undefined;
  } catch (error) {
    console.error("Error parsing business hours:", error);
    return undefined;
  }
}
