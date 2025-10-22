/**
 * useDashboardCalendar Hook
 * Manages calendar navigation, day selection, and modal states
 * Supports both monthly and weekly navigation modes
 */

import { useCallback, useEffect, useState } from "react";
import type { AnalysisWithDetails } from "@/lib/repositories/analysis-repository";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";

interface DayData {
  date: string;
  analysisId: string;
  analysisName: string;
  data: {
    consignments: number;
    expectedTotal: number;
    paidAmount: number;
    difference: number;
    status: string;
  };
}

interface SelectedDayData {
  date: Date;
  dayData: DayData[];
}

interface UseDashboardCalendarProps {
  recentAnalyses: AnalysisWithDetails[];
  viewMode?: "monthly" | "weekly";
}

export function useDashboardCalendar({
  recentAnalyses,
  viewMode = "monthly",
}: UseDashboardCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<SelectedDayData | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Helper to get week start date (Monday)
  const getWeekStart = useCallback((date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Helper to get week end date (Sunday)
  const getWeekEnd = useCallback(
    (date: Date): Date => {
      const weekStart = getWeekStart(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return weekEnd;
    },
    [getWeekStart]
  );

  // Helper to format date key
  const formatDateKey = useCallback((date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }, []);

  // Sync currentWeek with currentMonth when viewMode changes to weekly
  useEffect(() => {
    if (viewMode === "weekly") {
      // When switching to weekly mode, set currentWeek to a week within currentMonth
      // Find a week that overlaps with the current month
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const weekStart = getWeekStart(currentWeek);
      const weekEnd = getWeekEnd(currentWeek);

      // Check if current week overlaps with current month at all
      const weekOverlapsMonth = weekStart <= monthEnd && weekEnd >= monthStart;

      // If no overlap, set currentWeek to the middle of the month to ensure it's visible
      if (!weekOverlapsMonth) {
        const middleOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15);
        setCurrentWeek(middleOfMonth);
      }
    }
  }, [viewMode, currentMonth, currentWeek, getWeekStart, getWeekEnd]);

  // Navigate by weeks
  const navigateWeek = useCallback(
    (direction: "prev" | "next") => {
      const newWeek = new Date(currentWeek);

      if (direction === "prev") {
        newWeek.setDate(newWeek.getDate() - 7);
        setCurrentWeek(newWeek);

        // Update currentMonth to match the new week's month
        const newMonth = new Date(newWeek.getFullYear(), newWeek.getMonth(), 1);
        setCurrentMonth(newMonth);
        return;
      }

      // Handle next week navigation
      const now = new Date();
      const nextWeek = new Date(currentWeek);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStart = getWeekStart(nextWeek);
      const nowWeekStart = getWeekStart(now);

      // Prevent navigation to future weeks
      if (nextWeekStart <= nowWeekStart) {
        newWeek.setDate(newWeek.getDate() + 7);
        setCurrentWeek(newWeek);

        // Update currentMonth to match the new week's month
        const newMonth = new Date(newWeek.getFullYear(), newWeek.getMonth(), 1);
        setCurrentMonth(newMonth);
      }
    },
    [currentWeek, getWeekStart]
  );

  // Navigate by months
  const navigateMonthInternal = useCallback(
    (direction: "prev" | "next") => {
      const newMonth = new Date(currentMonth);

      if (direction === "prev") {
        newMonth.setMonth(newMonth.getMonth() - 1);
        setCurrentMonth(newMonth);
        return;
      }

      // Handle next month navigation
      const now = new Date();
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Prevent navigation to future months
      const canNavigate =
        nextMonth.getFullYear() < now.getFullYear() ||
        (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() <= now.getMonth());

      if (canNavigate) {
        newMonth.setMonth(newMonth.getMonth() + 1);
        setCurrentMonth(newMonth);
      }
    },
    [currentMonth]
  );

  // Navigate period (month or week depending on viewMode)
  const navigateMonth = useCallback(
    (direction: "prev" | "next") => {
      if (viewMode === "weekly") {
        navigateWeek(direction);
      } else {
        navigateMonthInternal(direction);
      }
    },
    [viewMode, navigateWeek, navigateMonthInternal]
  );

  // Handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowManualEntry(true);
  }, []);

  // Search in-memory database data for day entry
  const searchInMemoryDatabaseData = useCallback(
    (dateKey: string) => {
      for (const analysis of recentAnalyses) {
        if (!analysis.daily_entries) continue;

        const dayEntry = analysis.daily_entries.find((entry) => {
          const entryDate = new Date(entry.date);
          const entryDateKey = formatDateKey(entryDate);
          return entryDateKey === dateKey && (entry.consignments || 0) > 0;
        });

        if (dayEntry) {
          return {
            analysisId: analysis.id,
            analysisName: analysis.period_start
              ? `Week of ${new Date(analysis.period_start).toLocaleDateString()}`
              : `Analysis ${analysis.id}`,
            data: {
              consignments: dayEntry.consignments || 0,
              expectedTotal: dayEntry.expected_total || 0,
              paidAmount: dayEntry.paid_amount || 0,
              difference: (dayEntry.paid_amount || 0) - (dayEntry.expected_total || 0),
              status: "complete",
            },
          };
        }
      }
      return null;
    },
    [recentAnalyses, formatDateKey]
  );

  // Search localStorage data for day entry
  const searchLocalStorageData = useCallback((dateKey: string) => {
    const localAnalyses = AnalysisStorageService.loadAnalyses();
    if (!localAnalyses || Object.keys(localAnalyses).length === 0) {
      return null;
    }

    for (const [id, analysis] of Object.entries(localAnalyses)) {
      const typedAnalysis = analysis as Record<string, unknown>;
      if (!typedAnalysis.dailyData || typeof typedAnalysis.dailyData !== "object") continue;

      const dailyData = typedAnalysis.dailyData as Record<string, Record<string, unknown>>;
      const dayEntry = dailyData[dateKey];

      if (dayEntry && typeof dayEntry === "object" && (dayEntry.consignments as number) > 0) {
        return {
          analysisId: id,
          analysisName: (typedAnalysis.period as string) || `Analysis ${id}`,
          data: {
            consignments: (dayEntry.consignments as number) || 0,
            expectedTotal: (dayEntry.expectedTotal as number) || 0,
            paidAmount: (dayEntry.paidAmount as number) || 0,
            difference:
              ((dayEntry.paidAmount as number) || 0) - ((dayEntry.expectedTotal as number) || 0),
            status: (dayEntry.status as string) || "complete",
          },
        };
      }
    }
    return null;
  }, []);

  // Load data for a specific day
  const loadDayData = useCallback(
    (date: Date) => {
      try {
        const dateKey = formatDateKey(date);

        // First try in-memory database data, then localStorage fallback
        const bestMatch = searchInMemoryDatabaseData(dateKey) || searchLocalStorageData(dateKey);

        if (bestMatch) {
          setSelectedDayData({
            date,
            dayData: [
              {
                date: dateKey,
                analysisId: bestMatch.analysisId,
                analysisName: date.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
                data: bestMatch.data,
              },
            ],
          });
          setDayModalOpen(true);
        }
      } catch (error) {
        console.error("Error loading day data:", error);
      }
    },
    [formatDateKey, searchInMemoryDatabaseData, searchLocalStorageData]
  );

  // Handle day with data click
  const handleDayWithData = useCallback(
    (date: Date) => {
      loadDayData(date);
    },
    [loadDayData]
  );

  // Handle day without data click
  const handleDayWithoutData = useCallback(
    (date: Date) => {
      handleDateSelect(date);
    },
    [handleDateSelect]
  );

  return {
    currentMonth,
    currentWeek,
    selectedDate,
    dayModalOpen,
    selectedDayData,
    showManualEntry,
    setCurrentMonth,
    setCurrentWeek,
    setSelectedDate,
    setDayModalOpen,
    setSelectedDayData,
    setShowManualEntry,
    navigateMonth,
    handleDateSelect,
    handleDayWithData,
    handleDayWithoutData,
    loadDayData,
    formatDateKey,
    getWeekStart,
    getWeekEnd,
  };
}
