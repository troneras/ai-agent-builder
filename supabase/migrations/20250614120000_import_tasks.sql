-- Migration: Add import_tasks table for tracking Square data import progress
-- Description: Creates table to manage incremental import of business data from Square

-- Create enum for import task types
CREATE TYPE import_task_type AS ENUM ('merchant', 'locations', 'catalog');

-- Create enum for import task status
CREATE TYPE import_task_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'retrying');

-- import_tasks table
-- Tracks the progress of importing business data from Square
CREATE TABLE import_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id text NOT NULL, -- Nango connection ID for Square
  task_type import_task_type NOT NULL,
  status import_task_status DEFAULT 'pending',
  progress_message text, -- Human-readable status message
  data jsonb, -- Store the imported data
  error_message text, -- Store error details if failed
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure one task per user per type per session
  UNIQUE(user_id, connection_id, task_type)
);

-- Create indexes for performance
CREATE INDEX idx_import_tasks_user_id ON import_tasks(user_id);
CREATE INDEX idx_import_tasks_connection_id ON import_tasks(connection_id);
CREATE INDEX idx_import_tasks_status ON import_tasks(status);
CREATE INDEX idx_import_tasks_task_type ON import_tasks(task_type);
CREATE INDEX idx_import_tasks_user_status ON import_tasks(user_id, status);
CREATE INDEX idx_import_tasks_created_at ON import_tasks(created_at DESC);

-- Enable RLS
ALTER TABLE import_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own import tasks
CREATE POLICY "Users can read own import tasks"
  ON import_tasks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own import tasks
CREATE POLICY "Users can create own import tasks"
  ON import_tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all import tasks (for edge functions)
CREATE POLICY "Service role can manage all import tasks"
  ON import_tasks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_import_tasks_updated_at
  BEFORE UPDATE ON import_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable real-time on import_tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE import_tasks;

-- Add comments for documentation
COMMENT ON TABLE import_tasks IS 'Tracks the progress of importing business data from Square';
COMMENT ON COLUMN import_tasks.connection_id IS 'Nango connection identifier for Square';
COMMENT ON COLUMN import_tasks.task_type IS 'Type of data being imported (merchant, locations, catalog)';
COMMENT ON COLUMN import_tasks.progress_message IS 'Human-readable status message for UI display';
COMMENT ON COLUMN import_tasks.data IS 'JSON field storing the imported business data';
COMMENT ON COLUMN import_tasks.retry_count IS 'Number of times this task has been retried'; 