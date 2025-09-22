/**
 * Compressed Storage Hook
 * React hook for using compressed storage with automatic state management
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnalysisStorageService } from '@/lib/services/analysis-storage-service';

// Type definitions for storage hooks
interface PaymentRules {
  weekdayRate: number;
  saturdayRate: number;
  unloadingBonus: number;
  attendanceBonus: number;
  earlyBonus: number;
}

interface StorageStats {
  usage: {
    used: string;
    available: string;
    percentage: string;
    isNearLimit: boolean;
  };
  compression: {
    totalItems: number;
    originalSize: string;
    compressedSize: string;
    savedBytes: string;
    savedPercentage: string;
    compressionRatio: string;
  };
  breakdown: Record<string, { size: string; items: number }>;
}

interface HealthCheck {
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
}

interface AnalysisData {
  [analysisId: string]: {
    id: string;
    period: string;
    status: string;
    createdAt: string;
    [key: string]: unknown;
  };
}

export interface StorageState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  save: (data: T) => Promise<boolean>;
  clear: () => void;
  reload: () => void;
}

/**
 * Hook for compressed storage with automatic state management
 */
export function useCompressedStorage<T = unknown>(key: string, defaultValue: T | null = null): StorageState<T> {
  const [data, setData] = useState<T | null>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use a slight delay to avoid blocking UI
      await new Promise(resolve => setTimeout(resolve, 0));

      const stored = AnalysisStorageService.loadAnalyses();
      setData((stored || defaultValue) as T | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setData(defaultValue);
    } finally {
      setLoading(false);
    }
  }, [defaultValue]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const save = useCallback(async (newData: T): Promise<boolean> => {
    setError(null);

    try {
      // Type-safe conversion for storage service
      const dataToSave = newData as Record<string, Record<string, unknown>>;
      const success = AnalysisStorageService.saveAnalyses(dataToSave);
      if (success) {
        setData(newData);
        return true;
      } else {
        setError('Failed to save data - storage limit may be exceeded');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data');
      return false;
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    AnalysisStorageService.clearAnalysisData();
  }, []);

  const reload = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    save,
    clear,
    reload
  };
}

/**
 * Hook specifically for analysis data
 */
export function useAnalysisStorage() {
  return useCompressedStorage<AnalysisData>('analyses', {});
}

/**
 * Hook for payment rules
 */
export function usePaymentRules() {
  const [rules, setRules] = useState<PaymentRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const stored = AnalysisStorageService.loadRules();
      // Convert StringKeyObject back to PaymentRules with type assertion and validation
      const defaultRules: PaymentRules = {
        weekdayRate: 2.00,
        saturdayRate: 3.00,
        unloadingBonus: 30.00,
        attendanceBonus: 25.00,
        earlyBonus: 50.00
      };

      if (stored && typeof stored === 'object') {
        // Validate and convert the stored rules
        const validatedRules: PaymentRules = {
          weekdayRate: typeof stored.weekdayRate === 'number' ? stored.weekdayRate : defaultRules.weekdayRate,
          saturdayRate: typeof stored.saturdayRate === 'number' ? stored.saturdayRate : defaultRules.saturdayRate,
          unloadingBonus: typeof stored.unloadingBonus === 'number' ? stored.unloadingBonus : defaultRules.unloadingBonus,
          attendanceBonus: typeof stored.attendanceBonus === 'number' ? stored.attendanceBonus : defaultRules.attendanceBonus,
          earlyBonus: typeof stored.earlyBonus === 'number' ? stored.earlyBonus : defaultRules.earlyBonus
        };
        setRules(validatedRules);
      } else {
        setRules(defaultRules);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const saveRules = useCallback(async (newRules: PaymentRules): Promise<boolean> => {
    setError(null);

    try {
      // Convert PaymentRules to StringKeyObject for storage service
      const rulesAsStringKeyObject = newRules as unknown as Record<string, unknown>;
      const success = AnalysisStorageService.saveRules(rulesAsStringKeyObject);
      if (success) {
        setRules(newRules);
        return true;
      } else {
        setError('Failed to save rules');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rules');
      return false;
    }
  }, []);

  return {
    rules,
    loading,
    error,
    saveRules,
    reload: loadRules
  };
}

/**
 * Hook for storage statistics and health monitoring
 */
export function useStorageStats() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStats = useCallback(() => {
    setLoading(true);
    
    try {
      const storageStats = AnalysisStorageService.getStorageStats();
      const healthCheck = AnalysisStorageService.checkStorageHealth();
      
      setStats(storageStats);
      setHealth(healthCheck);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  const migrateLegacyData = useCallback(() => {
    return AnalysisStorageService.migrateLegacyData();
  }, []);

  return {
    stats,
    health,
    loading,
    refresh: refreshStats,
    migrateLegacyData
  };
}

export default useCompressedStorage;