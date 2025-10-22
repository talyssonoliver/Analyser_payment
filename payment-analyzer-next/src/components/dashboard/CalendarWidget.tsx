/**
 * CalendarWidget Component
 * Interactive calendar showing payment status for each day
 */

"use client";

import styles from "@/styles/dashboard/calendar.module.css";
import { CalendarTooltip } from "./CalendarTooltip";

type PaymentStatus = "pending" | "received" | "shortfall";

interface PaymentInfo {
  hasData: boolean;
  totalExpected: number;
  totalPaid: number;
  statuses: PaymentStatus[];
}

interface CalendarWidgetProps {
  readonly currentMonth: Date;
  readonly daysInMonth: (Date | null)[];
  readonly selectedDate: Date | null;
  readonly onNavigate: (direction: "prev" | "next") => void;
  readonly onDayWithDataClick: (date: Date) => void;
  readonly onDayWithoutDataClick: (date: Date) => void;
  readonly getPaymentInfoForDate: (date: Date | null) => PaymentInfo;
  readonly getStatusTooltip: (status: PaymentStatus, paymentInfo: PaymentInfo) => string;
  readonly formatCalendarDate: (date: Date | null) => string;
  readonly isToday: (date: Date | null) => boolean;
  readonly viewMode?: "monthly" | "weekly";
  readonly currentWeek?: Date;
  readonly getWeekStart?: (date: Date) => Date;
  readonly getWeekEnd?: (date: Date) => Date;
}

export function CalendarWidget({
  currentMonth,
  daysInMonth,
  selectedDate,
  onNavigate,
  onDayWithDataClick,
  onDayWithoutDataClick,
  getPaymentInfoForDate,
  getStatusTooltip,
  formatCalendarDate,
  isToday: isTodayFn,
  viewMode = "monthly",
  currentWeek,
  getWeekStart,
  getWeekEnd,
}: CalendarWidgetProps) {
  // Check if next period navigation should be disabled (would go to future)
  const isNextPeriodDisabled = () => {
    const now = new Date();

    if (viewMode === "weekly" && currentWeek && getWeekStart) {
      const nextWeek = new Date(currentWeek);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStart = getWeekStart(nextWeek);
      const nowWeekStart = getWeekStart(now);
      return nextWeekStart > nowWeekStart;
    } else {
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return (
        nextMonth.getFullYear() > now.getFullYear() ||
        (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() > now.getMonth())
      );
    }
  };

  // Get the title based on view mode
  const getCalendarTitle = () => {
    if (viewMode === "weekly" && currentWeek && getWeekStart && getWeekEnd) {
      const weekStart = getWeekStart(currentWeek);
      const weekEnd = getWeekEnd(currentWeek);
      return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Check if a date is in the current week
  const isInCurrentWeek = (date: Date | null) => {
    if (!date || viewMode !== "weekly" || !currentWeek || !getWeekStart || !getWeekEnd) {
      return false;
    }
    const weekStart = getWeekStart(currentWeek);
    const weekEnd = getWeekEnd(currentWeek);
    return date >= weekStart && date <= weekEnd;
  };

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.title}>{getCalendarTitle()}</div>
        <div className={styles.nav}>
          <button type="button" className={styles.navButton} onClick={() => onNavigate("prev")}>
            ‹
          </button>
          <button
            type="button"
            className={`${styles.navButton} ${isNextPeriodDisabled() ? styles.disabled : ""}`}
            onClick={() => onNavigate("next")}
            disabled={isNextPeriodDisabled()}
            aria-label={viewMode === "weekly" ? "Next week" : "Next month"}
          >
            ›
          </button>
        </div>
      </div>
      <div className={styles.grid}>
        {/* Weekday headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className={styles.dayHeader}>
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {daysInMonth.map((date, index) => {
          if (!date) {
            return (
              <div
                key={`empty-${currentMonth.getMonth()}-${index}`}
                className={`${styles.day} ${styles.disabled}`}
              />
            );
          }

          const paymentInfo = getPaymentInfoForDate(date);
          const hasData = paymentInfo.hasData;
          const isSelectedDate = selectedDate?.toDateString() === date.toDateString();
          const isTodayDate = isTodayFn(date);
          const isFuture = date > new Date();
          const inWeek = isInCurrentWeek(date);

          // Extract status class to avoid nested template literals
          const primaryStatusClass =
            paymentInfo.statuses.length > 0 ? `status-${paymentInfo.statuses[0]}` : "";

          return (
            <CalendarTooltip
              key={`tooltip-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
              date={date}
              paymentInfo={paymentInfo}
            >
              <button
                type="button"
                key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                onClick={() => {
                  if (!isFuture) {
                    if (hasData) {
                      onDayWithDataClick(date);
                    } else {
                      onDayWithoutDataClick(date);
                    }
                  }
                }}
                disabled={isFuture}
                className={`
                  ${styles.day}
                  ${isTodayDate ? styles.today : ""}
                  ${hasData ? styles.hasData : styles.noData}
                  ${isSelectedDate ? styles.selected : ""}
                  ${isFuture ? styles.future : styles.clickable}
                  ${inWeek ? styles.inCurrentWeek : ""}
                  ${primaryStatusClass ? styles[primaryStatusClass] : ""}
                `.trim()}
                aria-label={`${formatCalendarDate(date)} ${date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}${hasData ? " - has data" : ""}`}
                aria-disabled={isFuture}
                tabIndex={isFuture ? -1 : 0}
              >
                {formatCalendarDate(date)}

                {/* Payment Status Indicators */}
                {paymentInfo.statuses.length > 0 && (
                  <div className={styles.statusIndicatorsContainer}>
                    {paymentInfo.statuses.map((status, idx) => {
                      const statusClass = `status-${status}`;
                      return (
                        <div
                          key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${status}-${idx}`}
                          className={`${styles.statusIndicator} ${styles[statusClass]}`}
                          title={getStatusTooltip(status, paymentInfo)}
                        />
                      );
                    })}
                  </div>
                )}

                {!hasData && !isFuture && <div className={styles.addIndicator}>+</div>}
              </button>
            </CalendarTooltip>
          );
        })}
      </div>
    </div>
  );
}
