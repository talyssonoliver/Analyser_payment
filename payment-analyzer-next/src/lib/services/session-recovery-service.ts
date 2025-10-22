/**
 * Session Recovery Service
 * Matches the original HTML session management functionality
 */

import type { ManualEntry, StringKeyObject } from "@/types/core";

export interface SessionData {
  id: string;
  timestamp: number;
  currentStep: number;
  inputMethod: "upload" | "manual";
  uploadedFiles: Array<{
    name: string;
    size: number;
    type: string;
    lastModified: number;
  }>;
  manualEntries: ManualEntry[];
  lastAnalysisData?: StringKeyObject;
  hasBeenAnalyzed: boolean;
  rulesVersion: string;
  sessionStarted: number;
  navigationIntent?: "viewing-report" | null; // Track deliberate navigation
  dbAnalysisId?: string; // Database analysis ID for file restoration
}

export interface RecoveryBanner {
  show: boolean;
  message: string;
  minutesAgo: number;
  hasRuleChanges: boolean;
  sessionId: string;
}

export interface SessionStats {
  hasSession: boolean;
  sessionAge: number;
  sessionData?: {
    id: string;
    currentStep: number;
    inputMethod: "upload" | "manual";
    uploadedFilesCount: number;
    manualEntriesCount: number;
    hasBeenAnalyzed: boolean;
    rulesVersion: string;
  };
}

// biome-ignore lint/complexity/noStaticOnlyClass: Intentional class-as-namespace for stable API surface
export class SessionRecoveryService {
  private static readonly SESSION_KEY = "pa:session:v9";
  private static readonly NAVIGATION_INTENT_KEY = "pa:nav-intent:v9";
  private static readonly MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly CURRENT_RULES_VERSION = "9.0.0";
  private static sessionIntervalId: NodeJS.Timeout | null = null;

