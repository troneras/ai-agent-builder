export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  business_name?: string;
  business_type?: string;
  phone_number?: string;
  
  // Business data - flexible JSON structure
  business_data: Record<string, any>;
  
  // Subscription
  subscription_status: 'trial' | 'active' | 'cancelled' | 'expired' | 'past_due';
  subscription_plan: 'starter' | 'professional' | 'enterprise';
  trial_ends_at?: string;
  subscription_starts_at?: string;
  subscription_ends_at?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface Onboarding {
  id: string;
  user_id: string;
  conversation_id?: string;
  
  // Progress tracking
  completed: boolean;
  current_step: number;
  
  // Business information
  user_name?: string;
  business_name?: string;
  business_type?: string;
  business_city?: string;
  full_address?: string;
  phone_number?: string;
  contact_email?: string;
  website?: string;
  opening_hours?: string;
  services?: string[];
  ai_use_cases?: string[];
  
  // Timestamps
  started_at: string;
  completed_at?: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  type: 'onboarding' | 'support' | 'general';
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'assistant' | 'system' | 'tool';
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_name?: string;
  tool_call_id?: string;
  metadata: Record<string, any>;
  created_at: string;
}