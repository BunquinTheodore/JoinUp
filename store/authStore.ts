import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  updateUser: (patch) =>
    set((state) =>
      state.user
        ? {
            user: { ...state.user, ...patch },
            isAuthenticated: true,
            isLoading: false,
          }
        : state
    ),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
