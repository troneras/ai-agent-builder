import { SupabaseClient } from "@supabase/supabase-js";
import { NangoService } from "./nango-service.ts";
import { getSquareProviderConfigKey } from "./square-config.ts";

export interface SquareConnectionInfo {
  accessToken: string;
  connectionId: string;
}

/**
 * Get Square access token for a user using the Nango service
 * @param userId - The user ID to get the connection for
 * @param supabaseClient - Supabase client instance
 * @param nangoService - Nango service instance
 * @returns Square connection information including access token
 * @throws Error if connection not found or invalid
 */
export async function getSquareAccessToken(
  userId: string,
  supabaseClient: SupabaseClient,
  nangoService: NangoService,
): Promise<SquareConnectionInfo> {
  // Get the user's Square connection ID from the database
  const { data: nangoConnection, error: nangoError } = await supabaseClient
    .from("connections")
    .select("connection_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (nangoError || !nangoConnection) {
    throw new Error(
      "Square connection not found. Please connect your Square account first.",
    );
  }

  // Get connection credentials from Nango
  const connectionInfo = await nangoService.getConnection(
    getSquareProviderConfigKey(),
    nangoConnection.connection_id,
  );

  if (!connectionInfo.credentials.access_token) {
    throw new Error("No access token found for Square connection");
  }

  return {
    accessToken: connectionInfo.credentials.access_token,
    connectionId: nangoConnection.connection_id,
  };
}
