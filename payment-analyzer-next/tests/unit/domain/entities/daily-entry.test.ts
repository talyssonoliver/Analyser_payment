/**
 * DailyEntry Entity Test Suite
 * Comprehensive tests for daily entry entity behavior
 */

import { beforeEach, describe, expect, it } from "vitest";
import { DailyEntry } from "@/lib/domain/entities/daily-entry";
import { ConsignmentCount } from "@/lib/domain/value-objects/consignment-count";
import { Money } from "@/lib/domain/value-objects/money";
import { createTestDate, getDayOfWeek } from "@/tests/helpers/date-helpers";
import { expectMoneyEqual } from "@/tests/helpers/money-helpers";

describe("DailyEntry Entity", () => {
  describe("Constructor", () => {
    it("should create DailyEntry with all required fields", () => {
      const date = createTestDate(2024, 6, 15); // Saturday
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date,
        consignments: 100,
        rate: 3.0,
        paidAmount: 300.0,
      });

      expect(entry.analysisId).toBe("analysis-123");
      expect(entry.date.toDateString()).toBe(date.toDateString());
      expect(entry.consignments).toBeInstanceOf(ConsignmentCount);
      expect(entry.consignments.count).toBe(100);
      expect(entry.rate).toBeInstanceOf(Money);
      expectMoneyEqual(entry.rate.amount, 3.0);
      expect(entry.paidAmount).toBeInstanceOf(Money);
      expectMoneyEqual(entry.paidAmount.amount, 300.0);
    });

    it("should generate UUID if no ID provided", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        paidAmount: 300.0,
      });

      expect(entry.id).toBeDefined();
      expect(typeof entry.id).toBe("string");
      expect(entry.id.length).toBeGreaterThan(0);
    });

    it("should calculate dayOfWeek from date", () => {
      const date = createTestDate(2024, 6, 15); // Saturday
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date,
        consignments: 100,
        rate: 3.0,
        paidAmount: 300.0,
      });

      expect(entry.dayOfWeek).toBe(getDayOfWeek(date));
      expect(entry.dayOfWeek).toBe(6); // Saturday
    });

    it("should convert numbers to value objects (Money, ConsignmentCount)", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        basePayment: 300.0,
        pickupTotal: 50.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        paidAmount: 455.0,
      });

      expect(entry.consignments).toBeInstanceOf(ConsignmentCount);
      expect(entry.rate).toBeInstanceOf(Money);
      expect(entry.basePayment).toBeInstanceOf(Money);
      expect(entry.pickupTotal).toBeInstanceOf(Money);
      expect(entry.unloadingBonus).toBeInstanceOf(Money);
      expect(entry.attendanceBonus).toBeInstanceOf(Money);
      expect(entry.earlyBonus).toBeInstanceOf(Money);
      expect(entry.paidAmount).toBeInstanceOf(Money);
    });

    it("should default pickups to 0 if not provided", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        paidAmount: 300.0,
      });

      expect(entry.pickups).toBeInstanceOf(ConsignmentCount);
      expect(entry.pickups.count).toBe(0);
    });

    it("should default pickupTotal to 0 if not provided", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        paidAmount: 300.0,
      });

      expect(entry.pickupTotal).toBeInstanceOf(Money);
      expectMoneyEqual(entry.pickupTotal.amount, 0);
    });

    it("should default bonuses to 0 if not provided", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        paidAmount: 300.0,
      });

      expectMoneyEqual(entry.unloadingBonus.amount, 0);
      expectMoneyEqual(entry.attendanceBonus.amount, 0);
      expectMoneyEqual(entry.earlyBonus.amount, 0);
    });

    it("should calculate basePayment from consignments * rate if not provided", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        paidAmount: 300.0,
      });

      expectMoneyEqual(entry.basePayment.amount, 300.0); // 100 * 3.00
    });

    it("should use provided basePayment if specified", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        basePayment: 350.0, // Override automatic calculation
        paidAmount: 350.0,
      });

      expectMoneyEqual(entry.basePayment.amount, 350.0);
    });

    it("should calculate expectedTotal automatically", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        pickupTotal: 50.0,
        unloadingBonus: 30.0,
        paidAmount: 380.0,
      });

      // expectedTotal = basePayment (300) + pickupTotal (50) + totalBonus (30) = 380
      expectMoneyEqual(entry.expectedTotal.amount, 380.0);
    });

    it("should calculate difference automatically (paidAmount - expectedTotal)", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        pickupTotal: 50.0,
        unloadingBonus: 30.0,
        paidAmount: 400.0, // Paid 20 more than expected
      });

      // difference = paidAmount (400) - expectedTotal (380) = 20
      expectMoneyEqual(entry.difference.amount, 20.0);
    });
  });

  describe("Getters", () => {
    let entry: DailyEntry;

    beforeEach(() => {
      entry = new DailyEntry({
        id: "entry-123",
        analysisId: "analysis-456",
        date: createTestDate(2024, 6, 15), // Saturday, June 15, 2024
        consignments: 100,
        rate: 3.0,
        basePayment: 300.0,
        pickups: 10,
        pickupTotal: 50.0,
        unloadingBonus: 30.0,
        attendanceBonus: 0, // No attendance on Saturday
        earlyBonus: 0, // No early on Saturday
        paidAmount: 380.0,
      });
    });

    it("should return all correct values", () => {
      expect(entry.id).toBe("entry-123");
      expect(entry.analysisId).toBe("analysis-456");
      expect(entry.dayOfWeek).toBe(6); // Saturday
      expect(entry.consignments.count).toBe(100);
      expectMoneyEqual(entry.rate.amount, 3.0);
      expectMoneyEqual(entry.basePayment.amount, 300.0);
      expect(entry.pickups.count).toBe(10);
      expectMoneyEqual(entry.pickupTotal.amount, 50.0);
      expectMoneyEqual(entry.unloadingBonus.amount, 30.0);
      expectMoneyEqual(entry.attendanceBonus.amount, 0);
      expectMoneyEqual(entry.earlyBonus.amount, 0);
      expectMoneyEqual(entry.paidAmount.amount, 380.0);
    });

    it("should return correct dayName for each day of week", () => {
      const sunday = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 16), // Sunday
        consignments: 0,
        rate: 2.0,
        paidAmount: 0,
      });
      const monday = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 17), // Monday
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });
      const saturday = entry;

      expect(sunday.dayName).toBe("Sunday");
      expect(monday.dayName).toBe("Monday");
      expect(saturday.dayName).toBe("Saturday");
    });

    it("should return new Date instance (defensive copy)", () => {
      const date1 = entry.date;
      const date2 = entry.date;

      expect(date1).not.toBe(date2); // Different instances
      expect(date1.getTime()).toBe(date2.getTime()); // Same time
    });

    it("should return value objects correctly", () => {
      expect(entry.consignments).toBeInstanceOf(ConsignmentCount);
      expect(entry.pickups).toBeInstanceOf(ConsignmentCount);
      expect(entry.rate).toBeInstanceOf(Money);
      expect(entry.basePayment).toBeInstanceOf(Money);
      expect(entry.pickupTotal).toBeInstanceOf(Money);
      expect(entry.unloadingBonus).toBeInstanceOf(Money);
      expect(entry.attendanceBonus).toBeInstanceOf(Money);
      expect(entry.earlyBonus).toBeInstanceOf(Money);
      expect(entry.expectedTotal).toBeInstanceOf(Money);
      expect(entry.paidAmount).toBeInstanceOf(Money);
      expect(entry.difference).toBeInstanceOf(Money);
    });

    it("should verify immutability - changing returned date does not affect internal state", () => {
      const returnedDate = entry.date;
      const originalTime = returnedDate.getTime();

      returnedDate.setFullYear(2099); // Try to mutate

      const newReturnedDate = entry.date;
      expect(newReturnedDate.getTime()).toBe(originalTime); // Original still intact
    });
  });

  describe("Computed Property: totalBonus", () => {
    it("should return sum of all bonuses", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 18), // Tuesday
        consignments: 100,
        rate: 2.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        paidAmount: 305.0,
      });

      expectMoneyEqual(entry.totalBonus.amount, 105.0); // 30 + 25 + 50
    });

    it("should return Money object", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 18),
        consignments: 100,
        rate: 2.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        paidAmount: 305.0,
      });

      expect(entry.totalBonus).toBeInstanceOf(Money);
    });

    it("should return zero when no bonuses", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 16), // Sunday
        consignments: 0,
        rate: 2.0,
        paidAmount: 0,
      });

      expectMoneyEqual(entry.totalBonus.amount, 0);
    });
  });

  describe("Computed Property: status", () => {
    it('should return "balanced" when difference is zero', () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        paidAmount: 300.0, // Exactly matches basePayment
      });

      expect(entry.status).toBe("balanced");
    });

    it('should return "overpaid" when difference is positive', () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        paidAmount: 350.0, // Paid 50 more than expected
      });

      expect(entry.status).toBe("overpaid");
    });

    it('should return "underpaid" when difference is negative', () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        paidAmount: 250.0, // Paid 50 less than expected
      });

      expect(entry.status).toBe("underpaid");
    });
  });

  describe("Computed Property: dateFormatted", () => {
    it("should return correct format (dd/MM/yyyy)", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        paidAmount: 300.0,
      });

      expect(entry.dateFormatted).toBe("15/06/2024");
    });

    it("should format with leading zeros", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 1, 5), // January 5
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });

      expect(entry.dateFormatted).toBe("05/01/2024");
    });
  });

  describe("Computed Property: isWorkingDay", () => {
    it("should return true for Monday (day 1)", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 17), // Monday
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });

      expect(entry.isWorkingDay).toBe(true);
    });

    it("should return true for Tuesday through Friday (days 2-5)", () => {
      const tuesday = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 18), // Tuesday
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });
      const friday = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 21), // Friday
        consignments: 100,
        rate: 2.0,
        paidAmount: 200.0,
      });

      expect(tuesday.isWorkingDay).toBe(true);
      expect(friday.isWorkingDay).toBe(true);
    });

    it("should return true for Saturday (day 6)", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15), // Saturday
        consignments: 100,
        rate: 3.0,
        paidAmount: 300.0,
      });

      expect(entry.isWorkingDay).toBe(true);
    });

    it("should return false for Sunday (day 0)", () => {
      const entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 16), // Sunday
        consignments: 0,
        rate: 2.0,
        paidAmount: 0,
      });

      expect(entry.isWorkingDay).toBe(false);
    });
  });

  describe("updatePaidAmount", () => {
    let entry: DailyEntry;

    beforeEach(() => {
      entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        paidAmount: 300.0,
      });
    });

    it("should update paidAmount", () => {
      entry.updatePaidAmount(350.0);
      expectMoneyEqual(entry.paidAmount.amount, 350.0);
    });

    it("should recalculate difference", () => {
      entry.updatePaidAmount(350.0);
      expectMoneyEqual(entry.difference.amount, 50.0); // 350 - 300
    });

    it("should keep expectedTotal unchanged", () => {
      const originalExpected = entry.expectedTotal.amount;
      entry.updatePaidAmount(350.0);
      expectMoneyEqual(entry.expectedTotal.amount, originalExpected);
    });

    it("should verify Money objects", () => {
      entry.updatePaidAmount(350.0);
      expect(entry.paidAmount).toBeInstanceOf(Money);
      expect(entry.difference).toBeInstanceOf(Money);
    });
  });

  describe("updatePickupData", () => {
    let entry: DailyEntry;

    beforeEach(() => {
      entry = new DailyEntry({
        analysisId: "analysis-123",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        pickups: 5,
        pickupTotal: 25.0,
        paidAmount: 325.0,
      });
    });

    it("should update pickups count", () => {
      entry.updatePickupData(10, 50.0);
      expect(entry.pickups.count).toBe(10);
    });

    it("should update pickupTotal", () => {
      entry.updatePickupData(10, 50.0);
      expectMoneyEqual(entry.pickupTotal.amount, 50.0);
    });

    it("should recalculate expectedTotal", () => {
      // Original: basePayment (300) + pickupTotal (25) = 325
      expectMoneyEqual(entry.expectedTotal.amount, 325.0);

      entry.updatePickupData(10, 50.0);
      // New: basePayment (300) + pickupTotal (50) = 350
      expectMoneyEqual(entry.expectedTotal.amount, 350.0);
    });

    it("should recalculate difference", () => {
      // Original: paidAmount (325) - expectedTotal (325) = 0
      expectMoneyEqual(entry.difference.amount, 0);

      entry.updatePickupData(10, 50.0);
      // New: paidAmount (325) - expectedTotal (350) = -25
      expectMoneyEqual(entry.difference.amount, -25.0);
    });

    it("should verify state consistency", () => {
      entry.updatePickupData(10, 50.0);

      expect(entry.pickups.count).toBe(10);
      expectMoneyEqual(entry.pickupTotal.amount, 50.0);
      expectMoneyEqual(entry.expectedTotal.amount, 350.0);
      expectMoneyEqual(entry.difference.amount, -25.0);
      expect(entry.status).toBe("underpaid");
    });
  });

  describe("toJSON/fromJSON", () => {
    let entry: DailyEntry;

    beforeEach(() => {
      entry = new DailyEntry({
        id: "entry-123",
        analysisId: "analysis-456",
        date: createTestDate(2024, 6, 15),
        consignments: 100,
        rate: 3.0,
        basePayment: 300.0,
        pickups: 10,
        pickupTotal: 50.0,
        unloadingBonus: 30.0,
        attendanceBonus: 0,
        earlyBonus: 0,
        paidAmount: 380.0,
      });
    });

    it("should return correct JSON structure", () => {
      const json = entry.toJSON();

      expect(json).toHaveProperty("id", "entry-123");
      expect(json).toHaveProperty("analysisId", "analysis-456");
      expect(json).toHaveProperty("date");
      expect(json).toHaveProperty("dayOfWeek", 6);
      expect(json).toHaveProperty("consignments", 100);
      expect(json).toHaveProperty("rate");
      expect(json).toHaveProperty("basePayment");
      expect(json).toHaveProperty("pickups", 10);
      expect(json).toHaveProperty("pickupTotal");
      expect(json).toHaveProperty("unloadingBonus");
      expect(json).toHaveProperty("attendanceBonus");
      expect(json).toHaveProperty("earlyBonus");
      expect(json).toHaveProperty("expectedTotal");
      expect(json).toHaveProperty("paidAmount");
      expect(json).toHaveProperty("difference");
      expect(json).toHaveProperty("status");
    });

    it("should convert value objects to primitives", () => {
      const json = entry.toJSON();

      expect(typeof json.consignments).toBe("number");
      expect(typeof json.pickups).toBe("number");
      expect(typeof json.rate).toBe("number");
      expect(typeof json.basePayment).toBe("number");
      expect(typeof json.pickupTotal).toBe("number");
      expect(typeof json.unloadingBonus).toBe("number");
      expect(typeof json.attendanceBonus).toBe("number");
      expect(typeof json.earlyBonus).toBe("number");
      expect(typeof json.expectedTotal).toBe("number");
      expect(typeof json.paidAmount).toBe("number");
      expect(typeof json.difference).toBe("number");
    });

    it("should include status in JSON", () => {
      const json = entry.toJSON();

      expect(json.status).toBeDefined();
      expect(["balanced", "overpaid", "underpaid"]).toContain(json.status);
    });

    it("should reconstruct DailyEntry correctly from JSON", () => {
      const json = entry.toJSON();
      const reconstructed = DailyEntry.fromJSON(json);

      expect(reconstructed.id).toBe(entry.id);
      expect(reconstructed.analysisId).toBe(entry.analysisId);
      expect(reconstructed.date.toDateString()).toBe(entry.date.toDateString());
      expect(reconstructed.dayOfWeek).toBe(entry.dayOfWeek);
      expect(reconstructed.consignments.count).toBe(entry.consignments.count);
      expectMoneyEqual(reconstructed.rate.amount, entry.rate.amount);
      expectMoneyEqual(reconstructed.basePayment.amount, entry.basePayment.amount);
      expect(reconstructed.pickups.count).toBe(entry.pickups.count);
      expectMoneyEqual(reconstructed.pickupTotal.amount, entry.pickupTotal.amount);
      expectMoneyEqual(reconstructed.unloadingBonus.amount, entry.unloadingBonus.amount);
      expectMoneyEqual(reconstructed.attendanceBonus.amount, entry.attendanceBonus.amount);
      expectMoneyEqual(reconstructed.earlyBonus.amount, entry.earlyBonus.amount);
      expectMoneyEqual(reconstructed.paidAmount.amount, entry.paidAmount.amount);
    });

    it("should pass round-trip test", () => {
      const json = entry.toJSON();
      const reconstructed = DailyEntry.fromJSON(json);
      const jsonAgain = reconstructed.toJSON();

      expect(jsonAgain.id).toEqual(json.id);
      expect(jsonAgain.analysisId).toEqual(json.analysisId);
      expect(jsonAgain.dayOfWeek).toEqual(json.dayOfWeek);
      expect(jsonAgain.consignments).toEqual(json.consignments);
      expectMoneyEqual(jsonAgain.rate, json.rate);
      expectMoneyEqual(jsonAgain.basePayment, json.basePayment);
      expect(jsonAgain.pickups).toEqual(json.pickups);
      expectMoneyEqual(jsonAgain.pickupTotal, json.pickupTotal);
      expectMoneyEqual(jsonAgain.unloadingBonus, json.unloadingBonus);
      expectMoneyEqual(jsonAgain.attendanceBonus, json.attendanceBonus);
      expectMoneyEqual(jsonAgain.earlyBonus, json.earlyBonus);
      expectMoneyEqual(jsonAgain.paidAmount, json.paidAmount);
    });
  });
});
