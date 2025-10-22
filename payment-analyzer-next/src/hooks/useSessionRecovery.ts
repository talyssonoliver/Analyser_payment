/**
 * useSessionRecovery Hook
 *
 * Manages session recovery functionality extracted from Step1Container.
 * Provides session data restoration, banner display, and recovery state management.
 *
 * Extracted from:
 * - Step1Container lines 44-45: Recovery state
 * - Step1Container lines 51-93: Session recovery initialization and handlers
 *
 * @example
 * ```tsx
 * const { recoveryData, showBanner, handleRestore, handleDismiss } = useSessionRecovery({
 *   onRestore: (session) => {
 *     // Handle restored session data
 *   }
 * });
 * ```
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { InputMethod } from "@/hooks/use-analysis-steps";
import {
  type RecoveryBanner as RecoveryBannerType,
  type SessionData,
  SessionRecoveryService,
} from "@/lib/services/session-recovery-service";
import { toast } from "@/lib/utils/toast";
import type { ManualEntry } from "@/types/core";

/**
 * Configuration for the useSessionRecovery hook
 */
export interface UseSessionRecoveryConfig {
  /**
   * Callback invoked when session is successfully restored
   */
  onRestore?: (session: SessionData) => void;

  /**
   * Callback to update input method when session is restored
   */
  onInputMethodChange?: (method: InputMethod) => void;

  /**
   * Callback to update manual entries when session is restored
   */
  onManualEntriesChange?: (entries: ManualEntry[]) => void;

  /**
   * Whether to automatically check for recovery on mount
   * @default true
   */
  autoCheck?: boolean;
}

/**
 * Return type for useSessionRecovery hook
 */
export interface UseSessionRecoveryReturn {
  /**
   * Recovery banner data containing message and metadata
   */
  recoveryData: RecoveryBannerType | null;

  /**
   * Whether to show the recovery banner
   */
  showBanner: boolean;

  /**
   * Restore the session and trigger callbacks
   */
  handleRestore: () => void;

  /**
   * Dismiss the recovery banner and clear session
   */
  handleDismiss: () => void;

  /**
   * Raw session data if available
   */
  sessionData: SessionData | null;

  /**
   * Whether a valid session exists
   */
  hasSession: boolean;
}

/**
 * Hook for managing session recovery functionality
 *
 * Extracted from Step1Container to provide reusable session recovery logic.
 * Handles:
 * - Session recovery detection
 * - Recovery banner display
 * - Session restoration with callbacks
 * - Session dismissal and cleanup
 *
 * @param config - Configuration options for session recovery
 * @returns Session recovery state and control functions
 */
export function useSessionRecovery(
  config: UseSessionRecoveryConfig = {}
): UseSessionRecoveryReturn {
  const { onRestore, onInputMethodChange, onManualEntriesChange, autoCheck = true } = config;

  // Session recovery state (extracted from Step1Container lines 44-45)
  const [recoveryData, setRecoveryData] = useState<RecoveryBannerType | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  /**
   * Initialize session recovery on mount
   * Extracted from Step1Container lines 51-65
   * Modified to skip banner if user is returning from deliberate navigation
   */
  useEffect(() => {
    if (!autoCheck) return;

    const initializeSessionRecovery = () => {
      try {
        console.log("🔍 Checking for session recovery...");

        // Check if this is a deliberate return (e.g., from reports page)
        const returnIntent = SessionRecoveryService.checkNavigationReturn();

        if (returnIntent?.shouldRestore) {
          // User is returning from deliberate navigation, don't show banner
          // The analysis page will handle restoration directly
          console.log("ℹ️ Skipping recovery banner - deliberate return detected");
          return;
        }

        // Check if recovery is needed (only for fresh navigation after timeout)
        const recovery = SessionRecoveryService.checkForRecovery();

        if (recovery) {
          console.log("✅ Session recovery available:", recovery);
          setRecoveryData(recovery);
          setShowBanner(true);

          // Load full session data
          const session = SessionRecoveryService.loadSession();
          setSessionData(session);
        } else {
          console.log("ℹ️ No session recovery needed");
        }
      } catch (error) {
        console.error("❌ Session recovery initialization failed:", error);
      }
    };

    initializeSessionRecovery();
  }, [autoCheck]);

  /**
   * Handle session restoration
   * Extracted from Step1Container lines 68-88
   */
  const handleRestore = useCallback(() => {
    if (!recoveryData) {
      console.warn("⚠️ No recovery data available");
      return;
    }

    try {
      console.log("🔄 Restoring session...");

      // Restore session from storage
      const restoredSession = SessionRecoveryService.restoreSession();

      if (!restoredSession) {
        throw new Error("Failed to restore session data");
      }

      // Update session data state
      setSessionData(restoredSession);

      // Restore input method
      if (restoredSession.inputMethod) {
        console.log("📝 Restoring input method:", restoredSession.inputMethod);
        onInputMethodChange?.(restoredSession.inputMethod);
      }

      // Restore manual entries
      if (restoredSession.manualEntries && restoredSession.manualEntries.length > 0) {
        console.log("📋 Restoring manual entries:", restoredSession.manualEntries.length);
        onManualEntriesChange?.(restoredSession.manualEntries);
      }

      // Trigger restore callback
      onRestore?.(restoredSession);

      // Show success message
      toast.success("Session restored successfully");

      // Hide banner
      setShowBanner(false);

      console.log("✅ Session restored successfully");
    } catch (error) {
      console.error("❌ Session restore failed:", error);
      toast.error("Failed to restore session");
    }
  }, [recoveryData, onRestore, onInputMethodChange, onManualEntriesChange]);

  /**
   * Handle session dismissal
   * Extracted from Step1Container lines 90-93
   */
  const handleDismiss = useCallback(() => {
    console.log("🗑️ Dismissing session recovery...");

    // Clear session from storage
    SessionRecoveryService.clearSession();

    // Hide banner and clear data
    setShowBanner(false);
    setRecoveryData(null);
    setSessionData(null);

    console.log("✅ Session dismissed");
  }, []);

  // Derived state
  const hasSession = sessionData !== null;

  return {
    recoveryData,
    showBanner,
    handleRestore,
    handleDismiss,
    sessionData,
    hasSession,
  };
}

/**
 * Helper function to manually trigger session recovery check
 * Useful for refreshing recovery state after external session changes
 */
export function checkForSessionRecovery(): RecoveryBannerType | null {
  return SessionRecoveryService.checkForRecovery();
}

/**
 * Helper function to save session data
 * Useful for saving session from outside the hook
 */
export function saveSessionData(sessionData: Partial<SessionData>): void {
  SessionRecoveryService.saveSession(sessionData);
}

/**
 * Helper function to clear session data
 * Useful for clearing session from outside the hook
 */
export function clearSessionData(): void {
  SessionRecoveryService.clearSession();
}
