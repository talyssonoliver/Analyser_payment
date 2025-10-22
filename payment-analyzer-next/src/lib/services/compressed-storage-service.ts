/**
 * Compressed Storage Service
 * Handles localStorage with LZString compression for efficiency
 * Matches original HTML system's compression behavior
 */

import * as LZString from "lz-string";

export interface StorageItem {
  data: unknown;
  compressed: boolean;
  version: string;
  timestamp: number;
  size: {
    original: number;
    compressed: number;
    ratio: number;
  };
}

export interface StorageMetrics {
  totalItems: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  compressionRatio: number;
  savedBytes: number;
  savedPercentage: number;
}

// biome-ignore lint/complexity/noStaticOnlyClass: Intentional class-as-namespace for stable API surface
export class CompressedStorageService {
  private static readonly VERSION = "9.0.0";
  private static readonly COMPRESSION_THRESHOLD = 1024; // 1KB - compress items larger than this
  private static readonly MAX_STORAGE_SIZE = 8 * 1024 * 1024; // 8MB localStorage limit approximation

  /**
   * Store data with automatic compression
   */
  static setItem(key: string, data: unknown): boolean {
    try {
      const serialized = JSON.stringify(data);
      const originalSize = CompressedStorageService.getStringByteSize(serialized);

      const compressionResult = CompressedStorageService.compressIfBeneficial(
        serialized,
        originalSize
      );
      const storageItem = CompressedStorageService.createStorageItem(
        compressionResult,
        originalSize
      );
      const itemString = JSON.stringify(storageItem);

      if (!CompressedStorageService.ensureStorageSpace(key, itemString)) {
        return false;
      }

      localStorage.setItem(key, itemString);
      CompressedStorageService.logCompressionStats(key, compressionResult, originalSize);

      return true;
    } catch (error) {
      console.error("Failed to store compressed data:", error);
      return false;
    }
  }

  /**
   * Compress data if it's beneficial (saves space)
   */
  private static compressIfBeneficial(
    serialized: string,
    originalSize: number
  ): { data: string; compressed: boolean; size: number } {
    // Don't compress if smaller than threshold
    if (originalSize <= CompressedStorageService.COMPRESSION_THRESHOLD) {
      return { data: serialized, compressed: false, size: originalSize };
    }

    const compressedData = LZString.compressToUTF16(serialized);
    const compressedSize = CompressedStorageService.getStringByteSize(compressedData);

    // Only use compression if it saves at least 10% space
    if (compressedSize < originalSize * 0.9) {
      return { data: compressedData, compressed: true, size: compressedSize };
    }

    return { data: serialized, compressed: false, size: originalSize };
  }

  /**
   * Create storage item with metadata
   */
  private static createStorageItem(
    compressionResult: { data: string; compressed: boolean; size: number },
    originalSize: number
  ): StorageItem {
    return {
      data: compressionResult.data,
      compressed: compressionResult.compressed,
      version: CompressedStorageService.VERSION,
      timestamp: Date.now(),
      size: {
        original: originalSize,
        compressed: compressionResult.size,
        ratio: originalSize > 0 ? compressionResult.size / originalSize : 1,
      },
    };
  }

  /**
   * Ensure storage has space for item (cleanup if needed)
   */
  private static ensureStorageSpace(key: string, itemString: string): boolean {
    if (!CompressedStorageService.wouldExceedStorageLimit(key, itemString)) {
      return true;
    }

    console.warn("Storage limit would be exceeded, attempting cleanup...");
    CompressedStorageService.performStorageCleanup();

    if (CompressedStorageService.wouldExceedStorageLimit(key, itemString)) {
      console.error("Storage limit exceeded even after cleanup");
      return false;
    }

    return true;
  }

  /**
   * Log compression statistics if data was compressed
   */
  private static logCompressionStats(
    key: string,
    compressionResult: { compressed: boolean; size: number },
    originalSize: number
  ): void {
    if (!compressionResult.compressed) return;

    const savedBytes = originalSize - compressionResult.size;
    const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(1);
    console.log(`📦 Compressed storage: ${key} - Saved ${savedBytes} bytes (${savedPercentage}%)`);
  }

