/**
 * useReportData Hook Tests
 * Comprehensive tests for report data loading and management
 * Target Coverage: 85%+
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { ReportData } from "@/components/reports/ReportDataConverter";
import { convertDatabaseAnalysisToReportData } from "@/components/reports/ReportDataConverter";
import { useAnalysisLoader } from "@/hooks/useAnalysisLoader";
import { useReportData } from "@/hooks/useReportData";
import { useReportUrlParams } from "@/hooks/useReportUrlParams";
import type { AnalysisWithDetails, DailyEntryRecord } from "@/lib/repositories/analysis-repository";
import { weekNavigationService } from "@/lib/services/week-navigation-service";

// Mock dependencies
vi.mock("@/hooks/useReportUrlParams");
vi.mock("@/hooks/useAnalysisLoader");
vi.mock("@/lib/services/week-navigation-service");
vi.mock("@/components/reports/ReportDataConverter");

describe("useReportData", () => {
  const mockUserId = "123e4567-e89b-12d3-a456-426614174000";

  const mockDailyEntry: DailyEntryRecord = {
    id: "1",
    analysis_id: "analysis-123",
    date: "2024-01-01",
    day_of_week: 1,
    consignments: 50,
    rate: 2.0,
    base_payment: 100,
    pickups: 0,
    pickup_total: 0,
    unloading_bonus: 30,
    attendance_bonus: 25,
    early_bonus: 50,
    expected_total: 205,
    paid_amount: 205,
    difference: 0,
    status: "balanced",
    created_at: "2024-01-01T00:00:00.000Z",
  };

  const mockAnalysisData: AnalysisWithDetails = {
    id: "analysis-123",
    user_id: mockUserId,
    fingerprint: "fp_test",
    source: "upload",
    status: "completed",
    period_start: "2024-01-01",
    period_end: "2024-01-07",
    rules_version: 1,
    working_days: 5,
    total_consignments: 250,
    metadata: {},
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    daily_entries: [mockDailyEntry],
  };

  const mockReportData: ReportData = {
    period: "2024-01-01 - 2024-01-07",
    reportType: "Weekly Report",
    generatedDate: "2024-01-07",
    totalDays: 5,
    status: "Payment Complete - Exact Match",
    dailyEntries: [],
    totals: {
      consignments: 250,
      basePay: 500,
      pickups: 0,
      bonuses: 525,
      expected: 1025,
      paid: 1025,
      difference: 0,
    },
    breakdown: {
      consignments: 250,
      pickups: 0,
      unloading: 180,
      attendance: 125,
      early: 200,
      total: 505,
    },
  };

  const mockUrlParams = {
    analysisId: null,
    dayFilter: null,
    weekFilter: null,
    startDate: null,
    endDate: null,
  };

  const mockFinalParams = {
    finalAnalysisId: "analysis-123",
    finalWeekFilter: null,
    finalStartDate: null,
    finalEndDate: null,
    selectedWeek: null,
    weekAnalysisId: null,
  };

  // Create stable mock functions OUTSIDE beforeEach to maintain same reference across renders
  const mockExtractUrlParameters = vi.fn();
  const mockDetermineFinalParameters = vi.fn();
  const mockLoadAnalysisData = vi.fn();
  const mockFilterDailyEntries = vi.fn();
  const mockLoadLatestAnalysis = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Reset mock return values without creating new function instances
    mockExtractUrlParameters.mockReturnValue(mockUrlParams);
    mockDetermineFinalParameters.mockReturnValue(mockFinalParams);
    mockLoadAnalysisData.mockResolvedValue(mockAnalysisData);
    mockFilterDailyEntries.mockImplementation((entries) => entries);
    mockLoadLatestAnalysis.mockResolvedValue(null);

    // Default mock implementations - RETURN THE SAME FUNCTION REFERENCES
    (useReportUrlParams as Mock).mockReturnValue({
      extractUrlParameters: mockExtractUrlParameters,
      determineFinalParameters: mockDetermineFinalParameters,
    });

    (useAnalysisLoader as Mock).mockReturnValue({
      loadAnalysisData: mockLoadAnalysisData,
      filterDailyEntries: mockFilterDailyEntries,
      loadLatestAnalysis: mockLoadLatestAnalysis,
    });

    (convertDatabaseAnalysisToReportData as Mock).mockReturnValue(mockReportData);

    (weekNavigationService.clearSelectedWeek as Mock) = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // 1. Initial State Tests
  // =============================================================================
  describe("Initial State", () => {
    it("should initialize with loading state", async () => {
      const { result } = renderHook(() => useReportData(mockUserId));

      // Check initial state immediately (synchronous)
      expect(result.current.loading).toBe(true);
      expect(result.current.reportData).toBeNull();
      expect(result.current.isDailyReport).toBe(false);
      expect(result.current.currentAnalysisId).toBeNull();

      // Note: requestedAnalysisId is set during the first effect run
      // Wait for the hook to complete to clean up properly
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("should not load when userId is undefined", async () => {
      const { result } = renderHook(() => useReportData(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockLoadAnalysisData).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // 2. Successful Data Loading Tests
  // =============================================================================
  describe("Successful Data Loading", () => {
    it("should load and process analysis data successfully", async () => {
      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.reportData).toEqual(mockReportData);
      expect(result.current.currentAnalysisId).toBe("analysis-123");
      expect(result.current.isDailyReport).toBe(false);
    });

    it("should call loadAnalysisData with correct parameters", async () => {
      renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(mockLoadAnalysisData).toHaveBeenCalledWith(mockUserId, "analysis-123");
      });
    });

    it("should filter daily entries before converting", async () => {
      renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(mockFilterDailyEntries).toHaveBeenCalledWith(
          mockAnalysisData.daily_entries,
          null, // dayFilter
          null, // weekFilter
          null, // startDate
          null // endDate
        );
      });
    });

    it("should convert filtered data to report format", async () => {
      renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(convertDatabaseAnalysisToReportData).toHaveBeenCalledWith(
          mockAnalysisData,
          mockAnalysisData.daily_entries,
          null, // dayFilter
          null, // weekFilter
          null, // startDate
          null // endDate
        );
      });
    });

    it("should set requestedAnalysisId from finalParams", async () => {
      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.requestedAnalysisId).toBe("analysis-123");
      });
    });
  });

  // =============================================================================
  // 3. Daily Report Detection Tests
  // =============================================================================
  describe("Daily Report Detection", () => {
    it("should detect daily report when dayFilter is present", async () => {
      const urlParamsWithDay = { ...mockUrlParams, dayFilter: "2024-01-01" };

      // Use stable references and update return values
      mockExtractUrlParameters.mockReturnValue(urlParamsWithDay);
      mockDetermineFinalParameters.mockReturnValue(mockFinalParams);

      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.isDailyReport).toBe(true);
      });
    });

    it("should detect daily report when totalDays is 1 and type is Daily Report", async () => {
      const dailyReportData = {
        ...mockReportData,
        totalDays: 1,
        reportType: "Daily Report",
      };

      (convertDatabaseAnalysisToReportData as Mock).mockReturnValue(dailyReportData);

      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.isDailyReport).toBe(true);
      });
    });

    it("should not set daily report for weekly data", async () => {
      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.isDailyReport).toBe(false);
        expect(result.current.reportData?.reportType).toBe("Weekly Report");
      });
    });
  });

  // =============================================================================
  // 4. Filtering Tests
  // =============================================================================
  describe("Entry Filtering", () => {
    it("should apply day filter when present", async () => {
      const urlParamsWithDay = { ...mockUrlParams, dayFilter: "2024-01-01" };

      // Use stable references and update return values
      mockExtractUrlParameters.mockReturnValue(urlParamsWithDay);
      mockDetermineFinalParameters.mockReturnValue(mockFinalParams);

      renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(mockFilterDailyEntries).toHaveBeenCalledWith(
          mockAnalysisData.daily_entries,
          "2024-01-01",
          null,
          null,
          null
        );
      });
    });

    it("should apply week filter with date range", async () => {
      const finalParamsWithWeek = {
        ...mockFinalParams,
        finalWeekFilter: "week-1",
        finalStartDate: "2024-01-01",
        finalEndDate: "2024-01-07",
      };

      // Use stable references and update return values
      mockExtractUrlParameters.mockReturnValue(mockUrlParams);
      mockDetermineFinalParameters.mockReturnValue(finalParamsWithWeek);

      renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(mockFilterDailyEntries).toHaveBeenCalledWith(
          mockAnalysisData.daily_entries,
          null,
          "week-1",
          "2024-01-01",
          "2024-01-07"
        );
      });
    });

    it("should handle empty daily_entries array", async () => {
      const analysisWithoutEntries = {
        ...mockAnalysisData,
        daily_entries: [],
      };

      mockLoadAnalysisData.mockResolvedValue(analysisWithoutEntries);

      renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(mockFilterDailyEntries).toHaveBeenCalledWith([], null, null, null, null);
      });
    });
  });

  // =============================================================================
  // 5. Week Navigation Cleanup Tests
  // =============================================================================
  describe("Week Navigation Cleanup", () => {
    it("should clear selected week when appropriate", async () => {
      // Use fake timers for this specific test
      vi.useFakeTimers();

      const finalParamsWithWeek = {
        ...mockFinalParams,
        selectedWeek: "week-1",
        weekAnalysisId: "analysis-123",
        finalAnalysisId: null, // No analysisId in URL
      };

      const urlParamsWithoutAnalysisId = { ...mockUrlParams, analysisId: null };

      // Use stable references and update return values
      mockExtractUrlParameters.mockReturnValue(urlParamsWithoutAnalysisId);
      mockDetermineFinalParameters.mockReturnValue(finalParamsWithWeek);

      const { result } = renderHook(() => useReportData(mockUserId));

      // Wait for promises to resolve (need real time for this)
      await vi.waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 1000 }
      );

      // Now advance the timer for the clearSelectedWeek setTimeout (1000ms)
      vi.advanceTimersByTime(1000);

      expect(weekNavigationService.clearSelectedWeek).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should not clear week when analysisId is in URL", async () => {
      vi.useFakeTimers();

      const finalParamsWithWeek = {
        ...mockFinalParams,
        selectedWeek: "week-1",
        weekAnalysisId: "analysis-123",
      };

      const urlParamsWithAnalysisId = { ...mockUrlParams, analysisId: "analysis-123" };

      // Use stable references and update return values
      mockExtractUrlParameters.mockReturnValue(urlParamsWithAnalysisId);
      mockDetermineFinalParameters.mockReturnValue(finalParamsWithWeek);

      const { result } = renderHook(() => useReportData(mockUserId));

      // Wait for loading to complete
      await vi.waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 1000 }
      );

      // Advance timers
      vi.advanceTimersByTime(1000);

      expect(weekNavigationService.clearSelectedWeek).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should not clear week when no selectedWeek", async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useReportData(mockUserId));

      // Wait for loading to complete
      await vi.waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 1000 }
      );

      // Advance timers
      vi.advanceTimersByTime(1000);

      expect(weekNavigationService.clearSelectedWeek).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // =============================================================================
  // 6. Fallback Behavior Tests
  // =============================================================================
  describe("Fallback to Latest Analysis", () => {
    it("should load latest analysis when no analysis ID and no data found", async () => {
      const finalParamsNoId = { ...mockFinalParams, finalAnalysisId: null };

      // Use stable references and update return values
      mockExtractUrlParameters.mockReturnValue(mockUrlParams);
      mockDetermineFinalParameters.mockReturnValue(finalParamsNoId);

      mockLoadAnalysisData.mockResolvedValue(null);
      mockLoadLatestAnalysis.mockResolvedValue(mockAnalysisData);

      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockLoadLatestAnalysis).toHaveBeenCalledWith(mockUserId);
      expect(result.current.reportData).toEqual(mockReportData);
      expect(result.current.currentAnalysisId).toBe("analysis-123");
    });

    it("should set reportData to null when latest analysis not found", async () => {
      const finalParamsNoId = { ...mockFinalParams, finalAnalysisId: null };

      // Use stable references and update return values
      mockExtractUrlParameters.mockReturnValue(mockUrlParams);
      mockDetermineFinalParameters.mockReturnValue(finalParamsNoId);

      mockLoadAnalysisData.mockResolvedValue(null);
      mockLoadLatestAnalysis.mockResolvedValue(null);

      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.reportData).toBeNull();
    });

    it("should set reportData to null when requested analysis not found", async () => {
      mockLoadAnalysisData.mockResolvedValue(null);

      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.reportData).toBeNull();
    });
  });

  // =============================================================================
  // 7. Error Handling Tests
  // =============================================================================
  describe("Error Handling", () => {
    it("should handle loadAnalysisData errors gracefully", async () => {
      mockLoadAnalysisData.mockRejectedValue(new Error("Load failed"));

      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(console.error).toHaveBeenCalledWith("Error loading analysis data:", expect.any(Error));
      expect(result.current.reportData).toBeNull();
    });

    it("should handle filterDailyEntries errors", async () => {
      mockFilterDailyEntries.mockImplementation(() => {
        throw new Error("Filter failed");
      });

      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(console.error).toHaveBeenCalled();
      expect(result.current.reportData).toBeNull();
    });

    it("should handle convertDatabaseAnalysisToReportData errors", async () => {
      (convertDatabaseAnalysisToReportData as Mock).mockImplementation(() => {
        throw new Error("Conversion failed");
      });

      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(console.error).toHaveBeenCalled();
      expect(result.current.reportData).toBeNull();
    });

    it("should maintain loading: false after error", async () => {
      mockLoadAnalysisData.mockRejectedValue(new Error("Error"));

      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Loading should stay false
      expect(result.current.loading).toBe(false);
    });
  });

  // =============================================================================
  // 8. Effect Dependencies Tests
  // =============================================================================
  describe("Effect Dependencies", () => {
    it("should reload when userId changes", async () => {
      const { rerender } = renderHook(
        ({ userId }: { userId: string | undefined }) => useReportData(userId),
        { initialProps: { userId: mockUserId } }
      );

      await waitFor(() => {
        expect(mockLoadAnalysisData).toHaveBeenCalledTimes(1);
      });

      const newUserId = "987e6543-e89b-12d3-a456-426614174999";
      rerender({ userId: newUserId });

      await waitFor(() => {
        expect(mockLoadAnalysisData).toHaveBeenCalledTimes(2);
        expect(mockLoadAnalysisData).toHaveBeenCalledWith(newUserId, "analysis-123");
      });
    });

    it("should handle userId changing to undefined", async () => {
      const { result, rerender } = renderHook(
        ({ userId }: { userId: string | undefined }) => useReportData(userId),
        { initialProps: { userId: mockUserId as string | undefined } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender({ userId: undefined });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  // =============================================================================
  // 9. Integration & Complex Scenarios
  // =============================================================================
  describe("Integration Scenarios", () => {
    it("should handle complete workflow with all features", async () => {
      const urlParamsWithDay = {
        analysisId: "analysis-123",
        dayFilter: "2024-01-01",
        weekFilter: null,
        startDate: null,
        endDate: null,
      };

      const finalParamsComplete = {
        finalAnalysisId: "analysis-123",
        finalWeekFilter: null,
        finalStartDate: null,
        finalEndDate: null,
        selectedWeek: null,
        weekAnalysisId: null,
      };

      // Use stable references and update return values
      mockExtractUrlParameters.mockReturnValue(urlParamsWithDay);
      mockDetermineFinalParameters.mockReturnValue(finalParamsComplete);

      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.reportData).toEqual(mockReportData);
      expect(result.current.isDailyReport).toBe(true);
      expect(result.current.currentAnalysisId).toBe("analysis-123");
      expect(result.current.requestedAnalysisId).toBe("analysis-123");
    });

    it("should process latest analysis with correct parameters", async () => {
      const finalParamsNoId = { ...mockFinalParams, finalAnalysisId: null };

      // Use stable references and update return values
      mockExtractUrlParameters.mockReturnValue(mockUrlParams);
      mockDetermineFinalParameters.mockReturnValue(finalParamsNoId);

      const latestAnalysis = { ...mockAnalysisData, id: "latest-789" };

      mockLoadAnalysisData.mockResolvedValue(null);
      mockLoadLatestAnalysis.mockResolvedValue(latestAnalysis);

      const { result } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentAnalysisId).toBe("latest-789");
      expect(convertDatabaseAnalysisToReportData).toHaveBeenCalledWith(
        latestAnalysis,
        expect.any(Array),
        null,
        null,
        null,
        null
      );
    });

    it("should maintain consistent state across multiple rerenders", async () => {
      const { result, rerender } = renderHook(() => useReportData(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstReportData = result.current.reportData;

      // Rerender without changing props
      rerender();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // State should be consistent
      expect(result.current.reportData).toBe(firstReportData);
    });
  });
});
