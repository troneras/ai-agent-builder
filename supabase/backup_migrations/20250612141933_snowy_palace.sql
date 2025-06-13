/*
  # User Profiles System

  1. New Tables
    - `user_profiles`
      - `id` (uuid, references auth.users)
      - `email` (text, for easy access)
      - `full_name` (text, optional)
      - `business_name` (text, from onboarding)
      - `business_type` (text, from onboarding)
      - `phone_number` (text, optional)
      - `onboarding_completed` (boolean, default false)
      - `onboarding_step` (integer, tracks current step)
      - `subscription_status` (enum: trial, active, cancelled, expired)
      - `subscription_plan` (enum: starter, professional, enterprise)
      - `trial_ends_at` (timestamp, when trial expires)
      - `subscription_starts_at` (timestamp)
      - `subscription_ends_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_profiles` table
    - Add policies for users to read/update their own profile
    - Add policy for service role to manage profiles

  3. Functions
    - Trigger to create profile when user signs up
    - Function to update profile timestamps
*/

-- Create enum types for subscription management
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'cancelled', 'expired', 'past_due');
CREATE TYPE subscription_plan AS ENUM ('starter', 'professional', 'enterprise');

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  business_name text,
  business_type text,
  phone_number text,
  
  -- Onboarding tracking
  onboarding_completed boolean DEFAULT false,
  onboarding_step integer DEFAULT 0,
  onboarding_data jsonb DEFAULT '{}',
  
  -- Subscription management
  subscription_status subscription_status DEFAULT 'trial',
  subscription_plan subscription_plan DEFAULT 'starter',
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  subscription_starts_at timestamptz,
  subscription_ends_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to create profile when user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_ends_at ON user_profiles(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_completed ON user_profiles(onboarding_completed);