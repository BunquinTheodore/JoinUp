import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

function mapProfile(id: string, profile: any): User {
  return {
    uid: id,
    displayName: profile.display_name ?? '',
    photoURL: profile.photo_url ?? '',
    bio: profile.bio ?? '',
    ageRange: profile.age_range ?? '18-24',
    interests: profile.interests ?? [],
    activitiesJoined: [],
    activitiesHosted: [],
    rating: Number(profile.rating ?? 0),
    ratingCount: profile.rating_count ?? 0,
    createdAt: profile.created_at ?? new Date().toISOString(),
  };
}

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading, signOut: storeSignOut } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser(mapProfile(session.user.id, profile));
          } else {
            // Profile will be auto-created by trigger; set minimal user
            setUser({
              uid: session.user.id,
              displayName: session.user.user_metadata?.display_name ?? '',
              photoURL: session.user.user_metadata?.avatar_url ?? '',
              bio: '',
              ageRange: '18-24',
              interests: [],
              activitiesJoined: [],
              activitiesHosted: [],
              rating: 0,
              ratingCount: 0,
              createdAt: new Date().toISOString(),
            });
          }
        } else {
          setUser(null);
        }
      }
    );

    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        setError(null);
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
      } catch (err: any) {
        setError(err.message ?? 'Failed to sign in. Please check your credentials.');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

  const signUp = useCallback(
    async (data: {
      fullName: string;
      email: string;
      password: string;
      ageRange: string;
      interests: string[];
    }) => {
      try {
        setLoading(true);
        setError(null);
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              display_name: data.fullName,
            },
          },
        });
        if (authError) throw authError;

        // Update profile with extra fields (trigger creates the row)
        if (authData.user) {
          // Small delay to let the trigger create the profile row
          await new Promise((r) => setTimeout(r, 500));
          await supabase
            .from('profiles')
            .update({
              display_name: data.fullName,
              age_range: data.ageRange,
              interests: data.interests,
            })
            .eq('id', authData.user.id);
        }
      } catch (err: any) {
        setError(err.message ?? 'Failed to create account. Please try again.');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Google OAuth is not configured yet — placeholder
      setError('Google sign in is not configured yet. Use email/password.');
    } catch (err: any) {
      setError(err.message ?? 'Google sign in failed.');
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      storeSignOut();
    } catch (err) {
      setError('Failed to sign out.');
    }
  }, [storeSignOut]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut: handleSignOut,
    setUser,
  };
}
