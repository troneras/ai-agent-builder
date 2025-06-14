-- Migration: Add Nango integration tables
-- Description: Creates tables to manage integrations and user connections for Nango

-- Create enum for auth types
CREATE TYPE auth_type AS ENUM ('oauth', 'oauth2', 'api_key', 'basic_auth', 'custom');

-- Create enum for connection status
CREATE TYPE connection_status AS ENUM ('active', 'expired', 'error', 'pending', 'revoked');

-- integrations table
-- Stores available integrations/apps that users can connect to
CREATE TABLE integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ext_integration_id text NOT NULL UNIQUE, -- ID in Nango dashboard (e.g., 'google-calendar')
  category text NOT NULL, -- e.g., 'calendar', 'crm', 'email', 'storage'
  name text NOT NULL, -- Display name (e.g., 'Google Calendar')
  description text, -- What this integration does
  icon text, -- URL or identifier for the integration icon
  auth_type auth_type NOT NULL DEFAULT 'oauth2',
  website_url text, -- Link to the service's website
  enabled boolean DEFAULT true, -- Whether this integration is available to users
  config_fields jsonb DEFAULT '{}', -- Store any integration-specific configuration
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- connections table  
-- Stores user connections to integrations
CREATE TABLE connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  connection_id text NOT NULL, -- Nango connection ID
  status connection_status DEFAULT 'active',
  metadata jsonb DEFAULT '{}', -- Store connection-specific data (scopes, etc.)
  last_sync_at timestamptz, -- When this connection was last used for syncing
  expires_at timestamptz, -- When the connection expires (if applicable)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure one connection per user per integration
  UNIQUE(user_id, integration_id)
);

-- Create indexes for performance
CREATE INDEX idx_integrations_ext_integration_id ON integrations(ext_integration_id);
CREATE INDEX idx_integrations_category ON integrations(category);
CREATE INDEX idx_integrations_enabled ON integrations(enabled);
CREATE INDEX idx_integrations_auth_type ON integrations(auth_type);

CREATE INDEX idx_connections_user_id ON connections(user_id);
CREATE INDEX idx_connections_integration_id ON connections(integration_id);
CREATE INDEX idx_connections_connection_id ON connections(connection_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_user_integration ON connections(user_id, integration_id);
CREATE INDEX idx_connections_last_sync ON connections(last_sync_at);
CREATE INDEX idx_connections_expires_at ON connections(expires_at);

-- Enable RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integrations table
-- Everyone can read enabled integrations
CREATE POLICY "Anyone can read enabled integrations"
  ON integrations FOR SELECT
  USING (enabled = true);

-- Only service role can manage integrations
CREATE POLICY "Service role can manage all integrations"
  ON integrations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- RLS Policies for connections table
-- Users can read their own connections
CREATE POLICY "Users can read own connections"
  ON connections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own connections
CREATE POLICY "Users can create own connections"
  ON connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update own connections"
  ON connections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own connections"
  ON connections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage all connections
CREATE POLICY "Service role can manage all connections"
  ON connections FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Add updated_at triggers
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some common integrations as examples
INSERT INTO integrations (ext_integration_id, category, name, description, auth_type) VALUES
  ('squareup', 'payments', 'Square', 'Access and manage Square payments', 'oauth2');

-- Add comments for documentation
COMMENT ON TABLE integrations IS 'Available integrations that users can connect to via Nango';
COMMENT ON TABLE connections IS 'User connections to integrations managed by Nango';

COMMENT ON COLUMN integrations.ext_integration_id IS 'Integration ID in Nango dashboard';
COMMENT ON COLUMN integrations.category IS 'Category for grouping integrations (calendar, crm, email, etc.)';
COMMENT ON COLUMN integrations.config_fields IS 'JSON field for integration-specific configuration options';

COMMENT ON COLUMN connections.connection_id IS 'Nango connection identifier';
COMMENT ON COLUMN connections.metadata IS 'Connection-specific metadata (scopes, tokens, etc.)';
COMMENT ON COLUMN connections.last_sync_at IS 'Timestamp of last successful sync using this connection';
COMMENT ON COLUMN connections.expires_at IS 'When the connection expires (for token-based auth)';
