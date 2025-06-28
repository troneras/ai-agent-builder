import { NangoService, WebhookPayload } from "./nango-service.ts";

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

  const { success, connectionId, endUser, providerConfigKey, error, type } =
    webhookPayload;
  const userId = endUser.endUserId;

  if (type === "auth") {
    if (success) {
      await handleSuccessfulAuthAction(
        nangoService,
        userId,
        connectionId,
        providerConfigKey,
      );
    } else if (error) {
      await handleFailedAuthAction(
        userId,
        connectionId,
        providerConfigKey,
        error,
      );
    }
  }

  // Here you could add handling for other webhook types:
  // - sync events
  // - connection status changes
  // - etc.
}
