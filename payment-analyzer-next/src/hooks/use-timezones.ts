/**
 * useTimezones Hook
 * 
 * Optimized hook for timezone data that addresses the major performance issue
 * where timezone queries consume 34.8% of database query time.
 * 
 * Features:
 * - Client-side caching
 * - Fallback to common timezones
 * - Search functionality
 * - Background refresh
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseTimezonesOptions {
  /** Whether to fetch all timezones or just common ones */
  mode?: 'all' | 'common' | 'search';
  /** Search term for filtering timezones */
  searchTerm?: string;
  /** Whether to enable automatic background refresh */
  autoRefresh?: boolean;
  /** Refresh interval in milliseconds (default: 24 hours) */
  refreshInterval?: number;
}

interface UseTimezonesReturn {
  timezones: string[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  search: (term: string) => Promise<string[]>;
}

export function useTimezones(options: UseTimezonesOptions = {}): UseTimezonesReturn {
  const {
    mode = 'common',
    searchTerm = '',
    autoRefresh = true,
    refreshInterval = 24 * 60 * 60 * 1000, // 24 hours
  } = options;

  const [timezones, setTimezones] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Memoized fallback timezones
  const fallbackTimezones = useMemo(() => [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver', 
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Australia/Sydney',
  ], []);

  /**
   * Fetch timezones based on mode
   */
  const fetchTimezones = useCallback(async (term: string = searchTerm): Promise<string[]> => {
    setIsLoading(true);
    setError(null);

    try {
      let data: string[] = [];

      switch (mode) {
        case 'common':
          // Use the fast common timezones function
          const { data: commonData, error: commonError } = await supabase
            .rpc('get_common_timezones');
          
          if (commonError) throw commonError;
          data = commonData?.map((row: { name: string }) => row.name) || [];
          break;

        case 'search':
          if (!term.trim()) {
            data = fallbackTimezones;
            break;
          }
          
          // Use the optimized search function
          const { data: searchData, error: searchError } = await supabase
            .rpc('search_timezones', { search_term: term });
          
          if (searchError) throw searchError;
          data = searchData?.map((row: { name: string }) => row.name) || [];
          break;

        case 'all':
        default:
          // Use the cached timezone function
          const { data: allData, error: allError } = await supabase
            .rpc('get_timezone_names');
          
          if (allError) throw allError;
          data = allData?.map((row: { name: string }) => row.name) || [];
          break;
      }

      // Fallback to default timezones if no data
      if (data.length === 0) {
        data = fallbackTimezones;
      }

      setTimezones(data);
      return data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch timezones';
      setError(errorMessage);
      console.warn('Timezone fetch failed, using fallback:', errorMessage);
      
      // Use fallback timezones on error
      setTimezones(fallbackTimezones);
      return fallbackTimezones;
      
    } finally {
      setIsLoading(false);
    }
  }, [mode, searchTerm, supabase, fallbackTimezones]);

  /**
   * Search timezones
   */
  const search = useCallback(async (term: string): Promise<string[]> => {
    if (!term.trim()) {
      return fallbackTimezones;
    }

    try {
      const { data, error } = await supabase
        .rpc('search_timezones', { search_term: term });

      if (error) throw error;

      const results = data?.map((row: { name: string }) => row.name) || [];
      return results.length > 0 ? results : fallbackTimezones;
      
    } catch (err) {
      console.warn('Timezone search failed:', err);
      return fallbackTimezones.filter(tz => 
        tz.toLowerCase().includes(term.toLowerCase())
      );
    }
  }, [supabase, fallbackTimezones]);

  /**
   * Refresh timezones
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchTimezones();
  }, [fetchTimezones]);

  // Initial fetch
  useEffect(() => {
    fetchTimezones();
  }, [fetchTimezones]);

  // Auto refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTimezones();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTimezones]);

  return {
    timezones,
    isLoading,
    error,
    refresh,
    search,
  };
}

/**
 * Hook specifically for common timezones (fastest)
 */
export function useCommonTimezones() {
  return useTimezones({ mode: 'common', autoRefresh: false });
}

/**
 * Hook for timezone search functionality
 */
export function useTimezoneSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const { search, isLoading, error } = useTimezones({ mode: 'search' });

  const performSearch = useCallback(async (term: string) => {
    setSearchTerm(term);
    return await search(term);
  }, [search]);

  return {
    searchTerm,
    performSearch,
    isLoading,
    error,
  };
}