  /**
   * Save current session state
   */
  static saveSession(sessionData: Partial<SessionData>): void {
    try {
      const existingSession = SessionRecoveryService.loadSession();
      const currentTime = Date.now();

      const session: SessionData = {
        id: existingSession?.id || `session-${currentTime}`,
        timestamp: sessionData.timestamp || currentTime,
        currentStep: sessionData.currentStep || 1,
        inputMethod: sessionData.inputMethod || "upload",
        uploadedFiles: sessionData.uploadedFiles || [],
        manualEntries: sessionData.manualEntries || [],
        lastAnalysisData: sessionData.lastAnalysisData,
        hasBeenAnalyzed: sessionData.hasBeenAnalyzed || false,
        rulesVersion: sessionData.rulesVersion || SessionRecoveryService.CURRENT_RULES_VERSION,
        sessionStarted:
          existingSession?.sessionStarted || sessionData.sessionStarted || currentTime,
        dbAnalysisId: sessionData.dbAnalysisId || existingSession?.dbAnalysisId,
      };

      // Only access localStorage when available (browser or test env)
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(SessionRecoveryService.SESSION_KEY, JSON.stringify(session));
        console.log("💾 Session saved:", session.id);
      }
    } catch (error) {
      console.error("Session save failed:", error);
    }
  }

  /**
   * Load existing session
   */
  static loadSession(): SessionData | null {
    // Only access localStorage when available (browser or test env)
    if (typeof localStorage === "undefined") {
      return null;
    }

    try {
      const sessionJson = localStorage.getItem(SessionRecoveryService.SESSION_KEY);
      if (!sessionJson) return null;

      const session: SessionData = JSON.parse(sessionJson);

      // Check if session is too old
      const age = Date.now() - session.timestamp;
      if (age > SessionRecoveryService.MAX_SESSION_AGE) {
        console.log("🕒 Session expired, clearing");
        SessionRecoveryService.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error("Session load failed:", error);
      SessionRecoveryService.clearSession();
      return null;
    }
  }

  /**
   * Check if session recovery is needed
   */
  static checkForRecovery(): RecoveryBanner | null {
    const session = SessionRecoveryService.loadSession();
    if (!session) return null;

    const age = Date.now() - session.timestamp;
    const minutesAgo = Math.floor(age / (60 * 1000));

    // Only show recovery if session has meaningful data and is recent enough
    const hasData =
      session.uploadedFiles.length > 0 ||
      session.manualEntries.length > 0 ||
      session.hasBeenAnalyzed ||
      session.currentStep > 1;

    if (!hasData || minutesAgo > 60) return null; // Don't recover if too old or no data

    // Check for rule changes
    const hasRuleChanges = session.rulesVersion !== SessionRecoveryService.CURRENT_RULES_VERSION;

    let message = `Restored your last analysis from ${minutesAgo} ${minutesAgo === 1 ? "minute" : "minutes"} ago`;
    if (hasRuleChanges) {
      message += " (Payment rules have been updated since then)";
    }

    return {
      show: true,
      message,
      minutesAgo,
      hasRuleChanges,
      sessionId: session.id,
    };
  }

  /**
   * Restore session data
   */
  static restoreSession(): SessionData | null {
    const session = SessionRecoveryService.loadSession();
    if (!session) return null;

    console.log("🔄 Restoring session:", session.id);
    return session;
  }

  /**
   * Clear current session
   */
  static clearSession(): void {
    // Only access localStorage when available
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.removeItem(SessionRecoveryService.SESSION_KEY);
      console.log("🗑️ Session cleared");
    } catch (error) {
      console.error("Session clear failed:", error);
    }
  }

  /**
   * Update session timestamp (keep alive)
   */
  static updateSessionTimestamp(): void {
    // Only access localStorage when available
    if (typeof localStorage === "undefined") {
      return;
    }

    const session = SessionRecoveryService.loadSession();
    if (session) {
      session.timestamp = Date.now();
      localStorage.setItem(SessionRecoveryService.SESSION_KEY, JSON.stringify(session));
    }
  }

  /**
   * Mark session as analyzed
   */
  static markAnalysisComplete(analysisData: StringKeyObject): void {
    // Only access localStorage when available
    if (typeof localStorage === "undefined") {
      return;
    }

    const session = SessionRecoveryService.loadSession();
    if (session) {
      session.lastAnalysisData = analysisData;
      session.hasBeenAnalyzed = true;
      session.timestamp = Date.now();
      localStorage.setItem(SessionRecoveryService.SESSION_KEY, JSON.stringify(session));
      console.log("✅ Session marked as analyzed");
    }
  }

  /**
   * Get session statistics for debugging
   */
  static getSessionStats(): SessionStats {
    const session = SessionRecoveryService.loadSession();

    return {
      hasSession: !!session,
      sessionAge: session ? Date.now() - session.timestamp : 0,
      sessionData: session
        ? {
            id: session.id,
            currentStep: session.currentStep,
            inputMethod: session.inputMethod,
            uploadedFilesCount: session.uploadedFiles.length,
            manualEntriesCount: session.manualEntries.length,
            hasBeenAnalyzed: session.hasBeenAnalyzed,
            rulesVersion: session.rulesVersion,
          }
        : undefined,
    };
  }

  /**
   * Handle browser beforeunload event
   */
  static setupAutoSave(): void {
    // Save session before page unload
    window.addEventListener("beforeunload", () => {
      console.log("💾 Auto-saving session on page unload");
      // Session will be saved by the calling component
    });

    // Periodic session updates
    SessionRecoveryService.sessionIntervalId = setInterval(
      () => {
        SessionRecoveryService.updateSessionTimestamp();
      },
      5 * 60 * 1000
    ); // Update every 5 minutes
  }

  /**
   * Validate session data integrity
   */
  static validateSessionData(session: SessionData): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check for rule version mismatch
    if (session.rulesVersion !== SessionRecoveryService.CURRENT_RULES_VERSION) {
      warnings.push(
        `Payment rules updated from ${session.rulesVersion} to ${SessionRecoveryService.CURRENT_RULES_VERSION}`
      );
    }

    // Check for stale file references
    if (session.uploadedFiles.length > 0) {
      warnings.push("File objects cannot be restored - files will need to be re-uploaded");
    }

    // Check for session age
    const ageHours = (Date.now() - session.timestamp) / (60 * 60 * 1000);
    if (ageHours > 1) {
      warnings.push(`Session is ${Math.floor(ageHours)} hours old`);
    }

    return {
      isValid: warnings.length === 0 || session.manualEntries.length > 0,
      warnings,
    };
  }

  /**
   * Cleanup method to clear the interval and prevent memory leaks
   */
  static cleanup(): void {
    if (SessionRecoveryService.sessionIntervalId !== null) {
      clearInterval(SessionRecoveryService.sessionIntervalId);
      SessionRecoveryService.sessionIntervalId = null;
      console.log("🧹 Session interval cleaned up");
    }
  }

  /**
   * Mark that user is navigating to view report
   * This prevents recovery banner from showing when they return
   */
  static markNavigationToReport(currentStep: number): void {
    if (typeof sessionStorage === "undefined") return;

    try {
      sessionStorage.setItem(
        SessionRecoveryService.NAVIGATION_INTENT_KEY,
        JSON.stringify({
          intent: "viewing-report",
          fromStep: currentStep,
          timestamp: Date.now(),
        })
      );
      console.log("🔖 Marked navigation intent: viewing-report from step", currentStep);
    } catch (error) {
      console.error("Failed to mark navigation intent:", error);
    }
  }

  /**
   * Check if user is returning from deliberate navigation
   * Returns the step to restore to, or null if not a deliberate return
   * Note: Does NOT clear the intent - call clearNavigationIntent() after restoration is complete
   */
  static checkNavigationReturn(): { shouldRestore: boolean; toStep?: number } | null {
    if (typeof sessionStorage === "undefined") return null;

    try {
      const intentJson = sessionStorage.getItem(SessionRecoveryService.NAVIGATION_INTENT_KEY);
      if (!intentJson) return null;

      const intent = JSON.parse(intentJson);
      const age = Date.now() - intent.timestamp;

      // If less than 5 minutes old, restore to original step
      if (age < 5 * 60 * 1000 && intent.intent === "viewing-report") {
        console.log("🔙 Detected return from report viewing, restoring to step", intent.fromStep);
        // Clear the intent after checking (one-time use)
        sessionStorage.removeItem(SessionRecoveryService.NAVIGATION_INTENT_KEY);
        return { shouldRestore: true, toStep: intent.fromStep };
      }

      // Intent is too old, clear it
      sessionStorage.removeItem(SessionRecoveryService.NAVIGATION_INTENT_KEY);
      return null;
    } catch (error) {
      console.error("Failed to check navigation return:", error);
      return null;
    }
  }

  /**
   * Clear navigation intent (called when user makes other actions)
   */
  static clearNavigationIntent(): void {
    if (typeof sessionStorage === "undefined") return;

    try {
      sessionStorage.removeItem(SessionRecoveryService.NAVIGATION_INTENT_KEY);
    } catch (error) {
      console.error("Failed to clear navigation intent:", error);
    }
  }
}
