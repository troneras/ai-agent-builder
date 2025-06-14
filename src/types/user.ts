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
  subscription_status:
    | "trial"
    | "active"
    | "cancelled"
    | "expired"
    | "past_due";
  subscription_plan: "starter" | "professional" | "enterprise";
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
  type: "onboarding" | "support" | "general";
  created_at: string;
  updated_at: string;
}

export interface OptionChoiceArtifact {
  type: "option_choice";
  prompt: string;
  options: Array<{
    label: string;
    value: string;
  }>;
  allowFreeText?: boolean;
}

export interface OAuthConnectionArtifact {
  type: "oauth_connection";
  integrationId: string;
  integrationName: string;
  description: string;
  icon: string;
}

export type MessageArtifact = OptionChoiceArtifact | OAuthConnectionArtifact;

export interface Message {
  id: string;
  conversation_id: string;
  sender: "user" | "assistant" | "system" | "tool";
  role: "user" | "assistant" | "system" | "tool";
  type?: "message" | "tool_call" | "tool_result";
  content: string;
  tool_name?: string;
  tool_call_id?: string;
  tool_args?: Record<string, any>;
  tool_result?: Record<string, any>;
  artifacts?: MessageArtifact[] | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ToolCall {
  id: string;
  conversation_id: string;
  message_id?: string;
  name: string;
  arguments: Record<string, any>;
  result?: Record<string, any>;
  status: "pending" | "success" | "error";
  error_message?: string;
  created_at: string;
  updated_at: string;
}
