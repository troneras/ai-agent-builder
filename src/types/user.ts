export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  business_name?: string;
  business_type?: string;
  phone_number?: string;
  
  // Onboarding
  onboarding_completed: boolean;
  onboarding_step: number;
  onboarding_data: Record<string, any>;
  
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

export interface OnboardingData {
  businessName?: string;
  businessType?: string;
  services?: string[];
  hours?: string;
  phoneStyle?: string;
  phoneNumber?: string;
}