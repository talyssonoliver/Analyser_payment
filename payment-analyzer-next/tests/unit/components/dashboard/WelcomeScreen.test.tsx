/**
 * Unit Tests for WelcomeScreen Component
 * Tests rendering, user interactions, and navigation
 */

import { describe, expect, it, vi } from "vitest";
import { WelcomeScreen } from "@/components/dashboard/WelcomeScreen";
import { render, screen } from "@/tests/utils/test-utils";

describe("WelcomeScreen", () => {
  describe("Rendering", () => {
    it("should render without errors", () => {
      const onNavigate = vi.fn();
      render(<WelcomeScreen onNavigate={onNavigate} />);

      expect(screen.getByText(/Welcome to Payment Analyzer!/i)).toBeInTheDocument();
    });

    it("should display welcome title", () => {
      const onNavigate = vi.fn();
      render(<WelcomeScreen onNavigate={onNavigate} />);

      const title = screen.getByText(/Welcome to Payment Analyzer!/i);
      expect(title).toBeInTheDocument();
    });

    it("should display welcome subtitle", () => {
      const onNavigate = vi.fn();
      render(<WelcomeScreen onNavigate={onNavigate} />);

      const subtitle = screen.getByText(/intelligent companion for tracking delivery payments/i);
      expect(subtitle).toBeInTheDocument();
    });

    it("should display CTA subtitle", () => {
      const onNavigate = vi.fn();
      render(<WelcomeScreen onNavigate={onNavigate} />);

      const ctaSubtitle = screen.getByText(/Ready to go/i);
      expect(ctaSubtitle).toBeInTheDocument();
    });
  });

  describe("Action Buttons", () => {
    it("should render Upload & Analyze button", () => {
      const onNavigate = vi.fn();
      render(<WelcomeScreen onNavigate={onNavigate} />);

      const uploadButton = screen.getByRole("button", { name: /Upload & Analyze/i });
      expect(uploadButton).toBeInTheDocument();
    });

    it("should render Manual Entry button", () => {
      const onNavigate = vi.fn();
      render(<WelcomeScreen onNavigate={onNavigate} />);

      const manualButton = screen.getByRole("button", { name: /Manual Entry/i });
      expect(manualButton).toBeInTheDocument();
    });

    it("should display both action buttons", () => {
      const onNavigate = vi.fn();
      render(<WelcomeScreen onNavigate={onNavigate} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });
  });

  describe("User Interactions", () => {
    it("should call onNavigate with /analysis when Upload & Analyze is clicked", () => {
      const onNavigate = vi.fn();
      render(<WelcomeScreen onNavigate={onNavigate} />);

      const uploadButton = screen.getByRole("button", { name: /Upload & Analyze/i });
      uploadButton.click();

      expect(onNavigate).toHaveBeenCalledWith("/analysis");
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it("should call onNavigate with /analysis when Manual Entry is clicked", () => {
      const onNavigate = vi.fn();
      render(<WelcomeScreen onNavigate={onNavigate} />);

      const manualButton = screen.getByRole("button", { name: /Manual Entry/i });
      manualButton.click();

      expect(onNavigate).toHaveBeenCalledWith("/analysis");
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple clicks", () => {
      const onNavigate = vi.fn();
      render(<WelcomeScreen onNavigate={onNavigate} />);

      const uploadButton = screen.getByRole("button", { name: /Upload & Analyze/i });
      uploadButton.click();
      uploadButton.click();

      expect(onNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe("Icons", () => {
    it("should render TrendingUp icon in Upload button", () => {
      const onNavigate = vi.fn();
      const { container } = render(<WelcomeScreen onNavigate={onNavigate} />);

      // Check for SVG elements (icons)
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button labels", () => {
      const onNavigate = vi.fn();
      render(<WelcomeScreen onNavigate={onNavigate} />);

      const uploadButton = screen.getByRole("button", { name: /Upload & Analyze/i });
      const manualButton = screen.getByRole("button", { name: /Manual Entry/i });

      expect(uploadButton).toHaveAccessibleName();
      expect(manualButton).toHaveAccessibleName();
    });

    it("should be keyboard navigable", () => {
      const onNavigate = vi.fn();
      render(<WelcomeScreen onNavigate={onNavigate} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute("tabindex", "-1");
      });
    });
  });
});
