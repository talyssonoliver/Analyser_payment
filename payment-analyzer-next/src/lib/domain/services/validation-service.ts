/**
 * ValidationService Domain Service
 * Handles validation of business rules and data integrity
 */

import { Analysis } from '../entities/analysis';
import { DailyEntry } from '../entities/daily-entry';
import { PaymentRules } from '../entities/payment-rules';
import { Money } from '../value-objects/money';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: unknown;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  value?: unknown;
}

export class ValidationService {
  validateAnalysis(analysis: Analysis): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if analysis has daily entries
    if (analysis.dailyEntries.length === 0) {
      errors.push({
        code: 'NO_DAILY_ENTRIES',
        message: 'Analysis must contain at least one daily entry',
      });
    }

    // Check period coverage
    const missingDays = this.findMissingWorkingDays(analysis);
    if (missingDays.length > 0) {
      warnings.push({
        code: 'MISSING_WORKING_DAYS',
        message: `Missing entries for working days: ${missingDays.map(d => d.toDateString()).join(', ')}`,
        value: missingDays,
      });
    }

    // Check for duplicate entries
    const duplicates = this.findDuplicateEntries(analysis.dailyEntries);
    if (duplicates.length > 0) {
      errors.push({
        code: 'DUPLICATE_ENTRIES',
        message: `Duplicate entries found for dates: ${duplicates.map(d => d.toDateString()).join(', ')}`,
        value: duplicates,
      });
    }

    // Validate individual daily entries
    analysis.dailyEntries.forEach(entry => {
      const entryValidation = this.validateDailyEntry(entry);
      errors.push(...entryValidation.errors);
      warnings.push(...entryValidation.warnings);
    });

    // Check for significant payment discrepancies
    const largeDiscrepancies = this.findLargeDiscrepancies(analysis.dailyEntries);
    if (largeDiscrepancies.length > 0) {
      warnings.push({
        code: 'LARGE_DISCREPANCIES',
        message: `Large payment discrepancies found on ${largeDiscrepancies.length} days`,
        value: largeDiscrepancies,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateDailyEntry(entry: DailyEntry): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if it's a working day
    if (!entry.isWorkingDay && entry.consignments.count > 0) {
      warnings.push({
        code: 'SUNDAY_CONSIGNMENTS',
        message: 'Consignments recorded on Sunday (non-working day)',
        field: 'consignments',
        value: entry.consignments.count,
      });
    }

    // Check for zero consignments with payment
    if (entry.consignments.count === 0 && entry.paidAmount.isPositive()) {
      warnings.push({
        code: 'PAYMENT_WITHOUT_CONSIGNMENTS',
        message: 'Payment received with zero consignments',
        field: 'paidAmount',
        value: entry.paidAmount.amount,
      });
    }

    // Check for extremely high consignment counts
    if (entry.consignments.count > 200) {
      warnings.push({
        code: 'HIGH_CONSIGNMENT_COUNT',
        message: 'Unusually high consignment count',
        field: 'consignments',
        value: entry.consignments.count,
      });
    }

    // Check for extremely high payment amounts
    if (entry.paidAmount.amount > 1000) {
      warnings.push({
        code: 'HIGH_PAYMENT_AMOUNT',
        message: 'Unusually high payment amount',
        field: 'paidAmount',
        value: entry.paidAmount.amount,
      });
    }

    // Check for negative payment amounts
    if (entry.paidAmount.isNegative()) {
      errors.push({
        code: 'NEGATIVE_PAYMENT',
        message: 'Payment amount cannot be negative',
        field: 'paidAmount',
        value: entry.paidAmount.amount,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validatePaymentRules(rules: PaymentRules): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for negative rates
    if (rules.weekdayRate.isNegative()) {
      errors.push({
        code: 'NEGATIVE_WEEKDAY_RATE',
        message: 'Weekday rate cannot be negative',
        field: 'weekdayRate',
        value: rules.weekdayRate.amount,
      });
    }

    if (rules.saturdayRate.isNegative()) {
      errors.push({
        code: 'NEGATIVE_SATURDAY_RATE',
        message: 'Saturday rate cannot be negative',
        field: 'saturdayRate',
        value: rules.saturdayRate.amount,
      });
    }

    // Check for negative bonuses
    if (rules.unloadingBonus.isNegative()) {
      errors.push({
        code: 'NEGATIVE_UNLOADING_BONUS',
        message: 'Unloading bonus cannot be negative',
        field: 'unloadingBonus',
        value: rules.unloadingBonus.amount,
      });
    }

    if (rules.attendanceBonus.isNegative()) {
      errors.push({
        code: 'NEGATIVE_ATTENDANCE_BONUS',
        message: 'Attendance bonus cannot be negative',
        field: 'attendanceBonus',
        value: rules.attendanceBonus.amount,
      });
    }

    if (rules.earlyBonus.isNegative()) {
      errors.push({
        code: 'NEGATIVE_EARLY_BONUS',
        message: 'Early bonus cannot be negative',
        field: 'earlyBonus',
        value: rules.earlyBonus.amount,
      });
    }

    // Check for unusual rate differences
    const rateDifference = rules.saturdayRate.subtract(rules.weekdayRate);
    if (rateDifference.isNegative()) {
      warnings.push({
        code: 'SATURDAY_RATE_LOWER',
        message: 'Saturday rate is lower than weekday rate',
        value: { weekday: rules.weekdayRate.amount, saturday: rules.saturdayRate.amount },
      });
    }

    // Check for extremely high values
    if (rules.weekdayRate.amount > 10) {
      warnings.push({
        code: 'HIGH_WEEKDAY_RATE',
        message: 'Weekday rate seems unusually high',
        field: 'weekdayRate',
        value: rules.weekdayRate.amount,
      });
    }

    if (rules.saturdayRate.amount > 15) {
      warnings.push({
        code: 'HIGH_SATURDAY_RATE',
        message: 'Saturday rate seems unusually high',
        field: 'saturdayRate',
        value: rules.saturdayRate.amount,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private findMissingWorkingDays(analysis: Analysis): Date[] {
    const workingDays = analysis.period.getWorkingDays();
    const entryDates = new Set(
      analysis.dailyEntries.map(entry => entry.date.toDateString())
    );

    return workingDays.filter(
      day => !entryDates.has(day.toDateString())
    );
  }

  private findDuplicateEntries(entries: readonly DailyEntry[]): Date[] {
    const dateStrings = entries.map(entry => entry.date.toDateString());
    const duplicates = new Set<string>();
    const seen = new Set<string>();

    for (const dateString of dateStrings) {
      if (seen.has(dateString)) {
        duplicates.add(dateString);
      } else {
        seen.add(dateString);
      }
    }

    return Array.from(duplicates).map(dateString => new Date(dateString));
  }

  private findLargeDiscrepancies(entries: readonly DailyEntry[]): DailyEntry[] {
    const threshold = Money.from(50); // £50 threshold
    return entries.filter(entry => 
      entry.difference.amount > threshold.amount || 
      entry.difference.amount < -threshold.amount
    );
  }
}