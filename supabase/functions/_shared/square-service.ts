import { Square, SquareClient, SquareEnvironment } from "square";

export interface SquareBusinessInfo {
  merchant?: {
    id: string;
    businessName?: string;
    country: string;
    languageCode: string;
    currency?: string;
  };
  locations?: {
    id: string;
    name?: string;
    address?: {
      addressLine1?: string;
      addressLine2?: string;
      locality?: string; // city
      administrativeDistrictLevel1?: string; // state
      postalCode?: string;
      country?: string;
    };
    phoneNumber?: string;
    businessHours?: {
      periods?: Array<{
        dayOfWeek: string;
        startLocalTime?: string;
        endLocalTime?: string;
      }>;
    };
    timezone?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  }[];
  catalog?: {
    services?: Square.CatalogObject[];
    items?: Square.CatalogObject[];
  };
  hasOnlineStore?: boolean;
}

export class SquareService {
  private client: SquareClient;

  constructor(accessToken: string, useSandbox = false) {
    this.client = new SquareClient({
      token: accessToken,
      environment: useSandbox
        ? SquareEnvironment.Sandbox
        : SquareEnvironment.Production,
    });
  }

  /**
   * Retrieve comprehensive business information from Square
   */
  async getBusinessInformation(): Promise<SquareBusinessInfo> {
    const businessInfo: SquareBusinessInfo = {};

    try {
      // Get merchant information
      const merchantInfo = await this.getMerchantInfo();
      if (merchantInfo) {
        businessInfo.merchant = merchantInfo;
      }

      // Get locations information
      const locations = await this.getLocations();
      if (locations && locations.length > 0) {
        businessInfo.locations = locations;
      }

      // Get catalog information (services and products)
      const catalog = await this.getCatalogInfo();
      if (catalog) {
        businessInfo.catalog = catalog;
      }

      return businessInfo;
    } catch (error) {
      console.error(
        "Error retrieving Square business information:",
        error,
      );
      throw new Error(
        `Failed to retrieve business information: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Get merchant information
   */
  private async getMerchantInfo() {
    try {
      const result = await this.client.merchants.list();

      if (result.data.length > 0) {
        const merchant = result.data[0];
        return {
          id: merchant?.id || "",
          businessName: merchant?.businessName || undefined,
          country: merchant?.country || "",
          languageCode: merchant?.languageCode || "",
          currency: merchant?.currency || undefined,
        };
      }
    } catch (error) {
      console.error("Error getting merchant info:", error);
      // Don't throw, just log and continue
    }
    return null;
  }

  /**
   * Get all business locations
   */
  private async getLocations() {
    try {
      const result = await this.client.locations.list();

      if (result.locations) {
        return result.locations.map((location: Square.Location) => ({
          id: location.id || "",
          name: location.name || undefined,
          address: location.address
            ? {
              addressLine1: location.address.addressLine1 || undefined,
              addressLine2: location.address.addressLine2 || undefined,
              locality: location.address.locality || undefined,
              administrativeDistrictLevel1:
                location.address.administrativeDistrictLevel1 || undefined,
              postalCode: location.address.postalCode || undefined,
              country: location.address.country || undefined,
            }
            : undefined,
          phoneNumber: location.phoneNumber || undefined,
          businessHours: location.businessHours
            ? {
              periods: location.businessHours.periods?.map(
                (period: Square.BusinessHoursPeriod) => ({
                  dayOfWeek: period.dayOfWeek || "",
                  startLocalTime: period.startLocalTime || undefined,
                  endLocalTime: period.endLocalTime || undefined,
                }),
              ),
            }
            : undefined,
          timezone: location.timezone || undefined,
          coordinates: location.coordinates
            ? {
              latitude: location.coordinates.latitude || undefined,
              longitude: location.coordinates.longitude || undefined,
            }
            : undefined,
        }));
      }
    } catch (error) {
      console.error("Error getting locations:", error);
      // Don't throw, just log and continue
    }
    return null;
  }

  /**
   * Get catalog information (services and products)
   */
  private async getCatalogInfo() {
    try {
      const result = await this.client.catalog.list({
        types: "ITEM",
      });

      if (result) {
        const services: Square.CatalogObject[] = [];
        const items: Square.CatalogObject[] = [];

        result.data.forEach((obj: Square.CatalogObject) => {
          if (
            obj.type === "ITEM" && (obj as Square.CatalogObject.Item).itemData
          ) {
            const item = obj as Square.CatalogObject.Item;
            // Check if it's a service (has variations with service-like properties)
            const hasServiceCharacteristics = item.itemData!
              .variations?.some((variation: Square.CatalogObject) =>
                (variation as Square.CatalogObject.ItemVariation)
                  .itemVariationData?.serviceDuration !==
                  undefined
              );

            if (hasServiceCharacteristics) {
              services.push(item);
            } else {
              items.push(item);
            }
          }
        });

        return {
          services: services.length > 0 ? services : undefined,
          items: items.length > 0 ? items : undefined,
        };
      }
    } catch (error) {
      console.error("Error getting catalog info:", error);
      // Don't throw, just log and continue
    }
    return null;
  }

  /**
   * Format business hours for display
   */
  static formatBusinessHours(
    periods?: Array<{
      dayOfWeek: string;
      startLocalTime?: string;
      endLocalTime?: string;
    }>,
  ): string {
    if (!periods || periods.length === 0) {
      return "Hours not specified";
    }

    const dayOrder = [
      "MON",
      "TUE",
      "WED",
      "THU",
      "FRI",
      "SAT",
      "SUN",
    ];

    const formattedHours = dayOrder.map((day) => {
      const period = periods.find((p) => p.dayOfWeek === day);
      if (period && period.startLocalTime && period.endLocalTime) {
        const dayName = {
          "MON": "Monday",
          "TUE": "Tuesday",
          "WED": "Wednesday",
          "THU": "Thursday",
          "FRI": "Friday",
          "SAT": "Saturday",
          "SUN": "Sunday",
        }[day];

        return `${dayName}: ${period.startLocalTime} - ${period.endLocalTime}`;
      }
      return null;
    }).filter(Boolean);

    return formattedHours.join("\n");
  }

  /**
   * Extract services list for onboarding
   */
  static extractServices(
    catalog?: {
      services?: Square.CatalogObject[];
      items?: Square.CatalogObject[];
    },
  ): string[] {
    const services: string[] = [];

    // Add services from catalog services
    if (catalog?.services) {
      catalog.services.forEach((service) => {
        const name = (service as Square.CatalogObject.Item).itemData?.name;
        if (service.type === "ITEM" && name) {
          services.push(name);
        }
      });
    }

    // Add items that could be services
    if (catalog?.items) {
      catalog.items.forEach((item) => {
        const name = (item as Square.CatalogObject.Item).itemData?.name;
        if (item.type === "ITEM" && name) {
          services.push(name);
        }
      });
    }

    return services;
  }
}
