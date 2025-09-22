/**
 * Payment Calculation Service
 * Matches the original HTML business logic exactly
 */

export interface PaymentRules {
  weekdayRate: number;
  saturdayRate: number;
  unloadingBonus: number;
  attendanceBonus: number;
  earlyBonus: number;
}

export interface DayCalculation {
  date: string;
  day: string;
  consignments: number;
  rate: number;
  basePayment: number;
  unloadingBonus: number;
  attendanceBonus: number;
  earlyBonus: number;
  totalBonus: number;
  pickupCount: number;
  pickupTotal: number;
  expectedTotal: number;
  paidAmount: number;
  difference: number;
}

export interface WeekCalculation {
  weekStart: Date;
  days: DayCalculation[];
  totalExpected: number;
  totalActual: number;
  workingDays: number;
  totalConsignments: number;
  totalDifference: number;
}

export interface PaymentTotals {
  workingDays: number;
  totalConsignments: number;
  expectedTotal: number;
  paidTotal: number;
  differenceTotal: number;
  baseTotal: number;
  bonusTotal: number;
  unloadingTotal: number;
  attendanceTotal: number;
  earlyTotal: number;
  pickupTotal: number;
  pickupCount: number;
}

export interface DailyData {
  [date: string]: {
    consignments: number;
    basePayment: number;
    expectedTotal: number;
    paidAmount: number;
    unloadingBonus: number;
    attendanceBonus: number;
    earlyBonus: number;
    pickups: number;
    pickupTotal: number;
    rate: number;
    status: string;
  };
}

// Default payment rules matching the original HTML
export const DEFAULT_PAYMENT_RULES: PaymentRules = {
  weekdayRate: 2.00,
  saturdayRate: 3.00,
  unloadingBonus: 30.00,
  attendanceBonus: 25.00,
  earlyBonus: 50.00,
} as const;

export class PaymentCalculationService {
  private rules: PaymentRules;

  constructor(rules: PaymentRules = DEFAULT_PAYMENT_RULES) {
    this.rules = rules;
  }

  /**
   * Calculate payments for a single day
   * Matches the original HTML logic exactly
   */
  calculateDayPayment(
    date: string,
    consignments: number,
    paidAmount: number = 0,
    pickupCount: number = 0,
    pickupTotal: number = 0
  ): DayCalculation {
    const dateObj = new Date(date + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const isSaturday = dayOfWeek === 6;
    const isMonday = dayOfWeek === 1;
    const isSunday = dayOfWeek === 0;
    
    const rate = isSaturday ? this.rules.saturdayRate : this.rules.weekdayRate;
    
    let basePayment = 0;
    let unloadingBonus = 0;
    let attendanceBonus = 0;
    let earlyBonus = 0;

    // Only calculate if we have consignments or pickups
    if (consignments > 0 || pickupTotal > 0) {
      if (consignments > 0) {
        basePayment = consignments * rate;
        
        // Unloading bonus: paid daily except Mondays and Sundays
        unloadingBonus = (isMonday || isSunday) ? 0 : this.rules.unloadingBonus;
        
        // Attendance and Early bonus: weekdays only (Monday-Friday)
        if (!isSaturday && !isSunday) {
          attendanceBonus = this.rules.attendanceBonus;
          earlyBonus = this.rules.earlyBonus;
        }
      }
    }

    const totalBonus = unloadingBonus + attendanceBonus + earlyBonus;
    const expectedTotal = basePayment + totalBonus + pickupTotal;
    const difference = paidAmount - expectedTotal;

    return {
      date,
      day: dayNames[dayOfWeek],
      consignments,
      rate,
      basePayment,
      unloadingBonus,
      attendanceBonus,
      earlyBonus,
      totalBonus,
      pickupCount,
      pickupTotal,
      expectedTotal,
      paidAmount,
      difference
    };
  }

  /**
   * Calculate totals from an array of daily calculations
   */
  calculateTotals(days: DayCalculation[]): PaymentTotals {
    return days.reduce((totals, day) => ({
      workingDays: totals.workingDays + (day.consignments > 0 || day.pickupTotal > 0 ? 1 : 0),
      totalConsignments: totals.totalConsignments + day.consignments,
      expectedTotal: totals.expectedTotal + day.expectedTotal,
      paidTotal: totals.paidTotal + day.paidAmount,
      differenceTotal: totals.differenceTotal + day.difference,
      baseTotal: totals.baseTotal + day.basePayment,
      bonusTotal: totals.bonusTotal + day.totalBonus,
      unloadingTotal: totals.unloadingTotal + day.unloadingBonus,
      attendanceTotal: totals.attendanceTotal + day.attendanceBonus,
      earlyTotal: totals.earlyTotal + day.earlyBonus,
      pickupTotal: totals.pickupTotal + day.pickupTotal,
      pickupCount: totals.pickupCount + day.pickupCount,
    }), {
      workingDays: 0,
      totalConsignments: 0,
      expectedTotal: 0,
      paidTotal: 0,
      differenceTotal: 0,
      baseTotal: 0,
      bonusTotal: 0,
      unloadingTotal: 0,
      attendanceTotal: 0,
      earlyTotal: 0,
      pickupTotal: 0,
      pickupCount: 0,
    });
  }

  /**
   * Group daily calculations by week
   * Matches the original HTML week grouping logic
   */
  groupByWeeks(days: DayCalculation[]): WeekCalculation[] {
    const weekGroups: { [key: string]: DayCalculation[] } = {};

    days.forEach(day => {
      // Validate the date string first
      if (!day.date) {
        console.warn('⚠️ Day calculation missing date:', day);
        return;
      }
      
      // Ensure we have a valid date string
      const dateStr = day.date;
      if (typeof dateStr !== 'string') {
        console.warn('⚠️ Invalid date format:', dateStr);
        return;
      }
      
      // Try to parse the date with validation
      const date = new Date(dateStr + 'T12:00:00');
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Invalid date value:', dateStr);
        return;
      }
      
      const weekStart = new Date(date);
      
      // Get Monday of the week (ISO week)
      const dayOfWeek = date.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so subtract 6 to get previous Monday
      weekStart.setDate(date.getDate() - daysToSubtract);
      
      // Validate the week start date
      if (isNaN(weekStart.getTime())) {
        console.warn('⚠️ Invalid week start calculation for:', dateStr);
        return;
      }
      
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekGroups[weekKey]) {
        weekGroups[weekKey] = [];
      }
      weekGroups[weekKey].push(day);
    });

