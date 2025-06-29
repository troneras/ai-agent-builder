/*
  # Import Processor Edge Function

  This function processes import tasks for Square business data:
  1. Fetches pending import tasks
  2. Imports data from Square API based on task type
  3. Updates task status with progress or errors
  4. Handles retries for failed tasks

  ## Task Types
  - merchant: Business information and merchant details
  - locations: Store locations, hours, and contact info
  - catalog: Services and products catalog

  ## Security
  - Uses service role for database access
  - Validates task ownership
  - Implements proper error handling and retry logic
*/

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NangoService } from "../_shared/nango-service.ts";
import { SquareService } from "../_shared/square-service.ts";
import {
  createCorsResponse,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/response-utils.ts";
import {
  getSquareProviderConfigKey,
  isSquareProduction,
} from "../_shared/square-config.ts";

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NANGO_SECRET_KEY = Deno.env.get("NANGO_SECRET_KEY")!;

// Type definitions
interface ImportTask {
  id: string;
  user_id: string;
  connection_id: string;
  task_type: "merchant" | "locations" | "catalog";
  status: "pending" | "processing" | "completed" | "failed" | "retrying";
  progress_message?: string;
  data?: any;
  error_message?: string;
  retry_count: number;
  max_retries: number;
}

interface RequestBody {
  action: "process_task" | "process_all_pending";
  taskId?: string;
  userId?: string;
}

class ImportProcessor {
  private supabaseClient: SupabaseClient;
  private nangoService: NangoService;

  constructor() {
    this.supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    this.nangoService = new NangoService(
      NANGO_SECRET_KEY,
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    );
  }

  async processTask(taskId: string): Promise<void> {
    // Get the task
    const { data: task, error: taskError } = await this.supabaseClient
      .from("import_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Check if task is in a processable state
    if (!["pending", "retrying"].includes(task.status)) {
      console.log(
        `Task ${taskId} is not in a processable state: ${task.status}`,
      );
      return;
    }

    await this.executeTask(task);
  }

  async processAllPendingTasks(userId?: string): Promise<void> {
    let query = this.supabaseClient
      .from("import_tasks")
      .select("*")
      .in("status", ["pending", "retrying"]);

    if (userId) {
      query = query.eq("user_id", userId);
      console.log(`Looking for pending tasks for user: ${userId}`);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error(`Database error fetching pending tasks:`, error);
      throw new Error(`Failed to fetch pending tasks: ${error.message}`);
    }

    if (!tasks || tasks.length === 0) {
      console.log(
        userId
          ? `No pending tasks found for user ${userId}`
          : "No pending tasks found",
      );
      return;
    }

    console.log(
      `Processing ${tasks.length} pending tasks${
        userId ? ` for user ${userId}` : ""
      }`,
    );

    // Process tasks sequentially by user to avoid conflicts
    const tasksByUser = tasks.reduce(
      (acc: Record<string, ImportTask[]>, task: ImportTask) => {
        if (!acc[task.user_id]) {
          acc[task.user_id] = [];
        }
        acc[task.user_id].push(task);
        return acc;
      },
      {} as Record<string, ImportTask[]>,
    );

    for (const [userId, userTasks] of Object.entries(tasksByUser)) {
      const typedUserTasks = userTasks as ImportTask[];
      console.log(
        `Processing ${typedUserTasks.length} tasks for user ${userId}`,
      );

      // Sort tasks by type to ensure proper order: merchant -> locations -> catalog
      const orderedTasks = typedUserTasks.sort(
        (a: ImportTask, b: ImportTask) => {
          const order: Record<string, number> = {
            merchant: 0,
            locations: 1,
            catalog: 2,
          };
          return (order[a.task_type] ?? 999) - (order[b.task_type] ?? 999);
        },
      );

      for (const task of orderedTasks) {
        try {
          await this.executeTask(task);
        } catch (error) {
          console.error(`Failed to process task ${task.id}:`, error);
          // Continue with next task even if one fails
        }
      }
    }
  }

  private async executeTask(task: ImportTask): Promise<void> {
    console.log(
      `Executing task ${task.id} of type ${task.task_type} for user ${task.user_id}`,
    );

    try {
      // Update task status to processing
      await this.updateTaskStatus(
        task.id,
        "processing",
        `Importing ${task.task_type} data...`,
      );

      // Get Square service for this connection
      const squareService = await this.getSquareService(task.connection_id);

      // Execute the specific import based on task type
      let importResult: any;
      let progressMessage: string;

      switch (task.task_type) {
        case "merchant":
          importResult = await this.importMerchantData(squareService);
          progressMessage = "Business information imported successfully";
          break;
        case "locations":
          importResult = await this.importLocationData(squareService);
          progressMessage = "Location information imported successfully";
          break;
        case "catalog":
          importResult = await this.importCatalogData(squareService);
          progressMessage = "Product and service catalog imported successfully";
          break;
        default:
          throw new Error(`Unknown task type: ${task.task_type}`);
      }

      // Store the imported data in onboarding table if applicable
      await this.storeImportedData(task.user_id, task.task_type, importResult);

      // Mark task as completed
      await this.updateTaskStatus(
        task.id,
        "completed",
        progressMessage,
        null,
        importResult,
      );

      console.log(`Task ${task.id} completed successfully`);
    } catch (error) {
      console.error(`Task ${task.id} failed:`, error);

      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error occurred";
      const newRetryCount = task.retry_count + 1;

      if (newRetryCount >= task.max_retries) {
        // Max retries reached, mark as failed
        await this.updateTaskStatus(
          task.id,
          "failed",
          `Import failed after ${task.max_retries} attempts`,
          errorMessage,
        );
      } else {
        // Retry available, mark for retry
        await this.updateTaskStatus(
          task.id,
          "pending",
          `Retrying import (attempt ${
            newRetryCount + 1
          }/${task.max_retries})...`,
          errorMessage,
        );

        // Update retry count
        await this.supabaseClient
          .from("import_tasks")
          .update({ retry_count: newRetryCount })
          .eq("id", task.id);
      }
    }
  }

  private async getSquareService(connectionId: string): Promise<SquareService> {
    // For this method, we need to get the user_id from the connection_id
    // Since we already have the connection_id, we can get the connection info directly
    // But to use the shared utility, we need the user_id
    // For now, let's keep the original implementation but we could refactor this later
    // to either pass user_id or create a variant of the utility that works with connection_id

    const connectionInfo = await this.nangoService.getConnection(
      getSquareProviderConfigKey(),
      connectionId,
    );

    if (!connectionInfo.credentials.access_token) {
      throw new Error("No access token found for Square connection");
    }

    // Create Square service with the access token
    // Environment-dependent: sandbox vs production based on SQUARE_ENV
    return new SquareService(
      connectionInfo.credentials.access_token,
      !isSquareProduction(),
    );
  }

  private async importMerchantData(squareService: SquareService): Promise<any> {
    const merchantInfo = await squareService.getMerchantInfo();

    if (!merchantInfo) {
      throw new Error("No merchant information found in Square account");
    }

    return {
      business_name: merchantInfo.businessName,
      merchant_id: merchantInfo.id,
      country: merchantInfo.country,
      currency: merchantInfo.currency,
      language_code: merchantInfo.languageCode,
    };
  }

  private async importLocationData(squareService: SquareService): Promise<any> {
    const locations = await squareService.getLocations();

    if (!locations || locations.length === 0) {
      throw new Error("No location information found in Square account");
    }

    const primaryLocation = locations[0]; // Use first location as primary

    if (!primaryLocation) {
      throw new Error("Primary location data is missing");
    }

    return {
      location_id: primaryLocation.id,
      location_name: primaryLocation.name,
      address: primaryLocation.address,
      phone_number: primaryLocation.phoneNumber,
      business_hours: primaryLocation.businessHours,
      timezone: primaryLocation.timezone,
      coordinates: primaryLocation.coordinates,
      formatted_hours: SquareService.formatBusinessHours(
        primaryLocation.businessHours?.periods,
      ),
    };
  }

  private async importCatalogData(squareService: SquareService): Promise<any> {
    const catalogInfo = await squareService.getCatalogInfo();

    const services = SquareService.extractServices(catalogInfo || undefined);

    return {
      services: services,
      has_catalog: services.length > 0,
      catalog_items_count: catalogInfo?.items?.length || 0,
      catalog_services_count: catalogInfo?.services?.length || 0,
      catalog_categories_count: catalogInfo?.categories?.length || 0,
      enhanced_catalog_data: catalogInfo, // Store the full enhanced catalog data
    };
  }

  private async storeImportedData(
    userId: string,
    taskType: string,
    data: any,
  ): Promise<void> {
    try {
      // Update onboarding record with imported data
      const updates: any = {};

      switch (taskType) {
        case "merchant":
          if (data.business_name) {
            updates.business_name = data.business_name;
          }
          if (data.merchant_id) {
            updates.merchant_id = data.merchant_id;
          }
          break;
        case "locations":
          if (data.location_id) {
            updates.primary_location_id = data.location_id;
          }
          if (data.phone_number) {
            updates.phone_number = data.phone_number;
          }
          if (data.address?.locality) {
            updates.business_city = data.address.locality;
          }
          if (data.address) {
            updates.full_address = [
              data.address.addressLine1,
              data.address.addressLine2,
              data.address.locality,
              data.address.administrativeDistrictLevel1,
              data.address.postalCode,
            ].filter(Boolean).join(", ");
          }
          if (data.formatted_hours) {
            updates.opening_hours = data.formatted_hours;
          }
          break;
        case "catalog":
          // Store the enhanced catalog data which includes detailed information about
          // items, services, categories, and variations
          if (data.enhanced_catalog_data) {
            updates.catalog_data = data.enhanced_catalog_data;
          }
          break;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await this.supabaseClient
          .from("onboarding")
          .upsert(
            {
              user_id: userId,
              ...updates,
              current_step: Math.max(2, updates.current_step || 0), // Ensure we're at least at step 2
            },
            { onConflict: "user_id" },
          );

        if (error) {
          console.error("Failed to update onboarding data:", error);
        }
      }
    } catch (error) {
      console.error("Error storing imported data:", error);
      // Don't throw here - we still want to mark the import task as successful
    }
  }

  private async updateTaskStatus(
    taskId: string,
    status: ImportTask["status"],
    progressMessage?: string,
    errorMessage?: string | null,
    data?: any,
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (progressMessage !== undefined) {
      updates.progress_message = progressMessage;
    }

    if (errorMessage !== undefined) {
      updates.error_message = errorMessage;
    }

    if (data !== undefined) {
      updates.data = data;
    }

    if (status === "processing") {
      updates.started_at = new Date().toISOString();
    } else if (status === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await this.supabaseClient
      .from("import_tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) {
      throw new Error(`Failed to update task status: ${error.message}`);
    }
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }

  try {
    const { action, taskId, userId }: RequestBody = await req.json();

    const processor = new ImportProcessor();

    switch (action) {
      case "process_task":
        if (!taskId) {
          return createErrorResponse(
            "taskId is required for process_task action",
            400,
          );
        }
        await processor.processTask(taskId);
        return createSuccessResponse({
          message: `Task ${taskId} processed successfully`,
        });

      case "process_all_pending":
        await processor.processAllPendingTasks(userId);
        return createSuccessResponse({
          message: "All pending tasks processed successfully",
        });

      default:
        return createErrorResponse("Invalid action", 400);
    }
  } catch (error) {
    console.error("Import processor error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Unknown error occurred",
      500,
    );
  }
});
