-- Migration: Clean up messages table for OpenAI compatibility and consistency

-- Remove sender and type columns if they exist
ALTER TABLE messages DROP COLUMN IF EXISTS sender;
ALTER TABLE messages DROP COLUMN IF EXISTS type;

-- Add tool_call_id, tool_name, tool_result columns if not exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tool_call_id text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tool_name text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tool_result jsonb;

-- Ensure required columns exist (no-op if already present)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('user', 'assistant', 'system', 'tool'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tool_calls jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_order integer;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS token_count integer;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Add unique constraint for message ordering if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'messages' AND constraint_name = 'messages_conversation_order') THEN
    ALTER TABLE messages ADD CONSTRAINT messages_conversation_order UNIQUE (conversation_id, message_order);
  END IF;
END $$; 