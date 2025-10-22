/**
 * Unit Tests for HeaderValidationBadge Component
 * Tests rendering of validation badge in different states
 */

import { describe, expect, it } from "vitest";
import {
  HeaderValidationBadge,
  type ValidationStatus,
} from "@/components/analysis/validation/HeaderValidationBadge";
import { render, screen } from "@/tests/utils/test-utils";

describe("HeaderValidationBadge Component", () => {
  describe("Rendering - Basic Structure", () => {
    it("should render without errors", () => {
      render(<HeaderValidationBadge status="PENDING" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should render with PENDING status", () => {
      render(<HeaderValidationBadge status="PENDING" />);
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("should render with READY status", () => {
      render(<HeaderValidationBadge status="READY" />);
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    it("should render with INCOMPLETE status", () => {
      render(<HeaderValidationBadge status="INCOMPLETE" />);
      expect(screen.getByText("Incomplete")).toBeInTheDocument();
    });

    it("should render with INVALID status", () => {
      render(<HeaderValidationBadge status="INVALID" />);
      expect(screen.getByText("Invalid")).toBeInTheDocument();
    });
  });

  describe("Visual Styling - Badge Variants", () => {
    it("should use success variant for READY status", () => {
      const { container } = render(<HeaderValidationBadge status="READY" />);
      const badge = container.querySelector('[role="status"]');
      expect(badge?.className).toContain("bg-green-100");
    });

    it("should use warning variant for INCOMPLETE status", () => {
      const { container } = render(<HeaderValidationBadge status="INCOMPLETE" />);
      const badge = container.querySelector('[role="status"]');
      expect(badge?.className).toContain("bg-amber-100");
    });

    it("should use error variant for INVALID status", () => {
      const { container } = render(<HeaderValidationBadge status="INVALID" />);
      const badge = container.querySelector('[role="status"]');
      expect(badge?.className).toContain("bg-red-100");
    });

    it("should use default variant for PENDING status", () => {
      const { container } = render(<HeaderValidationBadge status="PENDING" />);
      const badge = container.querySelector('[role="status"]');
      expect(badge?.className).toContain("bg-slate-100");
    });
  });

  describe("Icons - Status Indicators", () => {
    it("should show checkmark icon for READY status", () => {
      const { container } = render(<HeaderValidationBadge status="READY" />);
      expect(container.textContent).toContain("✓");
    });

    it("should show warning icon for INCOMPLETE status", () => {
      const { container } = render(<HeaderValidationBadge status="INCOMPLETE" />);
      expect(container.textContent).toContain("⚠");
    });

    it("should show cross icon for INVALID status", () => {
      const { container } = render(<HeaderValidationBadge status="INVALID" />);
      expect(container.textContent).toContain("✗");
    });

    it("should show circle icon for PENDING status", () => {
      const { container } = render(<HeaderValidationBadge status="PENDING" />);
      expect(container.textContent).toContain("○");
    });
  });

  describe("Tooltip Messages - Detailed Status", () => {
    it("should show message for PENDING status", () => {
      render(<HeaderValidationBadge status="PENDING" />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "No data uploaded");
    });

    it("should show message for READY status with manual entries", () => {
      render(<HeaderValidationBadge status="READY" manualEntries={5} />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "5 manual entries ready for analysis");
    });

    it("should show message for READY status with files", () => {
      render(<HeaderValidationBadge status="READY" runsheets={2} invoices={3} />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "2 runsheet(s) and 3 invoice(s) ready");
    });

    it("should show missing files for INCOMPLETE status", () => {
      render(<HeaderValidationBadge status="INCOMPLETE" runsheets={2} invoices={0} />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "Missing: invoices");
    });

    it("should show multiple missing types for INCOMPLETE status", () => {
      render(<HeaderValidationBadge status="INCOMPLETE" runsheets={0} invoices={0} />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "Missing: runsheets, invoices");
    });

    it("should show error message for INVALID status", () => {
      render(<HeaderValidationBadge status="INVALID" />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "Invalid data - please review");
    });
  });

  describe("Accessibility - ARIA Labels", () => {
    it('should have role="status" attribute', () => {
      render(<HeaderValidationBadge status="READY" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should have descriptive aria-label for READY status", () => {
      render(<HeaderValidationBadge status="READY" runsheets={2} invoices={3} />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute(
        "aria-label",
        "Validation status: Ready. 2 runsheet(s) and 3 invoice(s) ready"
      );
    });

    it("should have descriptive aria-label for INCOMPLETE status", () => {
      render(<HeaderValidationBadge status="INCOMPLETE" runsheets={0} invoices={0} />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute(
        "aria-label",
        "Validation status: Incomplete. Missing: runsheets, invoices"
      );
    });

    it("should have descriptive aria-label for INVALID status", () => {
      render(<HeaderValidationBadge status="INVALID" />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute(
        "aria-label",
        "Validation status: Invalid. Invalid data - please review"
      );
    });

    it("should have aria-hidden on icon", () => {
      const { container } = render(<HeaderValidationBadge status="READY" />);
      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Props - Custom Styling", () => {
    it("should accept custom className", () => {
      const { container } = render(
        <HeaderValidationBadge status="READY" className="custom-badge" />
      );
      const badge = container.querySelector('[role="status"]');
      expect(badge?.className).toContain("custom-badge");
    });

    it("should maintain base classes with custom className", () => {
      const { container } = render(
        <HeaderValidationBadge status="READY" className="custom-badge" />
      );
      const badge = container.querySelector('[role="status"]');
      expect(badge?.className).toContain("inline-flex");
      expect(badge?.className).toContain("items-center");
    });
  });

  describe("State Transitions - Badge Updates", () => {
    it("should update from PENDING to INCOMPLETE", () => {
      const { rerender } = render(<HeaderValidationBadge status="PENDING" />);
      expect(screen.getByText("Pending")).toBeInTheDocument();

      rerender(<HeaderValidationBadge status="INCOMPLETE" />);
      expect(screen.getByText("Incomplete")).toBeInTheDocument();
    });

    it("should update from INCOMPLETE to READY", () => {
      const { rerender } = render(<HeaderValidationBadge status="INCOMPLETE" />);
      expect(screen.getByText("Incomplete")).toBeInTheDocument();

      rerender(<HeaderValidationBadge status="READY" />);
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    it("should update from READY to INVALID", () => {
      const { rerender } = render(<HeaderValidationBadge status="READY" />);
      expect(screen.getByText("Ready")).toBeInTheDocument();

      rerender(<HeaderValidationBadge status="INVALID" />);
      expect(screen.getByText("Invalid")).toBeInTheDocument();
    });
  });

  describe("File Count Props", () => {
    it("should handle runsheets count", () => {
      render(<HeaderValidationBadge status="READY" runsheets={5} invoices={0} />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "5 runsheet(s) and 0 invoice(s) ready");
    });

    it("should handle invoices count", () => {
      render(<HeaderValidationBadge status="READY" runsheets={0} invoices={7} />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "0 runsheet(s) and 7 invoice(s) ready");
    });

    it("should handle manual entries count", () => {
      render(<HeaderValidationBadge status="READY" manualEntries={10} />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "10 manual entries ready for analysis");
    });

    it("should prefer manual entries over files in message", () => {
      render(<HeaderValidationBadge status="READY" runsheets={2} invoices={3} manualEntries={5} />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "5 manual entries ready for analysis");
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero counts gracefully", () => {
      render(
        <HeaderValidationBadge
          status="READY"
          runsheets={0}
          invoices={0}
          totalFiles={0}
          manualEntries={0}
        />
      );
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should handle missing optional props", () => {
      render(<HeaderValidationBadge status="READY" />);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "0 runsheet(s) and 0 invoice(s) ready");
    });

    it("should handle all status values", () => {
      const statuses: ValidationStatus[] = ["PENDING", "READY", "INCOMPLETE", "INVALID"];

      statuses.forEach((status) => {
        const { container } = render(<HeaderValidationBadge status={status} />);
        expect(container.querySelector('[role="status"]')).toBeInTheDocument();
      });
    });
  });
});
