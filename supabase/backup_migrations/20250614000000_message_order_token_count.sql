-- Migration: Add message_order, token_count, and indexes for message ordering and conversation updates

-- Add columns if not exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_order integer NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS token_count integer;

-- Add unique constraint and index for message ordering
ALTER TABLE messages ADD CONSTRAINT messages_conversation_order UNIQUE (conversation_id, message_order);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_order ON messages(conversation_id, message_order);

-- Add index for conversations updated_at
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC); 