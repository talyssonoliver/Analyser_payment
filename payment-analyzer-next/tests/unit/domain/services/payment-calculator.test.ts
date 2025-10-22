/**
 * PaymentCalculator Domain Service Tests
 *
 * CRITICAL: This is the core business logic for ALL payment calculations.
 * Any bugs here cause incorrect financial payments.
 *
 * Test Coverage Requirements:
 * - Weekday rate calculations (£2.00 per consignment)
 * - Saturday rate calculations (£3.00 per consignment)
 * - Sunday handling (non-working day)
 * - Unloading bonus (£30.00/day, all days except Monday and Sunday)
 * - Attendance bonus (£25.00/day, weekdays only Monday-Friday)
 * - Early bonus (£50.00/day, weekdays only Monday-Friday)
 * - Bonus applicability rules by day of week
 * - Multiple consignments calculations
 * - Edge cases and error handling
 * - Money value precision
 * - Performance tests
 */

import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PAYMENT_RULES } from "@/lib/constants";
import { DailyEntry } from "@/lib/domain/entities/daily-entry";
import { PaymentRules } from "@/lib/domain/entities/payment-rules";
import { PaymentCalculator } from "@/lib/domain/services/payment-calculator";
import { ConsignmentCount } from "@/lib/domain/value-objects/consignment-count";
import { Money } from "@/lib/domain/value-objects/money";
import { createTestDate, getDayName } from "../../../helpers/date-helpers";
import { expectMoneyEqual, roundMoney } from "../../../helpers/money-helpers";

