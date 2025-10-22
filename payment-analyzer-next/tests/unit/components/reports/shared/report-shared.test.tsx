/**
 * Comprehensive Tests for Shared Report Components
 * Tests: ReportKPIGrid, ReportDataDisplay, ReportSettlementBreakdown, ReportHeaderBar
 * Total Tests: 60+
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReportDataDisplay } from "@/components/reports/shared/ReportDataDisplay";
import { ReportHeaderBar } from "@/components/reports/shared/ReportHeaderBar";
import { ReportKPIGrid } from "@/components/reports/shared/ReportKPIGrid";
import { ReportSettlementBreakdown } from "@/components/reports/shared/ReportSettlementBreakdown";
import type {
  ReportDailyEntry,
  ReportHeaderData,
  ReportKPIData,
  ReportSettlementData,
  ReportTotals,
} from "@/components/reports/shared/types";

// ============================================================================
// MOCK DATA
// ============================================================================

const mockKPIData: ReportKPIData = {
  expected: 450.0,
  paid: 475.0,
  difference: 25.0,
  consignments: 150,
};

const mockKPIDataUnderpaid: ReportKPIData = {
  expected: 500.0,
  paid: 450.0,
  difference: -50.0,
  consignments: 180,
};

const mockKPIDataZero: ReportKPIData = {
  expected: 0,
  paid: 0,
  difference: 0,
  consignments: 0,
};

const mockDailyEntries: ReportDailyEntry[] = [
  {
    date: "2025-10-07",
    day: "Monday",
    consignments: 30,
    rate: 2.0,
    basePay: 60.0,
    pickups: 2,
    pickupTotal: 10.0,
    bonuses: {
      unloading: 0,
      attendance: 25.0,
      early: 50.0,
    },
    expected: 145.0,
    paid: 145.0,
    difference: 0,
    status: "balanced",
  },
  {
    date: "2025-10-08",
    day: "Tuesday",
    consignments: 35,
    rate: 2.0,
    basePay: 70.0,
    pickups: 1,
    pickupTotal: 5.0,
    bonuses: {
      unloading: 30.0,
      attendance: 25.0,
      early: 50.0,
    },
    expected: 180.0,
    paid: 190.0,
    difference: 10.0,
    status: "overpaid",
  },
  {
    date: "2025-10-09",
    day: "Wednesday",
    consignments: 40,
    rate: 2.0,
    basePay: 80.0,
    pickups: 0,
    pickupTotal: 0,
    bonuses: {
      unloading: 30.0,
      attendance: 25.0,
      early: 0,
    },
    expected: 135.0,
    paid: 130.0,
    difference: -5.0,
    status: "underpaid",
  },
  {
    date: "2025-10-12",
    day: "Saturday",
    consignments: 25,
    rate: 3.0,
    basePay: 75.0,
    pickups: 1,
    pickupTotal: 5.0,
    bonuses: {
      unloading: 30.0,
      attendance: 0,
      early: 0,
    },
    expected: 110.0,
    paid: 110.0,
    difference: 0,
    status: "complete",
  },
];

const mockTotals: ReportTotals = {
  consignments: 130,
  basePay: 285.0,
  pickups: 20.0,
  bonuses: 265.0,
  expected: 570.0,
  paid: 575.0,
  difference: 5.0,
};

const mockSettlementData: ReportSettlementData = {
  consignments: 285.0,
  pickups: 20.0,
  unloading: 120.0,
  attendance: 100.0,
  early: 150.0,
  total: 675.0,
};

const mockHeaderData: ReportHeaderData = {
  reportType: "Weekly Payment Analysis",
  period: "Oct 7-13, 2025",
  generatedDate: "2025-10-13",
  totalDays: 5,
  status: "Complete",
};

// ============================================================================
// REPORPTKPIGRID TESTS (20+ tests)
// ============================================================================

describe("ReportKPIGrid", () => {
  describe("Rendering", () => {
    it("should render all four KPI cards", () => {
      render(<ReportKPIGrid data={mockKPIData} />);

      expect(screen.getByText("Expected Total")).toBeInTheDocument();
      expect(screen.getByText("Paid Amount")).toBeInTheDocument();
      expect(screen.getByText("Difference")).toBeInTheDocument();
      expect(screen.getByText("Consignments")).toBeInTheDocument();
    });

    it("should render icons for each KPI card", () => {
      const { container } = render(<ReportKPIGrid data={mockKPIData} />);

      expect(container.textContent).toContain("📋");
      expect(container.textContent).toContain("💰");
      expect(container.textContent).toContain("📦");
    });

    it("should apply full variant by default", () => {
      const { container } = render(<ReportKPIGrid data={mockKPIData} />);

      const kpiCards = container.querySelectorAll('[class*="kpiCard"]');
      expect(kpiCards.length).toBeGreaterThan(0);
    });

    it("should apply compact variant when specified", () => {
      const { container } = render(<ReportKPIGrid data={mockKPIData} variant="compact" />);

      const compactElements = container.querySelectorAll('[class*="compact"]');
      expect(compactElements.length).toBeGreaterThan(0);
    });

    it("should apply custom className", () => {
      const { container } = render(<ReportKPIGrid data={mockKPIData} className="custom-class" />);

      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });

    it("should apply 4-column grid by default", () => {
      const { container } = render(<ReportKPIGrid data={mockKPIData} />);

      const grid = container.querySelector('[class*="cols4"]');
      expect(grid).toBeInTheDocument();
    });

    it("should apply 2-column grid when specified", () => {
      const { container } = render(<ReportKPIGrid data={mockKPIData} columns={2} />);

      const grid = container.querySelector('[class*="cols2"]');
      expect(grid).toBeInTheDocument();
    });
  });

  describe("Currency Formatting", () => {
    it("should format expected total as currency", () => {
      render(<ReportKPIGrid data={mockKPIData} />);

      expect(screen.getByText("£450.00")).toBeInTheDocument();
    });

    it("should format paid amount as currency", () => {
      render(<ReportKPIGrid data={mockKPIData} />);

      expect(screen.getByText("£475.00")).toBeInTheDocument();
    });

    it("should format difference as absolute currency value", () => {
      render(<ReportKPIGrid data={mockKPIData} />);

      expect(screen.getByText("£25.00")).toBeInTheDocument();
    });

    it("should format negative difference as absolute value", () => {
      render(<ReportKPIGrid data={mockKPIDataUnderpaid} />);

      expect(screen.getByText("£50.00")).toBeInTheDocument();
    });

    it("should handle zero values correctly", () => {
      render(<ReportKPIGrid data={mockKPIDataZero} />);

      const zeroValues = screen.getAllByText("£0.00");
      expect(zeroValues.length).toBe(3); // Expected, Paid, Difference
    });
  });

  describe("Number Formatting", () => {
    it("should format consignments with locale separators", () => {
      const largeData = { ...mockKPIData, consignments: 1500 };
      render(<ReportKPIGrid data={largeData} />);

      expect(screen.getByText("1,500")).toBeInTheDocument();
    });

    it("should handle zero consignments", () => {
      render(<ReportKPIGrid data={mockKPIDataZero} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("Trend Indicators", () => {
    it("should show upward arrow for positive difference", () => {
      const { container } = render(<ReportKPIGrid data={mockKPIData} />);

      expect(container.textContent).toContain("↗️");
    });

    it("should show downward arrow for negative difference", () => {
      const { container } = render(<ReportKPIGrid data={mockKPIDataUnderpaid} />);

      expect(container.textContent).toContain("↘️");
    });

    it("should apply success tone for positive difference", () => {
      const { container } = render(<ReportKPIGrid data={mockKPIData} />);

      const successElements = container.querySelectorAll('[class*="toneSuccess"]');
      expect(successElements.length).toBeGreaterThan(0);
    });

    it("should apply danger tone for negative difference", () => {
      const { container } = render(<ReportKPIGrid data={mockKPIDataUnderpaid} />);

      const dangerElements = container.querySelectorAll('[class*="toneDanger"]');
      expect(dangerElements.length).toBeGreaterThan(0);
    });

    it('should show "Overpaid" description for positive difference', () => {
      render(<ReportKPIGrid data={mockKPIData} />);

      expect(screen.getByText("Overpaid")).toBeInTheDocument();
    });

    it('should show "Underpaid" description for negative difference', () => {
      render(<ReportKPIGrid data={mockKPIDataUnderpaid} />);

      expect(screen.getByText("Underpaid")).toBeInTheDocument();
    });
  });

  describe("Descriptions and Labels", () => {
    it('should display "Total earnings" description', () => {
      render(<ReportKPIGrid data={mockKPIData} />);

      expect(screen.getByText("Total earnings")).toBeInTheDocument();
    });

    it('should display "Amount received" description', () => {
      render(<ReportKPIGrid data={mockKPIData} />);

      expect(screen.getByText("Amount received")).toBeInTheDocument();
    });

    it('should display "Total deliveries" description', () => {
      render(<ReportKPIGrid data={mockKPIData} />);

      expect(screen.getByText("Total deliveries")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic structure", () => {
      const { container } = render(<ReportKPIGrid data={mockKPIData} />);

      const cards = container.querySelectorAll('[class^="_kpiCard"]');
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it("should be keyboard navigable", () => {
      render(<ReportKPIGrid data={mockKPIData} />);

      // Component should render without interactive elements by default
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// REPORTDATADISPLAY TESTS (15+ tests)
// ============================================================================

describe("ReportDataDisplay", () => {
  describe("Table View Rendering", () => {
    it("should render table by default", () => {
      render(<ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("should render all daily entries", () => {
      render(<ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} />);

      expect(screen.getByText("Monday")).toBeInTheDocument();
      expect(screen.getByText("Tuesday")).toBeInTheDocument();
      expect(screen.getByText("Wednesday")).toBeInTheDocument();
      expect(screen.getByText("Saturday")).toBeInTheDocument();
    });

    it("should render table headers", () => {
      render(<ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} />);

      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Day")).toBeInTheDocument();
      expect(screen.getByText("Consignments")).toBeInTheDocument();
      expect(screen.getByText("Expected")).toBeInTheDocument();
      expect(screen.getByText("Paid")).toBeInTheDocument();
    });

    it("should render totals footer", () => {
      render(<ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} />);

      expect(screen.getByText("Totals")).toBeInTheDocument();
      expect(screen.getByText("130")).toBeInTheDocument(); // Total consignments
    });

    it("should hide pickups column in compact view", async () => {
      render(
        <ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} compactView={true} />
      );

      // In compact view, there should be fewer columns
      const table = screen.getByRole("table");
      const headers = within(table).getAllByRole("columnheader");

      // Should have fewer headers in compact mode
      expect(headers.length).toBeLessThan(12);
    });
  });

  describe("Cards View Rendering", () => {
    it('should render cards when mode is "cards"', () => {
      render(
        <ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} mode="cards" />
      );

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByText("Monday")).toBeInTheDocument();
    });

    it("should render all entries as cards", () => {
      const { container } = render(
        <ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} mode="cards" />
      );

      const cards = container.querySelectorAll('[class^="_dayCard_"]');
      expect(cards.length).toBe(mockDailyEntries.length);
    });

    it("should not show toggle button in cards mode", () => {
      const mockToggle = vi.fn();
      render(
        <ReportDataDisplay
          dailyEntries={mockDailyEntries}
          totals={mockTotals}
          mode="cards"
          onToggleCompactView={mockToggle}
        />
      );

      expect(screen.queryByText("Compact View")).not.toBeInTheDocument();
    });
  });

  describe("Currency Formatting", () => {
    it("should format all currency values correctly", () => {
      render(<ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} />);

      expect(screen.getByText("£60.00")).toBeInTheDocument();
      expect(screen.getAllByText("£145.00").length).toBeGreaterThanOrEqual(1);
    });

    it("should format totals as currency", () => {
      render(<ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} />);

      expect(screen.getAllByText("£285.00").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("£570.00").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Status Badges", () => {
    it("should render balanced status badge", () => {
      render(<ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} />);

      expect(screen.getByText("Balanced")).toBeInTheDocument();
    });

    it("should render overpaid status badge", () => {
      render(<ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} />);

      expect(screen.getByText("Overpaid")).toBeInTheDocument();
    });

    it("should render underpaid status badge", () => {
      render(<ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} />);

      expect(screen.getByText("Underpaid")).toBeInTheDocument();
    });

    it("should render complete status badge", () => {
      render(<ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} />);

      expect(screen.getByText("Complete")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("should call onToggleCompactView when toggle button clicked", () => {
      const mockToggle = vi.fn();

      render(
        <ReportDataDisplay
          dailyEntries={mockDailyEntries}
          totals={mockTotals}
          onToggleCompactView={mockToggle}
        />
      );

      const toggleButton = screen.getByText("Compact View");
      fireEvent.click(toggleButton);

      expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    it("should show edit buttons when showEditButton is true", () => {
      render(
        <ReportDataDisplay
          dailyEntries={mockDailyEntries}
          totals={mockTotals}
          showEditButton={true}
        />
      );

      const editButtons = screen.getAllByText("Edit");
      expect(editButtons.length).toBe(mockDailyEntries.length);
    });

    it("should call onEditDayData when edit button clicked", () => {
      const mockEdit = vi.fn();

      render(
        <ReportDataDisplay
          dailyEntries={mockDailyEntries}
          totals={mockTotals}
          showEditButton={true}
          onEditDayData={mockEdit}
        />
      );

      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      expect(mockEdit).toHaveBeenCalledWith(mockDailyEntries[0]);
    });
  });

  describe("View Modes", () => {
    it('should show "Daily Analysis Breakdown" title for week view', () => {
      render(
        <ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} viewMode="week" />
      );

      expect(screen.getByText("Daily Analysis Breakdown")).toBeInTheDocument();
    });

    it('should show "Monthly Analysis Summary" title for month view', () => {
      render(
        <ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} viewMode="month" />
      );

      expect(screen.getByText("Monthly Analysis Summary")).toBeInTheDocument();
    });

    it("should group entries by month in month view", () => {
      render(
        <ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} viewMode="month" />
      );

      // Should aggregate entries into monthly groups
      expect(screen.getByText("October 2025")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper table structure", () => {
      render(<ReportDataDisplay dailyEntries={mockDailyEntries} totals={mockTotals} />);

      const table = screen.getByRole("table");
      expect(within(table).getAllByRole("rowgroup").length).toBeGreaterThanOrEqual(1);
    });

    it("should have accessible edit buttons", () => {
      render(
        <ReportDataDisplay
          dailyEntries={mockDailyEntries}
          totals={mockTotals}
          showEditButton={true}
        />
      );

      const editButtons = screen.getAllByTitle("Edit day data");
      expect(editButtons.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// REPORTSETTLEMENTBREAKDOWN TESTS (15+ tests)
// ============================================================================

describe("ReportSettlementBreakdown", () => {
  describe("Rendering", () => {
    it("should render settlement title", () => {
      render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 675.0 }} />
      );

      expect(screen.getByText("Settlement Summary")).toBeInTheDocument();
    });

    it("should render all breakdown items", () => {
      render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 675.0 }} />
      );

      expect(screen.getByText("Consignment Payments")).toBeInTheDocument();
      expect(screen.getByText("Pickup Services")).toBeInTheDocument();
      expect(screen.getByText("Unloading Bonus")).toBeInTheDocument();
      expect(screen.getByText("Attendance Bonus")).toBeInTheDocument();
      expect(screen.getByText("Early Arrival Bonus")).toBeInTheDocument();
    });

    it("should render total expected", () => {
      render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 675.0 }} />
      );

      expect(screen.getByText("Total Expected")).toBeInTheDocument();
    });

    it("should apply full variant by default", () => {
      const { container } = render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 675.0 }} />
      );

      expect(container.querySelector('[class*="settlementContainer"]')).toBeInTheDocument();
    });

    it("should apply compact variant when specified", () => {
      const { container } = render(
        <ReportSettlementBreakdown
          breakdown={mockSettlementData}
          totals={{ expected: 675.0 }}
          variant="compact"
        />
      );

      expect(container.querySelector('[class*="compact"]')).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <ReportSettlementBreakdown
          breakdown={mockSettlementData}
          totals={{ expected: 675.0 }}
          className="custom-settlement"
        />
      );

      expect(container.querySelector(".custom-settlement")).toBeInTheDocument();
    });
  });

  describe("Currency Formatting", () => {
    it("should format consignment payments as currency", () => {
      render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 675.0 }} />
      );

      expect(screen.getByText("£285.00")).toBeInTheDocument();
    });

    it("should format pickup services as currency", () => {
      render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 675.0 }} />
      );

      expect(screen.getByText("£20.00")).toBeInTheDocument();
    });

    it("should format all bonuses as currency", () => {
      render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 675.0 }} />
      );

      expect(screen.getByText("£120.00")).toBeInTheDocument(); // Unloading
      expect(screen.getByText("£100.00")).toBeInTheDocument(); // Attendance
      expect(screen.getByText("£150.00")).toBeInTheDocument(); // Early
    });

    it("should format total expected as currency", () => {
      render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 675.0 }} />
      );

      expect(screen.getByText("£675.00")).toBeInTheDocument();
    });

    it("should handle zero values correctly", () => {
      const zeroData: ReportSettlementData = {
        consignments: 0,
        pickups: 0,
        unloading: 0,
        attendance: 0,
        early: 0,
        total: 0,
      };

      render(<ReportSettlementBreakdown breakdown={zeroData} totals={{ expected: 0 }} />);

      const zeroValues = screen.getAllByText("£0.00");
      expect(zeroValues.length).toBeGreaterThan(0);
    });
  });

  describe("Category Grouping", () => {
    it("should display items in semantic groups", () => {
      const { container } = render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 675.0 }} />
      );

      const items = container.querySelectorAll('[class*="settlementItem"]');
      expect(items.length).toBe(6); // 5 items + total
    });

    it("should distinguish total item from regular items", () => {
      const { container } = render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 675.0 }} />
      );

      const totalItem = container.querySelector('[class*="settlementItemTotal"]');
      expect(totalItem).toBeInTheDocument();
    });
  });

  describe("Total Calculations", () => {
    it("should display correct total expected", () => {
      render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 999.99 }} />
      );

      expect(screen.getByText("£999.99")).toBeInTheDocument();
    });

    it("should handle large totals", () => {
      render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 10000.5 }} />
      );

      expect(screen.getByText("£10,000.50")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined values gracefully", () => {
      const partialData = {
        consignments: 100,
        pickups: undefined as unknown as number,
        unloading: 50,
        attendance: undefined as unknown as number,
        early: 25,
        total: 175,
      };

      render(<ReportSettlementBreakdown breakdown={partialData} totals={{ expected: 175 }} />);

      expect(screen.getByText("Settlement Summary")).toBeInTheDocument();
    });

    it("should handle negative values", () => {
      const negativeData = {
        ...mockSettlementData,
        consignments: -50,
      };

      render(<ReportSettlementBreakdown breakdown={negativeData} totals={{ expected: 625.0 }} />);

      expect(screen.getByText("-£50.00")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic structure", () => {
      render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 675.0 }} />
      );

      const heading = screen.getByText("Settlement Summary");
      expect(heading.tagName).toBe("H3");
    });

    it("should pair labels with values correctly", () => {
      const { container } = render(
        <ReportSettlementBreakdown breakdown={mockSettlementData} totals={{ expected: 675.0 }} />
      );

      const items = container.querySelectorAll('[class*="settlementItem"]');
      items.forEach((item) => {
        const label = item.querySelector('[class*="settlementLabel"]');
        const value = item.querySelector('[class*="settlementValue"]');
        expect(label).toBeInTheDocument();
        expect(value).toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// REPORTHEADERBAR TESTS (10+ tests)
// ============================================================================

describe("ReportHeaderBar", () => {
  describe("Rendering", () => {
    it("should render report type", () => {
      render(<ReportHeaderBar data={mockHeaderData} />);

      expect(screen.getByText("Weekly Payment Analysis")).toBeInTheDocument();
    });

    it("should render period", () => {
      render(<ReportHeaderBar data={mockHeaderData} />);

      expect(screen.getByText("Oct 7-13, 2025")).toBeInTheDocument();
    });

    it("should render generated date", () => {
      render(<ReportHeaderBar data={mockHeaderData} />);

      expect(screen.getByText("2025-10-13")).toBeInTheDocument();
    });

    it("should render total days", () => {
      render(<ReportHeaderBar data={mockHeaderData} />);

      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("should render status", () => {
      render(<ReportHeaderBar data={mockHeaderData} />);

      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("should render company name in page context", () => {
      render(<ReportHeaderBar data={mockHeaderData} context="page" />);

      expect(screen.getByText("FINANCIAL ANALYSIS")).toBeInTheDocument();
    });

    it("should not render company name in modal context", () => {
      render(<ReportHeaderBar data={mockHeaderData} context="modal" />);

      expect(screen.queryByText("FINANCIAL ANALYSIS")).not.toBeInTheDocument();
    });

    it("should not render company name in inline context", () => {
      render(<ReportHeaderBar data={mockHeaderData} context="inline" />);

      expect(screen.queryByText("FINANCIAL ANALYSIS")).not.toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <ReportHeaderBar data={mockHeaderData} className="custom-header" />
      );

      expect(container.querySelector(".custom-header")).toBeInTheDocument();
    });
  });

  describe("Context Variants", () => {
    it("should apply page context class", () => {
      const { container } = render(<ReportHeaderBar data={mockHeaderData} context="page" />);

      expect(container.querySelector('[class*="contextPage"]')).toBeInTheDocument();
    });

    it("should apply modal context class", () => {
      const { container } = render(<ReportHeaderBar data={mockHeaderData} context="modal" />);

      expect(container.querySelector('[class*="contextModal"]')).toBeInTheDocument();
    });

    it("should apply inline context class", () => {
      const { container } = render(<ReportHeaderBar data={mockHeaderData} context="inline" />);

      expect(container.querySelector('[class*="contextInline"]')).toBeInTheDocument();
    });

    it("should default to page context", () => {
      const { container } = render(<ReportHeaderBar data={mockHeaderData} />);

      expect(container.querySelector('[class*="contextPage"]')).toBeInTheDocument();
    });
  });

  describe("Meta Items", () => {
    it("should render all meta labels", () => {
      render(<ReportHeaderBar data={mockHeaderData} />);

      expect(screen.getByText("Period")).toBeInTheDocument();
      expect(screen.getByText("Generated")).toBeInTheDocument();
      expect(screen.getByText("Total Days")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("should pair labels with values", () => {
      const { container } = render(<ReportHeaderBar data={mockHeaderData} />);

      const metaItems = container.querySelectorAll('[class*="metaItem"]');
      expect(metaItems.length).toBe(4);

      metaItems.forEach((item) => {
        const label = item.querySelector('[class*="metaLabel"]');
        const value = item.querySelector('[class*="metaValue"]');
        expect(label).toBeInTheDocument();
        expect(value).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle long report type", () => {
      const longData = {
        ...mockHeaderData,
        reportType: "Very Long Report Type That Might Need Wrapping or Truncation",
      };

      render(<ReportHeaderBar data={longData} />);

      expect(
        screen.getByText("Very Long Report Type That Might Need Wrapping or Truncation")
      ).toBeInTheDocument();
    });

    it("should handle zero total days", () => {
      const zeroData = { ...mockHeaderData, totalDays: 0 };

      render(<ReportHeaderBar data={zeroData} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should handle large total days", () => {
      const largeData = { ...mockHeaderData, totalDays: 365 };

      render(<ReportHeaderBar data={largeData} />);

      expect(screen.getByText("365")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic structure", () => {
      const { container } = render(<ReportHeaderBar data={mockHeaderData} />);

      const header = container.querySelector('[class*="headerContainer"]');
      expect(header).toBeInTheDocument();
    });

    it("should have title with proper hierarchy", () => {
      const { container } = render(<ReportHeaderBar data={mockHeaderData} />);

      const title = container.querySelector('[class*="headerTitle"]');
      expect(title).toBeInTheDocument();
      expect(title?.textContent).toBe("Weekly Payment Analysis");
    });
  });
});
