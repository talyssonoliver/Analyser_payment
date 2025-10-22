/**
 * Report Settlement Breakdown Component
 * Unified settlement summary display for all report views
 * Replaces: SettlementSummary, inline settlement grids
 */

"use client";

import styles from "@/styles/reports/report-settlement.module.css";
import type { ReportSettlementProps } from "./types";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

export function ReportSettlementBreakdown({
  breakdown,
  totals,
  variant = "full",
  className = "",
}: ReportSettlementProps) {
  const items = [
    { label: "Consignment Payments", value: breakdown.consignments },
    { label: "Pickup Services", value: breakdown.pickups },
    { label: "Unloading Bonus", value: breakdown.unloading },
    { label: "Attendance Bonus", value: breakdown.attendance },
    { label: "Early Arrival Bonus", value: breakdown.early },
  ];

  const variantClass = variant === "compact" ? styles.compact : "";

  return (
    <div className={`${styles.settlementContainer} ${variantClass} ${className}`}>
      <h3 className={styles.settlementTitle}>Settlement Summary</h3>
      <div className={styles.settlementGrid}>
        {items.map((item) => (
          <div key={item.label} className={styles.settlementItem}>
            <span className={styles.settlementLabel}>{item.label}</span>
            <span className={styles.settlementValue}>{formatCurrency(item.value || 0)}</span>
          </div>
        ))}

        <div className={`${styles.settlementItem} ${styles.settlementItemTotal}`}>
          <span className={styles.settlementLabel}>Total Expected</span>
          <span className={styles.settlementValue}>{formatCurrency(totals.expected || 0)}</span>
        </div>
      </div>
    </div>
  );
}
