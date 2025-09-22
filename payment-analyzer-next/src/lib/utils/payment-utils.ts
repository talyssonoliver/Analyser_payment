/**
 * Payment Utilities
 * Shared utilities for payment calculations and data transformations
 * Follows DRY principle by centralizing business logic
 */

import { DEFAULT_PAYMENT_RULES } from '@/lib/constants';
import type { PaymentRules } from '@/lib/domain/entities';

/**
 * Calculate which bonuses apply for a given day of week
 * Centralizes the bonus logic used across components
 */
export function getApplicableBonuses(dayOfWeek: number, paymentRules?: PaymentRules) {
  // Use payment rules if available, otherwise default rules
  const bonuses = paymentRules?.getApplicableBonuses(dayOfWeek) || {
    unloading: dayOfWeek !== 0 && dayOfWeek !== 1 ? DEFAULT_PAYMENT_RULES.unloadingBonus : 0,
    attendance: dayOfWeek >= 1 && dayOfWeek <= 5 ? DEFAULT_PAYMENT_RULES.attendanceBonus : 0,
    early: dayOfWeek >= 1 && dayOfWeek <= 5 ? DEFAULT_PAYMENT_RULES.earlyBonus : 0,
  };

  return {
    hasUnloadingBonus: (typeof bonuses.unloading === 'object' ? bonuses.unloading.amount : bonuses.unloading) > 0,
    hasAttendanceBonus: (typeof bonuses.attendance === 'object' ? bonuses.attendance.amount : bonuses.attendance) > 0,
    hasEarlyBonus: (typeof bonuses.early === 'object' ? bonuses.early.amount : bonuses.early) > 0,
    amounts: {
      unloading: typeof bonuses.unloading === 'object' ? bonuses.unloading.amount : bonuses.unloading,
      attendance: typeof bonuses.attendance === 'object' ? bonuses.attendance.amount : bonuses.attendance,
      early: typeof bonuses.early === 'object' ? bonuses.early.amount : bonuses.early,
    }
  };
}

/**
 * Transform ManualEntryData to the format expected by the analysis service
 * This ensures type compatibility and applies business logic consistently
 */
export function transformManualEntryForService(entry: {
  date: Date | string;
  consignments: number;
  paidAmount: number;
}, paymentRules?: PaymentRules) {
  const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
  const dayOfWeek = entryDate.getDay();
  const bonuses = getApplicableBonuses(dayOfWeek, paymentRules);

  return {
    date: entry.date instanceof Date ? entry.date.toISOString() : entry.date,
    consignments: entry.consignments || 0,
    paid: entry.paidAmount || 0,
    hasUnloadingBonus: bonuses.hasUnloadingBonus,
    hasAttendanceBonus: bonuses.hasAttendanceBonus,
    hasEarlyBonus: bonuses.hasEarlyBonus,
    pickups: 0, // Not available in ManualEntryData, defaulting to 0
  };
}

/**
 * Calculate expected payment for a given date and consignments
 * Reusable across components that need payment calculations
 */
export function calculateExpectedPayment(
  date: Date,
  consignments: number,
  paymentRules?: PaymentRules
): {
  basePayment: number;
  bonuses: {
    unloading: number;
    attendance: number;
    early: number;
  };
  totalBonuses: number;
  expectedAmount: number;
} {
  const dayOfWeek = date.getDay();
  
  // Calculate base payment
  const rate = paymentRules?.getRateForDay(dayOfWeek) || 
    (dayOfWeek === 6 ? DEFAULT_PAYMENT_RULES.saturdayRate : DEFAULT_PAYMENT_RULES.weekdayRate);
  const basePayment = consignments * (typeof rate === 'object' ? rate.amount : rate);
  
  // Calculate bonuses
  const bonusInfo = getApplicableBonuses(dayOfWeek, paymentRules);
  const totalBonuses = bonusInfo.amounts.unloading + bonusInfo.amounts.attendance + bonusInfo.amounts.early;
  
  return {
    basePayment,
    bonuses: bonusInfo.amounts,
    totalBonuses,
    expectedAmount: basePayment + totalBonuses,
  };
}