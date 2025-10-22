/**
 * Money Value Test Helpers
 * Utilities for testing monetary values with proper precision
 */

import { expect } from "vitest";

/**
 * Assert that two money values are equal (handles floating point precision)
 * @param actual - Actual money value
 * @param expected - Expected money value
 * @param tolerance - Acceptable difference (default: 0.001 = 0.1 pence)
 */
export function expectMoneyEqual(
  actual: number,
  expected: number,
  tolerance: number = 0.001
): void {
  const diff = Math.abs(actual - expected);
  expect(diff).toBeLessThanOrEqual(tolerance);
}

/**
 * Round money value to 2 decimal places (standard currency precision)
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format money value as string (£X.XX)
 */
export function formatMoney(value: number): string {
  return `£${roundMoney(value).toFixed(2)}`;
}

/**
 * Assert that a value is a valid money amount (non-negative, 2 decimal places)
 */
export function expectValidMoneyValue(value: number): void {
  expect(value).toBeGreaterThanOrEqual(0);
  expect(roundMoney(value)).toBe(value);
}
