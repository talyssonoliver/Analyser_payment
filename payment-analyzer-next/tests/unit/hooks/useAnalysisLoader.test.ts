/**
 * useAnalysisLoader Hook Tests
 * Comprehensive tests for analysis loading, validation, and transformation
 * Target Coverage: 85%+
 */

import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { useAnalysisLoader } from "@/hooks/useAnalysisLoader";
import type { AnalysisWithDetails, DailyEntryRecord } from "@/lib/repositories/analysis-repository";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import { Result } from "@/lib/utils/errors";

// Mock dependencies
vi.mock("@/lib/repositories/analysis-repository", () => ({
  analysisRepository: {
    getAnalysisById: vi.fn(),
    findAnalysisByFingerprint: vi.fn(),
    getUserAnalyses: vi.fn(),
  },
}));

vi.mock("@/lib/services/analysis-storage-service", () => ({
  AnalysisStorageService: {
    loadAnalysis: vi.fn(),
  },
}));

describe("useAnalysisLoader", () => {
  const mockUserId = "123e4567-e89b-12d3-a456-426614174000";

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console warnings/errors during tests
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // 1. validateAnalysisId() Tests
  // =============================================================================
  describe("validateAnalysisId", () => {
    it("should recognize valid UUID format", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      expect(result.current.validateAnalysisId(validUuid)).toBe("uuid");
    });

    it("should recognize UUID in various cases", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const upperCaseUuid = "123E4567-E89B-12D3-A456-426614174000";
      const mixedCaseUuid = "123e4567-E89B-12d3-A456-426614174000";

      expect(result.current.validateAnalysisId(upperCaseUuid)).toBe("uuid");
      expect(result.current.validateAnalysisId(mixedCaseUuid)).toBe("uuid");
    });

    it("should recognize valid session ID format", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const validSessionId = "analysis-12345";
      expect(result.current.validateAnalysisId(validSessionId)).toBe("session");
    });

    it("should handle various session ID numbers", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      expect(result.current.validateAnalysisId("analysis-1")).toBe("session");
      expect(result.current.validateAnalysisId("analysis-999999")).toBe("session");
      expect(result.current.validateAnalysisId("analysis-0")).toBe("session");
    });

    it("should return invalid for malformed UUIDs", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      expect(result.current.validateAnalysisId("123e4567-e89b-12d3-a456")).toBe("invalid"); // Too short
      expect(result.current.validateAnalysisId("123e4567-e89b-12d3-a456-426614174000-extra")).toBe(
        "invalid"
      ); // Too long
      expect(result.current.validateAnalysisId("not-a-uuid")).toBe("invalid");
    });

    it("should return invalid for malformed session IDs", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      expect(result.current.validateAnalysisId("analysis-")).toBe("invalid"); // Missing number
      expect(result.current.validateAnalysisId("analysis-abc")).toBe("invalid"); // Letters instead of numbers
      expect(result.current.validateAnalysisId("session-123")).toBe("invalid"); // Wrong prefix
    });

    it("should return invalid for empty or whitespace strings", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      expect(result.current.validateAnalysisId("")).toBe("invalid");
      expect(result.current.validateAnalysisId("   ")).toBe("invalid");
    });
  });

  // =============================================================================
  // 2. transformLocalStorageAnalysis() Tests
  // =============================================================================
  describe("transformLocalStorageAnalysis", () => {
    const createMockLocalAnalysis = () => ({
      id: "analysis-123",
      dailyData: {
        "2024-01-01": {
          consignments: 50,
          paidAmount: 205,
          expectedTotal: 200,
          unloadingBonus: 30,
          attendanceBonus: 25,
          earlyBonus: 50,
          rate: 2.0,
          basePayment: 100,
          pickups: 0,
          pickupTotal: 0,
          status: "overpaid",
        },
        "2024-01-02": {
          consignments: 60,
          paidAmount: 240,
          expectedTotal: 240,
          unloadingBonus: 30,
          attendanceBonus: 25,
          earlyBonus: 50,
          rate: 2.0,
          basePayment: 120,
          pickups: 0,
          pickupTotal: 0,
          status: "balanced",
        },
      },
      createdAt: "2024-01-01T00:00:00.000Z",
      period: "2024-01-01 - 2024-01-07",
      status: "completed",
      summary: {
        workingDays: 2,
        totalConsignments: 110,
      },
      totals: {
        base_total: 220,
        pickup_total: 0,
        bonus_total: 210,
        expected_total: 440,
        paid_total: 445,
        difference_total: 5,
      },
    });

    it("should transform valid localStorage analysis to database format", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const mockData = createMockLocalAnalysis();
      const transformed = result.current.transformLocalStorageAnalysis(mockData);

      expect(transformed).not.toBeNull();
      expect(transformed?.id).toBe("analysis-123");
      expect(transformed?.source).toBe("manual");
      expect(transformed?.status).toBe("completed");
    });

    it("should correctly transform daily data to daily_entries array", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const mockData = createMockLocalAnalysis();
      const transformed = result.current.transformLocalStorageAnalysis(mockData);

      expect(transformed?.daily_entries).toHaveLength(2);
      expect(transformed?.daily_entries?.[0]).toMatchObject({
        date: "2024-01-01",
        consignments: 50,
        paid_amount: 205,
        expected_total: 200,
        difference: 5, // 205 - 200
        status: "overpaid",
      });
    });

    it("should calculate difference correctly for each entry", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const mockData = createMockLocalAnalysis();
      const transformed = result.current.transformLocalStorageAnalysis(mockData);

      const entry1 = transformed?.daily_entries?.[0];
      const entry2 = transformed?.daily_entries?.[1];

      expect(entry1?.difference).toBe(5); // 205 - 200
      expect(entry2?.difference).toBe(0); // 240 - 240
    });

    it("should parse period correctly to period_start and period_end", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const mockData = createMockLocalAnalysis();
      const transformed = result.current.transformLocalStorageAnalysis(mockData);

      expect(transformed?.period_start).toContain("2024-01-01");
      expect(transformed?.period_end).toContain("2024-01-07");
    });

    it("should transform analysis_totals correctly", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const mockData = createMockLocalAnalysis();
      const transformed = result.current.transformLocalStorageAnalysis(mockData);

      expect(transformed?.analysis_totals).toMatchObject({
        base_total: 220,
        pickup_total: 0,
        bonus_total: 210,
        expected_total: 440,
        paid_total: 445,
        difference_total: 5,
      });
    });

    it("should handle analysis without totals", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const mockData = {
        ...createMockLocalAnalysis(),
        totals: undefined,
      };
      const transformed = result.current.transformLocalStorageAnalysis(mockData);

      expect(transformed?.analysis_totals).toBeUndefined();
    });

    it("should handle analysis without dailyData", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const mockData = {
        ...createMockLocalAnalysis(),
        dailyData: undefined,
      };
      const transformed = result.current.transformLocalStorageAnalysis(mockData);

      expect(transformed?.daily_entries).toEqual([]);
    });

    it("should return null for null input", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const transformed = result.current.transformLocalStorageAnalysis(null);
      expect(transformed).toBeNull();
    });

    it("should return null for undefined input", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const transformed = result.current.transformLocalStorageAnalysis(undefined);
      expect(transformed).toBeNull();
    });

    it("should use default values for missing fields", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const minimalData = {
        id: "analysis-456",
      };
      const transformed = result.current.transformLocalStorageAnalysis(minimalData);

      expect(transformed?.working_days).toBe(0);
      expect(transformed?.total_consignments).toBe(0);
      expect(transformed?.daily_entries).toEqual([]);
    });

    it("should handle missing bonus fields in daily data", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const dataWithMissingBonuses = {
        id: "analysis-789",
        dailyData: {
          "2024-01-01": {
            consignments: 50,
            paidAmount: 100,
            expectedTotal: 100,
          },
        },
        createdAt: "2024-01-01T00:00:00.000Z",
        period: "2024-01-01 - 2024-01-01",
      };
      const transformed = result.current.transformLocalStorageAnalysis(dataWithMissingBonuses);

      expect(transformed?.daily_entries?.[0]).toMatchObject({
        unloading_bonus: 0,
        attendance_bonus: 0,
        early_bonus: 0,
        pickups: 0,
        pickup_total: 0,
      });
    });

    it("should set day_of_week from date", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const mockData = {
        id: "analysis-999",
        dailyData: {
          "2024-01-01": {
            // Monday
            consignments: 50,
            paidAmount: 100,
            expectedTotal: 100,
          },
          "2024-01-06": {
            // Saturday
            consignments: 30,
            paidAmount: 90,
            expectedTotal: 90,
          },
        },
      };
      const transformed = result.current.transformLocalStorageAnalysis(mockData);

      expect(transformed?.daily_entries?.[0].day_of_week).toBe(1); // Monday
      expect(transformed?.daily_entries?.[1].day_of_week).toBe(6); // Saturday
    });
  });

  // =============================================================================
  // 3. loadAnalysisBySessionId() Tests
  // =============================================================================
  describe("loadAnalysisBySessionId", () => {
    it("should load analysis from localStorage when found", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const mockData = {
        id: "analysis-123",
        dailyData: {},
        createdAt: "2024-01-01T00:00:00.000Z",
        period: "2024-01-01 - 2024-01-07",
      };

      (AnalysisStorageService.loadAnalysis as Mock).mockReturnValue(mockData);

      const analysis = await result.current.loadAnalysisData(mockUserId, "analysis-123");

      expect(AnalysisStorageService.loadAnalysis).toHaveBeenCalledWith("analysis-123");
      expect(analysis).not.toBeNull();
      expect(analysis?.id).toBe("analysis-123");
    });

    it("should return null when localStorage has no data", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      (AnalysisStorageService.loadAnalysis as Mock).mockReturnValue(null);

      const analysis = await result.current.loadAnalysisData(mockUserId, "analysis-123");

      expect(analysis).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle invalid session ID", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const analysis = await result.current.loadAnalysisData(mockUserId, "invalid-id");

      expect(analysis).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Invalid analysis ID format"),
        "invalid-id"
      );
    });
  });

  // =============================================================================
  // 4. loadAnalysisByUuid() Tests
  // =============================================================================
  describe("loadAnalysisByUuid", () => {
    const mockAnalysis: AnalysisWithDetails = {
      id: "123e4567-e89b-12d3-a456-426614174000",
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
      daily_entries: [],
    };

    it("should load analysis by direct ID lookup", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      (analysisRepository.getAnalysisById as Mock).mockResolvedValue(Result.success(mockAnalysis));

      const analysis = await result.current.loadAnalysisData(
        mockUserId,
        "123e4567-e89b-12d3-a456-426614174000"
      );

      expect(analysisRepository.getAnalysisById).toHaveBeenCalledWith(
        "123e4567-e89b-12d3-a456-426614174000"
      );
      expect(analysis).toEqual(mockAnalysis);
    });

    it("should fall back to fingerprint search when direct ID fails", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      // Direct lookup fails
      (analysisRepository.getAnalysisById as Mock)
        .mockResolvedValueOnce(Result.success(null))
        .mockResolvedValueOnce(Result.success(mockAnalysis));

      // Fingerprint lookup succeeds
      (analysisRepository.findAnalysisByFingerprint as Mock).mockResolvedValue(
        Result.success({ id: mockAnalysis.id })
      );

      const analysis = await result.current.loadAnalysisData(
        mockUserId,
        "123e4567-e89b-12d3-a456-426614174000"
      );

      expect(analysisRepository.findAnalysisByFingerprint).toHaveBeenCalled();
      expect(analysis).toEqual(mockAnalysis);
    });

    it("should fall back to localStorage when database fails", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const mockLocalData = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        dailyData: {},
      };

      (analysisRepository.getAnalysisById as Mock).mockResolvedValue(Result.success(null));
      (analysisRepository.findAnalysisByFingerprint as Mock).mockResolvedValue(
        Result.success(null)
      );
      (AnalysisStorageService.loadAnalysis as Mock).mockReturnValue(mockLocalData);

      const analysis = await result.current.loadAnalysisData(
        mockUserId,
        "123e4567-e89b-12d3-a456-426614174000"
      );

      expect(AnalysisStorageService.loadAnalysis).toHaveBeenCalled();
      expect(analysis).not.toBeNull();
      expect(analysis?.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("should return null when all lookups fail", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      (analysisRepository.getAnalysisById as Mock).mockResolvedValue(Result.success(null));
      (analysisRepository.findAnalysisByFingerprint as Mock).mockResolvedValue(
        Result.success(null)
      );
      (AnalysisStorageService.loadAnalysis as Mock).mockReturnValue(null);

      const analysis = await result.current.loadAnalysisData(
        mockUserId,
        "123e4567-e89b-12d3-a456-426614174000"
      );

      expect(analysis).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // 5. loadLatestAnalysis() Tests
  // =============================================================================
  describe("loadLatestAnalysis", () => {
    const mockAnalysis: AnalysisWithDetails = {
      id: "123e4567-e89b-12d3-a456-426614174000",
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
      daily_entries: [],
    };

    it("should load latest analysis when ID is null", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      (analysisRepository.getUserAnalyses as Mock).mockResolvedValue(
        Result.success({
          data: [{ id: mockAnalysis.id }],
          count: 1,
        })
      );
      (analysisRepository.getAnalysisById as Mock).mockResolvedValue(Result.success(mockAnalysis));

      const analysis = await result.current.loadAnalysisData(mockUserId, null);

      expect(analysisRepository.getUserAnalyses).toHaveBeenCalledWith(mockUserId, {
        limit: 1,
        orderBy: "created_at",
        order: "desc",
      });
      expect(analysis).toEqual(mockAnalysis);
    });

    it("should return null when no analyses exist", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      (analysisRepository.getUserAnalyses as Mock).mockResolvedValue(
        Result.success({
          data: [],
          count: 0,
        })
      );

      const analysis = await result.current.loadLatestAnalysis(mockUserId);

      expect(analysis).toBeNull();
    });

    it("should handle error when loading user analyses", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      (analysisRepository.getUserAnalyses as Mock).mockResolvedValue(
        Result.failure(new Error("Database error"))
      );

      const analysis = await result.current.loadLatestAnalysis(mockUserId);

      expect(analysis).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle error when loading analysis details", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      (analysisRepository.getUserAnalyses as Mock).mockResolvedValue(
        Result.success({
          data: [{ id: mockAnalysis.id }],
          count: 1,
        })
      );
      (analysisRepository.getAnalysisById as Mock).mockResolvedValue(
        Result.failure(new Error("Database error"))
      );

      const analysis = await result.current.loadLatestAnalysis(mockUserId);

      expect(analysis).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // 6. filterDailyEntries() Tests
  // =============================================================================
  describe("filterDailyEntries", () => {
    const createMockEntries = (): DailyEntryRecord[] => [
      {
        id: "1",
        analysis_id: "test",
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
      },
      {
        id: "2",
        analysis_id: "test",
        date: "2024-01-02",
        day_of_week: 2,
        consignments: 60,
        rate: 2.0,
        base_payment: 120,
        pickups: 0,
        pickup_total: 0,
        unloading_bonus: 30,
        attendance_bonus: 25,
        early_bonus: 50,
        expected_total: 225,
        paid_amount: 225,
        difference: 0,
        status: "balanced",
        created_at: "2024-01-02T00:00:00.000Z",
      },
      {
        id: "3",
        analysis_id: "test",
        date: "2024-01-08",
        day_of_week: 1,
        consignments: 55,
        rate: 2.0,
        base_payment: 110,
        pickups: 0,
        pickup_total: 0,
        unloading_bonus: 30,
        attendance_bonus: 25,
        early_bonus: 50,
        expected_total: 215,
        paid_amount: 215,
        difference: 0,
        status: "balanced",
        created_at: "2024-01-08T00:00:00.000Z",
      },
    ];

    it("should return all entries when no filters applied", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const entries = createMockEntries();
      const filtered = result.current.filterDailyEntries(entries);

      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(entries);
    });

    it("should filter by specific day", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const entries = createMockEntries();
      const filtered = result.current.filterDailyEntries(entries, "2024-01-01");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].date).toBe("2024-01-01");
    });

    it("should filter by week range", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const entries = createMockEntries();
      const filtered = result.current.filterDailyEntries(
        entries,
        null,
        "week-1",
        "2024-01-01",
        "2024-01-07"
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => e.date >= "2024-01-01" && e.date <= "2024-01-07")).toBe(true);
    });

    it("should prioritize day filter over week filter", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const entries = createMockEntries();
      const filtered = result.current.filterDailyEntries(
        entries,
        "2024-01-08", // Day filter
        "week-1",
        "2024-01-01",
        "2024-01-07" // Week filter that excludes this day
      );

      // Day filter takes precedence
      expect(filtered).toHaveLength(1);
      expect(filtered[0].date).toBe("2024-01-08");
    });

    it("should handle empty entries array", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const filtered = result.current.filterDailyEntries([]);

      expect(filtered).toEqual([]);
    });

    it("should handle null filters gracefully", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const entries = createMockEntries();
      const filtered = result.current.filterDailyEntries(entries, null, null, null, null);

      expect(filtered).toEqual(entries);
    });

    it("should filter with inclusive boundaries", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const entries = createMockEntries();
      const filtered = result.current.filterDailyEntries(
        entries,
        null,
        "week-1",
        "2024-01-01", // Start boundary
        "2024-01-02" // End boundary
      );

      expect(filtered).toHaveLength(2);
      expect(filtered[0].date).toBe("2024-01-01");
      expect(filtered[1].date).toBe("2024-01-02");
    });

    it("should return empty array when no entries match filter", () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const entries = createMockEntries();
      const filtered = result.current.filterDailyEntries(entries, "2024-12-31"); // Non-existent date

      expect(filtered).toEqual([]);
    });
  });

  // =============================================================================
  // 7. Integration & Edge Cases
  // =============================================================================
  describe("Integration Scenarios", () => {
    it("should maintain stable references for callbacks", () => {
      const { result, rerender } = renderHook(() => useAnalysisLoader());

      const firstLoadData = result.current.loadAnalysisData;
      const firstFilterEntries = result.current.filterDailyEntries;

      rerender();

      // Callbacks should be stable (useCallback)
      expect(result.current.loadAnalysisData).toBe(firstLoadData);
      expect(result.current.filterDailyEntries).toBe(firstFilterEntries);
    });

    it("should handle concurrent load requests", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const mockData = {
        id: "analysis-123",
        dailyData: {},
      };

      (AnalysisStorageService.loadAnalysis as Mock).mockReturnValue(mockData);

      // Simulate concurrent loads
      const [result1, result2, result3] = await Promise.all([
        result.current.loadAnalysisData(mockUserId, "analysis-123"),
        result.current.loadAnalysisData(mockUserId, "analysis-123"),
        result.current.loadAnalysisData(mockUserId, "analysis-123"),
      ]);

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result3).not.toBeNull();
    });

    it("should handle mixed UUID and session ID requests", async () => {
      const { result } = renderHook(() => useAnalysisLoader());

      const uuidData = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        user_id: mockUserId,
        source: "upload" as const,
        status: "completed" as const,
        period_start: "2024-01-01",
        period_end: "2024-01-07",
        rules_version: 1,
        working_days: 5,
        total_consignments: 250,
        metadata: {},
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
        daily_entries: [],
      };

      const sessionData = {
        id: "analysis-456",
        dailyData: {},
      };

      (analysisRepository.getAnalysisById as Mock).mockResolvedValue(Result.success(uuidData));
      (AnalysisStorageService.loadAnalysis as Mock).mockReturnValue(sessionData);

      const [uuidResult, sessionResult] = await Promise.all([
        result.current.loadAnalysisData(mockUserId, "123e4567-e89b-12d3-a456-426614174000"),
        result.current.loadAnalysisData(mockUserId, "analysis-456"),
      ]);

      expect(uuidResult?.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(sessionResult?.id).toBe("analysis-456");
    });
  });
});
