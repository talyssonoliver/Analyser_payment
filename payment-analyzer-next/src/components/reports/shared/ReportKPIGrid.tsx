/**
 * Report KPI Grid Component
 * Unified KPI display for all report views
 * Replaces: KPICard usage, Step3SummaryCards, inline modal KPI cards
 */

"use client";

import styles from "@/styles/reports/report-kpi-grid.module.css";
import type { ReportKPIGridProps } from "./types";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

export function ReportKPIGrid({
  data,
  variant = "full",
  columns = 4,
  className = "",
}: Readonly<ReportKPIGridProps>) {
  const differenceAmount = data.difference ?? 0;
  const differenceTone = differenceAmount >= 0 ? "toneSuccess" : "toneDanger";
  const differenceDescription = differenceAmount >= 0 ? "Overpaid" : "Underpaid";
  const differenceIcon = differenceAmount >= 0 ? "↗️" : "↘️";

  const compactClass = variant === "compact" ? styles.compact : "";
  const columnsClass = columns === 2 ? styles.cols2 : styles.cols4;

  return (
    <div className={`${styles.kpiGrid} ${columnsClass} ${className}`}>
      {/* Expected Total */}
      <div className={`${styles.kpiCard} ${styles.toneInfo} ${compactClass}`}>
        <div className={styles.kpiCardIcon}>📋</div>
        <div className={styles.kpiCardContent}>
          <div className={styles.kpiCardLabel}>Expected Total</div>
          <div className={styles.kpiCardValue}>{formatCurrency(data.expected ?? 0)}</div>
          <div className={styles.kpiCardDescription}>Total earnings</div>
        </div>
      </div>

      {/* Paid Amount */}
      <div className={`${styles.kpiCard} ${styles.toneSuccess} ${compactClass}`}>
        <div className={styles.kpiCardIcon}>💰</div>
        <div className={styles.kpiCardContent}>
          <div className={styles.kpiCardLabel}>Paid Amount</div>
          <div className={styles.kpiCardValue}>{formatCurrency(data.paid ?? 0)}</div>
          <div className={styles.kpiCardDescription}>Amount received</div>
        </div>
      </div>

      {/* Difference */}
      <div className={`${styles.kpiCard} ${styles[differenceTone]} ${compactClass}`}>
        <div className={styles.kpiCardIcon}>{differenceIcon}</div>
        <div className={styles.kpiCardContent}>
          <div className={styles.kpiCardLabel}>Difference</div>
          <div className={styles.kpiCardValue}>{formatCurrency(Math.abs(differenceAmount))}</div>
          <div className={styles.kpiCardDescription}>{differenceDescription}</div>
        </div>
      </div>

      {/* Consignments */}
      <div className={`${styles.kpiCard} ${styles.tonePrimary} ${compactClass}`}>
        <div className={styles.kpiCardIcon}>📦</div>
        <div className={styles.kpiCardContent}>
          <div className={styles.kpiCardLabel}>Consignments</div>
          <div className={styles.kpiCardValue}>
            {data.consignments?.toLocaleString("en-GB") ?? "0"}
          </div>
          <div className={styles.kpiCardDescription}>Total deliveries</div>
        </div>
      </div>
    </div>
  );
}
