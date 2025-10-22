/**
 * Report Data Converter - Utilities for converting analysis data to report format
 */

import type { AnalysisWithDetails, DailyEntryRecord } from "@/lib/repositories/analysis-repository";
import { mapToDailyEntryStatus } from "@/lib/utils/status-mapper";

export interface DailyEntry {
  date: string;
  day: string;
  consignments: number;
  rate: number;
  basePay: number;
  pickups: number;
  pickupTotal: number;
  bonuses: {
    unloading: number;
    attendance: number;
    early: number;
  };
  expected: number;
  paid: number;
  difference: number;
  status: "complete" | "pending" | "overpaid" | "underpaid" | "balanced";
}

export interface ReportTotals {
  consignments: number;
  basePay: number;
  pickups: number;
  bonuses: number;
  expected: number;
  paid: number;
  difference: number;
}

export interface ReportData {
  period: string;
  reportType: string;
  generatedDate: string;
  totalDays: number;
  status: string;
  dailyEntries: DailyEntry[];
  totals: ReportTotals;
  breakdown: {
    consignments: number;
    pickups: number;
    unloading: number;
    attendance: number;
    early: number;
    total: number;
  };
}

export const mapDailyEntryRecordToReportFormat = (record: DailyEntryRecord): DailyEntry => {
  return {
    date: record.date,
    day: new Date(record.date).toLocaleDateString("en-US", { weekday: "long" }),
    consignments: record.consignments,
    rate: record.rate,
    basePay: record.base_payment,
    pickups: record.pickups,
    pickupTotal: record.pickup_total,
    bonuses: {
      unloading: record.unloading_bonus,
      attendance: record.attendance_bonus,
      early: record.early_bonus,
    },
    expected: record.expected_total,
    paid: record.paid_amount,
    difference: record.difference,
    status: mapToDailyEntryStatus(record.status, record.difference),
  };
};

export const convertDatabaseAnalysisToReportData = (
  analysis: AnalysisWithDetails,
  filteredEntries: DailyEntryRecord[],
  dayFilter?: string | null,
  weekFilter?: string | null,
  startDate?: string | null,
  endDate?: string | null
): ReportData => {
  const dailyEntries: DailyEntry[] = [];
  const totals: ReportTotals = {
    consignments: 0,
    basePay: 0,
    pickups: 0,
    bonuses: 0,
    expected: 0,
    paid: 0,
    difference: 0,
  };

  // Convert filtered entries
  filteredEntries.forEach((entry) => {
    const dailyEntry = mapDailyEntryRecordToReportFormat(entry);
    dailyEntries.push(dailyEntry);

    // Update totals
    totals.consignments += entry.consignments;
    totals.basePay += entry.base_payment;
    totals.pickups += entry.pickup_total;
    totals.bonuses += entry.unloading_bonus + entry.attendance_bonus + entry.early_bonus;
    totals.expected += entry.expected_total;
    totals.paid += entry.paid_amount;
    totals.difference += entry.difference;
  });

  // Use analysis_totals if no filtering is applied
  const analysisTotals = Array.isArray(analysis.analysis_totals)
    ? analysis.analysis_totals[0]
    : analysis.analysis_totals;

  if (!dayFilter && !weekFilter && analysisTotals && typeof analysisTotals === "object") {
    totals.expected = analysisTotals.expected_total || 0;
    totals.paid = analysisTotals.paid_total || 0;
    totals.difference = analysisTotals.difference_total || 0;
    totals.basePay = analysisTotals.base_total || 0;
    totals.pickups = analysisTotals.pickup_total || 0;
    totals.bonuses = analysisTotals.bonus_total || 0;
  }

  // Ensure all totals are numbers
  Object.keys(totals).forEach((key) => {
    const typedKey = key as keyof ReportTotals;
    if (typeof totals[typedKey] !== "number" || Number.isNaN(totals[typedKey])) {
      totals[typedKey] = 0;
    }
  });

  // Determine report type and period display
  let reportType: string;
  let periodDisplay = "";
  let reportTotalDays: number;

  const isSingleDayAnalysis = dailyEntries.length === 1;

  if (dayFilter || isSingleDayAnalysis) {
    reportType = "Daily Report";
    const dateToDisplay = dayFilter || dailyEntries[0]?.date;
    periodDisplay = dateToDisplay
      ? new Date(dateToDisplay).toLocaleDateString("en-GB", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";
    reportTotalDays = 1;
  } else if (weekFilter && startDate && endDate && dailyEntries.length > 1) {
    reportType = "Weekly Report";
    periodDisplay = `${new Date(startDate).toLocaleDateString("en-GB")} - ${new Date(endDate).toLocaleDateString("en-GB")}`;
    reportTotalDays = dailyEntries.length;
  } else if (!isSingleDayAnalysis) {
    reportType = "Financial Analysis Report";
    periodDisplay = `${new Date(analysis.period_start).toLocaleDateString("en-GB")} - ${new Date(analysis.period_end).toLocaleDateString("en-GB")}`;
    reportTotalDays = analysis.working_days || dailyEntries.length;
  } else {
    reportType = "Daily Report";
    periodDisplay = dailyEntries[0]?.date
      ? new Date(dailyEntries[0].date).toLocaleDateString("en-GB", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";
    reportTotalDays = 1;
  }

  return {
    period: periodDisplay,
    reportType: reportType,
    generatedDate: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    totalDays: reportTotalDays,
    status: analysis.status === "completed" ? "Complete" : analysis.status,
    dailyEntries: [...dailyEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    totals,
    breakdown: {
      consignments: totals.basePay,
      pickups: totals.pickups,
      unloading: dailyEntries.reduce((sum, entry) => sum + entry.bonuses.unloading, 0),
      attendance: dailyEntries.reduce((sum, entry) => sum + entry.bonuses.attendance, 0),
      early: dailyEntries.reduce((sum, entry) => sum + entry.bonuses.early, 0),
      total: totals.expected,
    },
  };
};
