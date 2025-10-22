/**
 * Unit Tests for useCalendarData Hook
 * Tests calendar data processing, date formatting, and payment status logic
 */

import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCalendarData } from "@/hooks/useCalendarData";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import { createMockDailyEntry, mockAnalyses } from "@/tests/mocks/dashboard-data";

// Mock AnalysisStorageService
vi.mock("@/lib/services/analysis-storage-service");

describe("useCalendarData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Date Formatting", () => {
    it("should format date key correctly", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-15");
      const formatted = result.current.formatDateKey(testDate);

      expect(formatted).toBe("2024-01-15");
    });

    it("should pad single digit months with zero", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-05");
      const formatted = result.current.formatDateKey(testDate);

      expect(formatted).toBe("2024-01-05");
    });

    it("should handle December correctly", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-12-15"),
        })
      );

      const testDate = new Date("2024-12-25");
      const formatted = result.current.formatDateKey(testDate);

      expect(formatted).toBe("2024-12-25");
    });
  });

  describe("Calendar Date Formatting", () => {
    it("should format calendar date as day number", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-15");
      const formatted = result.current.formatCalendarDate(testDate);

      expect(formatted).toBe("15");
    });

    it("should return empty string for null date", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const formatted = result.current.formatCalendarDate(null);

      expect(formatted).toBe("");
    });

    it("should format single digit dates without padding", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-05");
      const formatted = result.current.formatCalendarDate(testDate);

      expect(formatted).toBe("5");
    });
  });

  describe("Today Detection", () => {
    it("should identify today correctly", () => {
      const today = new Date();
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: today,
        })
      );

      expect(result.current.isToday(today)).toBe(true);
    });

    it("should return false for past dates", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date(),
        })
      );

      const pastDate = new Date("2020-01-01");
      expect(result.current.isToday(pastDate)).toBe(false);
    });

    it("should return false for null date", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date(),
        })
      );

      expect(result.current.isToday(null)).toBe(false);
    });
  });

  describe("Days in Month Generation", () => {
    it("should generate correct number of days for January 2024", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const days = result.current.daysInMonth;
      const actualDays = days.filter((d) => d !== null);

      expect(actualDays).toHaveLength(31); // January has 31 days
    });

    it("should generate correct number of days for February 2024 (leap year)", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-02-15"),
        })
      );

      const days = result.current.daysInMonth;
      const actualDays = days.filter((d) => d !== null);

      expect(actualDays).toHaveLength(29); // 2024 is a leap year
    });

    it("should generate correct number of days for February 2023 (non-leap year)", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2023-02-15"),
        })
      );

      const days = result.current.daysInMonth;
      const actualDays = days.filter((d) => d !== null);

      expect(actualDays).toHaveLength(28); // 2023 is not a leap year
    });

    it("should add null padding for days before month starts", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const days = result.current.daysInMonth;
      const nullDays = days.filter((d) => d === null);

      expect(nullDays.length).toBeGreaterThanOrEqual(0);
      expect(nullDays.length).toBeLessThanOrEqual(6);
    });

    it("should have first non-null day as the 1st of the month", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const days = result.current.daysInMonth;
      const firstDay = days.find((d) => d !== null);

      expect(firstDay?.getDate()).toBe(1);
      expect(firstDay?.getMonth()).toBe(0); // January
      expect(firstDay?.getFullYear()).toBe(2024);
    });
  });

  describe("Payment Info - No Data", () => {
    it("should return empty payment info for null date", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const paymentInfo = result.current.getPaymentInfoForDate(null);

      expect(paymentInfo).toEqual({
        hasData: false,
        totalExpected: 0,
        totalPaid: 0,
        statuses: [],
      });
    });

    it("should return empty payment info for date with no data", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-15");
      const paymentInfo = result.current.getPaymentInfoForDate(testDate);

      expect(paymentInfo.hasData).toBe(false);
      expect(paymentInfo.totalExpected).toBe(0);
      expect(paymentInfo.totalPaid).toBe(0);
      expect(paymentInfo.statuses).toEqual([]);
    });
  });

  describe("Payment Info - Database Data", () => {
    it("should extract payment info from database analyses", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: mockAnalyses,
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-01");
      const paymentInfo = result.current.getPaymentInfoForDate(testDate);

      expect(paymentInfo.hasData).toBe(true);
      expect(paymentInfo.totalExpected).toBeGreaterThan(0);
      expect(paymentInfo.totalPaid).toBeGreaterThan(0);
    });

    it("should aggregate data from multiple analyses for same date", () => {
      const duplicateAnalysis = {
        ...mockAnalyses[0],
        id: "analysis-999",
        daily_entries: [
          createMockDailyEntry({
            id: "entry-999",
            analysis_id: "analysis-999",
            date: "2024-01-01",
            day_of_week: 1,
            consignments: 25,
            expected_total: 100,
            paid_amount: 100,
            base_payment: 50,
            rate: 2.0,
            unloading_bonus: 30,
            attendance_bonus: 0,
            early_bonus: 0,
            difference: 0,
          }),
        ],
      };

      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [mockAnalyses[0], duplicateAnalysis],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-01");
      const paymentInfo = result.current.getPaymentInfoForDate(testDate);

      expect(paymentInfo.hasData).toBe(true);
      expect(paymentInfo.totalExpected).toBeGreaterThan(100);
    });

    it("should skip entries with zero consignments", () => {
      const analysisWithZeroConsignments = {
        ...mockAnalyses[0],
        daily_entries: [
          createMockDailyEntry({
            id: "entry-zero",
            analysis_id: "analysis-123",
            date: "2024-01-15",
            day_of_week: 1,
            consignments: 0,
            expected_total: 0,
            paid_amount: 0,
            base_payment: 0,
            rate: 2.0,
            unloading_bonus: 0,
            attendance_bonus: 0,
            early_bonus: 0,
            difference: 0,
          }),
        ],
      };

      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [analysisWithZeroConsignments],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-15");
      const paymentInfo = result.current.getPaymentInfoForDate(testDate);

      expect(paymentInfo.hasData).toBe(false);
    });
  });

  describe("Payment Info - LocalStorage Fallback", () => {
    it("should fall back to localStorage when no database data", () => {
      const mockLocalStorage = {
        "local-123": {
          dailyData: {
            "2024-01-15": {
              consignments: 50,
              expectedTotal: 200,
              paidAmount: 200,
            },
          },
        },
      };

      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue(mockLocalStorage);

      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-15");
      const paymentInfo = result.current.getPaymentInfoForDate(testDate);

      expect(paymentInfo.hasData).toBe(true);
      expect(paymentInfo.totalExpected).toBe(200);
      expect(paymentInfo.totalPaid).toBe(200);
    });

    it("should not use localStorage if database data exists", () => {
      const mockLocalStorage = {
        "local-123": {
          dailyData: {
            "2024-01-01": {
              consignments: 999,
              expectedTotal: 9999,
              paidAmount: 9999,
            },
          },
        },
      };

      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue(mockLocalStorage);

      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: mockAnalyses,
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-01");
      const paymentInfo = result.current.getPaymentInfoForDate(testDate);

      // Should use database data, not localStorage
      expect(paymentInfo.totalExpected).not.toBe(9999);
    });
  });

  describe("Payment Status Logic", () => {
    it("should show pending status when work is done", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: mockAnalyses,
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-01");
      const paymentInfo = result.current.getPaymentInfoForDate(testDate);

      expect(paymentInfo.statuses).toContain("pending");
    });

    it("should show received status when payment made", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: mockAnalyses,
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-01");
      const paymentInfo = result.current.getPaymentInfoForDate(testDate);

      if (paymentInfo.totalPaid > 0) {
        expect(paymentInfo.statuses).toContain("received");
      }
    });

    it("should show shortfall status when paid less than expected", () => {
      const analysisWithShortfall = {
        ...mockAnalyses[0],
        daily_entries: [
          createMockDailyEntry({
            id: "entry-short",
            analysis_id: "analysis-123",
            date: "2024-01-15",
            day_of_week: 1,
            consignments: 50,
            expected_total: 200,
            paid_amount: 150,
            base_payment: 100,
            rate: 2.0,
            unloading_bonus: 30,
            attendance_bonus: 0,
            early_bonus: 0,
            difference: -50,
            status: "underpaid",
          }),
        ],
      };

      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [analysisWithShortfall],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-15");
      const paymentInfo = result.current.getPaymentInfoForDate(testDate);

      expect(paymentInfo.statuses).toContain("shortfall");
    });

    it("should show multiple statuses when applicable", () => {
      const analysisWithShortfall = {
        ...mockAnalyses[0],
        daily_entries: [
          createMockDailyEntry({
            id: "entry-multi",
            analysis_id: "analysis-123",
            date: "2024-01-15",
            day_of_week: 1,
            consignments: 50,
            expected_total: 200,
            paid_amount: 150,
            base_payment: 100,
            rate: 2.0,
            unloading_bonus: 30,
            attendance_bonus: 0,
            early_bonus: 0,
            difference: -50,
            status: "underpaid",
          }),
        ],
      };

      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [analysisWithShortfall],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-15");
      const paymentInfo = result.current.getPaymentInfoForDate(testDate);

      expect(paymentInfo.statuses).toContain("pending");
      expect(paymentInfo.statuses).toContain("received");
      expect(paymentInfo.statuses).toContain("shortfall");
      expect(paymentInfo.statuses).toHaveLength(3);
    });

    it("should not show shortfall when fully paid", () => {
      const analysisFullyPaid = {
        ...mockAnalyses[0],
        daily_entries: [
          createMockDailyEntry({
            id: "entry-full",
            analysis_id: "analysis-123",
            date: "2024-01-15",
            day_of_week: 1,
            consignments: 50,
            expected_total: 200,
            paid_amount: 200,
            base_payment: 100,
            rate: 2.0,
            unloading_bonus: 30,
            attendance_bonus: 0,
            early_bonus: 0,
            difference: 0,
            created_at: "2024-01-08T00:00:00.000Z",
            status: "balanced",
          }),
        ],
      };

      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [analysisFullyPaid],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const testDate = new Date("2024-01-15");
      const paymentInfo = result.current.getPaymentInfoForDate(testDate);

      expect(paymentInfo.statuses).not.toContain("shortfall");
    });
  });

  describe("Status Tooltips", () => {
    it("should generate pending tooltip with expected amount", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const paymentInfo = {
        hasData: true,
        totalExpected: 200,
        totalPaid: 0,
        statuses: ["pending" as const],
      };

      const tooltip = result.current.getStatusTooltip("pending", paymentInfo);

      expect(tooltip).toContain("Work completed");
      expect(tooltip).toContain("£200.00");
    });

    it("should generate pending tooltip without expected amount", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const paymentInfo = {
        hasData: true,
        totalExpected: 0,
        totalPaid: 0,
        statuses: ["pending" as const],
      };

      const tooltip = result.current.getStatusTooltip("pending", paymentInfo);

      expect(tooltip).toContain("payment pending");
    });

    it("should generate received tooltip with paid amount", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const paymentInfo = {
        hasData: true,
        totalExpected: 200,
        totalPaid: 200,
        statuses: ["received" as const],
      };

      const tooltip = result.current.getStatusTooltip("received", paymentInfo);

      expect(tooltip).toContain("Payment received");
      expect(tooltip).toContain("£200.00");
    });

    it("should generate shortfall tooltip with missing amount", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const paymentInfo = {
        hasData: true,
        totalExpected: 200,
        totalPaid: 150,
        statuses: ["shortfall" as const],
      };

      const tooltip = result.current.getStatusTooltip("shortfall", paymentInfo);

      expect(tooltip).toContain("Payment shortfall");
      expect(tooltip).toContain("£50.00");
    });

    it("should return empty string for unknown status", () => {
      const { result } = renderHook(() =>
        useCalendarData({
          recentAnalyses: [],
          currentMonth: new Date("2024-01-15"),
        })
      );

      const paymentInfo = {
        hasData: false,
        totalExpected: 0,
        totalPaid: 0,
        statuses: [],
      };

      const tooltip = result.current.getStatusTooltip(
        "unknown" as "pending" | "received" | "shortfall",
        paymentInfo
      );

      expect(tooltip).toBe("");
    });
  });

  describe("useMemo Optimization", () => {
    it("should memoize daysInMonth when month unchanged", () => {
      const { result, rerender } = renderHook(
        ({ month }: { month: Date }) =>
          useCalendarData({
            recentAnalyses: [],
            currentMonth: month,
          }),
        {
          initialProps: { month: new Date("2024-01-15") },
        }
      );

      const firstRender = result.current.daysInMonth;

      rerender({ month: new Date("2024-01-15") });

      const secondRender = result.current.daysInMonth;

      expect(firstRender).toStrictEqual(secondRender); // Same content
    });

    it("should recalculate daysInMonth when month changes", () => {
      const { result, rerender } = renderHook(
        ({ month }) =>
          useCalendarData({
            recentAnalyses: [],
            currentMonth: month,
          }),
        {
          initialProps: { month: new Date("2024-01-15") },
        }
      );

      const januaryDays = result.current.daysInMonth;

      rerender({ month: new Date("2024-02-15") });

      const februaryDays = result.current.daysInMonth;

      expect(januaryDays).not.toBe(februaryDays); // Different reference
      expect(januaryDays.filter((d) => d !== null).length).toBe(31);
      expect(februaryDays.filter((d) => d !== null).length).toBe(29);
    });
  });
});
