import { SupabaseClient } from "supabase";
import { SquareBusinessInfo } from "./square-service.ts";

export interface MerchantLocation {
  id: string;
  name?: string;
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
    periods?: Array<{
      day_of_week: string;
      start_local_time?: string;
      end_local_time?: string;
    }>;
  };
  timezone?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

export interface MerchantService {
  id: string;
  name: string;
  description?: string;
  duration_minutes?: number;
  price_amount?: number;
  price_currency?: string;
  is_bookable?: boolean;
  category_id?: string;
  category_name?: string;
  variations?: Array<{
    id: string;
    name?: string;
    duration_minutes?: number;
    price_amount?: number;
    price_currency?: string;
    is_bookable?: boolean;
  }>;
}

export interface MerchantCategory {
  id: string;
  name: string;
}

export interface MerchantInfo {
  id: string;
  business_name?: string;
  country: string;
  language_code: string;
  currency?: string;
  primary_location_id?: string;
  square_merchant_id?: string;
  last_sync_at?: string;
}

export interface StoredMerchantData {
  merchant: MerchantInfo;
  locations: MerchantLocation[];
  services: MerchantService[];
  categories: MerchantCategory[];
  metadata: {
    last_updated: string;
    data_source: "square" | "manual";
    sync_status: "complete" | "partial" | "failed";
  };
}

export interface MerchantDataUpdate {
  merchant?: Partial<MerchantInfo>;
  locations?: MerchantLocation[];
  services?: MerchantService[];
  categories?: MerchantCategory[];
  metadata?: Partial<StoredMerchantData["metadata"]>;
}

