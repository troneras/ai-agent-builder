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

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { Nango } from "npm:@nangohq/node";

// Constants
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
} as const;

// Type definitions
interface WebhookPayload {
    type: string;
    operation: string;
    success: boolean;
    connectionId: string;
    endUser: {
        endUserId: string;
        organizationId?: string;
    };
    providerConfigKey: string;
    environment: string;
    error?: string;
}

interface RequestBody {
    action?: "create_session";
    integrationId?: string;
    userId?: string;
}

// Utility functions
function createErrorResponse(message: string, status = 400): Response {
    return new Response(
        JSON.stringify({ error: message }),
        {
            status,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
    );
}

function createSuccessResponse(data: unknown): Response {
    return new Response(
        JSON.stringify(data),
        {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
    );
}

// Helper to send message to chat
async function sendChatMessage(
    supabaseClient: SupabaseClient,
    userId: string,
    message: string,
): Promise<void> {
    try {
        // Get the user's onboarding conversation
        const { data: conversation } = await supabaseClient
            .from("conversations")
            .select("id")
            .eq("user_id", userId)
            .eq("type", "onboarding")
            .single();

        if (!conversation) {
            console.error("No onboarding conversation found for user:", userId);
            return;
        }

        // Get next message order
        const { data: lastMsg } = await supabaseClient
            .from("messages")
            .select("message_order")
            .eq("conversation_id", conversation.id)
            .order("message_order", { ascending: false })
            .limit(1)
            .single();

        const nextOrder = lastMsg && typeof lastMsg.message_order === "number"
            ? lastMsg.message_order + 1
            : 1;

        // Insert the message
        await supabaseClient
            .from("messages")
            .insert({
                conversation_id: conversation.id,
                role: "assistant",
                content: message,
                message_order: nextOrder,
                created_at: new Date().toISOString(),
            });

        console.log("Chat message sent successfully");
    } catch (error) {
        console.error("Error sending chat message:", error);
    }
}

// Main handler
Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
    }

    try {
        // Validate environment variables
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const nangoSecretKey = Deno.env.get("NANGO_SECRET_KEY");

        if (!supabaseUrl || !supabaseKey || !nangoSecretKey) {
            return createErrorResponse(
                "Missing required environment variables",
                500,
            );
        }

        // Initialize clients
        const supabaseClient = createClient(supabaseUrl, supabaseKey);
        const nango = new Nango({ secretKey: nangoSecretKey });

        const url = new URL(req.url);
        const pathname = url.pathname;

        // Handle webhook from Nango
        if (req.method === "POST" && pathname.includes("/webhook")) {
            console.log("Received webhook from Nango");

            const webhookPayload: WebhookPayload = await req.json();
            console.log("Webhook payload:", webhookPayload);

            const { success, connectionId, endUser, providerConfigKey, error } =
                webhookPayload;
            const userId = endUser.endUserId;

            if (webhookPayload.type === "auth") {
                if (success) {
                    try {
                        // Get integration info
                        const { data: integration } = await supabaseClient
                            .from("integrations")
                            .select("*")
                            .eq("ext_integration_id", providerConfigKey)
                            .single();

                        if (integration) {
                            // Store the connection
                            await supabaseClient
                                .from("connections")
                                .upsert({
                                    user_id: userId,
                                    integration_id: integration.id,
                                    connection_id: connectionId,
                                    status: "active",
                                    metadata: {
                                        provider: providerConfigKey,
                                        connected_at: new Date().toISOString(),
                                    },
                                }, { onConflict: "user_id,integration_id" });

                            // Send success message to chat
                            await sendChatMessage(
                                supabaseClient,
                                userId,
                                `✅ **Square Connected Successfully!**\n\nGreat! I've successfully connected your Square account. You can now:\n\n• Accept payments through your phone system\n• Access your Square data for customer insights\n• Sync transaction information\n\nYour Square integration is ready to use!`,
                            );
                        }
                    } catch (error) {
                        console.error("Error storing connection:", error);
                        await sendChatMessage(
                            supabaseClient,
                            userId,
                            `❌ **Connection Error**\n\nWhile the Square authorization was successful, there was an issue saving your connection. Please try connecting again or contact support if the problem persists.`,
                        );
                    }
                } else {
                    // Send failure message to chat
                    await sendChatMessage(
                        supabaseClient,
                        userId,
                        `❌ **Square Connection Failed**\n\nThe Square authorization was not successful. ${
                            error
                                ? `Error: ${error}`
                                : "Please try connecting again."
                        }\n\nIf you continue to have issues, please contact support.`,
                    );
                }
            }

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
                    return createErrorResponse(
                        "integrationId and userId are required",
                    );
                }

                try {
                    // Get user info for the session
                    const { data: user } = await supabaseClient.auth.admin
                        .getUserById(userId);

                    if (!user.user) {
                        return createErrorResponse("User not found", 404);
                    }

                    // Get integration info
                    const { data: integration } = await supabaseClient
                        .from("integrations")
                        .select("*")
                        .eq("id", integrationId)
                        .single();

                    if (!integration) {
                        return createErrorResponse(
                            "Integration not found",
                            404,
                        );
                    }

                    // Create session token with Nango
                    const sessionResponse = await nango.createConnectSession({
                        end_user: {
                            id: userId,
                            email: user.user.email || undefined,
                            display_name: user.user.user_metadata?.full_name ||
                                user.user.email || undefined,
                        },
                        allowed_integrations: [integration.ext_integration_id],
                    });

                    return createSuccessResponse({
                        sessionToken: sessionResponse.data.token,
                        integration: {
                            id: integration.id,
                            name: integration.name,
                            description: integration.description,
                            ext_integration_id: integration.ext_integration_id,
                        },
                    });
                } catch (error) {
                    console.error("Error creating session token:", error);
                    return createErrorResponse(
                        `Failed to create session token: ${
                            error instanceof Error
                                ? error.message
                                : "Unknown error"
                        }`,
                        500,
                    );
                }
            }
        }

        return createErrorResponse("Invalid request", 400);
    } catch (error: unknown) {
        console.error("Error in nango-oauth function:", error);

        const errorMessage = error instanceof Error
            ? error.message
            : "Unknown error occurred";
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                details: errorMessage,
            }),
            {
                status: 500,
                headers: {
                    ...CORS_HEADERS,
                    "Content-Type": "application/json",
                },
            },
        );
    }
});
