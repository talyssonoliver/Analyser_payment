/**
 * Session Recovery Service Unit Tests
 * Comprehensive tests for session management functionality
 * Target Coverage: 90%+
 */

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { type SessionData, SessionRecoveryService } from "@/lib/services/session-recovery-service";
import type { ManualEntry } from "@/types/core";

describe("SessionRecoveryService", () => {
  // Mock localStorage
  const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((index: number) => Object.keys(store)[index] || null),
    };
  })();

  beforeEach(() => {
    // Replace global localStorage with mock
    global.localStorage = mockLocalStorage as Storage;
    vi.clearAllMocks();
    mockLocalStorage.clear();

    // Suppress console logs during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockLocalStorage.clear();
  });

  // =============================================================================
  // 1. saveSession() Tests
  // =============================================================================
  describe("saveSession", () => {
    it("should save a new session with all required fields", () => {
      const sessionData: Partial<SessionData> = {
        currentStep: 1,
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
      };

      SessionRecoveryService.saveSession(sessionData);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(
        (mockLocalStorage.setItem as Mock).mock.calls[0][1]
      ) as SessionData;

      expect(savedData.id).toBeDefined();
      expect(savedData.timestamp).toBeDefined();
      expect(savedData.currentStep).toBe(1);
      expect(savedData.inputMethod).toBe("upload");
      expect(savedData.uploadedFiles).toHaveLength(1);
      expect(savedData.rulesVersion).toBe("9.0.0");
    });

    it("should update existing session with new data", () => {
      // Save initial session
      SessionRecoveryService.saveSession({
        currentStep: 1,
        inputMethod: "upload",
        uploadedFiles: [],
        manualEntries: [],
      });

      const initialId = JSON.parse((mockLocalStorage.setItem as Mock).mock.calls[0][1]).id;

      // Update session
      SessionRecoveryService.saveSession({
        currentStep: 2,
        inputMethod: "upload",
        uploadedFiles: [],
        manualEntries: [],
      });

      const updatedData = JSON.parse(
        (mockLocalStorage.setItem as Mock).mock.calls[1][1]
      ) as SessionData;

      expect(updatedData.id).toBe(initialId); // Should preserve ID
      expect(updatedData.currentStep).toBe(2); // Should update step
    });

    it("should handle manual entries correctly", () => {
      const manualEntries: ManualEntry[] = [
        {
          id: 1,
          date: "2025-01-01",
          day: "Monday",
          consignments: 50,
          baseAmount: 100,
          totalPay: 205,
          pickups: 2,
        },
      ];

      SessionRecoveryService.saveSession({
        currentStep: 1,
        inputMethod: "manual",
        uploadedFiles: [],
        manualEntries,
      });

      const savedData = JSON.parse(
        (mockLocalStorage.setItem as Mock).mock.calls[0][1]
      ) as SessionData;

      expect(savedData.manualEntries).toHaveLength(1);
      expect(savedData.manualEntries[0].date).toBe("2025-01-01");
      expect(savedData.manualEntries[0].consignments).toBe(50);
    });

    it("should handle storage errors gracefully", () => {
      // Simulate storage failure
      (mockLocalStorage.setItem as Mock).mockImplementationOnce(() => {
        throw new Error("Storage quota exceeded");
      });

      expect(() => {
        SessionRecoveryService.saveSession({
          currentStep: 1,
          inputMethod: "upload",
          uploadedFiles: [],
          manualEntries: [],
        });
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith("Session save failed:", expect.any(Error));
    });

    it("should preserve sessionStarted timestamp on updates", () => {
      vi.useFakeTimers();

      SessionRecoveryService.saveSession({
        currentStep: 1,
        inputMethod: "upload",
        uploadedFiles: [],
        manualEntries: [],
      });

      const firstData = JSON.parse(
        (mockLocalStorage.setItem as Mock).mock.calls[0][1]
      ) as SessionData;

      // Wait a bit and update
      vi.advanceTimersByTime(1000);

      SessionRecoveryService.saveSession({
        currentStep: 2,
        inputMethod: "upload",
        uploadedFiles: [],
        manualEntries: [],
      });

      const secondData = JSON.parse(
        (mockLocalStorage.setItem as Mock).mock.calls[1][1]
      ) as SessionData;

      expect(secondData.sessionStarted).toBe(firstData.sessionStarted);
      expect(secondData.timestamp).toBeGreaterThan(firstData.timestamp);

      vi.useRealTimers();
    });

    it("should handle empty partial data", () => {
      SessionRecoveryService.saveSession({});

      const savedData = JSON.parse(
        (mockLocalStorage.setItem as Mock).mock.calls[0][1]
      ) as SessionData;

      expect(savedData.currentStep).toBe(1); // Default
      expect(savedData.inputMethod).toBe("upload"); // Default
      expect(savedData.uploadedFiles).toEqual([]);
      expect(savedData.manualEntries).toEqual([]);
    });
  });

  // =============================================================================
  // 2. loadSession() Tests
  // =============================================================================
  describe("loadSession", () => {
    it("should load existing valid session", () => {
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

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(mockSession));

      const loaded = SessionRecoveryService.loadSession();

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe("session-123");
      expect(loaded?.currentStep).toBe(2);
      expect(loaded?.manualEntries).toHaveLength(1);
    });

    it("should return null when no session exists", () => {
      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(null);

      const loaded = SessionRecoveryService.loadSession();

      expect(loaded).toBeNull();
    });

    it("should clear expired sessions", () => {
      const expiredSession: SessionData = {
        id: "session-old",
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        currentStep: 1,
        inputMethod: "upload",
        uploadedFiles: [],
        manualEntries: [],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now() - 25 * 60 * 60 * 1000,
      };

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(expiredSession));

      const loaded = SessionRecoveryService.loadSession();

      expect(loaded).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith("🕒 Session expired, clearing");
    });

    it("should handle corrupted session data", () => {
      (mockLocalStorage.getItem as Mock).mockReturnValueOnce("invalid-json-data");

      const loaded = SessionRecoveryService.loadSession();

      expect(loaded).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith("Session load failed:", expect.any(Error));
    });

    it("should accept recent sessions (within 24 hours)", () => {
      const recentSession: SessionData = {
        id: "session-recent",
        timestamp: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
        currentStep: 2,
        inputMethod: "upload",
        uploadedFiles: [],
        manualEntries: [],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now() - 1 * 60 * 60 * 1000,
      };

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(recentSession));

      const loaded = SessionRecoveryService.loadSession();

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe("session-recent");
    });
  });

  // =============================================================================
  // 3. checkForRecovery() Tests
  // =============================================================================
  describe("checkForRecovery", () => {
    it("should return recovery banner for valid session with data", () => {
      const sessionWithData: SessionData = {
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

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(sessionWithData));

      const recovery = SessionRecoveryService.checkForRecovery();

      expect(recovery).not.toBeNull();
      expect(recovery?.show).toBe(true);
      expect(recovery?.minutesAgo).toBe(5);
      expect(recovery?.hasRuleChanges).toBe(false);
      expect(recovery?.message).toContain("5 minutes ago");
    });

    it("should return null for empty session", () => {
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

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(emptySession));

      const recovery = SessionRecoveryService.checkForRecovery();

      expect(recovery).toBeNull();
    });

    it("should detect rule version changes", () => {
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

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(oldRulesSession));

      const recovery = SessionRecoveryService.checkForRecovery();

      expect(recovery).not.toBeNull();
      expect(recovery?.hasRuleChanges).toBe(true);
      expect(recovery?.message).toContain("Payment rules have been updated");
    });

    it("should return null for very old sessions (>60 minutes)", () => {
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

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(oldSession));

      const recovery = SessionRecoveryService.checkForRecovery();

      expect(recovery).toBeNull();
    });

    it("should show recovery for session with uploaded files", () => {
      const sessionWithFiles: SessionData = {
        id: "session-files",
        timestamp: Date.now() - 10 * 60 * 1000,
        currentStep: 1,
        inputMethod: "upload",
        uploadedFiles: [
          {
            name: "runsheet.pdf",
            size: 2048,
            type: "application/pdf",
            lastModified: Date.now(),
          },
        ],
        manualEntries: [],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now() - 15 * 60 * 1000,
      };

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(sessionWithFiles));

      const recovery = SessionRecoveryService.checkForRecovery();

      expect(recovery).not.toBeNull();
      expect(recovery?.show).toBe(true);
    });

    it("should show recovery for analyzed session", () => {
      const analyzedSession: SessionData = {
        id: "session-analyzed",
        timestamp: Date.now() - 20 * 60 * 1000,
        currentStep: 3,
        inputMethod: "manual",
        uploadedFiles: [],
        manualEntries: [],
        hasBeenAnalyzed: true,
        lastAnalysisData: { totalPaid: 500 },
        rulesVersion: "9.0.0",
        sessionStarted: Date.now() - 25 * 60 * 1000,
      };

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(analyzedSession));

      const recovery = SessionRecoveryService.checkForRecovery();

      expect(recovery).not.toBeNull();
      expect(recovery?.show).toBe(true);
    });

    it("should handle singular minute in message", () => {
      const oneMinuteSession: SessionData = {
        id: "session-recent",
        timestamp: Date.now() - 60 * 1000, // 1 minute ago
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
        sessionStarted: Date.now() - 2 * 60 * 1000,
      };

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(oneMinuteSession));

      const recovery = SessionRecoveryService.checkForRecovery();

      expect(recovery).not.toBeNull();
      expect(recovery?.message).toContain("1 minute ago");
      expect(recovery?.message).not.toContain("1 minutes");
    });
  });

  // =============================================================================
  // 4. restoreSession() Tests
  // =============================================================================
  describe("restoreSession", () => {
    it("should restore valid session", () => {
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

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(mockSession));

      const restored = SessionRecoveryService.restoreSession();

      expect(restored).not.toBeNull();
      expect(restored?.id).toBe("session-123");
      expect(console.log).toHaveBeenCalledWith("🔄 Restoring session:", "session-123");
    });

    it("should return null when no session exists", () => {
      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(null);

      const restored = SessionRecoveryService.restoreSession();

      expect(restored).toBeNull();
    });
  });

  // =============================================================================
  // 5. clearSession() Tests
  // =============================================================================
  describe("clearSession", () => {
    it("should clear session from storage", () => {
      SessionRecoveryService.clearSession();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("pa:session:v9");
      expect(console.log).toHaveBeenCalledWith("🗑️ Session cleared");
    });

    it("should handle clear errors gracefully", () => {
      (mockLocalStorage.removeItem as Mock).mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      expect(() => {
        SessionRecoveryService.clearSession();
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith("Session clear failed:", expect.any(Error));
    });
  });

  // =============================================================================
  // 6. updateSessionTimestamp() Tests
  // =============================================================================
  describe("updateSessionTimestamp", () => {
    it("should update timestamp of existing session", () => {
      const initialTime = Date.now() - 10000;
      const mockSession: SessionData = {
        id: "session-123",
        timestamp: initialTime,
        currentStep: 1,
        inputMethod: "upload",
        uploadedFiles: [],
        manualEntries: [],
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: initialTime,
      };

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(mockSession));

      SessionRecoveryService.updateSessionTimestamp();

      const updatedData = JSON.parse(
        (mockLocalStorage.setItem as Mock).mock.calls[0][1]
      ) as SessionData;

      expect(updatedData.timestamp).toBeGreaterThan(initialTime);
      expect(updatedData.id).toBe("session-123");
    });

    it("should do nothing if no session exists", () => {
      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(null);

      SessionRecoveryService.updateSessionTimestamp();

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // 7. markAnalysisComplete() Tests
  // =============================================================================
  describe("markAnalysisComplete", () => {
    it("should mark session as analyzed with data", () => {
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

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(mockSession));

      const analysisData = {
        totalPaid: 1000,
        totalExpected: 950,
        workingDays: 5,
      };

      SessionRecoveryService.markAnalysisComplete(analysisData);

      const updatedData = JSON.parse(
        (mockLocalStorage.setItem as Mock).mock.calls[0][1]
      ) as SessionData;

      expect(updatedData.hasBeenAnalyzed).toBe(true);
      expect(updatedData.lastAnalysisData).toEqual(analysisData);
      expect(console.log).toHaveBeenCalledWith("✅ Session marked as analyzed");
    });

    it("should do nothing if no session exists", () => {
      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(null);

      SessionRecoveryService.markAnalysisComplete({ data: "test" });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // 8. getSessionStats() Tests
  // =============================================================================
  describe("getSessionStats", () => {
    it("should return stats for existing session", () => {
      const mockSession: SessionData = {
        id: "session-123",
        timestamp: Date.now() - 5000,
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
        sessionStarted: Date.now() - 10000,
      };

      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(JSON.stringify(mockSession));

      const stats = SessionRecoveryService.getSessionStats();

      expect(stats.hasSession).toBe(true);
      expect(stats.sessionAge).toBeGreaterThan(0);
      expect(stats.sessionData?.id).toBe("session-123");
      expect(stats.sessionData?.currentStep).toBe(2);
      expect(stats.sessionData?.inputMethod).toBe("manual");
      expect(stats.sessionData?.manualEntriesCount).toBe(1);
      expect(stats.sessionData?.hasBeenAnalyzed).toBe(false);
    });

    it("should return no session stats when no session exists", () => {
      (mockLocalStorage.getItem as Mock).mockReturnValueOnce(null);

      const stats = SessionRecoveryService.getSessionStats();

      expect(stats.hasSession).toBe(false);
      expect(stats.sessionAge).toBe(0);
      expect(stats.sessionData).toBeUndefined();
    });
  });

  // =============================================================================
  // 9. validateSessionData() Tests
  // =============================================================================
  describe("validateSessionData", () => {
    it("should validate clean session data", () => {
      const mockSession: SessionData = {
        id: "session-123",
        timestamp: Date.now(),
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
        sessionStarted: Date.now(),
      };

      const validation = SessionRecoveryService.validateSessionData(mockSession);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    it("should warn about rule version mismatch", () => {
      const mockSession: SessionData = {
        id: "session-123",
        timestamp: Date.now(),
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
        rulesVersion: "8.0.0", // Old version
        sessionStarted: Date.now(),
      };

      const validation = SessionRecoveryService.validateSessionData(mockSession);

      expect(validation.warnings).toContain("Payment rules updated from 8.0.0 to 9.0.0");
    });

    it("should warn about stale file references", () => {
      const mockSession: SessionData = {
        id: "session-123",
        timestamp: Date.now(),
        currentStep: 1,
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
        sessionStarted: Date.now(),
      };

      const validation = SessionRecoveryService.validateSessionData(mockSession);

      expect(validation.warnings).toContain(
        "File objects cannot be restored - files will need to be re-uploaded"
      );
    });

    it("should warn about old sessions", () => {
      const mockSession: SessionData = {
        id: "session-123",
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
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
        sessionStarted: Date.now() - 3 * 60 * 60 * 1000,
      };

      const validation = SessionRecoveryService.validateSessionData(mockSession);

      expect(validation.warnings).toContain("Session is 2 hours old");
    });

    it("should consider session valid if has manual entries despite warnings", () => {
      const mockSession: SessionData = {
        id: "session-123",
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        currentStep: 1,
        inputMethod: "manual",
        uploadedFiles: [
          {
            name: "test.pdf",
            size: 1024,
            type: "application/pdf",
            lastModified: Date.now(),
          },
        ],
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
        rulesVersion: "8.0.0",
        sessionStarted: Date.now() - 3 * 60 * 60 * 1000,
      };

      const validation = SessionRecoveryService.validateSessionData(mockSession);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });
});
