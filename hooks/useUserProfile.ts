import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadProfile = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({ email })
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile as UserProfile);
      } else if (error) {
        throw error;
      } else {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('email', profile.email)
        .select()
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
    } catch (error) {
      console.error('Failed to save profile:', error);
      throw error;
    }
  }, [profile]);

  return { profile, isLoading, loadProfile, saveProfile };
}
