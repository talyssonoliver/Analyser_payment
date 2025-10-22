/**
 * Custom hook for managing report URL parameters
 */

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { weekNavigationService } from "@/lib/services/week-navigation-service";

export interface ReportUrlParams {
  analysisId: string | null;
  dayFilter: string | null;
  weekFilter: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface FinalReportParams extends ReportUrlParams {
  finalAnalysisId: string | null;
  finalWeekFilter: string | null;
  finalStartDate: string | null;
  finalEndDate: string | null;
  selectedWeek: ReturnType<typeof weekNavigationService.getSelectedWeek>;
  weekAnalysisId: string | null;
}

export function useReportUrlParams() {
  const searchParams = useSearchParams();

  // Helper function to get week start date (Monday)
  const getWeekStartDate = useCallback((year: number, weekNumber: number): Date => {
    const januaryFirst = new Date(year, 0, 1);
    const daysToFirstMonday = (8 - januaryFirst.getDay()) % 7;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
    return new Date(firstMonday.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
  }, []);

  // Helper function to get week end date (Sunday)
  const getWeekEndDate = useCallback(
    (year: number, weekNumber: number): Date => {
      const weekStart = getWeekStartDate(year, weekNumber);
      return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    },
    [getWeekStartDate]
  );

  // Extract URL parameters
  const extractUrlParameters = useCallback((): ReportUrlParams => {
    return {
      // Support both 'analysisId' and 'analysis' parameter names for backwards compatibility
      analysisId: searchParams.get("analysisId") || searchParams.get("analysis"),
      dayFilter: searchParams.get("day"),
      weekFilter: searchParams.get("week"),
      startDate: searchParams.get("start"),
      endDate: searchParams.get("end"),
    };
  }, [searchParams]);

  // Determine final parameters from URL and navigation state
  const determineFinalParameters = useCallback(
    (urlParams: ReportUrlParams): FinalReportParams => {
      const selectedWeek = weekNavigationService.getSelectedWeek();
      const weekAnalysisId = weekNavigationService.getAnalysisId();

      let finalAnalysisId = urlParams.analysisId;
      let finalWeekFilter = urlParams.weekFilter;
      let finalStartDate = urlParams.startDate;
      let finalEndDate = urlParams.endDate;

      // Prioritize URL parameter over week navigation state
      if (urlParams.analysisId) {
        console.log("🔍 Reports Debug - Using URL analysisId:", urlParams.analysisId);
        // URL parameter takes precedence - do NOT use week navigation fallback
      } else if (!urlParams.weekFilter && selectedWeek && weekAnalysisId) {
        // Only use week navigation fallback if NO analysisId in URL
        console.log("🔍 Reports Debug - Using week navigation state as fallback");
        finalAnalysisId = weekAnalysisId;
        finalWeekFilter = selectedWeek.week.toString();

        const weekStartDate = getWeekStartDate(selectedWeek.year, selectedWeek.week);
        const weekEndDate = getWeekEndDate(selectedWeek.year, selectedWeek.week);
        finalStartDate = weekStartDate.toISOString().split("T")[0];
        finalEndDate = weekEndDate.toISOString().split("T")[0];

        console.log(
          "🔍 Reports Debug - Calculated week date range:",
          finalStartDate,
          "to",
          finalEndDate
        );
      }

      return {
        ...urlParams,
        finalAnalysisId,
        finalWeekFilter,
        finalStartDate,
        finalEndDate,
        selectedWeek,
        weekAnalysisId,
      };
    },
    [getWeekStartDate, getWeekEndDate]
  );

  return {
    extractUrlParameters,
    determineFinalParameters,
    getWeekStartDate,
    getWeekEndDate,
  };
}
