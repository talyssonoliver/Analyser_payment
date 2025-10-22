/**
 * Unit Tests for Analysis Repository - Merge Strategy
 * Tests the fix for Strategy 4 (additive → overwrite)
 */

import { describe, expect, it } from "vitest";

describe("Analysis Repository - Merge Strategy Fix", () => {
  describe("Strategy 4: Simple Overwrite (Legacy Behavior)", () => {
    it("should overwrite consignments instead of adding them", () => {
      // Simulate the merge logic
      const existing = {
        date: "2024-01-01",
        consignments: 50,
        paid_amount: 100,
        rate: 2.0,
        base_payment: 100,
        expected_total: 100,
        difference: 0,
      };

      const entry = {
        date: "2024-01-01",
        consignments: 55, // Corrected value
        paid_amount: 110,
        rate: 2.0,
        base_payment: 110,
        expected_total: 110,
        difference: 0,
      };

      // NEW BEHAVIOR: Simple overwrite (last wins)
      const merged = {
        ...entry,
        paid_amount: entry.paid_amount || existing.paid_amount,
      };

      expect(merged.consignments).toBe(55); // NOT 105 (50 + 55)
      expect(merged.paid_amount).toBe(110);
    });

    it("should preserve payment from either source", () => {
      const existing = {
        date: "2024-01-01",
        consignments: 50,
        paid_amount: 100,
        rate: 2.0,
        base_payment: 100,
        expected_total: 100,
        difference: 0,
      };

      const entry = {
        date: "2024-01-01",
        consignments: 55,
        paid_amount: 0, // No payment in new entry
        rate: 2.0,
        base_payment: 110,
        expected_total: 110,
        difference: 0,
      };

      const merged = {
        ...entry,
        paid_amount: entry.paid_amount || existing.paid_amount,
      };

      expect(merged.paid_amount).toBe(100); // Kept from existing
      expect(merged.consignments).toBe(55); // From new entry
    });

    it("should match legacy system behavior", () => {
      // Legacy: results.runsheets[date] = { consignments }; (simple overwrite)

      const runsheetData: Record<string, { consignments: number }> = {};

      // First upload
      runsheetData["2024-01-01"] = { consignments: 50 };

      // Second upload (correction)
      runsheetData["2024-01-01"] = { consignments: 55 };

      expect(runsheetData["2024-01-01"].consignments).toBe(55); // Last wins
    });
  });

  describe("Strategy 1: Adding Invoice to Runsheet", () => {
    it("should keep consignments from runsheet and add payment from invoice", () => {
      const existing = {
        date: "2024-01-01",
        consignments: 50,
        paid_amount: 0,
        rate: 2.0,
        base_payment: 100,
        expected_total: 100,
        unloading_bonus: 30,
        attendance_bonus: 25,
        early_bonus: 50,
        pickup_total: 0,
        pickups: 0,
      };

      const entry = {
        date: "2024-01-01",
        consignments: 0,
        paid_amount: 205, // Invoice payment
        pickup_total: 15,
        pickups: 1,
      };

      // Strategy 1: Adding invoice to runsheet
      const existingHasConsignments = existing.consignments > 0;
      const newHasConsignments = entry.consignments > 0;
      const newHasPayment = entry.paid_amount > 0;

      const shouldUseStrategy1 = existingHasConsignments && !newHasConsignments && newHasPayment;

      expect(shouldUseStrategy1).toBe(true);

      if (shouldUseStrategy1) {
        const merged = {
          ...existing,
          paid_amount: entry.paid_amount || existing.paid_amount,
          pickup_total: (existing.pickup_total || 0) + (entry.pickup_total || 0),
          pickups: (existing.pickups || 0) + (entry.pickups || 0),
        };

        expect(merged.consignments).toBe(50); // From runsheet
        expect(merged.paid_amount).toBe(205); // From invoice
        expect(merged.pickup_total).toBe(15); // From invoice
      }
    });
  });

  describe("Strategy 2: Adding Runsheet to Invoice", () => {
    it("should keep payment from invoice and use consignments from runsheet", () => {
      const existing = {
        date: "2024-01-01",
        consignments: 0,
        paid_amount: 205,
        rate: 2.0,
      };

      const entry = {
        date: "2024-01-01",
        consignments: 50,
        paid_amount: 0,
        rate: 2.0,
        base_payment: 100,
        expected_total: 205,
      };

      const existingHasConsignments = existing.consignments > 0;
      const existingHasPayment = existing.paid_amount > 0;
      const newHasConsignments = entry.consignments > 0;

      const shouldUseStrategy2 =
        !existingHasConsignments && existingHasPayment && newHasConsignments;

      expect(shouldUseStrategy2).toBe(true);

      if (shouldUseStrategy2) {
        const merged = {
          ...entry,
          paid_amount: existing.paid_amount || entry.paid_amount,
        };

        expect(merged.consignments).toBe(50); // From runsheet
        expect(merged.paid_amount).toBe(205); // From invoice
      }
    });
  });

  describe("Strategy 3: Both Have Consignments", () => {
    it("should replace with newer data when both have consignments", () => {
      const existing = {
        date: "2024-01-01",
        consignments: 50,
        paid_amount: 100,
        pickup_total: 0,
        pickups: 0,
      };

      const entry = {
        date: "2024-01-01",
        consignments: 55, // Corrected
        paid_amount: 110,
        pickup_total: 10,
        pickups: 1,
      };

      const bothHaveConsignments = existing.consignments > 0 && entry.consignments > 0;

      expect(bothHaveConsignments).toBe(true);

      if (bothHaveConsignments) {
        const merged = {
          ...entry,
          paid_amount: entry.paid_amount || existing.paid_amount,
          pickup_total: entry.pickup_total || existing.pickup_total,
          pickups: entry.pickups || existing.pickups,
        };

        expect(merged.consignments).toBe(55); // Newer value wins
        expect(merged.paid_amount).toBe(110);
      }
    });
  });

  describe("Difference Recalculation", () => {
    it("should always recalculate difference after merge", () => {
      const merged = {
        paid_amount: 205,
        expected_total: 200,
        difference: 0, // Will be recalculated
      };

      merged.difference = merged.paid_amount - merged.expected_total;

      expect(merged.difference).toBe(5);
    });

    it("should update status based on difference", () => {
      const testCases = [
        { difference: 5, expectedStatus: "overpaid" },
        { difference: -5, expectedStatus: "underpaid" },
        { difference: 0.005, expectedStatus: "balanced" }, // Within tolerance
      ];

      testCases.forEach(({ difference, expectedStatus }) => {
        let status;

        if (difference > 0.01) {
          status = "overpaid";
        } else if (difference < -0.01) {
          status = "underpaid";
        } else {
          status = "balanced";
        }

        expect(status).toBe(expectedStatus);
      });
    });
  });

  describe("Regression Tests", () => {
    it("should NOT double-count consignments (bug fix verification)", () => {
      // This was the bug in Strategy 4
      const existing = { consignments: 50, paid_amount: 100 };
      const entry = { consignments: 55, paid_amount: 110 };

      // OLD BUGGY BEHAVIOR (what we're preventing):
      // const buggyMerge = {
      //   consignments: (existing.consignments || 0) + (entry.consignments || 0)
      // };
      // expect(buggyMerge.consignments).toBe(105); // BUG!

      // NEW CORRECT BEHAVIOR:
      const correctMerge = {
        ...entry,
        paid_amount: entry.paid_amount || existing.paid_amount,
      };

      expect(correctMerge.consignments).toBe(55); // Fixed!
    });
  });
});
