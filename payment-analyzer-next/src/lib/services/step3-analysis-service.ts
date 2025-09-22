/**
 * Step 3 Analysis Service
 * Equivalent to displayAnalysisResults and related functions from original HTML
 */

import { PaymentCalculationService, PaymentTotals, WeekCalculation, DayCalculation } from './payment-calculation-service';
import { v4 as uuidv4 } from 'uuid';
import { ManualEntry } from '@/types/core';

interface DailyDataEntry {
  consignments: number;
  basePayment: number;
  expectedTotal: number;
  paidAmount: number;
  unloadingBonus: number;
  attendanceBonus: number;
  earlyBonus: number;
  pickupCount: number;
  pickupTotal: number;
  pickups: number;
  rate: number;
  status: string;
}

export interface Step3AnalysisData {
  id: string;
  totals: PaymentTotals;
  weeks: WeekCalculation[];
  days: DayCalculation[];
  metadata: {
    analysisId: string;
    createdAt: Date;
    analysisDate: string;
    inputMethod: 'upload' | 'manual';
    totalFiles?: number;
    totalEntries: number;
    overallStatus: string;
    periodRange: string;
  };
}

export interface AnalysisInput {
  results?: DayCalculation[];
  totals?: PaymentTotals;
  weeks?: WeekCalculation[];
  files?: File[];
  manualEntries?: ManualEntry[];
  inputMethod: 'upload' | 'manual';
}

export class Step3AnalysisService {
  private static calculationService = new PaymentCalculationService();

  /**
   * Main analysis processing function
   * Equivalent to the analyze() function in original HTML
   */
  static async processAnalysis(input: AnalysisInput): Promise<Step3AnalysisData | null> {
    try {
      const { inputMethod, files, manualEntries } = input;

      let dayCalculations: DayCalculation[] = [];

      // Process based on input method
      if (inputMethod === 'manual' && manualEntries?.length) {
        dayCalculations = this.processManualEntries(manualEntries);
      } else if (inputMethod === 'upload' && files?.length) {
        // For file upload, we would normally process PDF files here
        // For now, return null - this should be handled by PDF processing
        console.log('📄 File processing would happen here');
        return null;
      } else if (input.results) {
        // Use pre-calculated results
        dayCalculations = input.results;
      } else {
        console.warn('No valid data for analysis');
        return null;
      }

      // Calculate totals and weeks
      const totals = this.calculationService.calculateTotals(dayCalculations);
      const weeks = this.calculationService.groupByWeeks(dayCalculations);

      // Generate metadata
      const metadata = this.generateMetadata(dayCalculations, totals);

      const analysisData: Step3AnalysisData = {
        id: metadata.analysisId,
        totals,
        weeks,
        days: dayCalculations,
        metadata
      };

      console.log('📊 Step 3 analysis complete:', analysisData);
      return analysisData;

    } catch (error) {
      console.error('❌ Step 3 analysis failed:', error);
      return null;
    }
  }

  /**
   * Process manual entries into day calculations
   */
  private static processManualEntries(manualEntries: ManualEntry[]): DayCalculation[] {
    const dailyData: Record<string, DailyDataEntry> = {};

    // Convert manual entries to daily data format
    manualEntries.forEach((entry) => {
      if (entry.date) {
        dailyData[entry.date] = {
          consignments: entry.consignments || 0,
          basePayment: 0, // Will be calculated
          expectedTotal: 0, // Will be calculated
          paidAmount: entry.totalPay || 0,
          unloadingBonus: 0, // Will be calculated
          attendanceBonus: 0, // Will be calculated
          earlyBonus: 0, // Will be calculated
          pickups: entry.pickups || 0,
          pickupCount: entry.pickups || 0,
          pickupTotal: 0, // Will be calculated
          rate: 0, // Will be calculated
          status: 'manual'
        };
      }
    });

    return this.calculationService.processDailyData(dailyData);
  }

  /**
   * Generate analysis metadata
   */
  private static generateMetadata(
    days: DayCalculation[],
    totals: PaymentTotals
  ): Step3AnalysisData['metadata'] {
    const sortedDays = days.filter(d => d.consignments > 0 || d.paidAmount > 0)
                          .sort((a, b) => a.date.localeCompare(b.date));
    
    const firstDay = sortedDays[0]?.date;
    const lastDay = sortedDays[sortedDays.length - 1]?.date;
    
    let periodRange = 'No data';
    if (firstDay && lastDay) {
      const startDate = new Date(firstDay).toLocaleDateString('en-GB');
      const endDate = new Date(lastDay).toLocaleDateString('en-GB');
      periodRange = firstDay === lastDay ? startDate : `${startDate} - ${endDate}`;
    }

    const overallStatus = totals.differenceTotal >= 0 ? 
      'Payment Complete - Favorable' : 
      'Payment Incomplete - Review Required';

    return {
      analysisId: uuidv4(),
      createdAt: new Date(),
      analysisDate: new Date().toISOString().split('T')[0],
      inputMethod: 'upload' as const,
      totalEntries: days.length,
      overallStatus,
      periodRange
    };
  }

