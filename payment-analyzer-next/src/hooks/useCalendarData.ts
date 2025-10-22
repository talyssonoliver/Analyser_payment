/**
 * useCalendarData Hook
 * Manages calendar data, payment status, and date formatting
 */

import { useCallback, useMemo } from "react";
import type { AnalysisWithDetails } from "@/lib/repositories/analysis-repository";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";

type PaymentStatus = "pending" | "received" | "shortfall";

interface PaymentInfo {
  hasData: boolean;
  totalExpected: number;
  totalPaid: number;
  statuses: PaymentStatus[];
}

interface UseCalendarDataOptions {
  recentAnalyses: AnalysisWithDetails[];
  currentMonth: Date;
  viewMode?: "monthly" | "weekly";
  currentWeek?: Date;
}

export function useCalendarData({
  recentAnalyses,
  currentMonth,
  viewMode: _viewMode = "monthly",
  currentWeek: _currentWeek,
}: UseCalendarDataOptions) {
  // Helper function to format date consistently without timezone issues
  const formatDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Get detailed payment info for a specific date with multiple statuses
  const getPaymentInfoForDate = (date: Date | null): PaymentInfo => {
    if (!date) {
      return {
        hasData: false,
        totalExpected: 0,
        totalPaid: 0,
        statuses: [],
      };
    }

    const dateKey = formatDateKey(date);
    let totalExpected = 0;
    let totalPaid = 0;
    let hasData = false;

    // Check database analyses FIRST (more reliable for payment data)
    if (recentAnalyses.length > 0) {
      recentAnalyses.forEach((analysis) => {
        if (analysis.daily_entries) {
          const dayEntry = analysis.daily_entries.find((entry) => {
            const entryDate = new Date(entry.date);
            return formatDateKey(entryDate) === dateKey && (entry.consignments || 0) > 0;
          });
          if (dayEntry) {
            hasData = true;
            totalExpected += dayEntry.expected_total || 0;
            totalPaid += dayEntry.paid_amount || 0;
          }
        }
      });
    }

    // Check localStorage analyses as fallback if no database data
    if (!hasData) {
      const localAnalyses = AnalysisStorageService.loadAnalyses();
      if (localAnalyses && Object.keys(localAnalyses).length > 0) {
        Object.values(localAnalyses).forEach((analysis: unknown) => {
          const typedAnalysis = analysis as { dailyData?: Record<string, unknown> };
          if (typedAnalysis.dailyData) {
            const dayEntry = typedAnalysis.dailyData[dateKey];
            if (dayEntry && typeof dayEntry === "object") {
              const typedDayEntry = dayEntry as {
                consignments?: number;
                expectedTotal?: number;
                paidAmount?: number;
              };
              if ((typedDayEntry.consignments || 0) > 0) {
                hasData = true;
                totalExpected += typedDayEntry.expectedTotal || 0;
                totalPaid += typedDayEntry.paidAmount || 0;
              }
            }
          }
        });
      }
    }

    // Determine status indicators to show - can show multiple
    const statuses: PaymentStatus[] = [];
    if (hasData) {
      // Blue dot: Always show for data (work was done)
      statuses.push("pending");

      // Green dot: Show if any payment received
      if (totalPaid > 0) {
        statuses.push("received");
      }

      // Red dot: Show if there's a shortfall (paid < expected)
      if (totalExpected > 0 && totalPaid < totalExpected) {
        statuses.push("shortfall");
      }
    }

    return { hasData, totalExpected, totalPaid, statuses };
  };

  // Get days in month for calendar grid
  const getDaysInMonth = useCallback(() => {
    // Always show full month regardless of viewMode
    // In weekly mode, the visual highlighting will be handled by the component
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

  // Format calendar date
  const formatCalendarDate = (date: Date | null) => {
    if (!date) return "";
    return date.getDate().toString();
  };

  // Check if date is today
  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Helper function for status tooltips
  const getStatusTooltip = (status: PaymentStatus, paymentInfo: PaymentInfo) => {
    switch (status) {
      case "pending": {
        const expectedText =
          paymentInfo.totalExpected > 0
            ? `£${paymentInfo.totalExpected.toFixed(2)} expected`
            : "payment pending";
        return `Work completed - ${expectedText}`;
      }
      case "received":
        return `Payment received: £${paymentInfo.totalPaid.toFixed(2)}`;
      case "shortfall":
        return `Payment shortfall: £${(paymentInfo.totalExpected - paymentInfo.totalPaid).toFixed(2)} missing`;
      default:
        return "";
    }
  };

  const daysInMonth = useMemo(() => getDaysInMonth(), [getDaysInMonth]);

  return {
    formatDateKey,
    getPaymentInfoForDate,
    getDaysInMonth,
    daysInMonth,
    formatCalendarDate,
    isToday,
    getStatusTooltip,
  };
}
