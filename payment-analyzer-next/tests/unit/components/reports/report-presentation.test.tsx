/**
 * Unit Tests for Report Presentation Components
 * Tests ReportHeader, SettlementSummary, and ReportLoadingState
 */

import { describe, expect, it } from "vitest";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportLoadingState } from "@/components/reports/ReportLoadingState";
import { SettlementSummary } from "@/components/reports/SettlementSummary";
import { render, screen } from "@/tests/utils/test-utils";

describe("ReportHeader", () => {
  const defaultProps = {
    reportType: "Weekly Payment Analysis",
    period: "2024-01-01 to 2024-01-07",
    generatedDate: "2024-01-08",
    totalDays: 7,
    status: "Completed",
  };

  describe("Basic Rendering", () => {
    it("should render without errors", () => {
      render(<ReportHeader {...defaultProps} />);
      expect(screen.getByText("FINANCIAL ANALYSIS")).toBeInTheDocument();
    });

    it("should display FINANCIAL ANALYSIS header", () => {
      render(<ReportHeader {...defaultProps} />);
      const header = screen.getByText("FINANCIAL ANALYSIS");
      expect(header).toBeInTheDocument();
    });

    it("should display report type", () => {
      render(<ReportHeader {...defaultProps} />);
      expect(screen.getByText("Weekly Payment Analysis")).toBeInTheDocument();
    });

    it("should display period", () => {
      render(<ReportHeader {...defaultProps} />);
      expect(screen.getByText("2024-01-01 to 2024-01-07")).toBeInTheDocument();
    });

    it("should display generated date", () => {
      render(<ReportHeader {...defaultProps} />);
      expect(screen.getByText("2024-01-08")).toBeInTheDocument();
    });

    it("should display total days as string", () => {
      render(<ReportHeader {...defaultProps} />);
      expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("should display status", () => {
      render(<ReportHeader {...defaultProps} />);
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  describe("MetaItem Labels", () => {
    it("should display Period label", () => {
      render(<ReportHeader {...defaultProps} />);
      expect(screen.getByText("Period")).toBeInTheDocument();
    });

    it("should display Generated label", () => {
      render(<ReportHeader {...defaultProps} />);
      expect(screen.getByText("Generated")).toBeInTheDocument();
    });

    it("should display Total Days label", () => {
      render(<ReportHeader {...defaultProps} />);
      expect(screen.getByText("Total Days")).toBeInTheDocument();
    });

    it("should display Status label", () => {
      render(<ReportHeader {...defaultProps} />);
      expect(screen.getByText("Status")).toBeInTheDocument();
    });
  });

  describe("Different Report Types", () => {
    it("should render daily report type", () => {
      render(<ReportHeader {...defaultProps} reportType="Daily Payment Summary" />);
      expect(screen.getByText("Daily Payment Summary")).toBeInTheDocument();
    });

    it("should render monthly report type", () => {
      render(<ReportHeader {...defaultProps} reportType="Monthly Revenue Report" />);
      expect(screen.getByText("Monthly Revenue Report")).toBeInTheDocument();
    });

    it("should render custom report type", () => {
      render(<ReportHeader {...defaultProps} reportType="Q1 2024 Financial Analysis" />);
      expect(screen.getByText("Q1 2024 Financial Analysis")).toBeInTheDocument();
    });
  });

  describe("Different Status Values", () => {
    it("should display Completed status", () => {
      render(<ReportHeader {...defaultProps} status="Completed" />);
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("should display Pending status", () => {
      render(<ReportHeader {...defaultProps} status="Pending" />);
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("should display Draft status", () => {
      render(<ReportHeader {...defaultProps} status="Draft" />);
      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("should display Approved status", () => {
      render(<ReportHeader {...defaultProps} status="Approved" />);
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });

    it("should display custom status", () => {
      render(<ReportHeader {...defaultProps} status="Under Review" />);
      expect(screen.getByText("Under Review")).toBeInTheDocument();
    });
  });

  describe("Edge Cases and Special Values", () => {
    it("should handle empty report type", () => {
      render(<ReportHeader {...defaultProps} reportType="" />);
      expect(screen.getByText("FINANCIAL ANALYSIS")).toBeInTheDocument();
    });

    it("should handle very long report type", () => {
      const longType =
        "Very Long Report Type Name That Should Still Display Correctly Without Breaking Layout";
      render(<ReportHeader {...defaultProps} reportType={longType} />);
      expect(screen.getByText(longType)).toBeInTheDocument();
    });

    it("should handle special characters in report type", () => {
      render(<ReportHeader {...defaultProps} reportType="Report & Analysis - Q1/2024 (Final)" />);
      expect(screen.getByText("Report & Analysis - Q1/2024 (Final)")).toBeInTheDocument();
    });

    it("should handle very long period string", () => {
      const longPeriod = "2024-01-01 to 2024-12-31 (Full Year Analysis with Extended Notes)";
      render(<ReportHeader {...defaultProps} period={longPeriod} />);
      expect(screen.getByText(longPeriod)).toBeInTheDocument();
    });

    it("should handle zero total days", () => {
      render(<ReportHeader {...defaultProps} totalDays={0} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should handle large total days", () => {
      render(<ReportHeader {...defaultProps} totalDays={365} />);
      expect(screen.getByText("365")).toBeInTheDocument();
    });

    it("should handle empty status", () => {
      render(<ReportHeader {...defaultProps} status="" />);
      const statusLabel = screen.getByText("Status");
      expect(statusLabel).toBeInTheDocument();
    });

    it("should handle unicode characters in period", () => {
      render(<ReportHeader {...defaultProps} period="2024年1月1日 → 2024年1月7日" />);
      expect(screen.getByText("2024年1月1日 → 2024年1月7日")).toBeInTheDocument();
    });
  });

  describe("CSS Classes and Styling", () => {
    it("should have report-header class", () => {
      const { container } = render(<ReportHeader {...defaultProps} />);
      const header = container.querySelector(".report-header");
      expect(header).toBeInTheDocument();
    });

    it("should have enhanced-header class", () => {
      const { container } = render(<ReportHeader {...defaultProps} />);
      const header = container.querySelector(".enhanced-header");
      expect(header).toBeInTheDocument();
    });

    it("should have report-company class", () => {
      const { container } = render(<ReportHeader {...defaultProps} />);
      const company = container.querySelector(".report-company");
      expect(company).toBeInTheDocument();
    });

    it("should have report-meta class", () => {
      const { container } = render(<ReportHeader {...defaultProps} />);
      const meta = container.querySelector(".report-meta");
      expect(meta).toBeInTheDocument();
    });

    it("should have report-meta-item classes", () => {
      const { container } = render(<ReportHeader {...defaultProps} />);
      const items = container.querySelectorAll(".report-meta-item");
      expect(items.length).toBe(4); // Period, Generated, Total Days, Status
    });
  });

  describe("Accessibility", () => {
    it("should be accessible with semantic HTML", () => {
      const { container } = render(<ReportHeader {...defaultProps} />);
      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("should render meta items with label-value structure", () => {
      const { container } = render(<ReportHeader {...defaultProps} />);
      const labels = container.querySelectorAll(".report-meta-label");
      const values = container.querySelectorAll(".report-meta-value");
      expect(labels.length).toBe(4);
      expect(values.length).toBe(4);
    });
  });
});

describe("SettlementSummary", () => {
  const defaultProps = {
    breakdown: {
      consignments: 500.0,
      pickups: 150.0,
      unloading: 90.0,
      attendance: 75.0,
      early: 50.0,
      total: 865.0,
    },
    totals: {
      expected: 865.0,
    },
  };

  describe("Basic Rendering", () => {
    it("should render without errors", () => {
      render(<SettlementSummary {...defaultProps} />);
      expect(screen.getByText("Settlement Summary")).toBeInTheDocument();
    });

    it("should display Settlement Summary title", () => {
      render(<SettlementSummary {...defaultProps} />);
      const title = screen.getByText("Settlement Summary");
      expect(title).toBeInTheDocument();
    });

    it("should display all breakdown items", () => {
      render(<SettlementSummary {...defaultProps} />);
      expect(screen.getByText("Consignment Payments")).toBeInTheDocument();
      expect(screen.getByText("Pickup Services")).toBeInTheDocument();
      expect(screen.getByText("Unloading Bonus")).toBeInTheDocument();
      expect(screen.getByText("Attendance Bonus")).toBeInTheDocument();
      expect(screen.getByText("Early Arrival Bonus")).toBeInTheDocument();
    });

    it("should display Total Expected", () => {
      render(<SettlementSummary {...defaultProps} />);
      expect(screen.getByText("Total Expected")).toBeInTheDocument();
    });
  });

  describe("Currency Formatting", () => {
    it("should display consignments with currency symbol", () => {
      render(<SettlementSummary {...defaultProps} />);
      expect(screen.getByText("£500.00")).toBeInTheDocument();
    });

    it("should display pickups with currency symbol", () => {
      render(<SettlementSummary {...defaultProps} />);
      expect(screen.getByText("£150.00")).toBeInTheDocument();
    });

    it("should display unloading with currency symbol", () => {
      render(<SettlementSummary {...defaultProps} />);
      expect(screen.getByText("£90.00")).toBeInTheDocument();
    });

    it("should display attendance with currency symbol", () => {
      render(<SettlementSummary {...defaultProps} />);
      expect(screen.getByText("£75.00")).toBeInTheDocument();
    });

    it("should display early with currency symbol", () => {
      render(<SettlementSummary {...defaultProps} />);
      expect(screen.getByText("£50.00")).toBeInTheDocument();
    });

    it("should display total with currency symbol", () => {
      render(<SettlementSummary {...defaultProps} />);
      const totalElements = screen.getAllByText("£865.00");
      expect(totalElements.length).toBeGreaterThan(0);
    });

    it("should format to 2 decimal places", () => {
      const props = {
        breakdown: {
          consignments: 123.456,
          pickups: 78.901,
          unloading: 45.678,
          attendance: 12.345,
          early: 6.789,
          total: 267.169,
        },
        totals: { expected: 267.17 },
      };
      render(<SettlementSummary {...props} />);
      expect(screen.getByText("£123.46")).toBeInTheDocument();
      expect(screen.getByText("£78.90")).toBeInTheDocument();
      expect(screen.getByText("£45.68")).toBeInTheDocument();
    });
  });

  describe("Zero Value Handling", () => {
    it("should display zero consignments correctly", () => {
      const props = {
        ...defaultProps,
        breakdown: { ...defaultProps.breakdown, consignments: 0 },
      };
      render(<SettlementSummary {...props} />);
      expect(screen.getByText("£0.00")).toBeInTheDocument();
    });

    it("should handle all zero values", () => {
      const props = {
        breakdown: {
          consignments: 0,
          pickups: 0,
          unloading: 0,
          attendance: 0,
          early: 0,
          total: 0,
        },
        totals: { expected: 0 },
      };
      render(<SettlementSummary {...props} />);
      const zeroElements = screen.getAllByText("£0.00");
      expect(zeroElements.length).toBe(6); // 5 items + 1 total
    });

    it("should handle undefined values as zero", () => {
      const props = {
        breakdown: {
          consignments: undefined as unknown as number,
          pickups: undefined as unknown as number,
          unloading: undefined as unknown as number,
          attendance: undefined as unknown as number,
          early: undefined as unknown as number,
          total: undefined as unknown as number,
        },
        totals: { expected: 0 },
      };
      render(<SettlementSummary {...props} />);
      const zeroElements = screen.getAllByText("£0.00");
      expect(zeroElements.length).toBe(6);
    });

    it("should handle null values as zero", () => {
      const props = {
        breakdown: {
          consignments: null as unknown as number,
          pickups: null as unknown as number,
          unloading: null as unknown as number,
          attendance: null as unknown as number,
          early: null as unknown as number,
          total: null as unknown as number,
        },
        totals: { expected: 0 },
      };
      render(<SettlementSummary {...props} />);
      const zeroElements = screen.getAllByText("£0.00");
      expect(zeroElements.length).toBe(6);
    });
  });

  describe("Large Value Formatting", () => {
    it("should handle large consignment values", () => {
      const props = {
        ...defaultProps,
        breakdown: { ...defaultProps.breakdown, consignments: 9999.99 },
      };
      render(<SettlementSummary {...props} />);
      expect(screen.getByText("£9999.99")).toBeInTheDocument();
    });

    it("should handle very large totals", () => {
      const props = {
        breakdown: {
          consignments: 10000.0,
          pickups: 5000.0,
          unloading: 2000.0,
          attendance: 1500.0,
          early: 1000.0,
          total: 19500.0,
        },
        totals: { expected: 19500.0 },
      };
      render(<SettlementSummary {...props} />);
      expect(screen.getByText("£10000.00")).toBeInTheDocument();
      const totalElements = screen.getAllByText("£19500.00");
      expect(totalElements.length).toBeGreaterThan(0);
    });

    it("should handle five-digit values", () => {
      const props = {
        ...defaultProps,
        breakdown: { ...defaultProps.breakdown, consignments: 12345.67 },
      };
      render(<SettlementSummary {...props} />);
      expect(screen.getByText("£12345.67")).toBeInTheDocument();
    });
  });

  describe("Negative Value Handling", () => {
    it("should display negative consignments", () => {
      const props = {
        ...defaultProps,
        breakdown: { ...defaultProps.breakdown, consignments: -100.0 },
      };
      render(<SettlementSummary {...props} />);
      expect(screen.getByText("£-100.00")).toBeInTheDocument();
    });

    it("should display negative total", () => {
      const props = {
        breakdown: {
          consignments: -500.0,
          pickups: 0,
          unloading: 0,
          attendance: 0,
          early: 0,
          total: -500.0,
        },
        totals: { expected: -500.0 },
      };
      render(<SettlementSummary {...props} />);
      const negativeElements = screen.getAllByText("£-500.00");
      expect(negativeElements.length).toBeGreaterThan(0);
    });

    it("should handle mixed positive and negative values", () => {
      const props = {
        breakdown: {
          consignments: 500.0,
          pickups: -100.0,
          unloading: 90.0,
          attendance: -50.0,
          early: 50.0,
          total: 490.0,
        },
        totals: { expected: 490.0 },
      };
      render(<SettlementSummary {...props} />);
      expect(screen.getByText("£500.00")).toBeInTheDocument();
      expect(screen.getByText("£-100.00")).toBeInTheDocument();
      expect(screen.getByText("£-50.00")).toBeInTheDocument();
    });
  });

  describe("CSS Classes and Styling", () => {
    it("should have settlement-breakdown class", () => {
      const { container } = render(<SettlementSummary {...defaultProps} />);
      const breakdown = container.querySelector(".settlement-breakdown");
      expect(breakdown).toBeInTheDocument();
    });

    it("should have breakdown-title class", () => {
      const { container } = render(<SettlementSummary {...defaultProps} />);
      const title = container.querySelector(".breakdown-title");
      expect(title).toBeInTheDocument();
    });

    it("should have breakdown-grid class", () => {
      const { container } = render(<SettlementSummary {...defaultProps} />);
      const grid = container.querySelector(".breakdown-grid");
      expect(grid).toBeInTheDocument();
    });

    it("should have breakdown-item classes", () => {
      const { container } = render(<SettlementSummary {...defaultProps} />);
      const items = container.querySelectorAll(".breakdown-item");
      expect(items.length).toBe(6); // 5 regular items + 1 total
    });

    it("should have breakdown-total class", () => {
      const { container } = render(<SettlementSummary {...defaultProps} />);
      const total = container.querySelector(".breakdown-total");
      expect(total).toBeInTheDocument();
    });

    it("should have breakdown-label classes", () => {
      const { container } = render(<SettlementSummary {...defaultProps} />);
      const labels = container.querySelectorAll(".breakdown-label");
      expect(labels.length).toBe(6);
    });

    it("should have breakdown-value classes", () => {
      const { container } = render(<SettlementSummary {...defaultProps} />);
      const values = container.querySelectorAll(".breakdown-value");
      expect(values.length).toBe(6);
    });

    it("should apply hover transition classes", () => {
      const { container } = render(<SettlementSummary {...defaultProps} />);
      const items = container.querySelectorAll(".breakdown-item");
      items.forEach((item) => {
        expect(item.className).toContain("transition-all");
      });
    });
  });

  describe("Accessibility", () => {
    it("should have semantic heading for title", () => {
      const { container } = render(<SettlementSummary {...defaultProps} />);
      const heading = container.querySelector("h3");
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toBe("Settlement Summary");
    });

    it("should have label-value pairs for each item", () => {
      const { container } = render(<SettlementSummary {...defaultProps} />);
      const labels = container.querySelectorAll(".breakdown-label");
      const values = container.querySelectorAll(".breakdown-value");
      expect(labels.length).toBe(values.length);
    });

    it("should render items in consistent order", () => {
      render(<SettlementSummary {...defaultProps} />);
      const labels = [
        "Consignment Payments",
        "Pickup Services",
        "Unloading Bonus",
        "Attendance Bonus",
        "Early Arrival Bonus",
      ];
      labels.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });
});

describe("ReportLoadingState", () => {
  describe("Basic Rendering", () => {
    it("should render without errors", () => {
      render(<ReportLoadingState />);
      expect(screen.getByText("Reports")).toBeInTheDocument();
    });

    it("should display Reports heading", () => {
      render(<ReportLoadingState />);
      const heading = screen.getByText("Reports");
      expect(heading).toBeInTheDocument();
    });

    it("should display loading message", () => {
      render(<ReportLoadingState />);
      expect(screen.getByText("Loading report data...")).toBeInTheDocument();
    });

    it("should render heading as h1", () => {
      const { container } = render(<ReportLoadingState />);
      const h1 = container.querySelector("h1");
      expect(h1).toBeInTheDocument();
      expect(h1?.textContent).toBe("Reports");
    });

    it("should render loading text as paragraph", () => {
      const { container } = render(<ReportLoadingState />);
      const paragraph = container.querySelector("p");
      expect(paragraph).toBeInTheDocument();
      expect(paragraph?.textContent).toBe("Loading report data...");
    });
  });

  describe("Skeleton UI Elements", () => {
    it("should render skeleton containers", () => {
      const { container } = render(<ReportLoadingState />);
      const skeletons = container.querySelectorAll(".bg-slate-200");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should render header skeleton", () => {
      const { container } = render(<ReportLoadingState />);
      const headerSkeleton = container.querySelector(".h-48");
      expect(headerSkeleton).toBeInTheDocument();
    });

    it("should render grid of 4 card skeletons", () => {
      const { container } = render(<ReportLoadingState />);
      const grid = container.querySelector(".grid-cols-4");
      expect(grid).toBeInTheDocument();
      const cards = grid?.querySelectorAll(".h-24");
      expect(cards?.length).toBe(4);
    });

    it("should render large content skeleton", () => {
      const { container } = render(<ReportLoadingState />);
      const contentSkeleton = container.querySelector(".h-96");
      expect(contentSkeleton).toBeInTheDocument();
    });

    it("should have rounded corners on skeletons", () => {
      const { container } = render(<ReportLoadingState />);
      const skeletons = container.querySelectorAll(".bg-slate-200");
      skeletons.forEach((skeleton) => {
        expect(skeleton.className).toContain("rounded-lg");
      });
    });
  });

  describe("Animation and Loading Indicators", () => {
    it("should have animate-pulse class", () => {
      const { container } = render(<ReportLoadingState />);
      const pulseContainer = container.querySelector(".animate-pulse");
      expect(pulseContainer).toBeInTheDocument();
    });

    it("should have space-y-4 class for vertical spacing", () => {
      const { container } = render(<ReportLoadingState />);
      const spaceContainer = container.querySelector(".space-y-4");
      expect(spaceContainer).toBeInTheDocument();
    });

    it("should have isolation style", () => {
      const { container } = render(<ReportLoadingState />);
      const pulseContainer = container.querySelector(".animate-pulse");
      expect(pulseContainer).toHaveStyle({ isolation: "isolate" });
    });

    it("should have contain layout style", () => {
      const { container } = render(<ReportLoadingState />);
      const pulseContainer = container.querySelector(".animate-pulse");
      expect(pulseContainer).toHaveStyle({ contain: "layout" });
    });
  });

  describe("Responsive Layout", () => {
    it("should have flex-col on mobile", () => {
      const { container } = render(<ReportLoadingState />);
      const flexContainer = container.querySelector(".flex-col");
      expect(flexContainer).toBeInTheDocument();
    });

    it("should have sm:flex-row for larger screens", () => {
      const { container } = render(<ReportLoadingState />);
      const flexContainer = container.querySelector(".sm\\:flex-row");
      expect(flexContainer).toBeInTheDocument();
    });

    it("should have sm:items-center for alignment", () => {
      const { container } = render(<ReportLoadingState />);
      const centered = container.querySelector(".sm\\:items-center");
      expect(centered).toBeInTheDocument();
    });

    it("should have sm:justify-between for spacing", () => {
      const { container } = render(<ReportLoadingState />);
      const justified = container.querySelector(".sm\\:justify-between");
      expect(justified).toBeInTheDocument();
    });

    it("should have gap-4 in grid", () => {
      const { container } = render(<ReportLoadingState />);
      const grid = container.querySelector(".gap-4");
      expect(grid).toBeInTheDocument();
    });
  });

  describe("CSS Classes", () => {
    it("should have space-y-6 root class", () => {
      const { container } = render(<ReportLoadingState />);
      const root = container.querySelector(".space-y-6");
      expect(root).toBeInTheDocument();
    });

    it("should have text-2xl on heading", () => {
      const { container } = render(<ReportLoadingState />);
      const heading = container.querySelector(".text-2xl");
      expect(heading).toBeInTheDocument();
    });

    it("should have font-bold on heading", () => {
      const { container } = render(<ReportLoadingState />);
      const heading = container.querySelector(".font-bold");
      expect(heading).toBeInTheDocument();
    });

    it("should have text-slate-900 on heading", () => {
      const { container } = render(<ReportLoadingState />);
      const heading = container.querySelector(".text-slate-900");
      expect(heading).toBeInTheDocument();
    });

    it("should have text-slate-600 on loading text", () => {
      const { container } = render(<ReportLoadingState />);
      const loadingText = container.querySelector(".text-slate-600");
      expect(loadingText).toBeInTheDocument();
    });

    it("should have mt-1 on loading text", () => {
      const { container } = render(<ReportLoadingState />);
      const loadingText = container.querySelector(".mt-1");
      expect(loadingText).toBeInTheDocument();
    });

    it("should have bg-slate-200 on all skeletons", () => {
      const { container } = render(<ReportLoadingState />);
      const skeletons = container.querySelectorAll(".bg-slate-200");
      expect(skeletons.length).toBe(6); // 1 header + 4 cards + 1 content
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      const { container } = render(<ReportLoadingState />);
      const h1 = container.querySelector("h1");
      expect(h1).toBeInTheDocument();
    });

    it("should communicate loading state through text", () => {
      render(<ReportLoadingState />);
      expect(screen.getByText("Loading report data...")).toBeInTheDocument();
    });

    it("should have semantic structure with divs", () => {
      const { container } = render(<ReportLoadingState />);
      const divs = container.querySelectorAll("div");
      expect(divs.length).toBeGreaterThan(0);
    });

    it("should be visually distinct with consistent styling", () => {
      const { container } = render(<ReportLoadingState />);
      const skeletons = container.querySelectorAll(".bg-slate-200.rounded-lg");
      expect(skeletons.length).toBe(6);
    });
  });

  describe("Layout Structure", () => {
    it("should have proper container structure", () => {
      const { container } = render(<ReportLoadingState />);
      const root = container.firstChild;
      expect(root).toHaveClass("space-y-6");
    });

    it("should have header section", () => {
      const { container } = render(<ReportLoadingState />);
      const header = container.querySelector(".flex-col");
      expect(header).toBeInTheDocument();
    });

    it("should have skeleton section", () => {
      const { container } = render(<ReportLoadingState />);
      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("should have grid layout for cards", () => {
      const { container } = render(<ReportLoadingState />);
      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
    });
  });
});
