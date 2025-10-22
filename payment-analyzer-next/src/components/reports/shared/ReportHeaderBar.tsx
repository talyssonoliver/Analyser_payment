/**
 * Report Header Bar Component
 * Unified header display for all report views
 * Replaces: ReportHeader, modal headers, step3 titles
 */

"use client";

import type React from "react";
import styles from "@/styles/reports/report-header.module.css";
import type { ReportHeaderBarProps } from "./types";

export function ReportHeaderBar({
  data,
  context = "page",
  className = "",
}: Readonly<ReportHeaderBarProps>) {
  // Determine context class
  let contextClass = styles.contextPage;
  if (context === "modal") {
    contextClass = styles.contextModal;
  } else if (context === "inline") {
    contextClass = styles.contextInline;
  }

  return (
    <div className={`${styles.headerContainer} ${contextClass} ${className}`}>
      <div className={styles.headerContent}>
        {context === "page" && <div className={styles.headerCompany}>FINANCIAL ANALYSIS</div>}

        <div className={styles.headerTitle}>{data.reportType}</div>

        <div className={styles.headerMeta}>
          <MetaItem label="Period" value={data.period} />
          <MetaItem label="Generated" value={data.generatedDate} />
          <MetaItem label="Total Days" value={data.totalDays.toString()} />
          <MetaItem label="Status" value={data.status} />
        </div>
      </div>
    </div>
  );
}

const MetaItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className={styles.metaItem}>
    <div className={styles.metaLabel}>{label}</div>
    <div className={styles.metaValue}>{value}</div>
  </div>
);
