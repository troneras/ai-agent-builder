import { Square, SquareClient, SquareEnvironment } from "square";

export interface SquareItemVariation {
  id: string;
  name?: string;
  availableForBooking?: boolean;
  serviceDuration?: number;
  pricingType?: string;
  priceMoney?: {
    amount?: number;
    currency?: string;
  };
}

export interface SquareCategory {
  id: string;
  name?: string;
}

export interface SquareItem {
  id: string;
  name?: string;
  descriptionPlaintext?: string;
  categories?: SquareCategory[];
  variations?: SquareItemVariation[];
  isService?: boolean;
}

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
    categories?: SquareCategory[];
    items?: SquareItem[];
    services?: SquareItem[];
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
  async getMerchantInfo() {
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
  async getLocations() {
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
  async getCatalogInfo() {
    try {
      const result = await this.client.catalog.list({
        types: "ITEM,ITEM_VARIATION,CATEGORY",
      });

      if (result) {
        const categories: SquareCategory[] = [];
        const services: SquareItem[] = [];
        const items: SquareItem[] = [];

        // Create maps for efficient lookups
        const categoryMap = new Map<string, SquareCategory>();
        const variationMap = new Map<string, SquareItemVariation>();

        // First pass: Extract categories and variations
        result.data.forEach((obj: Square.CatalogObject) => {
          if (obj.type === "CATEGORY" && obj.id) {
            const categoryData =
              (obj as Square.CatalogObject.Category).categoryData;
            const category: SquareCategory = {
              id: obj.id,
              name: categoryData?.name ?? undefined,
            };
            categories.push(category);
            categoryMap.set(obj.id, category);
          } else if (obj.type === "ITEM_VARIATION" && obj.id) {
            const variationData =
              (obj as Square.CatalogObject.ItemVariation).itemVariationData;
            const variation: SquareItemVariation = {
              id: obj.id,
              name: variationData?.name || undefined,
              availableForBooking: variationData?.availableForBooking ||
                undefined,
              serviceDuration: variationData?.serviceDuration
                ? Number(variationData.serviceDuration)
                : undefined,
              pricingType: variationData?.pricingType || undefined,
              priceMoney: variationData?.priceMoney
                ? {
                  amount: variationData.priceMoney.amount
                    ? Number(variationData.priceMoney.amount)
                    : undefined,
                  currency: variationData.priceMoney.currency || undefined,
                }
                : undefined,
            };
            variationMap.set(obj.id, variation);
          }
        });

        // Second pass: Process items and link with categories and variations
        result.data.forEach((obj: Square.CatalogObject) => {
          if (obj.type === "ITEM" && obj.id) {
            const itemData = (obj as Square.CatalogObject.Item).itemData;
            if (itemData) {
              // Get item categories (categories are optional - items may not have any)
              const itemCategories: SquareCategory[] = [];
              if (itemData.categoryId) {
                const category = categoryMap.get(itemData.categoryId);
                if (category) {
                  itemCategories.push(category);
                }
              }

              // Get item variations
              const itemVariations: SquareItemVariation[] = [];
              if (itemData.variations) {
                itemData.variations.forEach((variation) => {
                  if (variation.id) {
                    const variationDetail = variationMap.get(variation.id);
                    if (variationDetail) {
                      itemVariations.push(variationDetail);
                    }
                  }
                });
              }

              // Check if it's a service (has variations with service-like properties)
              const isService = itemVariations.some((variation) =>
                variation.serviceDuration !== undefined
              );

              const squareItem: SquareItem = {
                id: obj.id,
                name: itemData.name ?? undefined,
                descriptionPlaintext: itemData.descriptionPlaintext ??
                  undefined,
                categories: itemCategories.length > 0
                  ? itemCategories
                  : undefined,
                variations: itemVariations.length > 0
                  ? itemVariations
                  : undefined,
                isService,
              };

              if (isService) {
                services.push(squareItem);
              } else {
                items.push(squareItem);
              }
            }
          }
        });

        return {
          categories: categories.length > 0 ? categories : undefined,
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
      categories?: SquareCategory[];
      services?: SquareItem[];
      items?: SquareItem[];
    },
  ): string[] {
    const services: string[] = [];

    // Add services from catalog services
    if (catalog?.services) {
      catalog.services.forEach((service) => {
        if (service.name) {
          services.push(service.name);
        }
      });
    }

    // Add items that could be services
    if (catalog?.items) {
      catalog.items.forEach((item) => {
        if (item.name && item.isService) {
          services.push(item.name);
        }
      });
    }

    return services;
  }
}
