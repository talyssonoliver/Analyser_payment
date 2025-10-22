/**
 * Analysis Storage Service
 * High-level interface for storing analysis data with compression
 * Replaces direct localStorage usage throughout the application
 */

import type { StringKeyObject } from "@/types/core";
import { CompressedStorageService } from "./compressed-storage-service";

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
  ANALYSES: "pa:analyses:v9";
  RULES: "pa:rules:v9";
  SESSION: "pa:session:v9";
  UPLOADED_FILES: "uploadedFiles_v9";
  USER_PREFERENCES: "pa:preferences:v9";
}

// biome-ignore lint/complexity/noStaticOnlyClass: Intentional class-as-namespace for stable API surface
export class AnalysisStorageService {
  // Storage keys matching original HTML system
  static readonly KEYS: StorageKeys = {
    ANALYSES: "pa:analyses:v9",
    RULES: "pa:rules:v9",
    SESSION: "pa:session:v9",
    UPLOADED_FILES: "uploadedFiles_v9",
    USER_PREFERENCES: "pa:preferences:v9",
  };

  /**
   * Store analysis data with compression
   */
  static saveAnalyses(analyses: Record<string, StringKeyObject>): boolean {
    return CompressedStorageService.setItem(AnalysisStorageService.KEYS.ANALYSES, analyses);
  }

  /**
   * Load analysis data
   */
  static loadAnalyses(): Record<string, StringKeyObject> {
    // First try the new React key
    let analyses = CompressedStorageService.getItem(AnalysisStorageService.KEYS.ANALYSES);

    if (!analyses || Object.keys(analyses).length === 0) {
      // Fallback to original HTML system key
      analyses = AnalysisStorageService.tryLoadFromLegacyStorage();
    }

    return (analyses as Record<string, StringKeyObject>) || {};
  }

  /**
   * Try to load data from legacy HTML system storage
   */
  private static tryLoadFromLegacyStorage(): StringKeyObject | null {
    const originalKey = "paymentAnalyzer_v9_analyses";

    try {
      const rawData = localStorage.getItem(originalKey);
      if (!rawData) {
        return null;
      }

      console.log("📦 Found original HTML system data, attempting to load...");
      return AnalysisStorageService.decompressAndParseLegacyData(rawData);
    } catch (error) {
      console.error("Failed to load original HTML system data:", error);
      return {};
    }
  }

  /**
   * Decompress and parse legacy data with multiple fallback strategies
   */
  private static decompressAndParseLegacyData(rawData: string): StringKeyObject {
    if (window.LZString) {
      return AnalysisStorageService.tryDecompressWithLZString(rawData);
    }

    // No LZString available, try direct parsing
    const parsed = AnalysisStorageService.tryParseJSON(rawData);
    if (parsed) {
      console.log("📦 Successfully loaded original data (no LZString)");
    }
    return parsed;
  }

  /**
   * Try to decompress data using LZString with fallback to direct parsing
   */
  private static tryDecompressWithLZString(rawData: string): StringKeyObject {
    try {
      const decompressed = window.LZString?.decompressFromUTF16(rawData);

      if (decompressed) {
        const parsed = JSON.parse(decompressed);
        console.log("📦 Successfully loaded and decompressed original data");
        return parsed;
      }

      // Decompression returned null, try direct parsing
      const parsed = AnalysisStorageService.tryParseJSON(rawData);
      if (parsed) {
        console.log("📦 Successfully loaded original uncompressed data");
      }
      return parsed;
    } catch {
      // Decompression failed, try direct parsing
      const parsed = AnalysisStorageService.tryParseJSON(rawData);
      if (parsed) {
        console.log("📦 Successfully loaded original data (direct parse)");
      }
      return parsed;
    }
  }

