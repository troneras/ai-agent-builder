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

export interface ConnectionUpsertPayload {
  userId: string;
  integrationId: string;
  connectionId: string;
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
   * Get integration by provider config key
   */
  async getIntegrationByProviderConfigKey(providerConfigKey: string) {
    try {
      const { data: integration, error: integrationError } = await this
        .supabaseClient
        .from("integrations")
        .select("*")
        .eq("ext_integration_id", providerConfigKey)
        .single();

      if (integrationError) {
        console.error(
          "Error fetching integration:",
          integrationError,
        );
        throw integrationError;
      }

      return integration;
    } catch (error) {
      console.error("Error getting integration:", error);
      throw error;
    }
  }

  /**
   * Upsert connection record in database
   */
  async upsertConnection(payload: ConnectionUpsertPayload) {
    try {
      const upsertPayload = {
        user_id: payload.userId,
        integration_id: payload.integrationId,
        connection_id: payload.connectionId,
        status: "active",
        metadata: {
          provider: payload.providerConfigKey,
          connected_at: new Date().toISOString(),
        },
      };

      console.log("Upserting connection with payload:", upsertPayload);

      const { error: upsertError, data: upsertData } = await this
        .supabaseClient.from("connections").upsert(
          upsertPayload,
          { onConflict: "user_id,integration_id" },
        );

      if (upsertError) {
        console.error("Upsert error while saving connection:", upsertError);
        throw new Error(
          `Failed to save connection: ${upsertError.message || upsertError}`,
        );
      }

      return upsertData;
    } catch (error) {
      console.error("Error upserting connection:", error);
      throw error;
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
