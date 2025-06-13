import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/user';

export const useUserProfile = (user: User | null) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setError(error.message);
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return { error: 'No user or profile found' };

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return { error: error.message };
      }

      setProfile(data);
      return { data };
    } catch (err) {
      console.error('Profile update error:', err);
      return { error: 'Failed to update profile' };
    }
  };

  const updateSubscription = async (
    status: UserProfile['subscription_status'],
    plan?: UserProfile['subscription_plan'],
    subscriptionData?: {
      starts_at?: string;
      ends_at?: string;
    }
  ) => {
    const updates: Partial<UserProfile> = {
      subscription_status: status,
      ...(plan && { subscription_plan: plan }),
      ...(subscriptionData?.starts_at && { subscription_starts_at: subscriptionData.starts_at }),
      ...(subscriptionData?.ends_at && { subscription_ends_at: subscriptionData.ends_at })
    };

    return updateProfile(updates);
  };

  const isTrialExpired = () => {
    if (!profile?.trial_ends_at) return false;
    return new Date(profile.trial_ends_at) < new Date();
  };

  const getTrialDaysRemaining = () => {
    if (!profile?.trial_ends_at) return 0;
    const trialEnd = new Date(profile.trial_ends_at);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateSubscription,
    isTrialExpired,
    getTrialDaysRemaining,
    refetch: fetchProfile
  };
};