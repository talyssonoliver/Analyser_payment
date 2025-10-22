/**
 * Analysis Entity Test Suite
 * Comprehensive tests for analysis entity behavior
 */

import { beforeEach, describe, expect, it } from "vitest";
import { Analysis } from "@/lib/domain/entities/analysis";
import { DailyEntry } from "@/lib/domain/entities/daily-entry";
import { ConsignmentCount } from "@/lib/domain/value-objects/consignment-count";
import { DateRange } from "@/lib/domain/value-objects/date-range";
import { Money } from "@/lib/domain/value-objects/money";
import { createTestDate } from "@/tests/helpers/date-helpers";
import { expectMoneyEqual } from "@/tests/helpers/money-helpers";

describe("Analysis Entity", () => {
  describe("Constructor", () => {
    it("should create Analysis with all required fields", () => {
      const periodStart = createTestDate(2024, 6, 10);
      const periodEnd = createTestDate(2024, 6, 16);

      const analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc123",
        source: "upload",
        periodStart,
        periodEnd,
        rulesVersion: 1,
      });

      expect(analysis.userId).toBe("user-123");
      expect(analysis.fingerprint).toBe("fp-abc123");
      expect(analysis.source).toBe("upload");
      expect(analysis.period).toBeInstanceOf(DateRange);
      expect(analysis.rulesVersion).toBe(1);
    });

    it("should generate UUID if no ID provided", () => {
      const analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc123",
        source: "manual",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });

      expect(analysis.id).toBeDefined();
      expect(typeof analysis.id).toBe("string");
      expect(analysis.id.length).toBeGreaterThan(0);
    });

    it('should default status to "pending" if not provided', () => {
      const analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc123",
        source: "upload",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });

      expect(analysis.status).toBe("pending");
    });

    it("should default dailyEntries to empty array if not provided", () => {
      const analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc123",
        source: "upload",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });

      expect(analysis.dailyEntries).toEqual([]);
      expect(Array.isArray(analysis.dailyEntries)).toBe(true);
    });

    it("should default metadata to empty object if not provided", () => {
      const analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc123",
        source: "upload",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });

      expect(analysis.metadata).toEqual({});
      expect(typeof analysis.metadata).toBe("object");
    });

    it("should default createdAt and updatedAt to current date if not provided", () => {
      const beforeCreate = new Date();
      const analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc123",
        source: "upload",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });
      const afterCreate = new Date();

      expect(analysis.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(analysis.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(analysis.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(analysis.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it("should create DateRange from periodStart and periodEnd", () => {
      const periodStart = createTestDate(2024, 6, 10);
      const periodEnd = createTestDate(2024, 6, 16);

      const analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc123",
        source: "upload",
        periodStart,
        periodEnd,
        rulesVersion: 1,
      });

      expect(analysis.period).toBeInstanceOf(DateRange);
      expect(analysis.period.start.toDateString()).toBe(periodStart.toDateString());
      expect(analysis.period.end.toDateString()).toBe(periodEnd.toDateString());
    });

    it("should verify all fields set correctly", () => {
      const analysis = new Analysis({
        id: "analysis-123",
        userId: "user-456",
        fingerprint: "fp-xyz789",
        source: "import",
        status: "completed",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 3,
        metadata: { fileCount: 5 },
        createdAt: createTestDate(2024, 6, 1),
        updatedAt: createTestDate(2024, 6, 2),
      });

      expect(analysis.id).toBe("analysis-123");
      expect(analysis.userId).toBe("user-456");
      expect(analysis.fingerprint).toBe("fp-xyz789");
      expect(analysis.source).toBe("import");
      expect(analysis.status).toBe("completed");
      expect(analysis.rulesVersion).toBe(3);
      expect(analysis.metadata.fileCount).toBe(5);
    });
  });

  describe("Getters", () => {
    let analysis: Analysis;

    beforeEach(() => {
      analysis = new Analysis({
        id: "analysis-123",
        userId: "user-456",
        fingerprint: "fp-xyz789",
        source: "upload",
        status: "completed",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 2,
        metadata: { fileCount: 3 },
        createdAt: createTestDate(2024, 6, 1),
        updatedAt: createTestDate(2024, 6, 2),
      });
    });

    it("should return all correct values", () => {
      expect(analysis.id).toBe("analysis-123");
      expect(analysis.userId).toBe("user-456");
      expect(analysis.fingerprint).toBe("fp-xyz789");
      expect(analysis.source).toBe("upload");
      expect(analysis.status).toBe("completed");
      expect(analysis.rulesVersion).toBe(2);
    });

    it("should return readonly array for dailyEntries (defensive copy)", () => {
      const entries1 = analysis.dailyEntries;
      const entries2 = analysis.dailyEntries;

      expect(entries1).not.toBe(entries2); // Different array instances
      expect(entries1).toEqual(entries2); // But same contents
    });

    it("should return readonly object for metadata (defensive copy)", () => {
      const metadata1 = analysis.metadata;
      const metadata2 = analysis.metadata;

      expect(metadata1).not.toBe(metadata2); // Different object instances
      expect(metadata1).toEqual(metadata2); // But same contents
    });

    it("should return new Date instances for dates (defensive copies)", () => {
      const created1 = analysis.createdAt;
      const created2 = analysis.createdAt;

      expect(created1).not.toBe(created2); // Different instances
      expect(created1.getTime()).toBe(created2.getTime()); // Same time
    });

    it("should verify immutability - modifying returned values does not affect internal state", () => {
      const returnedDate = analysis.createdAt;
      const originalTime = returnedDate.getTime();

      returnedDate.setFullYear(2099); // Try to mutate

      const newReturnedDate = analysis.createdAt;
      expect(newReturnedDate.getTime()).toBe(originalTime); // Original still intact
    });

    it("should verify metadata immutability", () => {
      const metadata = analysis.metadata;
      (metadata as { fileCount: number }).fileCount = 999; // Try to mutate

      const newMetadata = analysis.metadata;
      expect(newMetadata.fileCount).toBe(3); // Original still intact
    });
  });

  describe("Computed Properties", () => {
    let analysis: Analysis;

    beforeEach(() => {
      analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "upload",
        periodStart: createTestDate(2024, 6, 10), // Monday
        periodEnd: createTestDate(2024, 6, 16), // Sunday
        rulesVersion: 1,
      });

      // Add entries for Monday through Sunday
      const entries = [
        // Monday (working day)
        new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 10),
          consignments: 100,
          rate: 2.0,
          paidAmount: 200.0,
        }),
        // Tuesday (working day)
        new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 11),
          consignments: 110,
          rate: 2.0,
          paidAmount: 220.0,
        }),
        // Wednesday (working day)
        new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 12),
          consignments: 105,
          rate: 2.0,
          unloadingBonus: 30.0,
          paidAmount: 240.0,
        }),
        // Saturday (working day)
        new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 15),
          consignments: 95,
          rate: 3.0,
          unloadingBonus: 30.0,
          paidAmount: 315.0,
        }),
        // Sunday (non-working day)
        new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 16),
          consignments: 0,
          rate: 2.0,
          paidAmount: 0,
        }),
      ];

      entries.forEach((entry) => analysis.addDailyEntry(entry));
    });

    it("should count working days correctly", () => {
      expect(analysis.workingDaysCount).toBe(4); // Mon, Tue, Wed, Sat (not Sun)
    });

    it("should sum total consignments", () => {
      const total = analysis.totalConsignments;
      expect(total).toBeInstanceOf(ConsignmentCount);
      expect(total.count).toBe(410); // 100 + 110 + 105 + 95 + 0
    });

    it("should sum base payment total", () => {
      const total = analysis.baseTotal;
      expect(total).toBeInstanceOf(Money);
      expectMoneyEqual(total.amount, 915.0); // 200 + 220 + 210 + 285 + 0
    });

    it("should sum bonus total", () => {
      const total = analysis.bonusTotal;
      expect(total).toBeInstanceOf(Money);
      expectMoneyEqual(total.amount, 60.0); // 0 + 0 + 30 + 30 + 0
    });

    it("should sum pickup total", () => {
      const total = analysis.pickupTotal;
      expect(total).toBeInstanceOf(Money);
      expectMoneyEqual(total.amount, 0); // No pickups in test data
    });

    it("should sum expected total", () => {
      const total = analysis.expectedTotal;
      expect(total).toBeInstanceOf(Money);
      expectMoneyEqual(total.amount, 975.0); // baseTotal (915) + bonusTotal (60) + pickupTotal (0)
    });

    it("should sum paid total", () => {
      const total = analysis.paidTotal;
      expect(total).toBeInstanceOf(Money);
      expectMoneyEqual(total.amount, 975.0); // 200 + 220 + 240 + 315 + 0
    });

    it("should calculate difference total (paidTotal - expectedTotal)", () => {
      const diff = analysis.differenceTotal;
      expect(diff).toBeInstanceOf(Money);
      expectMoneyEqual(diff.amount, 0.0); // 975 - 975
    });

    it('should return "balanced" when difference is zero', () => {
      const balancedAnalysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "manual",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 10),
        rulesVersion: 1,
      });

      balancedAnalysis.addDailyEntry(
        new DailyEntry({
          analysisId: balancedAnalysis.id,
          date: createTestDate(2024, 6, 10),
          consignments: 100,
          rate: 2.0,
          paidAmount: 200.0, // Exactly matches expected
        })
      );

      expect(balancedAnalysis.overallStatus).toBe("balanced");
    });

    it('should return "overpaid" when difference is positive', () => {
      // Now the main analysis is balanced, so create a new one with overpayment
      const overpaidAnalysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "manual",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 10),
        rulesVersion: 1,
      });

      overpaidAnalysis.addDailyEntry(
        new DailyEntry({
          analysisId: overpaidAnalysis.id,
          date: createTestDate(2024, 6, 10),
          consignments: 100,
          rate: 2.0,
          paidAmount: 250.0, // More than expected 200
        })
      );

      expect(overpaidAnalysis.overallStatus).toBe("overpaid");
    });

    it('should return "underpaid" when difference is negative', () => {
      const underpaidAnalysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "manual",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 10),
        rulesVersion: 1,
      });

      underpaidAnalysis.addDailyEntry(
        new DailyEntry({
          analysisId: underpaidAnalysis.id,
          date: createTestDate(2024, 6, 10),
          consignments: 100,
          rate: 2.0,
          paidAmount: 150.0, // Less than expected 200
        })
      );

      expect(underpaidAnalysis.overallStatus).toBe("underpaid");
    });

    it("should format period correctly", () => {
      const formatted = analysis.periodFormatted;
      expect(formatted).toBe("10/06/2024 - 16/06/2024");
    });
  });

  describe("addDailyEntry", () => {
    let analysis: Analysis;

    beforeEach(() => {
      analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "upload",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });
    });

    it("should add entry to dailyEntries array", () => {
      const entry = new DailyEntry({
        analysisId: analysis.id,
        date: createTestDate(2024, 6, 12),
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });

      analysis.addDailyEntry(entry);

      expect(analysis.dailyEntries.length).toBe(1);
      expect(analysis.dailyEntries[0]).toBe(entry);
    });

    it("should sort entries by date after adding", () => {
      const entry1 = new DailyEntry({
        analysisId: analysis.id,
        date: createTestDate(2024, 6, 15), // Saturday
        consignments: 100,
        rate: 3.0,
        paidAmount: 300.0,
      });

      const entry2 = new DailyEntry({
        analysisId: analysis.id,
        date: createTestDate(2024, 6, 10), // Monday (earlier)
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });

      const entry3 = new DailyEntry({
        analysisId: analysis.id,
        date: createTestDate(2024, 6, 12), // Wednesday (middle)
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });

      // Add in non-chronological order
      analysis.addDailyEntry(entry1);
      analysis.addDailyEntry(entry2);
      analysis.addDailyEntry(entry3);

      // Should be sorted by date
      const entries = analysis.dailyEntries;
      expect(entries[0].date.toDateString()).toBe(entry2.date.toDateString()); // Monday
      expect(entries[1].date.toDateString()).toBe(entry3.date.toDateString()); // Wednesday
      expect(entries[2].date.toDateString()).toBe(entry1.date.toDateString()); // Saturday
    });

    it("should update updatedAt timestamp", () => {
      const originalUpdatedAt = analysis.updatedAt.getTime();

      // Small delay to ensure timestamp changes
      const entry = new DailyEntry({
        analysisId: analysis.id,
        date: createTestDate(2024, 6, 12),
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });

      analysis.addDailyEntry(entry);

      expect(analysis.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it("should replace existing entry if date already exists", () => {
      const entry1 = new DailyEntry({
        analysisId: analysis.id,
        date: createTestDate(2024, 6, 12),
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });

      const entry2 = new DailyEntry({
        analysisId: analysis.id,
        date: createTestDate(2024, 6, 12), // Same date
        consignments: 120, // Different data
        rate: 2.0,
        paidAmount: 240.0,
      });

      analysis.addDailyEntry(entry1);
      analysis.addDailyEntry(entry2);

      expect(analysis.dailyEntries.length).toBe(1); // Only one entry
      expect(analysis.dailyEntries[0].consignments.count).toBe(120); // Second entry's data
    });

    it("should throw error if entry date is outside analysis period", () => {
      const outsideEntry = new DailyEntry({
        analysisId: analysis.id,
        date: createTestDate(2024, 6, 20), // After period end (June 16)
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });

      expect(() => analysis.addDailyEntry(outsideEntry)).toThrow(
        "Daily entry date is outside analysis period"
      );
    });

    it("should handle multiple entries added in correct order", () => {
      const entries = [
        new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 10),
          consignments: 100,
          rate: 2.0,
          paidAmount: 200.0,
        }),
        new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 11),
          consignments: 110,
          rate: 2.0,
          paidAmount: 220.0,
        }),
        new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 12),
          consignments: 105,
          rate: 2.0,
          paidAmount: 210.0,
        }),
      ];

      entries.forEach((entry) => analysis.addDailyEntry(entry));

      expect(analysis.dailyEntries.length).toBe(3);
      expect(analysis.dailyEntries[0].date.toDateString()).toBe(entries[0].date.toDateString());
      expect(analysis.dailyEntries[1].date.toDateString()).toBe(entries[1].date.toDateString());
      expect(analysis.dailyEntries[2].date.toDateString()).toBe(entries[2].date.toDateString());
    });
  });

  describe("removeDailyEntry", () => {
    let analysis: Analysis;
    let entry1: DailyEntry;
    let entry2: DailyEntry;

    beforeEach(() => {
      analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "upload",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });

      entry1 = new DailyEntry({
        analysisId: analysis.id,
        date: createTestDate(2024, 6, 10),
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });

      entry2 = new DailyEntry({
        analysisId: analysis.id,
        date: createTestDate(2024, 6, 11),
        consignments: 110,
        rate: 2.0,
        paidAmount: 220.0,
      });

      analysis.addDailyEntry(entry1);
      analysis.addDailyEntry(entry2);
    });

    it("should remove entry with matching date", () => {
      expect(analysis.dailyEntries.length).toBe(2);

      analysis.removeDailyEntry(createTestDate(2024, 6, 10));

      expect(analysis.dailyEntries.length).toBe(1);
      expect(analysis.dailyEntries[0].date.toDateString()).toBe(entry2.date.toDateString());
    });

    it("should update updatedAt timestamp", () => {
      const originalUpdatedAt = analysis.updatedAt.getTime();

      analysis.removeDailyEntry(createTestDate(2024, 6, 10));

      expect(analysis.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it("should do nothing if date does not exist (no error)", () => {
      expect(() => {
        analysis.removeDailyEntry(createTestDate(2024, 6, 20)); // Non-existent date
      }).not.toThrow();

      expect(analysis.dailyEntries.length).toBe(2); // Still has both entries
    });

    it("should verify array state after removal", () => {
      analysis.removeDailyEntry(createTestDate(2024, 6, 10));

      expect(analysis.dailyEntries.length).toBe(1);
      expect(analysis.dailyEntries[0]).toBe(entry2);
    });
  });

  describe("getDailyEntry", () => {
    let analysis: Analysis;
    let entry: DailyEntry;

    beforeEach(() => {
      analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "upload",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });

      entry = new DailyEntry({
        analysisId: analysis.id,
        date: createTestDate(2024, 6, 12),
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });

      analysis.addDailyEntry(entry);
    });

    it("should return entry with matching date", () => {
      const found = analysis.getDailyEntry(createTestDate(2024, 6, 12));

      expect(found).toBeDefined();
      expect(found).toBe(entry);
    });

    it("should return undefined if date does not exist", () => {
      const found = analysis.getDailyEntry(createTestDate(2024, 6, 15));

      expect(found).toBeUndefined();
    });

    it("should handle date comparison correctly", () => {
      // Create new Date instance with same date
      const sameDate = createTestDate(2024, 6, 12);
      const found = analysis.getDailyEntry(sameDate);

      expect(found).toBeDefined();
      expect(found?.date.toDateString()).toBe(entry.date.toDateString());
    });
  });

  describe("updateStatus", () => {
    let analysis: Analysis;

    beforeEach(() => {
      analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "upload",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });
    });

    it("should update status", () => {
      expect(analysis.status).toBe("pending");

      analysis.updateStatus("processing");
      expect(analysis.status).toBe("processing");

      analysis.updateStatus("completed");
      expect(analysis.status).toBe("completed");
    });

    it("should update updatedAt timestamp", () => {
      const originalUpdatedAt = analysis.updatedAt.getTime();

      analysis.updateStatus("processing");

      expect(analysis.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it("should handle all AnalysisStatus values", () => {
      analysis.updateStatus("pending");
      expect(analysis.status).toBe("pending");

      analysis.updateStatus("processing");
      expect(analysis.status).toBe("processing");

      analysis.updateStatus("completed");
      expect(analysis.status).toBe("completed");

      analysis.updateStatus("error");
      expect(analysis.status).toBe("error");
    });
  });

  describe("updateMetadata", () => {
    let analysis: Analysis;

    beforeEach(() => {
      analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "upload",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
        metadata: { fileCount: 3 },
      });
    });

    it("should update metadata (merge with existing)", () => {
      analysis.updateMetadata({ processingTime: 1500 });

      expect(analysis.metadata.fileCount).toBe(3); // Preserved
      expect(analysis.metadata.processingTime).toBe(1500); // Added
    });

    it("should update updatedAt timestamp", () => {
      const originalUpdatedAt = analysis.updatedAt.getTime();

      analysis.updateMetadata({ processingTime: 1500 });

      expect(analysis.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it("should preserve existing metadata keys", () => {
      analysis.updateMetadata({ totalPagesProcessed: 50 });

      expect(analysis.metadata.fileCount).toBe(3);
      expect(analysis.metadata.totalPagesProcessed).toBe(50);
    });

    it("should verify defensive copy (external changes do not affect internal state)", () => {
      const metadata = analysis.metadata;
      (metadata as { fileCount: number }).fileCount = 999; // Try to mutate

      const newMetadata = analysis.metadata;
      expect(newMetadata.fileCount).toBe(3); // Original still intact
    });
  });

  describe("isComplete and hasErrors", () => {
    it("should return true when status is completed AND has entries", () => {
      const analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "upload",
        status: "completed",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });

      analysis.addDailyEntry(
        new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 12),
          consignments: 100,
          rate: 2.0,
          paidAmount: 200.0,
        })
      );

      expect(analysis.isComplete()).toBe(true);
    });

    it("should return false when status is completed BUT no entries", () => {
      const analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "upload",
        status: "completed",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });

      expect(analysis.isComplete()).toBe(false);
    });

    it("should return false when status is not completed", () => {
      const analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "upload",
        status: "processing",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });

      expect(analysis.isComplete()).toBe(false);
    });

    it("should return true when status is error", () => {
      const analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "upload",
        status: "error",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });

      expect(analysis.hasErrors()).toBe(true);
    });

    it("should return false when status is not error", () => {
      const analysis = new Analysis({
        userId: "user-123",
        fingerprint: "fp-abc",
        source: "upload",
        status: "completed",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 1,
      });

      expect(analysis.hasErrors()).toBe(false);
    });
  });

  describe("toJSON/fromJSON", () => {
    let analysis: Analysis;

    beforeEach(() => {
      analysis = new Analysis({
        id: "analysis-123",
        userId: "user-456",
        fingerprint: "fp-xyz789",
        source: "upload",
        status: "completed",
        periodStart: createTestDate(2024, 6, 10),
        periodEnd: createTestDate(2024, 6, 16),
        rulesVersion: 2,
        metadata: { fileCount: 3, processingTime: 1500 },
        createdAt: createTestDate(2024, 6, 1),
        updatedAt: createTestDate(2024, 6, 2),
      });

      // Add some daily entries
      analysis.addDailyEntry(
        new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 10),
          consignments: 100,
          rate: 2.0,
          paidAmount: 200.0,
        })
      );

      analysis.addDailyEntry(
        new DailyEntry({
          analysisId: analysis.id,
          date: createTestDate(2024, 6, 11),
          consignments: 110,
          rate: 2.0,
          paidAmount: 220.0,
        })
      );
    });

    it("should return correct JSON structure with all fields", () => {
      const json = analysis.toJSON();

      expect(json).toHaveProperty("id", "analysis-123");
      expect(json).toHaveProperty("userId", "user-456");
      expect(json).toHaveProperty("fingerprint", "fp-xyz789");
      expect(json).toHaveProperty("source", "upload");
      expect(json).toHaveProperty("status", "completed");
      expect(json).toHaveProperty("periodStart");
      expect(json).toHaveProperty("periodEnd");
      expect(json).toHaveProperty("rulesVersion", 2);
      expect(json).toHaveProperty("workingDays");
      expect(json).toHaveProperty("totalConsignments");
      expect(json).toHaveProperty("dailyEntries");
      expect(json).toHaveProperty("totals");
      expect(json).toHaveProperty("metadata");
      expect(json).toHaveProperty("createdAt");
      expect(json).toHaveProperty("updatedAt");
    });

    it("should include computed totals object", () => {
      const json = analysis.toJSON();

      expect(json.totals).toBeDefined();
      expect(json.totals).toHaveProperty("baseTotal");
      expect(json.totals).toHaveProperty("bonusTotal");
      expect(json.totals).toHaveProperty("pickupTotal");
      expect(json.totals).toHaveProperty("expectedTotal");
      expect(json.totals).toHaveProperty("paidTotal");
      expect(json.totals).toHaveProperty("differenceTotal");
    });

    it("should include dailyEntries as array of JSON", () => {
      const json = analysis.toJSON();

      expect(Array.isArray(json.dailyEntries)).toBe(true);
      expect(json.dailyEntries.length).toBe(2);
      expect(json.dailyEntries[0]).toHaveProperty("id");
      expect(json.dailyEntries[0]).toHaveProperty("date");
      expect(json.dailyEntries[0]).toHaveProperty("consignments");
    });

    it("should reconstruct Analysis correctly from JSON", () => {
      const json = analysis.toJSON();
      const reconstructed = Analysis.fromJSON(json);

      expect(reconstructed.id).toBe(analysis.id);
      expect(reconstructed.userId).toBe(analysis.userId);
      expect(reconstructed.fingerprint).toBe(analysis.fingerprint);
      expect(reconstructed.source).toBe(analysis.source);
      expect(reconstructed.status).toBe(analysis.status);
      expect(reconstructed.rulesVersion).toBe(analysis.rulesVersion);
      expect(reconstructed.period.start.toDateString()).toBe(analysis.period.start.toDateString());
      expect(reconstructed.period.end.toDateString()).toBe(analysis.period.end.toDateString());
    });

    it("should reconstruct dailyEntries correctly from JSON", () => {
      const json = analysis.toJSON();
      const reconstructed = Analysis.fromJSON(json);

      expect(reconstructed.dailyEntries.length).toBe(analysis.dailyEntries.length);
      expect(reconstructed.dailyEntries[0].consignments.count).toBe(
        analysis.dailyEntries[0].consignments.count
      );
      expectMoneyEqual(
        reconstructed.dailyEntries[0].paidAmount.amount,
        analysis.dailyEntries[0].paidAmount.amount
      );
    });

    it("should pass round-trip test", () => {
      const json = analysis.toJSON();
      const reconstructed = Analysis.fromJSON(json);
      const jsonAgain = reconstructed.toJSON();

      expect(jsonAgain.id).toBe(json.id);
      expect(jsonAgain.userId).toBe(json.userId);
      expect(jsonAgain.fingerprint).toBe(json.fingerprint);
      expect(jsonAgain.source).toBe(json.source);
      expect(jsonAgain.status).toBe(json.status);
      expect(jsonAgain.rulesVersion).toBe(json.rulesVersion);
      expect(jsonAgain.dailyEntries.length).toBe(json.dailyEntries.length);
    });
  });
});
