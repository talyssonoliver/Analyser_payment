/**
 * Date/Time Test Helpers
 * Utilities for mocking dates and times in tests
 */

import { vi } from "vitest";

/**
 * Mock the system date to a specific date
 * @param date - Date to mock (string or Date object)
 */
export function mockDate(date: string | Date): void {
  const mockDate = typeof date === "string" ? new Date(date) : date;
  vi.setSystemTime(mockDate);
}

/**
 * Reset date mocking back to real system time
 */
export function resetDate(): void {
  vi.useRealTimers();
}

/**
 * Create a date for testing (ensures UTC to avoid timezone issues)
 * @param year
 * @param month (1-12, NOT 0-11)
 * @param day
 * @returns Date object
 */
export function createTestDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Get day of week from date (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export function getDayOfWeek(date: Date): number {
  return date.getUTCDay();
}

/**
 * Check if date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = getDayOfWeek(date);
  return day === 0 || day === 6;
}

/**
 * Check if date is a weekday (Monday-Friday)
 */
export function isWeekday(date: Date): boolean {
  const day = getDayOfWeek(date);
  return day >= 1 && day <= 5;
}

/**
 * Get day name from date
 */
export function getDayName(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[getDayOfWeek(date)];
}
