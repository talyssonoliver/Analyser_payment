/**
 * Inline Report Generator Service
 * Provides immediate report generation and rendering without route navigation
 * Matches legacy generateAnalysisDataForReports() behavior
 */

import type { AnalysisWithDetails } from '@/lib/repositories/analysis-repository';

export interface InlineReportData {
  results: DailyResult[];
  totals: {
    workingDays: number;
    totalConsignments: number;
    expectedTotal: number;
    paidTotal: number;
    averageDaily: number;
    totalDifference: number;
    baseTotal: number;
    bonusTotal: number;
    unloadingTotal: number;
    attendanceTotal: number;
    earlyTotal: number;
    pickupTotal: number;
    pickupCount: number;
  };
  metadata: {
    inputMethod: 'manual' | 'upload';
    createdAt: string;
    period: string;
    entries: number;
    periodRange?: string;
    totalDays?: number;
    analysisDate?: string;
    overallStatus?: 'FAVORABLE' | 'UNFAVORABLE';
    weekInfo?: {
      week: number;
      year: number;
    };
  };
}

export interface DailyResult {
  date: string;
  day: string;
  consignments: number;
  rate: number;
  basePayment: number;
  pickupTotal: number;
  pickupCount: number;
  unloadingBonus: number;
  attendanceBonus: number;
  earlyBonus: number;
  totalBonus: number;
  expectedTotal: number;
  paidAmount: number;
  difference: number;
  status: string;
}

export interface ManualEntry {
  date: string;
  consignments: number;
  expectedTotal: number;
  paidAmount?: number;
}

export class InlineReportGenerator {
  /**
   * Generate report data from manual entries (legacy behavior)
   */
  static generateFromManualEntries(manualEntries: ManualEntry[]): InlineReportData {
    const totalConsignments = manualEntries.reduce((sum, entry) => sum + entry.consignments, 0);
    const totalExpected = manualEntries.reduce((sum, entry) => sum + entry.expectedTotal, 0);

    const results: DailyResult[] = manualEntries.map(entry => ({
      date: entry.date,
      day: new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long' }),
      consignments: entry.consignments,
      rate: entry.expectedTotal / entry.consignments, // Calculate rate from total
      basePayment: entry.expectedTotal, // For manual entries, this is the base
      pickupTotal: 0,
      pickupCount: 0,
      unloadingBonus: 0,
      attendanceBonus: 0,
      earlyBonus: 0,
      totalBonus: 0,
      expectedTotal: entry.expectedTotal,
      paidAmount: entry.paidAmount || entry.expectedTotal,
      difference: (entry.paidAmount || entry.expectedTotal) - entry.expectedTotal,
      status: 'completed'
    }));

    return {
      results,
      totals: {
        workingDays: manualEntries.length,
        totalConsignments: totalConsignments,
        expectedTotal: totalExpected,
        paidTotal: totalExpected, // For manual entries, expected = paid
        averageDaily: totalExpected / manualEntries.length,
        totalDifference: 0,
        baseTotal: totalExpected,
        bonusTotal: 0,
        unloadingTotal: 0,
        attendanceTotal: 0,
        earlyTotal: 0,
        pickupTotal: 0,
        pickupCount: 0
      },
      metadata: {
        inputMethod: 'manual',
        createdAt: new Date().toISOString(),
        period: `${manualEntries.length} working days`,
        entries: manualEntries.length
      }
    };
  }

