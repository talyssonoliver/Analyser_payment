/**
 * DayDataModal Component
 * Displays detailed payment information for a selected day
 */

"use client";

import { Calendar, FileText } from "lucide-react";
import styles from "@/styles/dashboard/modals.module.css";

interface DayData {
  date: string;
  analysisId: string;
  analysisName: string;
  data: {
    consignments: number;
    expectedTotal: number;
    paidAmount: number;
    difference: number;
    status: string;
  };
}

interface DayDataModalProps {
  open: boolean;
  onClose: () => void;
  dayData: DayData[] | null;
  onEdit: (analysisId: string, date: string) => void;
}

export function DayDataModal({ open, onClose, dayData, onEdit }: Readonly<DayDataModalProps>) {
  if (!open || !dayData || dayData.length === 0) return null;

  const data = dayData[0];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <button type="button" onClick={onClose} className={styles.closeButton}>
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className={styles.iconContainer}>
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>

          <h3 className={styles.title}>{data.analysisName}</h3>

          <div className={styles.statusBadge}>
            <div className={styles.statusDot} />
            {data.data.status}
          </div>
        </div>

        {/* Data Display */}
        <div className={styles.content}>
          {/* Main Metrics */}
          <div className={styles.metrics}>
            <div className={styles.consignmentsCard}>
              <div className={styles.consignmentsIcon}>
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div>
                <div className={styles.metricLabel}>Consignments</div>
                <div className={styles.metricValue}>{data.data.consignments}</div>
              </div>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.expectedCard}>
                <div className={styles.cardLabel}>Expected</div>
                <div className={styles.cardValue}>£{data.data.expectedTotal.toFixed(2)}</div>
              </div>

              <div className={styles.receivedCard}>
                <div className={styles.cardLabel}>Received</div>
                <div className={styles.cardValue}>£{data.data.paidAmount.toFixed(2)}</div>
              </div>
            </div>

            {/* Difference Card */}
            <div className={data.data.difference >= 0 ? styles.surplusCard : styles.shortfallCard}>
              <div className={styles.differenceLabel}>
                {data.data.difference >= 0 ? "Surplus" : "Shortfall"}
              </div>
              <div className={styles.differenceValue}>
                £{Math.abs(data.data.difference).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => onEdit(data.analysisId, data.date)}
          >
            <FileText className="w-4 h-4" />
            View Complete Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
