/**
 * Unit Tests for Analysis Repository
 * Comprehensive test coverage for all repository methods
 * Following Result pattern and proper mock verification
 */

import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { AnalysisRepository } from "@/lib/repositories/analysis-repository";
import { ErrorCodes } from "@/lib/utils/errors";
import type { SupabaseClient, SupabaseQueryBuilder } from "@/types/core";

// Mock query monitor
vi.mock("@/lib/utils/query-performance-monitor", () => ({
  queryMonitor: {
    trackQuery: vi.fn((_name, _table, fn) => fn()),
  },
}));

// Mock Supabase client - simplified approach
vi.mock("@/lib/supabase/client");

// Create mock Supabase client
let mockSupabaseClient: Partial<SupabaseClient>;
let mockQueryBuilder: Partial<SupabaseQueryBuilder>;

const createMockQueryBuilder = (): any => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    or: vi.fn().mockReturnThis(),
    // Make query builder thenable (awaitable)
    then: vi.fn((resolve) => {
      // Default resolution - will be overridden by specific test mocks
      resolve({ data: null, error: null, count: 0 });
    }),
  };
  return builder;
};

beforeEach(async () => {
  vi.clearAllMocks();
  mockQueryBuilder = createMockQueryBuilder();
  mockSupabaseClient = {
    from: vi.fn(() => mockQueryBuilder as SupabaseQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as any;

  // Import and mock the createClient function
  const { createClient } = await import("@/lib/supabase/client");
  vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);
});

describe("AnalysisRepository", () => {
  let repository: AnalysisRepository;

  beforeEach(() => {
    repository = new AnalysisRepository();
  });

  // =============================================================================
  // 1. createAnalysis() Tests
  // =============================================================================
  describe("createAnalysis()", () => {
    const validAnalysisData = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
      fingerprint: "fp_123456789",
      source: "upload" as const,
      periodStart: "2024-01-01",
      periodEnd: "2024-01-07",
      rulesVersion: 1,
      workingDays: 5,
      totalConsignments: 250,
      metadata: { description: "Test analysis" },
    };

    it("should create analysis successfully and return Result.success with analysis record", async () => {
      const mockAnalysis = {
        id: "analysis-123",
        user_id: validAnalysisData.userId,
        fingerprint: validAnalysisData.fingerprint,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      // Mock fingerprint check (not found)
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock insert
      (mockQueryBuilder.single as Mock).mockResolvedValueOnce({
        data: mockAnalysis,
        error: null,
      });

      const result = await repository.createAnalysis(validAnalysisData);

      expect(result.isSuccess).toBe(true);
      expect(result.data.id).toBe("analysis-123");
      expect(result.data.status).toBe("pending");
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("analyses");
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should return failure when validation fails for missing required fields", async () => {
      const invalidData = {
        ...validAnalysisData,
        userId: "", // Invalid: empty string
      };

      const result = await repository.createAnalysis(invalidData);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_INVALID_FORMAT);
      expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
    });

    it("should return failure when validation fails for invalid UUID", async () => {
      const invalidData = {
        ...validAnalysisData,
        userId: "not-a-uuid",
      };

      const result = await repository.createAnalysis(invalidData);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_INVALID_FORMAT);
    });

    it("should detect duplicate fingerprint and return failure with existing analysis ID", async () => {
      const existingAnalysis = {
        id: "existing-123",
        user_id: validAnalysisData.userId,
        fingerprint: validAnalysisData.fingerprint,
        created_at: "2024-01-01T00:00:00Z",
      };

      // Mock fingerprint check (found)
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: existingAnalysis,
        error: null,
      });

      const result = await repository.createAnalysis(validAnalysisData);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.ANALYSIS_DUPLICATE);
      expect(result.error.context?.existingAnalysisId).toBe("existing-123");
      expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
    });

    it("should check legacy fingerprint when provided", async () => {
      const dataWithLegacy = {
        ...validAnalysisData,
        fingerprint: "fp_v9_123",
      };

      // Mock v9 fingerprint check (not found)
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock successful insert
      (mockQueryBuilder.single as Mock).mockResolvedValueOnce({
        data: { id: "new-123", ...dataWithLegacy },
        error: null,
      });

      const result = await repository.createAnalysis(dataWithLegacy);

      expect(result.isSuccess).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("analyses");
    });

    it("should handle database error during insert", async () => {
      // Mock fingerprint check (not found)
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock insert error
      (mockQueryBuilder.single as Mock).mockResolvedValueOnce({
        data: null,
        error: { code: "23503", message: "Foreign key violation" },
      });

      const result = await repository.createAnalysis(validAnalysisData);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONSTRAINT_VIOLATION);
    });

    it("should store fingerprint correctly", async () => {
      // Mock fingerprint check (not found)
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const mockAnalysis = { id: "test-123", fingerprint: validAnalysisData.fingerprint };
      (mockQueryBuilder.single as Mock).mockResolvedValueOnce({
        data: mockAnalysis,
        error: null,
      });

      const result = await repository.createAnalysis(validAnalysisData);

      expect(result.isSuccess).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          fingerprint: validAnalysisData.fingerprint,
        })
      );
    });

    it('should create with status "pending" by default', async () => {
      // Mock fingerprint check (not found)
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const mockAnalysis = { id: "test-123", status: "pending" };
      (mockQueryBuilder.single as Mock).mockResolvedValueOnce({
        data: mockAnalysis,
        error: null,
      });

      const result = await repository.createAnalysis(validAnalysisData);

      expect(result.isSuccess).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
        })
      );
    });

    it("should handle unexpected errors gracefully", async () => {
      // Mock to throw unexpected error
      (mockSupabaseClient.from as Mock).mockImplementationOnce(() => {
        throw new Error("Network error");
      });

      const result = await repository.createAnalysis(validAnalysisData);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
      // Error message will be the destructuring error, not the original
      expect(result.error.context?.originalError).toBeDefined();
    });
  });

  // =============================================================================
  // 2. updateAnalysisStatus() Tests
  // =============================================================================
  describe("updateAnalysisStatus()", () => {
    const analysisId = "123e4567-e89b-12d3-a456-426614174000";

    it("should update status successfully and return Result.success", async () => {
      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await repository.updateAnalysisStatus(analysisId, "completed");

      expect(result.isSuccess).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("analyses");
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", analysisId);
    });

    it("should update with valid status transitions", async () => {
      const statuses: Array<"pending" | "processing" | "completed" | "error"> = [
        "pending",
        "processing",
        "completed",
        "error",
      ];

      for (const status of statuses) {
        (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
          data: null,
          error: null,
        });

        const result = await repository.updateAnalysisStatus(analysisId, status);

        expect(result.isSuccess).toBe(true);
        expect(mockQueryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status,
          })
        );
      }
    });

    it("should return error for invalid status", async () => {
      const result = await repository.updateAnalysisStatus(analysisId, "invalid" as any);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_INVALID_FORMAT);
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it("should return error when analysis ID is empty", async () => {
      const result = await repository.updateAnalysisStatus("", "completed");

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it("should update timestamp automatically", async () => {
      const beforeTime = new Date().toISOString();

      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await repository.updateAnalysisStatus(analysisId, "completed");

      const updateCall = (mockQueryBuilder.update as Mock).mock.calls[0][0];
      expect(updateCall.updated_at).toBeDefined();
      expect(new Date(updateCall.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
    });

    it("should include metadata when provided", async () => {
      const metadata = { processedFiles: 3, totalRecords: 150 };

      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await repository.updateAnalysisStatus(analysisId, "completed", metadata);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata,
        })
      );
    });

    it("should handle database errors", async () => {
      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await repository.updateAnalysisStatus(analysisId, "completed");

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_NOT_FOUND);
    });

    it("should handle unexpected errors", async () => {
      (mockSupabaseClient.from as Mock).mockImplementationOnce(() => {
        throw new Error("Connection timeout");
      });

      const result = await repository.updateAnalysisStatus(analysisId, "completed");

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
    });
  });

  // =============================================================================
  // 3. createDailyEntries() Tests
  // =============================================================================
  describe("createDailyEntries()", () => {
    const analysisId = "123e4567-e89b-12d3-a456-426614174000";

    const validEntries = [
      {
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
        status: "balanced" as const,
      },
      {
        date: "2024-01-02",
        day_of_week: 2,
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
        status: "balanced" as const,
      },
    ];

    it("should create daily entries successfully", async () => {
      // Mock delete existing entries
      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock insert
      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await repository.createDailyEntries(analysisId, validEntries);

      expect(result.isSuccess).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("daily_entries");
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should create multiple entries in batch", async () => {
      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await repository.createDailyEntries(analysisId, validEntries);

      expect(result.isSuccess).toBe(true);
      const insertCall = (mockQueryBuilder.insert as Mock).mock.calls[0][0];
      expect(insertCall).toHaveLength(2);
      expect(insertCall[0].analysis_id).toBe(analysisId);
      expect(insertCall[1].analysis_id).toBe(analysisId);
    });

    it("should intelligently merge duplicate dates - keep higher consignments", async () => {
      const entriesWithDuplicates = [
        { ...validEntries[0], consignments: 50, paid_amount: 0 },
        { ...validEntries[0], consignments: 55, paid_amount: 110 }, // Higher consignments
      ];

      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await repository.createDailyEntries(analysisId, entriesWithDuplicates);

      expect(result.isSuccess).toBe(true);
      const insertCall = (mockQueryBuilder.insert as Mock).mock.calls[0][0];
      expect(insertCall).toHaveLength(1); // Merged to one entry
      expect(insertCall[0].consignments).toBe(55); // Took higher value
      expect(insertCall[0].paid_amount).toBe(110);
    });

    it("should merge invoice payment with runsheet consignments", async () => {
      const runsheetEntry = {
        ...validEntries[0],
        consignments: 50,
        paid_amount: 0,
        base_payment: 100,
        expected_total: 205,
        unloading_bonus: 30,
        attendance_bonus: 25,
        early_bonus: 50,
        pickup_total: 0,
        pickups: 0,
      };

      const invoiceEntry = {
        ...validEntries[0],
        consignments: 0,
        paid_amount: 205,
        pickup_total: 15,
        pickups: 1,
        base_payment: 0,
        expected_total: 0,
        unloading_bonus: 0,
        attendance_bonus: 0,
        early_bonus: 0,
      };

      const entries = [runsheetEntry, invoiceEntry];

      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await repository.createDailyEntries(analysisId, entries);

      expect(result.isSuccess).toBe(true);
      const insertCall = (mockQueryBuilder.insert as Mock).mock.calls[0][0];
      expect(insertCall).toHaveLength(1);
      expect(insertCall[0].consignments).toBe(50); // From runsheet
      expect(insertCall[0].paid_amount).toBe(205); // From invoice
      expect(insertCall[0].pickup_total).toBe(15); // From invoice
    });

    it("should delete old entries before inserting new ones", async () => {
      (mockQueryBuilder.eq as Mock)
        .mockResolvedValueOnce({ data: null, error: null }) // delete
        .mockResolvedValueOnce({ data: null, error: null }); // insert

      await repository.createDailyEntries(analysisId, validEntries);

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("analysis_id", analysisId);
      const deleteIndex = (mockSupabaseClient.from as Mock).mock.calls.findIndex(
        (call) => call[0] === "daily_entries"
      );
      const insertIndex = (mockSupabaseClient.from as Mock).mock.calls.findIndex(
        (call, idx) => idx > deleteIndex && call[0] === "daily_entries"
      );
      expect(deleteIndex).toBeLessThan(insertIndex);
    });

    it("should return error for empty entries array", async () => {
      const result = await repository.createDailyEntries(analysisId, []);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
      expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
    });

    it("should return error for invalid analysis ID", async () => {
      const result = await repository.createDailyEntries("", validEntries);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
    });

    it("should validate entry data structure - invalid date", async () => {
      const invalidEntries = [{ ...validEntries[0], date: "invalid-date" }];

      const result = await repository.createDailyEntries(analysisId, invalidEntries);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_INVALID_DATE);
    });

    it("should handle database errors during insert", async () => {
      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: { code: "23505", message: "Duplicate entry" },
      });

      const result = await repository.createDailyEntries(analysisId, validEntries);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_DUPLICATE_ENTRY);
    });

    it("should recalculate difference after merge", async () => {
      const entries = [
        { ...validEntries[0], paid_amount: 210, expected_total: 200, difference: 0 },
      ];

      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await repository.createDailyEntries(analysisId, entries);

      const insertCall = (mockQueryBuilder.insert as Mock).mock.calls[0][0];
      expect(insertCall[0].difference).toBe(10); // 210 - 200
    });

    it("should update status based on difference after merge", async () => {
      const testCases = [
        { paid: 210, expected: 200, expectedStatus: "overpaid" },
        { paid: 190, expected: 200, expectedStatus: "underpaid" },
        { paid: 200, expected: 200, expectedStatus: "balanced" },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();

        const entries = [
          {
            ...validEntries[0],
            paid_amount: testCase.paid,
            expected_total: testCase.expected,
            difference: 0,
            status: "balanced" as const,
          },
        ];

        (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
          data: null,
          error: null,
        });

        (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
          data: null,
          error: null,
        });

        await repository.createDailyEntries(analysisId, entries);

        const insertCall = (mockQueryBuilder.insert as Mock).mock.calls[0][0];
        expect(insertCall[0].status).toBe(testCase.expectedStatus);
      }
    });
  });

  // =============================================================================
  // 4. createAnalysisTotals() Tests
  // =============================================================================
  describe("createAnalysisTotals()", () => {
    const analysisId = "123e4567-e89b-12d3-a456-426614174000";

    const validTotals = {
      base_total: 1000,
      pickup_total: 50,
      bonus_total: 525,
      unloading_bonus_total: 180,
      attendance_bonus_total: 125,
      early_bonus_total: 250,
      expected_total: 1575,
      paid_total: 1575,
      difference_total: 0,
    };

    it("should create analysis totals successfully", async () => {
      (mockQueryBuilder.eq as Mock)
        .mockResolvedValueOnce({ data: null, error: null }) // delete
        .mockResolvedValueOnce({ data: null, error: null }); // insert

      const result = await repository.createAnalysisTotals(analysisId, validTotals);

      expect(result.isSuccess).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("analysis_totals");
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should use delete-then-insert pattern", async () => {
      (mockQueryBuilder.eq as Mock)
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      await repository.createAnalysisTotals(analysisId, validTotals);

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      const deleteCalls = (mockSupabaseClient.from as Mock).mock.calls.filter(
        (call) => call[0] === "analysis_totals"
      );
      expect(deleteCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("should store all total fields correctly", async () => {
      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await repository.createAnalysisTotals(analysisId, validTotals);

      const insertCall = (mockQueryBuilder.insert as Mock).mock.calls[0][0];
      expect(insertCall.base_total).toBe(1000);
      expect(insertCall.pickup_total).toBe(50);
      expect(insertCall.bonus_total).toBe(525);
      expect(insertCall.expected_total).toBe(1575);
      expect(insertCall.paid_total).toBe(1575);
      expect(insertCall.difference_total).toBe(0);
    });

    it("should handle zero values correctly", async () => {
      const zeroTotals = {
        base_total: 0,
        pickup_total: 0,
        bonus_total: 0,
        expected_total: 0,
        paid_total: 0,
        difference_total: 0,
      };

      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await repository.createAnalysisTotals(analysisId, zeroTotals);

      expect(result.isSuccess).toBe(true);
      const insertCall = (mockQueryBuilder.insert as Mock).mock.calls[0][0];
      expect(insertCall.base_total).toBe(0);
    });

    it("should return error for invalid analysis ID", async () => {
      const result = await repository.createAnalysisTotals("", validTotals);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
    });

    it("should handle database errors", async () => {
      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: { code: "23503", message: "Foreign key violation" },
      });

      const result = await repository.createAnalysisTotals(analysisId, validTotals);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONSTRAINT_VIOLATION);
    });

    it("should include bonus breakdown fields", async () => {
      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await repository.createAnalysisTotals(analysisId, validTotals);

      const insertCall = (mockQueryBuilder.insert as Mock).mock.calls[0][0];
      expect(insertCall.unloading_bonus_total).toBe(180);
      expect(insertCall.attendance_bonus_total).toBe(125);
      expect(insertCall.early_bonus_total).toBe(250);
    });

    it("should handle unexpected errors", async () => {
      (mockSupabaseClient.from as Mock).mockImplementationOnce(() => {
        throw new Error("Database connection failed");
      });

      const result = await repository.createAnalysisTotals(analysisId, validTotals);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
    });
  });

  // =============================================================================
  // 5. createAnalysisFiles() Tests
  // =============================================================================
  describe("createAnalysisFiles()", () => {
    const analysisId = "123e4567-e89b-12d3-a456-426614174000";

    const validFiles = [
      {
        storage_path: "/files/runsheet1.pdf",
        original_name: "runsheet1.pdf",
        file_size: 102400,
        file_hash: "abc123hash",
        mime_type: "application/pdf",
        file_type: "runsheet" as const,
        parsed_data: { pages: 3, consignments: 50 },
      },
      {
        storage_path: "/files/invoice1.pdf",
        original_name: "invoice1.pdf",
        file_size: 51200,
        file_hash: "def456hash",
        mime_type: "application/pdf",
        file_type: "invoice" as const,
        parsed_data: { amount: 205 },
      },
    ];

    it("should create analysis files successfully", async () => {
      (mockQueryBuilder.eq as Mock)
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const result = await repository.createAnalysisFiles(analysisId, validFiles);

      expect(result.isSuccess).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("analysis_files");
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should create multiple file records", async () => {
      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await repository.createAnalysisFiles(analysisId, validFiles);

      const insertCall = (mockQueryBuilder.insert as Mock).mock.calls[0][0];
      expect(insertCall).toHaveLength(2);
      expect(insertCall[0].analysis_id).toBe(analysisId);
      expect(insertCall[1].analysis_id).toBe(analysisId);
    });

    it("should store file metadata correctly", async () => {
      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await repository.createAnalysisFiles(analysisId, validFiles);

      const insertCall = (mockQueryBuilder.insert as Mock).mock.calls[0][0];
      expect(insertCall[0].original_name).toBe("runsheet1.pdf");
      expect(insertCall[0].file_size).toBe(102400);
      expect(insertCall[0].file_type).toBe("runsheet");
      expect(insertCall[0].file_hash).toBe("abc123hash");
    });

    it("should return error for invalid analysis ID", async () => {
      const result = await repository.createAnalysisFiles("", validFiles);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
    });

    it("should return error for empty files array", async () => {
      const result = await repository.createAnalysisFiles(analysisId, []);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
    });

    it("should handle database errors", async () => {
      (mockQueryBuilder.eq as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      (mockQueryBuilder.insert as Mock).mockResolvedValueOnce({
        data: null,
        error: { code: "23505", message: "Duplicate file hash" },
      });

      const result = await repository.createAnalysisFiles(analysisId, validFiles);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_DUPLICATE_ENTRY);
    });
  });

  // =============================================================================
  // 6. getAnalysisById() Tests
  // =============================================================================
  describe("getAnalysisById()", () => {
    const analysisId = "123e4567-e89b-12d3-a456-426614174000";

    const mockAnalysis = {
      id: analysisId,
      user_id: "user-123",
      status: "completed",
      source: "upload",
      period_start: "2024-01-01",
      period_end: "2024-01-07",
      created_at: "2024-01-01T00:00:00Z",
    };

    const mockDailyEntries = [
      {
        id: "entry-1",
        analysis_id: analysisId,
        date: "2024-01-01",
        consignments: 50,
        paid_amount: 205,
      },
    ];

    const mockTotals = {
      id: "total-1",
      analysis_id: analysisId,
      base_total: 1000,
      expected_total: 1575,
    };

    const mockFiles = [
      {
        id: "file-1",
        analysis_id: analysisId,
        original_name: "runsheet.pdf",
      },
    ];

    it("should return analysis with all related data", async () => {
      (mockQueryBuilder.limit as Mock).mockResolvedValueOnce({
        data: [mockAnalysis],
        error: null,
      });

      // Mock related data queries
      const orderMock = vi.fn().mockResolvedValue({
        data: mockDailyEntries,
        error: null,
      });

      const eqMockForEntries = vi.fn().mockReturnValue({ order: orderMock });
      const selectMockForEntries = vi.fn().mockReturnValue({ eq: eqMockForEntries });

      const eqMockForTotals = vi.fn().mockResolvedValue({
        data: [mockTotals],
        error: null,
      });

      const selectMockForTotals = vi.fn().mockReturnValue({ eq: eqMockForTotals });

      const orderMockForFiles = vi.fn().mockResolvedValue({
        data: mockFiles,
        error: null,
      });

      const eqMockForFiles = vi.fn().mockReturnValue({ order: orderMockForFiles });
      const selectMockForFiles = vi.fn().mockReturnValue({ eq: eqMockForFiles });

      // Setup from() to return different builders for different tables
      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockQueryBuilder) })
        .mockReturnValueOnce({ select: selectMockForEntries })
        .mockReturnValueOnce({ select: selectMockForTotals })
        .mockReturnValueOnce({ select: selectMockForFiles });

      const result = await repository.getAnalysisById(analysisId);

      expect(result.isSuccess).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(analysisId);
      expect(result.data?.daily_entries).toHaveLength(1);
      expect(result.data?.analysis_totals).toBeDefined();
      expect(result.data?.analysis_files).toHaveLength(1);
    });

    it("should return null when analysis not found", async () => {
      (mockQueryBuilder.limit as Mock).mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await repository.getAnalysisById(analysisId);

      expect(result.isSuccess).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should load dailyEntries via join", async () => {
      (mockQueryBuilder.limit as Mock).mockResolvedValueOnce({
        data: [mockAnalysis],
        error: null,
      });

      const orderMock = vi.fn().mockResolvedValue({
        data: mockDailyEntries,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockQueryBuilder) })
        .mockReturnValueOnce({ select: selectMock })
        .mockReturnValueOnce({
          select: vi
            .fn()
            .mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
          }),
        });

      const result = await repository.getAnalysisById(analysisId);

      expect(result.isSuccess).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("daily_entries");
      expect(eqMock).toHaveBeenCalledWith("analysis_id", analysisId);
    });

    it("should return error for invalid analysis ID", async () => {
      const result = await repository.getAnalysisById("");

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
    });

    it("should handle database errors", async () => {
      (mockQueryBuilder.limit as Mock).mockResolvedValueOnce({
        data: null,
        error: { code: "08006", message: "Connection failure" },
      });

      const result = await repository.getAnalysisById(analysisId);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
    });

    it("should handle missing related data gracefully", async () => {
      (mockQueryBuilder.limit as Mock).mockResolvedValueOnce({
        data: [mockAnalysis],
        error: null,
      });

      // All related queries return empty
      const emptyMock = { data: [], error: null };
      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockQueryBuilder) })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue(emptyMock) }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(emptyMock) }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue(emptyMock) }),
          }),
        });

      const result = await repository.getAnalysisById(analysisId);

      expect(result.isSuccess).toBe(true);
      expect(result.data?.daily_entries).toEqual([]);
      expect(result.data?.analysis_totals).toBeUndefined();
      expect(result.data?.analysis_files).toEqual([]);
    });

    it("should handle unexpected errors", async () => {
      (mockSupabaseClient.from as Mock).mockImplementationOnce(() => {
        throw new Error("Unexpected error");
      });

      const result = await repository.getAnalysisById(analysisId);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
    });
  });

  // =============================================================================
  // 7. getUserAnalyses() Tests
  // =============================================================================
  describe("getUserAnalyses()", () => {
    const userId = "123e4567-e89b-12d3-a456-426614174000";

    const mockAnalyses = [
      {
        id: "analysis-1",
        user_id: userId,
        status: "completed",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "analysis-2",
        user_id: userId,
        status: "pending",
        created_at: "2024-01-02T00:00:00Z",
      },
    ];

    beforeEach(() => {
      // Default mock setup for getUserAnalyses
      // Mock the thenable query builder to resolve with data
      (mockQueryBuilder.then as Mock).mockImplementation((resolve) => {
        resolve({ data: mockAnalyses, error: null, count: 2 });
        return Promise.resolve({ data: mockAnalyses, error: null, count: 2 });
      });
    });

    it("should return paginated list of analyses", async () => {
      const result = await repository.getUserAnalyses(userId);

      expect(result.isSuccess).toBe(true);
      expect(result.data.data).toHaveLength(2);
      expect(result.data.count).toBe(2);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("analyses");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("user_id", userId);
    });

    it("should respect page and pageSize parameters", async () => {
      const options = { limit: 10, offset: 20 };

      await repository.getUserAnalyses(userId, options);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(20, 29);
    });

    it("should filter by status", async () => {
      await repository.getUserAnalyses(userId, { status: "completed" });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("user_id", userId);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("status", "completed");
    });

    it("should sort by created_at DESC by default", async () => {
      await repository.getUserAnalyses(userId);

      expect(mockQueryBuilder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("should support custom sorting", async () => {
      await repository.getUserAnalyses(userId, { orderBy: "period_start", order: "asc" });

      expect(mockQueryBuilder.order).toHaveBeenCalledWith("period_start", { ascending: true });
    });

    it("should return total count for pagination", async () => {
      // Override the default mock with custom count
      (mockQueryBuilder.then as Mock).mockImplementationOnce((resolve) => {
        resolve({ data: mockAnalyses, error: null, count: 50 });
        return Promise.resolve({ data: mockAnalyses, error: null, count: 50 });
      });

      const result = await repository.getUserAnalyses(userId, { limit: 10 });

      expect(result.isSuccess).toBe(true);
      expect(result.data.count).toBe(50);
    });

    it("should handle empty results", async () => {
      (mockQueryBuilder.then as Mock).mockImplementationOnce((resolve) => {
        resolve({ data: [], error: null, count: 0 });
        return Promise.resolve({ data: [], error: null, count: 0 });
      });

      const result = await repository.getUserAnalyses(userId);

      expect(result.isSuccess).toBe(true);
      expect(result.data.data).toEqual([]);
      expect(result.data.count).toBe(0);
    });

    it("should return error for invalid user ID", async () => {
      const result = await repository.getUserAnalyses("");

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
    });

    it("should handle database errors", async () => {
      (mockQueryBuilder.then as Mock).mockImplementationOnce((resolve) => {
        resolve({ data: null, error: { code: "42P01", message: "Table does not exist" } });
        return Promise.resolve({
          data: null,
          error: { code: "42P01", message: "Table does not exist" },
        });
      });

      const result = await repository.getUserAnalyses(userId);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
    });

    it("should validate pagination parameters", async () => {
      const result = await repository.getUserAnalyses(userId, {
        limit: 100,
        offset: 0,
      });

      expect(result.isSuccess).toBe(true);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
    });
  });

  // =============================================================================
  // 8. deleteAnalysis() Tests
  // =============================================================================
  describe("deleteAnalysis()", () => {
    const analysisId = "123e4567-e89b-12d3-a456-426614174000";

    it("should delete analysis successfully", async () => {
      // Mock cascade deletes
      (mockQueryBuilder.eq as Mock)
        .mockResolvedValueOnce({ data: null, error: null }) // files
        .mockResolvedValueOnce({ data: null, error: null }) // totals
        .mockResolvedValueOnce({ data: null, error: null }) // entries
        .mockResolvedValueOnce({ data: null, error: null }); // analysis

      const result = await repository.deleteAnalysis(analysisId);

      expect(result.isSuccess).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("analyses");
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it("should cascade delete dailyEntries", async () => {
      (mockQueryBuilder.eq as Mock)
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      await repository.deleteAnalysis(analysisId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("daily_entries");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("analysis_id", analysisId);
    });

    it("should cascade delete analysisTotals", async () => {
      (mockQueryBuilder.eq as Mock)
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      await repository.deleteAnalysis(analysisId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("analysis_totals");
    });

    it("should cascade delete analysisFiles", async () => {
      (mockQueryBuilder.eq as Mock)
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      await repository.deleteAnalysis(analysisId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("analysis_files");
    });

    it("should return error when analysis ID is empty", async () => {
      const result = await repository.deleteAnalysis("");

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
    });

    it("should handle database errors", async () => {
      (mockQueryBuilder.eq as Mock)
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "23503", message: "Foreign key violation" },
        });

      const result = await repository.deleteAnalysis(analysisId);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONSTRAINT_VIOLATION);
    });

    it("should verify deletion completed", async () => {
      (mockQueryBuilder.eq as Mock)
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const result = await repository.deleteAnalysis(analysisId);

      expect(result.isSuccess).toBe(true);
      expect(mockQueryBuilder.delete).toHaveBeenCalledTimes(4); // files, totals, entries, analysis
    });

    it("should handle unexpected errors", async () => {
      (mockSupabaseClient.from as Mock).mockImplementationOnce(() => {
        throw new Error("Network error");
      });

      const result = await repository.deleteAnalysis(analysisId);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
    });
  });

  // =============================================================================
  // 9. getAnalyticsData() Tests
  // =============================================================================
  describe("getAnalyticsData()", () => {
    const userId = "123e4567-e89b-12d3-a456-426614174000";

    it("should return aggregated dashboard statistics", async () => {
      const mockTotalAnalyses = [{ id: "1" }, { id: "2" }, { id: "3" }];
      const mockThisMonth = [
        { analysis_totals: [{ expected_total: 1575 }] },
        { analysis_totals: [{ expected_total: 1200 }] },
      ];
      const mockAvgData = [
        { total_consignments: 250, working_days: 5 },
        { total_consignments: 200, working_days: 4 },
      ];
      const mockCompletionData = [
        { status: "completed" },
        { status: "completed" },
        { status: "pending" },
      ];

      // Create 4 separate query builders for the 4 parallel queries
      const builder1 = createMockQueryBuilder();
      (builder1.then as Mock).mockImplementation((resolve) => {
        resolve({ data: mockTotalAnalyses, error: null });
        return Promise.resolve({ data: mockTotalAnalyses, error: null });
      });

      const builder2 = createMockQueryBuilder();
      (builder2.then as Mock).mockImplementation((resolve) => {
        resolve({ data: mockThisMonth, error: null });
        return Promise.resolve({ data: mockThisMonth, error: null });
      });

      const builder3 = createMockQueryBuilder();
      (builder3.then as Mock).mockImplementation((resolve) => {
        resolve({ data: mockAvgData, error: null });
        return Promise.resolve({ data: mockAvgData, error: null });
      });

      const builder4 = createMockQueryBuilder();
      (builder4.then as Mock).mockImplementation((resolve) => {
        resolve({ data: mockCompletionData, error: null });
        return Promise.resolve({ data: mockCompletionData, error: null });
      });

      // Mock from() to return different builders for each call
      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce(builder1)
        .mockReturnValueOnce(builder2)
        .mockReturnValueOnce(builder3)
        .mockReturnValueOnce(builder4);

      const result = await repository.getAnalyticsData(userId);

      expect(result.isSuccess).toBe(true);
      expect(result.data.totalAnalyses).toBe(3);
      expect(result.data.thisMonthEarnings).toBeGreaterThan(0);
      expect(result.data.avgDailyConsignments).toBeGreaterThan(0);
      expect(result.data.completionRate).toBeGreaterThan(0);
    });

    it("should calculate total revenue sum", async () => {
      const mockThisMonth = [
        { analysis_totals: [{ expected_total: 1000 }] },
        { analysis_totals: [{ expected_total: 2000 }] },
      ];

      const builder1 = createMockQueryBuilder();
      (builder1.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder2 = createMockQueryBuilder();
      (builder2.then as Mock).mockImplementation((resolve) => {
        resolve({ data: mockThisMonth, error: null });
        return Promise.resolve({ data: mockThisMonth, error: null });
      });

      const builder3 = createMockQueryBuilder();
      (builder3.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder4 = createMockQueryBuilder();
      (builder4.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce(builder1)
        .mockReturnValueOnce(builder2)
        .mockReturnValueOnce(builder3)
        .mockReturnValueOnce(builder4);

      const result = await repository.getAnalyticsData(userId);

      expect(result.isSuccess).toBe(true);
      expect(result.data.thisMonthEarnings).toBe(3000);
    });

    it("should calculate average daily revenue", async () => {
      const mockAvgData = [
        { total_consignments: 100, working_days: 5 }, // 20 per day
        { total_consignments: 150, working_days: 5 }, // 30 per day
      ];

      const builder1 = createMockQueryBuilder();
      (builder1.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder2 = createMockQueryBuilder();
      (builder2.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder3 = createMockQueryBuilder();
      (builder3.then as Mock).mockImplementation((resolve) => {
        resolve({ data: mockAvgData, error: null });
        return Promise.resolve({ data: mockAvgData, error: null });
      });

      const builder4 = createMockQueryBuilder();
      (builder4.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce(builder1)
        .mockReturnValueOnce(builder2)
        .mockReturnValueOnce(builder3)
        .mockReturnValueOnce(builder4);

      const result = await repository.getAnalyticsData(userId);

      expect(result.isSuccess).toBe(true);
      expect(result.data.avgDailyConsignments).toBe(25); // (20 + 30) / 2
    });

    it("should calculate performance percentage", async () => {
      const mockCompletionData = [
        { status: "completed" },
        { status: "completed" },
        { status: "completed" },
        { status: "pending" },
      ];

      const builder1 = createMockQueryBuilder();
      (builder1.then as Mock).mockImplementation((resolve) => {
        resolve({ data: mockCompletionData, error: null });
        return Promise.resolve({ data: mockCompletionData, error: null });
      });

      const builder2 = createMockQueryBuilder();
      (builder2.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder3 = createMockQueryBuilder();
      (builder3.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder4 = createMockQueryBuilder();
      (builder4.then as Mock).mockImplementation((resolve) => {
        resolve({ data: mockCompletionData, error: null });
        return Promise.resolve({ data: mockCompletionData, error: null });
      });

      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce(builder1)
        .mockReturnValueOnce(builder2)
        .mockReturnValueOnce(builder3)
        .mockReturnValueOnce(builder4);

      const result = await repository.getAnalyticsData(userId);

      expect(result.isSuccess).toBe(true);
      expect(result.data.completionRate).toBe(75); // 3 of 4
    });

    it("should filter by user ID", async () => {
      const builder1 = createMockQueryBuilder();
      (builder1.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder2 = createMockQueryBuilder();
      (builder2.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder3 = createMockQueryBuilder();
      (builder3.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder4 = createMockQueryBuilder();
      (builder4.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce(builder1)
        .mockReturnValueOnce(builder2)
        .mockReturnValueOnce(builder3)
        .mockReturnValueOnce(builder4);

      await repository.getAnalyticsData(userId);

      expect(builder1.eq).toHaveBeenCalledWith("user_id", userId);
      expect(builder2.eq).toHaveBeenCalledWith("user_id", userId);
      expect(builder3.eq).toHaveBeenCalledWith("user_id", userId);
      expect(builder4.eq).toHaveBeenCalledWith("user_id", userId);
    });

    it("should handle no data - return zeros", async () => {
      const builder1 = createMockQueryBuilder();
      (builder1.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder2 = createMockQueryBuilder();
      (builder2.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder3 = createMockQueryBuilder();
      (builder3.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder4 = createMockQueryBuilder();
      (builder4.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce(builder1)
        .mockReturnValueOnce(builder2)
        .mockReturnValueOnce(builder3)
        .mockReturnValueOnce(builder4);

      const result = await repository.getAnalyticsData(userId);

      expect(result.isSuccess).toBe(true);
      expect(result.data.totalAnalyses).toBe(0);
      expect(result.data.thisMonthEarnings).toBe(0);
      expect(result.data.avgDailyConsignments).toBe(0);
      expect(result.data.completionRate).toBe(0);
    });

    it("should return error for invalid user ID", async () => {
      const result = await repository.getAnalyticsData("");

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
    });

    it("should handle database errors", async () => {
      const builder1 = createMockQueryBuilder();
      (builder1.then as Mock).mockImplementation((resolve) => {
        resolve({ data: null, error: { code: "08006", message: "Connection failed" } });
        return Promise.resolve({
          data: null,
          error: { code: "08006", message: "Connection failed" },
        });
      });

      const builder2 = createMockQueryBuilder();
      (builder2.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder3 = createMockQueryBuilder();
      (builder3.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      const builder4 = createMockQueryBuilder();
      (builder4.then as Mock).mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });

      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce(builder1)
        .mockReturnValueOnce(builder2)
        .mockReturnValueOnce(builder3)
        .mockReturnValueOnce(builder4);

      const result = await repository.getAnalyticsData(userId);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
    });

    it("should handle unexpected errors", async () => {
      (mockSupabaseClient.from as Mock).mockImplementationOnce(() => {
        throw new Error("Unexpected error");
      });

      const result = await repository.getAnalyticsData(userId);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
    });
  });

  // =============================================================================
  // 10. findAnalysisByFingerprint() Tests
  // =============================================================================
  describe("findAnalysisByFingerprint()", () => {
    const userId = "123e4567-e89b-12d3-a456-426614174000";
    const fingerprint = "fp_v9_123456789";
    const legacyFingerprint = "fp_v8_123456789";

    it("should find analysis by v9 fingerprint", async () => {
      const mockAnalysis = {
        id: "analysis-123",
        user_id: userId,
        fingerprint,
      };

      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: mockAnalysis,
        error: null,
      });

      const result = await repository.findAnalysisByFingerprint(userId, fingerprint);

      expect(result.isSuccess).toBe(true);
      expect(result.data?.id).toBe("analysis-123");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("fingerprint", fingerprint);
    });

    it("should find analysis by v8 fingerprint when v9 not found", async () => {
      const mockLegacyAnalysis = {
        id: "legacy-123",
        user_id: userId,
        fingerprint: legacyFingerprint,
      };

      // v9 not found
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // v8 found
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: mockLegacyAnalysis,
        error: null,
      });

      const result = await repository.findAnalysisByFingerprint(
        userId,
        fingerprint,
        legacyFingerprint
      );

      expect(result.isSuccess).toBe(true);
      expect(result.data?.id).toBe("legacy-123");
    });

    it("should return null when not found", async () => {
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await repository.findAnalysisByFingerprint(userId, fingerprint);

      expect(result.isSuccess).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should prioritize v9 over v8 when both exist", async () => {
      const mockV9Analysis = {
        id: "v9-123",
        user_id: userId,
        fingerprint,
      };

      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: mockV9Analysis,
        error: null,
      });

      const result = await repository.findAnalysisByFingerprint(
        userId,
        fingerprint,
        legacyFingerprint
      );

      expect(result.isSuccess).toBe(true);
      expect(result.data?.id).toBe("v9-123");
      // Should not check legacy since v9 was found
      expect(mockQueryBuilder.maybeSingle).toHaveBeenCalledTimes(1);
    });

    it("should return error for missing required fields", async () => {
      const result1 = await repository.findAnalysisByFingerprint("", fingerprint);
      const result2 = await repository.findAnalysisByFingerprint(userId, "");

      expect(result1.isFailure).toBe(true);
      expect(result1.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
      expect(result2.isFailure).toBe(true);
      expect(result2.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
    });

    it("should validate fingerprint format", async () => {
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await repository.findAnalysisByFingerprint(userId, "valid-fingerprint");

      expect(result.isSuccess).toBe(true);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("fingerprint", "valid-fingerprint");
    });

    it("should handle database errors", async () => {
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: null,
        error: { code: "42P01", message: "Table not found" },
      });

      const result = await repository.findAnalysisByFingerprint(userId, fingerprint);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
    });

    it("should handle legacy fingerprint database errors", async () => {
      // v9 not found
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // v8 error
      (mockQueryBuilder.maybeSingle as Mock).mockResolvedValueOnce({
        data: null,
        error: { code: "08006", message: "Connection failed" },
      });

      const result = await repository.findAnalysisByFingerprint(
        userId,
        fingerprint,
        legacyFingerprint
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
    });

    it("should handle unexpected errors", async () => {
      (mockSupabaseClient.from as Mock).mockImplementationOnce(() => {
        throw new Error("Unexpected error");
      });

      const result = await repository.findAnalysisByFingerprint(userId, fingerprint);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
    });
  });

  // =============================================================================
  // 11. updateDailyEntry() Tests
  // =============================================================================
  describe("updateDailyEntry()", () => {
    const userId = "123e4567-e89b-12d3-a456-426614174000";
    const analysisId = "123e4567-e89b-12d3-a456-426614174001";
    const entryDate = "2024-01-01";

    const updateData = {
      consignments: 55,
      paid_amount: 220,
      difference: 5,
      status: "overpaid" as const,
    };

    it("should update daily entry successfully", async () => {
      // Create separate builders for the two queries
      const analysesBuilder = createMockQueryBuilder();
      (analysesBuilder.single as Mock).mockResolvedValue({
        data: { id: analysisId },
        error: null,
      });

      const entriesBuilder = createMockQueryBuilder();
      (entriesBuilder.then as Mock).mockImplementation((resolve) => {
        resolve({ data: null, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce(analysesBuilder) // For ownership check
        .mockReturnValueOnce(entriesBuilder); // For update

      const result = await repository.updateDailyEntry(userId, analysisId, entryDate, updateData);

      expect(result.isSuccess).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("analyses");
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("daily_entries");
      expect(entriesBuilder.update).toHaveBeenCalledWith(updateData);
    });

    it("should update specific fields", async () => {
      const analysesBuilder = createMockQueryBuilder();
      (analysesBuilder.single as Mock).mockResolvedValue({
        data: { id: analysisId },
        error: null,
      });

      const entriesBuilder = createMockQueryBuilder();
      (entriesBuilder.then as Mock).mockImplementation((resolve) => {
        resolve({ data: null, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce(analysesBuilder)
        .mockReturnValueOnce(entriesBuilder);

      const partialUpdate = { consignments: 60 };
      await repository.updateDailyEntry(userId, analysisId, entryDate, partialUpdate);

      expect(entriesBuilder.update).toHaveBeenCalledWith(partialUpdate);
    });

    it("should verify RLS - analysis ownership", async () => {
      const analysesBuilder = createMockQueryBuilder();
      (analysesBuilder.single as Mock).mockResolvedValue({
        data: { id: analysisId },
        error: null,
      });

      const entriesBuilder = createMockQueryBuilder();
      (entriesBuilder.then as Mock).mockImplementation((resolve) => {
        resolve({ data: null, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce(analysesBuilder)
        .mockReturnValueOnce(entriesBuilder);

      await repository.updateDailyEntry(userId, analysisId, entryDate, updateData);

      expect(analysesBuilder.eq).toHaveBeenCalledWith("id", analysisId);
      expect(analysesBuilder.eq).toHaveBeenCalledWith("user_id", userId);
    });

    it("should return error when entry not found or access denied", async () => {
      (mockQueryBuilder.single as Mock).mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await repository.updateDailyEntry(userId, analysisId, entryDate, updateData);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.ANALYSIS_NOT_FOUND);
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it("should return error for missing required fields", async () => {
      const result1 = await repository.updateDailyEntry("", analysisId, entryDate, updateData);
      const result2 = await repository.updateDailyEntry(userId, "", entryDate, updateData);
      const result3 = await repository.updateDailyEntry(userId, analysisId, "", updateData);

      expect(result1.isFailure).toBe(true);
      expect(result1.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
      expect(result2.isFailure).toBe(true);
      expect(result2.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
      expect(result3.isFailure).toBe(true);
      expect(result3.error.code).toBe(ErrorCodes.VALIDATION_REQUIRED_FIELD);
    });

    it("should handle database errors during update", async () => {
      const analysesBuilder = createMockQueryBuilder();
      (analysesBuilder.single as Mock).mockResolvedValue({
        data: { id: analysisId },
        error: null,
      });

      const entriesBuilder = createMockQueryBuilder();
      (entriesBuilder.then as Mock).mockImplementation((resolve) => {
        resolve({ data: null, error: { code: "23514", message: "Check constraint violation" } });
        return Promise.resolve({
          data: null,
          error: { code: "23514", message: "Check constraint violation" },
        });
      });

      (mockSupabaseClient.from as Mock)
        .mockReturnValueOnce(analysesBuilder)
        .mockReturnValueOnce(entriesBuilder);

      const result = await repository.updateDailyEntry(userId, analysisId, entryDate, updateData);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONSTRAINT_VIOLATION);
    });

    it("should prevent updating other users entries", async () => {
      const otherUserId = "987e6543-e89b-12d3-a456-426614174999";

      (mockQueryBuilder.single as Mock).mockResolvedValueOnce({
        data: null, // Analysis not found for this user
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await repository.updateDailyEntry(
        otherUserId,
        analysisId,
        entryDate,
        updateData
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.ANALYSIS_NOT_FOUND);
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      (mockSupabaseClient.from as Mock).mockImplementationOnce(() => {
        throw new Error("Network timeout");
      });

      const result = await repository.updateDailyEntry(userId, analysisId, entryDate, updateData);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(ErrorCodes.DATABASE_CONNECTION_ERROR);
    });
  });
});
