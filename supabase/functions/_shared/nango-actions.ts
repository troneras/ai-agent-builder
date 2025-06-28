import { NangoService, WebhookPayload } from "./nango-service.ts";
import { getSquareProviderConfigKey } from "./square-config.ts";

/**
 * Handle successful authentication action
 * This encapsulates the business logic for processing a successful OAuth authentication
 */
export async function handleSuccessfulAuthAction(
  nangoService: NangoService,
  userId: string,
  connectionId: string,
  providerConfigKey: string,
): Promise<void> {
  try {
    console.log(
      "[handleSuccessfulAuthAction] userId:",
      userId,
      "connectionId:",
      connectionId,
      "providerConfigKey:",
      providerConfigKey,
    );

    // Get integration info using the service
    const integration = await nangoService.getIntegrationByProviderConfigKey(
      providerConfigKey,
    );

    console.log("[handleSuccessfulAuthAction] integration:", integration);

    if (!integration) {
      console.error(
        "[handleSuccessfulAuthAction] Integration not found for providerConfigKey:",
        providerConfigKey,
      );
      throw new Error(
        `Integration not found for provider: ${providerConfigKey}`,
      );
    }

    // Store the connection using the service
    await nangoService.upsertConnection({
      userId,
      integrationId: integration.id,
      connectionId,
      providerConfigKey,
    });

    console.log("[handleSuccessfulAuthAction] Connection successfully stored");

    // Trigger import process for Square connections
    if (providerConfigKey === getSquareProviderConfigKey()) {
      console.log(
        "[handleSuccessfulAuthAction] Starting Square import process for user:",
        userId,
      );

      try {
        // Call the import processor to start processing tasks
        const response = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/import-processor`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              action: "process_all_pending",
              userId: userId,
            }),
          },
        );

        if (!response.ok) {
          console.error(
            "[handleSuccessfulAuthAction] Failed to trigger import process:",
            await response.text(),
          );
        } else {
          console.log(
            "[handleSuccessfulAuthAction] Import process triggered successfully",
          );
        }
      } catch (error) {
        console.error(
          "[handleSuccessfulAuthAction] Error triggering import process:",
          error,
        );
        // Don't throw here - the connection was successful, import can be retried later
      }
    }
  } catch (error) {
    console.error(
      "[handleSuccessfulAuthAction] Error handling successful auth:",
      error,
    );
    throw error;
  }
}

/**
 * Handle failed authentication action
 * This encapsulates the business logic for processing a failed OAuth authentication
 */
export async function handleFailedAuthAction(
  userId: string,
  connectionId: string,
  providerConfigKey: string,
  error: string,
): Promise<void> {
  console.error(
    "[handleFailedAuthAction] Authentication failed for user:",
    userId,
    "connectionId:",
    connectionId,
    "providerConfigKey:",
    providerConfigKey,
    "error:",
    error,
  );

  // Here you could add logic to:
  // - Log the failure to a database
  // - Send notifications to the user
  // - Update connection status to 'failed'
  // - etc.
}

/**
 * Process webhook payload action
 * This orchestrates the handling of different webhook types
 */
export async function processWebhookAction(
  nangoService: NangoService,
  webhookPayload: WebhookPayload,
): Promise<void> {
  console.log(
    "[processWebhookAction] Processing Nango webhook:",
    webhookPayload,
  );

  const {
    success,
    connectionId,
    endUser,
    end_user,
    providerConfigKey,
    error,
    type,
  } = webhookPayload;

  // Extract userId from either endUser.endUserId or end_user.id
  let userId: string | undefined;
  if (endUser?.endUserId) {
    userId = endUser.endUserId;
  } else if (end_user?.id) {
    userId = end_user.id;
  }

  // Handle webhooks without user information (common for error webhooks)
  if (!userId) {
    console.warn(
      "[processWebhookAction] Webhook received without user information - this is common for error webhooks:",
      {
        type,
        success,
        connectionId,
        providerConfigKey,
        error: typeof error === "object" ? error.description : error,
      },
    );

    // For auth error webhooks, we can still log the error even without user info
    if (type === "auth" && !success && error) {
      const errorMessage = typeof error === "object"
        ? error.description
        : error;
      console.error(
        `[processWebhookAction] Authentication failed for connection ${connectionId} on provider ${providerConfigKey}: ${errorMessage}`,
      );

      // Could potentially store this error in a logs table or send notifications
      // but for now, we'll just log it and return successfully
      return;
    }

    // For other cases without user info, log and skip processing
    console.info(
      "[processWebhookAction] Skipping webhook processing due to missing user information",
    );
    return;
  }

  if (type === "auth") {
    if (success) {
      await handleSuccessfulAuthAction(
        nangoService,
        userId,
        connectionId,
        providerConfigKey,
      );
    } else if (error) {
      const errorMessage = typeof error === "object"
        ? error.description
        : error;
      await handleFailedAuthAction(
        userId,
        connectionId,
        providerConfigKey,
        errorMessage,
      );
    }
  }

  // Here you could add handling for other webhook types:
  // - sync events
  // - connection status changes
  // - etc.
}
