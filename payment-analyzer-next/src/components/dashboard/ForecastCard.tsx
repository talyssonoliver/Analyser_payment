/**
 * ForecastCard Component
 * Displays AI-powered revenue forecasts based on working days (Mon-Fri)
 */

"use client";

import styles from "@/styles/dashboard/forecast.module.css";

interface ForecastCardProps {
  totalRevenue: number;
  avgDaily: number;
  viewMode?: "monthly" | "weekly";
  currentMonth?: Date;
  currentWeek?: Date;
}

// Helper: Check if a date is a weekday (Monday-Friday)
const isWeekday = (date: Date): boolean => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
};

// Helper: Count working days in a date range
const countWorkingDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    if (isWeekday(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

// Helper: Count remaining working days from today to end of month
const getRemainingWorkingDaysInMonth = (referenceMonth: Date): number => {
  const today = new Date();
  const monthEnd = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0);

  // If viewing a past month, return 0
  if (monthEnd < today) {
    return 0;
  }

  // Count from today to end of month
  return countWorkingDays(today, monthEnd);
};

// Helper: Get total working days in a month
const getWorkingDaysInMonth = (referenceMonth: Date): number => {
  const monthStart = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const monthEnd = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0);
  return countWorkingDays(monthStart, monthEnd);
};

// Calculate month-end projection
const calculateMonthEndProjection = (
  viewMode: string,
  totalRevenue: number,
  avgDaily: number,
  referenceDate: Date,
  now: Date
): number => {
  if (viewMode === "monthly") {
    const totalWorkingDays = getWorkingDaysInMonth(referenceDate);
    return avgDaily > 0 ? avgDaily * totalWorkingDays : totalRevenue;
  }

  // Weekly view: project for rest of current month
  const remainingWorkingDays = getRemainingWorkingDaysInMonth(now);
  return totalRevenue + avgDaily * remainingWorkingDays;
};

// Calculate suggested daily target
const calculateDailyTarget = (
  viewMode: string,
  avgDaily: number,
  referenceDate: Date,
  now: Date
): number => {
  if (viewMode !== "monthly") {
    return avgDaily > 0 ? avgDaily * 1.1 : 0;
  }

  const isCurrentMonth =
    referenceDate.getFullYear() === now.getFullYear() &&
    referenceDate.getMonth() === now.getMonth();

  if (isCurrentMonth) {
    return avgDaily > 0 ? avgDaily * 1.1 : 0;
  }

  return avgDaily;
};

export function ForecastCard({
  totalRevenue,
  avgDaily,
  viewMode = "monthly",
  currentMonth = new Date(),
  currentWeek = new Date(),
}: Readonly<ForecastCardProps>) {
  const now = new Date();
  const referenceDate = viewMode === "weekly" ? currentWeek : currentMonth;

  // Calculate forecasts based on working days only (Mon-Fri)
  const nextWeekExpected = avgDaily > 0 ? avgDaily * 5 : 0; // 5 working days
  const monthEndProjection = calculateMonthEndProjection(
    viewMode,
    totalRevenue,
    avgDaily,
    referenceDate,
    now
  );
  const suggestedDailyTarget = calculateDailyTarget(viewMode, avgDaily, referenceDate, now);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ display: "inline-block", marginRight: "8px" }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 13v4M11 10v7M15 7v10" />
          </svg>
          Forecast
        </div>
        <div className={styles.badge}>AI Predicted</div>
      </div>
      <div className={styles.items}>
        <div className={styles.item}>
          <div className={styles.label}>Next Week Expected</div>
          <div className={styles.value}>£{nextWeekExpected.toFixed(2)}</div>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>Month End Projection</div>
          <div className={styles.value}>£{monthEndProjection.toFixed(2)}</div>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>Suggested Daily Target</div>
          <div className={styles.value}>£{suggestedDailyTarget.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