  /**
   * Retrieve and decompress data
   */
  static getItem<T = unknown>(key: string): T | null {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const storageItem = CompressedStorageService.parseStorageItem(stored);
      if (!storageItem) {
        return CompressedStorageService.tryParseLegacyData<T>(stored);
      }

      const dataString = CompressedStorageService.extractDataString(storageItem, key);
      if (!dataString) return null;

      return JSON.parse(dataString) as T;
    } catch (error) {
      console.error("Failed to retrieve compressed data:", error);
      return null;
    }
  }

  /**
   * Try to parse stored data as a StorageItem
   */
  private static parseStorageItem(stored: string): StorageItem | null {
    try {
      const parsed = JSON.parse(stored);

      // Check if it's a valid storage item with required fields
      if (parsed.data && parsed.version !== undefined) {
        return parsed as StorageItem;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Try to parse as legacy uncompressed data
   */
  private static tryParseLegacyData<T>(stored: string): T | null {
    try {
      return JSON.parse(stored) as T;
    } catch {
      return null;
    }
  }

  /**
   * Extract data string from storage item (decompress if needed)
   */
  private static extractDataString(storageItem: StorageItem, key: string): string | null {
    if (storageItem.compressed) {
      return CompressedStorageService.decompressData(storageItem.data, key);
    }

    if (typeof storageItem.data !== "string") {
      console.error("Invalid uncompressed data type for key:", key);
      return null;
    }

    return storageItem.data;
  }

  /**
   * Decompress compressed storage data
   */
  private static decompressData(data: unknown, key: string): string | null {
    if (typeof data !== "string") {
      console.error("Invalid compressed data type for key:", key);
      return null;
    }

    const decompressed = LZString.decompressFromUTF16(data);
    if (!decompressed) {
      console.error("Failed to decompress data for key:", key);
      return null;
    }

    return decompressed;
  }

  /**
   * Remove item from storage
   */
  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Clear all storage
   */
  static clear(): void {
    localStorage.clear();
  }

  /**
   * Get storage metrics and compression statistics
   */
  static getStorageMetrics(): StorageMetrics {
    const metrics: StorageMetrics = {
      totalItems: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      compressionRatio: 0,
      savedBytes: 0,
      savedPercentage: 0,
    };

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const stored = localStorage.getItem(key);
      if (!stored) continue;

      metrics.totalItems++;

      try {
        const storageItem: StorageItem = JSON.parse(stored);
        if (storageItem.size) {
          metrics.totalOriginalSize += storageItem.size.original;
          metrics.totalCompressedSize += storageItem.size.compressed;
        } else {
          // Legacy item without size info
          const size = CompressedStorageService.getStringByteSize(stored);
          metrics.totalOriginalSize += size;
          metrics.totalCompressedSize += size;
        }
      } catch {
        // Raw data item
        const size = CompressedStorageService.getStringByteSize(stored);
        metrics.totalOriginalSize += size;
        metrics.totalCompressedSize += size;
      }
    }

    if (metrics.totalOriginalSize > 0) {
      metrics.compressionRatio = metrics.totalCompressedSize / metrics.totalOriginalSize;
      metrics.savedBytes = metrics.totalOriginalSize - metrics.totalCompressedSize;
      metrics.savedPercentage = (metrics.savedBytes / metrics.totalOriginalSize) * 100;
    }

    return metrics;
  }

  /**
   * Get current storage usage
   */
  static getStorageUsage(): {
    used: number;
    available: number;
    percentage: number;
  } {
    let used = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          used += CompressedStorageService.getStringByteSize(key + value);
        }
      }
    }

    const available = CompressedStorageService.MAX_STORAGE_SIZE - used;
    const percentage = (used / CompressedStorageService.MAX_STORAGE_SIZE) * 100;

    return { used, available, percentage };
  }

  /**
   * Check if storing an item would exceed storage limits
   */
  private static wouldExceedStorageLimit(key: string, data: string): boolean {
    const currentUsage = CompressedStorageService.getStorageUsage();
    const itemSize = CompressedStorageService.getStringByteSize(key + data);

    // Account for existing item if we're updating
    const existingItem = localStorage.getItem(key);
    const existingSize = existingItem
      ? CompressedStorageService.getStringByteSize(key + existingItem)
      : 0;

    const netIncrease = itemSize - existingSize;

    return currentUsage.used + netIncrease > CompressedStorageService.MAX_STORAGE_SIZE;
  }

  /**
   * Perform storage cleanup by removing old items
   */
  private static performStorageCleanup(): void {
    console.log("🧹 Performing storage cleanup...");

    const items = CompressedStorageService.collectStorageItems();
    const sorted = items.toSorted((a, b) => a.timestamp - b.timestamp);

    const targetReduction = CompressedStorageService.MAX_STORAGE_SIZE * 0.25;
    const { removedCount, removedSize } = CompressedStorageService.removeOldestItems(
      sorted,
      targetReduction
    );

    console.log(`🧹 Cleanup complete: Removed ${removedCount} items, freed ${removedSize} bytes`);
  }

  /**
   * Collect all items from localStorage with metadata
   */
  private static collectStorageItems(): Array<{ key: string; timestamp: number; size: number }> {
    const items: Array<{ key: string; timestamp: number; size: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const stored = localStorage.getItem(key);
      if (!stored) continue;

      const metadata = CompressedStorageService.extractItemMetadata(stored);
      items.push({ key, ...metadata });
    }

    return items;
  }

  /**
   * Extract timestamp and size metadata from stored item
   */
  private static extractItemMetadata(stored: string): { timestamp: number; size: number } {
    const size = CompressedStorageService.getStringByteSize(stored);

    try {
      const storageItem: StorageItem = JSON.parse(stored);

      return {
        timestamp: storageItem.timestamp || Date.now(),
        size: storageItem.size?.compressed || size,
      };
    } catch {
      // Legacy item - use current time as fallback
      return { timestamp: Date.now(), size };
    }
  }

  /**
   * Remove oldest items until target reduction is reached
   */
  private static removeOldestItems(
    items: Array<{ key: string; timestamp: number; size: number }>,
    targetReduction: number
  ): { removedCount: number; removedSize: number } {
    let removedSize = 0;
    let removedCount = 0;

    for (const item of items) {
      if (removedSize >= targetReduction) break;

      if (CompressedStorageService.isCriticalItem(item.key)) {
        continue;
      }

      localStorage.removeItem(item.key);
      removedSize += item.size;
      removedCount++;
    }

    return { removedCount, removedSize };
  }

  /**
   * Check if item is critical and should not be removed during cleanup
   */
  private static isCriticalItem(key: string): boolean {
    return key.includes("session") || key.includes("rules");
  }

  /**
   * Get byte size of a string
   */
  private static getStringByteSize(str: string): number {
    return new Blob([str]).size;
  }

  /**
   * Migrate legacy uncompressed data to compressed format
   */
  static migrateLegacyData(): {
    migrated: string[];
    skipped: string[];
    errors: string[];
  } {
    console.log("🔄 Starting legacy data migration...");

    const classification = CompressedStorageService.findKeysToMigrate();
    const migrated = CompressedStorageService.performMigration(classification.keysToMigrate);

    const result = {
      migrated,
      skipped: classification.skipped,
      errors: [...classification.errors, ...classification.migrationErrors],
    };

    console.log(
      `🔄 Migration complete: ${result.migrated.length} migrated, ${result.skipped.length} skipped, ${result.errors.length} errors`
    );

    return result;
  }

  /**
   * Find all keys that need migration
   */
  private static findKeysToMigrate(): {
    keysToMigrate: string[];
    skipped: string[];
    errors: string[];
    migrationErrors: string[];
  } {
    const keysToMigrate: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const stored = localStorage.getItem(key);
      if (!stored) continue;

      const classification = CompressedStorageService.classifyStorageKey(key, stored);

      if (classification === "migrate") {
        keysToMigrate.push(key);
      } else if (classification === "skip") {
        skipped.push(key);
      } else {
        errors.push(key);
      }
    }

    return { keysToMigrate, skipped, errors, migrationErrors: [] };
  }

  /**
   * Classify a storage key for migration
   */
  private static classifyStorageKey(_key: string, stored: string): "migrate" | "skip" | "error" {
    try {
      const parsed = JSON.parse(stored);

      // Check if it's already a compressed storage item
      if (parsed.version !== undefined && parsed.compressed !== undefined) {
        return "skip";
      }

      // It's legacy data that needs migration
      return "migrate";
    } catch {
      // Invalid JSON - error
      return "error";
    }
  }

  /**
   * Perform migration for all identified keys
   */
  private static performMigration(keysToMigrate: string[]): string[] {
    const migrated: string[] = [];

    for (const key of keysToMigrate) {
      if (CompressedStorageService.migrateKey(key)) {
        migrated.push(key);
      }
    }

    return migrated;
  }

  /**
   * Migrate a single storage key
   */
  private static migrateKey(key: string): boolean {
    try {
      const data = CompressedStorageService.getItem(key);

      if (data === null) {
        return false;
      }

      return CompressedStorageService.setItem(key, data);
    } catch (error) {
      console.error(`Failed to migrate key ${key}:`, error);
      return false;
    }
  }
}

export default CompressedStorageService;
