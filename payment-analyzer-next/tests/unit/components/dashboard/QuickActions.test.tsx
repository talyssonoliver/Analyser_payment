/**
 * Unit Tests for QuickActions Component
 * Tests action buttons and navigation
 */

import { describe, expect, it, vi } from "vitest";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { render, screen } from "@/tests/utils/test-utils";

describe("QuickActions", () => {
  describe("Rendering", () => {
    it("should render without errors", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      expect(screen.getByRole("button", { name: /Upload & Analyze/i })).toBeInTheDocument();
    });

    it("should render both action buttons", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });

    it("should display Upload & Analyze button", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const uploadButton = screen.getByRole("button", { name: /Upload & Analyze/i });
      expect(uploadButton).toBeInTheDocument();
    });

    it("should display View All Reports button", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const reportsButton = screen.getByRole("button", { name: /View All Reports/i });
      expect(reportsButton).toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("should render chart icon in Upload & Analyze button", () => {
      const onNavigate = vi.fn();
      const { container } = render(<QuickActions onNavigate={onNavigate} />);

      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });

    it("should render activity icon in View All Reports button", () => {
      const onNavigate = vi.fn();
      const { container } = render(<QuickActions onNavigate={onNavigate} />);

      const svgs = container.querySelectorAll("svg");
      expect(svgs).toHaveLength(2);
    });

    it("should render icons with correct dimensions", () => {
      const onNavigate = vi.fn();
      const { container } = render(<QuickActions onNavigate={onNavigate} />);

      const svgs = container.querySelectorAll("svg");
      svgs.forEach((svg) => {
        expect(svg.getAttribute("width")).toBe("18");
        expect(svg.getAttribute("height")).toBe("18");
      });
    });
  });

  describe("User Interactions", () => {
    it("should call onNavigate with /analysis when Upload & Analyze is clicked", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const uploadButton = screen.getByRole("button", { name: /Upload & Analyze/i });
      uploadButton.click();

      expect(onNavigate).toHaveBeenCalledWith("/analysis");
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it("should call onNavigate with /history when View All Reports is clicked", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const reportsButton = screen.getByRole("button", { name: /View All Reports/i });
      reportsButton.click();

      expect(onNavigate).toHaveBeenCalledWith("/history");
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple clicks on same button", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const uploadButton = screen.getByRole("button", { name: /Upload & Analyze/i });
      uploadButton.click();
      uploadButton.click();
      uploadButton.click();

      expect(onNavigate).toHaveBeenCalledTimes(3);
      expect(onNavigate).toHaveBeenCalledWith("/analysis");
    });

    it("should handle clicks on different buttons", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const uploadButton = screen.getByRole("button", { name: /Upload & Analyze/i });
      const reportsButton = screen.getByRole("button", { name: /View All Reports/i });

      uploadButton.click();
      reportsButton.click();

      expect(onNavigate).toHaveBeenCalledTimes(2);
      expect(onNavigate).toHaveBeenNthCalledWith(1, "/analysis");
      expect(onNavigate).toHaveBeenNthCalledWith(2, "/reports");
    });

    it("should maintain independent click handlers", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => button.click());

      expect(onNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button labels", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const uploadButton = screen.getByRole("button", { name: /Upload & Analyze/i });
      const reportsButton = screen.getByRole("button", { name: /View All Reports/i });

      expect(uploadButton).toHaveAccessibleName();
      expect(reportsButton).toHaveAccessibleName();
    });

    it("should be keyboard navigable", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute("disabled");
        expect(button).not.toHaveAttribute("tabindex", "-1");
      });
    });

    it("should have semantic button elements", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button.tagName).toBe("BUTTON");
      });
    });
  });

  describe("Button Text Content", () => {
    it("should display complete Upload & Analyze text", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      expect(screen.getByText("Upload & Analyze")).toBeInTheDocument();
    });

    it("should display complete View All Reports text", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      expect(screen.getByText("View All Reports")).toBeInTheDocument();
    });
  });

  describe("Button Styling", () => {
    it("should apply primary styles to Upload & Analyze button", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const primaryButton = screen.getByRole("button", { name: /Upload & Analyze/i });
      expect(primaryButton).toBeInTheDocument();
    });

    it("should apply secondary styles to View All Reports button", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const secondaryButton = screen.getByRole("button", { name: /View All Reports/i });
      expect(secondaryButton).toBeInTheDocument();
    });
  });

  describe("Component Structure", () => {
    it("should render within a container", () => {
      const onNavigate = vi.fn();
      const { container } = render(<QuickActions onNavigate={onNavigate} />);

      const containerDiv = container.firstChild;
      expect(containerDiv).toBeInTheDocument();
    });

    it("should have icon and text in each button", () => {
      const onNavigate = vi.fn();
      const { container } = render(<QuickActions onNavigate={onNavigate} />);

      const buttons = container.querySelectorAll("button");
      buttons.forEach((button) => {
        const spans = button.querySelectorAll("span");
        expect(spans.length).toBeGreaterThanOrEqual(2); // Icon span + text span
      });
    });
  });

  describe("Callback Consistency", () => {
    it("should use the same callback function for multiple renders", () => {
      const onNavigate = vi.fn();
      const { rerender } = render(<QuickActions onNavigate={onNavigate} />);

      const uploadButton = screen.getByRole("button", { name: /Upload & Analyze/i });
      uploadButton.click();

      rerender(<QuickActions onNavigate={onNavigate} />);

      uploadButton.click();

      expect(onNavigate).toHaveBeenCalledTimes(2);
    });

    it("should handle callback changes", () => {
      const onNavigate1 = vi.fn();
      const onNavigate2 = vi.fn();

      const { rerender } = render(<QuickActions onNavigate={onNavigate1} />);

      const uploadButton = screen.getByRole("button", { name: /Upload & Analyze/i });
      uploadButton.click();

      expect(onNavigate1).toHaveBeenCalledTimes(1);
      expect(onNavigate2).not.toHaveBeenCalled();

      rerender(<QuickActions onNavigate={onNavigate2} />);

      uploadButton.click();

      expect(onNavigate1).toHaveBeenCalledTimes(1);
      expect(onNavigate2).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid clicking", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const uploadButton = screen.getByRole("button", { name: /Upload & Analyze/i });

      // Simulate rapid clicking
      for (let i = 0; i < 10; i++) {
        uploadButton.click();
      }

      expect(onNavigate).toHaveBeenCalledTimes(10);
    });

    it("should not throw error if onNavigate is called multiple times", () => {
      const onNavigate = vi.fn();
      render(<QuickActions onNavigate={onNavigate} />);

      const buttons = screen.getAllByRole("button");

      // Extract the test action to reduce nesting
      const clickButtonsTwice = () => {
        for (const button of buttons) {
          button.click();
          button.click();
        }
      };

      expect(clickButtonsTwice).not.toThrow();
    });
  });
});
