/**
 * Analysis Storage Service
 * High-level interface for storing analysis data with compression
 * Replaces direct localStorage usage throughout the application
 */

import { CompressedStorageService } from './compressed-storage-service';
import { StringKeyObject } from '@/types/core';

// Declare LZString on window for original HTML system compatibility
declare global {
  interface Window {
    LZString?: {
      decompressFromUTF16: (input: string) => string | null;
      compressToUTF16: (input: string) => string;
    };
  }
}

export interface StorageKeys {
  ANALYSES: 'pa:analyses:v9';
  RULES: 'pa:rules:v9';
  SESSION: 'pa:session:v9';
  UPLOADED_FILES: 'uploadedFiles_v9';
  USER_PREFERENCES: 'pa:preferences:v9';
}

export class AnalysisStorageService {
  // Storage keys matching original HTML system
  static readonly KEYS: StorageKeys = {
    ANALYSES: 'pa:analyses:v9',
    RULES: 'pa:rules:v9',
    SESSION: 'pa:session:v9',
    UPLOADED_FILES: 'uploadedFiles_v9',
    USER_PREFERENCES: 'pa:preferences:v9'
  };

  /**
   * Store analysis data with compression
   */
  static saveAnalyses(analyses: Record<string, StringKeyObject>): boolean {
    return CompressedStorageService.setItem(this.KEYS.ANALYSES, analyses);
  }

  /**
   * Load analysis data
   */
  static loadAnalyses(): Record<string, StringKeyObject> {
    // First try the new React key
    let analyses = CompressedStorageService.getItem(this.KEYS.ANALYSES);
    
    if (!analyses || Object.keys(analyses).length === 0) {
      // Fallback to original HTML system key
      const originalKey = 'paymentAnalyzer_v9_analyses';
      try {
        const rawData = localStorage.getItem(originalKey);
        if (rawData) {
          console.log('📦 Found original HTML system data, attempting to load...');
          // Try to decompress if it's LZ-string compressed
          if (window.LZString) {
            try {
              const decompressed = window.LZString.decompressFromUTF16(rawData);
              if (decompressed) {
                analyses = JSON.parse(decompressed);
                console.log('📦 Successfully loaded and decompressed original data');
              } else {
                // Not compressed, try direct parsing
                analyses = JSON.parse(rawData);
                console.log('📦 Successfully loaded original uncompressed data');
              }
            } catch {
              // Try direct parsing if decompression fails
              analyses = JSON.parse(rawData);
              console.log('📦 Successfully loaded original data (direct parse)');
            }
          } else {
            analyses = JSON.parse(rawData);
            console.log('📦 Successfully loaded original data (no LZString)');
          }
        }
      } catch (error) {
        console.error('Failed to load original HTML system data:', error);
        analyses = {};
      }
    }

    return (analyses as Record<string, StringKeyObject>) || {};
  }

  /**
   * Store payment rules
   */
  static saveRules(rules: StringKeyObject): boolean {
    return CompressedStorageService.setItem(this.KEYS.RULES, rules);
  }

  /**
   * Load payment rules
   */
  static loadRules(): StringKeyObject | null {
    return CompressedStorageService.getItem(this.KEYS.RULES);
  }

  /**
   * Store session data
   */
  static saveSession(sessionData: StringKeyObject): boolean {
    return CompressedStorageService.setItem(this.KEYS.SESSION, sessionData);
  }

  /**
   * Load session data
   */
  static loadSession(): StringKeyObject | null {
    return CompressedStorageService.getItem(this.KEYS.SESSION);
  }

  /**
   * Store uploaded files metadata
   */
  static saveUploadedFiles(files: StringKeyObject[]): boolean {
    return CompressedStorageService.setItem(this.KEYS.UPLOADED_FILES, files);
  }

  /**
   * Load uploaded files metadata
   */
  static loadUploadedFiles(): StringKeyObject[] {
    return CompressedStorageService.getItem(this.KEYS.UPLOADED_FILES) || [];
  }

  /**
   * Store user preferences
   */
  static savePreferences(preferences: StringKeyObject): boolean {
    return CompressedStorageService.setItem(this.KEYS.USER_PREFERENCES, preferences);
  }

  /**
   * Load user preferences
   */
  static loadPreferences(): StringKeyObject | null {
    return CompressedStorageService.getItem(this.KEYS.USER_PREFERENCES);
  }

  /**
   * Store single analysis
   */
  static saveAnalysis(analysisId: string, analysisData: StringKeyObject): boolean {
    const analyses = this.loadAnalyses();
    analyses[analysisId] = analysisData;
    return this.saveAnalyses(analyses);
  }

  /**
   * Load single analysis
   */
  static loadAnalysis(analysisId: string): StringKeyObject | null {
    const analyses = this.loadAnalyses();
    return analyses[analysisId] || null;
  }

  /**
   * Delete analysis
   */
  static deleteAnalysis(analysisId: string): boolean {
    const analyses = this.loadAnalyses();
    if (analyses[analysisId]) {
      delete analyses[analysisId];
      return this.saveAnalyses(analyses);
    }
    return true;
  }

