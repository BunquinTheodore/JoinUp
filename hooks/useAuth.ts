import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

const MOCK_USER: User = {
  uid: 'user-1',
  displayName: 'Marco Silva',
  photoURL: '',
  bio: 'Love staying active and meeting new people! Always up for yoga, hiking, or trying new coffee spots around the city.',
  ageRange: '25-30',
  interests: ['Fitness', 'Study', 'Outdoors', 'Music'],
  activitiesJoined: ['act-1', 'act-2', 'act-3'],
  activitiesHosted: ['act-4', 'act-5'],
  rating: 4.8,
  ratingCount: 24,
  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date() },
};

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading, signOut } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        setError(null);
        // Mock sign in - in real app, use Firebase Auth
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setUser(MOCK_USER);
      } catch (err) {
        setError('Failed to sign in. Please check your credentials.');
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading]
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
        // Mock sign up
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const newUser: User = {
          ...MOCK_USER,
          displayName: data.fullName,
          ageRange: data.ageRange as User['ageRange'],
          interests: data.interests,
        };
        setUser(newUser);
      } catch (err) {
        setError('Failed to create account. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading]
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setUser(MOCK_USER);
    } catch (err) {
      setError('Google sign in failed.');
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  const handleSignOut = useCallback(async () => {
    try {
      signOut();
    } catch (err) {
      setError('Failed to sign out.');
    }
  }, [signOut]);

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
