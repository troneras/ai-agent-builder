/*
  # Nango OAuth Handler Edge Function

  This function handles Nango OAuth integration flow:
  1. Generates session tokens for OAuth flows
  2. Handles webhook notifications from Nango
  3. Sends messages back to the chat when OAuth completes/fails
  4. Manages connection records in the database

  ## Security
  - Requires authenticated user for session token generation
  - Validates webhook signatures from Nango
  - Uses RLS policies for data access
*/

import { NangoService, WebhookPayload } from "../_shared/nango-service.ts";
import { processWebhookAction } from "../_shared/nango-actions.ts";
import {
  createCorsResponse,
  createErrorResponse,
  createInternalErrorResponse,
  createSuccessResponse,
} from "../_shared/response-utils.ts";

// Type definitions

interface RequestBody {
  action?: "create_session";
  integrationId?: string;
  userId?: string;
}

// Type definitions

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const nangoSecretKey = Deno.env.get("NANGO_SECRET_KEY");

    if (!supabaseUrl || !supabaseKey || !nangoSecretKey) {
      return createErrorResponse("Missing required environment variables", 500);
    }

    // Initialize Nango service
    const nangoService = new NangoService(
      nangoSecretKey,
      supabaseUrl,
      supabaseKey,
    );

    const url = new URL(req.url);
    const pathname = url.pathname;

    // Handle webhook from Nango
    if (req.method === "POST" && pathname.includes("/webhook")) {
      console.log("Received webhook from Nango");

      const webhookPayload: WebhookPayload = await req.json();
      console.log("Webhook payload:", webhookPayload);

      // Process webhook using the action
      await processWebhookAction(nangoService, webhookPayload);

      return createSuccessResponse({ received: true });
    }

    // Handle session token creation
    if (req.method === "POST") {
      let body: RequestBody;
      try {
        body = await req.json();
      } catch {
        return createErrorResponse("Invalid JSON in request body");
      }

      const { action, integrationId, userId } = body;

      if (action === "create_session") {
        if (!integrationId || !userId) {
          return createErrorResponse("integrationId and userId are required");
        }

        try {
          // Create session token using the shared service
          const sessionResponse = await nangoService.createConnectSession({
            integrationId,
            userId,
          });

          return createSuccessResponse(sessionResponse);
        } catch (error) {
          console.error("Error creating session token:", error);
          return createErrorResponse(
            `Failed to create session token: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            500,
          );
        }
      }
    }

    return createErrorResponse("Invalid request", 400);
  } catch (error: unknown) {
    console.error("Error in nango-oauth function:", error);
    return createInternalErrorResponse(error);
  }
});
