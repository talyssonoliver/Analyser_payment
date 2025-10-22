/**
 * useDashboardData Hook
 * Manages dashboard data loading, aggregation, and period calculations
 */

import { useCallback, useState } from "react";
import type { KPIData } from "@/components/charts/kpi-cards";
import type { RevenueDataPoint } from "@/components/charts/revenue-chart";
import type { AnalysisWithDetails } from "@/lib/repositories/analysis-repository";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import { analyticsService } from "@/lib/services/analytics-service";

interface DashboardData {
  kpis: KPIData[];
  revenueData: RevenueDataPoint[];
  recentAnalyses: AnalysisWithDetails[];
  forecast?: number;
  totalRevenue: number;
  avgDaily: number;
  deliveries: number;
  performance: number;
  revenueChange: number;
  deliveriesChange: number;
  periodLabel: string;
}

interface DailyEntryData {
  date: string;
  consignments: number;
  paid_amount: number;
  expected_total: number;
}

interface UseDashboardDataOptions {
  userId?: string;
  period?: string;
  viewMode?: "monthly" | "weekly";
  currentMonth?: Date;
  currentWeek?: Date;
}

export function useDashboardData() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData>({
    kpis: [],
    revenueData: [],
    recentAnalyses: [],
    totalRevenue: 0,
    avgDaily: 0,
    deliveries: 0,
    performance: 0,
    revenueChange: 0,
    deliveriesChange: 0,
    periodLabel: "Weekly",
  });
  const [analyses, setAnalyses] = useState<AnalysisWithDetails[]>([]);

  // Helper function to get ISO week number
  const getWeekOfYear = useCallback((date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }, []);

  // Helper function to calculate period dates
  const calculatePeriodDates = useCallback(
    (viewMode: "monthly" | "weekly", referenceDate: Date) => {
      let periodStart: Date;
      let periodEnd: Date;
      let periodLabel: string;

      if (viewMode === "monthly") {
        // Get first day of month at start of day
        periodStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
        periodStart.setHours(0, 0, 0, 0);

        // Get last day of month at end of day
        periodEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
        periodEnd.setHours(23, 59, 59, 999);

        const currentYear = new Date().getFullYear();
        const isCurrentYear = referenceDate.getFullYear() === currentYear;
        periodLabel = referenceDate.toLocaleDateString("en-US", {
          month: "long",
          ...(isCurrentYear ? {} : { year: "numeric" }),
        });
      } else {
        // Weekly mode: use referenceDate to calculate the week
        const dayOfWeek = referenceDate.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        periodStart = new Date(referenceDate);
        periodStart.setDate(referenceDate.getDate() - daysToMonday);
        periodStart.setHours(0, 0, 0, 0);

        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);

        // Calculate week number for better label
        const weekNumber = getWeekOfYear(periodStart);
        const currentYear = new Date().getFullYear();
        const isCurrentYear = referenceDate.getFullYear() === currentYear;

        const yearSuffix = isCurrentYear ? "" : `, ${referenceDate.getFullYear()}`;
        periodLabel = `Week ${weekNumber}${yearSuffix}`;
      }

      return { periodStart, periodEnd, periodLabel };
    },
    [getWeekOfYear]
  );

  // Helper function to calculate previous period dates
  const calculatePreviousPeriodDates = useCallback(
    (viewMode: "monthly" | "weekly", now: Date, periodStart: Date, periodEnd: Date) => {
      let prevPeriodStart: Date;
      let prevPeriodEnd: Date;

      if (viewMode === "monthly") {
        prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      } else {
        prevPeriodStart = new Date(periodStart);
        prevPeriodStart.setDate(periodStart.getDate() - 7);
        prevPeriodEnd = new Date(periodEnd);
        prevPeriodEnd.setDate(periodEnd.getDate() - 7);
      }

      return { prevPeriodStart, prevPeriodEnd };
    },
    []
  );

  const loadDashboardData = useCallback(
    async (options: UseDashboardDataOptions) => {
      const {
        userId,
        period = "30d",
        viewMode = "monthly",
        currentMonth = new Date(),
        currentWeek = new Date(),
      } = options;

      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get analytics data
        const analyticsResult = await analyticsService.getAnalyticsData({
          userId,
          period,
        });

        if (!analyticsResult.isSuccess) {
          throw new Error(analyticsResult.error.message);
        }

        // Get all analyses with details in a single optimized query
        const analysesResult = await analysisRepository.getUserAnalyses(userId, {
          limit: 1000,
          orderBy: "created_at",
          order: "desc",
        });

        if (analysesResult.isFailure) {
          console.warn("Failed to load recent analyses:", analysesResult.error.message);
        }

        const analyses = analysesResult.isSuccess ? analysesResult.data.data : [];
        setAnalyses(analyses || []);

        // Generate forecast if user has data
        const hasAnalyses = (analyses || []).length > 0;
        let forecastValue = null;

        if (hasAnalyses) {
          try {
            const forecastResult = await analyticsService.forecastEarnings(userId, 30);
            forecastValue = forecastResult.forecast;
          } catch (error) {
            console.warn("Failed to generate forecast:", error);
          }
        }

        // Calculate executive summary data
        const _localAnalyses = AnalysisStorageService.loadAnalyses();

        // Use currentWeek for weekly mode, currentMonth for monthly mode
        const referenceDate = viewMode === "weekly" ? currentWeek : currentMonth;
        const { periodStart, periodEnd, periodLabel } = calculatePeriodDates(
          viewMode,
          referenceDate
        );

        // ✅ CRITICAL FIX: Calculate metrics from DATABASE ONLY
        // localStorage is now only a cache - database is the single source of truth
        let totalRevenue = 0;
        let totalDeliveries = 0;
        let totalExpected = 0;
        let totalPaid = 0;
        let daysWithData = 0;

        // Process database analyses (single source of truth)
        analyses?.forEach((analysis) => {
          if (analysis.daily_entries) {
            analysis.daily_entries.forEach((entry: DailyEntryData) => {
              const entryDate = new Date(entry.date);
              if (entryDate >= periodStart && entryDate <= periodEnd) {
                totalRevenue += entry.paid_amount || 0;
                totalDeliveries += entry.consignments || 0;
                totalExpected += entry.expected_total || 0;
                totalPaid += entry.paid_amount || 0;
                if (entry.consignments > 0) daysWithData++;
              }
            });
          }
        });

        console.log(
          `📊 Dashboard metrics for ${periodLabel}: revenue=£${totalRevenue.toFixed(2)}, deliveries=${totalDeliveries}, days=${daysWithData} (from database)`
        );

        // Calculate previous period for comparison
        const { prevPeriodStart, prevPeriodEnd } = calculatePreviousPeriodDates(
          viewMode,
          referenceDate,
          periodStart,
          periodEnd
        );

        // Calculate previous period metrics
        let prevRevenue = 0;
        let prevDeliveries = 0;

        analyses?.forEach((analysis) => {
          if (analysis.daily_entries) {
            analysis.daily_entries.forEach((entry: DailyEntryData) => {
              const entryDate = new Date(entry.date);
              if (entryDate >= prevPeriodStart && entryDate <= prevPeriodEnd) {
                prevRevenue += entry.paid_amount || 0;
                prevDeliveries += entry.consignments || 0;
              }
            });
          }
        });

        // Calculate changes
        const revenueChange =
          prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
        const deliveriesChange =
          prevDeliveries > 0 ? ((totalDeliveries - prevDeliveries) / prevDeliveries) * 100 : 0;

        // Calculate other metrics
        const avgDaily = daysWithData > 0 ? totalRevenue / daysWithData : 0;
        const performance = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

        setData({
          kpis: analyticsResult.data.kpis,
          revenueData: analyticsResult.data.revenueChart || [],
          recentAnalyses: analyses || [],
          forecast: forecastValue ?? undefined,
          totalRevenue,
          avgDaily,
          deliveries: totalDeliveries,
          performance,
          revenueChange,
          deliveriesChange,
          periodLabel,
        });
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    },
    [calculatePeriodDates, calculatePreviousPeriodDates]
  );

  return {
    data,
    analyses,
    loading,
    loadDashboardData,
  };
}
