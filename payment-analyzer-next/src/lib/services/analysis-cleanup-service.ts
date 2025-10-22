/**
 * Analysis Cleanup Service
 * Handles automatic cleanup of stale analysis data
 */

import { AnalysisStorageService } from "./analysis-storage-service";

export class AnalysisCleanupService {
  private static hasRunCleanup = false;
  private static readonly DEFAULT_MAX_AGE_HOURS = 48; // Keep analyses for 2 days

  /**
   * Run cleanup on app initialization (once per session)
   */
  static initializeCleanup(
    maxAgeHours: number = AnalysisCleanupService.DEFAULT_MAX_AGE_HOURS
  ): void {
    if (AnalysisCleanupService.hasRunCleanup) {
      return;
    }

    if (typeof window === "undefined") {
      return; // Don't run on server
    }

    console.log("🧹 Running automatic analysis cleanup...");

    try {
      const prunedCount = AnalysisStorageService.pruneByAge(maxAgeHours);

      if (prunedCount > 0) {
        console.log(`🧹 Cleaned up ${prunedCount} old analysis(es)`);
      } else {
        console.log("🧹 No old analyses to clean up");
      }

      AnalysisCleanupService.hasRunCleanup = true;
    } catch (error) {
      console.error("🧹 Cleanup failed:", error);
    }
  }

  /**
   * Clear all analyses except the most recent one
   */
  static clearAllExceptRecent(): void {
    try {
      const analyses = AnalysisStorageService.loadAnalyses();
      const analysisIds = Object.keys(analyses);

      if (analysisIds.length === 0) {
        console.log("🧹 No analyses to clear");
        return;
      }

      // Keep only the most recent
      const mostRecentId = analysisIds[0];
      AnalysisStorageService.clearOldAnalyses(mostRecentId);
    } catch (error) {
      console.error("🧹 Failed to clear old analyses:", error);
    }
  }

  /**
   * Get cleanup statistics
   */
  static getCleanupStats(): {
    totalAnalyses: number;
    oldAnalyses: number;
    storageUsed: string;
  } {
    const analyses = AnalysisStorageService.loadAnalyses();
    const analysisIds = Object.keys(analyses);
    const now = Date.now();
    const maxAge = AnalysisCleanupService.DEFAULT_MAX_AGE_HOURS * 60 * 60 * 1000;

    let oldCount = 0;

    for (const data of Object.values(analyses)) {
      const analysisData = data as { createdAt?: string };
      if (analysisData.createdAt) {
        const age = now - new Date(analysisData.createdAt).getTime();
        if (age > maxAge) {
          oldCount++;
        }
      }
    }

    const stats = AnalysisStorageService.getStorageStats();

    return {
      totalAnalyses: analysisIds.length,
      oldAnalyses: oldCount,
      storageUsed: stats.usage.used,
    };
  }

  /**
   * Manual cleanup trigger (for settings page or debug)
   */
  static async performManualCleanup(): Promise<{
    prunedCount: number;
    freedSpace: string;
  }> {
    const statsBefore = AnalysisCleanupService.getCleanupStats();

    const prunedCount = AnalysisStorageService.pruneByAge(
      AnalysisCleanupService.DEFAULT_MAX_AGE_HOURS
    );

    const statsAfter = AnalysisCleanupService.getCleanupStats();

    return {
      prunedCount,
      freedSpace: `${statsBefore.storageUsed} → ${statsAfter.storageUsed}`,
    };
  }

  /**
   * Reset cleanup flag (for testing)
   */
  static resetCleanupFlag(): void {
    AnalysisCleanupService.hasRunCleanup = false;
  }
}
