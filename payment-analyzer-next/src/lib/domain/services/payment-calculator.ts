/**
 * PaymentCalculator Domain Service
 * Handles all payment calculations using business rules
 */

import { PaymentRules } from '../entities/payment-rules';
import { DailyEntry } from '../entities/daily-entry';
import { Money } from '../value-objects/money';
import { ConsignmentCount } from '../value-objects/consignment-count';

export class PaymentCalculator {
  private readonly rules: PaymentRules;

  constructor(rules: PaymentRules) {
    this.rules = rules;
  }

  calculateDailyPayment(data: {
    date: Date;
    consignments: number;
    pickups?: number;
    pickupTotal?: number;
    paidAmount: number;
    analysisId: string;
  }): DailyEntry {
    const dayOfWeek = data.date.getDay();
    const rate = this.rules.getRateForDay(dayOfWeek);
    const bonuses = this.rules.getApplicableBonuses(dayOfWeek);

    // Calculate base payment
    const basePayment = rate.multiply(data.consignments);

    return new DailyEntry({
      analysisId: data.analysisId,
      date: data.date,
      consignments: data.consignments,
      rate: rate.amount,
      basePayment: basePayment.amount,
      pickups: data.pickups || 0,
      pickupTotal: data.pickupTotal || 0,
      unloadingBonus: bonuses.unloading.amount,
      attendanceBonus: bonuses.attendance.amount,
      earlyBonus: bonuses.early.amount,
      paidAmount: data.paidAmount,
    });
  }

  calculateExpectedTotal(
    consignments: ConsignmentCount,
    date: Date,
    pickupTotal: Money = Money.zero()
  ): Money {
    const dayOfWeek = date.getDay();
    const rate = this.rules.getRateForDay(dayOfWeek);
    const bonuses = this.rules.getApplicableBonuses(dayOfWeek);

    const basePayment = rate.multiply(consignments.count);
    const totalBonuses = bonuses.unloading
      .add(bonuses.attendance)
      .add(bonuses.early);

    return basePayment
      .add(totalBonuses)
      .add(pickupTotal);
  }

  isValidPaymentDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    // Sunday is not a valid payment day
    return dayOfWeek !== 0;
  }

  getRateForDay(date: Date): Money {
    const dayOfWeek = date.getDay();
    return this.rules.getRateForDay(dayOfWeek);
  }

  getBonusesForDay(date: Date): {
    unloading: Money;
    attendance: Money;
    early: Money;
    total: Money;
  } {
    const dayOfWeek = date.getDay();
    const bonuses = this.rules.getApplicableBonuses(dayOfWeek);

    return {
      ...bonuses,
      total: bonuses.unloading.add(bonuses.attendance).add(bonuses.early),
    };
  }

  calculateWeeklyStats(entries: DailyEntry[]): {
    workingDays: number;
    totalConsignments: number;
    baseTotal: Money;
    bonusTotal: Money;
    pickupTotal: Money;
    expectedTotal: Money;
    paidTotal: Money;
    difference: Money;
    averageConsignmentsPerDay: number;
    averagePaymentPerDay: Money;
  } {
    const workingEntries = entries.filter(entry => entry.isWorkingDay);
    const workingDays = workingEntries.length;

    if (workingDays === 0) {
      return {
        workingDays: 0,
        totalConsignments: 0,
        baseTotal: Money.zero(),
        bonusTotal: Money.zero(),
        pickupTotal: Money.zero(),
        expectedTotal: Money.zero(),
        paidTotal: Money.zero(),
        difference: Money.zero(),
        averageConsignmentsPerDay: 0,
        averagePaymentPerDay: Money.zero(),
      };
    }

    const totalConsignments = workingEntries.reduce(
      (sum, entry) => sum + entry.consignments.count,
      0
    );

    const baseTotal = workingEntries.reduce(
      (sum, entry) => sum.add(entry.basePayment),
      Money.zero()
    );

    const bonusTotal = workingEntries.reduce(
      (sum, entry) => sum.add(entry.totalBonus),
      Money.zero()
    );

    const pickupTotal = workingEntries.reduce(
      (sum, entry) => sum.add(entry.pickupTotal),
      Money.zero()
    );

    const expectedTotal = workingEntries.reduce(
      (sum, entry) => sum.add(entry.expectedTotal),
      Money.zero()
    );

    const paidTotal = workingEntries.reduce(
      (sum, entry) => sum.add(entry.paidAmount),
      Money.zero()
    );

    const difference = paidTotal.subtract(expectedTotal);
    const averageConsignmentsPerDay = totalConsignments / workingDays;
    const averagePaymentPerDay = Money.from(paidTotal.amount / workingDays);

    return {
      workingDays,
      totalConsignments,
      baseTotal,
      bonusTotal,
      pickupTotal,
      expectedTotal,
      paidTotal,
      difference,
      averageConsignmentsPerDay,
      averagePaymentPerDay,
    };
  }
}