  /**
   * Try to parse JSON data, returning empty object on failure
   */
  private static tryParseJSON(data: string): StringKeyObject {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  /**
   * Store payment rules
   */
  static saveRules(rules: StringKeyObject): boolean {
    return CompressedStorageService.setItem(AnalysisStorageService.KEYS.RULES, rules);
  }

  /**
   * Load payment rules
   */
  static loadRules(): StringKeyObject | null {
    return CompressedStorageService.getItem(AnalysisStorageService.KEYS.RULES);
  }

  /**
   * Store session data
   */
  static saveSession(sessionData: StringKeyObject): boolean {
    return CompressedStorageService.setItem(AnalysisStorageService.KEYS.SESSION, sessionData);
  }

  /**
   * Load session data
   */
  static loadSession(): StringKeyObject | null {
    return CompressedStorageService.getItem(AnalysisStorageService.KEYS.SESSION);
  }

  /**
   * Store uploaded files metadata
   */
  static saveUploadedFiles(files: StringKeyObject[]): boolean {
    return CompressedStorageService.setItem(AnalysisStorageService.KEYS.UPLOADED_FILES, files);
  }

  /**
   * Load uploaded files metadata
   */
  static loadUploadedFiles(): StringKeyObject[] {
    return CompressedStorageService.getItem(AnalysisStorageService.KEYS.UPLOADED_FILES) || [];
  }

  /**
   * Store user preferences
   */
  static savePreferences(preferences: StringKeyObject): boolean {
    return CompressedStorageService.setItem(
      AnalysisStorageService.KEYS.USER_PREFERENCES,
      preferences
    );
  }

  /**
   * Load user preferences
   */
  static loadPreferences(): StringKeyObject | null {
    return CompressedStorageService.getItem(AnalysisStorageService.KEYS.USER_PREFERENCES);
  }

  /**
   * Store single analysis
   */
  static saveAnalysis(analysisId: string, analysisData: StringKeyObject): boolean {
    const analyses = AnalysisStorageService.loadAnalyses();
    analyses[analysisId] = analysisData;
    return AnalysisStorageService.saveAnalyses(analyses);
  }

  /**
   * Load single analysis
   */
  static loadAnalysis(analysisId: string): StringKeyObject | null {
    const analyses = AnalysisStorageService.loadAnalyses();
    return analyses[analysisId] || null;
  }

  /**
   * Delete analysis
   */
  static deleteAnalysis(analysisId: string): boolean {
    const analyses = AnalysisStorageService.loadAnalyses();
    if (analyses[analysisId]) {
      delete analyses[analysisId];
      return AnalysisStorageService.saveAnalyses(analyses);
    }
    return true;
  }

  /**
   * Clear old analyses except the specified one
   * Useful when starting a new analysis to prevent stale data issues
   */
  static clearOldAnalyses(keepAnalysisId: string): void {
    try {
      const analyses = AnalysisStorageService.loadAnalyses();
      const analysisIds = Object.keys(analyses);

      if (analysisIds.length === 0) {
        console.log("🧹 No old analyses to clear");
        return;
      }

      // Keep only the specified analysis
      const filtered: Record<string, StringKeyObject> = {};
      if (analyses[keepAnalysisId]) {
        filtered[keepAnalysisId] = analyses[keepAnalysisId];
        console.log(
          `🧹 Cleared ${analysisIds.length - 1} old analysis(es), kept: ${keepAnalysisId}`
        );
      } else {
        console.log(`🧹 Cleared all ${analysisIds.length} old analysis(es)`);
      }

      AnalysisStorageService.saveAnalyses(filtered);
    } catch (error) {
      console.error("Failed to clear old analyses:", error);
    }
  }

  /**
   * Prune analyses older than specified hours
   */
  static pruneByAge(maxAgeHours: number = 24): number {
    try {
      const analyses = AnalysisStorageService.loadAnalyses();
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      let prunedCount = 0;

      const filtered: Record<string, StringKeyObject> = {};

      for (const [id, data] of Object.entries(analyses)) {
        const analysisData = data as { createdAt?: string };
        if (analysisData.createdAt) {
          const age = now - new Date(analysisData.createdAt).getTime();
          if (age < maxAgeMs) {
            filtered[id] = data;
          } else {
            prunedCount++;
          }
        } else {
          // Keep analyses without createdAt (legacy data)
          filtered[id] = data;
        }
      }

      if (prunedCount > 0) {
        AnalysisStorageService.saveAnalyses(filtered);
        console.log(`🧹 Pruned ${prunedCount} old analysis(es) older than ${maxAgeHours} hours`);
      }

      return prunedCount;
    } catch (error) {
      console.error("Failed to prune old analyses:", error);
      return 0;
    }
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
        originalSize: AnalysisStorageService.formatBytes(metrics.totalOriginalSize),
        compressedSize: AnalysisStorageService.formatBytes(metrics.totalCompressedSize),
        savedBytes: AnalysisStorageService.formatBytes(metrics.savedBytes),
        savedPercentage: `${metrics.savedPercentage.toFixed(1)}%`,
        compressionRatio: `${(metrics.compressionRatio * 100).toFixed(1)}%`,
      },
      usage: {
        used: AnalysisStorageService.formatBytes(usage.used),
        available: AnalysisStorageService.formatBytes(usage.available),
        percentage: `${usage.percentage.toFixed(1)}%`,
        isNearLimit: usage.percentage > 80,
      },
      breakdown: AnalysisStorageService.getStorageBreakdown(),
    };
  }

  /**
   * Get detailed storage breakdown by key
   */
  private static getStorageBreakdown() {
    const breakdown: Record<string, { size: string; items: number }> = {};

    Object.values(AnalysisStorageService.KEYS).forEach((key) => {
      const data = CompressedStorageService.getItem(key);
      if (data) {
        const size = new Blob([JSON.stringify(data)]).size;
        breakdown[key] = {
          size: AnalysisStorageService.formatBytes(size),
          items: AnalysisStorageService.getItemCount(data),
        };
      }
    });

    return breakdown;
  }

  /**
   * Calculate item count based on data type
   */
  private static getItemCount(data: unknown): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    if (typeof data === "object" && data !== null) {
      return Object.keys(data).length;
    }
    return 1;
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
    CompressedStorageService.removeItem(AnalysisStorageService.KEYS.ANALYSES);
    CompressedStorageService.removeItem(AnalysisStorageService.KEYS.SESSION);
    CompressedStorageService.removeItem(AnalysisStorageService.KEYS.UPLOADED_FILES);
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
      const testKey = "health-check-test";
      const testData = { test: true, timestamp: Date.now() };

      CompressedStorageService.setItem(testKey, testData);
      const retrieved = CompressedStorageService.getItem(testKey);
      CompressedStorageService.removeItem(testKey);

      if (
        !retrieved ||
        typeof retrieved !== "object" ||
        !("test" in retrieved) ||
        retrieved.test !== true
      ) {
        issues.push("Basic read/write operations failing");
      }

      // Check storage usage
      const usage = CompressedStorageService.getStorageUsage();
      if (usage.percentage > 90) {
        issues.push("Storage usage over 90%");
        recommendations.push("Clear old analysis data or export to external storage");
      } else if (usage.percentage > 80) {
        recommendations.push("Consider clearing old data to maintain performance");
      }

      // Check for corrupted data
      Object.values(AnalysisStorageService.KEYS).forEach((key) => {
        try {
          CompressedStorageService.getItem(key);
        } catch {
          issues.push(`Corrupted data in key: ${key}`);
          recommendations.push(`Clear and recreate data for key: ${key}`);
        }
      });
    } catch (error) {
      issues.push(
        `Storage system failure: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      recommendations.push("Clear browser data and refresh the application");
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations,
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

    Object.values(AnalysisStorageService.KEYS).forEach((key) => {
      const data = CompressedStorageService.getItem(key);
      if (data) {
        exportData[key] = data as StringKeyObject;
      }
    });

    return {
      version: "9.0.0",
      timestamp: Date.now(),
      data: exportData,
      metrics: AnalysisStorageService.getStorageStats(),
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
      errors: [] as string[],
    };

    try {
      if (!backupData.data || !backupData.version) {
        result.errors.push("Invalid backup data format");
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
      result.errors.push(
        `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    return result;
  }

  /**
   * Format bytes for display
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  }
}

export default AnalysisStorageService;
