/**
 * Dashboard Data Mocks
 * Mock data for dashboard tests
 */

import type { AnalysisWithDetails, DailyEntryRecord } from "@/lib/repositories/analysis-repository";

/**
 * Helper to create a properly typed DailyEntryRecord
 */
export function createMockDailyEntry(overrides: Partial<DailyEntryRecord> = {}): DailyEntryRecord {
  return {
    id: "entry-test",
    analysis_id: "analysis-123",
    date: "2024-01-01",
    day_of_week: 1,
    consignments: 50,
    rate: 2.0,
    base_payment: 100,
    pickups: 0,
    pickup_total: 0,
    unloading_bonus: 30,
    attendance_bonus: 25,
    early_bonus: 50,
    expected_total: 205,
    paid_amount: 205,
    difference: 0,
    status: "balanced",
    created_at: "2024-01-08T00:00:00.000Z",
    ...overrides,
  };
}

export const mockAnalysis: AnalysisWithDetails = {
  id: "analysis-123",
  user_id: "test-user-123",
  fingerprint: "fp-123",
  source: "manual",
  status: "completed",
  period_start: "2024-01-01T00:00:00.000Z",
  period_end: "2024-01-07T23:59:59.999Z",
  rules_version: 1,
  working_days: 5,
  total_consignments: 250,
  metadata: {},
  created_at: "2024-01-08T00:00:00.000Z",
  updated_at: "2024-01-08T00:00:00.000Z",
  daily_entries: [
    {
      id: "entry-1",
      analysis_id: "analysis-123",
      date: "2024-01-01",
      day_of_week: 1,
      consignments: 50,
      rate: 2.0,
      base_payment: 100,
      pickups: 0,
      pickup_total: 0,
      unloading_bonus: 30,
      attendance_bonus: 25,
      early_bonus: 50,
      expected_total: 205,
      paid_amount: 205,
      difference: 0,
      status: "balanced",
      created_at: "2024-01-08T00:00:00.000Z",
    },
    {
      id: "entry-2",
      analysis_id: "analysis-123",
      date: "2024-01-02",
      day_of_week: 2,
      consignments: 45,
      rate: 2.0,
      base_payment: 90,
      pickups: 0,
      pickup_total: 0,
      unloading_bonus: 30,
      attendance_bonus: 25,
      early_bonus: 50,
      expected_total: 195,
      paid_amount: 195,
      difference: 0,
      status: "balanced",
      created_at: "2024-01-08T00:00:00.000Z",
    },
    {
      id: "entry-3",
      analysis_id: "analysis-123",
      date: "2024-01-06",
      day_of_week: 6,
      consignments: 40,
      rate: 3.0,
      base_payment: 120,
      pickups: 0,
      pickup_total: 0,
      unloading_bonus: 30,
      attendance_bonus: 0,
      early_bonus: 0,
      expected_total: 150,
      paid_amount: 140,
      difference: -10,
      status: "balanced",
      created_at: "2024-01-08T00:00:00.000Z",
    },
  ],
  analysis_totals: {
    id: "totals-123",
    analysis_id: "analysis-123",
    base_total: 190,
    pickup_total: 0,
    bonus_total: 240,
    expected_total: 550,
    paid_total: 540,
    difference_total: -10,
    created_at: "2024-01-08T00:00:00.000Z",
  },
};

export const mockAnalyses: AnalysisWithDetails[] = [
  mockAnalysis,
  {
    ...mockAnalysis,
    id: "analysis-456",
    period_start: "2024-01-08T00:00:00.000Z",
    period_end: "2024-01-14T23:59:59.999Z",
    daily_entries: [
      createMockDailyEntry({
        id: "entry-4",
        analysis_id: "analysis-456",
        date: "2024-01-08",
      }),
    ],
  },
];

export const mockDashboardData = {
  kpis: [
    {
      id: "total-revenue",
      label: "Total Revenue",
      value: 540,
      change: 5.2,
      trend: "up" as const,
    },
    {
      id: "total-consignments",
      label: "Consignments",
      value: 250,
      change: -2.1,
      trend: "down" as const,
    },
  ],
  revenueData: [],
  trends: {
    earnings: 5.2,
    consignments: -2.1,
    efficiency: 98.2,
    accuracy: 100,
  },
  recentAnalyses: mockAnalyses,
  totalRevenue: 540,
  avgDaily: 108,
  deliveries: 250,
  performance: 98.2,
  revenueChange: 5.2,
  deliveriesChange: -2.1,
  periodLabel: "January 2024",
};

export const mockEmptyDashboardData = {
  kpis: [],
  revenueData: [],
  recentAnalyses: [],
  totalRevenue: 0,
  avgDaily: 0,
  deliveries: 0,
  performance: 0,
  revenueChange: 0,
  deliveriesChange: 0,
  periodLabel: "Weekly",
};
