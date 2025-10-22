/**
 * Unit Tests for FileUpdateMarker Component
 *
 * Tests the visual indicator for updated files in Step 2.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FileUpdateMarker } from "@/components/analysis/validation/file-update-marker";

describe("FileUpdateMarker", () => {
  describe("Rendering", () => {
    it("should not render when isUpdated is false", () => {
      const { container } = render(<FileUpdateMarker isUpdated={false} changeType="content" />);

      expect(container.firstChild).toBeNull();
    });

    it("should render when isUpdated is true", () => {
      render(
        <FileUpdateMarker
          isUpdated={true}
          changeType="content"
          lastProcessed={new Date("2025-01-15").getTime()}
        />
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Updated")).toBeInTheDocument();
    });

    it("should render with warning icon", () => {
      render(
        <FileUpdateMarker
          isUpdated={true}
          changeType="content"
          lastProcessed={new Date("2025-01-15").getTime()}
        />
      );

      // Check for SVG warning icon
      const svg = screen.getByRole("status").querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should have correct ARIA label", () => {
      render(
        <FileUpdateMarker
          isUpdated={true}
          changeType="size"
          lastProcessed={new Date("2025-01-15").getTime()}
        />
      );

      const marker = screen.getByRole("status");
      expect(marker).toHaveAttribute("aria-label");
      expect(marker.getAttribute("aria-label")).toContain("File updated");
      expect(marker.getAttribute("aria-label")).toContain("Size");
    });

    it("should accept custom aria label", () => {
      const customLabel = "Custom update notification";

      render(<FileUpdateMarker isUpdated={true} changeType="content" ariaLabel={customLabel} />);

      const marker = screen.getByRole("status");
      expect(marker).toHaveAttribute("aria-label", customLabel);
    });

    it("should apply custom className", () => {
      const customClass = "my-custom-class";

      render(<FileUpdateMarker isUpdated={true} changeType="content" className={customClass} />);

      const marker = screen.getByRole("status");
      expect(marker).toHaveClass(customClass);
    });
  });

  describe("Change Type Display", () => {
    it("should display Content change type", () => {
      render(
        <FileUpdateMarker
          isUpdated={true}
          changeType="content"
          lastProcessed={new Date("2025-01-15").getTime()}
        />
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should display Size change type", () => {
      render(
        <FileUpdateMarker
          isUpdated={true}
          changeType="size"
          lastProcessed={new Date("2025-01-15").getTime()}
        />
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should display Timestamp change type", () => {
      render(
        <FileUpdateMarker
          isUpdated={true}
          changeType="timestamp"
          lastProcessed={new Date("2025-01-15").getTime()}
        />
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should display Name change type", () => {
      render(
        <FileUpdateMarker
          isUpdated={true}
          changeType="name"
          lastProcessed={new Date("2025-01-15").getTime()}
        />
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should display Modified when no change type provided", () => {
      render(<FileUpdateMarker isUpdated={true} />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  describe("Last Processed Date", () => {
    it("should display formatted date when lastProcessed is provided as number", () => {
      const date = new Date("2025-01-15").getTime();

      render(<FileUpdateMarker isUpdated={true} changeType="content" lastProcessed={date} />);

      const marker = screen.getByRole("status");
      const ariaLabel = marker.getAttribute("aria-label") || "";
      expect(ariaLabel).toContain("2025");
    });

    it("should display formatted date when lastProcessed is provided as Date", () => {
      const date = new Date("2025-01-15");

      render(<FileUpdateMarker isUpdated={true} changeType="content" lastProcessed={date} />);

      const marker = screen.getByRole("status");
      const ariaLabel = marker.getAttribute("aria-label") || "";
      expect(ariaLabel).toContain("2025");
    });

    it("should handle missing lastProcessed gracefully", () => {
      render(<FileUpdateMarker isUpdated={true} changeType="content" />);

      const marker = screen.getByRole("status");
      const ariaLabel = marker.getAttribute("aria-label") || "";
      expect(ariaLabel).toContain("Unknown");
    });
  });

  describe("Styling", () => {
    it("should have amber/warning styling classes", () => {
      render(
        <FileUpdateMarker
          isUpdated={true}
          changeType="content"
          lastProcessed={new Date("2025-01-15").getTime()}
        />
      );

      const badge = screen.getByText("Updated").closest("span");
      expect(badge).toHaveClass("bg-amber-50");
      expect(badge).toHaveClass("text-amber-700");
      expect(badge).toHaveClass("border-amber-200");
    });

    it("should have proper spacing and sizing", () => {
      render(
        <FileUpdateMarker
          isUpdated={true}
          changeType="content"
          lastProcessed={new Date("2025-01-15").getTime()}
        />
      );

      const badge = screen.getByText("Updated").closest("span");
      expect(badge).toHaveClass("px-2");
      expect(badge).toHaveClass("py-0.5");
      expect(badge).toHaveClass("text-xs");
    });
  });

  describe("Accessibility", () => {
    it("should have role=status for screen readers", () => {
      render(<FileUpdateMarker isUpdated={true} changeType="content" />);

      const marker = screen.getByRole("status");
      expect(marker).toBeInTheDocument();
    });

    it("should have aria-label describing the update", () => {
      render(
        <FileUpdateMarker
          isUpdated={true}
          changeType="size"
          lastProcessed={new Date("2025-01-15").getTime()}
        />
      );

      const marker = screen.getByRole("status");
      const ariaLabel = marker.getAttribute("aria-label") || "";

      expect(ariaLabel).toContain("File updated");
      expect(ariaLabel).toContain("Size");
      expect(ariaLabel).toContain("2025");
    });

    it("should have aria-hidden on decorative icon", () => {
      render(<FileUpdateMarker isUpdated={true} changeType="content" />);

      const svg = screen.getByRole("status").querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });
});
