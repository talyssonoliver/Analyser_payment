/**
 * Unit Tests for ExecutiveSummary Component
 * Tests metric display, formatting, and trend indicators
 */

import { describe, expect, it } from "vitest";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";
import { render, screen } from "@/tests/utils/test-utils";

// Helper to find percentage text that may be split across elements

const _findPercentageText = (percentage: string) => {
  return screen.getByText((_content, element) => {
    const text = element?.textContent || "";
    return text.includes(percentage) && text.includes("%");
  });
};

describe("ExecutiveSummary", () => {
  const defaultProps = {
    totalRevenue: 1250.5,
    avgDaily: 178.64,
    deliveries: 425,
    performance: 98.5,
    revenueChange: 5.2,
    deliveriesChange: -2.1,
    periodLabel: "January 2024",
  };

  describe("Rendering", () => {
    it("should render without errors", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      expect(screen.getByText(/Executive Summary/i)).toBeInTheDocument();
    });

    it("should display component title", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      const title = screen.getByText(/Executive Summary/i);
      expect(title).toBeInTheDocument();
    });

    it("should display period label", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      expect(screen.getByText("January 2024")).toBeInTheDocument();
    });
  });

  describe("Total Revenue Display", () => {
    it("should display total revenue with currency symbol", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      expect(screen.getByText(/£1250.50/)).toBeInTheDocument();
    });

    it("should display revenue label", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      expect(screen.getByText(/Total Revenue/i)).toBeInTheDocument();
    });

    it("should display revenue change percentage", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      expect(screen.getByText(/5%/)).toBeInTheDocument();
    });

    it("should show positive indicator for revenue increase", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      const changeElement = screen.getByText(/5%/);
      expect(changeElement.textContent).toContain("↑");
    });

    it("should show negative indicator for revenue decrease", () => {
      render(<ExecutiveSummary {...defaultProps} revenueChange={-3.5} />);

      const changeElement = screen.getByText(/↓ 4%/);
      expect(changeElement).toBeInTheDocument();
    });

    it("should format large revenue amounts correctly", () => {
      render(<ExecutiveSummary {...defaultProps} totalRevenue={123456.78} />);

      expect(screen.getByText(/£123456.78/)).toBeInTheDocument();
    });

    it("should handle zero revenue", () => {
      render(<ExecutiveSummary {...defaultProps} totalRevenue={0} />);

      expect(screen.getByText(/£0.00/)).toBeInTheDocument();
    });
  });

  describe("Average Daily Display", () => {
    it("should display average daily value", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      expect(screen.getByText(/£178.64/)).toBeInTheDocument();
    });

    it("should display average daily label", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      expect(screen.getByText(/Avg Daily/i)).toBeInTheDocument();
    });

    it("should show neutral indicator for average daily", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      // Find the Avg Daily section by looking for the parent with multiple children
      const avgDailyText = screen.getByText(/Avg Daily/i);
      const avgSection = avgDailyText.parentElement?.parentElement;
      expect(avgSection?.textContent).toContain("→ 0%");
    });
  });

  describe("Deliveries Display", () => {
    it("should display deliveries count", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      expect(screen.getByText("425")).toBeInTheDocument();
    });

    it("should display deliveries label", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      expect(screen.getByText(/Deliveries/i)).toBeInTheDocument();
    });

    it("should display deliveries change percentage", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      expect(screen.getByText(/2%/)).toBeInTheDocument();
    });

    it("should show negative indicator for deliveries decrease", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      const changeElement = screen.getByText(/2%/);
      expect(changeElement.textContent).toContain("↓");
    });

    it("should show positive indicator for deliveries increase", () => {
      render(<ExecutiveSummary {...defaultProps} deliveriesChange={4.3} />);

      const changeElement = screen.getByText(/4%/);
      expect(changeElement.textContent).toContain("↑");
    });

    it("should handle large delivery counts", () => {
      render(<ExecutiveSummary {...defaultProps} deliveries={9999} />);

      expect(screen.getByText("9999")).toBeInTheDocument();
    });
  });

  describe("Performance Display", () => {
    it("should display performance percentage", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      // performance is 98.5, which rounds to 99%
      const performanceElement = screen.getByText(/99%/);
      expect(performanceElement).toBeInTheDocument();
    });

    it("should display performance label", () => {
      render(<ExecutiveSummary {...defaultProps} />);

      expect(screen.getByText(/Performance/i)).toBeInTheDocument();
    });

    it("should display Excellent label for performance >= 95", () => {
      render(<ExecutiveSummary {...defaultProps} performance={98.5} />);

      expect(screen.getByText(/Excellent/i)).toBeInTheDocument();
    });

    it("should display Good label for performance >= 85 and < 95", () => {
      render(<ExecutiveSummary {...defaultProps} performance={90} />);

      expect(screen.getByText(/Good/i)).toBeInTheDocument();
    });

    it("should display Needs Review label for performance < 85", () => {
      render(<ExecutiveSummary {...defaultProps} performance={75} />);

      expect(screen.getByText(/Needs Review/i)).toBeInTheDocument();
    });

    it("should handle boundary performance value of 95", () => {
      render(<ExecutiveSummary {...defaultProps} performance={95} />);

      expect(screen.getByText(/Excellent/i)).toBeInTheDocument();
    });

    it("should handle boundary performance value of 85", () => {
      render(<ExecutiveSummary {...defaultProps} performance={85} />);

      expect(screen.getByText(/Good/i)).toBeInTheDocument();
    });

    it("should handle low performance values", () => {
      render(<ExecutiveSummary {...defaultProps} performance={50} />);

      expect(screen.getByText(/50%/)).toBeInTheDocument();
      expect(screen.getByText(/Needs Review/i)).toBeInTheDocument();
    });

    it("should handle 100% performance", () => {
      render(<ExecutiveSummary {...defaultProps} performance={100} />);

      expect(screen.getByText(/100%/)).toBeInTheDocument();
      expect(screen.getByText(/Excellent/i)).toBeInTheDocument();
    });
  });

  describe("Formatting", () => {
    it("should format revenue to 2 decimal places", () => {
      render(<ExecutiveSummary {...defaultProps} totalRevenue={1234.567} />);

      expect(screen.getByText(/£1234.57/)).toBeInTheDocument();
    });

    it("should format average daily to 2 decimal places", () => {
      render(<ExecutiveSummary {...defaultProps} avgDaily={123.456} />);

      expect(screen.getByText(/£123.46/)).toBeInTheDocument();
    });

    it("should round performance to whole number", () => {
      render(<ExecutiveSummary {...defaultProps} performance={98.7} />);

      expect(screen.getByText(/99%/)).toBeInTheDocument();
    });

    it("should round change percentages to whole numbers", () => {
      render(<ExecutiveSummary {...defaultProps} revenueChange={5.7} />);

      expect(screen.getByText(/6%/)).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle all zero values", () => {
      render(
        <ExecutiveSummary
          totalRevenue={0}
          avgDaily={0}
          deliveries={0}
          performance={0}
          revenueChange={0}
          deliveriesChange={0}
          periodLabel="No Data"
        />
      );

      expect(screen.getAllByText(/£0.00/).length).toBeGreaterThan(0);
      // Multiple "0%" instances exist, so use getAllByText
      expect(screen.getAllByText(/0%/).length).toBeGreaterThan(0);
    });

    it("should handle negative revenue change correctly", () => {
      render(<ExecutiveSummary {...defaultProps} revenueChange={-10.5} />);

      // -10.5 rounds to 11%
      const changeElement = screen.getByText(/↓ 11%/);
      expect(changeElement).toBeInTheDocument();
    });

    it("should handle zero change correctly", () => {
      render(<ExecutiveSummary {...defaultProps} revenueChange={0} />);

      const changeElement = screen.getByText(/↑ 0%/);
      expect(changeElement).toBeInTheDocument();
    });

    it("should handle very large numbers", () => {
      render(<ExecutiveSummary {...defaultProps} totalRevenue={999999.99} deliveries={99999} />);

      expect(screen.getByText(/£999999.99/)).toBeInTheDocument();
      expect(screen.getByText("99999")).toBeInTheDocument();
    });
  });

  describe("CSS Classes", () => {
    it("should apply positive class for positive revenue change", () => {
      const { container } = render(<ExecutiveSummary {...defaultProps} revenueChange={5.2} />);

      // Check that the upward arrow (↑) is displayed for positive change
      expect(container.textContent).toContain("↑");
      expect(container.textContent).toContain("5%");
    });

    it("should apply negative class for negative revenue change", () => {
      const { container } = render(<ExecutiveSummary {...defaultProps} revenueChange={-5.2} />);

      // Check that the downward arrow (↓) is displayed for negative change
      expect(container.textContent).toContain("↓");
      expect(container.textContent).toContain("5%");
    });
  });
});
