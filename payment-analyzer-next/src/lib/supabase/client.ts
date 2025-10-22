/**
 * Supabase Client Configuration
 * Sets up the client for browser usage
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasValidSupabaseConfig, initSupabaseCleanup } from "@/lib/utils/supabase-cleanup";
import type { SupabaseAuthResponse, SupabaseSession, SupabaseUser } from "@/types/core";
import type { Database } from "./types";

// Types for proper typing instead of any
type ChainableQueryBuilder = {
  select: (columns?: string) => ChainableQueryBuilder;
  insert: (values: Record<string, unknown>) => ChainableQueryBuilder;
  update: (values: Record<string, unknown>) => ChainableQueryBuilder;
  delete: () => ChainableQueryBuilder;
  upsert: (values: Record<string, unknown>) => ChainableQueryBuilder;
  eq: (column: string, value: unknown) => ChainableQueryBuilder;
  neq: (column: string, value: unknown) => ChainableQueryBuilder;
  gt: (column: string, value: unknown) => ChainableQueryBuilder;
  gte: (column: string, value: unknown) => ChainableQueryBuilder;
  lt: (column: string, value: unknown) => ChainableQueryBuilder;
  lte: (column: string, value: unknown) => ChainableQueryBuilder;
  like: (column: string, pattern: string) => ChainableQueryBuilder;
  ilike: (column: string, pattern: string) => ChainableQueryBuilder;
  is: (column: string, value: unknown) => ChainableQueryBuilder;
  in: (column: string, values: unknown[]) => ChainableQueryBuilder;
  contains: (column: string, value: unknown) => ChainableQueryBuilder;
  containedBy: (column: string, value: unknown) => ChainableQueryBuilder;
  rangeGt: (column: string, value: unknown) => ChainableQueryBuilder;
  rangeGte: (column: string, value: unknown) => ChainableQueryBuilder;
  rangeLt: (column: string, value: unknown) => ChainableQueryBuilder;
  rangeLte: (column: string, value: unknown) => ChainableQueryBuilder;
  rangeAdjacent: (column: string, value: unknown) => ChainableQueryBuilder;
  overlaps: (column: string, value: unknown) => ChainableQueryBuilder;
  textSearch: (column: string, query: string) => ChainableQueryBuilder;
  match: (query: Record<string, unknown>) => ChainableQueryBuilder;
  not: (column: string, operator: string, value: unknown) => ChainableQueryBuilder;
  or: (filters: string) => ChainableQueryBuilder;
  filter: (column: string, operator: string, value: unknown) => ChainableQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => ChainableQueryBuilder;
  limit: (count: number) => ChainableQueryBuilder;
  range: (from: number, to: number) => ChainableQueryBuilder;
  abortSignal: (signal: AbortSignal) => ChainableQueryBuilder;
  single: () => ChainableQueryBuilder;
  maybeSingle: () => ChainableQueryBuilder;
  csv: () => ChainableQueryBuilder;
  then: <T = { data: null; error: Error | null }>(
    onfulfilled?: ((value: T) => T | PromiseLike<T>) | null,
    onrejected?: ((reason: Error) => T | PromiseLike<T>) | null
  ) => Promise<T>;
};

type PromiseResolver<T> = ((value: T) => T | PromiseLike<T>) | null | undefined;
type PromiseRejecter<T> = ((reason: Error) => T | PromiseLike<T>) | null | undefined;

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Initialize cleanup on import
if (isBrowser) {
  initSupabaseCleanup();
}

function createDummyClient(): SupabaseClient {
  const notConfiguredError = new Error("Supabase not configured");

  return {
    auth: {
      getUser: async (): Promise<SupabaseAuthResponse<SupabaseUser>> => ({
        data: { user: null, session: null },
        error: notConfiguredError,
      }),
      getSession: async (): Promise<SupabaseAuthResponse<SupabaseSession>> => ({
        data: { session: null, user: null },
        error: notConfiguredError,
      }),
      signOut: async (): Promise<SupabaseAuthResponse<never>> => ({
        data: { user: null, session: null },
        error: notConfiguredError,
      }),
      signInWithPassword: async (): Promise<SupabaseAuthResponse<SupabaseSession>> => ({
        data: { user: null, session: null },
        error: notConfiguredError,
      }),
      signUp: async (): Promise<SupabaseAuthResponse<SupabaseSession>> => ({
        data: { user: null, session: null },
        error: notConfiguredError,
      }),
      resetPasswordForEmail: async (): Promise<SupabaseAuthResponse<never>> => ({
        data: { user: null, session: null },
        error: notConfiguredError,
      }),
      updateUser: async (): Promise<SupabaseAuthResponse<SupabaseUser>> => ({
        data: { user: null, session: null },
        error: notConfiguredError,
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => {
      const chainable: ChainableQueryBuilder = {
        select: (_columns?: string) => chainable,
        insert: (_values: Record<string, unknown>) => chainable,
        update: (_values: Record<string, unknown>) => chainable,
        delete: () => chainable,
        upsert: (_values: Record<string, unknown>) => chainable,
        eq: (_column: string, _value: unknown) => chainable,
        neq: (_column: string, _value: unknown) => chainable,
        gt: (_column: string, _value: unknown) => chainable,
        gte: (_column: string, _value: unknown) => chainable,
        lt: (_column: string, _value: unknown) => chainable,
        lte: (_column: string, _value: unknown) => chainable,
        like: (_column: string, _pattern: string) => chainable,
        ilike: (_column: string, _pattern: string) => chainable,
        is: (_column: string, _value: unknown) => chainable,
        in: (_column: string, _values: unknown[]) => chainable,
        contains: (_column: string, _value: unknown) => chainable,
        containedBy: (_column: string, _value: unknown) => chainable,
        rangeGt: (_column: string, _value: unknown) => chainable,
        rangeGte: (_column: string, _value: unknown) => chainable,
        rangeLt: (_column: string, _value: unknown) => chainable,
        rangeLte: (_column: string, _value: unknown) => chainable,
        rangeAdjacent: (_column: string, _value: unknown) => chainable,
        overlaps: (_column: string, _value: unknown) => chainable,
        textSearch: (_column: string, _query: string) => chainable,
        match: (_query: Record<string, unknown>) => chainable,
        not: (_column: string, _operator: string, _value: unknown) => chainable,
        or: (_filters: string) => chainable,
        filter: (_column: string, _operator: string, _value: unknown) => chainable,
        order: (_column: string, _options?: { ascending?: boolean }) => chainable,
        limit: (_count: number) => chainable,
        range: (_from: number, _to: number) => chainable,
        abortSignal: (_signal: AbortSignal) => chainable,
        single: () => chainable,
        maybeSingle: () => chainable,
        csv: () => chainable,
        // biome-ignore lint/suspicious/noThenProperty: mock thenable for await compatibility
        then: <T = { data: null; error: Error | null }>(
          _onfulfilled?: PromiseResolver<T>,
          _onrejected?: PromiseRejecter<T>
        ) => Promise.resolve({ data: null, error: notConfiguredError } as T),
      };
      return chainable;
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: notConfiguredError }),
        download: () => Promise.resolve({ data: null, error: notConfiguredError }),
        remove: () => Promise.resolve({ data: null, error: notConfiguredError }),
        createSignedUrl: () => Promise.resolve({ data: null, error: notConfiguredError }),
        createSignedUrls: () => Promise.resolve({ data: null, error: notConfiguredError }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        list: () => Promise.resolve({ data: null, error: notConfiguredError }),
      }),
      createBucket: () => Promise.resolve({ data: null, error: notConfiguredError }),
      getBucket: () => Promise.resolve({ data: null, error: notConfiguredError }),
      listBuckets: () => Promise.resolve({ data: null, error: notConfiguredError }),
      updateBucket: () => Promise.resolve({ data: null, error: notConfiguredError }),
      deleteBucket: () => Promise.resolve({ data: null, error: notConfiguredError }),
    },
    channel: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    getChannels: () => [],
    removeAllChannels: async () => {},
    removeChannel: async () => {},
  } as unknown as SupabaseClient;
}

export function createClient() {
  // Check for valid configuration first
  if (!hasValidSupabaseConfig()) {
    if (isBrowser) {
      console.warn(
        "Supabase is not properly configured. Running in offline mode.\n" +
          "To enable online features, check your .env.local file:\n" +
          "- NEXT_PUBLIC_SUPABASE_URL\n" +
          "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }
    return createDummyClient();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("Supabase environment variables are missing. Falling back to dummy client.");
    return createDummyClient();
  }

  try {
    return createBrowserClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      // Note: global.headers only affects REQUEST headers sent to Supabase,
      // not RESPONSE headers returned by Supabase. See docs/CACHE_CONTROL_HEADERS.md
    });
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    return createDummyClient();
  }
}
