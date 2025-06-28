import { Nango } from "@nangohq/node";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Type definitions
export interface WebhookPayload {
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

export interface NangoCredentials {
  access_token: string;
}

export interface SessionTokenRequest {
  integrationId: string;
  userId: string;
}

export interface SessionTokenResponse {
  sessionToken: string;
  integration: {
    id: string;
    name: string;
    description: string;
    ext_integration_id: string;
  };
}

export interface NangoConnectionInfo {
  connectionId: string;
  credentials: NangoCredentials;
  providerConfigKey: string;
}

export class NangoService {
  private client: Nango;
  private supabaseClient: SupabaseClient;

  constructor(secretKey: string, supabaseUrl: string, supabaseKey: string) {
    this.client = new Nango({ secretKey });
    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Create a connect session for OAuth flow
   */
  async createConnectSession(
    request: SessionTokenRequest,
  ): Promise<SessionTokenResponse> {
    try {
      const { integrationId, userId } = request;

      // Get user info for the session
      const { data: user } = await this.supabaseClient.auth.admin.getUserById(
        userId,
      );

      if (!user.user) {
        throw new Error("User not found");
      }

      // Get integration info
      const { data: integration } = await this.supabaseClient
        .from("integrations")
        .select("*")
        .eq("id", integrationId)
        .single();

      if (!integration) {
        throw new Error("Integration not found");
      }

      // Create session token with Nango
      const sessionResponse = await this.client.createConnectSession({
        end_user: {
          id: userId,
          email: user.user.email || undefined,
          display_name: user.user.user_metadata?.["full_name"] ||
            user.user.email ||
            undefined,
        },
        allowed_integrations: [integration.ext_integration_id],
      });

      return {
        sessionToken: sessionResponse.data.token,
        integration: {
          id: integration.id,
          name: integration.name,
          description: integration.description,
          ext_integration_id: integration.ext_integration_id,
        },
      };
    } catch (error) {
      console.error("Error creating connect session:", error);
      throw new Error(
        `Failed to create session token: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Get connection credentials for a provider
   */
  async getConnection(
    connectionId: string,
    providerConfigKey: string,
  ): Promise<NangoConnectionInfo> {
    try {
      const connection = await this.client.getConnection(
        connectionId,
        providerConfigKey,
      );

      if (!connection || !connection.credentials) {
        throw new Error("No valid connection credentials found");
      }

      return {
        connectionId,
        credentials: connection.credentials as NangoCredentials,
        providerConfigKey,
      };
    } catch (error) {
      console.error("Error getting connection:", error);
      throw new Error(
        `Failed to get connection: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Process webhook payload from Nango
   */
  async processWebhook(webhookPayload: WebhookPayload): Promise<void> {
    console.log("Processing Nango webhook:", webhookPayload);

    const { success, connectionId, endUser, providerConfigKey, error, type } =
      webhookPayload;
    const userId = endUser.endUserId;

    if (type === "auth") {
      if (success) {
        await this.handleSuccessfulAuth(
          userId,
          connectionId,
          providerConfigKey,
        );
      } else {
        await this.handleFailedAuth(userId, error);
      }
    }
  }

  /**
   * Handle successful authentication
   */
  private async handleSuccessfulAuth(
    userId: string,
    connectionId: string,
    providerConfigKey: string,
  ): Promise<void> {
    try {
      console.log(
        "[handleSuccessfulAuth] userId:",
        userId,
        "connectionId:",
        connectionId,
        "providerConfigKey:",
        providerConfigKey,
      );
      // Get integration info
      const { data: integration, error: integrationError } = await this
        .supabaseClient
        .from("integrations")
        .select("*")
        .eq("ext_integration_id", providerConfigKey)
        .single();
      if (integrationError) {
        console.error(
          "[handleSuccessfulAuth] Error fetching integration:",
          integrationError,
        );
      }
      console.log("[handleSuccessfulAuth] integration:", integration);

      if (integration) {
        // Store the connection
        const upsertPayload = {
          user_id: userId,
          integration_id: integration.id,
          connection_id: connectionId,
          status: "active",
          metadata: {
            provider: providerConfigKey,
            connected_at: new Date().toISOString(),
          },
        };
        console.log(
          "[handleSuccessfulAuth] Upserting connection with payload:",
          upsertPayload,
        );
        const { error: upsertError, data: upsertData } = await this
          .supabaseClient.from("connections").upsert(
            upsertPayload,
            { onConflict: "user_id,integration_id" },
          );
        console.log("[handleSuccessfulAuth] Upsert result:", {
          upsertError,
          upsertData,
        });
        if (upsertError) {
          console.error(
            "[handleSuccessfulAuth] Upsert error while saving connection:",
            upsertError,
          );
          throw new Error(
            `Failed to save connection: ${upsertError.message || upsertError}`,
          );
        }

        // Trigger additional processing if needed (like fetching Square data)
        await this.triggerPostConnectionProcessing(
          userId,
          connectionId,
          integration,
        );

        // Send success message to chat
        await this.sendChatMessage(
          userId,
          `✅ **${integration.name} Connected Successfully!**\n\nGreat! I've successfully connected your ${integration.name} account and fetched your business data. You can now:\n\n• Accept payments through your phone system\n• Access your ${integration.name} data for customer insights\n• Sync transaction information\n• Use your menu items and business details in conversations\n\nYour ${integration.name} integration is ready to use!`,
        );
      } else {
        console.error(
          "[handleSuccessfulAuth] Integration not found for providerConfigKey:",
          providerConfigKey,
        );
      }
    } catch (error) {
      console.error(
        "[handleSuccessfulAuth] Error handling successful auth:",
        error,
      );
      await this.sendChatMessage(
        userId,
        `❌ **Connection Error**\n\nWhile the authorization was successful, there was an issue saving your connection. Please try connecting again or contact support. Error: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  /**
   * Handle failed authentication
   */
  private async handleFailedAuth(
    userId: string,
    error?: string,
  ): Promise<void> {
    await this.sendChatMessage(
      userId,
      `❌ **Connection Failed**\n\nThe authorization was not successful. ${
        error ? `Error: ${error}` : "Please try connecting again."
      }\n\nIf you continue to have issues, please contact support.`,
    );
  }

  /**
   * Trigger post-connection processing (like fetching business data)
   */
  private async triggerPostConnectionProcessing(
    userId: string,
    connectionId: string,
    integration: any,
  ): Promise<void> {
    try {
      // For now, only handle Square integration
      if (integration.ext_integration_id === "squareup-sandbox") {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (supabaseUrl && supabaseKey) {
          const squareServiceUrl = `${supabaseUrl}/functions/v1/square-service`;
          const response = await fetch(squareServiceUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              action: "fetch_business_data",
              userId: userId,
              connectionId: connectionId,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log("Business data fetched successfully:", result);
          } else {
            console.error(
              "Failed to fetch business data:",
              await response.text(),
            );
          }
        }
      }
    } catch (error) {
      console.error("Error in post-connection processing:", error);
      // Don't fail the connection process if data fetch fails
    }
  }

  /**
   * Send message to chat
   */
  private async sendChatMessage(
    userId: string,
    message: string,
  ): Promise<void> {
    try {
      // Get the user's onboarding conversation
      const { data: conversation } = await this.supabaseClient
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
      const { data: lastMsg } = await this.supabaseClient
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
      await this.supabaseClient.from("messages").insert({
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

  /**
   * Get user's active connection for a specific integration
   */
  async getUserConnection(
    userId: string,
    integrationId?: string,
  ): Promise<string | null> {
    try {
      let query = this.supabaseClient
        .from("connections")
        .select("connection_id")
        .eq("user_id", userId)
        .eq("status", "active");

      if (integrationId) {
        query = query.eq("integration_id", integrationId);
      }

      const { data: connection } = await query.single();

      return connection?.connection_id || null;
    } catch (error) {
      console.error("Error getting user connection:", error);
      return null;
    }
  }
}
