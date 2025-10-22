/**
 * Sync Status Banner Component
 * Shows warning when analyses exist in localStorage but not in database
 * Provides manual sync button
 */

"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/providers/auth-provider";
import { DatabaseSyncService } from "@/lib/services/database-sync-service";
import { toast } from "@/lib/utils/toast";

interface SyncStatusBannerProps {
  onSyncComplete?: () => void;
}

export function SyncStatusBanner({ onSyncComplete }: Readonly<SyncStatusBannerProps>) {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    analysisId: string;
  } | null>(null);

  // Check for pending syncs on mount
  useEffect(() => {
    const checkPending = () => {
      const count = DatabaseSyncService.getPendingSaveCount();
      setPendingCount(count);

      if (count > 0) {
        console.log(`⚠️ Sync Status Banner: ${count} unsynced analyses detected`);
      }
    };

    checkPending();

    // Check periodically (every 30 seconds)
    const interval = setInterval(checkPending, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to sync data");
      return;
    }

    setSyncing(true);
    setSyncProgress(null);

    try {
      // Note: We can't fully implement sync here without the saveFunction
      // This would need to be passed as a prop or imported from the appropriate service
      toast.info("Syncing pending data...");

      // For now, just check the status
      const status = DatabaseSyncService.getSyncStatus();
      console.log("Sync status:", status);

      // TODO: Implement actual sync with proper saveFunction
      // const results = await DatabaseSyncService.syncAllPendingData(
      //   user.id,
      //   saveFunction,
      //   (current, total, analysisId) => {
      //     setSyncProgress({ current, total, analysisId });
      //   }
      // );

      // Simulate sync for now
      toast.warning(
        "Automatic sync is not yet fully implemented. Please re-upload your files to save to database."
      );

      // Refresh pending count
      const newCount = DatabaseSyncService.getPendingSaveCount();
      setPendingCount(newCount);

      if (newCount === 0 && onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error("Failed to sync data. Please try again.");
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  // Don't show banner if no pending syncs
  if (pendingCount === 0) {
    return null;
  }

  return (
    <div
      className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r-lg shadow-sm"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-600" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-yellow-800">
                {pendingCount} {pendingCount === 1 ? "analysis" : "analyses"} not synced to database
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your data is saved locally but won&apos;t be available on other devices. Data may be
                lost if browser cache is cleared.
              </p>
              {syncProgress && (
                <p className="text-xs text-yellow-600 mt-2">
                  Syncing {syncProgress.current} of {syncProgress.total}...
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-900 bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                aria-label={syncing ? "Syncing data..." : "Sync data to database"}
              >
                <RefreshCw
                  className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Help text */}
      <div className="mt-3 text-xs text-yellow-600 border-t border-yellow-200 pt-3">
        <strong>Why is this happening?</strong> Previous versions saved data locally first. To
        ensure your data is backed up, please re-upload your files or sync now.
      </div>
    </div>
  );
}
