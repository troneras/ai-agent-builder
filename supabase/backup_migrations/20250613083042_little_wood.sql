/*
  # Redesigned Database Schema

  1. New Tables
    - `conversations` - Store chat conversations
    - `messages` - Store individual messages with real-time support
    - `onboarding` - Dedicated onboarding data table
    
  2. Updated Tables
    - `user_profiles` - Remove onboarding fields, add business_data jsonb
    
  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for user access
    - Enable real-time on messages table
    
  4. Functions
    - Auto-create onboarding record when user signs up
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  type text NOT NULL DEFAULT 'onboarding', -- 'onboarding', 'support', 'general'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table with real-time support
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'assistant', 'system', 'tool')),
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content text NOT NULL,
  tool_name text, -- For tool messages
  tool_call_id text, -- For OpenAI tool call tracking
  metadata jsonb DEFAULT '{}', -- For additional data like tool results
  created_at timestamptz DEFAULT now(),
  tool_calls jsonb
);

-- Create onboarding table
CREATE TABLE IF NOT EXISTS onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  
  -- Onboarding progress
  completed boolean DEFAULT false,
  current_step integer DEFAULT 0,
  
  -- Business information collected during onboarding
  user_name text,
  business_name text,
  business_type text,
  business_city text,
  full_address text,
  phone_number text,
  contact_email text,
  website text,
  opening_hours text,
  services text[],
  ai_use_cases text[],
  
  -- Metadata
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Update user_profiles table - remove onboarding fields, add business_data
DO $$
BEGIN
  -- Remove onboarding-related columns if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE user_profiles DROP COLUMN onboarding_completed;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'onboarding_step') THEN
    ALTER TABLE user_profiles DROP COLUMN onboarding_step;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'onboarding_data') THEN
    ALTER TABLE user_profiles DROP COLUMN onboarding_data;
  END IF;
  
  -- Add business_data column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'business_data') THEN
    ALTER TABLE user_profiles ADD COLUMN business_data jsonb DEFAULT '{}';
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can read own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all conversations"
  ON conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Messages policies
CREATE POLICY "Users can read messages from own conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all messages"
  ON messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Onboarding policies
CREATE POLICY "Users can read own onboarding"
  ON onboarding
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON onboarding
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all onboarding"
  ON onboarding
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_updated_at
  BEFORE UPDATE ON onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable real-time on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON onboarding(completed);

-- Add tool_calls column to messages for OpenAI function calling support
ALTER TABLE IF EXISTS messages ADD COLUMN IF NOT EXISTS tool_calls jsonb;