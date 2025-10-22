/**
 * Unit Tests for useNavigationBadges Hook
 * Tests badge counting logic for navigation items
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNavigationBadges } from "@/hooks/useNavigationBadges";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import type { StringKeyObject } from "@/types/core";

// Mock dependencies
vi.mock("@/lib/services/analysis-storage-service");
vi.mock("@/lib/repositories/analysis-repository");

describe("useNavigationBadges", () => {
  const mockUserId = "test-user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Initial State", () => {
    it("should initialize with zero badges", () => {
      const { result } = renderHook(() => useNavigationBadges({ enabled: false }));

      expect(result.current.badges).toEqual({
        dashboard: 0,
        analysis: 0,
        reports: 0,
        history: 0,
        settings: 0,
      });
      expect(result.current.loading).toBe(false);
    });

    it("should provide refreshBadges function", () => {
      const { result } = renderHook(() => useNavigationBadges({ enabled: false }));

      expect(typeof result.current.refreshBadges).toBe("function");
    });
  });

  describe("Analysis Badge (Drafts)", () => {
    it("should count draft analyses from localStorage", async () => {
      const mockAnalyses: Record<string, StringKeyObject> = {
        "analysis-1": { status: "pending", created_at: new Date().toISOString() },
        "analysis-2": { status: "draft", created_at: new Date().toISOString() },
        "analysis-3": { status: "completed", created_at: new Date().toISOString() },
        "analysis-4": { status: "in_progress", created_at: new Date().toISOString() },
      };

      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue(mockAnalyses);
      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue({
        isSuccess: true,
        isFailure: false,
        data: { data: [], count: 0 },
      } as never);

      const { result } = renderHook(() =>
        useNavigationBadges({ userId: mockUserId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should count 3 drafts (pending, draft, in_progress)
      expect(result.current.badges.analysis).toBe(3);
    });

    it("should handle empty analyses", async () => {
      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});
      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue({
        isSuccess: true,
        isFailure: false,
        data: { data: [], count: 0 },
      } as never);

      const { result } = renderHook(() =>
        useNavigationBadges({ userId: mockUserId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.badges.analysis).toBe(0);
    });
  });

  describe("Reports Badge (Unviewed)", () => {
    it("should count unviewed reports from last 7 days", async () => {
      const now = Date.now();
      const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString();
      const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();

      const mockAnalyses = [
        {
          id: "1",
          status: "completed",
          created_at: sixDaysAgo,
          metadata: { viewed: false },
        },
        {
          id: "2",
          status: "completed",
          created_at: sixDaysAgo,
          metadata: { viewed: true }, // Already viewed
        },
        {
          id: "3",
          status: "completed",
          created_at: eightDaysAgo,
          metadata: { viewed: false }, // Too old
        },
      ];

      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});
      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue({
        isSuccess: true,
        isFailure: false,
        data: { data: mockAnalyses, count: mockAnalyses.length },
      } as never);

      const { result } = renderHook(() =>
        useNavigationBadges({ userId: mockUserId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should count 1 unviewed report (recent and not viewed)
      expect(result.current.badges.reports).toBe(1);
    });

    it("should return 0 when no userId provided", async () => {
      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});

      const { result } = renderHook(() => useNavigationBadges({ enabled: true }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.badges.reports).toBe(0);
    });
  });

  describe("History Badge (Recent Items)", () => {
    it("should count recent history items from last 30 days", async () => {
      const now = Date.now();
      const twentyDaysAgo = new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString();
      const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString();

      const mockAnalyses = [
        { id: "1", status: "completed", created_at: twentyDaysAgo },
        { id: "2", status: "completed", created_at: twentyDaysAgo },
        { id: "3", status: "completed", created_at: fortyDaysAgo }, // Too old
      ];

      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});
      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue({
        isSuccess: true,
        isFailure: false,
        data: { data: mockAnalyses, count: mockAnalyses.length },
      } as never);

      const { result } = renderHook(() =>
        useNavigationBadges({ userId: mockUserId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should count 2 recent history items
      expect(result.current.badges.history).toBe(2);
    });
  });

  describe("Settings Badge (Unsaved Changes)", () => {
    it("should count unsaved preferences", async () => {
      const mockPreferences = {
        hasUnsavedChanges: true,
      };

      vi.mocked(AnalysisStorageService.loadPreferences).mockReturnValue(mockPreferences);
      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});
      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue({
        isSuccess: true,
        isFailure: false,
        data: { data: [], count: 0 },
      } as never);

      const { result } = renderHook(() =>
        useNavigationBadges({ userId: mockUserId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.badges.settings).toBe(1);
    });

    it("should handle null preferences", async () => {
      vi.mocked(AnalysisStorageService.loadPreferences).mockReturnValue(null);
      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});
      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue({
        isSuccess: true,
        isFailure: false,
        data: { data: [], count: 0 },
      } as never);

      const { result } = renderHook(() =>
        useNavigationBadges({ userId: mockUserId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.badges.settings).toBe(0);
    });
  });

  describe("Dashboard Badge", () => {
    it("should always return 0 for dashboard", async () => {
      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});
      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue({
        isSuccess: true,
        isFailure: false,
        data: { data: [], count: 0 },
      } as never);

      const { result } = renderHook(() =>
        useNavigationBadges({ userId: mockUserId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.badges.dashboard).toBe(0);
    });
  });

  describe("Refresh and Updates", () => {
    it("should refresh badges on interval", async () => {
      const mockAnalyses1 = {
        "analysis-1": { status: "pending", created_at: new Date().toISOString() },
      };
      const mockAnalyses2 = {
        "analysis-1": { status: "pending", created_at: new Date().toISOString() },
        "analysis-2": { status: "draft", created_at: new Date().toISOString() },
      };

      vi.mocked(AnalysisStorageService.loadAnalyses)
        .mockReturnValueOnce(mockAnalyses1)
        .mockReturnValueOnce(mockAnalyses2);

      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue({
        isSuccess: true,
        isFailure: false,
        data: { data: [], count: 0 },
      } as never);

      const { result } = renderHook(() =>
        useNavigationBadges({ userId: mockUserId, enabled: true, refreshInterval: 10000 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initial count
      expect(result.current.badges.analysis).toBe(1);

      // Advance time to trigger refresh
      vi.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(result.current.badges.analysis).toBe(2);
      });
    });

    it("should not refresh when disabled", async () => {
      const { result } = renderHook(() =>
        useNavigationBadges({ userId: mockUserId, enabled: false })
      );

      expect(result.current.loading).toBe(false);
      expect(AnalysisStorageService.loadAnalyses).not.toHaveBeenCalled();
    });

    it("should handle manual refresh", async () => {
      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});
      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue({
        isSuccess: true,
        isFailure: false,
        data: { data: [], count: 0 },
      } as never);

      const { result } = renderHook(() =>
        useNavigationBadges({ userId: mockUserId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Trigger manual refresh
      await result.current.refreshBadges();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(AnalysisStorageService.loadAnalyses).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error Handling", () => {
    it("should handle repository errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});
      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue({
        isSuccess: false,
        isFailure: true,
        error: new Error("Database error"),
      } as never);

      const { result } = renderHook(() =>
        useNavigationBadges({ userId: mockUserId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should return 0 for counts that failed
      expect(result.current.badges.reports).toBe(0);
      expect(result.current.badges.history).toBe(0);

      consoleErrorSpy.mockRestore();
    });

    it("should handle storage errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(AnalysisStorageService.loadAnalyses).mockImplementation(() => {
        throw new Error("Storage error");
      });
      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue({
        isSuccess: true,
        isFailure: false,
        data: { data: [], count: 0 },
      } as never);

      const { result } = renderHook(() =>
        useNavigationBadges({ userId: mockUserId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should return 0 for counts that failed
      expect(result.current.badges.analysis).toBe(0);

      consoleErrorSpy.mockRestore();
    });
  });
});
