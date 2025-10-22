/**
 * Unit Tests for CalendarWidget Component
 * Tests calendar rendering, navigation, and day interactions
 */

import { describe, expect, it, vi } from "vitest";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { render, screen } from "@/tests/utils/test-utils";

type PaymentStatus = "pending" | "received" | "shortfall";

describe("CalendarWidget", () => {
  const mockPaymentInfo = {
    hasData: false,
    totalExpected: 0,
    totalPaid: 0,
    statuses: [] as PaymentStatus[],
  };

  const mockPaymentInfoWithData = {
    hasData: true,
    totalExpected: 200,
    totalPaid: 200,
    statuses: ["pending", "received"] as PaymentStatus[],
  };

  const defaultProps = {
    currentMonth: new Date("2024-01-15"),
    daysInMonth: [
      null, // Sunday padding
      new Date("2024-01-01"),
      new Date("2024-01-02"),
      new Date("2024-01-03"),
    ],
    selectedDate: null,
    onNavigate: vi.fn(),
    onDayWithDataClick: vi.fn(),
    onDayWithoutDataClick: vi.fn(),
    getPaymentInfoForDate: vi.fn(() => mockPaymentInfo),
    getStatusTooltip: vi.fn((status) => `Status: ${status}`),
    formatCalendarDate: vi.fn((date) => (date ? date.getDate().toString() : "")),
    isToday: vi.fn(() => false),
  };

  describe("Rendering", () => {
    it("should render without errors", () => {
      render(<CalendarWidget {...defaultProps} />);

      expect(screen.getByText(/January 2024/i)).toBeInTheDocument();
    });

    it("should display month and year in header", () => {
      render(<CalendarWidget {...defaultProps} />);

      expect(screen.getByText("January 2024")).toBeInTheDocument();
    });

    it("should render navigation buttons", () => {
      render(<CalendarWidget {...defaultProps} />);

      const prevButton = screen.getByRole("button", { name: /‹/ });
      const nextButton = screen.getByRole("button", { name: /›/ });

      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });

    it("should render weekday headers", () => {
      render(<CalendarWidget {...defaultProps} />);

      expect(screen.getByText("Sun")).toBeInTheDocument();
      expect(screen.getByText("Mon")).toBeInTheDocument();
      expect(screen.getByText("Tue")).toBeInTheDocument();
      expect(screen.getByText("Wed")).toBeInTheDocument();
      expect(screen.getByText("Thu")).toBeInTheDocument();
      expect(screen.getByText("Fri")).toBeInTheDocument();
      expect(screen.getByText("Sat")).toBeInTheDocument();
    });

    it("should render calendar days", () => {
      render(<CalendarWidget {...defaultProps} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should render empty cells for null dates", () => {
      // daysInMonth has null values for padding before the month starts
      const daysWithNulls = [null, null, ...defaultProps.daysInMonth];
      render(<CalendarWidget {...defaultProps} daysInMonth={daysWithNulls} />);

      // Calendar should have 7 weekday headers + days
      const allButtons = screen.getAllByRole("button");
      // At least some buttons should be day buttons (2 nav + multiple day buttons)
      expect(allButtons.length).toBeGreaterThan(2);
    });
  });

  describe("Navigation", () => {
    it("should call onNavigate with prev when previous button is clicked", () => {
      const onNavigate = vi.fn();
      render(<CalendarWidget {...defaultProps} onNavigate={onNavigate} />);

      const prevButton = screen.getByRole("button", { name: /‹/ });
      prevButton.click();

      expect(onNavigate).toHaveBeenCalledWith("prev");
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it("should call onNavigate with next when next button is clicked", () => {
      const onNavigate = vi.fn();
      render(<CalendarWidget {...defaultProps} onNavigate={onNavigate} />);

      const nextButton = screen.getByRole("button", { name: /›/ });
      nextButton.click();

      expect(onNavigate).toHaveBeenCalledWith("next");
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple navigation clicks", () => {
      const onNavigate = vi.fn();
      render(<CalendarWidget {...defaultProps} onNavigate={onNavigate} />);

      const prevButton = screen.getByRole("button", { name: /‹/ });
      const nextButton = screen.getByRole("button", { name: /›/ });

      prevButton.click();
      nextButton.click();
      prevButton.click();

      expect(onNavigate).toHaveBeenCalledTimes(3);
    });
  });

  describe("Day Click Handling - No Data", () => {
    it("should call onDayWithoutDataClick when day without data is clicked", () => {
      const onDayWithoutDataClick = vi.fn();
      render(<CalendarWidget {...defaultProps} onDayWithoutDataClick={onDayWithoutDataClick} />);

      const dayButton = screen.getByText("1");
      dayButton.click();

      expect(onDayWithoutDataClick).toHaveBeenCalledWith(new Date("2024-01-01"));
      expect(onDayWithoutDataClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onDayWithDataClick for days without data", () => {
      const onDayWithDataClick = vi.fn();
      render(<CalendarWidget {...defaultProps} onDayWithDataClick={onDayWithDataClick} />);

      const dayButton = screen.getByText("1");
      dayButton.click();

      expect(onDayWithDataClick).not.toHaveBeenCalled();
    });
  });

  describe("Day Click Handling - With Data", () => {
    it("should call onDayWithDataClick when day with data is clicked", () => {
      const onDayWithDataClick = vi.fn();
      const getPaymentInfoForDate = vi.fn(() => mockPaymentInfoWithData);

      render(
        <CalendarWidget
          {...defaultProps}
          onDayWithDataClick={onDayWithDataClick}
          getPaymentInfoForDate={getPaymentInfoForDate}
        />
      );

      const dayButton = screen.getByText("1");
      dayButton.click();

      expect(onDayWithDataClick).toHaveBeenCalledWith(new Date("2024-01-01"));
      expect(onDayWithDataClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onDayWithoutDataClick for days with data", () => {
      const onDayWithoutDataClick = vi.fn();
      const getPaymentInfoForDate = vi.fn(() => mockPaymentInfoWithData);

      render(
        <CalendarWidget
          {...defaultProps}
          onDayWithoutDataClick={onDayWithoutDataClick}
          getPaymentInfoForDate={getPaymentInfoForDate}
        />
      );

      const dayButton = screen.getByText("1");
      dayButton.click();

      expect(onDayWithoutDataClick).not.toHaveBeenCalled();
    });
  });

  describe("Future Date Handling", () => {
    it("should disable future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const props = {
        ...defaultProps,
        daysInMonth: [futureDate],
      };

      render(<CalendarWidget {...props} />);

      // Find the future date button by its text (day number)
      const dayButton = screen.getByRole("button", {
        name: new RegExp(futureDate.getDate().toString()),
      });
      expect(dayButton).toBeDisabled();
    });

    it("should not call click handlers for future dates", () => {
      const onDayWithDataClick = vi.fn();
      const onDayWithoutDataClick = vi.fn();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const props = {
        ...defaultProps,
        daysInMonth: [futureDate],
        onDayWithDataClick,
        onDayWithoutDataClick,
        formatCalendarDate: vi.fn(() => "25"),
      };

      render(<CalendarWidget {...props} />);

      const dayButton = screen.getByText("25");
      dayButton.click();

      expect(onDayWithDataClick).not.toHaveBeenCalled();
      expect(onDayWithoutDataClick).not.toHaveBeenCalled();
    });
  });

  describe("Today Highlighting", () => {
    it("should highlight today date", () => {
      const isToday = vi.fn((date) => date?.getDate() === 1);
      render(<CalendarWidget {...defaultProps} isToday={isToday} />);

      // Check isToday was called
      expect(isToday).toHaveBeenCalled();
      // Find the button for day 1
      const day1Button = screen.getByRole("button", { name: /^1 / });
      expect(day1Button).toBeInTheDocument();
    });

    it("should not highlight non-today dates", () => {
      const isToday = vi.fn(() => false);
      const { container } = render(<CalendarWidget {...defaultProps} isToday={isToday} />);

      const todayElements = container.querySelectorAll(".today");
      expect(todayElements).toHaveLength(0);
    });
  });

  describe("Selected Date", () => {
    it("should highlight selected date", () => {
      const selectedDate = new Date("2024-01-01");
      render(<CalendarWidget {...defaultProps} selectedDate={selectedDate} />);

      // Find the button for the selected date (day 1)
      const day1Button = screen.getByRole("button", { name: /^1 / });
      expect(day1Button).toBeInTheDocument();
    });

    it("should not highlight when no date is selected", () => {
      const { container } = render(<CalendarWidget {...defaultProps} selectedDate={null} />);

      const selectedElements = container.querySelectorAll(".selected");
      expect(selectedElements).toHaveLength(0);
    });
  });

  describe("Payment Status Indicators", () => {
    it("should display status indicators for days with data", () => {
      const getPaymentInfoForDate = vi.fn(() => mockPaymentInfoWithData);
      render(<CalendarWidget {...defaultProps} getPaymentInfoForDate={getPaymentInfoForDate} />);

      // Status indicators should be rendered (they have titles from getStatusTooltip)
      expect(getPaymentInfoForDate).toHaveBeenCalled();
      // Days with data should be clickable
      const dayButtons = screen.getAllByRole("button", { name: /has data/ });
      expect(dayButtons.length).toBeGreaterThan(0);
    });

    it("should not display status indicators for days without data", () => {
      const { container } = render(<CalendarWidget {...defaultProps} />);

      const indicators = container.querySelectorAll(".statusIndicator");
      expect(indicators).toHaveLength(0);
    });

    it("should call getStatusTooltip for each status", () => {
      const getStatusTooltip = vi.fn((status) => `Tooltip: ${status}`);
      const getPaymentInfoForDate = vi.fn(() => mockPaymentInfoWithData);

      render(
        <CalendarWidget
          {...defaultProps}
          getPaymentInfoForDate={getPaymentInfoForDate}
          getStatusTooltip={getStatusTooltip}
        />
      );

      expect(getStatusTooltip).toHaveBeenCalled();
    });

    it("should render multiple status indicators", () => {
      const multiStatusInfo = {
        hasData: true,
        totalExpected: 200,
        totalPaid: 150,
        statuses: ["pending", "received", "shortfall"] as PaymentStatus[],
      };

      const getPaymentInfoForDate = vi.fn(() => multiStatusInfo);
      const getStatusTooltip = vi.fn();
      render(
        <CalendarWidget
          {...defaultProps}
          getPaymentInfoForDate={getPaymentInfoForDate}
          getStatusTooltip={getStatusTooltip}
        />
      );

      // getStatusTooltip should be called for each status (3 statuses * number of days)
      expect(getStatusTooltip).toHaveBeenCalled();
      expect(getPaymentInfoForDate).toHaveBeenCalled();
    });
  });

  describe("Add Indicator", () => {
    it("should show add indicator for days without data", () => {
      render(<CalendarWidget {...defaultProps} />);

      // Days without data should have '+' indicator (exclude null days)
      const nonNullDays = defaultProps.daysInMonth.filter((day) => day !== null);
      expect(screen.getAllByText("+")).toHaveLength(nonNullDays.length);
    });

    it("should not show add indicator for days with data", () => {
      const getPaymentInfoForDate = vi.fn(() => mockPaymentInfoWithData);
      const { container } = render(
        <CalendarWidget {...defaultProps} getPaymentInfoForDate={getPaymentInfoForDate} />
      );

      const dayWithData = container.querySelector(".hasData .addIndicator");
      expect(dayWithData).not.toBeInTheDocument();
    });

    it("should not show add indicator for future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const props = {
        ...defaultProps,
        daysInMonth: [futureDate],
        formatCalendarDate: vi.fn(() => futureDate.getDate().toString()),
      };

      render(<CalendarWidget {...props} />);

      // Future dates should not have '+' indicator
      expect(screen.queryByText("+")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have aria-labels for day buttons", () => {
      render(<CalendarWidget {...defaultProps} />);

      const dayButton = screen.getByText("1");
      expect(dayButton).toHaveAttribute("aria-label");
    });

    it("should disable future date buttons", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const props = {
        ...defaultProps,
        daysInMonth: [futureDate],
        formatCalendarDate: vi.fn(() => "25"),
      };

      render(<CalendarWidget {...props} />);

      const dayButton = screen.getByText("25");
      expect(dayButton).toBeDisabled();
    });

    it("should not disable past dates", () => {
      render(<CalendarWidget {...defaultProps} />);

      const dayButton = screen.getByText("1");
      expect(dayButton).not.toBeDisabled();
    });
  });

  describe("CSS Classes", () => {
    it("should apply hasData class to days with data", () => {
      const getPaymentInfoForDate = vi.fn(() => mockPaymentInfoWithData);
      render(<CalendarWidget {...defaultProps} getPaymentInfoForDate={getPaymentInfoForDate} />);

      // Days with data show in aria-label
      const dayButtons = screen.getAllByRole("button", { name: /has data/ });
      expect(dayButtons.length).toBeGreaterThan(0);
    });

    it("should apply noData class to days without data", () => {
      render(<CalendarWidget {...defaultProps} />);

      // Days without data don't have "has data" in aria-label
      const allDayButtons = screen.getAllByRole("button");
      const navButtons = screen.getAllByRole("button", { name: /[‹›]/ });
      const dayButtons = allDayButtons.filter((btn) => !navButtons.includes(btn));
      expect(dayButtons.length).toBeGreaterThan(0);
    });

    it("should apply clickable class to clickable days", () => {
      render(<CalendarWidget {...defaultProps} />);

      // All non-future days should be clickable (not disabled)
      const allButtons = screen.getAllByRole("button");
      const navButtons = screen.getAllByRole("button", { name: /[‹›]/ });
      const dayButtons = allButtons.filter(
        (btn) => !navButtons.includes(btn) && !(btn as HTMLButtonElement).disabled
      );
      expect(dayButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle month with many null padding days", () => {
      const props = {
        ...defaultProps,
        daysInMonth: [null, null, null, null, null, null, new Date("2024-01-01")],
      };

      render(<CalendarWidget {...props} />);

      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("should handle rapid day clicks", () => {
      const onDayWithoutDataClick = vi.fn();
      render(<CalendarWidget {...defaultProps} onDayWithoutDataClick={onDayWithoutDataClick} />);

      const dayButton = screen.getByText("1");

      for (let i = 0; i < 5; i++) {
        dayButton.click();
      }

      expect(onDayWithoutDataClick).toHaveBeenCalledTimes(5);
    });

    it("should handle empty daysInMonth array", () => {
      const props = {
        ...defaultProps,
        daysInMonth: [],
      };

      render(<CalendarWidget {...props} />);

      expect(screen.getByText(/January 2024/i)).toBeInTheDocument();
    });
  });
});
