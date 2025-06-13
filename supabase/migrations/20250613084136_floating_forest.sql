/*
  # Conversations and Messages System

  1. New Tables
    - `conversations` - User chat conversations
    - `messages` - Individual messages with tool call support
    - `tool_calls` - Tool execution lifecycle tracking
    - `onboarding` - Dedicated onboarding data

  2. Updated Tables
    - `user_profiles` - Remove onboarding fields, add business_data jsonb

  3. Real-time Features
    - Enable real-time on messages table
    - Optimistic UI support
    - Auto-scroll functionality

  4. Security
    - RLS policies for all tables
    - Proper foreign key constraints
    - Service role access for tools
*/

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS tool_calls CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS onboarding CASCADE;

-- Create conversations table
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text DEFAULT 'New Conversation',
  type text DEFAULT 'onboarding' CHECK (type IN ('onboarding', 'support', 'general')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table with tool call support
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender text CHECK (sender IN ('user', 'assistant', 'system', 'tool')) NOT NULL,
  role text CHECK (role IN ('user', 'assistant', 'system', 'tool')) NOT NULL,
  type text DEFAULT 'message' CHECK (type IN ('message', 'tool_call', 'tool_result')),
  content text,
  tool_name text,                -- for tool_call
  tool_call_id text,             -- for linking result to the tool call
  tool_args jsonb,               -- input args (if type = 'tool_call')
  tool_result jsonb,             -- output result (if type = 'tool_result')
  metadata jsonb DEFAULT '{}',   -- additional metadata
  created_at timestamptz DEFAULT now()
);

-- Create tool_calls table for traceability
CREATE TABLE tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  name text NOT NULL,
  arguments jsonb NOT NULL,
  result jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create onboarding table
CREATE TABLE onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  
  -- Progress tracking
  completed boolean DEFAULT false,
  current_step integer DEFAULT 0,
  
  -- Business information
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
  
  -- Timestamps
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Update user_profiles table
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

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can read own conversations"
  ON conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all conversations"
  ON conversations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Messages policies
CREATE POLICY "Users can read messages from own conversations"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all messages"
  ON messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Tool calls policies
CREATE POLICY "Users can read tool calls from own conversations"
  ON tool_calls FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = tool_calls.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all tool calls"
  ON tool_calls FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Onboarding policies
CREATE POLICY "Users can read own onboarding"
  ON onboarding FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON onboarding FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all onboarding"
  ON onboarding FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_calls_updated_at
  BEFORE UPDATE ON tool_calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_updated_at
  BEFORE UPDATE ON onboarding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  conversation_id uuid;
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Create onboarding conversation
  INSERT INTO public.conversations (user_id, title, type)
  VALUES (NEW.id, 'Onboarding Setup', 'onboarding')
  RETURNING id INTO conversation_id;
  
  -- Create onboarding record
  INSERT INTO public.onboarding (user_id, conversation_id)
  VALUES (NEW.id, conversation_id);
  
  -- Add initial assistant message
  INSERT INTO public.messages (conversation_id, sender, role, content)
  VALUES (
    conversation_id,
    'assistant',
    'assistant',
    '👋 Hi! I''m your Cutcall setup assistant. I''m here to help you get your AI phone assistant ready for your business. Let''s start with something simple - what''s your name?'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get or create onboarding conversation
CREATE OR REPLACE FUNCTION get_or_create_onboarding_conversation(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  conversation_id uuid;
  onboarding_record record;
BEGIN
  -- Get existing onboarding record
  SELECT * INTO onboarding_record
  FROM onboarding
  WHERE user_id = p_user_id;
  
  -- If onboarding exists and has conversation, return it
  IF onboarding_record.conversation_id IS NOT NULL THEN
    RETURN onboarding_record.conversation_id;
  END IF;
  
  -- If onboarding exists but no conversation, create one
  IF onboarding_record.id IS NOT NULL THEN
    INSERT INTO conversations (user_id, title, type)
    VALUES (p_user_id, 'Onboarding Setup', 'onboarding')
    RETURNING id INTO conversation_id;
    
    UPDATE onboarding 
    SET conversation_id = conversation_id
    WHERE user_id = p_user_id;
    
    -- Add initial message if conversation is new
    INSERT INTO messages (conversation_id, sender, role, content)
    VALUES (
      conversation_id,
      'assistant',
      'assistant',
      '👋 Hi! I''m your Cutcall setup assistant. I''m here to help you get your AI phone assistant ready for your business. Let''s start with something simple - what''s your name?'
    );
    
    RETURN conversation_id;
  END IF;
  
  -- If no onboarding record exists, create everything
  INSERT INTO conversations (user_id, title, type)
  VALUES (p_user_id, 'Onboarding Setup', 'onboarding')
  RETURNING id INTO conversation_id;
  
  INSERT INTO onboarding (user_id, conversation_id)
  VALUES (p_user_id, conversation_id);
  
  -- Add initial assistant message
  INSERT INTO messages (conversation_id, sender, role, content)
  VALUES (
    conversation_id,
    'assistant',
    'assistant',
    '👋 Hi! I''m your Cutcall setup assistant. I''m here to help you get your AI phone assistant ready for your business. Let''s start with something simple - what''s your name?'
  );
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable real-time on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Create indexes for performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_tool_calls_conversation_id ON tool_calls(conversation_id);
CREATE INDEX idx_tool_calls_status ON tool_calls(status);
CREATE INDEX idx_onboarding_user_id ON onboarding(user_id);
CREATE INDEX idx_onboarding_completed ON onboarding(completed);