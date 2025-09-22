/**
 * Timezone Cache Utility
 * 
 * Addresses the major performance issue where `SELECT name FROM pg_timezone_names` 
 * is consuming 34.8% of database query time (10.9 seconds across 64 calls).
 * 
 * This utility implements client-side caching to reduce database calls.
 */

import { createClient } from '@/lib/supabase/client';

interface TimezoneCache {
  data: string[];
  lastFetch: number;
  ttl: number; // Time to live in milliseconds
}

class TimezoneManager {
  private cache: TimezoneCache = {
    data: [],
    lastFetch: 0,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
  };

  private readonly STORAGE_KEY = 'timezone_cache_v1';
  private readonly FALLBACK_TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];

  constructor() {
    // Load from localStorage if available
    this.loadFromStorage();
  }

  /**
   * Get timezones with caching
   * Only hits the database if cache is expired or empty
   */
  async getTimezones(): Promise<string[]> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cache.data.length > 0 && (now - this.cache.lastFetch) < this.cache.ttl) {
      return this.cache.data;
    }

    try {
      // Try to fetch from materialized view first (created in migration)
      const timezones = await this.fetchTimezonesFromDB();
      
      if (timezones.length > 0) {
        this.updateCache(timezones);
        return timezones;
      }
    } catch (error) {
      console.warn('Failed to fetch timezones from database:', error);
    }

    // Fallback to cached data or default timezones
    return this.cache.data.length > 0 ? this.cache.data : this.FALLBACK_TIMEZONES;
  }

  /**
   * Fetch timezones from database (with fallback)
   */
  private async fetchTimezonesFromDB(): Promise<string[]> {
    const supabase = createClient();

    try {
      // First try the materialized view (should be much faster)
      const { data: cachedData, error: cachedError } = await supabase
        .from('cached_timezone_names')
        .select('name')
        .order('name');

      if (!cachedError && cachedData) {
        return cachedData.map((row: { name: string }) => row.name);
      }
    } catch {
      console.warn('Materialized view not available, falling back to direct query');
    }

    // Fallback to direct query (this is the slow one we're trying to avoid)
    const { data, error } = await supabase
      .rpc('get_timezone_names'); // We'll create this RPC function

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Update cache and persist to storage
   */
  private updateCache(timezones: string[]): void {
    this.cache = {
      data: timezones,
      lastFetch: Date.now(),
      ttl: this.cache.ttl,
    };

    this.saveToStorage();
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache = { ...this.cache, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load timezone cache from storage:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save timezone cache to storage:', error);
    }
  }

  /**
   * Force refresh the cache
   */
  async refresh(): Promise<string[]> {
    this.cache.lastFetch = 0; // Force refresh
    return this.getTimezones();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache = {
      data: [],
      lastFetch: 0,
      ttl: this.cache.ttl,
    };

    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
}

// Export singleton instance
export const timezoneManager = new TimezoneManager();

// Export utility functions
export const getTimezones = () => timezoneManager.getTimezones();
export const refreshTimezones = () => timezoneManager.refresh();
export const clearTimezoneCache = () => timezoneManager.clearCache();