describe("PaymentCalculator", () => {
  let calculator: PaymentCalculator;
  let paymentRules: PaymentRules;

  beforeEach(() => {
    // Create default payment rules for testing
    paymentRules = new PaymentRules({
      userId: "test-user-id",
      weekdayRate: DEFAULT_PAYMENT_RULES.weekdayRate,
      saturdayRate: DEFAULT_PAYMENT_RULES.saturdayRate,
      unloadingBonus: DEFAULT_PAYMENT_RULES.unloadingBonus,
      attendanceBonus: DEFAULT_PAYMENT_RULES.attendanceBonus,
      earlyBonus: DEFAULT_PAYMENT_RULES.earlyBonus,
    });
    calculator = new PaymentCalculator(paymentRules);
  });

  describe("Constructor", () => {
    it("should create a calculator with payment rules", () => {
      expect(calculator).toBeDefined();
      expect(calculator).toBeInstanceOf(PaymentCalculator);
    });

    it("should use the provided payment rules", () => {
      const customRules = new PaymentRules({
        userId: "test-user",
        weekdayRate: 2.5,
        saturdayRate: 3.5,
        unloadingBonus: 35.0,
        attendanceBonus: 30.0,
        earlyBonus: 55.0,
      });
      const customCalculator = new PaymentCalculator(customRules);

      const monday = createTestDate(2024, 1, 1); // Monday
      const rate = customCalculator.getRateForDay(monday);
      expectMoneyEqual(rate.amount, 2.5);
    });
  });

  describe("Rate Calculations", () => {
    describe("Weekday Rates (Monday-Friday)", () => {
      it("should calculate £2.00 rate for Monday", () => {
        const monday = createTestDate(2024, 1, 1); // Monday
        const rate = calculator.getRateForDay(monday);
        expectMoneyEqual(rate.amount, 2.0);
      });

      it("should calculate £2.00 rate for Tuesday", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const rate = calculator.getRateForDay(tuesday);
        expectMoneyEqual(rate.amount, 2.0);
      });

      it("should calculate £2.00 rate for Wednesday", () => {
        const wednesday = createTestDate(2024, 1, 3); // Wednesday
        const rate = calculator.getRateForDay(wednesday);
        expectMoneyEqual(rate.amount, 2.0);
      });

      it("should calculate £2.00 rate for Thursday", () => {
        const thursday = createTestDate(2024, 1, 4); // Thursday
        const rate = calculator.getRateForDay(thursday);
        expectMoneyEqual(rate.amount, 2.0);
      });

      it("should calculate £2.00 rate for Friday", () => {
        const friday = createTestDate(2024, 1, 5); // Friday
        const rate = calculator.getRateForDay(friday);
        expectMoneyEqual(rate.amount, 2.0);
      });
    });

    describe("Saturday Rate", () => {
      it("should calculate £3.00 rate for Saturday", () => {
        const saturday = createTestDate(2024, 1, 6); // Saturday
        const rate = calculator.getRateForDay(saturday);
        expectMoneyEqual(rate.amount, 3.0);
      });
    });

    describe("Sunday Rate", () => {
      it("should calculate £2.00 rate for Sunday (non-working day)", () => {
        const sunday = createTestDate(2024, 1, 7); // Sunday
        const rate = calculator.getRateForDay(sunday);
        expectMoneyEqual(rate.amount, 2.0);
      });

      it("should mark Sunday as invalid payment day", () => {
        const sunday = createTestDate(2024, 1, 7); // Sunday
        expect(calculator.isValidPaymentDay(sunday)).toBe(false);
      });
    });
  });

  describe("Bonus Calculations by Day of Week", () => {
    describe("Monday Bonuses", () => {
      it("should NOT apply unloading bonus on Monday", () => {
        const monday = createTestDate(2024, 1, 1); // Monday
        const bonuses = calculator.getBonusesForDay(monday);
        expectMoneyEqual(bonuses.unloading.amount, 0);
      });

      it("should apply attendance bonus on Monday (£25.00)", () => {
        const monday = createTestDate(2024, 1, 1); // Monday
        const bonuses = calculator.getBonusesForDay(monday);
        expectMoneyEqual(bonuses.attendance.amount, 25.0);
      });

      it("should apply early bonus on Monday (£50.00)", () => {
        const monday = createTestDate(2024, 1, 1); // Monday
        const bonuses = calculator.getBonusesForDay(monday);
        expectMoneyEqual(bonuses.early.amount, 50.0);
      });

      it("should calculate total bonus for Monday (£75.00)", () => {
        const monday = createTestDate(2024, 1, 1); // Monday
        const bonuses = calculator.getBonusesForDay(monday);
        expectMoneyEqual(bonuses.total.amount, 75.0);
      });
    });

    describe("Tuesday-Friday Bonuses (All weekday bonuses apply)", () => {
      it("should apply all bonuses on Tuesday (£105.00 total)", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const bonuses = calculator.getBonusesForDay(tuesday);
        expectMoneyEqual(bonuses.unloading.amount, 30.0);
        expectMoneyEqual(bonuses.attendance.amount, 25.0);
        expectMoneyEqual(bonuses.early.amount, 50.0);
        expectMoneyEqual(bonuses.total.amount, 105.0);
      });

      it("should apply all bonuses on Wednesday (£105.00 total)", () => {
        const wednesday = createTestDate(2024, 1, 3); // Wednesday
        const bonuses = calculator.getBonusesForDay(wednesday);
        expectMoneyEqual(bonuses.unloading.amount, 30.0);
        expectMoneyEqual(bonuses.attendance.amount, 25.0);
        expectMoneyEqual(bonuses.early.amount, 50.0);
        expectMoneyEqual(bonuses.total.amount, 105.0);
      });

      it("should apply all bonuses on Thursday (£105.00 total)", () => {
        const thursday = createTestDate(2024, 1, 4); // Thursday
        const bonuses = calculator.getBonusesForDay(thursday);
        expectMoneyEqual(bonuses.unloading.amount, 30.0);
        expectMoneyEqual(bonuses.attendance.amount, 25.0);
        expectMoneyEqual(bonuses.early.amount, 50.0);
        expectMoneyEqual(bonuses.total.amount, 105.0);
      });

      it("should apply all bonuses on Friday (£105.00 total)", () => {
        const friday = createTestDate(2024, 1, 5); // Friday
        const bonuses = calculator.getBonusesForDay(friday);
        expectMoneyEqual(bonuses.unloading.amount, 30.0);
        expectMoneyEqual(bonuses.attendance.amount, 25.0);
        expectMoneyEqual(bonuses.early.amount, 50.0);
        expectMoneyEqual(bonuses.total.amount, 105.0);
      });
    });

    describe("Saturday Bonuses", () => {
      it("should apply unloading bonus on Saturday (£30.00)", () => {
        const saturday = createTestDate(2024, 1, 6); // Saturday
        const bonuses = calculator.getBonusesForDay(saturday);
        expectMoneyEqual(bonuses.unloading.amount, 30.0);
      });

      it("should NOT apply attendance bonus on Saturday", () => {
        const saturday = createTestDate(2024, 1, 6); // Saturday
        const bonuses = calculator.getBonusesForDay(saturday);
        expectMoneyEqual(bonuses.attendance.amount, 0);
      });

      it("should NOT apply early bonus on Saturday", () => {
        const saturday = createTestDate(2024, 1, 6); // Saturday
        const bonuses = calculator.getBonusesForDay(saturday);
        expectMoneyEqual(bonuses.early.amount, 0);
      });

      it("should calculate total bonus for Saturday (£30.00)", () => {
        const saturday = createTestDate(2024, 1, 6); // Saturday
        const bonuses = calculator.getBonusesForDay(saturday);
        expectMoneyEqual(bonuses.total.amount, 30.0);
      });
    });

    describe("Sunday Bonuses", () => {
      it("should NOT apply any bonuses on Sunday", () => {
        const sunday = createTestDate(2024, 1, 7); // Sunday
        const bonuses = calculator.getBonusesForDay(sunday);
        expectMoneyEqual(bonuses.unloading.amount, 0);
        expectMoneyEqual(bonuses.attendance.amount, 0);
        expectMoneyEqual(bonuses.early.amount, 0);
        expectMoneyEqual(bonuses.total.amount, 0);
      });
    });
  });

  describe("Daily Payment Calculations", () => {
    describe("Consignment Payment Calculations", () => {
      it("should calculate payment for 1 consignment on weekday", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const entry = calculator.calculateDailyPayment({
          date: tuesday,
          consignments: 1,
          paidAmount: 0,
          analysisId: "test-analysis",
        });

        expectMoneyEqual(entry.basePayment.amount, 2.0); // 1 × £2.00
      });

      it("should calculate payment for 10 consignments on weekday", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const entry = calculator.calculateDailyPayment({
          date: tuesday,
          consignments: 10,
          paidAmount: 0,
          analysisId: "test-analysis",
        });

        expectMoneyEqual(entry.basePayment.amount, 20.0); // 10 × £2.00
      });

      it("should calculate payment for 50 consignments on weekday", () => {
        const wednesday = createTestDate(2024, 1, 3); // Wednesday
        const entry = calculator.calculateDailyPayment({
          date: wednesday,
          consignments: 50,
          paidAmount: 0,
          analysisId: "test-analysis",
        });

        expectMoneyEqual(entry.basePayment.amount, 100.0); // 50 × £2.00
      });

      it("should calculate payment for 100 consignments on weekday", () => {
        const thursday = createTestDate(2024, 1, 4); // Thursday
        const entry = calculator.calculateDailyPayment({
          date: thursday,
          consignments: 100,
          paidAmount: 0,
          analysisId: "test-analysis",
        });

        expectMoneyEqual(entry.basePayment.amount, 200.0); // 100 × £2.00
      });

      it("should calculate payment for 500 consignments on weekday", () => {
        const friday = createTestDate(2024, 1, 5); // Friday
        const entry = calculator.calculateDailyPayment({
          date: friday,
          consignments: 500,
          paidAmount: 0,
          analysisId: "test-analysis",
        });

        expectMoneyEqual(entry.basePayment.amount, 1000.0); // 500 × £2.00
      });

      it("should calculate payment for 1 consignment on Saturday", () => {
        const saturday = createTestDate(2024, 1, 6); // Saturday
        const entry = calculator.calculateDailyPayment({
          date: saturday,
          consignments: 1,
          paidAmount: 0,
          analysisId: "test-analysis",
        });

        expectMoneyEqual(entry.basePayment.amount, 3.0); // 1 × £3.00
      });

      it("should calculate payment for 50 consignments on Saturday", () => {
        const saturday = createTestDate(2024, 1, 6); // Saturday
        const entry = calculator.calculateDailyPayment({
          date: saturday,
          consignments: 50,
          paidAmount: 0,
          analysisId: "test-analysis",
        });

        expectMoneyEqual(entry.basePayment.amount, 150.0); // 50 × £3.00
      });

      it("should handle zero consignments", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const entry = calculator.calculateDailyPayment({
          date: tuesday,
          consignments: 0,
          paidAmount: 0,
          analysisId: "test-analysis",
        });

        expectMoneyEqual(entry.basePayment.amount, 0);
      });
    });

    describe("Complete Daily Entry Creation", () => {
      it("should create complete daily entry with all fields", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const entry = calculator.calculateDailyPayment({
          date: tuesday,
          consignments: 50,
          pickups: 5,
          pickupTotal: 15.0,
          paidAmount: 135.0,
          analysisId: "test-analysis",
        });

        expect(entry).toBeInstanceOf(DailyEntry);
        expect(entry.analysisId).toBe("test-analysis");
        expectMoneyEqual(entry.consignments.count, 50);
        expectMoneyEqual(entry.rate.amount, 2.0);
        expectMoneyEqual(entry.basePayment.amount, 100.0);
        expectMoneyEqual(entry.pickups.count, 5);
        expectMoneyEqual(entry.pickupTotal.amount, 15.0);
        expectMoneyEqual(entry.unloadingBonus.amount, 30.0);
        expectMoneyEqual(entry.attendanceBonus.amount, 25.0);
        expectMoneyEqual(entry.earlyBonus.amount, 50.0);
      });

      it("should set optional fields to zero when not provided", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const entry = calculator.calculateDailyPayment({
          date: tuesday,
          consignments: 50,
          paidAmount: 100.0,
          analysisId: "test-analysis",
        });

        expectMoneyEqual(entry.pickups.count, 0);
        expectMoneyEqual(entry.pickupTotal.amount, 0);
      });
    });
  });

  describe("Expected Total Calculations", () => {
    describe("Weekday Expected Totals", () => {
      it("should calculate expected total for Tuesday (50 consignments)", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const consignments = ConsignmentCount.from(50);
        const expectedTotal = calculator.calculateExpectedTotal(consignments, tuesday);

        // Base: 50 × £2.00 = £100.00
        // Unloading: £30.00
        // Attendance: £25.00
        // Early: £50.00
        // Total: £205.00
        expectMoneyEqual(expectedTotal.amount, 205.0);
      });

      it("should calculate expected total for Monday (50 consignments)", () => {
        const monday = createTestDate(2024, 1, 1); // Monday
        const consignments = ConsignmentCount.from(50);
        const expectedTotal = calculator.calculateExpectedTotal(consignments, monday);

        // Base: 50 × £2.00 = £100.00
        // Unloading: £0.00 (Monday excluded)
        // Attendance: £25.00
        // Early: £50.00
        // Total: £175.00
        expectMoneyEqual(expectedTotal.amount, 175.0);
      });

      it("should calculate expected total with pickup total", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const consignments = ConsignmentCount.from(50);
        const pickupTotal = Money.from(15.0);
        const expectedTotal = calculator.calculateExpectedTotal(consignments, tuesday, pickupTotal);

        // Base: 50 × £2.00 = £100.00
        // Bonuses: £105.00
        // Pickups: £15.00
        // Total: £220.00
        expectMoneyEqual(expectedTotal.amount, 220.0);
      });
    });

    describe("Saturday Expected Totals", () => {
      it("should calculate expected total for Saturday (50 consignments)", () => {
        const saturday = createTestDate(2024, 1, 6); // Saturday
        const consignments = ConsignmentCount.from(50);
        const expectedTotal = calculator.calculateExpectedTotal(consignments, saturday);

        // Base: 50 × £3.00 = £150.00
        // Unloading: £30.00
        // Attendance: £0.00 (weekend)
        // Early: £0.00 (weekend)
        // Total: £180.00
        expectMoneyEqual(expectedTotal.amount, 180.0);
      });
    });

    describe("Sunday Expected Totals", () => {
      it("should calculate expected total for Sunday (0 consignments, no bonuses)", () => {
        const sunday = createTestDate(2024, 1, 7); // Sunday
        const consignments = ConsignmentCount.from(0);
        const expectedTotal = calculator.calculateExpectedTotal(consignments, sunday);

        expectMoneyEqual(expectedTotal.amount, 0);
      });
    });

    describe("Various Consignment Counts", () => {
      it("should calculate expected total for 10 consignments on Tuesday", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const consignments = ConsignmentCount.from(10);
        const expectedTotal = calculator.calculateExpectedTotal(consignments, tuesday);

        // Base: 10 × £2.00 = £20.00
        // Bonuses: £105.00
        // Total: £125.00
        expectMoneyEqual(expectedTotal.amount, 125.0);
      });

      it("should calculate expected total for 100 consignments on Wednesday", () => {
        const wednesday = createTestDate(2024, 1, 3); // Wednesday
        const consignments = ConsignmentCount.from(100);
        const expectedTotal = calculator.calculateExpectedTotal(consignments, wednesday);

        // Base: 100 × £2.00 = £200.00
        // Bonuses: £105.00
        // Total: £305.00
        expectMoneyEqual(expectedTotal.amount, 305.0);
      });

      it("should calculate expected total for 500 consignments on Thursday", () => {
        const thursday = createTestDate(2024, 1, 4); // Thursday
        const consignments = ConsignmentCount.from(500);
        const expectedTotal = calculator.calculateExpectedTotal(consignments, thursday);

        // Base: 500 × £2.00 = £1000.00
        // Bonuses: £105.00
        // Total: £1105.00
        expectMoneyEqual(expectedTotal.amount, 1105.0);
      });
    });
  });

  describe("Valid Payment Day", () => {
    it("should return true for Monday", () => {
      const monday = createTestDate(2024, 1, 1);
      expect(calculator.isValidPaymentDay(monday)).toBe(true);
    });

    it("should return true for Tuesday", () => {
      const tuesday = createTestDate(2024, 1, 2);
      expect(calculator.isValidPaymentDay(tuesday)).toBe(true);
    });

    it("should return true for Wednesday", () => {
      const wednesday = createTestDate(2024, 1, 3);
      expect(calculator.isValidPaymentDay(wednesday)).toBe(true);
    });

    it("should return true for Thursday", () => {
      const thursday = createTestDate(2024, 1, 4);
      expect(calculator.isValidPaymentDay(thursday)).toBe(true);
    });

    it("should return true for Friday", () => {
      const friday = createTestDate(2024, 1, 5);
      expect(calculator.isValidPaymentDay(friday)).toBe(true);
    });

    it("should return true for Saturday", () => {
      const saturday = createTestDate(2024, 1, 6);
      expect(calculator.isValidPaymentDay(saturday)).toBe(true);
    });

    it("should return false for Sunday", () => {
      const sunday = createTestDate(2024, 1, 7);
      expect(calculator.isValidPaymentDay(sunday)).toBe(false);
    });
  });

  describe("Weekly Statistics Calculations", () => {
    describe("Empty Week", () => {
      it("should return zero statistics for empty week", () => {
        const stats = calculator.calculateWeeklyStats([]);

        expect(stats.workingDays).toBe(0);
        expect(stats.totalConsignments).toBe(0);
        expectMoneyEqual(stats.baseTotal.amount, 0);
        expectMoneyEqual(stats.bonusTotal.amount, 0);
        expectMoneyEqual(stats.pickupTotal.amount, 0);
        expectMoneyEqual(stats.expectedTotal.amount, 0);
        expectMoneyEqual(stats.paidTotal.amount, 0);
        expectMoneyEqual(stats.difference.amount, 0);
        expect(stats.averageConsignmentsPerDay).toBe(0);
        expectMoneyEqual(stats.averagePaymentPerDay.amount, 0);
      });
    });

    describe("Single Day Week", () => {
      it("should calculate statistics for single Tuesday entry", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const entry = calculator.calculateDailyPayment({
          date: tuesday,
          consignments: 50,
          paidAmount: 205.0,
          analysisId: "test-analysis",
        });

        const stats = calculator.calculateWeeklyStats([entry]);

        expect(stats.workingDays).toBe(1);
        expect(stats.totalConsignments).toBe(50);
        expectMoneyEqual(stats.baseTotal.amount, 100.0);
        expectMoneyEqual(stats.bonusTotal.amount, 105.0);
        expectMoneyEqual(stats.expectedTotal.amount, 205.0);
        expectMoneyEqual(stats.paidTotal.amount, 205.0);
        expectMoneyEqual(stats.difference.amount, 0);
        expect(stats.averageConsignmentsPerDay).toBe(50);
        expectMoneyEqual(stats.averagePaymentPerDay.amount, 205.0);
      });
    });

    describe("Full Week Statistics", () => {
      it("should calculate statistics for full working week (Mon-Sat)", () => {
        const entries: DailyEntry[] = [];

        // Monday: 50 consignments
        entries.push(
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 1),
            consignments: 50,
            paidAmount: 175.0,
            analysisId: "test-analysis",
          })
        );

        // Tuesday: 60 consignments
        entries.push(
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 2),
            consignments: 60,
            paidAmount: 225.0,
            analysisId: "test-analysis",
          })
        );

        // Wednesday: 55 consignments
        entries.push(
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 3),
            consignments: 55,
            paidAmount: 215.0,
            analysisId: "test-analysis",
          })
        );

        // Thursday: 50 consignments
        entries.push(
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 4),
            consignments: 50,
            paidAmount: 205.0,
            analysisId: "test-analysis",
          })
        );

        // Friday: 65 consignments
        entries.push(
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 5),
            consignments: 65,
            paidAmount: 235.0,
            analysisId: "test-analysis",
          })
        );

        // Saturday: 40 consignments
        entries.push(
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 6),
            consignments: 40,
            paidAmount: 150.0,
            analysisId: "test-analysis",
          })
        );

        const stats = calculator.calculateWeeklyStats(entries);

        expect(stats.workingDays).toBe(6);
        expect(stats.totalConsignments).toBe(320); // 50+60+55+50+65+40

        // Base totals: Mon-Fri: 280×2=560, Sat: 40×3=120 = 680
        expectMoneyEqual(stats.baseTotal.amount, 680.0);

        // Bonus totals: Mon: 75, Tue-Fri: 105×4=420, Sat: 30 = 525
        expectMoneyEqual(stats.bonusTotal.amount, 525.0);

        // Expected total: 680 + 525 = 1205
        expectMoneyEqual(stats.expectedTotal.amount, 1205.0);

        // Paid total
        expectMoneyEqual(stats.paidTotal.amount, 1205.0);

        // Difference
        expectMoneyEqual(stats.difference.amount, 0);

        // Average consignments per day
        expectMoneyEqual(stats.averageConsignmentsPerDay, 53.33, 0.01);

        // Average payment per day
        expectMoneyEqual(stats.averagePaymentPerDay.amount, 200.83, 0.01);
      });
    });

    describe("Week with Overpayment", () => {
      it("should calculate positive difference for overpaid week", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const entry = calculator.calculateDailyPayment({
          date: tuesday,
          consignments: 50,
          paidAmount: 250.0, // Overpaid by £45
          analysisId: "test-analysis",
        });

        const stats = calculator.calculateWeeklyStats([entry]);

        expectMoneyEqual(stats.expectedTotal.amount, 205.0);
        expectMoneyEqual(stats.paidTotal.amount, 250.0);
        expectMoneyEqual(stats.difference.amount, 45.0);
      });
    });

    describe("Week with Underpayment", () => {
      it("should calculate negative difference for underpaid week", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const entry = calculator.calculateDailyPayment({
          date: tuesday,
          consignments: 50,
          paidAmount: 180.0, // Underpaid by £25
          analysisId: "test-analysis",
        });

        const stats = calculator.calculateWeeklyStats([entry]);

        expectMoneyEqual(stats.expectedTotal.amount, 205.0);
        expectMoneyEqual(stats.paidTotal.amount, 180.0);
        expectMoneyEqual(stats.difference.amount, -25.0);
      });
    });

    describe("Week with Pickup Totals", () => {
      it("should include pickup totals in statistics", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const entry = calculator.calculateDailyPayment({
          date: tuesday,
          consignments: 50,
          pickups: 5,
          pickupTotal: 15.0,
          paidAmount: 220.0,
          analysisId: "test-analysis",
        });

        const stats = calculator.calculateWeeklyStats([entry]);

        expectMoneyEqual(stats.pickupTotal.amount, 15.0);
        expectMoneyEqual(stats.expectedTotal.amount, 220.0); // 100 + 105 + 15
      });
    });

    describe("Week Excluding Sunday", () => {
      it("should exclude Sunday from working days count", () => {
        const entries: DailyEntry[] = [];

        // Saturday
        entries.push(
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 6),
            consignments: 50,
            paidAmount: 180.0,
            analysisId: "test-analysis",
          })
        );

        // Sunday - should be excluded
        entries.push(
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 7),
            consignments: 0,
            paidAmount: 0,
            analysisId: "test-analysis",
          })
        );

        // Monday
        entries.push(
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 8),
            consignments: 50,
            paidAmount: 175.0,
            analysisId: "test-analysis",
          })
        );

        const stats = calculator.calculateWeeklyStats(entries);

        // Should only count Saturday and Monday (not Sunday)
        expect(stats.workingDays).toBe(2);
        expect(stats.totalConsignments).toBe(100);
      });
    });
  });

  describe("Edge Cases and Precision", () => {
    describe("Decimal Precision", () => {
      it("should handle decimal consignment calculations correctly", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const consignments = ConsignmentCount.from(33);
        const expectedTotal = calculator.calculateExpectedTotal(consignments, tuesday);

        // Base: 33 × £2.00 = £66.00
        // Bonuses: £105.00
        // Total: £171.00
        expectMoneyEqual(expectedTotal.amount, 171.0);
      });

      it("should round money values to 2 decimal places", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const entry = calculator.calculateDailyPayment({
          date: tuesday,
          consignments: 1,
          paidAmount: 107.0,
          analysisId: "test-analysis",
        });

        // All money values should be rounded to 2 decimal places
        expect(roundMoney(entry.basePayment.amount)).toBe(entry.basePayment.amount);
        expect(roundMoney(entry.unloadingBonus.amount)).toBe(entry.unloadingBonus.amount);
        expect(roundMoney(entry.attendanceBonus.amount)).toBe(entry.attendanceBonus.amount);
        expect(roundMoney(entry.earlyBonus.amount)).toBe(entry.earlyBonus.amount);
      });
    });

    describe("Large Numbers", () => {
      it("should handle 1000 consignments correctly", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const consignments = ConsignmentCount.from(1000);
        const expectedTotal = calculator.calculateExpectedTotal(consignments, tuesday);

        // Base: 1000 × £2.00 = £2000.00
        // Bonuses: £105.00
        // Total: £2105.00
        expectMoneyEqual(expectedTotal.amount, 2105.0);
      });

      it("should handle large pickup totals", () => {
        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const consignments = ConsignmentCount.from(100);
        const pickupTotal = Money.from(500.0);
        const expectedTotal = calculator.calculateExpectedTotal(consignments, tuesday, pickupTotal);

        // Base: 100 × £2.00 = £200.00
        // Bonuses: £105.00
        // Pickups: £500.00
        // Total: £805.00
        expectMoneyEqual(expectedTotal.amount, 805.0);
      });
    });

    describe("Special Dates", () => {
      it("should handle leap year date (Feb 29, 2024)", () => {
        const leapDay = createTestDate(2024, 2, 29); // Thursday in 2024
        const dayName = getDayName(leapDay);
        expect(dayName).toBe("Thursday");

        const rate = calculator.getRateForDay(leapDay);
        expectMoneyEqual(rate.amount, 2.0);
      });

      it("should handle year boundary (Dec 31 -> Jan 1)", () => {
        const dec31 = createTestDate(2024, 12, 31); // Tuesday
        const jan1 = createTestDate(2025, 1, 1); // Wednesday

        expect(getDayName(dec31)).toBe("Tuesday");
        expect(getDayName(jan1)).toBe("Wednesday");

        const rate1 = calculator.getRateForDay(dec31);
        const rate2 = calculator.getRateForDay(jan1);
        expectMoneyEqual(rate1.amount, 2.0);
        expectMoneyEqual(rate2.amount, 2.0);
      });
    });
  });

  describe("Performance Tests", () => {
    it("should calculate 1000 daily entries quickly", () => {
      const startTime = performance.now();
      const entries: DailyEntry[] = [];

      for (let i = 0; i < 1000; i++) {
        const dayOffset = i % 7;
        const date = createTestDate(2024, 1, 1 + dayOffset);
        const entry = calculator.calculateDailyPayment({
          date,
          consignments: 50,
          paidAmount: 200.0,
          analysisId: "test-analysis",
        });
        entries.push(entry);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(entries.length).toBe(1000);
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it("should calculate weekly statistics for 1000 entries quickly", () => {
      const entries: DailyEntry[] = [];

      for (let i = 0; i < 1000; i++) {
        const dayOffset = (i % 6) + 1; // Skip Sunday
        const date = createTestDate(2024, 1, dayOffset);
        const entry = calculator.calculateDailyPayment({
          date,
          consignments: 50,
          paidAmount: 200.0,
          analysisId: "test-analysis",
        });
        entries.push(entry);
      }

      const startTime = performance.now();
      const stats = calculator.calculateWeeklyStats(entries);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(stats.workingDays).toBe(1000);
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });
  });

  describe("Integration Tests", () => {
    describe("Complete Week Analysis", () => {
      it("should calculate complete week with mixed payment statuses", () => {
        const entries: DailyEntry[] = [
          // Monday: Balanced
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 1),
            consignments: 50,
            paidAmount: 175.0,
            analysisId: "test-analysis",
          }),
          // Tuesday: Overpaid
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 2),
            consignments: 50,
            paidAmount: 250.0,
            analysisId: "test-analysis",
          }),
          // Wednesday: Underpaid
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 3),
            consignments: 50,
            paidAmount: 180.0,
            analysisId: "test-analysis",
          }),
          // Thursday: Balanced with pickups
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 4),
            consignments: 50,
            pickups: 5,
            pickupTotal: 15.0,
            paidAmount: 220.0,
            analysisId: "test-analysis",
          }),
          // Friday: Balanced
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 5),
            consignments: 50,
            paidAmount: 205.0,
            analysisId: "test-analysis",
          }),
          // Saturday: Balanced
          calculator.calculateDailyPayment({
            date: createTestDate(2024, 1, 6),
            consignments: 40,
            paidAmount: 150.0,
            analysisId: "test-analysis",
          }),
        ];

        const stats = calculator.calculateWeeklyStats(entries);

        expect(stats.workingDays).toBe(6);
        expect(stats.totalConsignments).toBe(290);

        // Verify each entry
        expect(entries[0].status).toBe("balanced");
        expect(entries[1].status).toBe("overpaid");
        expect(entries[2].status).toBe("underpaid");
        expect(entries[3].status).toBe("balanced");
        expect(entries[4].status).toBe("balanced");
        expect(entries[5].status).toBe("balanced");

        // Total difference should be +45 (overpaid) - 25 (underpaid) = +20
        expectMoneyEqual(stats.difference.amount, 20.0);
      });
    });

    describe("Custom Payment Rules", () => {
      it("should work with custom payment rules", () => {
        const customRules = new PaymentRules({
          userId: "test-user",
          weekdayRate: 2.5,
          saturdayRate: 4.0,
          unloadingBonus: 35.0,
          attendanceBonus: 30.0,
          earlyBonus: 60.0,
        });
        const customCalculator = new PaymentCalculator(customRules);

        const tuesday = createTestDate(2024, 1, 2); // Tuesday
        const entry = customCalculator.calculateDailyPayment({
          date: tuesday,
          consignments: 40,
          paidAmount: 0,
          analysisId: "test-analysis",
        });

        // Base: 40 × £2.50 = £100.00
        expectMoneyEqual(entry.basePayment.amount, 100.0);
        // Unloading: £35.00
        expectMoneyEqual(entry.unloadingBonus.amount, 35.0);
        // Attendance: £30.00
        expectMoneyEqual(entry.attendanceBonus.amount, 30.0);
        // Early: £60.00
        expectMoneyEqual(entry.earlyBonus.amount, 60.0);

        // Expected total: £100.00 + £35.00 + £30.00 + £60.00 = £225.00
        expectMoneyEqual(entry.expectedTotal.amount, 225.0);
      });
    });
  });
});
