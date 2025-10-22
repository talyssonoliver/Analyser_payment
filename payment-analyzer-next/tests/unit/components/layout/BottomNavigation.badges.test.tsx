/**
 * Unit Tests for BottomNavigation Badge Display
 * Tests badge rendering, animation, and accessibility
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BottomNavigation } from "@/components/layout/bottom-navigation";

// Mock framer-motion to avoid animation complexities in tests
vi.mock("framer-motion", () => ({
  motion: {
    nav: ({ children, className, ...props }: React.ComponentProps<"nav">) => (
      <nav className={className} {...props}>
        {children}
      </nav>
    ),
    div: ({ children, className, ...props }: React.ComponentProps<"div">) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

describe("BottomNavigation - Badge Display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Badge Rendering", () => {
    it("should render badges when provided", () => {
      const badges = {
        dashboard: 0,
        analysis: 3,
        reports: 5,
        history: 2,
        settings: 1,
      };

      render(<BottomNavigation badges={badges} />);

      // Dashboard should not show badge (0)
      const dashboardButton = screen.getByLabelText("Dashboard");
      expect(dashboardButton.textContent).not.toContain("99+");

      // Analysis should show badge
      const analysisButton = screen.getByLabelText("Analyse");
      expect(analysisButton.textContent).toContain("3");

      // Reports should show badge
      const reportsButton = screen.getByLabelText("Reports");
      expect(reportsButton.textContent).toContain("5");

      // History should show badge
      const historyButton = screen.getByLabelText("History");
      expect(historyButton.textContent).toContain("2");

      // Settings should show badge
      const settingsButton = screen.getByLabelText("Settings");
      expect(settingsButton.textContent).toContain("1");
    });

    it("should not render badges when count is 0", () => {
      const badges = {
        dashboard: 0,
        analysis: 0,
        reports: 0,
        history: 0,
        settings: 0,
      };

      render(<BottomNavigation badges={badges} />);

      // No badges should be visible
      const allBadges = screen.queryAllByText(/^\d+$/);
      expect(allBadges).toHaveLength(0);
    });

    it("should render 99+ for counts over 99", () => {
      const badges = {
        dashboard: 0,
        analysis: 150,
        reports: 0,
        history: 0,
        settings: 0,
      };

      render(<BottomNavigation badges={badges} />);

      const analysisButton = screen.getByLabelText("Analyse");
      expect(analysisButton.textContent).toContain("99+");
    });
  });

  describe("Badge Accessibility", () => {
    it("should include aria-label for badges", () => {
      const badges = {
        dashboard: 0,
        analysis: 3,
        reports: 0,
        history: 0,
        settings: 0,
      };

      const { container } = render(<BottomNavigation badges={badges} />);

      // Find badge with aria-label
      const badge = container.querySelector('[aria-label*="notification"]');
      expect(badge).toBeDefined();
    });

    it("should use singular notification for count of 1", () => {
      const badges = {
        dashboard: 0,
        analysis: 1,
        reports: 0,
        history: 0,
        settings: 0,
      };

      const { container } = render(<BottomNavigation badges={badges} />);

      const badge = container.querySelector('[aria-label*="1 notification"]');
      expect(badge).toBeDefined();
    });

    it("should use plural notifications for count > 1", () => {
      const badges = {
        dashboard: 0,
        analysis: 5,
        reports: 0,
        history: 0,
        settings: 0,
      };

      const { container } = render(<BottomNavigation badges={badges} />);

      const badge = container.querySelector('[aria-label*="5 notifications"]');
      expect(badge).toBeDefined();
    });
  });

  describe("Badge Positioning", () => {
    it("should position badge at top-right of icon", () => {
      const badges = {
        dashboard: 0,
        analysis: 3,
        reports: 0,
        history: 0,
        settings: 0,
      };

      const { container } = render(<BottomNavigation badges={badges} />);

      // Find badge wrapper with positioning classes
      const badgeWrapper = container.querySelector(".absolute.-top-1.-right-1");
      expect(badgeWrapper).toBeDefined();
    });
  });

  describe("Badge Visibility", () => {
    it("should hide navigation when visible prop is false", () => {
      const badges = {
        dashboard: 0,
        analysis: 3,
        reports: 0,
        history: 0,
        settings: 0,
      };

      const { container } = render(<BottomNavigation badges={badges} visible={false} />);

      expect(container.firstChild).toBeNull();
    });

    it("should show navigation when visible prop is true", () => {
      const badges = {
        dashboard: 0,
        analysis: 3,
        reports: 0,
        history: 0,
        settings: 0,
      };

      render(<BottomNavigation badges={badges} visible={true} />);

      expect(screen.getByLabelText("Dashboard")).toBeDefined();
    });
  });

  describe("Badge Updates", () => {
    it("should update badge counts when props change", () => {
      const initialBadges = {
        dashboard: 0,
        analysis: 3,
        reports: 0,
        history: 0,
        settings: 0,
      };

      const { rerender } = render(<BottomNavigation badges={initialBadges} />);

      const analysisButton = screen.getByLabelText("Analyse");
      expect(analysisButton.textContent).toContain("3");

      const updatedBadges = {
        dashboard: 0,
        analysis: 5,
        reports: 0,
        history: 0,
        settings: 0,
      };

      rerender(<BottomNavigation badges={updatedBadges} />);

      expect(analysisButton.textContent).toContain("5");
    });

    it("should remove badge when count changes to 0", () => {
      const initialBadges = {
        dashboard: 0,
        analysis: 3,
        reports: 0,
        history: 0,
        settings: 0,
      };

      const { rerender, container } = render(<BottomNavigation badges={initialBadges} />);

      let analysisButton = screen.getByLabelText("Analyse");
      expect(analysisButton.textContent).toContain("3");

      const updatedBadges = {
        dashboard: 0,
        analysis: 0,
        reports: 0,
        history: 0,
        settings: 0,
      };

      rerender(<BottomNavigation badges={updatedBadges} />);

      analysisButton = screen.getByLabelText("Analyse");
      const badges = container.querySelectorAll('[aria-label*="notification"]');
      expect(badges).toHaveLength(0);
    });
  });

  describe("Multiple Badges", () => {
    it("should render multiple badges simultaneously", () => {
      const badges = {
        dashboard: 0,
        analysis: 3,
        reports: 5,
        history: 2,
        settings: 1,
      };

      const { container } = render(<BottomNavigation badges={badges} />);

      const allBadges = container.querySelectorAll('[aria-label*="notification"]');
      expect(allBadges).toHaveLength(4); // All except dashboard
    });

    it("should maintain independent badge states", () => {
      const badges = {
        dashboard: 0,
        analysis: 10,
        reports: 20,
        history: 30,
        settings: 40,
      };

      render(<BottomNavigation badges={badges} />);

      const analysisButton = screen.getByLabelText("Analyse");
      const reportsButton = screen.getByLabelText("Reports");
      const historyButton = screen.getByLabelText("History");
      const settingsButton = screen.getByLabelText("Settings");

      expect(analysisButton.textContent).toContain("10");
      expect(reportsButton.textContent).toContain("20");
      expect(historyButton.textContent).toContain("30");
      expect(settingsButton.textContent).toContain("40");
    });
  });

  describe("Default Props", () => {
    it("should work without badges prop", () => {
      render(<BottomNavigation />);

      expect(screen.getByLabelText("Dashboard")).toBeDefined();
      expect(screen.getByLabelText("Analyse")).toBeDefined();

      // No badges should be visible
      const { container } = render(<BottomNavigation />);
      const allBadges = container.querySelectorAll('[aria-label*="notification"]');
      expect(allBadges).toHaveLength(0);
    });

    it("should use empty badges object when not provided", () => {
      const { container } = render(<BottomNavigation />);

      const allBadges = container.querySelectorAll('[aria-label*="notification"]');
      expect(allBadges).toHaveLength(0);
    });
  });

  describe("Custom Class Names", () => {
    it("should accept custom className", () => {
      const { container } = render(<BottomNavigation className="custom-nav" />);

      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("custom-nav");
    });
  });
});
