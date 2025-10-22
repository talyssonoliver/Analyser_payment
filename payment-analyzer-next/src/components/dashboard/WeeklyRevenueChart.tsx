/**
 * WeeklyRevenueChart Component
 * Bar chart showing expected vs actual revenue for weeks in a month
 */

"use client";

import type { AnalysisWithDetails, DailyEntryRecord } from "@/lib/repositories/analysis-repository";
import styles from "@/styles/dashboard/charts.module.css";

interface WeeklyRevenueChartProps {
  analyses: AnalysisWithDetails[];
  currentMonth: Date;
}

interface WeekData {
  label: string;
  expected: number;
  actual: number;
}

function generateWeeklyChartData(analyses: AnalysisWithDetails[], currentMonth: Date): WeekData[] {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);

  const weeks: WeekData[] = [];
  const weekStart = new Date(firstDay);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  for (let weekNum = 1; weekNum <= 4; weekNum++) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    let weekExpected = 0;
    let weekActual = 0;

    analyses.forEach((analysis) => {
      if (analysis.daily_entries) {
        analysis.daily_entries.forEach((entry: DailyEntryRecord) => {
          const entryDate = new Date(`${entry.date}T00:00:00`);
          const entryDateOnly = new Date(
            entryDate.getFullYear(),
            entryDate.getMonth(),
            entryDate.getDate()
          );
          const weekStartOnly = new Date(
            weekStart.getFullYear(),
            weekStart.getMonth(),
            weekStart.getDate()
          );
          const weekEndOnly = new Date(
            weekEnd.getFullYear(),
            weekEnd.getMonth(),
            weekEnd.getDate()
          );

          if (entryDateOnly >= weekStartOnly && entryDateOnly <= weekEndOnly) {
            weekExpected += entry.expected_total || 0;
            weekActual += entry.paid_amount || 0;
          }
        });
      }
    });

    weeks.push({
      label: `W${weekNum}`,
      expected: weekExpected,
      actual: weekActual,
    });

    weekStart.setDate(weekStart.getDate() + 7);
  }

  return weeks;
}

export function WeeklyRevenueChart({ analyses, currentMonth }: Readonly<WeeklyRevenueChartProps>) {
  const weeklyData = generateWeeklyChartData(analyses, currentMonth);
  const maxValue = Math.max(...weeklyData.map((w) => Math.max(w.expected, w.actual)), 1);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Revenue Trend</div>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: "#3b82f6" }} />
            <span>Expected</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: "#10b981" }} />
            <span>Actual</span>
          </div>
        </div>
      </div>
      <div className={styles.legacyBarChart}>
        <div className={styles.chartBars}>
          {weeklyData.map((week) => {
            const expectedHeight = Math.max(8, (week.expected / maxValue) * 85);
            const actualHeight = Math.max(8, (week.actual / maxValue) * 85);

            return (
              <div key={week.label} className={styles.chartWeek}>
                <div className={styles.barsWrapper}>
                  <div
                    className={`${styles.bar} ${styles.barExpected}`}
                    style={{
                      height: `${expectedHeight}px`,
                      background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    }}
                  >
                    {week.expected > 0 && (
                      <div className={styles.barValue}>£{Math.round(week.expected)}</div>
                    )}
                  </div>
                  <div
                    className={`${styles.bar} ${styles.barActual}`}
                    style={{
                      height: `${actualHeight}px`,
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    }}
                  >
                    {week.actual > 0 && (
                      <div className={styles.barValue}>£{Math.round(week.actual)}</div>
                    )}
                  </div>
                </div>
                <div className={styles.weekLabel}>{week.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