  /**
   * Generate report data from database analysis (equivalent to legacy full analysis)
   */
  static generateFromDatabaseAnalysis(analysis: AnalysisWithDetails): InlineReportData {
    const results: DailyResult[] = [];
    const totals = {
      workingDays: 0,
      totalConsignments: 0,
      expectedTotal: 0,
      paidTotal: 0,
      averageDaily: 0,
      totalDifference: 0,
      baseTotal: 0,
      bonusTotal: 0,
      unloadingTotal: 0,
      attendanceTotal: 0,
      earlyTotal: 0,
      pickupTotal: 0,
      pickupCount: 0
    };

    // Convert daily entries from database format
    if (analysis.daily_entries) {
      analysis.daily_entries.forEach((entry) => {
        const dailyResult: DailyResult = {
          date: entry.date,
          day: new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long' }),
          consignments: entry.consignments,
          rate: entry.rate,
          basePayment: entry.base_payment,
          pickupTotal: entry.pickup_total,
          pickupCount: entry.pickups,
          unloadingBonus: entry.unloading_bonus,
          attendanceBonus: entry.attendance_bonus,
          earlyBonus: entry.early_bonus,
          totalBonus: entry.unloading_bonus + entry.attendance_bonus + entry.early_bonus,
          expectedTotal: entry.expected_total,
          paidAmount: entry.paid_amount,
          difference: entry.difference,
          status: entry.status
        };

        results.push(dailyResult);

        // Update totals
        totals.totalConsignments += entry.consignments;
        totals.expectedTotal += entry.expected_total;
        totals.paidTotal += entry.paid_amount;
        totals.totalDifference += entry.difference;
        totals.baseTotal += entry.base_payment;
        totals.bonusTotal += entry.unloading_bonus + entry.attendance_bonus + entry.early_bonus;
        totals.unloadingTotal += entry.unloading_bonus;
        totals.attendanceTotal += entry.attendance_bonus;
        totals.earlyTotal += entry.early_bonus;
        totals.pickupTotal += entry.pickup_total;
        totals.pickupCount += entry.pickups;
      });

      totals.workingDays = results.length;
      totals.averageDaily = totals.workingDays > 0 ? totals.expectedTotal / totals.workingDays : 0;
    }

    // Use analysis_totals if available for more accurate totals
    const analysisTotals = Array.isArray(analysis.analysis_totals)
      ? analysis.analysis_totals[0]
      : analysis.analysis_totals;

    if (analysisTotals && typeof analysisTotals === 'object') {
      totals.expectedTotal = analysisTotals.expected_total || totals.expectedTotal;
      totals.paidTotal = analysisTotals.paid_total || totals.paidTotal;
      totals.totalDifference = analysisTotals.difference_total || totals.totalDifference;
      totals.baseTotal = analysisTotals.base_total || totals.baseTotal;
      totals.pickupTotal = analysisTotals.pickup_total || totals.pickupTotal;
      totals.bonusTotal = analysisTotals.bonus_total || totals.bonusTotal;
    }

    const periodStart = new Date(analysis.period_start);
    const periodEnd = new Date(analysis.period_end);
    const periodRange = `${periodStart.toLocaleDateString('en-GB')} - ${periodEnd.toLocaleDateString('en-GB')}`;

    return {
      results: results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      totals,
      metadata: {
        inputMethod: analysis.source === 'manual' ? 'manual' : 'upload',
        createdAt: new Date().toISOString(),
        period: periodRange,
        entries: results.length,
        periodRange,
        totalDays: totals.workingDays,
        analysisDate: new Date().toLocaleDateString('en-GB'),
        overallStatus: totals.totalDifference >= 0 ? 'FAVORABLE' : 'UNFAVORABLE'
      }
    };
  }

