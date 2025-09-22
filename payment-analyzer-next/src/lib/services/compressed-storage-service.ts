/**
 * Compressed Storage Service
 * Handles localStorage with LZString compression for efficiency
 * Matches original HTML system's compression behavior
 */

import * as LZString from 'lz-string';

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

export class CompressedStorageService {
  private static readonly VERSION = '9.0.0';
  private static readonly COMPRESSION_THRESHOLD = 1024; // 1KB - compress items larger than this
  private static readonly MAX_STORAGE_SIZE = 8 * 1024 * 1024; // 8MB localStorage limit approximation
  
  /**
   * Store data with automatic compression
   */
  static setItem(key: string, data: unknown): boolean {
    try {
      const serialized = JSON.stringify(data);
      const originalSize = this.getStringByteSize(serialized);
      
      let finalData: string;
      let compressed = false;
      let compressedSize = originalSize;
      
      // Compress if data is larger than threshold
      if (originalSize > this.COMPRESSION_THRESHOLD) {
        const compressedData = LZString.compressToUTF16(serialized);
        compressedSize = this.getStringByteSize(compressedData);
        
        // Only use compression if it actually saves space
        if (compressedSize < originalSize * 0.9) {
          finalData = compressedData;
          compressed = true;
        } else {
          finalData = serialized;
        }
      } else {
        finalData = serialized;
      }
      
      // Create storage item with metadata
      const storageItem: StorageItem = {
        data: finalData,
        compressed,
        version: this.VERSION,
        timestamp: Date.now(),
        size: {
          original: originalSize,
          compressed: compressedSize,
          ratio: originalSize > 0 ? compressedSize / originalSize : 1
        }
      };
      
      // Store the item
      const itemString = JSON.stringify(storageItem);
      
      // Check if storage would exceed limits
      if (this.wouldExceedStorageLimit(key, itemString)) {
        console.warn('Storage limit would be exceeded, attempting cleanup...');
        this.performStorageCleanup();
        
        // Try again after cleanup
        if (this.wouldExceedStorageLimit(key, itemString)) {
          console.error('Storage limit exceeded even after cleanup');
          return false;
        }
      }
      
      localStorage.setItem(key, itemString);
      
      // Log compression statistics
      if (compressed) {
        const savedBytes = originalSize - compressedSize;
        const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(1);
        console.log(`📦 Compressed storage: ${key} - Saved ${savedBytes} bytes (${savedPercentage}%)`);
      }
      
      return true;
      
    } catch (error) {
      console.error('Failed to store compressed data:', error);
      return false;
    }
  }
  
