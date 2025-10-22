/**
 * Unit Tests for AnalysisSummary Component
 *
 * Tests coverage:
 * - Component rendering with different data structures
 * - Currency formatting (£ symbol, decimals)
 * - Status indicators (balanced, overpaid, underpaid)
 * - Conditional rendering (detailed vs legacy view)
 * - Button interactions and callbacks
 * - Export functionality (CSV, JSON, Print)
 * - Data validation and edge cases
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisSummary } from "@/components/analysis/results/analysis-summary";
import type {
  DayCalculation,
  PaymentTotals,
  WeekCalculation,
} from "@/lib/services/payment-calculation-service";
import * as exportUtils from "@/lib/utils/export-utils";
import { toast } from "@/lib/utils/toast";
import * as weekReportGenerator from "@/lib/utils/week-report-generator";

// Mock dependencies
vi.mock("@/lib/utils/export-utils", () => ({
  exportToCSV: vi.fn(() => "csv,content"),
  exportToJSON: vi.fn(() => '{"data": "json"}'),
  exportToHTML: vi.fn(() => "<html>content</html>"),
  downloadFile: vi.fn(),
  printHTML: vi.fn(),
  generateExportFilename: vi.fn((_metadata, ext) => `test-file.${ext}`),
}));

vi.mock("@/lib/utils/week-report-generator", () => ({
  WeekReportGenerator: {
    viewWeekReport: vi.fn(),
  },
}));

vi.mock("@/lib/utils/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/utils", () => ({
  generateUUID: vi.fn(() => "test-uuid-123"),
}));

// Mock child components to isolate testing
vi.mock("@/components/analysis/results/kpi-section", () => ({
  KPISection: ({ data }: { data: unknown }) => (
    <div data-testid="kpi-section">KPI Section: {JSON.stringify(data)}</div>
  ),
}));

vi.mock("@/components/analysis/results/weekly-breakdown", () => ({
  WeeklyBreakdown: ({
    weeklyData,
    onWeekReportClick,
  }: {
    weeklyData: WeekCalculation[];
    onWeekReportClick?: (week: WeekCalculation) => void;
  }) => (
    <div data-testid="weekly-breakdown">
      Weekly Breakdown: {weeklyData.length} weeks
      {onWeekReportClick && (
        <button onClick={() => onWeekReportClick(weeklyData[0])}>Week Report</button>
      )}
    </div>
  ),
}));

describe("AnalysisSummary Component", () => {
  // Helper to create mock day calculation
  const createMockDay = (overrides: Partial<DayCalculation> = {}): DayCalculation => ({
    date: "2025-10-08",
    day: "Wednesday",
    consignments: 50,
    rate: 2.0,
    basePayment: 100.0,
    unloadingBonus: 30.0,
    attendanceBonus: 25.0,
    earlyBonus: 50.0,
    totalBonus: 105.0,
    pickupCount: 2,
    pickupTotal: 10.0,
    expectedTotal: 215.0,
    paidAmount: 215.0,
    difference: 0.0,
    ...overrides,
  });

  // Helper to create mock week calculation
  const createMockWeek = (overrides: Partial<WeekCalculation> = {}): WeekCalculation => ({
    weekStart: new Date("2025-10-06"),
    days: [createMockDay()],
    totalExpected: 215.0,
    totalActual: 215.0,
    workingDays: 1,
    totalConsignments: 50,
    totalDifference: 0.0,
    ...overrides,
  });

  // Helper to create mock payment totals
  const createMockTotals = (overrides: Partial<PaymentTotals> = {}): PaymentTotals => ({
    workingDays: 5,
    totalConsignments: 250,
    expectedTotal: 1000.0,
    paidTotal: 1000.0,
    differenceTotal: 0.0,
    baseTotal: 500.0,
    bonusTotal: 450.0,
    unloadingTotal: 150.0,
    attendanceTotal: 125.0,
    earlyTotal: 175.0,
    pickupTotal: 50.0,
    pickupCount: 10,
    ...overrides,
  });

  const mockCallbacks = {
    onViewReport: vi.fn(),
    onNewAnalysis: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render analysis complete header", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      expect(screen.getByText("Analysis Complete")).toBeInTheDocument();
      expect(
        screen.getByText("Your payment data has been processed successfully")
      ).toBeInTheDocument();
    });

    it("should render with minimal legacy data", () => {
      const data = {
        totalActual: 500.0,
        totalExpected: 450.0,
        workingDays: 3,
        totalConsignments: 100,
        averageDaily: 150.0,
        difference: 50.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      expect(screen.getByText("Quick Summary")).toBeInTheDocument();
    });

    it("should render KPI section with enhanced data", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        totals: createMockTotals(),
        weeks: [createMockWeek()],
        days: [createMockDay()],
        overallStatus: "Payment Complete",
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      expect(screen.getByTestId("kpi-section")).toBeInTheDocument();
    });
  });

  describe("Currency Formatting", () => {
    it("should format positive amounts correctly", () => {
      const data = {
        totalActual: 1234.56,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 234.56,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      // Note: formatCurrency uses toFixed(2) without thousands separator
      expect(screen.getByText("£1234.56")).toBeInTheDocument();
      expect(screen.getByText("£1000.00")).toBeInTheDocument();
    });

    it("should format zero amounts correctly", () => {
      const data = {
        totalActual: 0.0,
        totalExpected: 0.0,
        workingDays: 0,
        totalConsignments: 0,
        averageDaily: 0.0,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      // Should find multiple occurrences of £0.00
      const zeroAmounts = screen.getAllByText(/£0\.00/);
      expect(zeroAmounts.length).toBeGreaterThan(0);
    });

    it("should format decimal amounts with exactly 2 decimal places", () => {
      const data = {
        totalActual: 123.4,
        totalExpected: 100.5,
        workingDays: 1,
        totalConsignments: 50,
        averageDaily: 123.4,
        difference: 22.9,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      // Use getAllByText for values that appear multiple times
      const totalActualElements = screen.getAllByText("£123.40");
      expect(totalActualElements.length).toBeGreaterThanOrEqual(1);

      expect(screen.getByText("£100.50")).toBeInTheDocument();
      expect(screen.getByText("+£22.90")).toBeInTheDocument();
    });

    it("should format large amounts correctly", () => {
      const data = {
        totalActual: 99999.99,
        totalExpected: 88888.88,
        workingDays: 30,
        totalConsignments: 5000,
        averageDaily: 3333.33,
        difference: 11111.11,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      // Note: formatCurrency uses toFixed(2) without thousands separator
      expect(screen.getByText("£99999.99")).toBeInTheDocument();
      expect(screen.getByText("£88888.88")).toBeInTheDocument();
    });
  });

  describe("Difference Status Indicators", () => {
    it("should show positive difference with green styling", () => {
      const data = {
        totalActual: 1200.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 200.0,
      };

      const { container } = render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      // Check for positive difference indicator
      expect(screen.getByText("+£200.00")).toBeInTheDocument();
      expect(screen.getByText("📈")).toBeInTheDocument();
      expect(screen.getByText("Above expected")).toBeInTheDocument();

      // Check for green styling
      const differenceElement = container.querySelector(".text-green-600");
      expect(differenceElement).toBeInTheDocument();
    });

    it("should show negative difference with red styling", () => {
      const data = {
        totalActual: 800.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 160.0,
        difference: -200.0,
      };

      const { container } = render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      // Check for negative difference indicator
      expect(screen.getByText("£-200.00")).toBeInTheDocument();
      expect(screen.getByText("📉")).toBeInTheDocument();
      expect(screen.getByText("Below expected")).toBeInTheDocument();

      // Check for red styling
      const differenceElement = container.querySelector(".text-red-600");
      expect(differenceElement).toBeInTheDocument();
    });

    it("should show zero difference as positive", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
      };

      const { container } = render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      // Zero should be treated as positive (>=0)
      expect(screen.getByText("+£0.00")).toBeInTheDocument();
      expect(screen.getByText("📈")).toBeInTheDocument();
      expect(screen.getByText("Above expected")).toBeInTheDocument();

      const differenceElement = container.querySelector(".text-green-600");
      expect(differenceElement).toBeInTheDocument();
    });
  });

  describe("Legacy Summary Cards", () => {
    it("should render all legacy summary cards when no detailed data", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 950.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 50.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      // Check for all card titles
      expect(screen.getByText("Total Actual")).toBeInTheDocument();
      expect(screen.getByText("Total Expected")).toBeInTheDocument();
      expect(screen.getByText("Difference")).toBeInTheDocument();
      expect(screen.getByText("Working Days")).toBeInTheDocument();
      expect(screen.getByText("Total Deliveries")).toBeInTheDocument();
      expect(screen.getByText("Daily Average")).toBeInTheDocument();
    });

    it("should display card descriptions", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      expect(screen.getByText("Amount earned this period")).toBeInTheDocument();
      expect(screen.getByText("Projected earnings")).toBeInTheDocument();
      expect(screen.getByText("Days with earnings")).toBeInTheDocument();
      expect(screen.getByText("Consignments delivered")).toBeInTheDocument();
      expect(screen.getByText("Average per working day")).toBeInTheDocument();
    });

    it("should display emoji icons for each card", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      expect(screen.getByText("💰")).toBeInTheDocument();
      expect(screen.getByText("🎯")).toBeInTheDocument();
      expect(screen.getByText("📅")).toBeInTheDocument();
      expect(screen.getByText("📦")).toBeInTheDocument();
      expect(screen.getByText("📊")).toBeInTheDocument();
    });

    it("should display working days count", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 7,
        totalConsignments: 250,
        averageDaily: 142.86,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("should display total consignments count", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 500,
        averageDaily: 200.0,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      expect(screen.getByText("500")).toBeInTheDocument();
    });
  });

  describe("Conditional Rendering", () => {
    it("should render weekly breakdown when detailed data available", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        totals: createMockTotals(),
        weeks: [createMockWeek()],
        days: [createMockDay()],
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
          showDetailedBreakdown={true}
        />
      );

      expect(screen.getByTestId("weekly-breakdown")).toBeInTheDocument();
      expect(screen.queryByText("Quick Summary")).not.toBeInTheDocument();
    });

    it("should render legacy summary when showDetailedBreakdown is false", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        totals: createMockTotals(),
        weeks: [createMockWeek()],
        days: [createMockDay()],
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
          showDetailedBreakdown={false}
        />
      );

      expect(screen.getByText("Quick Summary")).toBeInTheDocument();
      expect(screen.queryByTestId("weekly-breakdown")).not.toBeInTheDocument();
    });

    it("should render legacy summary when weeks data is empty", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        totals: createMockTotals(),
        weeks: [],
        days: [createMockDay()],
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
          showDetailedBreakdown={true}
        />
      );

      expect(screen.getByText("Quick Summary")).toBeInTheDocument();
      expect(screen.queryByTestId("weekly-breakdown")).not.toBeInTheDocument();
    });

    it("should render legacy summary when weeks data is undefined", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        totals: createMockTotals(),
        days: [createMockDay()],
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
          showDetailedBreakdown={true}
        />
      );

      expect(screen.getByText("Quick Summary")).toBeInTheDocument();
      expect(screen.queryByTestId("weekly-breakdown")).not.toBeInTheDocument();
    });

    it("should show export options when days data exists", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        days: [createMockDay()],
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      expect(screen.getByText("Export Options")).toBeInTheDocument();
      expect(screen.getByText("CSV")).toBeInTheDocument();
      expect(screen.getByText("JSON")).toBeInTheDocument();
      expect(screen.getByText("Print")).toBeInTheDocument();
    });

    it("should hide export options when no days data", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      expect(screen.queryByText("Export Options")).not.toBeInTheDocument();
    });
  });

  describe("Button Actions", () => {
    it("should call onViewReport when View Detailed Report clicked", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      const viewButton = screen.getByText("View Detailed Report");
      fireEvent.click(viewButton);

      expect(mockCallbacks.onViewReport).toHaveBeenCalledTimes(1);
    });

    it("should call onNewAnalysis when Start New Analysis clicked", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      const newButton = screen.getByText("Start New Analysis");
      fireEvent.click(newButton);

      expect(mockCallbacks.onNewAnalysis).toHaveBeenCalledTimes(1);
    });

    it("should allow multiple button clicks", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      const viewButton = screen.getByText("View Detailed Report");
      fireEvent.click(viewButton);
      fireEvent.click(viewButton);
      fireEvent.click(viewButton);

      expect(mockCallbacks.onViewReport).toHaveBeenCalledTimes(3);
    });
  });

  describe("Export Functionality", () => {
    it("should export to CSV when CSV button clicked", async () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        totals: createMockTotals(),
        days: [createMockDay()],
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      const csvButton = screen.getByText("CSV");
      fireEvent.click(csvButton);

      await waitFor(() => {
        expect(exportUtils.exportToCSV).toHaveBeenCalled();
        expect(exportUtils.downloadFile).toHaveBeenCalledWith(
          "csv,content",
          "test-file.csv",
          "text/csv"
        );
      });
    });

    it("should export to JSON when JSON button clicked", async () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        totals: createMockTotals(),
        days: [createMockDay()],
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      const jsonButton = screen.getByText("JSON");
      fireEvent.click(jsonButton);

      await waitFor(() => {
        expect(exportUtils.exportToJSON).toHaveBeenCalled();
        expect(exportUtils.downloadFile).toHaveBeenCalledWith(
          '{"data": "json"}',
          "test-file.json",
          "application/json"
        );
      });
    });

    it("should print when Print button clicked", async () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        totals: createMockTotals(),
        days: [createMockDay()],
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      const printButton = screen.getByText("Print");
      fireEvent.click(printButton);

      await waitFor(() => {
        expect(exportUtils.exportToHTML).toHaveBeenCalled();
        expect(exportUtils.printHTML).toHaveBeenCalledWith("<html>content</html>");
      });
    });

    it("should not export when data is incomplete", async () => {
      // Spy on console.warn to verify warning
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        // Missing totals - export should warn and return
        days: [createMockDay()],
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      const csvButton = screen.getByText("CSV");
      fireEvent.click(csvButton);

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith("Export attempted without complete data");
        expect(exportUtils.exportToCSV).not.toHaveBeenCalled();
      });

      consoleWarnSpy.mockRestore();
    });

    it("should include weeks data in export when available", async () => {
      const weeks = [createMockWeek(), createMockWeek()];
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        totals: createMockTotals(),
        weeks,
        days: [createMockDay()],
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      const csvButton = screen.getByText("CSV");
      fireEvent.click(csvButton);

      await waitFor(() => {
        expect(exportUtils.exportToCSV).toHaveBeenCalledWith(
          expect.objectContaining({
            weeks: expect.arrayContaining([expect.objectContaining({ totalExpected: 215.0 })]),
          })
        );
      });
    });
  });

  describe("Week Report Generation", () => {
    it("should handle week report click", async () => {
      const weeks = [createMockWeek()];
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        totals: createMockTotals(),
        weeks,
        days: [createMockDay()],
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
          showDetailedBreakdown={true}
        />
      );

      // Click week report button in mocked WeeklyBreakdown
      const weekReportButton = screen.getByText("Week Report");
      fireEvent.click(weekReportButton);

      await waitFor(() => {
        expect(weekReportGenerator.WeekReportGenerator.viewWeekReport).toHaveBeenCalledWith(
          weeks[0],
          "test-uuid-123"
        );
        expect(toast.success).toHaveBeenCalledWith("Week report opened in new tab");
      });
    });

    it("should handle week report error gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock error in week report generation
      vi.mocked(weekReportGenerator.WeekReportGenerator.viewWeekReport).mockImplementationOnce(
        () => {
          throw new Error("Report generation failed");
        }
      );

      const weeks = [createMockWeek()];
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
        totals: createMockTotals(),
        weeks,
        days: [createMockDay()],
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
          showDetailedBreakdown={true}
        />
      );

      const weekReportButton = screen.getByText("Week Report");
      fireEvent.click(weekReportButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to generate week report");
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("KPI Data Transformation", () => {
    it("should transform enhanced totals data correctly", () => {
      const totals = createMockTotals({
        workingDays: 10,
        totalConsignments: 500,
        expectedTotal: 2000.0,
        paidTotal: 2100.0,
        differenceTotal: 100.0,
        baseTotal: 1000.0,
        bonusTotal: 900.0,
        pickupTotal: 100.0,
      });

      const data = {
        totalActual: 2100.0,
        totalExpected: 2000.0,
        workingDays: 10,
        totalConsignments: 500,
        averageDaily: 200.0,
        difference: 100.0,
        totals,
        overallStatus: "Favorable",
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      const kpiSection = screen.getByTestId("kpi-section");
      const kpiData = JSON.parse(kpiSection.textContent?.replace("KPI Section: ", ""));

      expect(kpiData.workingDays).toBe(10);
      expect(kpiData.totalConsignments).toBe(500);
      expect(kpiData.expectedTotal).toBe(2000.0);
      expect(kpiData.paidTotal).toBe(2100.0);
      expect(kpiData.differenceTotal).toBe(100.0);
      expect(kpiData.overallStatus).toBe("Favorable");
    });

    it("should fall back to legacy data when totals not available", () => {
      const data = {
        totalActual: 1500.0,
        totalExpected: 1400.0,
        workingDays: 7,
        totalConsignments: 300,
        averageDaily: 200.0,
        difference: 100.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      const kpiSection = screen.getByTestId("kpi-section");
      const kpiData = JSON.parse(kpiSection.textContent?.replace("KPI Section: ", ""));

      expect(kpiData.workingDays).toBe(7);
      expect(kpiData.totalConsignments).toBe(300);
      expect(kpiData.expectedTotal).toBe(1400.0);
      expect(kpiData.paidTotal).toBe(1500.0);
      expect(kpiData.differenceTotal).toBe(100.0);
    });

    it("should set overall status based on difference when not provided", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1100.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: -100.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      const kpiSection = screen.getByTestId("kpi-section");
      const kpiData = JSON.parse(kpiSection.textContent?.replace("KPI Section: ", ""));

      expect(kpiData.overallStatus).toBe("Payment Incomplete - Review Required");
    });

    it("should set favorable status for zero or positive difference", () => {
      const data = {
        totalActual: 1000.0,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      const kpiSection = screen.getByTestId("kpi-section");
      const kpiData = JSON.parse(kpiSection.textContent?.replace("KPI Section: ", ""));

      expect(kpiData.overallStatus).toBe("Payment Complete - Favorable");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small differences", () => {
      const data = {
        totalActual: 1000.01,
        totalExpected: 1000.0,
        workingDays: 5,
        totalConsignments: 250,
        averageDaily: 200.0,
        difference: 0.01,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      expect(screen.getByText("+£0.01")).toBeInTheDocument();
      expect(screen.getByText("📈")).toBeInTheDocument();
    });

    it("should handle very large numbers", () => {
      const data = {
        totalActual: 999999.99,
        totalExpected: 888888.88,
        workingDays: 100,
        totalConsignments: 50000,
        averageDaily: 9999.99,
        difference: 111111.11,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      // Verify large number values are displayed
      const workingDaysElement = screen.getByText("100");
      expect(workingDaysElement).toBeInTheDocument();

      const consignmentsElement = screen.getByText("50000");
      expect(consignmentsElement).toBeInTheDocument();
    });

    it("should handle zero working days", () => {
      const data = {
        totalActual: 0.0,
        totalExpected: 0.0,
        workingDays: 0,
        totalConsignments: 0,
        averageDaily: 0.0,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      // Check for working days and consignments (both are 0)
      const zeroValues = screen.getAllByText("0");
      expect(zeroValues.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle fractional working days in averageDaily calculation", () => {
      const data = {
        totalActual: 333.33,
        totalExpected: 333.33,
        workingDays: 3,
        totalConsignments: 150,
        averageDaily: 111.11,
        difference: 0.0,
      };

      render(
        <AnalysisSummary
          data={data}
          onViewReport={mockCallbacks.onViewReport}
          onNewAnalysis={mockCallbacks.onNewAnalysis}
        />
      );

      expect(screen.getByText("£111.11")).toBeInTheDocument();
    });
  });
});
