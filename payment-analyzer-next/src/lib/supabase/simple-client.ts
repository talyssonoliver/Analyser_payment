/**
 * Simplified Supabase Client for Development
 * Bypasses complex module resolution issues
 */

/**
 * Create mock query builder with reduced nesting
 */
function createMockQueryBuilder() {
  const mockResponse = { data: [], error: null };

  const limitFn = () => Promise.resolve(mockResponse);
  const orderFn = () => ({ limit: limitFn });
  const eqFn = () => ({ order: orderFn });
  const selectFn = () => ({ eq: eqFn });

  return {
    select: selectFn,
    insert: () => Promise.resolve({ data: {}, error: null }),
    update: () => Promise.resolve({ data: {}, error: null }),
    delete: () => Promise.resolve({ data: {}, error: null }),
  };
}

/**
 * Create mock auth service
 */
function createMockAuth() {
  return {
    getUser: () =>
      Promise.resolve({
        data: {
          user: {
            id: "dev-user-123",
            email: "dev@example.com",
          },
        },
        error: null,
      }),
    signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
    signUp: () => Promise.resolve({ data: {}, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
      // Mock auth state change
      setTimeout(() => callback("SIGNED_IN", { user: { id: "dev-user-123" } }), 100);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  };
}

// Mock implementation for development
export const createSimpleClient = () => {
  if (process.env.NODE_ENV === "development") {
    return {
      auth: createMockAuth(),
      from: createMockQueryBuilder,
    };
  }

  // In production, use real Supabase (lazy loaded)
  return import("@supabase/supabase-js").then(({ createClient }) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      throw new Error("Missing Supabase environment variables");
    }
    return createClient(url, anon);
  });
};
