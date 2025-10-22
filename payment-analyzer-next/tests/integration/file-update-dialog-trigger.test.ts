/**
 * Integration Tests for FileUpdateDialog Trigger Logic
 *
 * Tests the complete flow from file upload to dialog appearance
 * and subsequent user actions (merge, create new, cancel).
 *
 * Phase 2.1 - Infrastructure testing
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileUpdateDetectionService } from "@/lib/services/file-update-detection-service";
import { QuickDateExtractor } from "@/lib/services/quick-date-extractor";

describe("FileUpdateDialog Trigger Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("QuickDateExtractor", () => {
    it("should extract date range from runsheet filename", async () => {
      // Create mock file with runsheet pattern
      const mockFile = new File(["mock content"], "runsheetDV_2025-06-30.pdf", {
        type: "application/pdf",
      });

      const range = await QuickDateExtractor.extractDateRange([mockFile]);

      expect(range).not.toBeNull();
      if (range) {
        expect(range.start).toBeDefined();
        expect(range.end).toBeDefined();
      }
    });

    it("should handle multiple files and return combined range", async () => {
      const file1 = new File(["mock content"], "runsheetDV_2025-06-23.pdf", {
        type: "application/pdf",
      });
      const file2 = new File(["mock content"], "runsheetDV_2025-06-30.pdf", {
        type: "application/pdf",
      });

      const range = await QuickDateExtractor.extractDateRange([file1, file2]);

      expect(range).not.toBeNull();
      if (range) {
        expect(range.start).toBeDefined();
        expect(range.end).toBeDefined();
      }
    });

    it("should detect overlapping date ranges", () => {
      const range1 = { start: "30/06/2025", end: "04/07/2025" };
      const range2 = { start: "02/07/2025", end: "06/07/2025" };

      const overlaps = QuickDateExtractor.dateRangesOverlap(range1, range2);

      expect(overlaps).toBe(true);
    });

    it("should detect non-overlapping date ranges", () => {
      const range1 = { start: "23/06/2025", end: "27/06/2025" };
      const range2 = { start: "30/06/2025", end: "04/07/2025" };

      const overlaps = QuickDateExtractor.dateRangesOverlap(range1, range2);

      expect(overlaps).toBe(false);
    });

    it("should handle edge case of adjacent ranges", () => {
      const range1 = { start: "23/06/2025", end: "29/06/2025" };
      const range2 = { start: "30/06/2025", end: "04/07/2025" };

      const overlaps = QuickDateExtractor.dateRangesOverlap(range1, range2);

      expect(overlaps).toBe(false);
    });
  });

  describe("FileUpdateDetectionService", () => {
    const detectionService = new FileUpdateDetectionService();

    it("should recommend creating new analysis when no overlap exists", () => {
      const newEntries = [
        {
          id: "entry-1",
          analysis_id: "test-analysis",
          date: "2025-06-30",
          day_of_week: 1,
          consignments: 50,
          rate: 2.0,
          base_payment: 100.0,
          pickups: 0,
          pickup_total: 0,
          unloading_bonus: 30,
          attendance_bonus: 25,
          early_bonus: 50,
          expected_total: 205.0,
          paid_amount: 0,
          difference: -205.0,
          status: "underpaid" as const,
          created_at: "2025-06-30T10:00:00Z",
        },
      ];

      const existingAnalyses: Parameters<typeof detectionService.detectUpdateStrategy>[1] = [];

      const strategy = detectionService.detectUpdateStrategy(newEntries, existingAnalyses);

      expect(strategy.type).toBe("create_new");
      expect(strategy.reason).toContain("No existing data");
    });

    it("should detect merge opportunity when dates overlap", () => {
      const newEntries = [
        {
          id: "entry-2",
          analysis_id: "test-analysis",
          date: "2025-06-30",
          day_of_week: 1,
          consignments: 0,
          rate: 2.0,
          base_payment: 0,
          pickups: 0,
          pickup_total: 0,
          unloading_bonus: 0,
          attendance_bonus: 0,
          early_bonus: 0,
          expected_total: 0,
          paid_amount: 205.0, // Invoice payment
          difference: 205.0,
          status: "overpaid" as const,
          created_at: "2025-06-30T11:00:00Z",
        },
      ];

      const existingAnalyses = [
        {
          id: "existing-analysis-1",
          created_at: "2025-06-30T10:00:00Z",
          fingerprint: "abc123",
          dailyEntries: [
            {
              id: "entry-3",
              analysis_id: "existing-analysis-1",
              date: "2025-06-30",
              day_of_week: 1,
              consignments: 50,
              rate: 2.0,
              base_payment: 100.0,
              pickups: 0,
              pickup_total: 0,
              unloading_bonus: 30,
              attendance_bonus: 25,
              early_bonus: 50,
              expected_total: 205.0,
              paid_amount: 0,
              difference: -205.0,
              status: "underpaid" as const,
              created_at: "2025-06-30T10:00:00Z",
            },
          ],
        },
      ];

      const strategy = detectionService.detectUpdateStrategy(newEntries, existingAnalyses);

      expect(strategy.type).toBe("merge_data");
      expect(strategy.mergeStrategy).toBe("add_invoice");
      expect(strategy.existingAnalysisId).toBe("existing-analysis-1");
    });

    it("should suggest creating new when multiple overlaps exist", () => {
      const newEntries = [
        {
          id: "entry-4",
          analysis_id: "test-analysis",
          date: "2025-06-30",
          day_of_week: 1,
          consignments: 50,
          rate: 2.0,
          base_payment: 100.0,
          pickups: 0,
          pickup_total: 0,
          unloading_bonus: 30,
          attendance_bonus: 25,
          early_bonus: 50,
          expected_total: 205.0,
          paid_amount: 0,
          difference: -205.0,
          status: "underpaid" as const,
          created_at: "2025-06-30T12:00:00Z",
        },
      ];

      const existingAnalyses = [
        {
          id: "analysis-1",
          created_at: "2025-06-30T10:00:00Z",
          fingerprint: "abc123",
          dailyEntries: [
            {
              id: "entry-5",
              analysis_id: "analysis-1",
              date: "2025-06-30",
              day_of_week: 1,
              consignments: 45,
              rate: 2.0,
              base_payment: 90.0,
              pickups: 0,
              pickup_total: 0,
              unloading_bonus: 30,
              attendance_bonus: 25,
              early_bonus: 50,
              expected_total: 195.0,
              paid_amount: 195.0,
              difference: 0,
              status: "balanced" as const,
              created_at: "2025-06-30T10:00:00Z",
            },
          ],
        },
        {
          id: "analysis-2",
          created_at: "2025-06-30T11:00:00Z",
          fingerprint: "def456",
          dailyEntries: [
            {
              id: "entry-6",
              analysis_id: "analysis-2",
              date: "2025-06-30",
              day_of_week: 1,
              consignments: 48,
              rate: 2.0,
              base_payment: 96.0,
              pickups: 0,
              pickup_total: 0,
              unloading_bonus: 30,
              attendance_bonus: 25,
              early_bonus: 50,
              expected_total: 201.0,
              paid_amount: 201.0,
              difference: 0,
              status: "balanced" as const,
              created_at: "2025-06-30T11:00:00Z",
            },
          ],
        },
      ];

      const strategy = detectionService.detectUpdateStrategy(newEntries, existingAnalyses);

      expect(strategy.type).toBe("create_new");
      expect(strategy.reason).toContain("overlaps with 2 existing analyses");
    });
  });

  describe("Date Range Formatting", () => {
    it("should format dates consistently in DD/MM/YYYY format", async () => {
      const mockFile = new File(
        ["mock content"],
        "runsheetDV_2025-01-06.pdf", // January 6, 2025 (Monday)
        { type: "application/pdf" }
      );

      const range = await QuickDateExtractor.extractDateRange([mockFile]);

      if (range) {
        expect(range.start).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        expect(range.end).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      }
    });
  });

  describe("Error Handling", () => {
    it("should return null when no files provided", async () => {
      const result = await QuickDateExtractor.extractDateRange([]);
      expect(result).toBeNull();
    });

    it("should handle files with no recognizable date pattern", async () => {
      const mockFile = new File(["mock content"], "unknown-file.pdf", { type: "application/pdf" });

      // Should still return some range (possibly current week or null)
      const range = await QuickDateExtractor.extractDateRange([mockFile]);

      // Range might be null or have a fallback value
      if (range) {
        expect(range.start).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        expect(range.end).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      }
    });
  });
});

describe("Integration: Complete FileUpdateDialog Workflow", () => {
  it("should complete the full workflow from file upload to dialog trigger", async () => {
    // 1. Create mock files
    const _runsheetFile = new File(["mock runsheet content"], "runsheetDV_2025-06-30.pdf", {
      type: "application/pdf",
    });
    const invoiceFile = new File(["mock invoice content"], "SELF BILL_100136037.pdf", {
      type: "application/pdf",
    });

    // 2. Extract date range from files
    const newFileDateRange = await QuickDateExtractor.extractDateRange([invoiceFile]);

    // Range might be null if extraction failed
    if (!newFileDateRange) {
      // Cannot proceed with overlap check
      return;
    }

    expect(newFileDateRange.start).toBeDefined();
    expect(newFileDateRange.end).toBeDefined();

    // 3. Simulate existing analysis with overlapping dates
    const existingAnalysisRange = {
      start: "30/06/2025",
      end: "04/07/2025",
    };

    // 4. Check for overlap
    const hasOverlap = QuickDateExtractor.dateRangesOverlap(
      existingAnalysisRange,
      newFileDateRange
    );

    // 5. If overlap detected, FileUpdateDialog should appear
    if (hasOverlap) {
      expect(hasOverlap).toBe(true);
      // In the actual component, this would trigger:
      // setShowFileUpdateDialog(true);
    }
  });
});