  /**
   * Get storage statistics
   */
  static getStorageStats() {
    const metrics = CompressedStorageService.getStorageMetrics();
    const usage = CompressedStorageService.getStorageUsage();
    
    return {
      compression: {
        totalItems: metrics.totalItems,
        originalSize: this.formatBytes(metrics.totalOriginalSize),
        compressedSize: this.formatBytes(metrics.totalCompressedSize),
        savedBytes: this.formatBytes(metrics.savedBytes),
        savedPercentage: metrics.savedPercentage.toFixed(1) + '%',
        compressionRatio: (metrics.compressionRatio * 100).toFixed(1) + '%'
      },
      usage: {
        used: this.formatBytes(usage.used),
        available: this.formatBytes(usage.available),
        percentage: usage.percentage.toFixed(1) + '%',
        isNearLimit: usage.percentage > 80
      },
      breakdown: this.getStorageBreakdown()
    };
  }

  /**
   * Get detailed storage breakdown by key
   */
  private static getStorageBreakdown() {
    const breakdown: Record<string, { size: string; items: number }> = {};
    
    Object.values(this.KEYS).forEach(key => {
      const data = CompressedStorageService.getItem(key);
      if (data) {
        const size = new Blob([JSON.stringify(data)]).size;
        breakdown[key] = {
          size: this.formatBytes(size),
          items: Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : 1)
        };
      }
    });

    return breakdown;
  }

  /**
   * Migrate from legacy localStorage to compressed storage
   */
  static migrateLegacyData(): {
    migrated: string[];
    skipped: string[];
    errors: string[];
  } {
    return CompressedStorageService.migrateLegacyData();
  }

  /**
   * Clear all analysis data (keep user preferences)
   */
  static clearAnalysisData(): void {
    CompressedStorageService.removeItem(this.KEYS.ANALYSES);
    CompressedStorageService.removeItem(this.KEYS.SESSION);
    CompressedStorageService.removeItem(this.KEYS.UPLOADED_FILES);
  }

  /**
   * Clear all data
   */
  static clearAllData(): void {
    CompressedStorageService.clear();
  }

  /**
   * Check if storage is healthy (not corrupted)
   */
  static checkStorageHealth(): {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Test basic functionality
      const testKey = 'health-check-test';
      const testData = { test: true, timestamp: Date.now() };
      
      CompressedStorageService.setItem(testKey, testData);
      const retrieved = CompressedStorageService.getItem(testKey);
      CompressedStorageService.removeItem(testKey);

      if (!retrieved || typeof retrieved !== 'object' || !('test' in retrieved) || retrieved.test !== true) {
        issues.push('Basic read/write operations failing');
      }

      // Check storage usage
      const usage = CompressedStorageService.getStorageUsage();
      if (usage.percentage > 90) {
        issues.push('Storage usage over 90%');
        recommendations.push('Clear old analysis data or export to external storage');
      } else if (usage.percentage > 80) {
        recommendations.push('Consider clearing old data to maintain performance');
      }

      // Check for corrupted data
      Object.values(this.KEYS).forEach(key => {
        try {
          CompressedStorageService.getItem(key);
        } catch {
          issues.push(`Corrupted data in key: ${key}`);
          recommendations.push(`Clear and recreate data for key: ${key}`);
        }
      });

    } catch (error) {
      issues.push('Storage system failure: ' + (error instanceof Error ? error.message : 'Unknown error'));
      recommendations.push('Clear browser data and refresh the application');
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Export all data for backup
   */
  static exportAllData(): {
    version: string;
    timestamp: number;
    data: Record<string, StringKeyObject>;
    metrics: StringKeyObject;
  } {
    const exportData: Record<string, StringKeyObject> = {};
    
    Object.values(this.KEYS).forEach(key => {
      const data = CompressedStorageService.getItem(key);
      if (data) {
        exportData[key] = data as StringKeyObject;
      }
    });

    return {
      version: '9.0.0',
      timestamp: Date.now(),
      data: exportData,
      metrics: this.getStorageStats()
    };
  }

  /**
   * Import data from backup
   */
  static importData(backupData: StringKeyObject): {
    success: boolean;
    imported: string[];
    errors: string[];
  } {
    const result = {
      success: false,
      imported: [] as string[],
      errors: [] as string[]
    };

    try {
      if (!backupData.data || !backupData.version) {
        result.errors.push('Invalid backup data format');
        return result;
      }

      Object.entries(backupData.data).forEach(([key, data]) => {
        try {
          const success = CompressedStorageService.setItem(key, data);
          if (success) {
            result.imported.push(key);
          } else {
            result.errors.push(`Failed to import: ${key}`);
          }
        } catch (error) {
          result.errors.push(`Error importing ${key}: ${error}`);
        }
      });

      result.success = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    return result;
  }

  /**
   * Format bytes for display
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default AnalysisStorageService;