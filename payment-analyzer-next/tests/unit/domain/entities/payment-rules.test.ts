/**
 * PaymentRules Entity Test Suite
 * Comprehensive tests for payment rules entity behavior
 */

import { beforeEach, describe, expect, it } from "vitest";
import { PaymentRules } from "@/lib/domain/entities/payment-rules";
import { Money } from "@/lib/domain/value-objects/money";
import { createTestDate } from "@/tests/helpers/date-helpers";
import { expectMoneyEqual } from "@/tests/helpers/money-helpers";

describe("PaymentRules Entity", () => {
  describe("Constructor", () => {
    it("should create PaymentRules with all required fields", () => {
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
      });

      expect(rules.userId).toBe("user-123");
      expect(rules.weekdayRate).toBeInstanceOf(Money);
      expectMoneyEqual(rules.weekdayRate.amount, 2.0);
      expect(rules.saturdayRate).toBeInstanceOf(Money);
      expectMoneyEqual(rules.saturdayRate.amount, 3.0);
      expect(rules.unloadingBonus).toBeInstanceOf(Money);
      expectMoneyEqual(rules.unloadingBonus.amount, 30.0);
      expect(rules.attendanceBonus).toBeInstanceOf(Money);
      expectMoneyEqual(rules.attendanceBonus.amount, 25.0);
      expect(rules.earlyBonus).toBeInstanceOf(Money);
      expectMoneyEqual(rules.earlyBonus.amount, 50.0);
    });

    it("should generate UUID if no ID provided", () => {
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
      });

      expect(rules.id).toBeDefined();
      expect(typeof rules.id).toBe("string");
      expect(rules.id.length).toBeGreaterThan(0);
    });

    it("should default version to 1 if not provided", () => {
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
      });

      expect(rules.version).toBe(1);
    });

    it("should default validFrom to current date if not provided", () => {
      const beforeCreate = new Date();
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
      });
      const afterCreate = new Date();

      expect(rules.validFrom.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(rules.validFrom.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it("should default isActive to true if not provided", () => {
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
      });

      expect(rules.isActive).toBe(true);
    });

    it("should convert number rates to Money value objects", () => {
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.5,
        saturdayRate: 3.75,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
      });

      expect(rules.weekdayRate).toBeInstanceOf(Money);
      expect(rules.saturdayRate).toBeInstanceOf(Money);
      expect(rules.unloadingBonus).toBeInstanceOf(Money);
      expect(rules.attendanceBonus).toBeInstanceOf(Money);
      expect(rules.earlyBonus).toBeInstanceOf(Money);
    });

    it("should preserve provided ID, version, and dates", () => {
      const specificId = "custom-id-123";
      const validFrom = createTestDate(2024, 1, 1);
      const validUntil = createTestDate(2024, 12, 31);

      const rules = new PaymentRules({
        id: specificId,
        userId: "user-123",
        version: 5,
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        validFrom,
        validUntil,
        isActive: false,
      });

      expect(rules.id).toBe(specificId);
      expect(rules.version).toBe(5);
      expect(rules.validFrom.getTime()).toBe(validFrom.getTime());
      expect(rules.validUntil?.getTime()).toBe(validUntil.getTime());
      expect(rules.isActive).toBe(false);
    });
  });

  describe("Getters", () => {
    let rules: PaymentRules;

    beforeEach(() => {
      rules = new PaymentRules({
        id: "test-id",
        userId: "user-123",
        version: 2,
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        validFrom: createTestDate(2024, 1, 1),
        validUntil: createTestDate(2024, 12, 31),
        isActive: true,
      });
    });

    it("should return all correct values", () => {
      expect(rules.id).toBe("test-id");
      expect(rules.userId).toBe("user-123");
      expect(rules.version).toBe(2);
      expectMoneyEqual(rules.weekdayRate.amount, 2.0);
      expectMoneyEqual(rules.saturdayRate.amount, 3.0);
      expectMoneyEqual(rules.unloadingBonus.amount, 30.0);
      expectMoneyEqual(rules.attendanceBonus.amount, 25.0);
      expectMoneyEqual(rules.earlyBonus.amount, 50.0);
      expect(rules.isActive).toBe(true);
    });

    it("should return new Date instances for validFrom (defensive copy)", () => {
      const validFrom1 = rules.validFrom;
      const validFrom2 = rules.validFrom;

      expect(validFrom1).not.toBe(validFrom2); // Different instances
      expect(validFrom1.getTime()).toBe(validFrom2.getTime()); // Same time
    });

    it("should return new Date instances for validUntil (defensive copy)", () => {
      const validUntil1 = rules.validUntil;
      const validUntil2 = rules.validUntil;

      expect(validUntil1).toBeDefined();
      expect(validUntil2).toBeDefined();
      expect(validUntil1).not.toBe(validUntil2); // Different instances
      expect(validUntil1?.getTime()).toBe(validUntil2?.getTime()); // Same time
    });

    it("should return Money value objects correctly", () => {
      expect(rules.weekdayRate).toBeInstanceOf(Money);
      expect(rules.saturdayRate).toBeInstanceOf(Money);
      expect(rules.unloadingBonus).toBeInstanceOf(Money);
      expect(rules.attendanceBonus).toBeInstanceOf(Money);
      expect(rules.earlyBonus).toBeInstanceOf(Money);
    });

    it("should verify immutability - changing returned dates does not affect internal state", () => {
      const returnedDate = rules.validFrom;
      const originalTime = returnedDate.getTime();

      returnedDate.setFullYear(2099); // Try to mutate returned date

      const newReturnedDate = rules.validFrom;
      expect(newReturnedDate.getTime()).toBe(originalTime); // Original still intact
    });

    it("should return undefined for validUntil when not set", () => {
      const rulesWithoutValidUntil = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
      });

      expect(rulesWithoutValidUntil.validUntil).toBeUndefined();
    });
  });

  describe("getRateForDay", () => {
    let rules: PaymentRules;

    beforeEach(() => {
      rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
      });
    });

    it("should return weekdayRate for Monday (day 1)", () => {
      const rate = rules.getRateForDay(1);
      expect(rate).toBeInstanceOf(Money);
      expectMoneyEqual(rate.amount, 2.0);
    });

    it("should return weekdayRate for Tuesday (day 2)", () => {
      const rate = rules.getRateForDay(2);
      expect(rate).toBeInstanceOf(Money);
      expectMoneyEqual(rate.amount, 2.0);
    });

    it("should return weekdayRate for Wednesday (day 3)", () => {
      const rate = rules.getRateForDay(3);
      expect(rate).toBeInstanceOf(Money);
      expectMoneyEqual(rate.amount, 2.0);
    });

    it("should return weekdayRate for Thursday (day 4)", () => {
      const rate = rules.getRateForDay(4);
      expect(rate).toBeInstanceOf(Money);
      expectMoneyEqual(rate.amount, 2.0);
    });

    it("should return weekdayRate for Friday (day 5)", () => {
      const rate = rules.getRateForDay(5);
      expect(rate).toBeInstanceOf(Money);
      expectMoneyEqual(rate.amount, 2.0);
    });

    it("should return saturdayRate for Saturday (day 6)", () => {
      const rate = rules.getRateForDay(6);
      expect(rate).toBeInstanceOf(Money);
      expectMoneyEqual(rate.amount, 3.0);
    });

    it("should return weekdayRate for Sunday (day 0)", () => {
      const rate = rules.getRateForDay(0);
      expect(rate).toBeInstanceOf(Money);
      expectMoneyEqual(rate.amount, 2.0);
    });
  });

  describe("getApplicableBonuses", () => {
    let rules: PaymentRules;

    beforeEach(() => {
      rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
      });
    });

    it("should return correct bonuses for Monday (no unloading, yes attendance, yes early)", () => {
      const bonuses = rules.getApplicableBonuses(1);

      expect(bonuses.unloading).toBeInstanceOf(Money);
      expect(bonuses.attendance).toBeInstanceOf(Money);
      expect(bonuses.early).toBeInstanceOf(Money);

      expectMoneyEqual(bonuses.unloading.amount, 0); // No unloading on Monday
      expectMoneyEqual(bonuses.attendance.amount, 25.0);
      expectMoneyEqual(bonuses.early.amount, 50.0);
    });

    it("should return correct bonuses for Tuesday (yes unloading, yes attendance, yes early)", () => {
      const bonuses = rules.getApplicableBonuses(2);

      expectMoneyEqual(bonuses.unloading.amount, 30.0);
      expectMoneyEqual(bonuses.attendance.amount, 25.0);
      expectMoneyEqual(bonuses.early.amount, 50.0);
    });

    it("should return correct bonuses for Wednesday (yes unloading, yes attendance, yes early)", () => {
      const bonuses = rules.getApplicableBonuses(3);

      expectMoneyEqual(bonuses.unloading.amount, 30.0);
      expectMoneyEqual(bonuses.attendance.amount, 25.0);
      expectMoneyEqual(bonuses.early.amount, 50.0);
    });

    it("should return correct bonuses for Thursday (yes unloading, yes attendance, yes early)", () => {
      const bonuses = rules.getApplicableBonuses(4);

      expectMoneyEqual(bonuses.unloading.amount, 30.0);
      expectMoneyEqual(bonuses.attendance.amount, 25.0);
      expectMoneyEqual(bonuses.early.amount, 50.0);
    });

    it("should return correct bonuses for Friday (yes unloading, yes attendance, yes early)", () => {
      const bonuses = rules.getApplicableBonuses(5);

      expectMoneyEqual(bonuses.unloading.amount, 30.0);
      expectMoneyEqual(bonuses.attendance.amount, 25.0);
      expectMoneyEqual(bonuses.early.amount, 50.0);
    });

    it("should return correct bonuses for Saturday (yes unloading, no attendance, no early)", () => {
      const bonuses = rules.getApplicableBonuses(6);

      expectMoneyEqual(bonuses.unloading.amount, 30.0);
      expectMoneyEqual(bonuses.attendance.amount, 0); // No attendance on Saturday
      expectMoneyEqual(bonuses.early.amount, 0); // No early on Saturday
    });

    it("should return correct bonuses for Sunday (no unloading, no attendance, no early)", () => {
      const bonuses = rules.getApplicableBonuses(0);

      expectMoneyEqual(bonuses.unloading.amount, 0); // No unloading on Sunday
      expectMoneyEqual(bonuses.attendance.amount, 0); // No attendance on Sunday
      expectMoneyEqual(bonuses.early.amount, 0); // No early on Sunday
    });

    it("should return Money.zero() for disabled bonuses", () => {
      const mondayBonuses = rules.getApplicableBonuses(1);
      const sundayBonuses = rules.getApplicableBonuses(0);

      expect(mondayBonuses.unloading.isZero()).toBe(true);
      expect(sundayBonuses.unloading.isZero()).toBe(true);
      expect(sundayBonuses.attendance.isZero()).toBe(true);
      expect(sundayBonuses.early.isZero()).toBe(true);
    });

    it("should return Money objects for all bonuses", () => {
      const bonuses = rules.getApplicableBonuses(3); // Wednesday

      expect(bonuses.unloading).toBeInstanceOf(Money);
      expect(bonuses.attendance).toBeInstanceOf(Money);
      expect(bonuses.early).toBeInstanceOf(Money);
    });
  });

  describe("isValidFor", () => {
    it("should return false if not active", () => {
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        validFrom: createTestDate(2024, 1, 1),
        isActive: false,
      });

      const testDate = createTestDate(2024, 6, 15);
      expect(rules.isValidFor(testDate)).toBe(false);
    });

    it("should return false if date is before validFrom", () => {
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        validFrom: createTestDate(2024, 6, 1),
        isActive: true,
      });

      const testDate = createTestDate(2024, 5, 31); // Day before validFrom
      expect(rules.isValidFor(testDate)).toBe(false);
    });

    it("should return false if date is after validUntil", () => {
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        validFrom: createTestDate(2024, 1, 1),
        validUntil: createTestDate(2024, 12, 31),
        isActive: true,
      });

      const testDate = createTestDate(2025, 1, 1); // Day after validUntil
      expect(rules.isValidFor(testDate)).toBe(false);
    });

    it("should return true if within range and active", () => {
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        validFrom: createTestDate(2024, 1, 1),
        validUntil: createTestDate(2024, 12, 31),
        isActive: true,
      });

      const testDate = createTestDate(2024, 6, 15);
      expect(rules.isValidFor(testDate)).toBe(true);
    });

    it("should return true if no validUntil and date is after validFrom", () => {
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        validFrom: createTestDate(2024, 1, 1),
        isActive: true,
      });

      const testDate = createTestDate(2025, 6, 15); // Far in the future
      expect(rules.isValidFor(testDate)).toBe(true);
    });

    it("should return true when date equals validFrom", () => {
      const validFrom = createTestDate(2024, 1, 1);
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        validFrom,
        isActive: true,
      });

      const testDate = createTestDate(2024, 1, 1); // Same as validFrom
      expect(rules.isValidFor(testDate)).toBe(true);
    });

    it("should return true when date equals validUntil", () => {
      const validUntil = createTestDate(2024, 12, 31);
      const rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        validFrom: createTestDate(2024, 1, 1),
        validUntil,
        isActive: true,
      });

      const testDate = createTestDate(2024, 12, 31); // Same as validUntil
      expect(rules.isValidFor(testDate)).toBe(true);
    });
  });

  describe("createNewVersion", () => {
    let originalRules: PaymentRules;

    beforeEach(() => {
      originalRules = new PaymentRules({
        userId: "user-123",
        version: 3,
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
      });
    });

    it("should increment version number", () => {
      const newRules = originalRules.createNewVersion({});
      expect(newRules.version).toBe(4);
    });

    it("should set validFrom to current date", () => {
      const beforeCreate = new Date();
      const newRules = originalRules.createNewVersion({});
      const afterCreate = new Date();

      expect(newRules.validFrom.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(newRules.validFrom.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it("should set isActive to true", () => {
      const newRules = originalRules.createNewVersion({});
      expect(newRules.isActive).toBe(true);
    });

    it("should update specified fields", () => {
      const newRules = originalRules.createNewVersion({
        weekdayRate: 2.5,
        saturdayRate: 3.5,
      });

      expectMoneyEqual(newRules.weekdayRate.amount, 2.5);
      expectMoneyEqual(newRules.saturdayRate.amount, 3.5);
    });

    it("should preserve unchanged fields", () => {
      const newRules = originalRules.createNewVersion({
        weekdayRate: 2.5, // Only update weekdayRate
      });

      expectMoneyEqual(newRules.weekdayRate.amount, 2.5); // Updated
      expectMoneyEqual(newRules.saturdayRate.amount, 3.0); // Preserved
      expectMoneyEqual(newRules.unloadingBonus.amount, 30.0); // Preserved
      expectMoneyEqual(newRules.attendanceBonus.amount, 25.0); // Preserved
      expectMoneyEqual(newRules.earlyBonus.amount, 50.0); // Preserved
      expect(newRules.userId).toBe("user-123"); // Preserved
    });

    it("should return new PaymentRules instance (not mutating original)", () => {
      const newRules = originalRules.createNewVersion({
        weekdayRate: 2.5,
      });

      expect(newRules).not.toBe(originalRules);
      expect(newRules.id).not.toBe(originalRules.id); // New ID generated
      expect(originalRules.version).toBe(3); // Original unchanged
      expectMoneyEqual(originalRules.weekdayRate.amount, 2.0); // Original unchanged
    });
  });

  describe("deactivate", () => {
    let rules: PaymentRules;

    beforeEach(() => {
      rules = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
        isActive: true,
      });
    });

    it("should set isActive to false", () => {
      rules.deactivate();
      expect(rules.isActive).toBe(false);
    });

    it("should set validUntil to current date", () => {
      const beforeDeactivate = new Date();
      rules.deactivate();
      const afterDeactivate = new Date();

      expect(rules.validUntil).toBeDefined();
      expect(rules.validUntil?.getTime()).toBeGreaterThanOrEqual(beforeDeactivate.getTime());
      expect(rules.validUntil?.getTime()).toBeLessThanOrEqual(afterDeactivate.getTime());
    });

    it("should verify state after deactivation", () => {
      rules.deactivate();

      expect(rules.isActive).toBe(false);
      expect(rules.validUntil).toBeDefined();

      // Should not be valid for future dates after deactivation
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(rules.isValidFor(futureDate)).toBe(false);
    });
  });

  describe("toJSON/fromJSON", () => {
    let rules: PaymentRules;

    beforeEach(() => {
      rules = new PaymentRules({
        id: "test-id-123",
        userId: "user-456",
        version: 5,
        weekdayRate: 2.5,
        saturdayRate: 3.75,
        unloadingBonus: 35.0,
        attendanceBonus: 27.5,
        earlyBonus: 55.0,
        validFrom: createTestDate(2024, 1, 1),
        validUntil: createTestDate(2024, 12, 31),
        isActive: true,
      });
    });

    it("should return correct JSON structure", () => {
      const json = rules.toJSON();

      expect(json).toHaveProperty("id", "test-id-123");
      expect(json).toHaveProperty("userId", "user-456");
      expect(json).toHaveProperty("version", 5);
      expect(json).toHaveProperty("weekdayRate");
      expect(json).toHaveProperty("saturdayRate");
      expect(json).toHaveProperty("unloadingBonus");
      expect(json).toHaveProperty("attendanceBonus");
      expect(json).toHaveProperty("earlyBonus");
      expect(json).toHaveProperty("validFrom");
      expect(json).toHaveProperty("validUntil");
      expect(json).toHaveProperty("isActive", true);
    });

    it("should convert Money to numbers in JSON", () => {
      const json = rules.toJSON();

      expect(typeof json.weekdayRate).toBe("number");
      expect(typeof json.saturdayRate).toBe("number");
      expect(typeof json.unloadingBonus).toBe("number");
      expect(typeof json.attendanceBonus).toBe("number");
      expect(typeof json.earlyBonus).toBe("number");

      expectMoneyEqual(json.weekdayRate, 2.5);
      expectMoneyEqual(json.saturdayRate, 3.75);
      expectMoneyEqual(json.unloadingBonus, 35.0);
      expectMoneyEqual(json.attendanceBonus, 27.5);
      expectMoneyEqual(json.earlyBonus, 55.0);
    });

    it("should convert dates to ISO strings in JSON", () => {
      const json = rules.toJSON();

      expect(typeof json.validFrom).toBe("string");
      expect(typeof json.validUntil).toBe("string");
      expect(json.validFrom).toContain("2024-01-01");
      expect(json.validUntil).toContain("2024-12-31");
    });

    it("should reconstruct PaymentRules correctly from JSON", () => {
      const json = rules.toJSON();
      const reconstructed = PaymentRules.fromJSON(json);

      expect(reconstructed.id).toBe(rules.id);
      expect(reconstructed.userId).toBe(rules.userId);
      expect(reconstructed.version).toBe(rules.version);
      expectMoneyEqual(reconstructed.weekdayRate.amount, rules.weekdayRate.amount);
      expectMoneyEqual(reconstructed.saturdayRate.amount, rules.saturdayRate.amount);
      expectMoneyEqual(reconstructed.unloadingBonus.amount, rules.unloadingBonus.amount);
      expectMoneyEqual(reconstructed.attendanceBonus.amount, rules.attendanceBonus.amount);
      expectMoneyEqual(reconstructed.earlyBonus.amount, rules.earlyBonus.amount);
      expect(reconstructed.validFrom.getTime()).toBe(rules.validFrom.getTime());
      expect(reconstructed.validUntil?.getTime()).toBe(rules.validUntil?.getTime());
      expect(reconstructed.isActive).toBe(rules.isActive);
    });

    it("should pass round-trip test: fromJSON(toJSON(rules)) equals original", () => {
      const json = rules.toJSON();
      const reconstructed = PaymentRules.fromJSON(json);
      const jsonAgain = reconstructed.toJSON();

      expect(jsonAgain).toEqual(json);
    });

    it("should handle missing validUntil in JSON", () => {
      const rulesWithoutValidUntil = new PaymentRules({
        userId: "user-123",
        weekdayRate: 2.0,
        saturdayRate: 3.0,
        unloadingBonus: 30.0,
        attendanceBonus: 25.0,
        earlyBonus: 50.0,
      });

      const json = rulesWithoutValidUntil.toJSON();
      const reconstructed = PaymentRules.fromJSON(json);

      expect(reconstructed.validUntil).toBeUndefined();
    });
  });
});
