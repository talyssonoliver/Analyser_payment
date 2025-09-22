'use client';

import { useMemo } from 'react';
import { DEFAULT_PAYMENT_RULES } from '@/lib/constants';
import { calculateExpectedPayment } from '@/lib/utils/payment-utils';

export function usePaymentTooltips(selectedDate?: Date, consignments?: number) {
  const tooltipContent = useMemo(() => {
    const date = selectedDate || new Date();
    const dayOfWeek = date.getDay();
    const consignmentCount = consignments || 0;
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const isMonday = dayOfWeek === 1;
    
    // Calculate base rate tooltip
    let rateText = 'Rest day - no work';
    if (!isSunday) {
      const rate = isSaturday ? DEFAULT_PAYMENT_RULES.saturdayRate : DEFAULT_PAYMENT_RULES.weekdayRate;
      rateText = `You earn £${rate.toFixed(2)} per delivery`;
      if (consignmentCount > 0) {
        const totalBase = consignmentCount * rate;
        rateText += ` (${consignmentCount} × £${rate.toFixed(2)} = £${totalBase.toFixed(2)})`;
      }
    }
    
    // Calculate bonus tooltips
    
    let earlyText = 'No bonus today';
    let attendanceText = 'No bonus today';
    let unloadingText = 'No bonus today';
    
    if (!isSunday) {
      // Unloading bonus tooltip
      if (isMonday) {
        unloadingText = 'No unloading bonus on Monday';
      } else {
        unloadingText = `£${DEFAULT_PAYMENT_RULES.unloadingBonus.toFixed(2)} bonus today`;
      }
      
      // Weekday bonuses (not Saturday or Sunday)
      if (!isSaturday) {
        earlyText = `£${DEFAULT_PAYMENT_RULES.earlyBonus.toFixed(2)} bonus today`;
        attendanceText = `£${DEFAULT_PAYMENT_RULES.attendanceBonus.toFixed(2)} bonus today`;
      } else {
        earlyText = 'No early bonus on Saturday';
        attendanceText = 'No attendance bonus on Saturday';
      }
    }
    
    // Calculate total expected tooltip
    let totalText = 'No earnings expected today';
    if (!isSunday && consignmentCount > 0) {
      const calculation = calculateExpectedPayment(date, consignmentCount);
      totalText = `Expected total: £${calculation.expectedAmount.toFixed(2)}`;
      if (calculation.totalBonuses > 0) {
        totalText += ` (Base: £${calculation.basePayment.toFixed(2)} + Bonuses: £${calculation.totalBonuses.toFixed(2)})`;
      }
    }
    
    return {
      dayName,
      isSunday,
      isSaturday, 
      isMonday,
      baseAmount: rateText,
      earlyArrive: earlyText,
      attendance: attendanceText,
      unloading: unloadingText,
      expectedTotal: totalText,
    };
  }, [selectedDate, consignments]);
  
  return tooltipContent;
}