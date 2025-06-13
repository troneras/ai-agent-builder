import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Onboarding } from '../types/user';

export const useOnboarding = (user: User | null) => {
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOnboarding(null);
      setLoading(false);
      return;
    }

    fetchOnboarding();
  }, [user]);

  const fetchOnboarding = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('onboarding')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching onboarding:', error);
        setError(error.message);
        return;
      }

      setOnboarding(data);
    } catch (err) {
      console.error('Onboarding fetch error:', err);
      setError('Failed to load onboarding');
    } finally {
      setLoading(false);
    }
  };

  const updateOnboarding = async (updates: Partial<Onboarding>) => {
    if (!user || !onboarding) return { error: 'No user or onboarding found' };

    try {
      const { data, error } = await supabase
        .from('onboarding')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating onboarding:', error);
        return { error: error.message };
      }

      setOnboarding(data);
      return { data };
    } catch (err) {
      console.error('Onboarding update error:', err);
      return { error: 'Failed to update onboarding' };
    }
  };

  const completeOnboarding = async () => {
    const updates: Partial<Onboarding> = {
      completed: true,
      completed_at: new Date().toISOString()
    };

    return updateOnboarding(updates);
  };

  return {
    onboarding,
    loading,
    error,
    updateOnboarding,
    completeOnboarding,
    refetch: fetchOnboarding
  };
};