export class MerchantDataService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Store complete merchant data from Square API
   */
  async storeMerchantData(
    userId: string,
    businessInfo: SquareBusinessInfo,
    connectionId?: string,
  ): Promise<void> {
    try {
      const merchantData = this.formatSquareBusinessInfo(businessInfo);

      // Update user profile with business data
      const { error: profileError } = await this.supabase
        .from("user_profiles")
        .update({
          business_data: {
            merchant: merchantData.merchant,
            locations: merchantData.locations,
            services: merchantData.services,
            categories: merchantData.categories,
            metadata: {
              ...merchantData.metadata,
              connection_id: connectionId,
            },
          },
        })
        .eq("id", userId);

      if (profileError) {
        throw new Error(
          `Failed to update user profile: ${profileError.message}`,
        );
      }

      console.log("Merchant data stored successfully for user:", userId);
    } catch (error) {
      console.error("Error storing merchant data:", error);
      throw new Error(
        `Failed to store merchant data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Retrieve complete merchant data for a user
   */
  async getMerchantData(userId: string): Promise<StoredMerchantData | null> {
    try {
      const { data, error } = await this.supabase
        .from("user_profiles")
        .select("business_data")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error retrieving merchant data:", error);
        return null;
      }

      if (!data?.business_data) {
        return null;
      }

      return data.business_data as StoredMerchantData;
    } catch (error) {
      console.error("Error getting merchant data:", error);
      throw new Error(
        `Failed to get merchant data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Update partial merchant data
   */
  async updateMerchantData(
    userId: string,
    updates: MerchantDataUpdate,
  ): Promise<void> {
    try {
      // Get existing data first
      const existingData = await this.getMerchantData(userId);

      if (!existingData) {
        throw new Error("No existing merchant data found to update");
      }

      // Merge updates with existing data
      const updatedData: StoredMerchantData = {
        merchant: { ...existingData.merchant, ...updates.merchant },
        locations: updates.locations || existingData.locations,
        services: updates.services || existingData.services,
        categories: updates.categories || existingData.categories,
        metadata: {
          ...existingData.metadata,
          ...updates.metadata,
          last_updated: new Date().toISOString(),
        },
      };

      const { error } = await this.supabase
        .from("user_profiles")
        .update({
          business_data: updatedData,
        })
        .eq("id", userId);

      if (error) {
        throw new Error(`Failed to update merchant data: ${error.message}`);
      }

      console.log("Merchant data updated successfully for user:", userId);
    } catch (error) {
      console.error("Error updating merchant data:", error);
      throw new Error(
        `Failed to update merchant data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Get merchant basic information
   */
  async getMerchantInfo(userId: string): Promise<MerchantInfo | null> {
    try {
      const merchantData = await this.getMerchantData(userId);
      return merchantData?.merchant || null;
    } catch (error) {
      console.error("Error getting merchant info:", error);
      return null;
    }
  }

  /**
   * Get all merchant locations
   */
  async getMerchantLocations(userId: string): Promise<MerchantLocation[]> {
    try {
      const merchantData = await this.getMerchantData(userId);
      return merchantData?.locations || [];
    } catch (error) {
      console.error("Error getting merchant locations:", error);
      return [];
    }
  }

  /**
   * Get primary merchant location
   */
  async getPrimaryLocation(userId: string): Promise<MerchantLocation | null> {
    try {
      const merchantData = await this.getMerchantData(userId);

      if (!merchantData?.locations || merchantData.locations.length === 0) {
        return null;
      }

      // Find primary location by ID or return first location
      const primaryLocationId = merchantData.merchant.primary_location_id;

      if (primaryLocationId) {
        const primaryLocation = merchantData.locations.find(
          (loc) => loc.id === primaryLocationId,
        );
        if (primaryLocation) {
          return primaryLocation;
        }
      }

      // Return first location as fallback
      return merchantData.locations[0];
    } catch (error) {
      console.error("Error getting primary location:", error);
      return null;
    }
  }

  /**
   * Get all merchant services
   */
  async getMerchantServices(userId: string): Promise<MerchantService[]> {
    try {
      const merchantData = await this.getMerchantData(userId);
      return merchantData?.services || [];
    } catch (error) {
      console.error("Error getting merchant services:", error);
      return [];
    }
  }

  /**
   * Get bookable merchant services only
   */
  async getBookableServices(userId: string): Promise<MerchantService[]> {
    try {
      const services = await this.getMerchantServices(userId);
      return services.filter((service) => service.is_bookable === true);
    } catch (error) {
      console.error("Error getting bookable services:", error);
      return [];
    }
  }

  /**
   * Find service by name
   */
  async findServiceByName(
    userId: string,
    serviceName: string,
  ): Promise<MerchantService | null> {
    try {
      const services = await this.getMerchantServices(userId);
      return services.find((service) =>
        service.name.toLowerCase() === serviceName.toLowerCase()
      ) || null;
    } catch (error) {
      console.error("Error finding service by name:", error);
      return null;
    }
  }

  /**
   * Get merchant categories
   */
  async getMerchantCategories(userId: string): Promise<MerchantCategory[]> {
    try {
      const merchantData = await this.getMerchantData(userId);
      return merchantData?.categories || [];
    } catch (error) {
      console.error("Error getting merchant categories:", error);
      return [];
    }
  }

  /**
   * Check if merchant data exists and is recent
   */
  async isMerchantDataFresh(
    userId: string,
    maxAgeHours: number = 24,
  ): Promise<boolean> {
    try {
      const merchantData = await this.getMerchantData(userId);

      if (!merchantData?.metadata?.last_updated) {
        return false;
      }

      const lastUpdated = new Date(merchantData.metadata.last_updated);
      const now = new Date();
      const ageInHours = (now.getTime() - lastUpdated.getTime()) /
        (1000 * 60 * 60);

      return ageInHours < maxAgeHours;
    } catch (error) {
      console.error("Error checking merchant data freshness:", error);
      return false;
    }
  }

  /**
   * Delete merchant data
   */
  async deleteMerchantData(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("user_profiles")
        .update({
          business_data: null,
        })
        .eq("id", userId);

      if (error) {
        throw new Error(`Failed to delete merchant data: ${error.message}`);
      }

      console.log("Merchant data deleted successfully for user:", userId);
    } catch (error) {
      console.error("Error deleting merchant data:", error);
      throw new Error(
        `Failed to delete merchant data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Format Square business info for storage
   */
  private formatSquareBusinessInfo(
    businessInfo: SquareBusinessInfo,
  ): StoredMerchantData {
    // Format merchant info
    const merchant: MerchantInfo = {
      id: businessInfo.merchant?.id || "",
      business_name: businessInfo.merchant?.businessName,
      country: businessInfo.merchant?.country || "",
      language_code: businessInfo.merchant?.languageCode || "",
      currency: businessInfo.merchant?.currency,
      square_merchant_id: businessInfo.merchant?.id,
      primary_location_id: businessInfo.locations?.[0]?.id,
      last_sync_at: new Date().toISOString(),
    };

    // Format locations
    const locations: MerchantLocation[] =
      businessInfo.locations?.map((loc) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address
          ? {
            address_line_1: loc.address.addressLine1,
            address_line_2: loc.address.addressLine2,
            locality: loc.address.locality,
            administrative_district_level_1:
              loc.address.administrativeDistrictLevel1,
            postal_code: loc.address.postalCode,
            country: loc.address.country,
          }
          : undefined,
        phone_number: loc.phoneNumber,
        business_hours: loc.businessHours?.periods
          ? {
            periods: loc.businessHours.periods.map((period) => ({
              day_of_week: period.dayOfWeek,
              start_local_time: period.startLocalTime,
              end_local_time: period.endLocalTime,
            })),
          }
          : undefined,
        timezone: loc.timezone,
        coordinates: loc.coordinates,
      })) || [];

    // Format services
    const services: MerchantService[] =
      businessInfo.catalog?.services?.map((service) => ({
        id: service.id,
        name: service.name || "",
        description: service.descriptionPlaintext,
        is_bookable: service.isService || false,
        category_id: service.categories?.[0]?.id,
        category_name: service.categories?.[0]?.name,
        // Set service-level duration and price from first variation if available
        duration_minutes: service.variations?.[0]?.serviceDuration
          ? Math.floor(service.variations[0].serviceDuration / 60000) // Convert milliseconds to minutes
          : undefined,
        price_amount: service.variations?.[0]?.priceMoney?.amount,
        price_currency: service.variations?.[0]?.priceMoney?.currency,
        variations: service.variations?.map((variation) => ({
          id: variation.id,
          name: variation.name,
          duration_minutes: variation.serviceDuration
            ? Math.floor(variation.serviceDuration / 60000) // Convert milliseconds to minutes
            : undefined,
          price_amount: variation.priceMoney?.amount,
          price_currency: variation.priceMoney?.currency,
          is_bookable: variation.availableForBooking || false,
        })),
      })) || [];

    // Format categories
    const categories: MerchantCategory[] =
      businessInfo.catalog?.categories?.map((category) => ({
        id: category.id,
        name: category.name || "",
      })) || [];

    return {
      merchant,
      locations,
      services,
      categories,
      metadata: {
        last_updated: new Date().toISOString(),
        data_source: "square",
        sync_status: "complete",
      },
    };
  }

  /**
   * Get merchant data summary for quick access
   */
  async getMerchantSummary(userId: string): Promise<
    {
      businessName?: string;
      primaryLocation?: {
        name?: string;
        address?: string;
        phone?: string;
      };
      servicesCount: number;
      bookableServicesCount: number;
      locationsCount: number;
      lastSyncAt?: string;
    } | null
  > {
    try {
      const merchantData = await this.getMerchantData(userId);

      if (!merchantData) {
        return null;
      }

      const primaryLocation = merchantData.locations.find(
        (loc) => loc.id === merchantData.merchant.primary_location_id,
      ) || merchantData.locations[0];

      const bookableServices = merchantData.services.filter(
        (service) => service.is_bookable,
      );

      return {
        businessName: merchantData.merchant.business_name,
        primaryLocation: primaryLocation
          ? {
            name: primaryLocation.name,
            address: primaryLocation.address?.address_line_1,
            phone: primaryLocation.phone_number,
          }
          : undefined,
        servicesCount: merchantData.services.length,
        bookableServicesCount: bookableServices.length,
        locationsCount: merchantData.locations.length,
        lastSyncAt: merchantData.metadata.last_updated,
      };
    } catch (error) {
      console.error("Error getting merchant summary:", error);
      return null;
    }
  }
}