  /**
   * Generate week-specific report data from database analysis
   */
  static generateWeekReportFromDatabaseAnalysis(
    analysis: AnalysisWithDetails,
    weekNumber: number,
    weekYear: number
  ): InlineReportData {
    // Calculate week boundaries
    const weekStartDate = this.getWeekStartDate(weekYear, weekNumber);
    const weekEndDate = this.getWeekEndDate(weekYear, weekNumber);

    // Filter results for this specific week
    const weekResults: DailyResult[] = [];
    const weekTotals = {
      workingDays: 0,
      totalConsignments: 0,
      expectedTotal: 0,
      paidTotal: 0,
      averageDaily: 0,
      totalDifference: 0,
      baseTotal: 0,
      bonusTotal: 0,
      unloadingTotal: 0,
      attendanceTotal: 0,
      earlyTotal: 0,
      pickupTotal: 0,
      pickupCount: 0
    };

    if (analysis.daily_entries) {
      analysis.daily_entries.forEach((entry) => {
        const entryDate = new Date(entry.date);

        if (entryDate >= weekStartDate && entryDate <= weekEndDate) {
          const dailyResult: DailyResult = {
            date: entry.date,
            day: new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long' }),
            consignments: entry.consignments,
            rate: entry.rate,
            basePayment: entry.base_payment,
            pickupTotal: entry.pickup_total,
            pickupCount: entry.pickups,
            unloadingBonus: entry.unloading_bonus,
            attendanceBonus: entry.attendance_bonus,
            earlyBonus: entry.early_bonus,
            totalBonus: entry.unloading_bonus + entry.attendance_bonus + entry.early_bonus,
            expectedTotal: entry.expected_total,
            paidAmount: entry.paid_amount,
            difference: entry.difference,
            status: entry.status
          };

          weekResults.push(dailyResult);

          // Update week totals
          weekTotals.totalConsignments += entry.consignments;
          weekTotals.expectedTotal += entry.expected_total;
          weekTotals.paidTotal += entry.paid_amount;
          weekTotals.totalDifference += entry.difference;
          weekTotals.baseTotal += entry.base_payment;
          weekTotals.bonusTotal += entry.unloading_bonus + entry.attendance_bonus + entry.early_bonus;
          weekTotals.unloadingTotal += entry.unloading_bonus;
          weekTotals.attendanceTotal += entry.attendance_bonus;
          weekTotals.earlyTotal += entry.early_bonus;
          weekTotals.pickupTotal += entry.pickup_total;
          weekTotals.pickupCount += entry.pickups;
        }
      });
    }

    weekTotals.workingDays = weekResults.length;
    weekTotals.averageDaily = weekTotals.workingDays > 0 ? weekTotals.expectedTotal / weekTotals.workingDays : 0;

    return {
      results: weekResults.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      totals: weekTotals,
      metadata: {
        inputMethod: analysis.source === 'manual' ? 'manual' : 'upload',
        createdAt: new Date().toISOString(),
        period: `Week ${weekNumber}, ${weekYear}`,
        entries: weekResults.length,
        periodRange: `${weekStartDate.toLocaleDateString('en-GB')} - ${weekEndDate.toLocaleDateString('en-GB')}`,
        totalDays: weekTotals.workingDays,
        analysisDate: new Date().toLocaleDateString('en-GB'),
        overallStatus: weekTotals.totalDifference >= 0 ? 'FAVORABLE' : 'UNFAVORABLE',
        weekInfo: {
          week: weekNumber,
          year: weekYear
        }
      }
    };
  }

  /**
   * Get the start date of a week (Monday)
   */
  private static getWeekStartDate(year: number, weekNumber: number): Date {
    const januaryFirst = new Date(year, 0, 1);
    const daysToFirstMonday = (8 - januaryFirst.getDay()) % 7;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);

    return new Date(firstMonday.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Get the end date of a week (Sunday)
   */
  private static getWeekEndDate(year: number, weekNumber: number): Date {
    const weekStart = this.getWeekStartDate(year, weekNumber);
    return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  }

  /**
   * Generate empty report structure for upload mode when no data is available
   */
  static generateEmptyReport(): InlineReportData {
    return {
      results: [],
      totals: {
        workingDays: 0,
        totalConsignments: 0,
        expectedTotal: 0,
        paidTotal: 0,
        averageDaily: 0,
        totalDifference: 0,
        baseTotal: 0,
        bonusTotal: 0,
        unloadingTotal: 0,
        attendanceTotal: 0,
        earlyTotal: 0,
        pickupTotal: 0,
        pickupCount: 0
      },
      metadata: {
        inputMethod: 'upload',
        createdAt: new Date().toISOString(),
        period: 'No data',
        entries: 0
      }
    };
  }
}