  /**
   * Generate quick summary data for Step 3 cards
   * Equivalent to generateStep3SummaryCards data preparation
   */
  static generateQuickSummary(analysisData: Step3AnalysisData) {
    const { totals } = analysisData;
    
    return {
      totalActual: totals.paidTotal,
      totalExpected: totals.expectedTotal,
      difference: totals.differenceTotal,
      workingDays: totals.workingDays,
      dailyAverage: totals.workingDays > 0 ? totals.expectedTotal / totals.workingDays : 0,
      isDifferencePositive: totals.differenceTotal >= 0
    };
  }

  /**
   * Validate analysis data
   * Equivalent to validation logic in original
   */
  static validateAnalysisData(analysisData: Step3AnalysisData | null): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!analysisData) {
      errors.push('No analysis data available');
      return { isValid: false, errors, warnings };
    }

    const { days, totals, weeks } = analysisData;

    // Basic validation
    if (!days.length) {
      errors.push('No daily data found');
    }

    if (!weeks.length) {
      errors.push('No weekly data found');
    }

    if (totals.workingDays === 0) {
      warnings.push('No working days detected');
    }

    if (totals.totalConsignments === 0) {
      warnings.push('No consignments recorded');
    }

    // Business rule validation
    days.forEach((day: DayCalculation) => {
      if (day.day === 'Sunday' && (day.consignments > 0 || day.paidAmount > 0)) {
        warnings.push(`Work recorded on Sunday ${day.date} - unusual`);
      }

      if (day.day === 'Monday' && day.unloadingBonus > 0) {
        errors.push(`Monday ${day.date} has unloading bonus - should be £0.00`);
      }

      if (day.day === 'Saturday' && (day.attendanceBonus > 0 || day.earlyBonus > 0)) {
        errors.push(`Saturday ${day.date} has attendance/early bonus - should be £0.00`);
      }

      if (Math.abs(day.difference) > 100) {
        warnings.push(`Large payment difference on ${day.date}: £${day.difference.toFixed(2)}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Format analysis data for reports
   * Equivalent to generateAnalysisDataForReports in original
   */
  static formatForReports(analysisData: Step3AnalysisData) {
    const { totals, weeks, days, metadata } = analysisData;

    return {
      results: days,
      totals,
      weeks,
      metadata: {
        ...metadata,
        rulesVersion: '9.0.0',
        calculatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Prepare data for dashboard/history saving
   */
  static prepareForStorage(analysisData: Step3AnalysisData, inputMethod: 'upload' | 'manual') {
    const { totals, weeks, days, metadata } = analysisData;

    return {
      analysisData: {
        totals,
        weeks,
        days,
        metadata
      },
      summary: {
        workingDays: totals.workingDays,
        totalConsignments: totals.totalConsignments,
        expectedTotal: totals.expectedTotal,
        paidTotal: totals.paidTotal,
        difference: totals.differenceTotal,
        status: metadata.overallStatus,
        periodRange: metadata.periodRange
      },
      inputMethod,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Check if analysis should show detailed report vs individual week reports
   */
  static shouldShowDetailedReport(analysisData: Step3AnalysisData): boolean {
    return analysisData.weeks.length === 1;
  }

  /**
   * Get analysis status for UI display
   */
  static getAnalysisStatus(analysisData: Step3AnalysisData | null) {
    if (!analysisData) {
      return {
        status: 'empty',
        message: 'No analysis data available',
        color: 'gray'
      };
    }

    const { totals } = analysisData;
    const difference = totals.differenceTotal;

    if (difference > 0) {
      return {
        status: 'favorable',
        message: 'Payment Complete - Favorable',
        color: 'green'
      };
    } else if (difference === 0) {
      return {
        status: 'exact',
        message: 'Payment Complete - Exact Match',
        color: 'blue'
      };
    } else {
      return {
        status: 'unfavorable', 
        message: 'Payment Incomplete - Review Required',
        color: 'red'
      };
    }
  }
}