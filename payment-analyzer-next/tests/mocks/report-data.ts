/**
 * Report Data Mocks
 * Mock data for report page tests
 */

import type { ReportData } from "@/components/reports/ReportDataConverter";
import type { AnalysisWithDetails, DailyEntryRecord } from "@/lib/repositories/analysis-repository";

/**
 * Mock daily entry for reports
 */
export function createMockReportEntry(overrides: Partial<DailyEntryRecord> = {}): DailyEntryRecord {
  return {
    id: "entry-test",
    analysis_id: "analysis-123",
    date: "2024-01-01",
    day_of_week: 1,
    consignments: 50,
    rate: 2.0,
    base_payment: 100,
    pickups: 5,
    pickup_total: 25,
    unloading_bonus: 30,
    attendance_bonus: 25,
    early_bonus: 50,
    expected_total: 230,
    paid_amount: 230,
    difference: 0,
    status: "balanced",
    created_at: "2024-01-08T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Mock report data
 */
export const mockReportData: ReportData = {
  reportType: "Weekly Report",
  period: "Week of Jan 1 - Jan 7, 2024",
  generatedDate: "January 8, 2024 at 10:00 AM",
  totalDays: 5,
  status: "completed",
  dailyEntries: [
    {
      date: "2024-01-01",
      day: "Monday",
      consignments: 50,
      rate: 2.0,
      basePay: 100,
      pickups: 5,
      pickupTotal: 25,
      bonuses: {
        unloading: 0,
        attendance: 25,
        early: 50,
      },
      expected: 200,
      paid: 200,
      difference: 0,
      status: "balanced",
    },
    {
      date: "2024-01-02",
      day: "Tuesday",
      consignments: 45,
      rate: 2.0,
      basePay: 90,
      pickups: 3,
      pickupTotal: 15,
      bonuses: {
        unloading: 30,
        attendance: 25,
        early: 50,
      },
      expected: 210,
      paid: 210,
      difference: 0,
      status: "balanced",
    },
    {
      date: "2024-01-03",
      day: "Wednesday",
      consignments: 48,
      rate: 2.0,
      basePay: 96,
      pickups: 4,
      pickupTotal: 20,
      bonuses: {
        unloading: 30,
        attendance: 25,
        early: 50,
      },
      expected: 221,
      paid: 221,
      difference: 0,
      status: "balanced",
    },
    {
      date: "2024-01-06",
      day: "Saturday",
      consignments: 40,
      rate: 3.0,
      basePay: 120,
      pickups: 0,
      pickupTotal: 0,
      bonuses: {
        unloading: 30,
        attendance: 0,
        early: 0,
      },
      expected: 150,
      paid: 140,
      difference: -10,
      status: "underpaid",
    },
  ],
  totals: {
    expected: 781,
    paid: 771,
    difference: -10,
    consignments: 183,
    basePay: 406,
    pickups: 60,
    bonuses: 315,
  },
  breakdown: {
    consignments: 406, // basePay goes here per ReportDataConverter
    pickups: 60,
    unloading: 90,
    attendance: 75,
    early: 150,
    total: 781,
  },
};

/**
 * Mock empty report data
 */
export const mockEmptyReportData: ReportData = {
  reportType: "Weekly Report",
  period: "No data available",
  generatedDate: "January 8, 2024 at 10:00 AM",
  totalDays: 0,
  status: "completed",
  dailyEntries: [],
  totals: {
    expected: 0,
    paid: 0,
    difference: 0,
    consignments: 0,
    basePay: 0,
    pickups: 0,
    bonuses: 0,
  },
  breakdown: {
    consignments: 0,
    pickups: 0,
    unloading: 0,
    attendance: 0,
    early: 0,
    total: 0,
  },
};

/**
 * Mock single day report data
 */
export const mockDailyReportData: ReportData = {
  reportType: "Daily Report",
  period: "Monday, Jan 1, 2024",
  generatedDate: "January 8, 2024 at 10:00 AM",
  totalDays: 1,
  status: "completed",
  dailyEntries: [
    {
      date: "2024-01-01",
      day: "Monday",
      consignments: 50,
      rate: 2.0,
      basePay: 100,
      pickups: 5,
      pickupTotal: 25,
      bonuses: {
        unloading: 0,
        attendance: 25,
        early: 50,
      },
      expected: 200,
      paid: 200,
      difference: 0,
      status: "balanced",
    },
  ],
  totals: {
    expected: 200,
    paid: 200,
    difference: 0,
    consignments: 50,
    basePay: 100,
    pickups: 25,
    bonuses: 75,
  },
  breakdown: {
    consignments: 100,
    pickups: 25,
    unloading: 0,
    attendance: 25,
    early: 50,
    total: 200,
  },
};

/**
 * Mock analysis with details (for database operations)
 */
export const mockAnalysisWithDetails: AnalysisWithDetails = {
  id: "analysis-123",
  user_id: "test-user-123",
  fingerprint: "fp-123",
  source: "upload",
  status: "completed",
  period_start: "2024-01-01T00:00:00.000Z",
  period_end: "2024-01-07T23:59:59.999Z",
  rules_version: 1,
  working_days: 5,
  total_consignments: 183,
  metadata: {},
  created_at: "2024-01-08T00:00:00.000Z",
  updated_at: "2024-01-08T00:00:00.000Z",
  daily_entries: [
    createMockReportEntry({
      id: "entry-1",
      date: "2024-01-01",
      day_of_week: 1,
      consignments: 50,
      base_payment: 100,
      pickups: 5,
      pickup_total: 25,
      unloading_bonus: 0,
      attendance_bonus: 25,
      early_bonus: 50,
      expected_total: 200,
      paid_amount: 200,
      difference: 0,
    }),
    createMockReportEntry({
      id: "entry-2",
      date: "2024-01-02",
      day_of_week: 2,
      consignments: 45,
      base_payment: 90,
      pickups: 3,
      pickup_total: 15,
      unloading_bonus: 30,
      attendance_bonus: 25,
      early_bonus: 50,
      expected_total: 210,
      paid_amount: 210,
      difference: 0,
    }),
  ],
  analysis_totals: {
    id: "totals-123",
    analysis_id: "analysis-123",
    base_total: 406,
    pickup_total: 60,
    bonus_total: 315,
    expected_total: 781,
    paid_total: 771,
    difference_total: -10,
    created_at: "2024-01-08T00:00:00.000Z",
  },
};
