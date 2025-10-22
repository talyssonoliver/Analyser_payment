/**
 * Database Sync Service
 * Handles database saves with retry logic, sync status checking, and localStorage migration
 */

import { AnalysisStorageService } from "./analysis-storage-service";
import { CompressedStorageService } from "./compressed-storage-service";

interface SaveProgress {
  attempt: number;
  maxAttempts: number;
  message: string;
}

interface SyncResults {
  synced: number;
  failed: number;
  errors: Array<{ analysisId: string; message: string }>;
}

export class DatabaseSyncService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 3000, 10000]; // 1s, 3s, 10s

  /**
   * Save analysis with automatic retry and exponential backoff
   */
  static async saveWithRetry<T>(
    saveFunction: () => Promise<T>,
    onProgress?: (progress: SaveProgress) => void
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        onProgress?.({
          attempt: attempt + 1,
          maxAttempts: this.MAX_RETRIES,
          message:
            attempt === 0
              ? "Saving to database..."
              : `Retrying save (attempt ${attempt + 1}/${this.MAX_RETRIES})...`,
        });

        const result = await saveFunction();

        console.log(`✅ Save successful on attempt ${attempt + 1}`);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `⚠️ Save attempt ${attempt + 1}/${this.MAX_RETRIES} failed:`,
          error instanceof Error ? error.message : error
        );

        // If this wasn't the last attempt, wait and retry
        if (attempt < this.MAX_RETRIES - 1) {
          const delay = this.RETRY_DELAYS[attempt];
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const errorMessage = `Failed to save after ${this.MAX_RETRIES} attempts: ${lastError?.message || "Unknown error"}`;
    console.error(`❌ ${errorMessage}`);
    throw new Error(errorMessage);
  }

  /**
   * Check if there are pending saves in localStorage
   * Returns analysis IDs that don't have a dbAnalysisId in metadata
   */
  static getPendingSaves(): string[] {
    try {
      const analyses = AnalysisStorageService.loadAnalyses();
      const pending: string[] = [];

      for (const [id, analysis] of Object.entries(analyses)) {
        const typedAnalysis = analysis as {
          metadata?: { dbAnalysisId?: string };
        };

        // If no dbAnalysisId, it's pending
        if (!typedAnalysis.metadata?.dbAnalysisId) {
          pending.push(id);
          console.log(`📋 Found pending save: ${id}`);
        }
      }

      if (pending.length > 0) {
        console.warn(`⚠️ ${pending.length} analyses pending sync to database`);
      }

      return pending;
    } catch (error) {
      console.error("Failed to check for pending saves:", error);
      return [];
    }
  }

  /**
   * Get count of pending saves (convenience method)
   */
  static getPendingSaveCount(): number {
    return this.getPendingSaves().length;
  }

  /**
   * Check if a specific analysis is synced to database
   */
  static isSynced(analysisId: string): boolean {
    try {
      const analysis = AnalysisStorageService.loadAnalysis(analysisId);
      if (!analysis) return false;

      const typedAnalysis = analysis as {
        metadata?: { dbAnalysisId?: string };
      };

      return !!typedAnalysis.metadata?.dbAnalysisId;
    } catch (error) {
      console.error(`Failed to check sync status for ${analysisId}:`, error);
      return false;
    }
  }

  /**
   * Sync a single pending analysis to database
   */
  static async syncSingleAnalysis(
    analysisId: string,
    userId: string,
    saveFunction: (analysis: unknown, userId: string) => Promise<string>
  ): Promise<{ success: boolean; dbAnalysisId?: string; error?: string }> {
    try {
      console.log(`💾 Syncing analysis ${analysisId} to database...`);

      // Load from localStorage
      const analysis = AnalysisStorageService.loadAnalysis(analysisId);
      if (!analysis) {
        return {
          success: false,
          error: `Analysis ${analysisId} not found in localStorage`,
        };
      }

      // Save to database with retry
      const dbAnalysisId = await this.saveWithRetry(() => saveFunction(analysis, userId));

      // Update localStorage with DB ID
      const updatedAnalysis = {
        ...analysis,
        metadata: {
          ...(analysis as { metadata?: Record<string, unknown> }).metadata,
          dbAnalysisId,
        },
      };

      AnalysisStorageService.saveAnalysis(dbAnalysisId, updatedAnalysis);
      console.log(`✅ Synced ${analysisId} → ${dbAnalysisId}`);

      // Remove old entry if ID changed
      if (analysisId !== dbAnalysisId) {
        try {
          const analyses = AnalysisStorageService.loadAnalyses();
          if (analyses[analysisId]) {
            delete analyses[analysisId];
            CompressedStorageService.setItem(AnalysisStorageService.KEYS.ANALYSES, analyses);
            console.log(`🗑️ Removed old localStorage entry: ${analysisId}`);
          }
        } catch (cleanupError) {
          console.warn(`⚠️ Could not remove old entry ${analysisId}:`, cleanupError);
        }
      }

      return {
        success: true,
        dbAnalysisId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Failed to sync ${analysisId}:`, errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync all pending localStorage data to database
   */
  static async syncAllPendingData(
    userId: string,
    saveFunction: (analysis: unknown, userId: string) => Promise<string>,
    onProgress?: (current: number, total: number, analysisId: string) => void
  ): Promise<SyncResults> {
    const pending = this.getPendingSaves();
    const results: SyncResults = {
      synced: 0,
      failed: 0,
      errors: [],
    };

    console.log(`🔄 Starting sync of ${pending.length} pending analyses...`);

    for (let i = 0; i < pending.length; i++) {
      const analysisId = pending[i];
      onProgress?.(i + 1, pending.length, analysisId);

      const result = await this.syncSingleAnalysis(analysisId, userId, saveFunction);

      if (result.success) {
        results.synced++;
      } else {
        results.failed++;
        results.errors.push({
          analysisId,
          message: result.error || "Unknown error",
        });
      }
    }

    console.log(`📊 Sync complete: ${results.synced} synced, ${results.failed} failed`);

    return results;
  }

  /**
   * Clear all localStorage data (use with caution!)
   */
  static clearLocalStorage(): void {
    if (
      typeof window === "undefined" ||
      !confirm(
        "This will clear ALL local data. Make sure everything is synced to database. Continue?"
      )
    ) {
      return;
    }

    try {
      const analyses = AnalysisStorageService.loadAnalyses();
      const count = Object.keys(analyses).length;

      CompressedStorageService.setItem(AnalysisStorageService.KEYS.ANALYSES, {});
      console.log(`🗑️ Cleared ${count} analyses from localStorage`);
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
      throw error;
    }
  }

  /**
   * Get sync status summary
   */
  static getSyncStatus(): {
    total: number;
    synced: number;
    pending: number;
    pendingIds: string[];
  } {
    try {
      const analyses = AnalysisStorageService.loadAnalyses();
      const total = Object.keys(analyses).length;
      const pending = this.getPendingSaves();
      const synced = total - pending.length;

      return {
        total,
        synced,
        pending: pending.length,
        pendingIds: pending,
      };
    } catch (error) {
      console.error("Failed to get sync status:", error);
      return {
        total: 0,
        synced: 0,
        pending: 0,
        pendingIds: [],
      };
    }
  }
}
