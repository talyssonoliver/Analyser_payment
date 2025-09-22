'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@supabase/supabase-js';
import type { AuthUser } from '@/lib/services/auth-service';

export interface AuthState {
  // State
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  clearAuth: () => void;

  // Computed
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      isLoading: false, // Start with false to prevent initial loading hang
      isInitialized: false,
      
      // Actions
      setUser: (user) => {
        const currentUser = get().user;
        // Only update if user actually changed - use safer comparison
        const usersEqual = currentUser === user || 
          (currentUser && user && 
           currentUser.id === user.id && 
           currentUser.email === user.email &&
           currentUser.displayName === user.displayName);
        
        if (!usersEqual) {
          set({ user });
        }
      },
      
      setSession: (session) => {
        const currentSession = get().session;
        // Only update if session actually changed
        if (currentSession?.access_token !== session?.access_token) {
          set({ session });
        }
      },
      
      setLoading: (isLoading) => {
        const currentLoading = get().isLoading;
        // Only update if loading state actually changed
        if (currentLoading !== isLoading) {
          set({ isLoading });
        }
      },
      
      setInitialized: (isInitialized) => {
        const currentInitialized = get().isInitialized;
        // Only update if initialized state actually changed
        if (currentInitialized !== isInitialized) {
          set({ isInitialized });
        }
      },
      
      clearAuth: () => {
        set({
          user: null,
          session: null,
          isLoading: false,
          isInitialized: true,
        });
      },
      
      // Computed
      get isAuthenticated() {
        const { user, session } = get();
        return !!user && !!session;
      },
    }),
    {
      name: 'payment-analyzer-auth',
      partialize: (state) => {
        try {
          return {
            // Only persist minimal user info, not the full session
            user: state.user ? {
              id: state.user.id,
              email: state.user.email,
              displayName: state.user.displayName,
              preferences: state.user.preferences || {},
            } : null,
            isInitialized: state.isInitialized,
          };
        } catch (error) {
          console.warn('Auth store serialization error:', error);
          // Return safe defaults on serialization error
          return {
            user: null,
            isInitialized: false,
          };
        }
      },
    }
  )
);

// Selectors for common usage patterns
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthSession = () => useAuthStore((state) => state.session);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);