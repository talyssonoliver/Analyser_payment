'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authService, type AuthUser, type LoginCredentials, type SignupCredentials } from '@/lib/services/auth-service';
import type { Session } from '@supabase/supabase-js';
import { initializeStorageInterceptor } from '@/lib/utils/storage-interceptor';
import { cleanupCorruptedStorage } from '@/lib/utils/storage-cleanup';

export interface AuthContextValue {
  // State
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  signIn: (credentials: LoginCredentials) => Promise<{ error?: string }>;
  signUp: (credentials: SignupCredentials) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string, confirmPassword: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<Pick<AuthUser, 'displayName' | 'preferences'>>) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  // Initialize storage interceptor and cleanup on mount
  useEffect(() => {
    cleanupCorruptedStorage();
    initializeStorageInterceptor();
  }, []);

  // Initialize auth state only once
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized) return;
    
    let mounted = true;
    
    const init = async () => {
      try {
        // Check if offline first
        if (!navigator.onLine) {
          console.log('App is offline, skipping auth check');
          if (mounted) {
            setIsLoading(false);
            setIsInitialized(true);
          }
          return;
        }

        // Debug: Check Supabase configuration
        console.log('Auth init starting...', {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
          timestamp: new Date().toISOString()
        });

        // Early exit if Supabase is not configured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.warn('Supabase not configured, running in offline mode');
          if (mounted) {
            setIsLoading(false);
            setIsInitialized(true);
          }
          return;
        }

        // Try a simpler approach without Promise.race first
        let currentUser = null;
        let currentSession = null;
        
        try {
          // Since we consistently see SIGNED_IN events working, let's use that as primary approach
          console.log('Using auth state listener as primary method...');
          
          const authStatePromise = new Promise<{ user: AuthUser; session: Session | null } | null>((resolve) => {
              let resolved = false;
              console.log('Setting up auth state listener...');
              const authResult = authService.onAuthStateChange((authUser, authSession, event) => {
                if (resolved) return;
                console.log('🎯 Auth provider received auth state change:', { 
                  hasUser: !!authUser, 
                  hasSession: !!authSession,
                  event: event,
                  userId: authSession?.user?.id
                });
                // Immediately accept SIGNED_IN or TOKEN_REFRESHED events
                if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && authSession?.user) {
                  resolved = true;
                  authResult?.data?.subscription?.unsubscribe();
                  console.log('Fast-tracking auth for event:', event);
                  
                  // Create user from session if authUser is null
                  const user = authUser || {
                    id: authSession.user.id,
                    email: authSession.user.email || '',
                    displayName: (authSession.user.user_metadata?.display_name as string) || authSession.user.email?.split('@')[0] || 'User',
                    preferences: {},
                    createdAt: authSession.user.created_at || new Date().toISOString(),
                    updatedAt: authSession.user.updated_at || new Date().toISOString(),
                  };
                  
                  resolve({ user, session: authSession });
                } else if (authUser) {
                  resolved = true;
                  authResult?.data?.subscription?.unsubscribe();
                  resolve({ user: authUser, session: authSession });
                }
              });
              
              // Also try to get the current user directly
              setTimeout(async () => {
                if (!resolved) {
                  try {
                    console.log('Trying direct user fetch...');
                    const { user } = await authService.getCurrentUser();
                    if (user && !resolved) {
                      resolved = true;
                      authResult?.data?.subscription?.unsubscribe();
                      // User is already an AuthUser from authService.getCurrentUser()
                      console.log('Direct user fetch successful:', { userId: user.id });
                      resolve({ user, session: null });
                      return;
                    }
                  } catch (directError) {
                    console.log('Direct user fetch failed:', directError);
                  }
                }
                
                // Final timeout
                if (!resolved) {
                  resolved = true;
                  authResult?.data?.subscription?.unsubscribe();
                  resolve(null);
                }
              }, 2000); // 2 seconds to wait for auth events
            });
            
          const authStateResult = await authStatePromise;
          if (authStateResult) {
            currentUser = authStateResult.user;
            currentSession = authStateResult.session;
            console.log('Using auth state listener result:', { userId: currentUser.id });
          }
        } catch (authError) {
          console.error('Auth initialization error:', authError);
          // Continue without auth - don't retry on actual errors
          if (mounted) {
            setUser(null);
            setSession(null);
            setIsLoading(false);
            setIsInitialized(true);
          }
          return;
        }
        
        if (mounted) {
          setUser(currentUser);
          setSession(currentSession);
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (error: unknown) {
        console.error('Unexpected error during auth initialization:', error);
        if (mounted) {
          setUser(null);
          setSession(null);
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    init();

    // Listen for auth changes
    const authChangeResult = authService.onAuthStateChange((authUser, authSession, event) => {
      if (mounted) {
        console.log('Persistent auth state change:', { event, hasUser: !!authUser, hasSession: !!authSession });
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && (authUser || authSession?.user)) {
          setUser(authUser);
          setSession(authSession);
          setIsLoading(false);
          console.log('Auth state updated from event:', event);
        } else if (authUser) {
          setUser(authUser);
          setSession(authSession);
          setIsLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      authChangeResult?.data?.subscription?.unsubscribe();
    };
  }, [isInitialized]);

  // Sign in
  const signIn = async (credentials: LoginCredentials): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      const { user, session, error } = await authService.signIn(credentials);
      if (error) return { error };
      
      setUser(user);
      setSession(session);
      router.push('/dashboard');
      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign in failed' };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up
  const signUp = async (credentials: SignupCredentials): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      const { user, session, error } = await authService.signUp(credentials);
      if (error) return { error };
      
      if (user && session) {
        setUser(user);
        setSession(session);
        router.push('/dashboard');
      }
      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign up failed' };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      setUser(null);
      setSession(null);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    try {
      const { error } = await authService.resetPassword({ email });
      return { error };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Password reset failed' };
    }
  };

  // Update password
  const updatePassword = async (password: string, confirmPassword: string): Promise<{ error?: string }> => {
    try {
      const { error } = await authService.updatePassword({ password, confirmPassword });
      return { error };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Password update failed' };
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<Pick<AuthUser, 'displayName' | 'preferences'>>): Promise<{ error?: string }> => {
    try {
      const { user: updatedUser, error } = await authService.updateProfile(updates);
      if (error) return { error };
      
      if (updatedUser) {
        setUser(updatedUser);
      }
      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Profile update failed' };
    }
  };

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}