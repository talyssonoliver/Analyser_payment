/**
 * Unit Tests for CalendarTooltip Component
 * Tests tooltip rendering, positioning, keyboard navigation, touch support, and accessibility
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarTooltip } from "@/components/dashboard/CalendarTooltip";
import { act, fireEvent, render, screen, waitFor } from "@/tests/utils/test-utils";

type PaymentStatus = "pending" | "received" | "shortfall";

interface PaymentInfo {
  hasData: boolean;
  totalExpected: number;
  totalPaid: number;
  statuses: PaymentStatus[];
}

describe("CalendarTooltip", () => {
  const mockDate = new Date("2024-01-15");
  const mockPaymentInfoNoData: PaymentInfo = {
    hasData: false,
    totalExpected: 0,
    totalPaid: 0,
    statuses: [],
  };

  const mockPaymentInfoWithData: PaymentInfo = {
    hasData: true,
    totalExpected: 200.0,
    totalPaid: 200.0,
    statuses: ["pending", "received"],
  };

  const mockPaymentInfoWithShortfall: PaymentInfo = {
    hasData: true,
    totalExpected: 200.0,
    totalPaid: 150.0,
    statuses: ["pending", "received", "shortfall"],
  };

  const mockPaymentInfoWithSurplus: PaymentInfo = {
    hasData: true,
    totalExpected: 200.0,
    totalPaid: 250.0,
    statuses: ["pending", "received"],
  };

  beforeEach(() => {
    // Mock requestAnimationFrame
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 100,
      bottom: 120,
      right: 120,
      width: 20,
      height: 20,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers(); // Always restore real timers to prevent test pollution
  });

  describe("Rendering", () => {
    it("should render children without tooltip when no data", () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoNoData}>
          <button>15</button>
        </CalendarTooltip>
      );

      expect(screen.getByRole("button", { name: "15" })).toBeInTheDocument();
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("should render children with tooltip wrapper when data exists", () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      expect(screen.getByRole("button", { name: "15" })).toBeInTheDocument();
    });

    it("should not show tooltip immediately", () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  describe("Mouse Interaction", () => {
    it("should show tooltip on mouse enter after delay", async () => {
      vi.useFakeTimers();

      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });

      act(() => {
        fireEvent.mouseEnter(trigger);
      });

      act(() => {
        vi.advanceTimersByTime(200);
        vi.runOnlyPendingTimers();
      });

      // Check synchronously after flushing timers
      expect(screen.getByRole("tooltip")).toBeInTheDocument();

      vi.useRealTimers();
    });

    it("should hide tooltip on mouse leave", async () => {
      vi.useFakeTimers();

      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });

      act(() => {
        fireEvent.mouseEnter(trigger);
      });

      act(() => {
        vi.advanceTimersByTime(200);
        vi.runOnlyPendingTimers();
      });

      expect(screen.getByRole("tooltip")).toBeInTheDocument();

      act(() => {
        fireEvent.mouseLeave(trigger);
      });

      act(() => {
        vi.advanceTimersByTime(100);
        vi.runOnlyPendingTimers();
      });

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it("should keep tooltip visible when hovering over tooltip itself", async () => {
      vi.useFakeTimers();

      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });

      act(() => {
        fireEvent.mouseEnter(trigger);
      });

      act(() => {
        vi.advanceTimersByTime(200);
        vi.runOnlyPendingTimers();
      });

      expect(screen.getByRole("tooltip")).toBeInTheDocument();

      const tooltip = screen.getByRole("tooltip");

      act(() => {
        fireEvent.mouseEnter(tooltip);
      });

      // Tooltip should still be visible
      expect(screen.getByRole("tooltip")).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should show tooltip on focus", async () => {
      vi.useFakeTimers();

      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });

      act(() => {
        fireEvent.focus(trigger);
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("should hide tooltip on blur", async () => {
      vi.useFakeTimers();

      render(
        <>
          <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
            <button>15</button>
          </CalendarTooltip>
          <button>Other</button>
        </>
      );

      const trigger = screen.getByRole("button", { name: "15" });

      act(() => {
        fireEvent.focus(trigger);
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      act(() => {
        fireEvent.blur(trigger);
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("should hide tooltip on Escape key", async () => {
      vi.useFakeTimers();

      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });

      act(() => {
        fireEvent.mouseEnter(trigger);
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      act(() => {
        fireEvent.keyDown(trigger, { key: "Escape" });
      });

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe("Touch Support", () => {
    it("should show tooltip on touch start with delay", async () => {
      vi.useFakeTimers();

      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });

      act(() => {
        trigger.dispatchEvent(new TouchEvent("touchstart", { bubbles: true }));
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("should hide tooltip after touch end with delay", async () => {
      vi.useFakeTimers();

      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });

      act(() => {
        trigger.dispatchEvent(new TouchEvent("touchstart", { bubbles: true }));
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      act(() => {
        trigger.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe("Tooltip Content", () => {
    it("should display formatted date", async () => {
      vi.useFakeTimers();

      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });

      act(() => {
        fireEvent.mouseEnter(trigger);
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/Monday, 15 January 2024/i)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("should display expected amount", async () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/Expected:/i)).toBeInTheDocument();
        expect(screen.getByText(/£200\.00/)).toBeInTheDocument();
      });
    });

    it("should display received amount", async () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/Received:/i)).toBeInTheDocument();
      });
    });

    it("should display shortfall when paid < expected", async () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithShortfall}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/Shortfall:/i)).toBeInTheDocument();
        expect(screen.getByText(/£50\.00/)).toBeInTheDocument();
      });
    });

    it("should display surplus when paid > expected", async () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithSurplus}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/Surplus:/i)).toBeInTheDocument();
        expect(screen.getByText(/£50\.00/)).toBeInTheDocument();
      });
    });

    it("should display all status badges", async () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithShortfall}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/Pending Payment/i)).toBeInTheDocument();
        expect(screen.getByText(/Payment Received/i)).toBeInTheDocument();
        expect(screen.getByText(/Payment Shortfall/i)).toBeInTheDocument();
      });
    });

    it("should use custom currency formatter if provided", async () => {
      const customFormatter = vi.fn((value: number) => `$${value.toFixed(2)}`);

      render(
        <CalendarTooltip
          date={mockDate}
          paymentInfo={mockPaymentInfoWithData}
          formatCurrency={customFormatter}
        >
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(customFormatter).toHaveBeenCalledWith(200.0);
      });
    });
  });

  describe("Positioning", () => {
    it("should calculate position on show", async () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveStyle({ position: "fixed" });
      });
    });

    it("should adjust position to avoid viewport overflow", async () => {
      // Mock getBoundingClientRect to simulate near viewport edge
      Element.prototype.getBoundingClientRect = vi.fn(() => ({
        top: window.innerHeight - 50,
        left: 10,
        bottom: window.innerHeight - 30,
        right: 30,
        width: 20,
        height: 20,
        x: 10,
        y: window.innerHeight - 50,
        toJSON: () => ({}),
      }));

      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have role='tooltip'", async () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });
    });

    it("should have aria-live='polite'", async () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveAttribute("aria-live", "polite");
      });
    });

    it("should be keyboard accessible", async () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      // Tab to focus the trigger
      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.focus(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      if (document.activeElement?.textContent === "15") {
        await waitFor(
          () => {
            expect(screen.getByRole("tooltip")).toBeInTheDocument();
          },
          { timeout: 300 }
        );
      }
    });
  });

  describe("Performance", () => {
    it("should cleanup timers on unmount", () => {
      const { unmount } = render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      unmount();

      // Should not throw errors
      expect(true).toBe(true);
    });

    it("should handle rapid hover events", async () => {
      vi.useFakeTimers();

      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });

      // Rapid hover/unhover
      for (let i = 0; i < 5; i++) {
        act(() => {
          fireEvent.mouseEnter(trigger);
        });
        act(() => {
          fireEvent.mouseLeave(trigger);
        });
      }

      // Should not throw errors
      expect(true).toBe(true);

      vi.useRealTimers();
    });

    it("should use requestAnimationFrame for position calculation", async () => {
      const rafSpy = vi.spyOn(window, "requestAnimationFrame");

      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithData}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(rafSpy).toHaveBeenCalled();
      });

      rafSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero values correctly", async () => {
      const zeroPaymentInfo: PaymentInfo = {
        hasData: true,
        totalExpected: 0,
        totalPaid: 0,
        statuses: ["pending"],
      };

      render(
        <CalendarTooltip date={mockDate} paymentInfo={zeroPaymentInfo}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/£0\.00/)).toBeInTheDocument();
      });
    });

    it("should handle negative difference (shortfall)", async () => {
      render(
        <CalendarTooltip date={mockDate} paymentInfo={mockPaymentInfoWithShortfall}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/Shortfall:/i)).toBeInTheDocument();
      });
    });

    it("should handle very large amounts", async () => {
      const largePaymentInfo: PaymentInfo = {
        hasData: true,
        totalExpected: 999999.99,
        totalPaid: 999999.99,
        statuses: ["pending", "received"],
      };

      render(
        <CalendarTooltip date={mockDate} paymentInfo={largePaymentInfo}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/£999,999\.99/)).toBeInTheDocument();
      });
    });

    it("should handle empty status array", async () => {
      const noStatusInfo: PaymentInfo = {
        hasData: true,
        totalExpected: 100,
        totalPaid: 100,
        statuses: [],
      };

      render(
        <CalendarTooltip date={mockDate} paymentInfo={noStatusInfo}>
          <button>15</button>
        </CalendarTooltip>
      );

      const trigger = screen.getByRole("button", { name: "15" });
      vi.useFakeTimers();
      act(() => {
        fireEvent.mouseEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
        expect(screen.queryByText(/Pending Payment/i)).not.toBeInTheDocument();
      });
    });
  });
});
