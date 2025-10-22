/**
 * useNavigationBadges Hook
 * Computes badge counts for bottom navigation items
 *
 * Badge Logic:
 * - Analysis: Count of drafts/in-progress analyses
 * - Reports: Count of unviewed/recent analyses (last 7 days)
 * - History: Count of recent completed analyses (last 30 days)
 * - Settings: Count of unsaved preferences or pending notifications
 * - Dashboard: No badge (always 0)
 */

import { useCallback, useEffect, useState } from "react";
import {
  type AnalysisWithDetails,
  analysisRepository,
} from "@/lib/repositories/analysis-repository";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import type { StringKeyObject } from "@/types/core";

export interface NavigationBadges {
  dashboard: number;
  analysis: number;
  reports: number;
  history: number;
  settings: number;
  [key: string]: number; // Index signature for dynamic access
}

export interface UseNavigationBadgesOptions {
  userId?: string;
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface PreferencesData {
  lastSaved?: number;
  hasUnsavedChanges?: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function useNavigationBadges(options: UseNavigationBadgesOptions = {}) {
  const { userId, enabled = true, refreshInterval = 30000 } = options;

  const [badges, setBadges] = useState<NavigationBadges>({
    dashboard: 0,
    analysis: 0,
    reports: 0,
    history: 0,
    settings: 0,
  });

  const [loading, setLoading] = useState(false);

  /**
   * Count draft/in-progress analyses from localStorage
   */
  const countDrafts = useCallback((): number => {
    try {
      const analyses = AnalysisStorageService.loadAnalyses();
      const drafts = Object.values(analyses).filter((analysis: StringKeyObject) => {
        const status = analysis.status as string;
        return status === "pending" || status === "draft" || status === "in_progress";
      });
      return drafts.length;
    } catch (error) {
      console.error("Error counting drafts:", error);
      return 0;
    }
  }, []);

  /**
   * Count unviewed reports (analyses created in last 7 days)
   */
  const countUnviewedReports = useCallback(async (): Promise<number> => {
    if (!userId) return 0;

    try {
      const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

      const result = await analysisRepository.getUserAnalyses(userId, {
        limit: 100,
        status: "completed",
        orderBy: "created_at",
        order: "desc",
      });

      if (result.isFailure) {
        console.error("Error fetching recent analyses:", result.error);
        return 0;
      }

      // Count analyses created in last 7 days that haven't been viewed
      const recentUnviewed = result.data.data.filter((analysis: AnalysisWithDetails) => {
        const createdAt = analysis.created_at;
        if (!createdAt) return false;

        const isRecent = new Date(createdAt).getTime() > new Date(sevenDaysAgo).getTime();
        const isUnviewed =
          analysis.metadata && "viewed" in analysis.metadata
            ? !(analysis.metadata as { viewed?: boolean }).viewed
            : true;

        return isRecent && isUnviewed;
      });

      return recentUnviewed.length;
    } catch (error) {
      console.error("Error counting unviewed reports:", error);
      return 0;
    }
  }, [userId]);

  /**
   * Count recent history items (last 30 days)
   */
  const countRecentHistory = useCallback(async (): Promise<number> => {
    if (!userId) return 0;

    try {
      const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

      const result = await analysisRepository.getUserAnalyses(userId, {
        limit: 100,
        status: "completed",
        orderBy: "created_at",
        order: "desc",
      });

      if (result.isFailure) {
        console.error("Error fetching history:", result.error);
        return 0;
      }

      // Count analyses completed in last 30 days
      const recentHistory = result.data.data.filter((analysis: AnalysisWithDetails) => {
        const createdAt = analysis.created_at;
        if (!createdAt) return false;

        return new Date(createdAt).getTime() > new Date(thirtyDaysAgo).getTime();
      });

      return recentHistory.length;
    } catch (error) {
      console.error("Error counting recent history:", error);
      return 0;
    }
  }, [userId]);

  /**
   * Count unsaved settings/preferences
   */
  const countUnsavedSettings = useCallback((): number => {
    try {
      const preferences = AnalysisStorageService.loadPreferences() as PreferencesData | null;

      if (!preferences) return 0;

      // Check if there are unsaved changes
      if (preferences.hasUnsavedChanges) {
        return 1;
      }

      // Check if preferences were modified recently (within 5 minutes) but not saved
      const lastSaved = preferences.lastSaved;
      if (lastSaved) {
        const timeSinceLastSave = Date.now() - lastSaved;
        const FIVE_MINUTES_MS = 5 * 60 * 1000;

        if (timeSinceLastSave > FIVE_MINUTES_MS) {
          return 1;
        }
      }

      return 0;
    } catch (error) {
      console.error("Error counting unsaved settings:", error);
      return 0;
    }
  }, []);

  /**
   * Compute all badge counts
   */
  const computeBadges = useCallback(async (): Promise<NavigationBadges> => {
    const draftsCount = countDrafts();
    const unviewedReportsCount = await countUnviewedReports();
    const recentHistoryCount = await countRecentHistory();
    const unsavedSettingsCount = countUnsavedSettings();

    return {
      dashboard: 0, // Dashboard never shows a badge
      analysis: draftsCount,
      reports: unviewedReportsCount,
      history: recentHistoryCount,
      settings: unsavedSettingsCount,
    };
  }, [countDrafts, countUnviewedReports, countRecentHistory, countUnsavedSettings]);

  /**
   * Refresh badge counts
   */
  const refreshBadges = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    try {
      const newBadges = await computeBadges();
      setBadges(newBadges);
    } catch (error) {
      console.error("Error refreshing badges:", error);
    } finally {
      setLoading(false);
    }
  }, [enabled, computeBadges]);

  // Initial load and periodic refresh
  useEffect(() => {
    if (!enabled) return;

    // Initial load
    refreshBadges();

    // Set up refresh interval
    const intervalId = setInterval(refreshBadges, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, refreshInterval, refreshBadges]);

  // Listen for storage changes (for cross-tab synchronization)
  useEffect(() => {
    if (!enabled) return;

    const handleStorageChange = (event: StorageEvent) => {
      // Refresh badges when localStorage changes
      if (event.key?.startsWith("pa:") || event.key === "uploadedFiles_v9") {
        refreshBadges();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [enabled, refreshBadges]);

  return {
    badges,
    loading,
    refreshBadges,
  };
}
