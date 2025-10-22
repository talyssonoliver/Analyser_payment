/**
 * Integration Tests for Reports Page Deep Links and Query Parameters
 * Tests week/day deep link handling and status mapping consistency
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import ReportsPage from "@/app/(dashboard)/reports/page";
import { mockAuthHook } from "@/tests/mocks/auth";
import { mockAnalysisWithDetails } from "@/tests/mocks/report-data";
import { render, screen, waitFor } from "@/tests/utils/test-utils";

// Mock dependencies
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
  toast: vi.fn(),
}));

vi.mock("@/components/export/export-modal", () => ({
  ExportModal: () => null,
}));

vi.mock("@/components/analysis", () => ({
  ManualEntry: () => null,
}));

vi.mock("@/lib/providers/auth-provider", () => ({
  useAuth: () => mockAuthHook,
}));

vi.mock("@/lib/repositories/analysis-repository", () => ({
  analysisRepository: {
    getUserAnalyses: vi.fn(() =>
      Promise.resolve({
        isSuccess: true,
        data: { data: [mockAnalysisWithDetails], error: null },
      })
    ),
    getAnalysisById: vi.fn(() =>
      Promise.resolve({
        isSuccess: true,
        data: mockAnalysisWithDetails,
        error: null,
      })
    ),
    updateDailyEntry: vi.fn(() =>
      Promise.resolve({
        isSuccess: true,
        data: {},
        error: null,
      })
    ),
  },
}));

// Create mocks for hooks
const mockUseReportData = vi.fn();
const mockExtractUrlParameters = vi.fn();
const mockDetermineFinalParameters = vi.fn();

vi.mock("@/hooks/useReportData", () => ({
  useReportData: () => mockUseReportData(),
}));

vi.mock("@/hooks/useReportUrlParams", () => ({
  useReportUrlParams: () => ({
    extractUrlParameters: mockExtractUrlParameters,
    determineFinalParameters: mockDetermineFinalParameters,
  }),
}));

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: mockRefresh,
    pathname: "/reports",
    query: {},
    asPath: "/reports",
  }),
  usePathname: () => "/reports",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

describe("Reports Page Deep Links and Query Parameters", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset URL
    window.history.replaceState({}, "", "/reports");

    // Default mock implementations
    mockExtractUrlParameters.mockReturnValue({
      analysisId: null,
      dayFilter: null,
      weekFilter: null,
      startDate: null,
      endDate: null,
    });

    mockDetermineFinalParameters.mockReturnValue({
      finalAnalysisId: "analysis-123",
      finalWeekFilter: null,
      finalStartDate: null,
      finalEndDate: null,
      weekAnalysisId: null,
      selectedWeek: null,
    });
  });

  describe("Week Deep Links", () => {
    it("should handle week parameter correctly", async () => {
      // Simulate ?week=2&analysis=123
      window.history.replaceState({}, "", "/reports?week=2&analysis=analysis-123");

      mockExtractUrlParameters.mockReturnValue({
        analysisId: "analysis-123",
        dayFilter: null,
        weekFilter: "2",
        startDate: null,
        endDate: null,
      });

      mockDetermineFinalParameters.mockReturnValue({
        finalAnalysisId: "analysis-123",
        finalWeekFilter: "2",
        finalStartDate: "2024-01-08",
        finalEndDate: "2024-01-14",
        weekAnalysisId: null,
        selectedWeek: { week: 2, year: 2024 },
      });

      mockUseReportData.mockReturnValue({
        reportData: {
          period: "Week of Jan 8 - Jan 14, 2024",
          reportType: "Weekly Report",
          generatedDate: "January 15, 2024",
          totalDays: 7,
          status: "completed",
          dailyEntries: [
            {
              date: "2024-01-08",
              day: "Monday",
              consignments: 50,
              rate: 4.06,
              basePay: 203.0,
              pickups: 2,
              pickupTotal: 30.0,
              bonuses: { unloading: 25, attendance: 25, early: 50 },
              expected: 333.0,
              paid: 333.0,
              difference: 0,
              status: "balanced" as const,
            },
          ],
          totals: {
            consignments: 50,
            basePay: 203,
            pickups: 30,
            bonuses: 100,
            expected: 333,
            paid: 333,
            difference: 0,
          },
          breakdown: {
            consignments: 203,
            pickups: 30,
            unloading: 25,
            attendance: 25,
            early: 50,
            total: 333,
          },
        },
        loading: false,
        isDailyReport: false,
        currentAnalysisId: "analysis-123",
        requestedAnalysisId: "analysis-123",
      });

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Weekly Report/i)).toBeInTheDocument();
        expect(screen.getByText(/Week of Jan 8 - Jan 14, 2024/i)).toBeInTheDocument();
      });
    });

    it("should handle week with start and end dates", async () => {
      window.history.replaceState(
        {},
        "",
        "/reports?start=2024-01-08&end=2024-01-14&analysis=analysis-123"
      );

      mockExtractUrlParameters.mockReturnValue({
        analysisId: "analysis-123",
        dayFilter: null,
        weekFilter: null,
        startDate: "2024-01-08",
        endDate: "2024-01-14",
      });

      mockDetermineFinalParameters.mockReturnValue({
        finalAnalysisId: "analysis-123",
        finalWeekFilter: null,
        finalStartDate: "2024-01-08",
        finalEndDate: "2024-01-14",
        weekAnalysisId: null,
        selectedWeek: null,
      });

      mockUseReportData.mockReturnValue({
        reportData: {
          period: "08/01/2024 - 14/01/2024",
          reportType: "Weekly Report",
          generatedDate: "January 15, 2024",
          totalDays: 7,
          status: "completed",
          dailyEntries: [],
          totals: {
            consignments: 350,
            basePay: 1421,
            pickups: 210,
            bonuses: 700,
            expected: 2331,
            paid: 2331,
            difference: 0,
          },
          breakdown: {
            consignments: 1421,
            pickups: 210,
            unloading: 175,
            attendance: 175,
            early: 350,
            total: 2331,
          },
        },
        loading: false,
        isDailyReport: false,
        currentAnalysisId: "analysis-123",
        requestedAnalysisId: "analysis-123",
      });

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Weekly Report/i)).toBeInTheDocument();
      });
    });
  });

  describe("Day Deep Links", () => {
    it("should handle single day parameter correctly", async () => {
      window.history.replaceState({}, "", "/reports?day=2024-01-08&analysis=analysis-123");

      mockExtractUrlParameters.mockReturnValue({
        analysisId: "analysis-123",
        dayFilter: "2024-01-08",
        weekFilter: null,
        startDate: null,
        endDate: null,
      });

      mockDetermineFinalParameters.mockReturnValue({
        finalAnalysisId: "analysis-123",
        finalWeekFilter: null,
        finalStartDate: null,
        finalEndDate: null,
        weekAnalysisId: null,
        selectedWeek: null,
      });

      mockUseReportData.mockReturnValue({
        reportData: {
          period: "Monday, 8 January 2024",
          reportType: "Daily Report",
          generatedDate: "January 15, 2024",
          totalDays: 1,
          status: "completed",
          dailyEntries: [
            {
              date: "2024-01-08",
              day: "Monday",
              consignments: 50,
              rate: 4.06,
              basePay: 203.0,
              pickups: 2,
              pickupTotal: 30.0,
              bonuses: { unloading: 25, attendance: 25, early: 50 },
              expected: 333.0,
              paid: 333.0,
              difference: 0,
              status: "balanced" as const,
            },
          ],
          totals: {
            consignments: 50,
            basePay: 203,
            pickups: 30,
            bonuses: 100,
            expected: 333,
            paid: 333,
            difference: 0,
          },
          breakdown: {
            consignments: 203,
            pickups: 30,
            unloading: 25,
            attendance: 25,
            early: 50,
            total: 333,
          },
        },
        loading: false,
        isDailyReport: true,
        currentAnalysisId: "analysis-123",
        requestedAnalysisId: "analysis-123",
      });

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Daily Report/i)).toBeInTheDocument();
        expect(screen.getByText(/Monday, 8 January 2024/i)).toBeInTheDocument();
      });

      // Single-day report should not show table
      expect(screen.queryByRole("table")).not.toBeInTheDocument();

      // Should show KPIs and settlement summary
      expect(screen.getByText("Expected Total")).toBeInTheDocument();
      expect(screen.getByText(/Settlement Summary/i)).toBeInTheDocument();
    });

    it("should show KPIs for single-day reports", async () => {
      window.history.replaceState({}, "", "/reports?day=2024-01-08&analysis=analysis-123");

      mockExtractUrlParameters.mockReturnValue({
        analysisId: "analysis-123",
        dayFilter: "2024-01-08",
        weekFilter: null,
        startDate: null,
        endDate: null,
      });

      mockUseReportData.mockReturnValue({
        reportData: {
          period: "Monday, 8 January 2024",
          reportType: "Daily Report",
          generatedDate: "January 15, 2024",
          totalDays: 1,
          status: "completed",
          dailyEntries: [
            {
              date: "2024-01-08",
              day: "Monday",
              consignments: 50,
              rate: 4.06,
              basePay: 203.0,
              pickups: 2,
              pickupTotal: 30.0,
              bonuses: { unloading: 25, attendance: 25, early: 50 },
              expected: 333.0,
              paid: 320.0,
              difference: -13.0,
              status: "underpaid" as const,
            },
          ],
          totals: {
            consignments: 50,
            basePay: 203,
            pickups: 30,
            bonuses: 100,
            expected: 333,
            paid: 320,
            difference: -13,
          },
          breakdown: {
            consignments: 203,
            pickups: 30,
            unloading: 25,
            attendance: 25,
            early: 50,
            total: 333,
          },
        },
        loading: false,
        isDailyReport: true,
        currentAnalysisId: "analysis-123",
        requestedAnalysisId: "analysis-123",
      });

      render(<ReportsPage />);

      await waitFor(() => {
        // Check KPI cards are displayed
        expect(screen.getByText("Expected Total")).toBeInTheDocument();
        expect(screen.getByText("Paid Amount")).toBeInTheDocument();

        // Check values (use getAllByText for values that may appear multiple times)
        const expectedValues = screen.getAllByText("£333.00");
        expect(expectedValues.length).toBeGreaterThan(0);
        const paidValues = screen.getAllByText("£320.00");
        expect(paidValues.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Status Mapping Consistency", () => {
    it("should consistently map balanced status", async () => {
      mockUseReportData.mockReturnValue({
        reportData: {
          period: "Week of Jan 1 - Jan 7, 2024",
          reportType: "Weekly Report",
          generatedDate: "January 8, 2024",
          totalDays: 4,
          status: "completed",
          dailyEntries: [
            {
              date: "2024-01-01",
              day: "Monday",
              consignments: 50,
              rate: 4.06,
              basePay: 203.0,
              pickups: 2,
              pickupTotal: 30.0,
              bonuses: { unloading: 25, attendance: 25, early: 50 },
              expected: 333.0,
              paid: 333.0,
              difference: 0,
              status: "balanced" as const,
            },
          ],
          totals: {
            consignments: 50,
            basePay: 203,
            pickups: 30,
            bonuses: 100,
            expected: 333,
            paid: 333,
            difference: 0,
          },
          breakdown: {
            consignments: 203,
            pickups: 30,
            unloading: 25,
            attendance: 25,
            early: 50,
            total: 333,
          },
        },
        loading: false,
        isDailyReport: false,
        currentAnalysisId: "analysis-123",
        requestedAnalysisId: null,
      });

      render(<ReportsPage />);

      await waitFor(() => {
        // Status badge should show "Balanced"
        const balancedBadges = screen.getAllByText(/Balanced/i);
        expect(balancedBadges.length).toBeGreaterThan(0);
      });
    });

    it("should consistently map overpaid status", async () => {
      mockUseReportData.mockReturnValue({
        reportData: {
          period: "Week of Jan 1 - Jan 7, 2024",
          reportType: "Weekly Report",
          generatedDate: "January 8, 2024",
          totalDays: 1,
          status: "completed",
          dailyEntries: [
            {
              date: "2024-01-01",
              day: "Monday",
              consignments: 50,
              rate: 4.06,
              basePay: 203.0,
              pickups: 2,
              pickupTotal: 30.0,
              bonuses: { unloading: 25, attendance: 25, early: 50 },
              expected: 333.0,
              paid: 343.0,
              difference: 10,
              status: "overpaid" as const,
            },
          ],
          totals: {
            consignments: 50,
            basePay: 203,
            pickups: 30,
            bonuses: 100,
            expected: 333,
            paid: 343,
            difference: 10,
          },
          breakdown: {
            consignments: 203,
            pickups: 30,
            unloading: 25,
            attendance: 25,
            early: 50,
            total: 333,
          },
        },
        loading: false,
        isDailyReport: false,
        currentAnalysisId: "analysis-123",
        requestedAnalysisId: null,
      });

      render(<ReportsPage />);

      await waitFor(() => {
        // Status badge should show "Overpaid"
        const overpaidBadges = screen.getAllByText(/Overpaid/i);
        expect(overpaidBadges.length).toBeGreaterThan(0);
      });
    });

    it("should consistently map underpaid status", async () => {
      mockUseReportData.mockReturnValue({
        reportData: {
          period: "Week of Jan 1 - Jan 7, 2024",
          reportType: "Weekly Report",
          generatedDate: "January 8, 2024",
          totalDays: 1,
          status: "completed",
          dailyEntries: [
            {
              date: "2024-01-01",
              day: "Monday",
              consignments: 50,
              rate: 4.06,
              basePay: 203.0,
              pickups: 2,
              pickupTotal: 30.0,
              bonuses: { unloading: 25, attendance: 25, early: 50 },
              expected: 333.0,
              paid: 323.0,
              difference: -10,
              status: "underpaid" as const,
            },
          ],
          totals: {
            consignments: 50,
            basePay: 203,
            pickups: 30,
            bonuses: 100,
            expected: 333,
            paid: 323,
            difference: -10,
          },
          breakdown: {
            consignments: 203,
            pickups: 30,
            unloading: 25,
            attendance: 25,
            early: 50,
            total: 333,
          },
        },
        loading: false,
        isDailyReport: false,
        currentAnalysisId: "analysis-123",
        requestedAnalysisId: null,
      });

      render(<ReportsPage />);

      await waitFor(() => {
        // Status badge should show "Underpaid"
        const underpaidBadges = screen.getAllByText(/Underpaid/i);
        expect(underpaidBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Parameter Combinations", () => {
    it("should prioritize day filter over week filter", async () => {
      window.history.replaceState({}, "", "/reports?day=2024-01-08&week=2&analysis=analysis-123");

      mockExtractUrlParameters.mockReturnValue({
        analysisId: "analysis-123",
        dayFilter: "2024-01-08",
        weekFilter: "2",
        startDate: null,
        endDate: null,
      });

      mockUseReportData.mockReturnValue({
        reportData: {
          period: "Monday, 8 January 2024",
          reportType: "Daily Report",
          generatedDate: "January 15, 2024",
          totalDays: 1,
          status: "completed",
          dailyEntries: [],
          totals: {
            consignments: 50,
            basePay: 203,
            pickups: 30,
            bonuses: 100,
            expected: 333,
            paid: 333,
            difference: 0,
          },
          breakdown: {
            consignments: 203,
            pickups: 30,
            unloading: 25,
            attendance: 25,
            early: 50,
            total: 333,
          },
        },
        loading: false,
        isDailyReport: true,
        currentAnalysisId: "analysis-123",
        requestedAnalysisId: "analysis-123",
      });

      render(<ReportsPage />);

      await waitFor(() => {
        // Should show daily report, not weekly
        expect(screen.getByText(/Daily Report/i)).toBeInTheDocument();
      });
    });

    it("should handle missing analysis parameter gracefully", async () => {
      window.history.replaceState({}, "", "/reports?week=2");

      mockExtractUrlParameters.mockReturnValue({
        analysisId: null,
        dayFilter: null,
        weekFilter: "2",
        startDate: null,
        endDate: null,
      });

      mockDetermineFinalParameters.mockReturnValue({
        finalAnalysisId: null,
        finalWeekFilter: "2",
        finalStartDate: null,
        finalEndDate: null,
        weekAnalysisId: null,
        selectedWeek: { week: 2, year: 2024 },
      });

      mockUseReportData.mockReturnValue({
        reportData: null,
        loading: false,
        isDailyReport: false,
        currentAnalysisId: null,
        requestedAnalysisId: null,
      });

      render(<ReportsPage />);

      await waitFor(() => {
        // Should show empty state
        expect(screen.getByText(/No report data available/i)).toBeInTheDocument();
      });
    });

    it("should handle all parameters together", async () => {
      window.history.replaceState(
        {},
        "",
        "/reports?analysis=analysis-123&week=2&start=2024-01-08&end=2024-01-14"
      );

      mockExtractUrlParameters.mockReturnValue({
        analysisId: "analysis-123",
        dayFilter: null,
        weekFilter: "2",
        startDate: "2024-01-08",
        endDate: "2024-01-14",
      });

      mockDetermineFinalParameters.mockReturnValue({
        finalAnalysisId: "analysis-123",
        finalWeekFilter: "2",
        finalStartDate: "2024-01-08",
        finalEndDate: "2024-01-14",
        weekAnalysisId: null,
        selectedWeek: { week: 2, year: 2024 },
      });

      mockUseReportData.mockReturnValue({
        reportData: {
          period: "Week of Jan 8 - Jan 14, 2024",
          reportType: "Weekly Report",
          generatedDate: "January 15, 2024",
          totalDays: 7,
          status: "completed",
          dailyEntries: [],
          totals: {
            consignments: 350,
            basePay: 1421,
            pickups: 210,
            bonuses: 700,
            expected: 2331,
            paid: 2331,
            difference: 0,
          },
          breakdown: {
            consignments: 1421,
            pickups: 210,
            unloading: 175,
            attendance: 175,
            early: 350,
            total: 2331,
          },
        },
        loading: false,
        isDailyReport: false,
        currentAnalysisId: "analysis-123",
        requestedAnalysisId: "analysis-123",
      });

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Weekly Report/i)).toBeInTheDocument();
      });
    });
  });

  describe("Rendering Consistency", () => {
    it("should render consistently for page and modal contexts", async () => {
      // This test ensures both contexts use the same components
      mockUseReportData.mockReturnValue({
        reportData: {
          period: "Week of Jan 1 - Jan 7, 2024",
          reportType: "Weekly Report",
          generatedDate: "January 8, 2024",
          totalDays: 4,
          status: "completed",
          dailyEntries: [
            {
              date: "2024-01-01",
              day: "Monday",
              consignments: 50,
              rate: 4.06,
              basePay: 203.0,
              pickups: 2,
              pickupTotal: 30.0,
              bonuses: { unloading: 25, attendance: 25, early: 50 },
              expected: 333.0,
              paid: 333.0,
              difference: 0,
              status: "balanced" as const,
            },
          ],
          totals: {
            consignments: 50,
            basePay: 203,
            pickups: 30,
            bonuses: 100,
            expected: 333,
            paid: 333,
            difference: 0,
          },
          breakdown: {
            consignments: 203,
            pickups: 30,
            unloading: 25,
            attendance: 25,
            early: 50,
            total: 333,
          },
        },
        loading: false,
        isDailyReport: false,
        currentAnalysisId: "analysis-123",
        requestedAnalysisId: null,
      });

      render(<ReportsPage />);

      await waitFor(() => {
        // Verify shared components are used
        expect(screen.getByText(/Weekly Report/i)).toBeInTheDocument();
        expect(screen.getByText("Expected Total")).toBeInTheDocument();
        expect(screen.getByText(/Settlement Summary/i)).toBeInTheDocument();

        // Verify data display
        expect(screen.getByRole("table")).toBeInTheDocument();
      });
    });
  });
});
