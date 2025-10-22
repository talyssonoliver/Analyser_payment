/**
 * Payment Calculation Service Test Suite
 * Comprehensive tests for all payment calculation logic
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type DailyData,
  type DayCalculation,
  DEFAULT_PAYMENT_RULES,
  PaymentCalculationService,
  type PaymentRules,
} from "@/lib/services/payment-calculation-service";
import { expectMoneyEqual } from "@/tests/helpers/money-helpers";

describe("PaymentCalculationService", () => {
  let service: PaymentCalculationService;

  beforeEach(() => {
    service = new PaymentCalculationService();
  });

  describe("Constructor & Rules", () => {
    it("should use default rules when no constructor argument provided", () => {
      const service = new PaymentCalculationService();
      const result = service.calculateDayPayment("2024-01-02", 50); // Tuesday
      expectMoneyEqual(result.basePayment, 100.0); // 50 × £2.00
      expectMoneyEqual(result.rate, 2.0);
    });

    it("should use custom rules when provided to constructor", () => {
      const customRules: PaymentRules = {
        weekdayRate: 3.0,
        saturdayRate: 4.5,
        unloadingBonus: 40.0,
        attendanceBonus: 30.0,
        earlyBonus: 60.0,
      };
      const customService = new PaymentCalculationService(customRules);
      const result = customService.calculateDayPayment("2024-01-02", 50); // Tuesday

      expectMoneyEqual(result.rate, 3.0);
      expectMoneyEqual(result.basePayment, 150.0); // 50 × £3.00
      expectMoneyEqual(result.unloadingBonus, 40.0);
      expectMoneyEqual(result.attendanceBonus, 30.0);
      expectMoneyEqual(result.earlyBonus, 60.0);
    });

    it("should verify default rules match expected business rules", () => {
      expect(DEFAULT_PAYMENT_RULES.weekdayRate).toBe(2.0);
      expect(DEFAULT_PAYMENT_RULES.saturdayRate).toBe(3.0);
      expect(DEFAULT_PAYMENT_RULES.unloadingBonus).toBe(30.0);
      expect(DEFAULT_PAYMENT_RULES.attendanceBonus).toBe(25.0);
      expect(DEFAULT_PAYMENT_RULES.earlyBonus).toBe(50.0);
    });
  });

  describe("calculateDayPayment", () => {
    describe("Day of Week Handling", () => {
      it("should calculate payment for Monday correctly", () => {
        const result = service.calculateDayPayment("2024-01-01", 50); // Monday

        expect(result.date).toBe("2024-01-01");
        expect(result.day).toBe("Monday");
        expect(result.consignments).toBe(50);
        expectMoneyEqual(result.rate, 2.0);
        expectMoneyEqual(result.basePayment, 100.0); // 50 × £2.00
        expectMoneyEqual(result.unloadingBonus, 0.0); // No unloading on Monday
        expectMoneyEqual(result.attendanceBonus, 25.0); // Yes weekday
        expectMoneyEqual(result.earlyBonus, 50.0); // Yes weekday
        expectMoneyEqual(result.totalBonus, 75.0); // 0 + 25 + 50
        expectMoneyEqual(result.expectedTotal, 175.0); // 100 + 75
      });

      it("should calculate payment for Tuesday correctly", () => {
        const result = service.calculateDayPayment("2024-01-02", 50); // Tuesday

        expect(result.day).toBe("Tuesday");
        expectMoneyEqual(result.rate, 2.0);
        expectMoneyEqual(result.basePayment, 100.0);
        expectMoneyEqual(result.unloadingBonus, 30.0); // Yes unloading
        expectMoneyEqual(result.attendanceBonus, 25.0); // Yes weekday
        expectMoneyEqual(result.earlyBonus, 50.0); // Yes weekday
        expectMoneyEqual(result.totalBonus, 105.0); // 30 + 25 + 50
        expectMoneyEqual(result.expectedTotal, 205.0); // 100 + 105
      });

      it("should calculate payment for Wednesday correctly", () => {
        const result = service.calculateDayPayment("2024-01-03", 50); // Wednesday

        expect(result.day).toBe("Wednesday");
        expectMoneyEqual(result.rate, 2.0);
        expectMoneyEqual(result.unloadingBonus, 30.0);
        expectMoneyEqual(result.attendanceBonus, 25.0);
        expectMoneyEqual(result.earlyBonus, 50.0);
        expectMoneyEqual(result.totalBonus, 105.0);
      });

      it("should calculate payment for Thursday correctly", () => {
        const result = service.calculateDayPayment("2024-01-04", 50); // Thursday

        expect(result.day).toBe("Thursday");
        expectMoneyEqual(result.rate, 2.0);
        expectMoneyEqual(result.unloadingBonus, 30.0);
        expectMoneyEqual(result.attendanceBonus, 25.0);
        expectMoneyEqual(result.earlyBonus, 50.0);
        expectMoneyEqual(result.totalBonus, 105.0);
      });

      it("should calculate payment for Friday correctly", () => {
        const result = service.calculateDayPayment("2024-01-05", 50); // Friday

        expect(result.day).toBe("Friday");
        expectMoneyEqual(result.rate, 2.0);
        expectMoneyEqual(result.unloadingBonus, 30.0);
        expectMoneyEqual(result.attendanceBonus, 25.0);
        expectMoneyEqual(result.earlyBonus, 50.0);
        expectMoneyEqual(result.totalBonus, 105.0);
      });

      it("should calculate payment for Saturday correctly", () => {
        const result = service.calculateDayPayment("2024-01-06", 50); // Saturday

        expect(result.day).toBe("Saturday");
        expectMoneyEqual(result.rate, 3.0); // Saturday rate
        expectMoneyEqual(result.basePayment, 150.0); // 50 × £3.00
        expectMoneyEqual(result.unloadingBonus, 30.0); // Yes unloading
        expectMoneyEqual(result.attendanceBonus, 0.0); // No attendance on Saturday
        expectMoneyEqual(result.earlyBonus, 0.0); // No early on Saturday
        expectMoneyEqual(result.totalBonus, 30.0); // Only unloading
        expectMoneyEqual(result.expectedTotal, 180.0); // 150 + 30
      });

      it("should calculate payment for Sunday correctly", () => {
        const result = service.calculateDayPayment("2024-01-07", 50); // Sunday

        expect(result.day).toBe("Sunday");
        expectMoneyEqual(result.rate, 2.0); // Weekday rate (not Saturday)
        expectMoneyEqual(result.basePayment, 100.0); // 50 × £2.00
        expectMoneyEqual(result.unloadingBonus, 0.0); // No unloading on Sunday
        expectMoneyEqual(result.attendanceBonus, 0.0); // No attendance on Sunday
        expectMoneyEqual(result.earlyBonus, 0.0); // No early on Sunday
        expectMoneyEqual(result.totalBonus, 0.0); // No bonuses
        expectMoneyEqual(result.expectedTotal, 100.0); // Base only
      });
    });

    describe("Consignment Count Handling", () => {
      it("should calculate correctly with 0 consignments (no bonuses)", () => {
        const result = service.calculateDayPayment("2024-01-02", 0); // Tuesday

        expect(result.consignments).toBe(0);
        expectMoneyEqual(result.basePayment, 0.0);
        expectMoneyEqual(result.unloadingBonus, 0.0); // No bonuses when no work
        expectMoneyEqual(result.attendanceBonus, 0.0);
        expectMoneyEqual(result.earlyBonus, 0.0);
        expectMoneyEqual(result.totalBonus, 0.0);
        expectMoneyEqual(result.expectedTotal, 0.0);
      });

      it("should calculate correctly with 1 consignment", () => {
        const result = service.calculateDayPayment("2024-01-02", 1); // Tuesday

        expect(result.consignments).toBe(1);
        expectMoneyEqual(result.basePayment, 2.0); // 1 × £2.00
        expectMoneyEqual(result.unloadingBonus, 30.0); // Bonuses awarded
        expectMoneyEqual(result.attendanceBonus, 25.0);
        expectMoneyEqual(result.earlyBonus, 50.0);
        expectMoneyEqual(result.totalBonus, 105.0);
      });

      it("should calculate correctly with 50 consignments", () => {
        const result = service.calculateDayPayment("2024-01-02", 50); // Tuesday

        expect(result.consignments).toBe(50);
        expectMoneyEqual(result.basePayment, 100.0);
        expectMoneyEqual(result.expectedTotal, 205.0);
      });

      it("should calculate correctly with 100 consignments", () => {
        const result = service.calculateDayPayment("2024-01-02", 100); // Tuesday

        expect(result.consignments).toBe(100);
        expectMoneyEqual(result.basePayment, 200.0); // 100 × £2.00
        expectMoneyEqual(result.expectedTotal, 305.0); // 200 + 105
      });

      it("should award bonuses only when consignments > 0", () => {
        const withWork = service.calculateDayPayment("2024-01-02", 1);
        const withoutWork = service.calculateDayPayment("2024-01-02", 0);

        expectMoneyEqual(withWork.totalBonus, 105.0);
        expectMoneyEqual(withoutWork.totalBonus, 0.0);
      });
    });

    describe("Pickup Handling", () => {
      it("should include pickups in expected total", () => {
        const result = service.calculateDayPayment("2024-01-02", 50, 0, 2, 15.0);

        expect(result.pickupCount).toBe(2);
        expectMoneyEqual(result.pickupTotal, 15.0);
        expectMoneyEqual(result.expectedTotal, 220.0); // 100 + 105 + 15
      });

      it("should calculate correctly with pickups but no consignments", () => {
        const result = service.calculateDayPayment("2024-01-02", 0, 0, 2, 15.0);

        expect(result.pickupCount).toBe(2);
        expectMoneyEqual(result.pickupTotal, 15.0);
        expectMoneyEqual(result.basePayment, 0.0);
        expectMoneyEqual(result.totalBonus, 0.0); // No bonuses without consignments
        expectMoneyEqual(result.expectedTotal, 15.0); // Pickup only
      });

      it("should default pickup values to 0 when not provided", () => {
        const result = service.calculateDayPayment("2024-01-02", 50);

        expect(result.pickupCount).toBe(0);
        expectMoneyEqual(result.pickupTotal, 0.0);
      });

      it("should handle multiple pickups with varying totals", () => {
        const result = service.calculateDayPayment("2024-01-02", 50, 0, 5, 37.5);

        expect(result.pickupCount).toBe(5);
        expectMoneyEqual(result.pickupTotal, 37.5);
        expectMoneyEqual(result.expectedTotal, 242.5); // 100 + 105 + 37.5
      });
    });

    describe("Paid Amount and Difference Calculation", () => {
      it("should calculate difference when paid amount equals expected", () => {
        const result = service.calculateDayPayment("2024-01-02", 50, 205.0);

        expectMoneyEqual(result.paidAmount, 205.0);
        expectMoneyEqual(result.expectedTotal, 205.0);
        expectMoneyEqual(result.difference, 0.0);
      });

      it("should calculate positive difference when overpaid", () => {
        const result = service.calculateDayPayment("2024-01-02", 50, 250.0);

        expectMoneyEqual(result.paidAmount, 250.0);
        expectMoneyEqual(result.expectedTotal, 205.0);
        expectMoneyEqual(result.difference, 45.0); // 250 - 205
      });

      it("should calculate negative difference when underpaid", () => {
        const result = service.calculateDayPayment("2024-01-02", 50, 150.0);

        expectMoneyEqual(result.paidAmount, 150.0);
        expectMoneyEqual(result.expectedTotal, 205.0);
        expectMoneyEqual(result.difference, -55.0); // 150 - 205
      });

      it("should default paid amount to 0 when not provided", () => {
        const result = service.calculateDayPayment("2024-01-02", 50);

        expectMoneyEqual(result.paidAmount, 0.0);
        expectMoneyEqual(result.difference, -205.0); // 0 - 205
      });
    });

    describe("Date Parsing", () => {
      it("should parse YYYY-MM-DD format correctly", () => {
        const result = service.calculateDayPayment("2024-01-15", 50);

        expect(result.date).toBe("2024-01-15");
        expect(result.day).toBe("Monday");
      });

      it("should handle different months correctly", () => {
        const jan = service.calculateDayPayment("2024-01-02", 50);
        const feb = service.calculateDayPayment("2024-02-02", 50);
        const dec = service.calculateDayPayment("2024-12-02", 50);

        expect(jan.day).toBe("Tuesday");
        expect(feb.day).toBe("Friday");
        expect(dec.day).toBe("Monday");
      });

      it("should handle leap year dates correctly", () => {
        const result = service.calculateDayPayment("2024-02-29", 50);

        expect(result.date).toBe("2024-02-29");
        expect(result.day).toBe("Thursday");
      });
    });

    describe("Bonus Eligibility Edge Cases", () => {
      it("should not award unloading bonus on Monday even with consignments", () => {
        const result = service.calculateDayPayment("2024-01-01", 100);

        expectMoneyEqual(result.unloadingBonus, 0.0);
        expectMoneyEqual(result.attendanceBonus, 25.0);
        expectMoneyEqual(result.earlyBonus, 50.0);
      });

      it("should not award attendance/early bonus on Saturday", () => {
        const result = service.calculateDayPayment("2024-01-06", 100);

        expectMoneyEqual(result.unloadingBonus, 30.0);
        expectMoneyEqual(result.attendanceBonus, 0.0);
        expectMoneyEqual(result.earlyBonus, 0.0);
      });

      it("should not award any bonuses on Sunday", () => {
        const result = service.calculateDayPayment("2024-01-07", 100);

        expectMoneyEqual(result.unloadingBonus, 0.0);
        expectMoneyEqual(result.attendanceBonus, 0.0);
        expectMoneyEqual(result.earlyBonus, 0.0);
        expectMoneyEqual(result.totalBonus, 0.0);
      });
    });
  });

  describe("calculateTotals", () => {
    it("should return all zeros for empty array", () => {
      const totals = service.calculateTotals([]);

      expect(totals.workingDays).toBe(0);
      expect(totals.totalConsignments).toBe(0);
      expectMoneyEqual(totals.expectedTotal, 0.0);
      expectMoneyEqual(totals.paidTotal, 0.0);
      expectMoneyEqual(totals.differenceTotal, 0.0);
      expectMoneyEqual(totals.baseTotal, 0.0);
      expectMoneyEqual(totals.bonusTotal, 0.0);
      expectMoneyEqual(totals.unloadingTotal, 0.0);
      expectMoneyEqual(totals.attendanceTotal, 0.0);
      expectMoneyEqual(totals.earlyTotal, 0.0);
      expectMoneyEqual(totals.pickupTotal, 0.0);
      expect(totals.pickupCount).toBe(0);
    });

    it("should calculate totals for single day correctly", () => {
      const day = service.calculateDayPayment("2024-01-02", 50, 205.0, 2, 15.0);
      const totals = service.calculateTotals([day]);

      expect(totals.workingDays).toBe(1);
      expect(totals.totalConsignments).toBe(50);
      expectMoneyEqual(totals.expectedTotal, 220.0);
      expectMoneyEqual(totals.paidTotal, 205.0);
      expectMoneyEqual(totals.differenceTotal, -15.0);
      expectMoneyEqual(totals.baseTotal, 100.0);
      expectMoneyEqual(totals.bonusTotal, 105.0);
      expectMoneyEqual(totals.unloadingTotal, 30.0);
      expectMoneyEqual(totals.attendanceTotal, 25.0);
      expectMoneyEqual(totals.earlyTotal, 50.0);
      expectMoneyEqual(totals.pickupTotal, 15.0);
      expect(totals.pickupCount).toBe(2);
    });

    it("should aggregate multiple days correctly", () => {
      const day1 = service.calculateDayPayment("2024-01-01", 50, 175.0); // Monday
      const day2 = service.calculateDayPayment("2024-01-02", 60, 245.0); // Tuesday
      const day3 = service.calculateDayPayment("2024-01-03", 40, 185.0); // Wednesday
      const totals = service.calculateTotals([day1, day2, day3]);

      expect(totals.workingDays).toBe(3);
      expect(totals.totalConsignments).toBe(150); // 50 + 60 + 40
      expectMoneyEqual(totals.baseTotal, 300.0); // 100 + 120 + 80
      expectMoneyEqual(totals.unloadingTotal, 60.0); // 0 + 30 + 30
      expectMoneyEqual(totals.attendanceTotal, 75.0); // 25 + 25 + 25
      expectMoneyEqual(totals.earlyTotal, 150.0); // 50 + 50 + 50
      expectMoneyEqual(totals.paidTotal, 605.0); // 175 + 245 + 185
    });

    it("should count working days correctly (consignments > 0)", () => {
      const day1 = service.calculateDayPayment("2024-01-01", 50);
      const day2 = service.calculateDayPayment("2024-01-02", 0); // No work
      const day3 = service.calculateDayPayment("2024-01-03", 40);
      const totals = service.calculateTotals([day1, day2, day3]);

      expect(totals.workingDays).toBe(2); // Only day1 and day3
    });

    it("should count working days when pickupTotal > 0 but consignments = 0", () => {
      const day1 = service.calculateDayPayment("2024-01-01", 0, 0, 2, 15.0);
      const day2 = service.calculateDayPayment("2024-01-02", 0); // No work
      const day3 = service.calculateDayPayment("2024-01-03", 50);
      const totals = service.calculateTotals([day1, day2, day3]);

      expect(totals.workingDays).toBe(2); // day1 (pickup only) and day3
    });

    it("should sum all payment fields correctly", () => {
      const day1 = service.calculateDayPayment("2024-01-02", 50, 200.0, 1, 10.0);
      const day2 = service.calculateDayPayment("2024-01-03", 60, 250.0, 2, 20.0);
      const totals = service.calculateTotals([day1, day2]);

      expect(totals.totalConsignments).toBe(110);
      expectMoneyEqual(totals.baseTotal, 220.0); // 100 + 120
      expectMoneyEqual(totals.pickupTotal, 30.0); // 10 + 20
      expect(totals.pickupCount).toBe(3); // 1 + 2
      expectMoneyEqual(totals.expectedTotal, 460.0); // 220 + 210 + 30
      expectMoneyEqual(totals.paidTotal, 450.0); // 200 + 250
      expectMoneyEqual(totals.differenceTotal, -10.0); // 450 - 460
    });

    it("should handle mixed data with some non-working days", () => {
      const day1 = service.calculateDayPayment("2024-01-01", 50, 175.0);
      const day2 = service.calculateDayPayment("2024-01-02", 0); // No work
      const day3 = service.calculateDayPayment("2024-01-03", 0); // No work
      const day4 = service.calculateDayPayment("2024-01-04", 40, 185.0);
      const totals = service.calculateTotals([day1, day2, day3, day4]);

      expect(totals.workingDays).toBe(2);
      expect(totals.totalConsignments).toBe(90);
      expectMoneyEqual(totals.paidTotal, 360.0);
    });

    it("should calculate difference totals correctly with mixed payments", () => {
      const day1 = service.calculateDayPayment("2024-01-02", 50, 250.0); // Overpaid
      const day2 = service.calculateDayPayment("2024-01-03", 50, 150.0); // Underpaid
      const totals = service.calculateTotals([day1, day2]);

      expectMoneyEqual(totals.differenceTotal, -10.0); // (250-205) + (150-205) = 45 - 55 = -10
    });
  });

  describe("groupByWeeks", () => {
    it("should return empty array for empty input", () => {
      const weeks = service.groupByWeeks([]);

      expect(weeks).toEqual([]);
    });

    it("should create one week group for single day", () => {
      const day = service.calculateDayPayment("2024-01-02", 50, 205.0);
      const weeks = service.groupByWeeks([day]);

      expect(weeks).toHaveLength(1);
      expect(weeks[0].days).toHaveLength(1);
      expect(weeks[0].days[0]).toBe(day);
    });

    it("should group multiple days in same week together", () => {
      const mon = service.calculateDayPayment("2024-01-01", 50); // Monday
      const tue = service.calculateDayPayment("2024-01-02", 60); // Tuesday
      const wed = service.calculateDayPayment("2024-01-03", 40); // Wednesday
      const weeks = service.groupByWeeks([mon, tue, wed]);

      expect(weeks).toHaveLength(1);
      expect(weeks[0].days).toHaveLength(3);
      expect(weeks[0].days[0]).toBe(mon);
      expect(weeks[0].days[1]).toBe(tue);
      expect(weeks[0].days[2]).toBe(wed);
    });

    it("should start week on Monday (ISO week)", () => {
      const mon = service.calculateDayPayment("2024-01-01", 50); // Monday
      const weeks = service.groupByWeeks([mon]);

      const weekStart = weeks[0].weekStart;
      expect(weekStart.getUTCDay()).toBe(1); // Monday = 1
      expect(weekStart.toISOString().split("T")[0]).toBe("2024-01-01");
    });

    it("should put Sunday in previous week group", () => {
      const sun = service.calculateDayPayment("2024-01-07", 50); // Sunday
      const mon = service.calculateDayPayment("2024-01-08", 60); // Monday (next week)
      const weeks = service.groupByWeeks([sun, mon]);

      expect(weeks).toHaveLength(2);
      expect(weeks[0].days[0]).toBe(sun);
      expect(weeks[1].days[0]).toBe(mon);

      // Sunday's week should start on previous Monday
      const sunWeekStart = weeks[0].weekStart;
      expect(sunWeekStart.toISOString().split("T")[0]).toBe("2024-01-01");
    });

    it("should sort weeks by week start date", () => {
      const week1Day = service.calculateDayPayment("2024-01-02", 50);
      const week3Day = service.calculateDayPayment("2024-01-16", 40);
      const week2Day = service.calculateDayPayment("2024-01-09", 60);
      const weeks = service.groupByWeeks([week1Day, week3Day, week2Day]);

      expect(weeks).toHaveLength(3);
      expect(weeks[0].weekStart.toISOString().split("T")[0]).toBe("2024-01-01");
      expect(weeks[1].weekStart.toISOString().split("T")[0]).toBe("2024-01-08");
      expect(weeks[2].weekStart.toISOString().split("T")[0]).toBe("2024-01-15");
    });

    it("should sort days within week by date", () => {
      const wed = service.calculateDayPayment("2024-01-03", 40);
      const mon = service.calculateDayPayment("2024-01-01", 50);
      const tue = service.calculateDayPayment("2024-01-02", 60);
      const weeks = service.groupByWeeks([wed, mon, tue]);

      expect(weeks[0].days[0]).toBe(mon);
      expect(weeks[0].days[1]).toBe(tue);
      expect(weeks[0].days[2]).toBe(wed);
    });

    it("should calculate weekly totals correctly", () => {
      const day1 = service.calculateDayPayment("2024-01-01", 50, 175.0);
      const day2 = service.calculateDayPayment("2024-01-02", 60, 220.0);
      const day3 = service.calculateDayPayment("2024-01-03", 40, 170.0);
      const weeks = service.groupByWeeks([day1, day2, day3]);

      expectMoneyEqual(weeks[0].totalExpected, 585.0); // 175 + 225 + 185
      expectMoneyEqual(weeks[0].totalActual, 565.0); // 175 + 220 + 170
      expect(weeks[0].workingDays).toBe(3);
      expect(weeks[0].totalConsignments).toBe(150);
      expectMoneyEqual(weeks[0].totalDifference, -20.0); // 565 - 585
    });

    it("should count working days in week correctly", () => {
      const day1 = service.calculateDayPayment("2024-01-01", 50);
      const day2 = service.calculateDayPayment("2024-01-02", 0); // No work
      const day3 = service.calculateDayPayment("2024-01-03", 40);
      const weeks = service.groupByWeeks([day1, day2, day3]);

      expect(weeks[0].workingDays).toBe(2);
    });

    it("should handle week spanning month boundary", () => {
      const janDay = service.calculateDayPayment("2024-01-29", 50); // Monday
      const febDay = service.calculateDayPayment("2024-02-02", 60); // Friday
      const weeks = service.groupByWeeks([janDay, febDay]);

      expect(weeks).toHaveLength(1); // Same week
      expect(weeks[0].days).toHaveLength(2);
      expect(weeks[0].weekStart.toISOString().split("T")[0]).toBe("2024-01-29");
    });

    it("should skip invalid dates with console warning", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const validDay = service.calculateDayPayment("2024-01-02", 50);
      const invalidDay: DayCalculation = {
        ...validDay,
        date: "invalid-date",
      };

      const weeks = service.groupByWeeks([validDay, invalidDay]);

      expect(weeks).toHaveLength(1);
      expect(weeks[0].days).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith("⚠️ Invalid date value:", "invalid-date");

      consoleSpy.mockRestore();
    });

    it("should handle week with only Sunday", () => {
      const sun = service.calculateDayPayment("2024-01-07", 50); // Sunday
      const weeks = service.groupByWeeks([sun]);

      expect(weeks).toHaveLength(1);
      expect(weeks[0].days).toHaveLength(1);
      // Week should start on previous Monday
      expect(weeks[0].weekStart.toISOString().split("T")[0]).toBe("2024-01-01");
    });

    it("should calculate difference as totalActual - totalExpected", () => {
      const day1 = service.calculateDayPayment("2024-01-02", 50, 250.0); // +45 difference
      const day2 = service.calculateDayPayment("2024-01-03", 50, 150.0); // -55 difference
      const weeks = service.groupByWeeks([day1, day2]);

      expectMoneyEqual(weeks[0].totalDifference, -10.0); // (250+150) - (205+205)
    });
  });

  describe("processDailyData", () => {
    it("should return empty array for empty object", () => {
      const result = service.processDailyData({});

      expect(result).toEqual([]);
    });

    it("should process single date entry correctly", () => {
      const dailyData: DailyData = {
        "2024-01-02": {
          consignments: 50,
          basePayment: 100.0,
          expectedTotal: 205.0,
          paidAmount: 200.0,
          unloadingBonus: 30.0,
          attendanceBonus: 25.0,
          earlyBonus: 50.0,
          pickups: 2,
          pickupTotal: 15.0,
          rate: 2.0,
          status: "complete",
        },
      };

      const result = service.processDailyData(dailyData);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2024-01-02");
      expect(result[0].consignments).toBe(50);
      expectMoneyEqual(result[0].paidAmount, 200.0);
      expect(result[0].pickupCount).toBe(2);
      expectMoneyEqual(result[0].pickupTotal, 15.0);
    });

    it("should sort multiple dates by date", () => {
      const dailyData: DailyData = {
        "2024-01-03": {
          consignments: 40,
          basePayment: 0,
          expectedTotal: 0,
          paidAmount: 0,
          unloadingBonus: 0,
          attendanceBonus: 0,
          earlyBonus: 0,
          pickups: 0,
          pickupTotal: 0,
          rate: 2,
          status: "",
        },
        "2024-01-01": {
          consignments: 50,
          basePayment: 0,
          expectedTotal: 0,
          paidAmount: 0,
          unloadingBonus: 0,
          attendanceBonus: 0,
          earlyBonus: 0,
          pickups: 0,
          pickupTotal: 0,
          rate: 2,
          status: "",
        },
        "2024-01-02": {
          consignments: 60,
          basePayment: 0,
          expectedTotal: 0,
          paidAmount: 0,
          unloadingBonus: 0,
          attendanceBonus: 0,
          earlyBonus: 0,
          pickups: 0,
          pickupTotal: 0,
          rate: 2,
          status: "",
        },
      };

      const result = service.processDailyData(dailyData);

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe("2024-01-01");
      expect(result[1].date).toBe("2024-01-02");
      expect(result[2].date).toBe("2024-01-03");
    });

    it("should normalize date format to YYYY-MM-DD", () => {
      const dailyData: DailyData = {
        "2024-01-02T12:00:00": {
          consignments: 50,
          basePayment: 0,
          expectedTotal: 0,
          paidAmount: 0,
          unloadingBonus: 0,
          attendanceBonus: 0,
          earlyBonus: 0,
          pickups: 0,
          pickupTotal: 0,
          rate: 2,
          status: "",
        },
      };

      const result = service.processDailyData(dailyData);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2024-01-02");
    });

    it("should default missing fields to 0", () => {
      const dailyData: DailyData = {
        "2024-01-02": {
          consignments: 50,
          basePayment: 0,
          expectedTotal: 0,
          paidAmount: 0,
          unloadingBonus: 0,
          attendanceBonus: 0,
          earlyBonus: 0,
          pickups: 0,
          pickupTotal: 0,
          rate: 2,
          status: "",
        },
      };

      const result = service.processDailyData(dailyData);

      expect(result[0].pickupCount).toBe(0);
      expectMoneyEqual(result[0].pickupTotal, 0.0);
      expectMoneyEqual(result[0].paidAmount, 0.0);
    });

    it("should skip invalid dates with console warning", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const dailyData: DailyData = {
        "invalid-date": {
          consignments: 50,
          basePayment: 0,
          expectedTotal: 0,
          paidAmount: 0,
          unloadingBonus: 0,
          attendanceBonus: 0,
          earlyBonus: 0,
          pickups: 0,
          pickupTotal: 0,
          rate: 2,
          status: "",
        },
        "2024-01-02": {
          consignments: 60,
          basePayment: 0,
          expectedTotal: 0,
          paidAmount: 0,
          unloadingBonus: 0,
          attendanceBonus: 0,
          earlyBonus: 0,
          pickups: 0,
          pickupTotal: 0,
          rate: 2,
          status: "",
        },
      };

      const result = service.processDailyData(dailyData);

      expect(result).toHaveLength(1);
      expect(result[0].consignments).toBe(60);
      expect(consoleSpy).toHaveBeenCalledWith("⚠️ Skipping invalid date:", "invalid-date");

      consoleSpy.mockRestore();
    });

    it("should recalculate payments using service rules", () => {
      const dailyData: DailyData = {
        "2024-01-02": {
          consignments: 50,
          basePayment: 999, // Wrong value, should be recalculated
          expectedTotal: 999,
          paidAmount: 200.0,
          unloadingBonus: 999,
          attendanceBonus: 999,
          earlyBonus: 999,
          pickups: 2,
          pickupTotal: 15.0,
          rate: 999,
          status: "",
        },
      };

      const result = service.processDailyData(dailyData);

      // Should use actual calculation, not dailyData values
      expectMoneyEqual(result[0].basePayment, 100.0); // 50 × 2
      expectMoneyEqual(result[0].rate, 2.0);
      expectMoneyEqual(result[0].unloadingBonus, 30.0);
    });
  });

  describe("generateAnalysisSummary", () => {
    it("should return zero totals for empty array", () => {
      const summary = service.generateAnalysisSummary([]);

      expect(summary.totals.workingDays).toBe(0);
      expect(summary.totals.totalConsignments).toBe(0);
      expectMoneyEqual(summary.totals.expectedTotal, 0.0);
      expectMoneyEqual(summary.averageDaily, 0.0);
      expect(summary.weeks).toEqual([]);
    });

    it("should generate summary for single day", () => {
      const day = service.calculateDayPayment("2024-01-02", 50, 205.0);
      const summary = service.generateAnalysisSummary([day]);

      expect(summary.totals.workingDays).toBe(1);
      expectMoneyEqual(summary.totals.expectedTotal, 205.0);
      expectMoneyEqual(summary.averageDaily, 205.0);
      expect(summary.weeks).toHaveLength(1);
    });

    it("should generate summary for multiple days", () => {
      const day1 = service.calculateDayPayment("2024-01-01", 50, 175.0);
      const day2 = service.calculateDayPayment("2024-01-02", 60, 245.0);
      const day3 = service.calculateDayPayment("2024-01-03", 40, 185.0);
      const summary = service.generateAnalysisSummary([day1, day2, day3]);

      expect(summary.totals.workingDays).toBe(3);
      expect(summary.totals.totalConsignments).toBe(150);
      expect(summary.weeks).toHaveLength(1);
    });

    it("should calculate averageDaily as expectedTotal / workingDays", () => {
      const day1 = service.calculateDayPayment("2024-01-02", 50); // 205
      const day2 = service.calculateDayPayment("2024-01-03", 60); // 225
      const day3 = service.calculateDayPayment("2024-01-04", 40); // 185
      const summary = service.generateAnalysisSummary([day1, day2, day3]);

      const expectedAvg = (205 + 225 + 185) / 3;
      expectMoneyEqual(summary.averageDaily, expectedAvg);
    });

    it('should set overallStatus to "Payment Complete - Favorable" when difference >= 0', () => {
      const day1 = service.calculateDayPayment("2024-01-02", 50, 205.0); // 0 diff
      const day2 = service.calculateDayPayment("2024-01-03", 50, 250.0); // +45 diff
      const summary = service.generateAnalysisSummary([day1, day2]);

      expect(summary.overallStatus).toBe("Payment Complete - Favorable");
    });

    it('should set overallStatus to "Payment Incomplete - Review Required" when difference < 0', () => {
      const day1 = service.calculateDayPayment("2024-01-02", 50, 200.0); // -5 diff
      const day2 = service.calculateDayPayment("2024-01-03", 50, 205.0); // 0 diff
      const summary = service.generateAnalysisSummary([day1, day2]);

      expect(summary.overallStatus).toBe("Payment Incomplete - Review Required");
    });

    it("should populate metadata fields correctly", () => {
      const day1 = service.calculateDayPayment("2024-01-02", 50);
      const day2 = service.calculateDayPayment("2024-01-03", 0); // Non-working
      const day3 = service.calculateDayPayment("2024-01-09", 60); // Next week
      const summary = service.generateAnalysisSummary([day1, day2, day3]);

      expect(summary.metadata.processedDays).toBe(3);
      expect(summary.metadata.workingDays).toBe(2);
      expect(summary.metadata.weekCount).toBe(2);
      expect(summary.metadata.rulesVersion).toBe("9.0.0");
      expect(summary.metadata.calculatedAt).toBeDefined();
      expect(new Date(summary.metadata.calculatedAt).getTime()).toBeGreaterThan(0);
    });

    it("should handle zero working days in averageDaily calculation", () => {
      const day1 = service.calculateDayPayment("2024-01-02", 0);
      const day2 = service.calculateDayPayment("2024-01-03", 0);
      const summary = service.generateAnalysisSummary([day1, day2]);

      expectMoneyEqual(summary.averageDaily, 0.0);
    });
  });

  describe("validateCalculations", () => {
    it("should return valid for empty array", () => {
      const result = service.validateCalculations([]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it("should return valid for correct calculations", () => {
      const day1 = service.calculateDayPayment("2024-01-02", 50, 205.0);
      const day2 = service.calculateDayPayment("2024-01-03", 60, 225.0);
      const result = service.validateCalculations([day1, day2]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it("should warn about Sunday work with consignments", () => {
      const day = service.calculateDayPayment("2024-01-07", 50); // Sunday
      const result = service.validateCalculations([day]);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Work recorded on Sunday 2024-01-07");
    });

    it("should warn about Sunday work with paid amount but no consignments", () => {
      const day = service.calculateDayPayment("2024-01-07", 0, 100.0); // Sunday, paid
      const result = service.validateCalculations([day]);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Work recorded on Sunday 2024-01-07");
    });

    it("should error on Monday unloading bonus", () => {
      const day = service.calculateDayPayment("2024-01-01", 50); // Monday
      // Manually corrupt the bonus
      const corruptDay: DayCalculation = { ...day, unloadingBonus: 30.0 };
      const result = service.validateCalculations([corruptDay]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Monday 2024-01-01 has unloading bonus");
    });

    it("should error on Saturday attendance bonus", () => {
      const day = service.calculateDayPayment("2024-01-06", 50); // Saturday
      // Manually corrupt the bonus
      const corruptDay: DayCalculation = { ...day, attendanceBonus: 25.0 };
      const result = service.validateCalculations([corruptDay]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Saturday 2024-01-06 has attendance/early bonus");
    });

    it("should error on Saturday early bonus", () => {
      const day = service.calculateDayPayment("2024-01-06", 50); // Saturday
      // Manually corrupt the bonus
      const corruptDay: DayCalculation = { ...day, earlyBonus: 50.0 };
      const result = service.validateCalculations([corruptDay]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Saturday 2024-01-06 has attendance/early bonus");
    });

    it("should error on negative consignments", () => {
      const day = service.calculateDayPayment("2024-01-02", 50);
      // Manually corrupt consignments
      const corruptDay: DayCalculation = { ...day, consignments: -10 };
      const result = service.validateCalculations([corruptDay]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Negative consignments on 2024-01-02: -10");
    });

    it("should warn about large positive difference (> 100)", () => {
      const day = service.calculateDayPayment("2024-01-02", 50, 350.0); // +145 diff
      const result = service.validateCalculations([day]);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Large payment difference on 2024-01-02");
    });

    it("should warn about large negative difference (< -100)", () => {
      const day = service.calculateDayPayment("2024-01-02", 50, 50.0); // -155 diff
      const result = service.validateCalculations([day]);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Large payment difference on 2024-01-02");
    });

    it("should collect multiple errors", () => {
      const day1 = service.calculateDayPayment("2024-01-01", 50);
      const corruptDay1: DayCalculation = { ...day1, unloadingBonus: 30.0 };

      const day2 = service.calculateDayPayment("2024-01-02", 50);
      const corruptDay2: DayCalculation = { ...day2, consignments: -10 };

      const result = service.validateCalculations([corruptDay1, corruptDay2]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it("should collect multiple warnings", () => {
      const day1 = service.calculateDayPayment("2024-01-07", 50); // Sunday
      const day2 = service.calculateDayPayment("2024-01-02", 50, 350.0); // Large diff
      const result = service.validateCalculations([day1, day2]);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
    });

    it("should not warn about difference exactly at 100 threshold", () => {
      const day = service.calculateDayPayment("2024-01-02", 50, 305.0); // +100 diff
      const result = service.validateCalculations([day]);

      expect(result.warnings).toEqual([]);
    });

    it("should warn about difference just over 100 threshold", () => {
      const day = service.calculateDayPayment("2024-01-02", 50, 305.01); // +100.01 diff
      const result = service.validateCalculations([day]);

      expect(result.warnings).toHaveLength(1);
    });
  });
});
