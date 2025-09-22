import { createClient } from '@/lib/supabase/client';
import type { 
  Session,
  User,
  AuthError
} from '@supabase/supabase-js';
import { SupabaseClient, StringKeyObject } from '@/types/core';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  preferences?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupCredentials {
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResponse {
  user: AuthUser | null;
  session: Session | null;
  error?: string;
}

export interface PasswordResetCredentials {
  email: string;
}

export interface PasswordUpdateCredentials {
  password: string;
  confirmPassword: string;
}

export class AuthService {
  private supabase: SupabaseClient | null = null;
  private readonly profileCache: Map<string, { profile: AuthUser; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  private getSupabase(): SupabaseClient {
    if (!this.supabase) {
      console.log('Creating Supabase client...', {
        timestamp: new Date().toISOString(),
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      });
      this.supabase = createClient();
    }
    return this.supabase!; // Non-null assertion since createClient() always returns a client (dummy or real)
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  }

  /**
   * Sign up a new user with email and password
   */
  async signUp(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            display_name: credentials.displayName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      // Check if email confirmation is required (user created but no session)
      if (data.user && !data.session) {
        // User needs to confirm email
        return {
          user: null,
          session: null,
          error: undefined // No error, but user needs to confirm email
        };
      }

      // Create user profile from auth data and database profile
      let authUser: AuthUser | null = null;
      if (data.user) {
        const userProfile = await this.getUserProfile(data.user.id);
        authUser = userProfile || {
          id: data.user.id,
          email: data.user.email || '',
          displayName: (data.user.user_metadata?.display_name as string) || data.user.email?.split('@')[0] || 'User',
          preferences: {},
          createdAt: data.user.created_at || new Date().toISOString(),
          updatedAt: data.user.updated_at || new Date().toISOString(),
        };
      }

      return {
        user: authUser,
        session: data.session,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Sign in an existing user with email and password
   */
  async signIn(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      // Create user profile from auth data and database profile
      let authUser: AuthUser | null = null;
      if (data.user) {
        const userProfile = await this.getUserProfile(data.user.id);
        authUser = userProfile || {
          id: data.user.id,
          email: data.user.email || '',
          displayName: (data.user.user_metadata?.display_name as string) || data.user.email?.split('@')[0] || 'User',
          preferences: {},
          createdAt: data.user.created_at || new Date().toISOString(),
          updatedAt: data.user.updated_at || new Date().toISOString(),
        };
      }

      return {
        user: authUser,
        session: data.session,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error?: string }> {
    try {
      // Clear profile cache on sign out
      this.profileCache.clear();

      const supabase = this.getSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Get current user session
   */
  async getSession(): Promise<{ session: Session | null; error?: string }> {
    try {
      console.log('getSession: starting...');
      const supabase = this.getSupabase();
      console.log('getSession: got supabase client');

      // Use a timeout wrapper to prevent hanging
      const sessionResult = await this.withTimeout(
        supabase.auth.getSession(),
        5000 // 5 second timeout
      );

      const { data, error } = sessionResult as { data: { session: Session | null }; error: AuthError | null };

      if (error) {
        console.log('getSession: auth.getSession error:', error.message);
        return { session: null, error: error.message };
      }

      return { session: data.session };

    } catch (error) {
      console.error('getSession: Unexpected error:', error);
      return {
        session: null,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<{ user: AuthUser | null; error?: string }> {
    try {
      console.log('getCurrentUser: starting...');
      const supabase = this.getSupabase();
      console.log('getCurrentUser: got supabase client');
      
      const result = await this.withTimeout(
        supabase.auth.getUser(),
        30000 // 30 second timeout for getUser (increased from 10s)
      );
      const { data, error } = result as { data: { user: User | null }; error: AuthError | null };
      console.log('getCurrentUser: auth.getUser completed', { hasData: !!data, hasError: !!error });
      if (error) {
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null };
      }

      // Get user profile with preferences from database
      const userProfile = await this.getUserProfile(data.user.id);

      const authUser: AuthUser = userProfile || {
        id: data.user.id,
        email: data.user.email || '',
        displayName: (data.user.user_metadata?.display_name as string) || data.user.email?.split('@')[0] || 'User',
        preferences: {},
        createdAt: data.user.created_at || new Date().toISOString(),
        updatedAt: data.user.updated_at || new Date().toISOString(),
      };
      return { user: authUser };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Reset password via email
   */
  async resetPassword(credentials: PasswordResetCredentials): Promise<{ error?: string }> {
    try {
      const supabase = this.getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(
        credentials.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(credentials: PasswordUpdateCredentials): Promise<{ error?: string }> {
    try {
      if (credentials.password !== credentials.confirmPassword) {
        return { error: 'Passwords do not match' };
      }

      const supabase = this.getSupabase();
      const { error } = await supabase.auth.updateUser({
        password: credentials.password,
      });

      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<Pick<AuthUser, 'displayName' | 'preferences'>>): Promise<{ user: AuthUser | null; error?: string }> {
    try {
      const supabase = this.getSupabase();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        return { user: null, error: userError?.message || 'User not authenticated' };
      }

      // Update auth metadata if display name changed
      if (updates.displayName) {
        const { error: metaError } = await supabase.auth.updateUser({
          data: { display_name: updates.displayName }
        });
        if (metaError) {
          return { user: null, error: metaError.message };
        }
      }

      // Update profile table
      const updateData: StringKeyObject = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.displayName !== undefined) {
        updateData.display_name = updates.displayName;
      }
      
      if (updates.preferences !== undefined) {
        updateData.preferences = updates.preferences;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userData.user.id);

      if (profileError) {
        return { user: null, error: profileError.message };
      }

      // Return updated profile
      const updatedUser = await this.getUserProfile(userData.user.id);
      return { user: updatedUser };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null, session: Session | null, event?: string) => void) {
    const supabase = this.getSupabase();

    const result = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase auth event:', { event, userId: session?.user?.id, timestamp: new Date().toISOString() });

      let user: AuthUser | null = null;

      if (session?.user) {
        // Create a minimal user first for immediate callback
        const minimalUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          displayName: (session.user.user_metadata?.display_name as string) || session.user.email?.split('@')[0] || 'User',
          preferences: {},
          createdAt: session.user.created_at || new Date().toISOString(),
          updatedAt: session.user.updated_at || new Date().toISOString(),
        };

        // Try to get user profile but don't block the callback
        this.getUserProfile(session.user.id).then(userProfile => {
          if (userProfile) {
            // If we get a profile, call the callback again with full data
            console.log('Got user profile, updating user data');
            callback(userProfile, session, event);
          }
        }).catch(err => {
          console.warn('Failed to load user profile:', err);
        });

        user = minimalUser;
      }

      console.log('Calling auth state callback with user:', !!user);
      callback(user, session, event);
    });

    return result;
  }

  /**
   * Get user profile from database with caching
   */
  private async getUserProfile(userId: string): Promise<AuthUser | null> {
    try {
      // Check cache first
      const cached = this.profileCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.profile;
      }

      // Add timeout for mobile networks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, display_name, preferences, created_at, updated_at')
        .eq('user_id', userId)
        .single();

      clearTimeout(timeoutId);

      if (error || !data) {
        return null;
      }

      const profile = data as StringKeyObject;
      const authUser: AuthUser = {
        id: profile.user_id as string,
        email: profile.email as string,
        displayName: (profile.display_name as string) || 'User',
        preferences: (profile.preferences as Record<string, unknown>) || {},
        createdAt: profile.created_at as string,
        updatedAt: profile.updated_at as string,
      };

      // Cache the profile
      this.profileCache.set(userId, { profile: authUser, timestamp: Date.now() });

      return authUser;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();