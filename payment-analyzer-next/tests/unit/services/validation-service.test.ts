/**
 * ValidationService Test Suite
 * Comprehensive tests for business rule validation
 */

import { beforeEach, describe, expect, it } from "vitest";
import { Analysis } from "@/lib/domain/entities/analysis";
import { DailyEntry } from "@/lib/domain/entities/daily-entry";
import { PaymentRules } from "@/lib/domain/entities/payment-rules";
import { ValidationService } from "@/lib/domain/services/validation-service";
import { createTestDate } from "@/tests/helpers/date-helpers";

describe("ValidationService", () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  // ========================================
  // validateAnalysis() Tests
  // ========================================

  describe("validateAnalysis()", () => {
    describe("No Daily Entries", () => {
      it("should return error when analysis has no daily entries", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "manual",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 16),
          rulesVersion: 1,
          dailyEntries: [],
        });

        const result = validationService.validateAnalysis(analysis);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe("NO_DAILY_ENTRIES");
        expect(result.errors[0].message).toBe("Analysis must contain at least one daily entry");
      });

      it("should set isValid to false when no daily entries", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "manual",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 16),
          rulesVersion: 1,
        });

        const result = validationService.validateAnalysis(analysis);

        expect(result.isValid).toBe(false);
      });

      it("should provide descriptive error message for no entries", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 16),
          rulesVersion: 1,
        });

        const result = validationService.validateAnalysis(analysis);

        expect(result.errors[0].message).toContain("daily entry");
      });
    });

    describe("Missing Working Days", () => {
      it("should return warning when working days are missing", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10), // Monday
          periodEnd: createTestDate(2024, 6, 14), // Friday
          rulesVersion: 1,
        });

        // Add only Monday and Wednesday entries (missing Tue, Thu, Fri)
        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10), // Monday
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0,
          })
        );

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 12), // Wednesday
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0,
          })
        );

        const result = validationService.validateAnalysis(analysis);

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].code).toBe("MISSING_WORKING_DAYS");
      });

      it("should identify specific missing weekdays in period", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10), // Monday
          periodEnd: createTestDate(2024, 6, 12), // Wednesday
          rulesVersion: 1,
        });

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10), // Monday
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0,
          })
        );

        const result = validationService.validateAnalysis(analysis);

        expect(result.warnings[0].message).toContain("Missing entries for working days");
        expect(result.warnings[0].value).toBeDefined();
        expect(Array.isArray(result.warnings[0].value)).toBe(true);
      });

      it("should ignore Sundays as non-working days", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 9), // Sunday
          periodEnd: createTestDate(2024, 6, 10), // Monday
          rulesVersion: 1,
        });

        // Only add Monday entry (Sunday should be ignored)
        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10), // Monday
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0,
          })
        );

        const result = validationService.validateAnalysis(analysis);

        // Should have no warnings about missing days (Sunday is non-working)
        const missingDaysWarning = result.warnings.find((w) => w.code === "MISSING_WORKING_DAYS");
        expect(missingDaysWarning).toBeUndefined();
      });

      it("should include list of missing dates in warning", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10), // Monday
          periodEnd: createTestDate(2024, 6, 12), // Wednesday
          rulesVersion: 1,
        });

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10), // Monday
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0,
          })
        );

        const result = validationService.validateAnalysis(analysis);

        const missingDaysWarning = result.warnings.find((w) => w.code === "MISSING_WORKING_DAYS");
        expect(missingDaysWarning?.value).toBeInstanceOf(Array);
        expect((missingDaysWarning?.value as Date[]).length).toBeGreaterThan(0);
      });

      it("should keep isValid true for warnings only", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 14),
          rulesVersion: 1,
        });

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0,
          })
        );

        const result = validationService.validateAnalysis(analysis);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("Duplicate Entries", () => {
      it("should return error when duplicate dates exist", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 14),
          rulesVersion: 1,
        });

        // Manually add duplicates to internal array (bypassing addDailyEntry which prevents duplicates)
        const entry1 = new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 10),
          consignments: 50,
          rate: 2.0,
          paidAmount: 100.0,
        });

        const entry2 = new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 10), // Same date
          consignments: 60,
          rate: 2.0,
          paidAmount: 120.0,
        });

        // Access private property for testing (use type assertion)
        (analysis as any)._dailyEntries = [entry1, entry2];

        const result = validationService.validateAnalysis(analysis);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.code === "DUPLICATE_ENTRIES")).toBe(true);
      });

      it("should identify all duplicate dates", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 14),
          rulesVersion: 1,
        });

        const entry1 = new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 10),
          consignments: 50,
          rate: 2.0,
          paidAmount: 100.0,
        });

        const entry2 = new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 10),
          consignments: 60,
          rate: 2.0,
          paidAmount: 120.0,
        });

        (analysis as any)._dailyEntries = [entry1, entry2];

        const result = validationService.validateAnalysis(analysis);

        const duplicateError = result.errors.find((e) => e.code === "DUPLICATE_ENTRIES");
        expect(duplicateError?.value).toBeInstanceOf(Array);
      });

      it("should list all duplicate dates in error", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 14),
          rulesVersion: 1,
        });

        const entries = [
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0,
          }),
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 60,
            rate: 2.0,
            paidAmount: 120.0,
          }),
        ];

        (analysis as any)._dailyEntries = entries;

        const result = validationService.validateAnalysis(analysis);

        expect(result.errors.some((e) => e.code === "DUPLICATE_ENTRIES")).toBe(true);
      });

      it("should set isValid to false for duplicates", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 14),
          rulesVersion: 1,
        });

        const entries = [
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0,
          }),
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 60,
            rate: 2.0,
            paidAmount: 120.0,
          }),
        ];

        (analysis as any)._dailyEntries = entries;

        const result = validationService.validateAnalysis(analysis);

        expect(result.isValid).toBe(false);
      });

      it("should handle multiple different duplicate dates", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 14),
          rulesVersion: 1,
        });

        const entries = [
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0,
          }),
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 60,
            rate: 2.0,
            paidAmount: 120.0,
          }),
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 12),
            consignments: 70,
            rate: 2.0,
            paidAmount: 140.0,
          }),
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 12),
            consignments: 80,
            rate: 2.0,
            paidAmount: 160.0,
          }),
        ];

        (analysis as any)._dailyEntries = entries;

        const result = validationService.validateAnalysis(analysis);

        const duplicateError = result.errors.find((e) => e.code === "DUPLICATE_ENTRIES");
        expect(duplicateError).toBeDefined();
        expect((duplicateError?.value as Date[]).length).toBe(2);
      });
    });

    describe("Large Discrepancies", () => {
      it("should return warning when discrepancies exceed £50", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 10),
          rulesVersion: 1,
        });

        // Large positive discrepancy
        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: 200.0, // Expected: 100, Paid: 200, Diff: +100
          })
        );

        const result = validationService.validateAnalysis(analysis);

        expect(result.warnings.some((w) => w.code === "LARGE_DISCREPANCIES")).toBe(true);
      });

      it("should detect positive discrepancies greater than £50", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 10),
          rulesVersion: 1,
        });

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: 175.0, // Diff: +75
          })
        );

        const result = validationService.validateAnalysis(analysis);

        const discrepancyWarning = result.warnings.find((w) => w.code === "LARGE_DISCREPANCIES");
        expect(discrepancyWarning).toBeDefined();
      });

      it("should detect negative discrepancies less than -£50", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 10),
          rulesVersion: 1,
        });

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: 25.0, // Expected: 100, Paid: 25, Diff: -75
          })
        );

        const result = validationService.validateAnalysis(analysis);

        expect(result.warnings.some((w) => w.code === "LARGE_DISCREPANCIES")).toBe(true);
      });

      it("should include count of affected days in warning", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 11),
          rulesVersion: 1,
        });

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: 200.0,
          })
        );

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 11),
            consignments: 50,
            rate: 2.0,
            paidAmount: 200.0,
          })
        );

        const result = validationService.validateAnalysis(analysis);

        const discrepancyWarning = result.warnings.find((w) => w.code === "LARGE_DISCREPANCIES");
        expect(discrepancyWarning?.message).toContain("2 days");
      });

      it("should keep isValid true for warning only", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 10),
          rulesVersion: 1,
        });

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: 200.0,
          })
        );

        const result = validationService.validateAnalysis(analysis);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("Daily Entry Validation Integration", () => {
      it("should aggregate errors from all daily entries", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 11),
          rulesVersion: 1,
        });

        // Two entries with negative payments (errors)
        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: -100.0,
          })
        );

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 11),
            consignments: 50,
            rate: 2.0,
            paidAmount: -50.0,
          })
        );

        const result = validationService.validateAnalysis(analysis);

        expect(result.errors.filter((e) => e.code === "NEGATIVE_PAYMENT")).toHaveLength(2);
      });

      it("should aggregate warnings from all daily entries", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 9),
          periodEnd: createTestDate(2024, 6, 9),
          rulesVersion: 1,
        });

        // Sunday with consignments (warning)
        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 9), // Sunday
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0,
          })
        );

        const result = validationService.validateAnalysis(analysis);

        expect(result.warnings.some((w) => w.code === "SUNDAY_CONSIGNMENTS")).toBe(true);
      });

      it("should validate each entry independently", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 11),
          rulesVersion: 1,
        });

        // One valid, one invalid
        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0, // Valid
          })
        );

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 11),
            consignments: 50,
            rate: 2.0,
            paidAmount: -50.0, // Invalid
          })
        );

        const result = validationService.validateAnalysis(analysis);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe("NEGATIVE_PAYMENT");
      });

      it("should combine multiple error types", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 10),
          rulesVersion: 1,
        });

        // Negative payment error
        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: -100.0,
          })
        );

        // Add duplicate (manually)
        const duplicateEntry = new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 10),
          consignments: 60,
          rate: 2.0,
          paidAmount: 120.0,
        });

        (analysis as any)._dailyEntries.push(duplicateEntry);

        const result = validationService.validateAnalysis(analysis);

        expect(result.errors.length).toBeGreaterThan(1);
        expect(result.errors.some((e) => e.code === "NEGATIVE_PAYMENT")).toBe(true);
        expect(result.errors.some((e) => e.code === "DUPLICATE_ENTRIES")).toBe(true);
      });

      it("should return valid result when all checks pass", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 10),
          rulesVersion: 1,
        });

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0,
          })
        );

        const result = validationService.validateAnalysis(analysis);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("Edge Cases", () => {
      it("should handle empty analysis with default values", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "manual",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 10),
          rulesVersion: 1,
        });

        const result = validationService.validateAnalysis(analysis);

        expect(result).toBeDefined();
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe("NO_DAILY_ENTRIES");
      });

      it("should handle single-day analysis correctly", () => {
        const analysis = new Analysis({
          userId: "user-123",
          fingerprint: "fp-test",
          source: "upload",
          periodStart: createTestDate(2024, 6, 10),
          periodEnd: createTestDate(2024, 6, 10),
          rulesVersion: 1,
        });

        analysis.addDailyEntry(
          new DailyEntry({
            analysisId: analysis.id,
            date: createTestDate(2024, 6, 10),
            consignments: 50,
            rate: 2.0,
            paidAmount: 100.0,
          })
        );

        const result = validationService.validateAnalysis(analysis);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  // ========================================
  // validateDailyEntry() Tests
  // ========================================

  describe("validateDailyEntry()", () => {
    describe("Sunday Consignments", () => {
      it("should return warning for consignments on Sunday", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 9), // Sunday
          consignments: 50,
          rate: 2.0,
          paidAmount: 100.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].code).toBe("SUNDAY_CONSIGNMENTS");
        expect(result.warnings[0].message).toContain("Sunday");
      });

      it("should only warn on Sundays, not other days", () => {
        // Monday
        const mondayEntry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10), // Monday
          consignments: 50,
          rate: 2.0,
          paidAmount: 100.0,
        });

        const mondayResult = validationService.validateDailyEntry(mondayEntry);
        expect(mondayResult.warnings.some((w) => w.code === "SUNDAY_CONSIGNMENTS")).toBe(false);

        // Saturday
        const saturdayEntry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 15), // Saturday
          consignments: 50,
          rate: 3.0,
          paidAmount: 150.0,
        });

        const saturdayResult = validationService.validateDailyEntry(saturdayEntry);
        expect(saturdayResult.warnings.some((w) => w.code === "SUNDAY_CONSIGNMENTS")).toBe(false);
      });

      it("should include consignment count in warning", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 9), // Sunday
          consignments: 75,
          rate: 2.0,
          paidAmount: 150.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.warnings[0].field).toBe("consignments");
        expect(result.warnings[0].value).toBe(75);
      });

      it("should keep isValid true for warning only", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 9), // Sunday
          consignments: 50,
          rate: 2.0,
          paidAmount: 100.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("Payment Without Consignments", () => {
      it("should return warning for zero consignments with payment", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 0,
          rate: 2.0,
          paidAmount: 50.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.warnings.some((w) => w.code === "PAYMENT_WITHOUT_CONSIGNMENTS")).toBe(true);
      });

      it("should detect zero consignments with positive payment", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 0,
          rate: 2.0,
          paidAmount: 100.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.warnings[0].code).toBe("PAYMENT_WITHOUT_CONSIGNMENTS");
        expect(result.warnings[0].field).toBe("paidAmount");
      });

      it("should include payment amount in warning", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 0,
          rate: 2.0,
          paidAmount: 125.5,
        });

        const result = validationService.validateDailyEntry(entry);

        const warning = result.warnings.find((w) => w.code === "PAYMENT_WITHOUT_CONSIGNMENTS");
        expect(warning?.value).toBe(125.5);
      });

      it("should keep isValid true for warning only", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 0,
          rate: 2.0,
          paidAmount: 50.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("High Consignment Count", () => {
      it("should return warning when count exceeds 200", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 250,
          rate: 2.0,
          paidAmount: 500.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.warnings.some((w) => w.code === "HIGH_CONSIGNMENT_COUNT")).toBe(true);
      });

      it("should trigger warning when count is greater than 200", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 201,
          rate: 2.0,
          paidAmount: 402.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.warnings[0].code).toBe("HIGH_CONSIGNMENT_COUNT");
        expect(result.warnings[0].message).toContain("high");
      });

      it("should include actual count in warning", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 300,
          rate: 2.0,
          paidAmount: 600.0,
        });

        const result = validationService.validateDailyEntry(entry);

        const warning = result.warnings.find((w) => w.code === "HIGH_CONSIGNMENT_COUNT");
        expect(warning?.value).toBe(300);
      });

      it("should keep isValid true for warning only", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 250,
          rate: 2.0,
          paidAmount: 500.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("High Payment Amount", () => {
      it("should return warning when amount exceeds £1000", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 500,
          rate: 2.0,
          paidAmount: 1500.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.warnings.some((w) => w.code === "HIGH_PAYMENT_AMOUNT")).toBe(true);
      });

      it("should trigger warning when amount is greater than £1000", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 100, // Changed from 505 to avoid HIGH_CONSIGNMENT_COUNT warning
          rate: 2.0,
          paidAmount: 1001.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.warnings[0].code).toBe("HIGH_PAYMENT_AMOUNT");
      });

      it("should include actual amount in warning", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 750,
          rate: 2.0,
          paidAmount: 2000.0,
        });

        const result = validationService.validateDailyEntry(entry);

        const warning = result.warnings.find((w) => w.code === "HIGH_PAYMENT_AMOUNT");
        expect(warning?.value).toBe(2000.0);
      });

      it("should keep isValid true for warning only", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 500,
          rate: 2.0,
          paidAmount: 1500.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("Negative Payment", () => {
      it("should return error for negative payment amount", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 50,
          rate: 2.0,
          paidAmount: -100.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe("NEGATIVE_PAYMENT");
      });

      it("should set isValid to false for negative payment", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 50,
          rate: 2.0,
          paidAmount: -50.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.isValid).toBe(false);
      });

      it("should include payment amount in error", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 50,
          rate: 2.0,
          paidAmount: -75.5,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.errors[0].field).toBe("paidAmount");
        expect(result.errors[0].value).toBe(-75.5);
      });

      it("should prevent negative payment amounts", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 50,
          rate: 2.0,
          paidAmount: -1.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].message).toContain("cannot be negative");
      });
    });

    describe("Multiple Issues", () => {
      it("should return multiple warnings for different issues", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 9), // Sunday
          consignments: 250, // High count
          rate: 2.0,
          paidAmount: 500.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.warnings.length).toBeGreaterThanOrEqual(2);
        expect(result.warnings.some((w) => w.code === "SUNDAY_CONSIGNMENTS")).toBe(true);
        expect(result.warnings.some((w) => w.code === "HIGH_CONSIGNMENT_COUNT")).toBe(true);
      });

      it("should combine errors and warnings", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 250, // High count (warning)
          rate: 2.0,
          paidAmount: -100.0, // Negative (error)
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.errors).toHaveLength(1);
        expect(result.warnings.length).toBeGreaterThanOrEqual(1);
        expect(result.isValid).toBe(false);
      });

      it("should set isValid false only when errors exist", () => {
        // Only warnings
        const warningEntry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 9), // Sunday
          consignments: 250, // High count
          rate: 2.0,
          paidAmount: 500.0,
        });

        const warningResult = validationService.validateDailyEntry(warningEntry);
        expect(warningResult.isValid).toBe(true);

        // With error
        const errorEntry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10),
          consignments: 50,
          rate: 2.0,
          paidAmount: -100.0,
        });

        const errorResult = validationService.validateDailyEntry(errorEntry);
        expect(errorResult.isValid).toBe(false);
      });
    });

    describe("Valid Entry", () => {
      it("should return no errors or warnings for valid entry", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 10), // Monday
          consignments: 50,
          rate: 2.0,
          paidAmount: 100.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it("should set isValid to true for valid entry", () => {
        const entry = new DailyEntry({
          analysisId: "analysis-123",
          date: createTestDate(2024, 6, 11), // Tuesday
          consignments: 75,
          rate: 2.0,
          paidAmount: 150.0,
        });

        const result = validationService.validateDailyEntry(entry);

        expect(result.isValid).toBe(true);
      });
    });
  });

  // ========================================
  // validatePaymentRules() Tests
  // ========================================

  describe("validatePaymentRules()", () => {
    describe("Negative Rates", () => {
      it("should return error for negative weekday rate", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: -2.0,
          saturdayRate: 3.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.errors.some((e) => e.code === "NEGATIVE_WEEKDAY_RATE")).toBe(true);
      });

      it("should return error for negative Saturday rate", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 2.0,
          saturdayRate: -3.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.errors.some((e) => e.code === "NEGATIVE_SATURDAY_RATE")).toBe(true);
      });

      it("should include field and value in error", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: -2.5,
          saturdayRate: 3.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        const error = result.errors.find((e) => e.code === "NEGATIVE_WEEKDAY_RATE");
        expect(error?.field).toBe("weekdayRate");
        expect(error?.value).toBe(-2.5);
      });

      it("should set isValid to false for negative rates", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: -2.0,
          saturdayRate: 3.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.isValid).toBe(false);
      });

      it("should check both rates in same validation", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: -2.0,
          saturdayRate: -3.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.errors.some((e) => e.code === "NEGATIVE_WEEKDAY_RATE")).toBe(true);
        expect(result.errors.some((e) => e.code === "NEGATIVE_SATURDAY_RATE")).toBe(true);
      });

      it("should allow zero rates as valid", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 0,
          saturdayRate: 0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.errors.filter((e) => e.code.includes("NEGATIVE")).length).toBe(0);
      });
    });

    describe("Negative Bonuses", () => {
      it("should return error for negative unloading bonus", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 2.0,
          saturdayRate: 3.0,
          unloadingBonus: -30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.errors.some((e) => e.code === "NEGATIVE_UNLOADING_BONUS")).toBe(true);
      });

      it("should return error for negative attendance bonus", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 2.0,
          saturdayRate: 3.0,
          unloadingBonus: 30.0,
          attendanceBonus: -25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.errors.some((e) => e.code === "NEGATIVE_ATTENDANCE_BONUS")).toBe(true);
      });

      it("should return error for negative early bonus", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 2.0,
          saturdayRate: 3.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: -50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.errors.some((e) => e.code === "NEGATIVE_EARLY_BONUS")).toBe(true);
      });

      it("should include field and value in bonus errors", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 2.0,
          saturdayRate: 3.0,
          unloadingBonus: -35.5,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        const error = result.errors.find((e) => e.code === "NEGATIVE_UNLOADING_BONUS");
        expect(error?.field).toBe("unloadingBonus");
        expect(error?.value).toBe(-35.5);
      });

      it("should set isValid to false for negative bonuses", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 2.0,
          saturdayRate: 3.0,
          unloadingBonus: -30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.isValid).toBe(false);
      });

      it("should allow zero bonuses as valid", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 2.0,
          saturdayRate: 3.0,
          unloadingBonus: 0,
          attendanceBonus: 0,
          earlyBonus: 0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.errors.filter((e) => e.code.includes("NEGATIVE")).length).toBe(0);
      });
    });

    describe("Saturday Rate Lower Warning", () => {
      it("should return warning when Saturday rate is lower than weekday", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 3.0,
          saturdayRate: 2.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.warnings.some((w) => w.code === "SATURDAY_RATE_LOWER")).toBe(true);
      });

      it("should include both rates in warning", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 3.0,
          saturdayRate: 2.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        const warning = result.warnings.find((w) => w.code === "SATURDAY_RATE_LOWER");
        expect(warning?.value).toBeDefined();
        expect((warning?.value as any).weekday).toBe(3.0);
        expect((warning?.value as any).saturday).toBe(2.0);
      });

      it("should keep isValid true for warning only", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 3.0,
          saturdayRate: 2.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("High Rate Warnings", () => {
      it("should warn when weekday rate exceeds £10", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 12.0,
          saturdayRate: 15.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.warnings.some((w) => w.code === "HIGH_WEEKDAY_RATE")).toBe(true);
      });

      it("should warn when Saturday rate exceeds £15", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 2.0,
          saturdayRate: 20.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.warnings.some((w) => w.code === "HIGH_SATURDAY_RATE")).toBe(true);
      });

      it("should keep isValid true for high rate warnings", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 12.0,
          saturdayRate: 20.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("Valid Rules", () => {
      it("should return no errors or warnings for valid rules", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 2.0,
          saturdayRate: 3.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it("should set isValid to true for valid rules", () => {
        const rules = new PaymentRules({
          userId: "user-123",
          weekdayRate: 2.0,
          saturdayRate: 3.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });

        const result = validationService.validatePaymentRules(rules);

        expect(result.isValid).toBe(true);
      });
    });
  });
});
