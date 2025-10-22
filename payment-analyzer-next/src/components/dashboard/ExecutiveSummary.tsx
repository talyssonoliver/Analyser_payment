/**
 * ExecutiveSummary Component
 * Displays high-level financial metrics for the selected period
 */

"use client";

import styles from "@/styles/dashboard/executive.module.css";

interface ExecutiveSummaryProps {
  totalRevenue: number;
  avgDaily: number;
  deliveries: number;
  performance: number;
  revenueChange: number;
  deliveriesChange: number;
  periodLabel: string;
}

function getPerformanceLabel(performance: number): string {
  if (performance >= 95) return "Excellent";
  if (performance >= 85) return "Good";
  return "Needs Review";
}

export function ExecutiveSummary({
  totalRevenue,
  avgDaily,
  deliveries,
  performance,
  revenueChange,
  deliveriesChange,
  periodLabel,
}: Readonly<ExecutiveSummaryProps>) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Executive Summary</div>
        <div className={styles.period}>{periodLabel}</div>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Total Revenue</div>
          <div className={styles.statValue}>£{totalRevenue.toFixed(2)}</div>
          <div
            className={`${styles.statChange} ${revenueChange >= 0 ? styles.positive : styles.negative}`}
          >
            {revenueChange >= 0 ? "↑" : "↓"} {Math.abs(revenueChange).toFixed(0)}%
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Avg Daily</div>
          <div className={styles.statValue}>£{avgDaily.toFixed(2)}</div>
          <div className={styles.statChange}>→ 0%</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Deliveries</div>
          <div className={styles.statValue}>{deliveries}</div>
          <div
            className={`${styles.statChange} ${deliveriesChange >= 0 ? styles.positive : styles.negative}`}
          >
            {deliveriesChange >= 0 ? "↑" : "↓"} {Math.abs(deliveriesChange).toFixed(0)}%
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Performance</div>
          <div className={styles.statValue}>{performance.toFixed(0)}%</div>
          <div className={styles.statChange}>→ {getPerformanceLabel(performance)}</div>
        </div>
      </div>
    </div>
  );
}
