/**
 * Custom hook for loading analysis data
 */

import { useCallback } from "react";
import type { AnalysisWithDetails, DailyEntryRecord } from "@/lib/repositories/analysis-repository";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";

export function useAnalysisLoader() {
  // Validate analysis ID format
  const validateAnalysisId = useCallback((analysisId: string): "uuid" | "session" | "invalid" => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const sessionIdRegex = /^analysis-\d+$/;

    if (uuidRegex.test(analysisId)) return "uuid";
    if (sessionIdRegex.test(analysisId)) return "session";
    return "invalid";
  }, []);

  // Transform localStorage analysis to database format
  const transformLocalStorageAnalysis = useCallback(
    (localAnalysis: unknown): AnalysisWithDetails | null => {
      if (!localAnalysis) return null;

      const typedAnalysis = localAnalysis as {
        id?: string;
        dailyData?: Record<string, unknown>;
        createdAt?: string;
        period?: string;
        status?: string;
        summary?: {
          workingDays?: number;
          totalConsignments?: number;
          [key: string]: unknown;
        };
        totals?: {
          base_total?: number;
          pickup_total?: number;
          bonus_total?: number;
          expected_total?: number;
          paid_total?: number;
          difference_total?: number;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };

      if (!typedAnalysis) return null;

      const dailyEntries = typedAnalysis.dailyData
        ? Object.entries(typedAnalysis.dailyData).map(([date, data]: [string, unknown]) => {
            const typedData = data as {
              consignments?: number;
              paidAmount?: number;
              expectedTotal?: number;
              unloadingBonus?: number;
              attendanceBonus?: number;
              earlyBonus?: number;
              rate?: number;
              basePayment?: number;
              pickups?: number;
              pickupTotal?: number;
              status?: string;
            };
            return {
              id: "",
              analysis_id: typedAnalysis.id || "",
              date,
              day_of_week: new Date(date).getDay(),
              consignments: typedData.consignments || 0,
              rate: typedData.rate || 0,
              base_payment: typedData.basePayment || 0,
              pickups: typedData.pickups || 0,
              pickup_total: typedData.pickupTotal || 0,
              unloading_bonus: typedData.unloadingBonus || 0,
              attendance_bonus: typedData.attendanceBonus || 0,
              early_bonus: typedData.earlyBonus || 0,
              expected_total: typedData.expectedTotal || 0,
              paid_amount: typedData.paidAmount || 0,
              difference: (typedData.paidAmount || 0) - (typedData.expectedTotal || 0),
              status: (typedData.status as "balanced" | "overpaid" | "underpaid") || "balanced",
              created_at: typedAnalysis.createdAt || new Date().toISOString(),
              updated_at: typedAnalysis.createdAt || new Date().toISOString(),
              user_id: "",
            };
          })
        : [];

      const periodParts = typedAnalysis.period?.split(" - ");
      const period_start = periodParts?.[0]
        ? new Date(periodParts[0]).toISOString()
        : new Date().toISOString();
      const period_end = periodParts?.[1]
        ? new Date(periodParts[1]).toISOString()
        : new Date().toISOString();

      return {
        id: typedAnalysis.id || "",
        user_id: "",
        fingerprint: "",
        source: "manual" as const,
        status:
          (typedAnalysis.status as "pending" | "processing" | "completed" | "error") || "completed",
        period_start,
        period_end,
        rules_version: 1,
        working_days: typedAnalysis.summary?.workingDays || 0,
        total_consignments: typedAnalysis.summary?.totalConsignments || 0,
        metadata: {},
        created_at: typedAnalysis.createdAt || new Date().toISOString(),
        updated_at: typedAnalysis.createdAt || new Date().toISOString(),
        daily_entries: dailyEntries,
        analysis_totals: typedAnalysis.totals
          ? {
              id: "",
              analysis_id: typedAnalysis.id || "",
              base_total: typedAnalysis.totals.base_total || 0,
              pickup_total: typedAnalysis.totals.pickup_total || 0,
              bonus_total: typedAnalysis.totals.bonus_total || 0,
              expected_total: typedAnalysis.totals.expected_total || 0,
              paid_total: typedAnalysis.totals.paid_total || 0,
              difference_total: typedAnalysis.totals.difference_total || 0,
              created_at: typedAnalysis.createdAt || new Date().toISOString(),
            }
          : undefined,
      };
    },
    []
  );

  // Load analysis by session-based ID
  const loadAnalysisBySessionId = useCallback(
    async (_userId: string, analysisId: string): Promise<AnalysisWithDetails | null> => {
      const localAnalysis = AnalysisStorageService.loadAnalysis(analysisId);

      if (localAnalysis) {
        return transformLocalStorageAnalysis(localAnalysis);
      }

      console.error("🔍 Reports Debug - No analysis found for session-based ID in localStorage.");
      return null;
    },
    [transformLocalStorageAnalysis]
  );

  // Load analysis by UUID
  const loadAnalysisByUuid = useCallback(
    async (userId: string, analysisId: string): Promise<AnalysisWithDetails | null> => {
      // First try direct ID lookup
      const result = await analysisRepository.getAnalysisById(analysisId);
      if (result.isSuccess && result.data) {
        return result.data;
      }

      // Try fingerprint search as fallback
      const fingerprintResult = await analysisRepository.findAnalysisByFingerprint(
        userId,
        analysisId
      );

      if (fingerprintResult.isSuccess && fingerprintResult.data) {
        const fullResult = await analysisRepository.getAnalysisById(fingerprintResult.data.id);

        if (fullResult.isSuccess && fullResult.data) {
          return fullResult.data;
        }
      }

      // Final fallback: Check localStorage
      const localAnalysis = AnalysisStorageService.loadAnalysis(analysisId);
      if (localAnalysis) {
        return transformLocalStorageAnalysis(localAnalysis);
      }

      console.warn("🔍 Reports Debug - Analysis not found in database or localStorage");
      return null;
    },
    [transformLocalStorageAnalysis]
  );

  // Load the latest analysis for a user
  const loadLatestAnalysis = useCallback(
    async (userId: string): Promise<AnalysisWithDetails | null> => {
      const result = await analysisRepository.getUserAnalyses(userId, {
        limit: 1,
        orderBy: "created_at",
        order: "desc",
      });

      if (result.isFailure) {
        console.error("🔍 Reports Debug - Error loading user analyses:", result.error.message);
        return null;
      }

      if (result.data.data && result.data.data.length > 0) {
        const detailResult = await analysisRepository.getAnalysisById(result.data.data[0].id);
        if (detailResult.isFailure) {
          console.error(
            "🔍 Reports Debug - Error loading analysis details:",
            detailResult.error.message
          );
          return null;
        }
        return detailResult.data;
      }

      return null;
    },
    []
  );

  // Load analysis data based on ID
  const loadAnalysisData = useCallback(
    async (userId: string, analysisId: string | null) => {
      if (!analysisId) {
        return await loadLatestAnalysis(userId);
      }

      const idType = validateAnalysisId(analysisId);
      if (idType === "invalid") {
        console.error("🔍 Reports Debug - Invalid analysis ID format:", analysisId);
        return null;
      }

      return idType === "session"
        ? await loadAnalysisBySessionId(userId, analysisId)
        : await loadAnalysisByUuid(userId, analysisId);
    },
    [loadAnalysisBySessionId, loadAnalysisByUuid, loadLatestAnalysis, validateAnalysisId]
  );

  // Filter daily entries based on filters
  const filterDailyEntries = useCallback(
    (
      entries: DailyEntryRecord[],
      dayFilter?: string | null,
      weekFilter?: string | null,
      startDate?: string | null,
      endDate?: string | null
    ) => {
      let entriesToProcess = entries;

      if (dayFilter) {
        entriesToProcess = entriesToProcess.filter((entry) => entry.date === dayFilter);
      } else if (weekFilter && startDate && endDate) {
        entriesToProcess = entriesToProcess.filter((entry) => {
          const entryDateStr = String(entry.date);
          const isInRange = entryDateStr >= startDate && entryDateStr <= endDate;
          return isInRange;
        });
      }

      return entriesToProcess;
    },
    []
  );

  return {
    validateAnalysisId,
    loadAnalysisData,
    loadLatestAnalysis,
    filterDailyEntries,
    transformLocalStorageAnalysis,
  };
}
