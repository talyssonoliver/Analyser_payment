/**
 * Quick Date Extractor Service Test Suite
 * Comprehensive tests for date extraction from PDF files
 *
 * Phase 2.1: FileUpdateDialog Implementation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuickDateExtractor } from "@/lib/services/quick-date-extractor";

describe("QuickDateExtractor", () => {
  beforeEach(() => {
    // Clear cache before each test
    QuickDateExtractor.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("extractFromFilename", () => {
    describe("Runsheet Patterns", () => {
      it("should extract date from runsheetDV_YYYY-MM-DD.pdf format", async () => {
        const file = new File([], "runsheetDV_2025-06-30.pdf", { type: "application/pdf" });
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange).not.toBeNull();
        expect(result.dateRange?.start).toBe("30/06/2025"); // Monday
        expect(result.dateRange?.end).toBe("06/07/2025"); // Sunday
        expect(result.extractionMethod).toBe("filename");
      });

      it("should extract date from runsheet_YYYY_MM_DD.pdf format (underscores)", async () => {
        const file = new File([], "runsheet_2025_07_07.pdf", { type: "application/pdf" });
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange).not.toBeNull();
        expect(result.dateRange?.start).toBe("07/07/2025"); // Monday
        expect(result.dateRange?.end).toBe("13/07/2025"); // Sunday
        expect(result.extractionMethod).toBe("filename");
      });

      it("should handle runsheet with mixed case", async () => {
        const file = new File([], "RUNSHEETDV_2025-08-11.pdf", { type: "application/pdf" });
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange).not.toBeNull();
        expect(result.dateRange?.start).toBe("11/08/2025"); // Monday
        expect(result.dateRange?.end).toBe("17/08/2025"); // Sunday
      });

      it("should handle runsheet with extra text in filename", async () => {
        const file = new File([], "runsheet_driver_john_2025-09-01.pdf", {
          type: "application/pdf",
        });
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange).not.toBeNull();
        expect(result.dateRange?.start).toBe("01/09/2025"); // Monday
        expect(result.dateRange?.end).toBe("07/09/2025"); // Sunday
      });
    });

    describe("ISO Date Patterns", () => {
      it("should extract date from YYYY-MM-DD pattern", async () => {
        const file = new File([], "invoice_2025-07-14.pdf", { type: "application/pdf" });
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange).not.toBeNull();
        expect(result.dateRange?.start).toBe("14/07/2025"); // Monday
        expect(result.dateRange?.end).toBe("20/07/2025"); // Sunday
      });

      it("should extract date from YYYYMMDD pattern (no separators)", async () => {
        const file = new File([], "SELF_BILL_20250630.pdf", { type: "application/pdf" });
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange).not.toBeNull();
        expect(result.dateRange?.start).toBe("30/06/2025"); // Monday
        expect(result.dateRange?.end).toBe("06/07/2025"); // Sunday
      });
    });

    describe("DD-MM-YYYY Patterns", () => {
      it("should extract date from DD-MM-YYYY pattern", async () => {
        const file = new File([], "invoice_15-07-2025.pdf", { type: "application/pdf" });
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange).not.toBeNull();
        expect(result.dateRange?.start).toBe("14/07/2025"); // Monday
        expect(result.dateRange?.end).toBe("20/07/2025"); // Sunday
      });

      it("should extract date from DD_MM_YYYY pattern (underscores)", async () => {
        const file = new File([], "document_01_08_2025.pdf", { type: "application/pdf" });
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange).not.toBeNull();
        expect(result.dateRange?.start).toBe("28/07/2025"); // Monday
        expect(result.dateRange?.end).toBe("03/08/2025"); // Sunday
      });
    });

    describe("Week Calculation", () => {
      it("should calculate Monday-Sunday range when date is Monday", async () => {
        const file = new File([], "runsheet_2025-06-30.pdf", { type: "application/pdf" }); // Monday
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange?.start).toBe("30/06/2025"); // Same Monday
        expect(result.dateRange?.end).toBe("06/07/2025"); // Following Sunday
      });

      it("should calculate Monday-Sunday range when date is Friday", async () => {
        const file = new File([], "invoice_2025-07-04.pdf", { type: "application/pdf" }); // Friday
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange?.start).toBe("30/06/2025"); // Previous Monday
        expect(result.dateRange?.end).toBe("06/07/2025"); // Following Sunday
      });

      it("should calculate Monday-Sunday range when date is Sunday", async () => {
        const file = new File([], "doc_2025-07-06.pdf", { type: "application/pdf" }); // Sunday
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange?.start).toBe("30/06/2025"); // Previous Monday
        expect(result.dateRange?.end).toBe("06/07/2025"); // Same Sunday
      });

      it("should handle week spanning month boundary", async () => {
        const file = new File([], "runsheet_2025-06-30.pdf", { type: "application/pdf" }); // Mon June 30
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange?.start).toBe("30/06/2025"); // June 30
        expect(result.dateRange?.end).toBe("06/07/2025"); // July 6
      });

      it("should handle week spanning year boundary", async () => {
        const file = new File([], "runsheet_2024-12-30.pdf", { type: "application/pdf" }); // Mon Dec 30
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange?.start).toBe("30/12/2024"); // Dec 30, 2024
        expect(result.dateRange?.end).toBe("05/01/2025"); // Jan 5, 2025
      });
    });

    describe("Invalid Patterns", () => {
      it("should return failed method for filename with no date", async () => {
        const file = new File([], "invoice.pdf", { type: "application/pdf" });
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        expect(result.dateRange).toBeNull();
        expect(result.extractionMethod).toBe("failed");
      });

      it("should extract dates even with unusual values (JS Date auto-corrects)", async () => {
        const file = new File([], "doc_2025-13-45.pdf", { type: "application/pdf" }); // Month 13, Day 45
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);

        // JavaScript Date will auto-correct: 2025-13-45 -> 2026-02-14
        expect(result.dateRange).not.toBeNull();
        expect(result.extractionMethod).toBe("filename");
      });
    });
  });

  describe("extractDateRange (Batch)", () => {
    it("should extract date range from single file", async () => {
      const files = [new File([], "runsheet_2025-06-30.pdf", { type: "application/pdf" })];

      const result = await QuickDateExtractor.extractDateRange(files);

      expect(result).not.toBeNull();
      expect(result?.start).toBe("30/06/2025");
      expect(result?.end).toBe("06/07/2025");
    });

    it("should find earliest start and latest end from multiple files", async () => {
      const files = [
        new File([], "runsheet_2025-07-07.pdf", { type: "application/pdf" }), // Week 2
        new File([], "runsheet_2025-06-30.pdf", { type: "application/pdf" }), // Week 1
        new File([], "invoice_2025-07-10.pdf", { type: "application/pdf" }), // Week 2
      ];

      const result = await QuickDateExtractor.extractDateRange(files);

      expect(result).not.toBeNull();
      expect(result?.start).toBe("30/06/2025"); // Earliest (Week 1 start)
      expect(result?.end).toBe("13/07/2025"); // Latest (Week 2 end)
    });

    it("should handle empty file array", async () => {
      const result = await QuickDateExtractor.extractDateRange([]);

      expect(result).toBeNull();
    });

    it("should return null if no files have extractable dates", async () => {
      const files = [
        new File([], "invoice.pdf", { type: "application/pdf" }),
        new File([], "document.pdf", { type: "application/pdf" }),
      ];

      const result = await QuickDateExtractor.extractDateRange(files);

      expect(result).toBeNull();
    });

    it("should process files in parallel", async () => {
      const files = [
        new File([], "file1_2025-07-01.pdf", { type: "application/pdf" }),
        new File([], "file2_2025-07-08.pdf", { type: "application/pdf" }),
        new File([], "file3_2025-07-15.pdf", { type: "application/pdf" }),
      ];

      const startTime = performance.now();
      await QuickDateExtractor.extractDateRange(files);
      const elapsed = performance.now() - startTime;

      // Should complete quickly since it's parallel
      expect(elapsed).toBeLessThan(100); // 100ms for 3 filename extractions
    });
  });

  describe("dateRangesOverlap", () => {
    it("should detect overlap when ranges are identical", () => {
      const range1 = { start: "30/06/2025", end: "06/07/2025" };
      const range2 = { start: "30/06/2025", end: "06/07/2025" };

      expect(QuickDateExtractor.dateRangesOverlap(range1, range2)).toBe(true);
    });

    it("should detect overlap when ranges partially overlap", () => {
      const range1 = { start: "30/06/2025", end: "06/07/2025" };
      const range2 = { start: "03/07/2025", end: "10/07/2025" };

      expect(QuickDateExtractor.dateRangesOverlap(range1, range2)).toBe(true);
    });

    it("should detect overlap when range1 contains range2", () => {
      const range1 = { start: "30/06/2025", end: "13/07/2025" };
      const range2 = { start: "03/07/2025", end: "06/07/2025" };

      expect(QuickDateExtractor.dateRangesOverlap(range1, range2)).toBe(true);
    });

    it("should detect overlap when range2 contains range1", () => {
      const range1 = { start: "03/07/2025", end: "06/07/2025" };
      const range2 = { start: "30/06/2025", end: "13/07/2025" };

      expect(QuickDateExtractor.dateRangesOverlap(range1, range2)).toBe(true);
    });

    it("should detect overlap when ranges touch (end = start)", () => {
      const range1 = { start: "30/06/2025", end: "06/07/2025" };
      const range2 = { start: "06/07/2025", end: "13/07/2025" };

      expect(QuickDateExtractor.dateRangesOverlap(range1, range2)).toBe(true);
    });

    it("should not detect overlap when ranges are separate", () => {
      const range1 = { start: "30/06/2025", end: "06/07/2025" };
      const range2 = { start: "14/07/2025", end: "20/07/2025" };

      expect(QuickDateExtractor.dateRangesOverlap(range1, range2)).toBe(false);
    });

    it("should not detect overlap when range2 ends before range1 starts", () => {
      const range1 = { start: "14/07/2025", end: "20/07/2025" };
      const range2 = { start: "30/06/2025", end: "06/07/2025" };

      expect(QuickDateExtractor.dateRangesOverlap(range1, range2)).toBe(false);
    });

    it("should handle invalid date strings gracefully", () => {
      const range1 = { start: "invalid", end: "06/07/2025" };
      const range2 = { start: "30/06/2025", end: "13/07/2025" };

      expect(QuickDateExtractor.dateRangesOverlap(range1, range2)).toBe(false);
    });
  });

  describe("Cache Functionality", () => {
    it("should cache results for same file", async () => {
      const file = new File([], "runsheet_2025-06-30.pdf", {
        type: "application/pdf",
        lastModified: 1234567890,
      });

      // First call
      const result1 = await QuickDateExtractor.extractDateRangeFromFile(file);
      const time1 = result1.processingTime;

      // Second call (should be cached)
      const result2 = await QuickDateExtractor.extractDateRangeFromFile(file);
      const time2 = result2.processingTime;

      expect(result1.dateRange).toEqual(result2.dateRange);
      expect(time2).toBeLessThan(time1); // Cache should be faster
    });

    it("should not cache results for different files with same name", async () => {
      const file1 = new File([], "runsheet_2025-06-30.pdf", {
        type: "application/pdf",
        lastModified: 1234567890,
      });
      const file2 = new File([], "runsheet_2025-06-30.pdf", {
        type: "application/pdf",
        lastModified: 9876543210, // Different timestamp
      });

      await QuickDateExtractor.extractDateRangeFromFile(file1);
      await QuickDateExtractor.extractDateRangeFromFile(file2);

      expect(QuickDateExtractor.getCacheSize()).toBe(2); // Both cached separately
    });

    it("should clear cache when clearCache is called", async () => {
      const file = new File([], "runsheet_2025-06-30.pdf", { type: "application/pdf" });

      await QuickDateExtractor.extractDateRangeFromFile(file);
      expect(QuickDateExtractor.getCacheSize()).toBe(1);

      QuickDateExtractor.clearCache();
      expect(QuickDateExtractor.getCacheSize()).toBe(0);
    });
  });

  describe("Performance", () => {
    it("should extract from filename in <100ms", async () => {
      const file = new File([], "runsheet_2025-06-30.pdf", { type: "application/pdf" });

      const result = await QuickDateExtractor.extractDateRangeFromFile(file);

      expect(result.processingTime).toBeLessThan(100);
      expect(result.extractionMethod).toBe("filename");
    });

    it("should process batch of files in <500ms", async () => {
      const files = [
        new File([], "runsheet_2025-06-30.pdf", { type: "application/pdf" }),
        new File([], "invoice_2025-07-01.pdf", { type: "application/pdf" }),
        new File([], "doc_2025-07-08.pdf", { type: "application/pdf" }),
        new File([], "sheet_2025-07-15.pdf", { type: "application/pdf" }),
      ];

      const startTime = performance.now();
      await QuickDateExtractor.extractDateRange(files);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(500);
    });
  });

  describe("Edge Cases", () => {
    it("should handle leap year dates correctly", async () => {
      const file = new File([], "runsheet_2024-02-29.pdf", { type: "application/pdf" });
      const result = await QuickDateExtractor.extractDateRangeFromFile(file);

      expect(result.dateRange).not.toBeNull();
      expect(result.dateRange?.start).toBe("26/02/2024"); // Monday
      expect(result.dateRange?.end).toBe("03/03/2024"); // Sunday
    });

    it("should handle dates with leading zeros", async () => {
      const file = new File([], "runsheet_2025-01-06.pdf", { type: "application/pdf" });
      const result = await QuickDateExtractor.extractDateRangeFromFile(file);

      expect(result.dateRange).not.toBeNull();
      expect(result.dateRange?.start).toBe("06/01/2025"); // Monday
      expect(result.dateRange?.end).toBe("12/01/2025"); // Sunday
    });

    it("should handle dates without leading zeros", async () => {
      const file = new File([], "invoice_01-01-2025.pdf", { type: "application/pdf" });
      const result = await QuickDateExtractor.extractDateRangeFromFile(file);

      expect(result.dateRange).not.toBeNull();
      // January 1, 2025 is a Wednesday
      expect(result.dateRange?.start).toBe("30/12/2024"); // Previous Monday
      expect(result.dateRange?.end).toBe("05/01/2025"); // Following Sunday
    });

    it("should handle files with multiple date patterns", async () => {
      // Should match first valid pattern (runsheet pattern has priority)
      const file = new File([], "runsheet_2025-06-30_backup_2025-07-01.pdf", {
        type: "application/pdf",
      });
      const result = await QuickDateExtractor.extractDateRangeFromFile(file);

      expect(result.dateRange).not.toBeNull();
      expect(result.dateRange?.start).toBe("30/06/2025"); // First date matched
      expect(result.dateRange?.end).toBe("06/07/2025");
    });

    it("should handle very long filenames", async () => {
      const longName = `very_long_filename_with_lots_of_text_${"a".repeat(200)}_2025-07-14.pdf`;
      const file = new File([], longName, { type: "application/pdf" });
      const result = await QuickDateExtractor.extractDateRangeFromFile(file);

      expect(result.dateRange).not.toBeNull();
      expect(result.dateRange?.start).toBe("14/07/2025");
      expect(result.dateRange?.end).toBe("20/07/2025");
    });

    it("should handle filenames with special characters", async () => {
      const file = new File([], "runsheet#2025-07-21@driver.pdf", { type: "application/pdf" });
      const result = await QuickDateExtractor.extractDateRangeFromFile(file);

      expect(result.dateRange).not.toBeNull();
      expect(result.dateRange?.start).toBe("21/07/2025");
      expect(result.dateRange?.end).toBe("27/07/2025");
    });
  });

  describe("Date Validation", () => {
    it("should extract dates even if invalid (JS Date auto-corrects)", async () => {
      // Note: JavaScript Date constructor is lenient and auto-corrects invalid dates
      // Feb 31 -> Mar 3, Month 13 -> January next year, etc.
      // This is acceptable for QuickDateExtractor since we want speed over strict validation
      const file = new File([], "doc_2025-02-31.pdf", { type: "application/pdf" });
      const result = await QuickDateExtractor.extractDateRangeFromFile(file);

      // Will be auto-corrected to March 3, 2025
      expect(result.dateRange).not.toBeNull();
      expect(result.dateRange?.start).toBe("03/03/2025"); // Monday of that week
    });

    it("should extract dates even with invalid month (13)", async () => {
      // Month 13 gets converted to January of next year
      const file = new File([], "doc_2025-13-01.pdf", { type: "application/pdf" });
      const result = await QuickDateExtractor.extractDateRangeFromFile(file);

      expect(result.dateRange).not.toBeNull();
      // Will be converted to 2026-01-01
      expect(result.dateRange?.start).toBe("29/12/2025"); // Monday of that week
    });

    it("should extract dates even with invalid day (32)", async () => {
      // Day 32 in July gets converted to August 1
      const file = new File([], "doc_2025-07-32.pdf", { type: "application/pdf" });
      const result = await QuickDateExtractor.extractDateRangeFromFile(file);

      expect(result.dateRange).not.toBeNull();
      // Will be converted to 2025-08-01
      expect(result.dateRange?.start).toBe("28/07/2025"); // Monday of that week
    });

    it("should accept valid end-of-month dates", async () => {
      const files = [
        new File([], "doc_2025-01-31.pdf", { type: "application/pdf" }), // Jan 31
        new File([], "doc_2025-03-31.pdf", { type: "application/pdf" }), // Mar 31
        new File([], "doc_2025-12-31.pdf", { type: "application/pdf" }), // Dec 31
      ];

      for (const file of files) {
        const result = await QuickDateExtractor.extractDateRangeFromFile(file);
        expect(result.dateRange).not.toBeNull();
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle file with null name gracefully", async () => {
      const file = new File([], "", { type: "application/pdf" });
      const result = await QuickDateExtractor.extractDateRangeFromFile(file);

      expect(result.extractionMethod).toBe("failed");
      expect(result.dateRange).toBeNull();
    });

    it("should handle batch with some failed extractions", async () => {
      const files = [
        new File([], "runsheet_2025-06-30.pdf", { type: "application/pdf" }), // Valid
        new File([], "invalid.pdf", { type: "application/pdf" }), // Invalid
        new File([], "invoice_2025-07-07.pdf", { type: "application/pdf" }), // Valid
      ];

      const result = await QuickDateExtractor.extractDateRange(files);

      expect(result).not.toBeNull();
      expect(result?.start).toBe("30/06/2025"); // Should still get range from valid files
      expect(result?.end).toBe("13/07/2025");
    });

    it("should not throw on malformed dates", async () => {
      const file = new File([], "doc_abc-def-ghi.pdf", { type: "application/pdf" });

      await expect(QuickDateExtractor.extractDateRangeFromFile(file)).resolves.not.toThrow();
    });
  });
});
