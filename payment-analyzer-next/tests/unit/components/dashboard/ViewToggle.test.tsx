/**
 * Unit Tests for ViewToggle Component
 * Tests view mode switching and active state display
 */

import { describe, expect, it, vi } from "vitest";
import { ViewToggle } from "@/components/dashboard/ViewToggle";
import { render, screen } from "@/tests/utils/test-utils";

describe("ViewToggle", () => {
  describe("Rendering", () => {
    it("should render without errors", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      expect(screen.getByRole("button", { name: /Monthly/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Weekly/i })).toBeInTheDocument();
    });

    it("should render both toggle buttons", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });

    it("should display Monthly label", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      expect(screen.getByText(/Monthly/i)).toBeInTheDocument();
    });

    it("should display Weekly label", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      expect(screen.getByText(/Weekly/i)).toBeInTheDocument();
    });

    it("should render calendar icons", () => {
      const onChange = vi.fn();
      const { container } = render(<ViewToggle value="monthly" onChange={onChange} />);

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Active State - Monthly", () => {
    it("should highlight monthly button when value is monthly", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const monthlyButton = screen.getByRole("button", { name: /Monthly/i });
      expect(monthlyButton.className).toContain("from-blue-500");
    });

    it("should not highlight weekly button when value is monthly", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const weeklyButton = screen.getByRole("button", { name: /Weekly/i });
      expect(weeklyButton.className).toContain("bg-transparent");
    });

    it("should apply active styling to monthly button", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const monthlyButton = screen.getByRole("button", { name: /Monthly/i });
      expect(monthlyButton.className).toContain("text-white");
      expect(monthlyButton.className).toContain("shadow-lg");
    });
  });

  describe("Active State - Weekly", () => {
    it("should highlight weekly button when value is weekly", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="weekly" onChange={onChange} />);

      const weeklyButton = screen.getByRole("button", { name: /Weekly/i });
      expect(weeklyButton.className).toContain("from-blue-500");
    });

    it("should not highlight monthly button when value is weekly", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="weekly" onChange={onChange} />);

      const monthlyButton = screen.getByRole("button", { name: /Monthly/i });
      expect(monthlyButton.className).toContain("bg-transparent");
    });

    it("should apply active styling to weekly button", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="weekly" onChange={onChange} />);

      const weeklyButton = screen.getByRole("button", { name: /Weekly/i });
      expect(weeklyButton.className).toContain("text-white");
      expect(weeklyButton.className).toContain("shadow-lg");
    });
  });

  describe("User Interactions", () => {
    it("should call onChange with monthly when monthly button is clicked", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="weekly" onChange={onChange} />);

      const monthlyButton = screen.getByRole("button", { name: /Monthly/i });
      monthlyButton.click();

      expect(onChange).toHaveBeenCalledWith("monthly");
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("should call onChange with weekly when weekly button is clicked", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const weeklyButton = screen.getByRole("button", { name: /Weekly/i });
      weeklyButton.click();

      expect(onChange).toHaveBeenCalledWith("weekly");
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("should handle clicking already active button", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const monthlyButton = screen.getByRole("button", { name: /Monthly/i });
      monthlyButton.click();

      expect(onChange).toHaveBeenCalledWith("monthly");
    });

    it("should handle multiple clicks", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const weeklyButton = screen.getByRole("button", { name: /Weekly/i });
      weeklyButton.click();
      weeklyButton.click();

      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it("should handle rapid toggling", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const monthlyButton = screen.getByRole("button", { name: /Monthly/i });
      const weeklyButton = screen.getByRole("button", { name: /Weekly/i });

      weeklyButton.click();
      monthlyButton.click();
      weeklyButton.click();

      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenNthCalledWith(1, "weekly");
      expect(onChange).toHaveBeenNthCalledWith(2, "monthly");
      expect(onChange).toHaveBeenNthCalledWith(3, "weekly");
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button labels", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const monthlyButton = screen.getByRole("button", { name: /Monthly/i });
      const weeklyButton = screen.getByRole("button", { name: /Weekly/i });

      expect(monthlyButton).toHaveAccessibleName();
      expect(weeklyButton).toHaveAccessibleName();
    });

    it("should be keyboard navigable", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute("tabindex", "-1");
      });
    });

    it("should have distinct text for screen readers", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      expect(screen.getByText("Monthly")).toBeInTheDocument();
      expect(screen.getByText("Weekly")).toBeInTheDocument();
    });
  });

  describe("Visual States", () => {
    it("should apply hover styles to inactive button", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const weeklyButton = screen.getByRole("button", { name: /Weekly/i });
      expect(weeklyButton.className).toContain("hover:text-slate-900");
    });

    it("should apply transition classes for smooth animations", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button.className).toContain("transition-all");
      });
    });

    it("should apply gradient to active button", () => {
      const onChange = vi.fn();
      render(<ViewToggle value="monthly" onChange={onChange} />);

      const monthlyButton = screen.getByRole("button", { name: /Monthly/i });
      expect(monthlyButton.className).toContain("bg-gradient-to-br");
    });
  });

  describe("State Changes", () => {
    it("should update active state when value prop changes", () => {
      const onChange = vi.fn();
      const { rerender } = render(<ViewToggle value="monthly" onChange={onChange} />);

      let monthlyButton = screen.getByRole("button", { name: /Monthly/i });
      expect(monthlyButton.className).toContain("from-blue-500");

      rerender(<ViewToggle value="weekly" onChange={onChange} />);

      monthlyButton = screen.getByRole("button", { name: /Monthly/i });
      const weeklyButton = screen.getByRole("button", { name: /Weekly/i });

      expect(monthlyButton.className).toContain("bg-transparent");
      expect(weeklyButton.className).toContain("from-blue-500");
    });

    it("should maintain button structure across state changes", () => {
      const onChange = vi.fn();
      const { rerender } = render(<ViewToggle value="monthly" onChange={onChange} />);

      expect(screen.getAllByRole("button")).toHaveLength(2);

      rerender(<ViewToggle value="weekly" onChange={onChange} />);

      expect(screen.getAllByRole("button")).toHaveLength(2);
    });
  });

  describe("Layout", () => {
    it("should render in a flex container", () => {
      const onChange = vi.fn();
      const { container } = render(<ViewToggle value="monthly" onChange={onChange} />);

      const wrapper = container.querySelector(".flex.gap-1");
      expect(wrapper).toBeInTheDocument();
    });

    it("should have max width constraint", () => {
      const onChange = vi.fn();
      const { container } = render(<ViewToggle value="monthly" onChange={onChange} />);

      const wrapper = container.querySelector(".max-w-md");
      expect(wrapper).toBeInTheDocument();
    });

    it("should center buttons", () => {
      const onChange = vi.fn();
      const { container } = render(<ViewToggle value="monthly" onChange={onChange} />);

      const wrapper = container.querySelector(".justify-center");
      expect(wrapper).toBeInTheDocument();
    });
  });
});
