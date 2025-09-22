/**
 * Supabase Client Configuration
 * Sets up the client for browser usage
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { initSupabaseCleanup, hasValidSupabaseConfig } from '@/lib/utils/supabase-cleanup';
import type { SupabaseAuthResponse, SupabaseUser, SupabaseSession } from '@/types/core';

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
const isBrowser = typeof window !== 'undefined';

// Initialize cleanup on import
if (isBrowser) {
  initSupabaseCleanup();
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function createDummyClient(): SupabaseClient {
  const notConfiguredError = new Error('Supabase not configured');

   
  return {
    auth: {
      getUser: async (): Promise<SupabaseAuthResponse<SupabaseUser>> => ({ data: { user: null, session: null }, error: notConfiguredError }),
      getSession: async (): Promise<SupabaseAuthResponse<SupabaseSession>> => ({ data: { session: null, user: null }, error: notConfiguredError }),
      signOut: async (): Promise<SupabaseAuthResponse<never>> => ({ data: { user: null, session: null }, error: notConfiguredError }),
      signInWithPassword: async (): Promise<SupabaseAuthResponse<SupabaseSession>> => ({ data: { user: null, session: null }, error: notConfiguredError }),
      signUp: async (): Promise<SupabaseAuthResponse<SupabaseSession>> => ({ data: { user: null, session: null }, error: notConfiguredError }),
      resetPasswordForEmail: async (): Promise<SupabaseAuthResponse<never>> => ({ data: { user: null, session: null }, error: notConfiguredError }),
      updateUser: async (): Promise<SupabaseAuthResponse<SupabaseUser>> => ({ data: { user: null, session: null }, error: notConfiguredError }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => {
       
      const chainable: ChainableQueryBuilder = {
        select: (columns?: string) => chainable,
        insert: (values: Record<string, unknown>) => chainable,
        update: (values: Record<string, unknown>) => chainable,
        delete: () => chainable,
        upsert: (values: Record<string, unknown>) => chainable,
        eq: (column: string, value: unknown) => chainable,
        neq: (column: string, value: unknown) => chainable,
        gt: (column: string, value: unknown) => chainable,
        gte: (column: string, value: unknown) => chainable,
        lt: (column: string, value: unknown) => chainable,
        lte: (column: string, value: unknown) => chainable,
        like: (column: string, pattern: string) => chainable,
        ilike: (column: string, pattern: string) => chainable,
        is: (column: string, value: unknown) => chainable,
        in: (column: string, values: unknown[]) => chainable,
        contains: (column: string, value: unknown) => chainable,
        containedBy: (column: string, value: unknown) => chainable,
        rangeGt: (column: string, value: unknown) => chainable,
        rangeGte: (column: string, value: unknown) => chainable,
        rangeLt: (column: string, value: unknown) => chainable,
        rangeLte: (column: string, value: unknown) => chainable,
        rangeAdjacent: (column: string, value: unknown) => chainable,
        overlaps: (column: string, value: unknown) => chainable,
        textSearch: (column: string, query: string) => chainable,
        match: (query: Record<string, unknown>) => chainable,
        not: (column: string, operator: string, value: unknown) => chainable,
        or: (filters: string) => chainable,
        filter: (column: string, operator: string, value: unknown) => chainable,
        order: (column: string, options?: { ascending?: boolean }) => chainable,
        limit: (count: number) => chainable,
        range: (from: number, to: number) => chainable,
        abortSignal: (signal: AbortSignal) => chainable,
        single: () => chainable,
        maybeSingle: () => chainable,
        csv: () => chainable,
        then: <T = { data: null; error: Error | null }>(
          onfulfilled?: PromiseResolver<T>,
          onrejected?: PromiseRejecter<T>
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
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
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
/* eslint-enable @typescript-eslint/no-unused-vars */

export function createClient() {
  // Check for valid configuration first
  if (!hasValidSupabaseConfig()) {
    if (isBrowser) {
      console.warn(
        'Supabase is not properly configured. Running in offline mode.\n' +
        'To enable online features, check your .env.local file:\n' +
        '- NEXT_PUBLIC_SUPABASE_URL\n' +
        '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
    return createDummyClient();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    return createBrowserClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return createDummyClient();
  }
}

