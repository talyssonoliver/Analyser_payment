/**
 * Analysis Merge Service Unit Tests
 * Tests for Phase 2.1 merge functionality
 */

import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PAYMENT_RULES } from "../../../src/lib/constants";
import { DailyEntry } from "../../../src/lib/domain/entities/daily-entry";
import { PaymentRules } from "../../../src/lib/domain/entities/payment-rules";
import { AnalysisMergeService } from "../../../src/lib/services/analysis-merge-service";

describe("AnalysisMergeService", () => {
  let service: AnalysisMergeService;
  let _paymentRules: PaymentRules;

  beforeEach(() => {
    service = new AnalysisMergeService();
    _paymentRules = new PaymentRules({
      userId: "test-user",
      ...DEFAULT_PAYMENT_RULES,
    });
  });

  describe("mergeDailyEntries", () => {
    it("should merge complementary data (runsheet + invoice)", async () => {
      // Arrange: Runsheet data (has consignments, no payment)
      const runsheetEntry = new DailyEntry({
        analysisId: "analysis-001",
        date: new Date("2025-06-30"),
        consignments: 50,
        rate: 2.0,
        basePayment: 100.0,
        pickups: 0,
        pickupTotal: 0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        paidAmount: 0, // No payment data
      });

      // Invoice data (has payment, no consignments)
      const invoiceEntry = new DailyEntry({
        analysisId: "analysis-001",
        date: new Date("2025-06-30"),
        consignments: 0, // No consignment data
        rate: 2.0,
        basePayment: 0,
        pickups: 0,
        pickupTotal: 0,
        unloadingBonus: 0,
        attendanceBonus: 0,
        earlyBonus: 0,
        paidAmount: 205.0, // Has payment
      });

      // Act
      const result = await service.mergeDailyEntries([runsheetEntry], [invoiceEntry]);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.strategy).toBe("complementary");

      const mergedEntry = result.entries[0];
      expect(mergedEntry.consignments.count).toBe(50); // From runsheet
      expect(mergedEntry.unloadingBonus.amount).toBe(30.0); // From runsheet
      expect(mergedEntry.attendanceBonus.amount).toBe(25.0); // From runsheet
      expect(mergedEntry.earlyBonus.amount).toBe(50.0); // From runsheet
      expect(mergedEntry.paidAmount.amount).toBe(205.0); // From invoice
    });

    it("should overwrite with latest data (corrected runsheet)", async () => {
      // Arrange: Original runsheet (wrong data)
      const originalEntry = new DailyEntry({
        analysisId: "analysis-001",
        date: new Date("2025-06-30"),
        consignments: 50, // Wrong
        rate: 2.0,
        basePayment: 100.0,
        pickups: 0,
        pickupTotal: 0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        paidAmount: 205.0,
      });

      // Corrected runsheet (correct data)
      const correctedEntry = new DailyEntry({
        analysisId: "analysis-001",
        date: new Date("2025-06-30"),
        consignments: 55, // Corrected
        rate: 2.0,
        basePayment: 110.0,
        pickups: 0,
        pickupTotal: 0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        paidAmount: 215.0,
      });

      // Act
      const result = await service.mergeDailyEntries([originalEntry], [correctedEntry]);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.strategy).toBe("overwrite");
      expect(result.warnings).toHaveLength(1);

      const mergedEntry = result.entries[0];
      expect(mergedEntry.consignments.count).toBe(55); // Corrected value
      expect(mergedEntry.paidAmount.amount).toBe(215.0); // Corrected value
    });

    it("should handle partial date overlaps", async () => {
      // Arrange: Multiple dates, some overlapping
      const existing = [
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-06-30"),
          consignments: 50,
          rate: 2.0,
          paidAmount: 205.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        }),
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-07-01"),
          consignments: 45,
          rate: 2.0,
          paidAmount: 195.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        }),
      ];

      const newEntries = [
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-07-01"), // Overlaps
          consignments: 0,
          rate: 2.0,
          paidAmount: 200.0, // Updated payment
          unloadingBonus: 0,
          attendanceBonus: 0,
          earlyBonus: 0,
        }),
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-07-02"), // New date
          consignments: 52,
          rate: 2.0,
          paidAmount: 209.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        }),
      ];

      // Act
      const result = await service.mergeDailyEntries(existing, newEntries);

      // Assert
      expect(result.entries).toHaveLength(3); // 2 original + 1 new
      expect(result.entries[0].date.toISOString().split("T")[0]).toBe("2025-06-30");
      expect(result.entries[1].date.toISOString().split("T")[0]).toBe("2025-07-01");
      expect(result.entries[2].date.toISOString().split("T")[0]).toBe("2025-07-02");

      // July 1 should be merged with complementary strategy
      const july1Entry = result.entries[1];
      expect(july1Entry.consignments.count).toBe(45); // From existing
      // Payment should be from existing since it's complementary (existing has both, new has only payment)
      expect(july1Entry.paidAmount.amount).toBe(195.0); // From existing (was already complete)
    });

    it("should handle no conflicts (all new dates)", async () => {
      // Arrange
      const existing = [
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-06-30"),
          consignments: 50,
          rate: 2.0,
          paidAmount: 205.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        }),
      ];

      const newEntries = [
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-07-01"),
          consignments: 45,
          rate: 2.0,
          paidAmount: 195.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        }),
      ];

      // Act
      const result = await service.mergeDailyEntries(existing, newEntries);

      // Assert
      expect(result.entries).toHaveLength(2);
      expect(result.warnings).toHaveLength(0);
      expect(result.entries[0].date.toISOString().split("T")[0]).toBe("2025-06-30");
      expect(result.entries[1].date.toISOString().split("T")[0]).toBe("2025-07-01");
    });

    it("should merge multiple entries for same date with mixed data", async () => {
      // Arrange: 3 entries for same date
      const entry1 = new DailyEntry({
        analysisId: "analysis-001",
        date: new Date("2025-06-30"),
        consignments: 50,
        rate: 2.0,
        basePayment: 100.0,
        pickups: 0,
        pickupTotal: 0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        paidAmount: 0, // Runsheet
      });

      const entry2 = new DailyEntry({
        analysisId: "analysis-001",
        date: new Date("2025-06-30"),
        consignments: 0,
        rate: 2.0,
        basePayment: 0,
        pickups: 1,
        pickupTotal: 5.0,
        unloadingBonus: 0,
        attendanceBonus: 0,
        earlyBonus: 0,
        paidAmount: 0, // Pickup service
      });

      const entry3 = new DailyEntry({
        analysisId: "analysis-001",
        date: new Date("2025-06-30"),
        consignments: 0,
        rate: 2.0,
        basePayment: 0,
        pickups: 0,
        pickupTotal: 0,
        unloadingBonus: 0,
        attendanceBonus: 0,
        earlyBonus: 0,
        paidAmount: 210.0, // Invoice
      });

      // Act
      const result = await service.mergeDailyEntries([entry1, entry2], [entry3]);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.strategy).toBe("complementary");

      const merged = result.entries[0];
      expect(merged.consignments.count).toBe(50); // From runsheet
      expect(merged.pickups.count).toBe(1); // From pickup service
      expect(merged.pickupTotal.amount).toBe(5.0); // From pickup service
      expect(merged.paidAmount.amount).toBe(210.0); // From invoice
    });

    it("should maintain date sorting after merge", async () => {
      // Arrange: Unsorted entries
      const existing = [
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-07-02"),
          consignments: 52,
          rate: 2.0,
          paidAmount: 209.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        }),
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-06-30"),
          consignments: 50,
          rate: 2.0,
          paidAmount: 205.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        }),
      ];

      const newEntries = [
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-07-01"),
          consignments: 45,
          rate: 2.0,
          paidAmount: 195.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        }),
      ];

      // Act
      const result = await service.mergeDailyEntries(existing, newEntries);

      // Assert: Should be sorted by date
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].date.toISOString().split("T")[0]).toBe("2025-06-30");
      expect(result.entries[1].date.toISOString().split("T")[0]).toBe("2025-07-01");
      expect(result.entries[2].date.toISOString().split("T")[0]).toBe("2025-07-02");
    });
  });

  describe("detectMergeStrategy", () => {
    it("should detect complementary strategy", () => {
      // Arrange
      const entries = [
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-06-30"),
          consignments: 50,
          rate: 2.0,
          paidAmount: 0, // No payment
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        }),
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-06-30"),
          consignments: 0, // No consignments
          rate: 2.0,
          paidAmount: 205.0,
          unloadingBonus: 0,
          attendanceBonus: 0,
          earlyBonus: 0,
        }),
      ];

      // Act
      const strategy = service.detectMergeStrategy(entries);

      // Assert
      expect(strategy.type).toBe("complementary");
      expect(strategy.description).toContain(
        "Combining runsheet consignments with invoice payments"
      );
    });

    it("should detect overwrite strategy", () => {
      // Arrange
      const entries = [
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-06-30"),
          consignments: 50,
          rate: 2.0,
          paidAmount: 205.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        }),
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-06-30"),
          consignments: 55, // Corrected
          rate: 2.0,
          paidAmount: 215.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        }),
      ];

      // Act
      const strategy = service.detectMergeStrategy(entries);

      // Assert
      expect(strategy.type).toBe("overwrite");
      expect(strategy.description).toContain("Using latest data");
    });
  });

  describe("validateMergeResult", () => {
    it("should validate successful merge result", () => {
      // Arrange
      const result = {
        success: true,
        message: "Merge successful",
        mergedEntries: [
          new DailyEntry({
            analysisId: "analysis-001",
            date: new Date("2025-06-30"),
            consignments: 50,
            rate: 2.0,
            paidAmount: 205.0,
            unloadingBonus: 30.0,
            attendanceBonus: 25.0,
            earlyBonus: 50.0,
          }),
        ],
        strategy: "complementary" as const,
      };

      // Act
      const validation = service.validateMergeResult(result);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect invalid consignments", () => {
      // Arrange - ConsignmentCount value object validates on construction
      // So we need to test that the validation would catch this if it got through

      // Test that trying to create an invalid entry throws an error
      expect(() => {
        new DailyEntry({
          analysisId: "analysis-001",
          date: new Date("2025-06-30"),
          consignments: -5, // Invalid - should throw
          rate: 2.0,
          paidAmount: 205.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });
      }).toThrow("Invalid consignment count");

      // Also test validation of empty merge result
      const result = {
        success: true,
        message: "Merge successful",
        mergedEntries: [],
        strategy: "complementary" as const,
      };

      const validation = service.validateMergeResult(result);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("No entries in merge result");
    });

    it("should detect failed merge", () => {
      // Arrange
      const result = {
        success: false,
        message: "Merge failed",
        errors: ["File processing error"],
      };

      // Act
      const validation = service.validateMergeResult(result);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Merge operation failed");
      expect(validation.errors).toContain("File processing error");
    });

    it("should detect empty merge result", () => {
      // Arrange
      const result = {
        success: true,
        message: "Merge successful",
        mergedEntries: [],
        strategy: "complementary" as const,
      };

      // Act
      const validation = service.validateMergeResult(result);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("No entries in merge result");
    });
  });

  describe("Performance", () => {
    it("should merge typical week (5-7 days) in under 5 seconds", async () => {
      // Arrange: Create 7 days of entries
      const existing = Array.from({ length: 7 }, (_, i) => {
        const date = new Date("2025-06-30");
        date.setDate(date.getDate() + i);
        return new DailyEntry({
          analysisId: "analysis-001",
          date,
          consignments: 50,
          rate: 2.0,
          paidAmount: 0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
        });
      });

      const newEntries = Array.from({ length: 7 }, (_, i) => {
        const date = new Date("2025-06-30");
        date.setDate(date.getDate() + i);
        return new DailyEntry({
          analysisId: "analysis-001",
          date,
          consignments: 0,
          rate: 2.0,
          paidAmount: 205.0,
          unloadingBonus: 0,
          attendanceBonus: 0,
          earlyBonus: 0,
        });
      });

      // Act
      const startTime = Date.now();
      const result = await service.mergeDailyEntries(existing, newEntries);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(result.entries).toHaveLength(7);
      expect(result.strategy).toBe("complementary");
    });
  });
});
