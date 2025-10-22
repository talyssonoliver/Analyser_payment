/**
 * Recovery Banner Triggers Integration Tests
 * Tests recovery banner display and functionality across different pages
 */

import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { SessionData } from "@/lib/services/session-recovery-service";
import { SessionRecoveryService } from "@/lib/services/session-recovery-service";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => "/analysis"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock toast
vi.mock("@/lib/utils/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock auth provider
vi.mock("@/lib/providers/auth-provider", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user-id", email: "test@example.com" },
    loading: false,
  })),
}));

describe("Recovery Banner Triggers Integration", () => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  };

  beforeEach(() => {
    // Setup router mock
    (useRouter as Mock).mockReturnValue(mockRouter);

    // Clear localStorage (jsdom provides localStorage)
    localStorage.clear();
    vi.clearAllMocks();

    // Suppress console logs
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // =============================================================================
  // 1. Recovery Banner Display Tests
  // =============================================================================
  describe("Recovery Banner Display", () => {
    it("should show recovery banner when valid session exists", async () => {
      const mockSession: SessionData = {
        id: "session-123",
        timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
        currentStep: 2,
        inputMethod: "manual",
        uploadedFiles: [],
        manualEntries: [
          {
            id: 1,
            date: "2025-01-01",
            day: "Monday",
            consignments: 50,
            baseAmount: 100,
            totalPay: 205,
            pickups: 2,
          },
        ],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now() - 10 * 60 * 1000,
      };

      // Save session to localStorage
      SessionRecoveryService.saveSession(mockSession);

      // Check that session can be recovered
      const recovery = SessionRecoveryService.checkForRecovery();
      expect(recovery).not.toBeNull();
      expect(recovery?.show).toBe(true);
      expect(recovery?.minutesAgo).toBe(5);
    });

    it("should not show recovery banner when no session exists", () => {
      // Clear any existing session
      SessionRecoveryService.clearSession();

      // Check that recovery is null
      const recovery = SessionRecoveryService.checkForRecovery();
      expect(recovery).toBeNull();
    });

    it("should not show recovery banner for empty session", () => {
      const emptySession: SessionData = {
        id: "session-empty",
        timestamp: Date.now(),
        currentStep: 1,
        inputMethod: "upload",
        uploadedFiles: [],
        manualEntries: [],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now(),
      };

      SessionRecoveryService.saveSession(emptySession);

      const recovery = SessionRecoveryService.checkForRecovery();
      expect(recovery).toBeNull();
    });

    it("should show recovery banner with rule change warning", () => {
      const oldRulesSession: SessionData = {
        id: "session-old-rules",
        timestamp: Date.now() - 5 * 60 * 1000,
        currentStep: 2,
        inputMethod: "upload",
        uploadedFiles: [
          {
            name: "test.pdf",
            size: 1024,
            type: "application/pdf",
            lastModified: Date.now(),
          },
        ],
        manualEntries: [],
        hasBeenAnalyzed: true,
        rulesVersion: "8.0.0", // Old version
        sessionStarted: Date.now() - 10 * 60 * 1000,
      };

      SessionRecoveryService.saveSession(oldRulesSession);

      const recovery = SessionRecoveryService.checkForRecovery();
      expect(recovery).not.toBeNull();
      expect(recovery?.hasRuleChanges).toBe(true);
      expect(recovery?.message).toContain("Payment rules have been updated");
    });
  });

  // =============================================================================
  // 2. Session Restore Tests
  // =============================================================================
  describe("Session Restore", () => {
    it("should restore session with manual entries", () => {
      const mockSession: SessionData = {
        id: "session-123",
        timestamp: Date.now(),
        currentStep: 2,
        inputMethod: "manual",
        uploadedFiles: [],
        manualEntries: [
          {
            id: 1,
            date: "2025-01-01",
            day: "Monday",
            consignments: 50,
            baseAmount: 100,
            totalPay: 205,
            pickups: 2,
          },
          {
            id: 2,
            date: "2025-01-02",
            day: "Tuesday",
            consignments: 45,
            baseAmount: 90,
            totalPay: 195,
            pickups: 1,
          },
        ],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now(),
      };

      SessionRecoveryService.saveSession(mockSession);

      const restored = SessionRecoveryService.restoreSession();
      expect(restored).not.toBeNull();
      expect(restored?.manualEntries).toHaveLength(2);
      expect(restored?.inputMethod).toBe("manual");
      expect(restored?.currentStep).toBe(2);
    });

    it("should restore session with uploaded files metadata", () => {
      const mockSession: SessionData = {
        id: "session-456",
        timestamp: Date.now(),
        currentStep: 1,
        inputMethod: "upload",
        uploadedFiles: [
          {
            name: "runsheet.pdf",
            size: 2048,
            type: "application/pdf",
            lastModified: Date.now(),
          },
          {
            name: "invoice.pdf",
            size: 1536,
            type: "application/pdf",
            lastModified: Date.now(),
          },
        ],
        manualEntries: [],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now(),
      };

      SessionRecoveryService.saveSession(mockSession);

      const restored = SessionRecoveryService.restoreSession();
      expect(restored).not.toBeNull();
      expect(restored?.uploadedFiles).toHaveLength(2);
      expect(restored?.uploadedFiles[0].name).toBe("runsheet.pdf");
      expect(restored?.inputMethod).toBe("upload");
    });

    it("should restore analyzed session with analysis data", () => {
      const mockSession: SessionData = {
        id: "session-analyzed",
        timestamp: Date.now(),
        currentStep: 3,
        inputMethod: "manual",
        uploadedFiles: [],
        manualEntries: [],
        hasBeenAnalyzed: true,
        lastAnalysisData: {
          totalPaid: 1000,
          totalExpected: 950,
          workingDays: 5,
        },
        rulesVersion: "9.0.0",
        sessionStarted: Date.now(),
      };

      SessionRecoveryService.saveSession(mockSession);

      const restored = SessionRecoveryService.restoreSession();
      expect(restored).not.toBeNull();
      expect(restored?.hasBeenAnalyzed).toBe(true);
      expect(restored?.lastAnalysisData?.totalPaid).toBe(1000);
      expect(restored?.currentStep).toBe(3);
    });
  });

  // =============================================================================
  // 3. Session Dismiss Tests
  // =============================================================================
  describe("Session Dismiss", () => {
    it("should clear session when dismissed", () => {
      const mockSession: SessionData = {
        id: "session-123",
        timestamp: Date.now(),
        currentStep: 2,
        inputMethod: "manual",
        uploadedFiles: [],
        manualEntries: [
          {
            id: 1,
            date: "2025-01-01",
            day: "Monday",
            consignments: 50,
            baseAmount: 100,
            totalPay: 205,
            pickups: 2,
          },
        ],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now(),
      };

      SessionRecoveryService.saveSession(mockSession);

      // Verify session exists
      let session = SessionRecoveryService.loadSession();
      expect(session).not.toBeNull();

      // Dismiss session
      SessionRecoveryService.clearSession();

      // Verify session is cleared
      session = SessionRecoveryService.loadSession();
      expect(session).toBeNull();
    });

    it("should not show recovery after dismiss", () => {
      const mockSession: SessionData = {
        id: "session-123",
        timestamp: Date.now() - 5 * 60 * 1000,
        currentStep: 2,
        inputMethod: "manual",
        uploadedFiles: [],
        manualEntries: [
          {
            id: 1,
            date: "2025-01-01",
            day: "Monday",
            consignments: 50,
            baseAmount: 100,
            totalPay: 205,
            pickups: 2,
          },
        ],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now() - 10 * 60 * 1000,
      };

      SessionRecoveryService.saveSession(mockSession);

      // Verify recovery is available
      let recovery = SessionRecoveryService.checkForRecovery();
      expect(recovery).not.toBeNull();

      // Dismiss session
      SessionRecoveryService.clearSession();

      // Verify recovery is no longer available
      recovery = SessionRecoveryService.checkForRecovery();
      expect(recovery).toBeNull();
    });
  });

  // =============================================================================
  // 4. Session Age and Expiration Tests
  // =============================================================================
  describe("Session Age and Expiration", () => {
    it("should show recovery for recent sessions (within 60 minutes)", () => {
      const recentSession: SessionData = {
        id: "session-recent",
        timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
        currentStep: 2,
        inputMethod: "upload",
        uploadedFiles: [
          {
            name: "test.pdf",
            size: 1024,
            type: "application/pdf",
            lastModified: Date.now(),
          },
        ],
        manualEntries: [],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now() - 35 * 60 * 1000,
      };

      // Set session directly to localStorage to keep old timestamp
      localStorage.setItem("pa:session:v9", JSON.stringify(recentSession));

      const recovery = SessionRecoveryService.checkForRecovery();
      expect(recovery).not.toBeNull();
      expect(recovery?.minutesAgo).toBe(30);
    });

    it("should not show recovery for old sessions (>60 minutes)", () => {
      const oldSession: SessionData = {
        id: "session-old",
        timestamp: Date.now() - 65 * 60 * 1000, // 65 minutes ago
        currentStep: 2,
        inputMethod: "upload",
        uploadedFiles: [
          {
            name: "test.pdf",
            size: 1024,
            type: "application/pdf",
            lastModified: Date.now(),
          },
        ],
        manualEntries: [],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now() - 70 * 60 * 1000,
      };

      // Set session directly to localStorage to bypass saveSession's timestamp update
      localStorage.setItem("pa:session:v9", JSON.stringify(oldSession));

      const recovery = SessionRecoveryService.checkForRecovery();
      expect(recovery).toBeNull();
    });

    it("should clear expired sessions (>24 hours)", () => {
      const expiredSession: SessionData = {
        id: "session-expired",
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        currentStep: 2,
        inputMethod: "upload",
        uploadedFiles: [
          {
            name: "test.pdf",
            size: 1024,
            type: "application/pdf",
            lastModified: Date.now(),
          },
        ],
        manualEntries: [],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now() - 26 * 60 * 60 * 1000,
      };

      // Mock getItem to return expired session
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
      getItemSpy.mockReturnValueOnce(JSON.stringify(expiredSession));

      // Try to load - should clear and return null
      const loaded = SessionRecoveryService.loadSession();
      expect(loaded).toBeNull();

      // Verify session was removed
      const currentSession = localStorage.getItem("pa:session:v9");
      expect(currentSession).toBeNull();
    });
  });

  // =============================================================================
  // 5. Cross-Page Recovery Tests
  // =============================================================================
  describe("Cross-Page Recovery", () => {
    it("should work on Analysis page", () => {
      const mockSession: SessionData = {
        id: "session-analysis",
        timestamp: Date.now() - 5 * 60 * 1000,
        currentStep: 1,
        inputMethod: "manual",
        uploadedFiles: [],
        manualEntries: [
          {
            id: 1,
            date: "2025-01-01",
            day: "Monday",
            consignments: 50,
            baseAmount: 100,
            totalPay: 205,
            pickups: 2,
          },
        ],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now() - 10 * 60 * 1000,
      };

      SessionRecoveryService.saveSession(mockSession);

      const recovery = SessionRecoveryService.checkForRecovery();
      expect(recovery).not.toBeNull();
      expect(recovery?.show).toBe(true);
    });

    it("should work on Reports page", () => {
      const mockSession: SessionData = {
        id: "session-reports",
        timestamp: Date.now() - 10 * 60 * 1000,
        currentStep: 3,
        inputMethod: "upload",
        uploadedFiles: [],
        manualEntries: [],
        hasBeenAnalyzed: true,
        lastAnalysisData: {
          totalPaid: 500,
          totalExpected: 480,
        },
        rulesVersion: "9.0.0",
        sessionStarted: Date.now() - 15 * 60 * 1000,
      };

      SessionRecoveryService.saveSession(mockSession);

      const recovery = SessionRecoveryService.checkForRecovery();
      expect(recovery).not.toBeNull();
      expect(recovery?.show).toBe(true);
    });
  });

  // =============================================================================
  // 6. Session Update Tests
  // =============================================================================
  describe("Session Updates", () => {
    it("should update session timestamp", () => {
      vi.useFakeTimers();

      const mockSession: SessionData = {
        id: "session-123",
        timestamp: Date.now() - 10000,
        currentStep: 1,
        inputMethod: "upload",
        uploadedFiles: [],
        manualEntries: [],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now() - 10000,
      };

      SessionRecoveryService.saveSession(mockSession);
      const initialTimestamp = SessionRecoveryService.loadSession()?.timestamp;

      // Wait and update
      vi.advanceTimersByTime(1000);
      SessionRecoveryService.updateSessionTimestamp();

      const updatedTimestamp = SessionRecoveryService.loadSession()?.timestamp;
      expect(updatedTimestamp).toBeGreaterThan(initialTimestamp || 0);

      vi.useRealTimers();
    });

    it("should mark session as analyzed", () => {
      const mockSession: SessionData = {
        id: "session-123",
        timestamp: Date.now(),
        currentStep: 3,
        inputMethod: "manual",
        uploadedFiles: [],
        manualEntries: [],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now(),
      };

      SessionRecoveryService.saveSession(mockSession);

      const analysisData = {
        totalPaid: 1000,
        totalExpected: 950,
        workingDays: 5,
      };

      SessionRecoveryService.markAnalysisComplete(analysisData);

      const updated = SessionRecoveryService.loadSession();
      expect(updated?.hasBeenAnalyzed).toBe(true);
      expect(updated?.lastAnalysisData).toEqual(analysisData);
    });
  });
});