  /**
   * Retrieve and decompress data
   */
  static getItem<T = unknown>(key: string): T | null {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      // Try to parse as storage item first
      let storageItem: StorageItem;
      try {
        storageItem = JSON.parse(stored);
      } catch {
        // Fallback for legacy uncompressed data
        try {
          return JSON.parse(stored) as T;
        } catch {
          return null;
        }
      }
      
      // Check if it's a valid storage item
      if (!storageItem.data || storageItem.version === undefined) {
        // Try to parse as raw data
        try {
          return JSON.parse(stored) as T;
        } catch {
          return null;
        }
      }
      
      // Decompress if needed
      let dataString: string;
      if (storageItem.compressed) {
        if (typeof storageItem.data !== 'string') {
          console.error('Invalid compressed data type for key:', key);
          return null;
        }
        dataString = LZString.decompressFromUTF16(storageItem.data);
        if (!dataString) {
          console.error('Failed to decompress data for key:', key);
          return null;
        }
      } else {
        if (typeof storageItem.data !== 'string') {
          console.error('Invalid uncompressed data type for key:', key);
          return null;
        }
        dataString = storageItem.data;
      }
      
      // Parse the final data
      return JSON.parse(dataString) as T;
      
    } catch (error) {
      console.error('Failed to retrieve compressed data:', error);
      return null;
    }
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
      savedPercentage: 0
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
          const size = this.getStringByteSize(stored);
          metrics.totalOriginalSize += size;
          metrics.totalCompressedSize += size;
        }
      } catch {
        // Raw data item
        const size = this.getStringByteSize(stored);
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
          used += this.getStringByteSize(key + value);
        }
      }
    }
    
    const available = this.MAX_STORAGE_SIZE - used;
    const percentage = (used / this.MAX_STORAGE_SIZE) * 100;
    
    return { used, available, percentage };
  }
  
  /**
   * Check if storing an item would exceed storage limits
   */
  private static wouldExceedStorageLimit(key: string, data: string): boolean {
    const currentUsage = this.getStorageUsage();
    const itemSize = this.getStringByteSize(key + data);
    
    // Account for existing item if we're updating
    const existingItem = localStorage.getItem(key);
    const existingSize = existingItem ? this.getStringByteSize(key + existingItem) : 0;
    
    const netIncrease = itemSize - existingSize;
    
    return (currentUsage.used + netIncrease) > this.MAX_STORAGE_SIZE;
  }
  
  /**
   * Perform storage cleanup by removing old items
   */
  private static performStorageCleanup(): void {
    console.log('🧹 Performing storage cleanup...');
    
    const items: Array<{ key: string; timestamp: number; size: number }> = [];
    
    // Collect all items with timestamps
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      const stored = localStorage.getItem(key);
      if (!stored) continue;
      
      let timestamp = 0;
      let size = this.getStringByteSize(stored);
      
      try {
        const storageItem: StorageItem = JSON.parse(stored);
        if (storageItem.timestamp) {
          timestamp = storageItem.timestamp;
        }
        if (storageItem.size) {
          size = storageItem.size.compressed;
        }
      } catch {
        // Legacy item - use current time as fallback
        timestamp = Date.now();
      }
      
      items.push({ key, timestamp, size });
    }
    
    // Sort by timestamp (oldest first)
    items.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest items until we free up 25% of storage
    const targetReduction = this.MAX_STORAGE_SIZE * 0.25;
    let removedSize = 0;
    let removedCount = 0;
    
    for (const item of items) {
      if (removedSize >= targetReduction) break;
      
      // Don't remove critical items (session recovery, rules)
      if (item.key.includes('session') || item.key.includes('rules')) {
        continue;
      }
      
      localStorage.removeItem(item.key);
      removedSize += item.size;
      removedCount++;
    }
    
    console.log(`🧹 Cleanup complete: Removed ${removedCount} items, freed ${removedSize} bytes`);
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
    const result = {
      migrated: [] as string[],
      skipped: [] as string[],
      errors: [] as string[]
    };
    
    console.log('🔄 Starting legacy data migration...');
    
    const keysToMigrate: string[] = [];
    
    // Find keys that need migration
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      const stored = localStorage.getItem(key);
      if (!stored) continue;
      
      try {
        const parsed = JSON.parse(stored);
        
        // Check if it's already a compressed storage item
        if (parsed.version !== undefined && parsed.compressed !== undefined) {
          result.skipped.push(key);
          continue;
        }
        
        // It's legacy data that needs migration
        keysToMigrate.push(key);
        
      } catch {
        // Invalid JSON - skip
        result.errors.push(key);
      }
    }
    
    // Migrate each key
    for (const key of keysToMigrate) {
      try {
        const data = this.getItem(key);
        if (data !== null) {
          const success = this.setItem(key, data);
          if (success) {
            result.migrated.push(key);
          } else {
            result.errors.push(key);
          }
        } else {
          result.errors.push(key);
        }
      } catch (error) {
        console.error(`Failed to migrate key ${key}:`, error);
        result.errors.push(key);
      }
    }
    
    console.log(`🔄 Migration complete: ${result.migrated.length} migrated, ${result.skipped.length} skipped, ${result.errors.length} errors`);
    
    return result;
  }
}

export default CompressedStorageService;