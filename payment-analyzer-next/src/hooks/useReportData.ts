/**
 * Custom hook for loading and managing report data
 */

import { useCallback, useEffect, useState } from "react";
import {
  convertDatabaseAnalysisToReportData,
  type ReportData,
} from "@/components/reports/ReportDataConverter";
import type { AnalysisWithDetails } from "@/lib/repositories/analysis-repository";
import { weekNavigationService } from "@/lib/services/week-navigation-service";
import { useAnalysisLoader } from "./useAnalysisLoader";
import { useReportUrlParams } from "./useReportUrlParams";

export function useReportData(userId: string | undefined) {
  const { extractUrlParameters, determineFinalParameters } = useReportUrlParams();
  const { loadAnalysisData, filterDailyEntries, loadLatestAnalysis } = useAnalysisLoader();

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDailyReport, setIsDailyReport] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [requestedAnalysisId, setRequestedAnalysisId] = useState<string | null>(null);

  // Process loaded analysis data
  const processAnalysisData = useCallback(
    (
      analysisData: AnalysisWithDetails,
      urlParams: ReturnType<typeof extractUrlParameters>,
      finalParams: ReturnType<typeof determineFinalParameters>
    ) => {
      const filteredEntries = filterDailyEntries(
        analysisData.daily_entries || [],
        urlParams.dayFilter,
        finalParams.finalWeekFilter,
        finalParams.finalStartDate,
        finalParams.finalEndDate
      );

      const reportData = convertDatabaseAnalysisToReportData(
        analysisData,
        filteredEntries,
        urlParams.dayFilter,
        finalParams.finalWeekFilter,
        finalParams.finalStartDate,
        finalParams.finalEndDate
      );

      setReportData(reportData);
      setIsDailyReport(
        !!urlParams.dayFilter ||
          (reportData.totalDays === 1 && reportData.reportType === "Daily Report")
      );
      setCurrentAnalysisId(analysisData.id);

      if (finalParams.selectedWeek && finalParams.weekAnalysisId && !urlParams.analysisId) {
        setTimeout(() => weekNavigationService.clearSelectedWeek(), 1000);
      }
    },
    [filterDailyEntries]
  );

  // Load report data
  useEffect(() => {
    const loadReportData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const urlParams = extractUrlParameters();
        const finalParams = determineFinalParameters(urlParams);
        setRequestedAnalysisId(finalParams.finalAnalysisId);

        const analysisData = await loadAnalysisData(userId, finalParams.finalAnalysisId);

        if (analysisData) {
          processAnalysisData(analysisData, urlParams, finalParams);
        } else if (finalParams.finalAnalysisId) {
          setReportData(null);
        } else {
          // Try to load latest analysis as fallback
          const latestAnalysis = await loadLatestAnalysis(userId);
          if (latestAnalysis) {
            processAnalysisData(latestAnalysis, urlParams, {
              ...finalParams,
              finalAnalysisId: latestAnalysis.id,
            });
          } else {
            setReportData(null);
          }
        }
      } catch (error) {
        console.error("Error loading analysis data:", error);
        setReportData(null);
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [
    userId,
    extractUrlParameters,
    determineFinalParameters,
    loadAnalysisData,
    loadLatestAnalysis,
    processAnalysisData,
  ]);

  return {
    reportData,
    loading,
    isDailyReport,
    currentAnalysisId,
    requestedAnalysisId,
  };
}
