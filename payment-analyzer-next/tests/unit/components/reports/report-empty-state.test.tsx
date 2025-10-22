/**
 * Unit Tests for ReportEmptyState Component
 * Tests empty state rendering, icons, messages, and action button
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReportEmptyState } from "@/components/reports/ReportEmptyState";
import { fireEvent, render, screen } from "@/tests/utils/test-utils";

describe("ReportEmptyState", () => {
  // Store original window.location
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location

    delete (window as unknown as { location?: Location }).location;
    // Cast through unknown to satisfy "string & Location" assignment typing
    window.location = { ...originalLocation, href: "" } as unknown as Location & string;
  });

  afterEach(() => {
    // Restore original window.location
    window.location = originalLocation as unknown as Location & string;
  });

  describe("Basic Rendering", () => {
    it("should render without errors", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);
      const title = screen.getByRole("heading", { name: /Reports/i });
      expect(title).toBeInTheDocument();
    });

    it("should render page title", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);
      const title = screen.getByRole("heading", { name: "Reports" });
      expect(title).toBeInTheDocument();
    });

    it("should render Card component", () => {
      const { container: _container } = render(<ReportEmptyState requestedAnalysisId={null} />);
      const card = _container.querySelector(".theme-card");
      expect(card).toBeInTheDocument();
    });

    it("should render icon container", () => {
      const { container: _container } = render(<ReportEmptyState requestedAnalysisId={null} />);
      const iconContainer = _container.querySelector(".w-20.h-20");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("Generic Empty State (No Specific Analysis)", () => {
    it("should display generic subtitle when requestedAnalysisId is null", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);
      const subtitle = screen.getByText((content, element) => {
        return element?.tagName === "P" && content.includes("No report data available");
      });
      expect(subtitle).toBeInTheDocument();
    });

    it("should display generic heading when requestedAnalysisId is null", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);
      const heading = screen.getByRole("heading", { name: /No Report Available/i, level: 3 });
      expect(heading).toBeInTheDocument();
    });

    it("should display generic description when requestedAnalysisId is null", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);
      expect(
        screen.getByText(/Complete an analysis to view your financial reports and insights/i)
      ).toBeInTheDocument();
    });

    it("should render chart icon for generic empty state", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      // Chart icon has path with specific d attribute for bars
      const chartIcon = container.querySelector('path[d="M7 13v4M11 10v7M15 7v10"]');
      expect(chartIcon).toBeInTheDocument();
    });

    it("should apply red gradient background for icon container", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const iconContainer = container.querySelector(".from-red-100.to-red-200");
      expect(iconContainer).toBeInTheDocument();
    });

    it("should apply blue text color to icon", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const icon = container.querySelector("svg.text-blue-500");
      expect(icon).toBeInTheDocument();
    });

    it("should apply blue gradient to decorative bar", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const bar = container.querySelector(".from-blue-500.to-purple-500");
      expect(bar).toBeInTheDocument();
    });

    it("should not render action button for generic empty state", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);

      const button = screen.queryByText(/View Your Latest Reports/i);
      expect(button).not.toBeInTheDocument();
    });

    it("should apply blue pulse animation to icon background", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const pulseBackground = container.querySelector(".animate-pulse");
      expect(pulseBackground).toBeInTheDocument();
      expect(pulseBackground?.className).toContain("from-blue-500/10");
      expect(pulseBackground?.className).toContain("to-purple-500/10");
    });
  });

  describe("Specific Analysis Not Found State", () => {
    it("should display specific subtitle when requestedAnalysisId is provided", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);
      const subtitle = screen.getByText((content, element) => {
        return element?.tagName === "P" && content.includes("Requested analysis not found");
      });
      expect(subtitle).toBeInTheDocument();
    });

    it("should display specific heading when requestedAnalysisId is provided", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);
      const heading = screen.getByRole("heading", { name: /Analysis Not Found/i, level: 3 });
      expect(heading).toBeInTheDocument();
    });

    it("should display specific description when requestedAnalysisId is provided", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);
      expect(screen.getByText(/The requested analysis could not be found/i)).toBeInTheDocument();
    });

    it("should display the requested analysis ID", () => {
      render(<ReportEmptyState requestedAnalysisId="test-analysis-123" />);
      expect(screen.getByText(/test-analysis-123/i)).toBeInTheDocument();
    });

    it("should display ID in code format", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId="test-id" />);

      const codeElement = container.querySelector("code");
      expect(codeElement).toBeInTheDocument();
      expect(codeElement?.textContent).toBe("test-id");
    });

    it("should display additional context message", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);
      expect(
        screen.getByText(/This may have been deleted, or you may not have access to it/i)
      ).toBeInTheDocument();
    });

    it("should render error/cross icon for specific analysis not found", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      // Error icon has circle and cross paths
      const circleIcon = container.querySelector('circle[cx="12"][cy="12"][r="10"]');
      expect(circleIcon).toBeInTheDocument();
    });

    it("should apply red gradient background for icon container", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const iconContainer = container.querySelector(".from-red-100.to-red-200");
      expect(iconContainer).toBeInTheDocument();
    });

    it("should apply red text color to error icon", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const icon = container.querySelector("svg.text-red-500");
      expect(icon).toBeInTheDocument();
    });

    it("should apply red gradient to decorative bar", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const bar = container.querySelector(".from-red-500.to-orange-500");
      expect(bar).toBeInTheDocument();
    });

    it("should render action button for specific analysis not found", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const button = screen.getByText(/View Your Latest Reports/i);
      expect(button).toBeInTheDocument();
    });

    it("should apply red pulse animation to icon background", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const pulseBackground = container.querySelector(".animate-pulse");
      expect(pulseBackground).toBeInTheDocument();
      expect(pulseBackground?.className).toContain("from-red-500/10");
      expect(pulseBackground?.className).toContain("to-orange-500/10");
    });
  });

  describe("Icon Display", () => {
    it("should render SVG icon with correct viewBox", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const svg = container.querySelector('svg[viewBox="0 0 24 24"]');
      expect(svg).toBeInTheDocument();
    });

    it("should render icon with correct dimensions", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const svg = container.querySelector('svg[width="32"][height="32"]');
      expect(svg).toBeInTheDocument();
    });

    it("should render icon with no fill", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const svg = container.querySelector('svg[fill="none"]');
      expect(svg).toBeInTheDocument();
    });

    it("should render icon with current color stroke", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const svg = container.querySelector('svg[stroke="currentColor"]');
      expect(svg).toBeInTheDocument();
    });

    it("should render icon with stroke width of 2", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const svg = container.querySelector('svg[stroke-width="2"]');
      expect(svg).toBeInTheDocument();
    });

    it("should render icon container with rounded full class", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const iconContainer = container.querySelector(".rounded-full.w-20.h-20");
      expect(iconContainer).toBeInTheDocument();
    });

    it("should render icon container with flex centering", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const iconContainer = container.querySelector(".flex.items-center.justify-center");
      expect(iconContainer).toBeInTheDocument();
    });

    it("should render pulse animation background", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const pulseBackground = container.querySelector(".animate-pulse");
      expect(pulseBackground).toBeInTheDocument();
    });

    it("should apply isolation and contain properties to pulse background", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const pulseBackground = container.querySelector(".animate-pulse");
      expect(pulseBackground).toHaveStyle({ isolation: "isolate", contain: "layout style" });
    });
  });

  describe("Action Button Functionality", () => {
    it("should render button with correct text", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const button = screen.getByText(/View Your Latest Reports/i);
      expect(button).toBeInTheDocument();
    });

    it("should render button with correct styling", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const button = screen.getByText(/View Your Latest Reports/i);
      expect(button.className).toContain("px-4");
      expect(button.className).toContain("py-2");
      expect(button.className).toContain("bg-blue-600");
      expect(button.className).toContain("text-white");
      expect(button.className).toContain("rounded-lg");
    });

    it("should include hover effect on button", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const button = screen.getByText(/View Your Latest Reports/i);
      expect(button.className).toContain("hover:bg-blue-700");
      expect(button.className).toContain("transition-colors");
    });

    it("should navigate to history page when button is clicked", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const button = screen.getByText(/View Your Latest Reports/i);
      fireEvent.click(button);

      expect(window.location.href).toBe("/history");
    });

    it("should be a button element", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const button = screen.getByText(/View Your Latest Reports/i);
      expect(button.tagName).toBe("BUTTON");
    });
  });

  describe("Layout and Styling", () => {
    it("should render container with space-y-6", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const mainContainer = container.querySelector(".space-y-6");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should render header with flex layout", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const header = container.querySelector(".flex.flex-col");
      expect(header).toBeInTheDocument();
    });

    it("should render card with proper padding", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const card = container.querySelector(".p-16");
      expect(card).toBeInTheDocument();
    });

    it("should render card with text-center", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const card = container.querySelector(".text-center");
      expect(card).toBeInTheDocument();
    });

    it("should render card with relative positioning", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const card = container.querySelector(".relative");
      expect(card).toBeInTheDocument();
    });

    it("should render card with overflow-hidden", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const card = container.querySelector(".overflow-hidden");
      expect(card).toBeInTheDocument();
    });

    it("should render heading with correct styling", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);

      const heading = screen.getByText(/No Report Available/i);
      expect(heading.className).toContain("text-xl");
      expect(heading.className).toContain("font-bold");
      expect(heading.className).toContain("text-slate-900");
      expect(heading.className).toContain("mb-3");
    });

    it("should render description with correct styling", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);

      const description = screen.getByText(
        /Complete an analysis to view your financial reports and insights/i
      );
      // The description is inside a div with these classes, not on the p element itself
      const descriptionContainer = description.closest(".text-slate-600");
      expect(descriptionContainer).toBeInTheDocument();
    });

    it("should render decorative bar with correct dimensions", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const bar = container.querySelector(".w-24.h-1");
      expect(bar).toBeInTheDocument();
    });

    it("should render decorative bar with rounded-full", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const bar = container.querySelector(".rounded-full.w-24.h-1");
      expect(bar).toBeInTheDocument();
    });

    it("should render decorative bar with mx-auto", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const bar = container.querySelector(".mx-auto.w-24.h-1");
      expect(bar).toBeInTheDocument();
    });

    it("should render decorative bar with opacity-60", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const bar = container.querySelector(".opacity-60.w-24.h-1");
      expect(bar).toBeInTheDocument();
    });
  });

  describe("Custom Message Variations", () => {
    it("should handle empty string requestedAnalysisId", () => {
      render(<ReportEmptyState requestedAnalysisId="" />);

      // Empty string is truthy, so it should show specific analysis not found
      // Use getByRole to be more specific since the text appears in multiple places
      expect(
        screen.getByRole("heading", { name: /Analysis Not Found/i, level: 3 })
      ).toBeInTheDocument();
    });

    it("should display analysis ID even if it contains special characters", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123-xyz-!@#" />);

      expect(screen.getByText(/abc-123-xyz-!@#/i)).toBeInTheDocument();
    });

    it("should handle long analysis IDs", () => {
      const longId = "a".repeat(100);
      render(<ReportEmptyState requestedAnalysisId={longId} />);

      expect(screen.getByText(new RegExp(longId))).toBeInTheDocument();
    });

    it("should handle UUID format analysis IDs", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      render(<ReportEmptyState requestedAnalysisId={uuid} />);

      expect(screen.getByText(new RegExp(uuid))).toBeInTheDocument();
    });
  });

  describe("Typography", () => {
    it("should render page title with correct size", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);

      const title = screen.getByText("Reports");
      expect(title.className).toContain("text-2xl");
    });

    it("should render page title as bold", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);

      const title = screen.getByText("Reports");
      expect(title.className).toContain("font-bold");
    });

    it("should render page title with dark color", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);

      const title = screen.getByText("Reports");
      expect(title.className).toContain("text-slate-900");
    });

    it("should render subtitle with medium color", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);

      const subtitle = screen.getByText(/No report data available/i);
      expect(subtitle.className).toContain("text-slate-600");
    });

    it("should render subtitle with top margin", () => {
      render(<ReportEmptyState requestedAnalysisId={null} />);

      const subtitle = screen.getByText(/No report data available/i);
      expect(subtitle.className).toContain("mt-1");
    });

    it("should render code block with background", () => {
      render(<ReportEmptyState requestedAnalysisId="test-id" />);

      const code = screen.getByText("test-id");
      expect(code.className).toContain("bg-slate-100");
    });

    it("should render code block with padding", () => {
      render(<ReportEmptyState requestedAnalysisId="test-id" />);

      const code = screen.getByText("test-id");
      expect(code.className).toContain("px-2");
      expect(code.className).toContain("py-1");
    });

    it("should render code block with rounded corners", () => {
      render(<ReportEmptyState requestedAnalysisId="test-id" />);

      const code = screen.getByText("test-id");
      expect(code.className).toContain("rounded");
    });
  });

  describe("Edge Cases", () => {
    it("should handle requestedAnalysisId with whitespace", () => {
      render(<ReportEmptyState requestedAnalysisId="  test-id  " />);

      expect(screen.getByText(/test-id/i)).toBeInTheDocument();
    });

    it("should handle numeric requestedAnalysisId", () => {
      render(<ReportEmptyState requestedAnalysisId="12345" />);

      expect(screen.getByText(/12345/)).toBeInTheDocument();
    });

    it("should render description in space-y-2 container for specific analysis", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const descriptionContainer = container.querySelector(".space-y-2");
      expect(descriptionContainer).toBeInTheDocument();
    });

    it("should render multiple description paragraphs for specific analysis", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const paragraphs = container.querySelectorAll(".space-y-2 p");
      expect(paragraphs.length).toBeGreaterThan(1);
    });

    it("should render small text for context message", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const contextMessage = screen.getByText(
        /This may have been deleted, or you may not have access to it/i
      );
      expect(contextMessage.className).toContain("text-sm");
      expect(contextMessage.className).toContain("text-slate-500");
    });

    it("should render ID label as small text", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const idLabel = screen.getByText(/ID:/i);
      expect(idLabel.className).toContain("text-sm");
    });
  });

  describe("Accessibility", () => {
    it("should have semantic heading hierarchy", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId={null} />);

      const h1 = container.querySelector("h1");
      const h3 = container.querySelector("h3");

      expect(h1).toBeInTheDocument();
      expect(h3).toBeInTheDocument();
    });

    it("should have descriptive button text", () => {
      render(<ReportEmptyState requestedAnalysisId="abc-123" />);

      const button = screen.getByText(/View Your Latest Reports/i);
      expect(button).toBeInTheDocument();
    });

    it("should use code element for analysis ID", () => {
      const { container } = render(<ReportEmptyState requestedAnalysisId="test-id" />);

      const code = container.querySelector("code");
      expect(code?.tagName).toBe("CODE");
    });
  });
});
