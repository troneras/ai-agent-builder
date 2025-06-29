-- Full schema migration for fresh DB setup

-- Enums
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'cancelled', 'expired', 'past_due');
CREATE TYPE subscription_plan AS ENUM ('starter', 'professional', 'enterprise');

-- user_profiles table
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  business_name text,
  business_type text,
  phone_number text,
  subscription_status subscription_status DEFAULT 'trial',
  subscription_plan subscription_plan DEFAULT 'starter',
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  subscription_starts_at timestamptz,
  subscription_ends_at timestamptz,
  business_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- conversations table
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  type text NOT NULL DEFAULT 'onboarding' CHECK (type IN ('onboarding', 'support', 'general')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content text NOT NULL,
  tool_name text,
  tool_call_id text,
  tool_result jsonb,
  metadata jsonb DEFAULT '{}',
  artifacts jsonb,
  created_at timestamptz DEFAULT now(),
  tool_calls jsonb,
  message_order integer NOT NULL DEFAULT 0,
  token_count integer,
  CONSTRAINT messages_conversation_order UNIQUE (conversation_id, message_order)
);

-- tool_calls table
CREATE TABLE tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  name text NOT NULL,
  arguments jsonb NOT NULL,
  result jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- onboarding table
CREATE TABLE onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  completed boolean DEFAULT false,
  current_step integer DEFAULT 0,
  merchant_id text,
  business_name text,
  business_type text,
  business_city text,
  full_address text,
  phone_number text,
  contact_email text,
  website text,
  opening_hours text,
  primary_location_id text,
  catalog_data jsonb,
  ai_use_cases text[],
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_subscription_status ON user_profiles(subscription_status);
CREATE INDEX idx_user_profiles_trial_ends_at ON user_profiles(trial_ends_at);
CREATE INDEX idx_user_profiles_onboarding_completed ON user_profiles(id); -- No onboarding_completed column anymore
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_conversation_order ON messages(conversation_id, message_order);
CREATE INDEX idx_tool_calls_conversation_id ON tool_calls(conversation_id);
CREATE INDEX idx_tool_calls_status ON tool_calls(status);
CREATE INDEX idx_onboarding_user_id ON onboarding(user_id);
CREATE INDEX idx_onboarding_completed ON onboarding(completed);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Service role can manage all profiles"
  ON user_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Policies for conversations
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

-- Policies for messages
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

-- Policies for tool_calls
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

-- Policies for onboarding
CREATE POLICY "Users can read own onboarding"
  ON onboarding FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding"
  ON onboarding FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can manage all onboarding"
  ON onboarding FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_calls_updated_at
  BEFORE UPDATE ON tool_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_updated_at
  BEFORE UPDATE ON onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- Enable real-time on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages; 