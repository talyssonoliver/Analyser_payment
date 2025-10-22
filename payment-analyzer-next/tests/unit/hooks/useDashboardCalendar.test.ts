/**
 * Unit Tests for useDashboardCalendar Hook
 * Tests calendar navigation, day selection, and modal state management
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardCalendar } from "@/hooks/useDashboardCalendar";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import { createMockDailyEntry, mockAnalyses } from "@/tests/mocks/dashboard-data";

// Mock AnalysisStorageService
vi.mock("@/lib/services/analysis-storage-service");

describe("useDashboardCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with current month", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const today = new Date();
      expect(result.current.currentMonth.getMonth()).toBe(today.getMonth());
      expect(result.current.currentMonth.getFullYear()).toBe(today.getFullYear());
    });

    it("should initialize with null selected date", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      expect(result.current.selectedDate).toBeNull();
    });

    it("should initialize with modals closed", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      expect(result.current.dayModalOpen).toBe(false);
      expect(result.current.showManualEntry).toBe(false);
    });

    it("should initialize with null selected day data", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      expect(result.current.selectedDayData).toBeNull();
    });
  });

  describe("Date Formatting", () => {
    it("should format date key correctly", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const testDate = new Date("2024-01-15");
      const formatted = result.current.formatDateKey(testDate);

      expect(formatted).toBe("2024-01-15");
    });

    it("should pad single digit months and days", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const testDate = new Date("2024-01-05");
      const formatted = result.current.formatDateKey(testDate);

      expect(formatted).toBe("2024-01-05");
    });

    it("should handle end of year dates", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const testDate = new Date("2024-12-31");
      const formatted = result.current.formatDateKey(testDate);

      expect(formatted).toBe("2024-12-31");
    });
  });

  describe("Month Navigation", () => {
    it("should navigate to previous month", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const initialMonth = result.current.currentMonth.getMonth();

      act(() => {
        result.current.navigateMonth("prev");
      });

      const newMonth = result.current.currentMonth.getMonth();
      const expectedMonth = initialMonth === 0 ? 11 : initialMonth - 1;

      expect(newMonth).toBe(expectedMonth);
    });

    it("should navigate to next month", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const initialMonth = result.current.currentMonth.getMonth();

      act(() => {
        result.current.navigateMonth("next");
      });

      const newMonth = result.current.currentMonth.getMonth();
      const expectedMonth = initialMonth === 11 ? 0 : initialMonth + 1;

      expect(newMonth).toBe(expectedMonth);
    });

    it("should handle year transition when navigating backward", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      act(() => {
        result.current.setCurrentMonth(new Date("2024-01-15"));
      });

      act(() => {
        result.current.navigateMonth("prev");
      });

      expect(result.current.currentMonth.getMonth()).toBe(11); // December
      expect(result.current.currentMonth.getFullYear()).toBe(2023);
    });

    it("should handle year transition when navigating forward", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      act(() => {
        result.current.setCurrentMonth(new Date("2024-12-15"));
      });

      act(() => {
        result.current.navigateMonth("next");
      });

      expect(result.current.currentMonth.getMonth()).toBe(0); // January
      expect(result.current.currentMonth.getFullYear()).toBe(2025);
    });
  });

  describe("Date Selection", () => {
    it("should select date when handleDateSelect is called", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const testDate = new Date("2024-01-15");

      act(() => {
        result.current.handleDateSelect(testDate);
      });

      expect(result.current.selectedDate).toEqual(testDate);
    });

    it("should open manual entry modal when date is selected", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const testDate = new Date("2024-01-15");

      act(() => {
        result.current.handleDateSelect(testDate);
      });

      expect(result.current.showManualEntry).toBe(true);
    });
  });

  describe("Database Data Search", () => {
    it("should find day data in database analyses", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: mockAnalyses }));

      const testDate = new Date("2024-01-01");

      act(() => {
        result.current.loadDayData(testDate);
      });

      expect(result.current.selectedDayData).not.toBeNull();
      expect(result.current.selectedDayData?.dayData).toHaveLength(1);
      expect(result.current.selectedDayData?.dayData[0].data.consignments).toBeGreaterThan(0);
    });

    it("should open day modal when data is found", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: mockAnalyses }));

      const testDate = new Date("2024-01-01");

      act(() => {
        result.current.loadDayData(testDate);
      });

      expect(result.current.dayModalOpen).toBe(true);
    });

    it("should not find data for dates without entries", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: mockAnalyses }));

      const testDate = new Date("2024-12-25");

      act(() => {
        result.current.loadDayData(testDate);
      });

      expect(result.current.selectedDayData).toBeNull();
      expect(result.current.dayModalOpen).toBe(false);
    });

    it("should skip entries with zero consignments", () => {
      const analysisWithZero = {
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

      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [analysisWithZero] }));

      const testDate = new Date("2024-01-15");

      act(() => {
        result.current.loadDayData(testDate);
      });

      expect(result.current.selectedDayData).toBeNull();
    });

    it("should calculate difference correctly", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: mockAnalyses }));

      const testDate = new Date("2024-01-01");

      act(() => {
        result.current.loadDayData(testDate);
      });

      const dayData = result.current.selectedDayData?.dayData[0];
      if (dayData) {
        const expectedDifference = dayData.data.paidAmount - dayData.data.expectedTotal;
        expect(dayData.data.difference).toBe(expectedDifference);
      }
    });

    it("should generate analysis name from period_start", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: mockAnalyses }));

      const testDate = new Date("2024-01-01");

      act(() => {
        result.current.loadDayData(testDate);
      });

      const dayData = result.current.selectedDayData?.dayData[0];
      if (dayData) {
        expect(dayData.analysisName).toContain("2024");
      }
    });
  });

  describe("LocalStorage Data Search", () => {
    it("should fall back to localStorage when no database data", () => {
      const mockLocalStorage = {
        "local-123": {
          period: "Week of Jan 15, 2024",
          dailyData: {
            "2024-01-15": {
              consignments: 50,
              expectedTotal: 200,
              paidAmount: 200,
              status: "complete",
            },
          },
        },
      };

      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue(mockLocalStorage);

      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const testDate = new Date("2024-01-15");

      act(() => {
        result.current.loadDayData(testDate);
      });

      expect(result.current.selectedDayData).not.toBeNull();
      expect(result.current.selectedDayData?.dayData[0].data.consignments).toBe(50);
    });

    it("should prioritize database data over localStorage", () => {
      const mockLocalStorage = {
        "local-123": {
          dailyData: {
            "2024-01-01": {
              consignments: 999,
              expectedTotal: 9999,
              paidAmount: 9999,
              status: "complete",
            },
          },
        },
      };

      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue(mockLocalStorage);

      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: mockAnalyses }));

      const testDate = new Date("2024-01-01");

      act(() => {
        result.current.loadDayData(testDate);
      });

      // Should use database data, not localStorage
      expect(result.current.selectedDayData?.dayData[0].data.consignments).not.toBe(999);
    });

    it("should handle localStorage with no matching data", () => {
      const mockLocalStorage = {
        "local-123": {
          dailyData: {
            "2024-12-25": {
              consignments: 50,
              expectedTotal: 200,
              paidAmount: 200,
              status: "complete",
            },
          },
        },
      };

      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue(mockLocalStorage);

      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const testDate = new Date("2024-01-15");

      act(() => {
        result.current.loadDayData(testDate);
      });

      expect(result.current.selectedDayData).toBeNull();
    });

    it("should handle empty localStorage", () => {
      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});

      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const testDate = new Date("2024-01-15");

      act(() => {
        result.current.loadDayData(testDate);
      });

      expect(result.current.selectedDayData).toBeNull();
    });

    it("should skip localStorage entries with zero consignments", () => {
      const mockLocalStorage = {
        "local-123": {
          dailyData: {
            "2024-01-15": {
              consignments: 0,
              expectedTotal: 0,
              paidAmount: 0,
              status: "pending",
            },
          },
        },
      };

      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue(mockLocalStorage);

      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const testDate = new Date("2024-01-15");

      act(() => {
        result.current.loadDayData(testDate);
      });

      expect(result.current.selectedDayData).toBeNull();
    });
  });

  describe("Day Click Handlers", () => {
    it("should handle day with data click", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: mockAnalyses }));

      const testDate = new Date("2024-01-01");

      act(() => {
        result.current.handleDayWithData(testDate);
      });

      expect(result.current.dayModalOpen).toBe(true);
      expect(result.current.selectedDayData).not.toBeNull();
    });

    it("should handle day without data click", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const testDate = new Date("2024-01-15");

      act(() => {
        result.current.handleDayWithoutData(testDate);
      });

      expect(result.current.showManualEntry).toBe(true);
      expect(result.current.selectedDate).toEqual(testDate);
    });
  });

  describe("Modal State Management", () => {
    it("should allow setting dayModalOpen state", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      act(() => {
        result.current.setDayModalOpen(true);
      });

      expect(result.current.dayModalOpen).toBe(true);

      act(() => {
        result.current.setDayModalOpen(false);
      });

      expect(result.current.dayModalOpen).toBe(false);
    });

    it("should allow setting showManualEntry state", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      act(() => {
        result.current.setShowManualEntry(true);
      });

      expect(result.current.showManualEntry).toBe(true);

      act(() => {
        result.current.setShowManualEntry(false);
      });

      expect(result.current.showManualEntry).toBe(false);
    });

    it("should allow setting selectedDate state", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const testDate = new Date("2024-01-15");

      act(() => {
        result.current.setSelectedDate(testDate);
      });

      expect(result.current.selectedDate).toEqual(testDate);
    });

    it("should allow setting selectedDayData state", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [] }));

      const testData = {
        date: new Date("2024-01-15"),
        dayData: [
          {
            date: "2024-01-15",
            analysisId: "test-123",
            analysisName: "Test Analysis",
            data: {
              consignments: 50,
              expectedTotal: 200,
              paidAmount: 200,
              difference: 0,
              status: "complete",
            },
          },
        ],
      };

      act(() => {
        result.current.setSelectedDayData(testData);
      });

      expect(result.current.selectedDayData).toEqual(testData);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors gracefully when loading day data", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Create a mock that will throw an error
      const errorAnalysis = {
        ...mockAnalyses[0],
        daily_entries: null as unknown as (typeof mockAnalyses)[0]["daily_entries"],
      };

      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: [errorAnalysis] }));

      const testDate = new Date("2024-01-01");

      // This should not throw, but handle the error internally
      act(() => {
        result.current.loadDayData(testDate);
      });

      // Modal should remain closed since data loading failed
      expect(result.current.dayModalOpen).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Date Formatting in Selected Day Data", () => {
    it("should format selected day name with full date", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: mockAnalyses }));

      const testDate = new Date("2024-01-01");

      act(() => {
        result.current.loadDayData(testDate);
      });

      const dayData = result.current.selectedDayData?.dayData[0];
      if (dayData) {
        expect(dayData.analysisName).toContain("Monday");
        expect(dayData.analysisName).toContain("January");
        expect(dayData.analysisName).toContain("1");
        expect(dayData.analysisName).toContain("2024");
      }
    });
  });

  describe("State Consistency", () => {
    it("should maintain consistent state after multiple operations", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: mockAnalyses }));

      // Navigate month
      act(() => {
        result.current.navigateMonth("next");
      });

      // Select date
      const testDate = new Date("2024-01-15");
      act(() => {
        result.current.handleDateSelect(testDate);
      });

      // Load day data
      act(() => {
        result.current.loadDayData(new Date("2024-01-01"));
      });

      // All states should be independent
      expect(result.current.selectedDate).toEqual(testDate);
      expect(result.current.showManualEntry).toBe(true);
      expect(result.current.selectedDayData).not.toBeNull();
    });

    it("should allow resetting state", () => {
      const { result } = renderHook(() => useDashboardCalendar({ recentAnalyses: mockAnalyses }));

      // Set some state
      act(() => {
        result.current.setDayModalOpen(true);
        result.current.setShowManualEntry(true);
        result.current.setSelectedDate(new Date("2024-01-15"));
      });

      // Reset state
      act(() => {
        result.current.setDayModalOpen(false);
        result.current.setShowManualEntry(false);
        result.current.setSelectedDate(null);
        result.current.setSelectedDayData(null);
      });

      expect(result.current.dayModalOpen).toBe(false);
      expect(result.current.showManualEntry).toBe(false);
      expect(result.current.selectedDate).toBeNull();
      expect(result.current.selectedDayData).toBeNull();
    });
  });

  describe("Callback Memoization", () => {
    it("should maintain callback references across rerenders", () => {
      const { result, rerender } = renderHook(() => useDashboardCalendar({ recentAnalyses: mockAnalyses }));

      const firstRenderCallbacks = {
        navigateMonth: result.current.navigateMonth,
        handleDateSelect: result.current.handleDateSelect,
        handleDayWithData: result.current.handleDayWithData,
        handleDayWithoutData: result.current.handleDayWithoutData,
        formatDateKey: result.current.formatDateKey,
      };

      rerender();

      // Callbacks should maintain same reference
      expect(result.current.formatDateKey).toBe(firstRenderCallbacks.formatDateKey);
      expect(result.current.handleDateSelect).toBe(firstRenderCallbacks.handleDateSelect);
      expect(result.current.handleDayWithData).toBe(firstRenderCallbacks.handleDayWithData);
      expect(result.current.handleDayWithoutData).toBe(firstRenderCallbacks.handleDayWithoutData);
    });
  });
});
