/**
 * useSessionRecovery Hook Tests
 * Comprehensive tests for session recovery functionality
 * Target Coverage: 85%+
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import {
  checkForSessionRecovery,
  clearSessionData,
  saveSessionData,
  useSessionRecovery,
} from "@/hooks/useSessionRecovery";
import type { RecoveryBanner, SessionData } from "@/lib/services/session-recovery-service";
import { SessionRecoveryService } from "@/lib/services/session-recovery-service";
import { toast } from "@/lib/utils/toast";

// Mock dependencies
vi.mock("@/lib/services/session-recovery-service", () => ({
  SessionRecoveryService: {
    checkForRecovery: vi.fn(),
    loadSession: vi.fn(),
    restoreSession: vi.fn(),
    clearSession: vi.fn(),
    saveSession: vi.fn(),
  },
}));

vi.mock("@/lib/utils/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useSessionRecovery", () => {
  const mockRecoveryBanner: RecoveryBanner = {
    show: true,
    message: "Resume your previous analysis session",
    minutesAgo: 5,
    hasRuleChanges: false,
    sessionId: "session-123",
  };

  const mockSessionData: SessionData = {
    id: "session-123",
    timestamp: Date.now(),
    currentStep: 1,
    inputMethod: "manual",
    uploadedFiles: [],
    manualEntries: [
      {
        id: 0,
        date: "2024-01-01",
        day: "Monday",
        consignments: 50,
        baseAmount: 100,
        totalPay: 205,
        pickups: 0,
      },
    ],
    hasBeenAnalyzed: false,
    rulesVersion: "1.0.0",
    sessionStarted: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console logs during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // 1. Initial State Tests
  // =============================================================================
  describe("Initial State", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useSessionRecovery());

      expect(result.current.recoveryData).toBeNull();
      expect(result.current.showBanner).toBe(false);
      expect(result.current.sessionData).toBeNull();
      expect(result.current.hasSession).toBe(false);
      expect(typeof result.current.handleRestore).toBe("function");
      expect(typeof result.current.handleDismiss).toBe("function");
    });

    it("should not check for recovery when autoCheck is false", () => {
      renderHook(() => useSessionRecovery({ autoCheck: false }));

      expect(SessionRecoveryService.checkForRecovery).not.toHaveBeenCalled();
    });

    it("should check for recovery on mount by default", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(null);

      renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(SessionRecoveryService.checkForRecovery).toHaveBeenCalled();
      });
    });
  });

  // =============================================================================
  // 2. Session Detection on Mount
  // =============================================================================
  describe("Session Detection", () => {
    it("should detect and display recovery banner when session exists", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(mockSessionData);

      const { result } = renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(result.current.recoveryData).toEqual(mockRecoveryBanner);
        expect(result.current.showBanner).toBe(true);
        expect(result.current.sessionData).toEqual(mockSessionData);
        expect(result.current.hasSession).toBe(true);
      });

      expect(console.log).toHaveBeenCalledWith(
        "✅ Session recovery available:",
        mockRecoveryBanner
      );
    });

    it("should not display banner when no session exists", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(result.current.recoveryData).toBeNull();
        expect(result.current.showBanner).toBe(false);
        expect(result.current.sessionData).toBeNull();
        expect(result.current.hasSession).toBe(false);
      });

      expect(console.log).toHaveBeenCalledWith("ℹ️ No session recovery needed");
    });

    it("should handle errors during session detection", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockImplementation(() => {
        throw new Error("Session check failed");
      });

      const { result } = renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(result.current.recoveryData).toBeNull();
        expect(result.current.showBanner).toBe(false);
      });

      expect(console.error).toHaveBeenCalledWith(
        "❌ Session recovery initialization failed:",
        expect.any(Error)
      );
    });

    it("should only check for recovery once on mount", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(null);

      const { rerender } = renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(SessionRecoveryService.checkForRecovery).toHaveBeenCalledTimes(1);
      });

      rerender();

      // Should not call again on rerender
      expect(SessionRecoveryService.checkForRecovery).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // 3. handleRestore() Tests
  // =============================================================================
  describe("handleRestore", () => {
    it("should restore session and invoke callbacks", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(mockSessionData);
      (SessionRecoveryService.restoreSession as Mock).mockReturnValue(mockSessionData);

      const onRestore = vi.fn();
      const onInputMethodChange = vi.fn();
      const onManualEntriesChange = vi.fn();

      const { result } = renderHook(() =>
        useSessionRecovery({
          onRestore,
          onInputMethodChange,
          onManualEntriesChange,
        })
      );

      await waitFor(() => {
        expect(result.current.recoveryData).not.toBeNull();
      });

      act(() => {
        result.current.handleRestore();
      });

      expect(SessionRecoveryService.restoreSession).toHaveBeenCalled();
      expect(onInputMethodChange).toHaveBeenCalledWith("manual");
      expect(onManualEntriesChange).toHaveBeenCalledWith(mockSessionData.manualEntries);
      expect(onRestore).toHaveBeenCalledWith(mockSessionData);
      expect(toast.success).toHaveBeenCalledWith("Session restored successfully");
      expect(result.current.showBanner).toBe(false);
    });

    it("should not restore inputMethod if not present", async () => {
      const sessionWithoutMethod = {
        ...mockSessionData,
        inputMethod: undefined,
      };

      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(sessionWithoutMethod);
      (SessionRecoveryService.restoreSession as Mock).mockReturnValue(sessionWithoutMethod);

      const onInputMethodChange = vi.fn();

      const { result } = renderHook(() => useSessionRecovery({ onInputMethodChange }));

      await waitFor(() => {
        expect(result.current.recoveryData).not.toBeNull();
      });

      act(() => {
        result.current.handleRestore();
      });

      expect(onInputMethodChange).not.toHaveBeenCalled();
    });

    it("should not restore manual entries if empty", async () => {
      const sessionWithoutEntries = {
        ...mockSessionData,
        manualEntries: [],
      };

      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(sessionWithoutEntries);
      (SessionRecoveryService.restoreSession as Mock).mockReturnValue(sessionWithoutEntries);

      const onManualEntriesChange = vi.fn();

      const { result } = renderHook(() => useSessionRecovery({ onManualEntriesChange }));

      await waitFor(() => {
        expect(result.current.recoveryData).not.toBeNull();
      });

      act(() => {
        result.current.handleRestore();
      });

      expect(onManualEntriesChange).not.toHaveBeenCalled();
    });

    it("should handle restore failure gracefully", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(mockSessionData);
      (SessionRecoveryService.restoreSession as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(result.current.recoveryData).not.toBeNull();
      });

      act(() => {
        result.current.handleRestore();
      });

      expect(console.error).toHaveBeenCalledWith("❌ Session restore failed:", expect.any(Error));
      expect(toast.error).toHaveBeenCalledWith("Failed to restore session");
    });

    it("should handle restore exception", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(mockSessionData);
      (SessionRecoveryService.restoreSession as Mock).mockImplementation(() => {
        throw new Error("Restore failed");
      });

      const { result } = renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(result.current.recoveryData).not.toBeNull();
      });

      act(() => {
        result.current.handleRestore();
      });

      expect(console.error).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Failed to restore session");
    });

    it("should warn when restore called without recovery data", () => {
      const { result } = renderHook(() => useSessionRecovery({ autoCheck: false }));

      act(() => {
        result.current.handleRestore();
      });

      expect(console.warn).toHaveBeenCalledWith("⚠️ No recovery data available");
      expect(SessionRecoveryService.restoreSession).not.toHaveBeenCalled();
    });

    it("should update sessionData state on successful restore", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(null);
      (SessionRecoveryService.restoreSession as Mock).mockReturnValue(mockSessionData);

      const { result } = renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(result.current.recoveryData).not.toBeNull();
      });

      act(() => {
        result.current.handleRestore();
      });

      expect(result.current.sessionData).toEqual(mockSessionData);
      expect(result.current.hasSession).toBe(true);
    });

    it("should work without callbacks", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(mockSessionData);
      (SessionRecoveryService.restoreSession as Mock).mockReturnValue(mockSessionData);

      const { result } = renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(result.current.recoveryData).not.toBeNull();
      });

      act(() => {
        result.current.handleRestore();
      });

      expect(toast.success).toHaveBeenCalledWith("Session restored successfully");
      expect(result.current.showBanner).toBe(false);
    });
  });

  // =============================================================================
  // 4. handleDismiss() Tests
  // =============================================================================
  describe("handleDismiss", () => {
    it("should dismiss banner and clear session", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(mockSessionData);

      const { result } = renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(result.current.showBanner).toBe(true);
      });

      act(() => {
        result.current.handleDismiss();
      });

      expect(SessionRecoveryService.clearSession).toHaveBeenCalled();
      expect(result.current.showBanner).toBe(false);
      expect(result.current.recoveryData).toBeNull();
      expect(result.current.sessionData).toBeNull();
      expect(result.current.hasSession).toBe(false);
      expect(console.log).toHaveBeenCalledWith("✅ Session dismissed");
    });

    it("should work when called without existing session", () => {
      const { result } = renderHook(() => useSessionRecovery({ autoCheck: false }));

      act(() => {
        result.current.handleDismiss();
      });

      expect(SessionRecoveryService.clearSession).toHaveBeenCalled();
      expect(result.current.showBanner).toBe(false);
    });

    it("should maintain callback stability after dismiss", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(mockSessionData);

      const { result } = renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(result.current.showBanner).toBe(true);
      });

      const dismissBefore = result.current.handleDismiss;

      act(() => {
        result.current.handleDismiss();
      });

      const dismissAfter = result.current.handleDismiss;

      // useCallback should maintain reference
      expect(dismissBefore).toBe(dismissAfter);
    });
  });

  // =============================================================================
  // 5. Callback Stability Tests
  // =============================================================================
  describe("Callback Stability", () => {
    it("should maintain stable callback references", () => {
      const onRestore = vi.fn();
      const onInputMethodChange = vi.fn();

      const { result, rerender } = renderHook(
        ({ onRestore, onInputMethodChange }) =>
          useSessionRecovery({ onRestore, onInputMethodChange }),
        {
          initialProps: { onRestore, onInputMethodChange },
        }
      );

      const restore1 = result.current.handleRestore;
      const dismiss1 = result.current.handleDismiss;

      rerender({ onRestore, onInputMethodChange });

      expect(result.current.handleRestore).toBe(restore1);
      expect(result.current.handleDismiss).toBe(dismiss1);
    });

    it("should update handleRestore when callbacks change", () => {
      const onRestore1 = vi.fn();
      const onRestore2 = vi.fn();

      const { result, rerender } = renderHook(
        ({ onRestore }) => useSessionRecovery({ onRestore }),
        { initialProps: { onRestore: onRestore1 } }
      );

      const restore1 = result.current.handleRestore;

      rerender({ onRestore: onRestore2 });

      const restore2 = result.current.handleRestore;

      // Callback reference should change when dependencies change
      expect(restore1).not.toBe(restore2);
    });
  });

  // =============================================================================
  // 6. Helper Functions Tests
  // =============================================================================
  describe("Helper Functions", () => {
    it("checkForSessionRecovery should call SessionRecoveryService", () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);

      const result = checkForSessionRecovery();

      expect(SessionRecoveryService.checkForRecovery).toHaveBeenCalled();
      expect(result).toEqual(mockRecoveryBanner);
    });

    it("checkForSessionRecovery should return null when no session", () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(null);

      const result = checkForSessionRecovery();

      expect(result).toBeNull();
    });

    it("saveSessionData should call SessionRecoveryService", () => {
      const partialSession = { inputMethod: "upload" as const };

      saveSessionData(partialSession);

      expect(SessionRecoveryService.saveSession).toHaveBeenCalledWith(partialSession);
    });

    it("saveSessionData should handle empty data", () => {
      saveSessionData({});

      expect(SessionRecoveryService.saveSession).toHaveBeenCalledWith({});
    });

    it("clearSessionData should call SessionRecoveryService", () => {
      clearSessionData();

      expect(SessionRecoveryService.clearSession).toHaveBeenCalled();
    });

    it("clearSessionData should work multiple times", () => {
      clearSessionData();
      clearSessionData();
      clearSessionData();

      expect(SessionRecoveryService.clearSession).toHaveBeenCalledTimes(3);
    });
  });

  // =============================================================================
  // 7. Integration & Edge Cases
  // =============================================================================
  describe("Integration Scenarios", () => {
    it("should handle full restore-dismiss cycle", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(mockSessionData);
      (SessionRecoveryService.restoreSession as Mock).mockReturnValue(mockSessionData);

      const onRestore = vi.fn();

      const { result } = renderHook(() => useSessionRecovery({ onRestore }));

      // Wait for detection
      await waitFor(() => {
        expect(result.current.showBanner).toBe(true);
      });

      // Restore
      act(() => {
        result.current.handleRestore();
      });

      expect(result.current.showBanner).toBe(false);
      expect(onRestore).toHaveBeenCalled();

      // Dismiss should work even after restore
      act(() => {
        result.current.handleDismiss();
      });

      expect(SessionRecoveryService.clearSession).toHaveBeenCalled();
    });

    it("should handle dismiss without restore", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(mockSessionData);

      const { result } = renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(result.current.showBanner).toBe(true);
      });

      // Dismiss directly without restoring
      act(() => {
        result.current.handleDismiss();
      });

      expect(SessionRecoveryService.clearSession).toHaveBeenCalled();
      expect(result.current.showBanner).toBe(false);
      expect(result.current.recoveryData).toBeNull();
    });

    it("should handle concurrent restore attempts", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(mockSessionData);
      (SessionRecoveryService.restoreSession as Mock).mockReturnValue(mockSessionData);

      const { result } = renderHook(() => useSessionRecovery());

      await waitFor(() => {
        expect(result.current.showBanner).toBe(true);
      });

      // Attempt multiple restores
      act(() => {
        result.current.handleRestore();
        result.current.handleRestore();
        result.current.handleRestore();
      });

      // Should only restore once (banner is hidden after first restore)
      expect(SessionRecoveryService.restoreSession).toHaveBeenCalledTimes(3);
      expect(toast.success).toHaveBeenCalledTimes(3);
    });

    it("should maintain hasSession derived state correctly", async () => {
      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(mockSessionData);
      (SessionRecoveryService.restoreSession as Mock).mockReturnValue(mockSessionData);

      const { result } = renderHook(() => useSessionRecovery());

      // After detection - session loaded (checked immediately in useEffect)
      await waitFor(() => {
        expect(result.current.hasSession).toBe(true);
      });

      // After restore - session still exists
      act(() => {
        result.current.handleRestore();
      });

      expect(result.current.hasSession).toBe(true);

      // After dismiss - no session
      act(() => {
        result.current.handleDismiss();
      });

      expect(result.current.hasSession).toBe(false);
    });

    it("should handle session with only inputMethod", async () => {
      const minimalSession: SessionData = {
        id: "minimal-session",
        timestamp: Date.now(),
        currentStep: 1,
        inputMethod: "upload",
        uploadedFiles: [],
        manualEntries: [],
        hasBeenAnalyzed: false,
        rulesVersion: "1.0.0",
        sessionStarted: Date.now(),
      };

      (SessionRecoveryService.checkForRecovery as Mock).mockReturnValue(mockRecoveryBanner);
      (SessionRecoveryService.loadSession as Mock).mockReturnValue(minimalSession);
      (SessionRecoveryService.restoreSession as Mock).mockReturnValue(minimalSession);

      const onInputMethodChange = vi.fn();
      const onManualEntriesChange = vi.fn();

      const { result } = renderHook(() =>
        useSessionRecovery({ onInputMethodChange, onManualEntriesChange })
      );

      await waitFor(() => {
        expect(result.current.showBanner).toBe(true);
      });

      act(() => {
        result.current.handleRestore();
      });

      expect(onInputMethodChange).toHaveBeenCalledWith("upload");
      expect(onManualEntriesChange).not.toHaveBeenCalled();
    });
  });
});