    return Object.keys(weekGroups)
      .sort()
      .map(weekKey => {
        const weekDays = weekGroups[weekKey].sort((a, b) => a.date.localeCompare(b.date));
        const weekStart = new Date(weekKey + 'T12:00:00');
        
        const totalExpected = weekDays.reduce((sum, day) => sum + day.expectedTotal, 0);
        const totalActual = weekDays.reduce((sum, day) => sum + day.paidAmount, 0);
        const workingDays = weekDays.filter(day => day.consignments > 0 || day.pickupTotal > 0).length;
        const totalConsignments = weekDays.reduce((sum, day) => sum + day.consignments, 0);
        const totalDifference = totalActual - totalExpected;

        return {
          weekStart,
          days: weekDays,
          totalExpected,
          totalActual,
          workingDays,
          totalConsignments,
          totalDifference
        };
      });
  }

  /**
   * Process daily data from different sources (PDFs, manual entry)
   * and convert to standardized format
   */
  processDailyData(dailyData: DailyData): DayCalculation[] {
    const results: DayCalculation[] = [];

    Object.keys(dailyData).sort().forEach(dateKey => {
      const data = dailyData[dateKey];
      
      // Validate date format
      const date = new Date(dateKey);
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Skipping invalid date:', dateKey);
        return;
      }
      
      // Ensure we use a consistent date format (YYYY-MM-DD)
      const normalizedDateKey = date.toISOString().split('T')[0];
      
      const calculation = this.calculateDayPayment(
        normalizedDateKey,
        data.consignments || 0,
        data.paidAmount || 0,
        data.pickups || 0,
        data.pickupTotal || 0
      );

      results.push(calculation);
    });

    return results;
  }

  /**
   * Generate analysis summary matching the original HTML format
   */
  generateAnalysisSummary(days: DayCalculation[]) {
    const totals = this.calculateTotals(days);
    const weeks = this.groupByWeeks(days);
    
    const averageDaily = totals.workingDays > 0 ? totals.expectedTotal / totals.workingDays : 0;
    const overallStatus = totals.differenceTotal >= 0 ? 'Payment Complete - Favorable' : 'Payment Incomplete - Review Required';

    return {
      totals,
      weeks,
      averageDaily,
      overallStatus,
      metadata: {
        processedDays: days.length,
        workingDays: totals.workingDays,
        weekCount: weeks.length,
        rulesVersion: '9.0.0',
        calculatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Validate calculation results against expected business rules
   */
  validateCalculations(days: DayCalculation[]): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    days.forEach(day => {
      // Check for Sunday work (should not happen)
      if (day.day === 'Sunday' && (day.consignments > 0 || day.paidAmount > 0)) {
        warnings.push(`Work recorded on Sunday ${day.date} - unusual`);
      }

      // Check for Monday unloading bonus (should be 0)
      if (day.day === 'Monday' && day.unloadingBonus > 0) {
        errors.push(`Monday ${day.date} has unloading bonus - should be £0.00`);
      }

      // Check for Saturday bonuses (attendance/early should be 0)
      if (day.day === 'Saturday' && (day.attendanceBonus > 0 || day.earlyBonus > 0)) {
        errors.push(`Saturday ${day.date} has attendance/early bonus - should be £0.00`);
      }

      // Check for negative consignments
      if (day.consignments < 0) {
        errors.push(`Negative consignments on ${day.date}: ${day.consignments}`);
      }

      // Check for large differences (might indicate data issues)
      if (Math.abs(day.difference) > 100) {
        warnings.push(`Large payment difference on ${day.date}: £${day.difference.toFixed(2)}`);
      }
    });

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}