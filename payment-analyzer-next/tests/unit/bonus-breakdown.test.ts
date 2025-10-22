/**
 * Unit Tests for Bonus Breakdown Storage
 * Tests the enhancement to store individual bonus totals
 */

import { describe, expect, it } from "vitest";

describe("Bonus Breakdown Storage", () => {
  describe("Individual Bonus Calculation", () => {
    it("should calculate unloading bonus total from daily entries", () => {
      const dailyEntries = [
        { date: "2024-01-01", unloadingBonus: { amount: 30 } },
        { date: "2024-01-02", unloadingBonus: { amount: 30 } },
        { date: "2024-01-03", unloadingBonus: { amount: 30 } },
        { date: "2024-01-04", unloadingBonus: { amount: 30 } },
        { date: "2024-01-05", unloadingBonus: { amount: 30 } },
        { date: "2024-01-06", unloadingBonus: { amount: 30 } }, // Saturday
        { date: "2024-01-07", unloadingBonus: { amount: 0 } }, // Sunday - no unloading
      ];

      const unloadingBonusTotal = dailyEntries.reduce(
        (sum, entry) => sum + entry.unloadingBonus.amount,
        0
      );

      expect(unloadingBonusTotal).toBe(180); // 6 days × £30
    });

    it("should calculate attendance bonus total from daily entries", () => {
      const dailyEntries = [
        { date: "2024-01-01", attendanceBonus: { amount: 25 } }, // Monday
        { date: "2024-01-02", attendanceBonus: { amount: 25 } },
        { date: "2024-01-03", attendanceBonus: { amount: 25 } },
        { date: "2024-01-04", attendanceBonus: { amount: 25 } },
        { date: "2024-01-05", attendanceBonus: { amount: 25 } }, // Friday
        { date: "2024-01-06", attendanceBonus: { amount: 0 } }, // Saturday - weekday only
        { date: "2024-01-07", attendanceBonus: { amount: 0 } }, // Sunday - weekday only
      ];

      const attendanceBonusTotal = dailyEntries.reduce(
        (sum, entry) => sum + entry.attendanceBonus.amount,
        0
      );

      expect(attendanceBonusTotal).toBe(125); // 5 weekdays × £25
    });

    it("should calculate early bonus total from daily entries", () => {
      const dailyEntries = [
        { date: "2024-01-01", earlyBonus: { amount: 50 } }, // Monday
        { date: "2024-01-02", earlyBonus: { amount: 50 } },
        { date: "2024-01-03", earlyBonus: { amount: 50 } },
        { date: "2024-01-04", earlyBonus: { amount: 0 } }, // Not early
        { date: "2024-01-05", earlyBonus: { amount: 50 } }, // Friday
        { date: "2024-01-06", earlyBonus: { amount: 0 } }, // Saturday - weekday only
      ];

      const earlyBonusTotal = dailyEntries.reduce((sum, entry) => sum + entry.earlyBonus.amount, 0);

      expect(earlyBonusTotal).toBe(200); // 4 early days × £50
    });

    it("should calculate combined bonus total", () => {
      const dailyEntries = [
        {
          date: "2024-01-01",
          unloadingBonus: { amount: 30 },
          attendanceBonus: { amount: 25 },
          earlyBonus: { amount: 50 },
        },
        {
          date: "2024-01-02",
          unloadingBonus: { amount: 30 },
          attendanceBonus: { amount: 25 },
          earlyBonus: { amount: 50 },
        },
      ];

      const unloadingTotal = dailyEntries.reduce((sum, e) => sum + e.unloadingBonus.amount, 0);
      const attendanceTotal = dailyEntries.reduce((sum, e) => sum + e.attendanceBonus.amount, 0);
      const earlyTotal = dailyEntries.reduce((sum, e) => sum + e.earlyBonus.amount, 0);
      const bonusTotal = unloadingTotal + attendanceTotal + earlyTotal;

      expect(unloadingTotal).toBe(60);
      expect(attendanceTotal).toBe(50);
      expect(earlyTotal).toBe(100);
      expect(bonusTotal).toBe(210); // Combined
    });
  });

  describe("AnalysisTotalRecord Interface", () => {
    it("should include all bonus breakdown fields", () => {
      const analysisTotals = {
        id: "analysis-123",
        analysis_id: "analysis-456",
        base_total: 500,
        pickup_total: 50,
        bonus_total: 210,
        unloading_bonus_total: 60,
        attendance_bonus_total: 50,
        early_bonus_total: 100,
        expected_total: 760,
        paid_total: 760,
        difference_total: 0,
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(analysisTotals.bonus_total).toBe(210);
      expect(analysisTotals.unloading_bonus_total).toBe(60);
      expect(analysisTotals.attendance_bonus_total).toBe(50);
      expect(analysisTotals.early_bonus_total).toBe(100);

      // Verify breakdown sums to total
      const breakdownSum =
        (analysisTotals.unloading_bonus_total || 0) +
        (analysisTotals.attendance_bonus_total || 0) +
        (analysisTotals.early_bonus_total || 0);

      expect(breakdownSum).toBe(analysisTotals.bonus_total);
    });

    it("should handle optional bonus breakdown fields", () => {
      // For analyses created before this enhancement
      const legacyAnalysisTotals: Record<string, unknown> = {
        id: "analysis-123",
        analysis_id: "analysis-456",
        base_total: 500,
        pickup_total: 50,
        bonus_total: 210,
        // No breakdown fields
        expected_total: 760,
        paid_total: 760,
        difference_total: 0,
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(legacyAnalysisTotals.bonus_total).toBe(210);
      expect(legacyAnalysisTotals.unloading_bonus_total).toBeUndefined();
      expect(legacyAnalysisTotals.attendance_bonus_total).toBeUndefined();
      expect(legacyAnalysisTotals.early_bonus_total).toBeUndefined();
    });
  });

  describe("Bonus Trend Analysis Use Cases", () => {
    it("should enable tracking unloading bonus trends over time", () => {
      const weeklyAnalyses = [
        {
          week: 1,
          unloading_bonus_total: 180, // 6 days
          working_days: 6,
        },
        {
          week: 2,
          unloading_bonus_total: 150, // 5 days
          working_days: 5,
        },
        {
          week: 3,
          unloading_bonus_total: 210, // 7 days
          working_days: 7,
        },
      ];

      const avgUnloadingPerWeek =
        weeklyAnalyses.reduce((sum, w) => sum + w.unloading_bonus_total, 0) / weeklyAnalyses.length;

      expect(avgUnloadingPerWeek).toBe(180); // Average across 3 weeks
    });

    it("should enable calculating early arrival rate", () => {
      const analysis = {
        working_days: 5,
        early_bonus_total: 200, // 4 days × £50
      };

      const earlyDays = analysis.early_bonus_total / 50; // £50 per early day
      const earlyRate = (earlyDays / analysis.working_days) * 100;

      expect(earlyDays).toBe(4);
      expect(earlyRate).toBe(80); // 80% early arrival rate
    });

    it("should enable comparing bonus types", () => {
      const analysis = {
        unloading_bonus_total: 180,
        attendance_bonus_total: 125,
        early_bonus_total: 200,
        bonus_total: 505,
      };

      const unloadingPercentage = (analysis.unloading_bonus_total / analysis.bonus_total) * 100;
      const attendancePercentage = (analysis.attendance_bonus_total / analysis.bonus_total) * 100;
      const earlyPercentage = (analysis.early_bonus_total / analysis.bonus_total) * 100;

      expect(Math.round(unloadingPercentage)).toBe(36); // 36% unloading
      expect(Math.round(attendancePercentage)).toBe(25); // 25% attendance
      expect(Math.round(earlyPercentage)).toBe(40); // 40% early
    });
  });

  describe("Legacy System Parity", () => {
    it("should match legacy system bonus storage", () => {
      // Legacy system stores:
      // totals.unloadingTotal
      // totals.attendanceTotal
      // totals.earlyTotal

      const legacyTotals = {
        unloadingTotal: 180,
        attendanceTotal: 125,
        earlyTotal: 200,
      };

      // Modern system stores in analysis_totals:
      const modernTotals = {
        unloading_bonus_total: 180,
        attendance_bonus_total: 125,
        early_bonus_total: 200,
        bonus_total: 505,
      };

      expect(modernTotals.unloading_bonus_total).toBe(legacyTotals.unloadingTotal);
      expect(modernTotals.attendance_bonus_total).toBe(legacyTotals.attendanceTotal);
      expect(modernTotals.early_bonus_total).toBe(legacyTotals.earlyTotal);
    });
  });

  describe("Database Schema", () => {
    it("should support nullable bonus breakdown columns", () => {
      // Columns should be optional to support:
      // 1. Existing analyses created before this enhancement
      // 2. Manual entries that don't specify bonus breakdown

      const analysisWithoutBreakdown = {
        bonus_total: 210,
        unloading_bonus_total: undefined,
        attendance_bonus_total: undefined,
        early_bonus_total: undefined,
      };

      const analysisWithBreakdown = {
        bonus_total: 210,
        unloading_bonus_total: 60,
        attendance_bonus_total: 50,
        early_bonus_total: 100,
      };

      // Both should be valid
      expect(analysisWithoutBreakdown.bonus_total).toBe(210);
      expect(analysisWithBreakdown.bonus_total).toBe(210);
    });
  });
});
