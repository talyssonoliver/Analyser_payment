/**
 * Simplified Supabase Client for Development
 * Bypasses complex module resolution issues
 */

// Mock implementation for development
export const createSimpleClient = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      auth: {
        getUser: () => Promise.resolve({ 
          data: { 
            user: { 
              id: 'dev-user-123', 
              email: 'dev@example.com' 
            } 
          },
          error: null 
        }),
        signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
        signUp: () => Promise.resolve({ data: {}, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
          // Mock auth state change
          setTimeout(() => callback('SIGNED_IN', { user: { id: 'dev-user-123' } }), 100);
          return { data: { subscription: { unsubscribe: () => {} } } };
        }
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null })
            })
          })
        }),
        insert: () => Promise.resolve({ data: {}, error: null }),
        update: () => Promise.resolve({ data: {}, error: null }),
        delete: () => Promise.resolve({ data: {}, error: null })
      })
    };
  }
  
  // In production, use real Supabase (lazy loaded)
  return import('@supabase/supabase-js').then(({ createClient }) => 
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
};