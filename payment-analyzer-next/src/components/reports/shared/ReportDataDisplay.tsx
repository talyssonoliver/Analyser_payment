/**
 * Report Data Display Component
 * Unified table/cards hybrid for all daily entry displays
 * Replaces: ReportTable, WeeklyBreakdown tables, inline tables
 */

"use client";

import { Edit2 } from "lucide-react";
import { useMemo } from "react";
import { getStatusLabel } from "@/lib/utils/status-mapper";
import styles from "@/styles/reports/report-data-display.module.css";
import type { ReportDailyEntry, ReportDataDisplayProps } from "./types";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

export function ReportDataDisplay({
  dailyEntries,
  totals,
  mode = "auto",
  viewMode = "week",
  compactView = false,
  showEditButton = false,
  onToggleCompactView,
  onEditDayData,
  className = "",
}: Readonly<ReportDataDisplayProps>) {
  // Group entries by month if viewMode is 'month'
  const displayEntries = useMemo(() => {
    if (viewMode !== "month") return dailyEntries;

    const monthGroups: { [key: string]: ReportDailyEntry[] } = {};

    dailyEntries.forEach((entry) => {
      const date = new Date(entry.date);
      const monthKey = date.toISOString().slice(0, 7);

      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }
      monthGroups[monthKey].push(entry);
    });

    return Object.entries(monthGroups)
      .map(([monthKey, monthEntries]) => {
        const totalConsignments = monthEntries.reduce((sum, e) => sum + e.consignments, 0);
        const totalBasePay = monthEntries.reduce((sum, e) => sum + e.basePay, 0);
        const totalPickupTotal = monthEntries.reduce((sum, e) => sum + e.pickupTotal, 0);
        const totalExpected = monthEntries.reduce((sum, e) => sum + e.expected, 0);
        const totalPaid = monthEntries.reduce((sum, e) => sum + e.paid, 0);
        const totalDifference = monthEntries.reduce((sum, e) => sum + e.difference, 0);

        const date = new Date(`${monthKey}-01`);
        const monthName = date.toLocaleDateString("en-GB", { year: "numeric", month: "long" });

        return {
          date: monthKey,
          day: monthName,
          consignments: totalConsignments,
          rate: 0,
          basePay: totalBasePay,
          pickups: monthEntries.reduce((sum, e) => sum + e.pickups, 0),
          pickupTotal: totalPickupTotal,
          bonuses: {
            unloading: monthEntries.reduce((sum, e) => sum + e.bonuses.unloading, 0),
            attendance: monthEntries.reduce((sum, e) => sum + e.bonuses.attendance, 0),
            early: monthEntries.reduce((sum, e) => sum + e.bonuses.early, 0),
          },
          expected: totalExpected,
          paid: totalPaid,
          difference: totalDifference,
          status: (totalDifference >= 0 ? "complete" : "underpaid") as ReportDailyEntry["status"],
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [dailyEntries, viewMode]);

  const getStatusBadge = (status: ReportDailyEntry["status"]) => {
    const statusClasses: Record<string, string> = {
      complete: styles.statusComplete,
      balanced: styles.statusBalanced,
      overpaid: styles.statusOverpaid,
      underpaid: styles.statusUnderpaid,
      pending: styles.statusPending,
    };

    // Use shared status label getter
    const label = getStatusLabel(status);

    return (
      <span className={`${styles.statusBadge} ${statusClasses[status] || statusClasses.complete}`}>
        {label}
      </span>
    );
  };

  const renderTableView = () => (
    <div className={styles.tableWrapper}>
      <table className={`${styles.dataTable} ${compactView ? styles.compact : ""}`}>
        <thead>
          <tr>
            <th scope="col">{viewMode === "week" ? "Date" : "Month"}</th>
            <th scope="col">{viewMode === "week" ? "Day" : "Period"}</th>
            <th scope="col">Consignments</th>
            <th scope="col">{viewMode === "week" ? "Rate" : "Avg Rate"}</th>
            <th scope="col">Base Pay</th>
            {!compactView && <th scope="col">Pickups</th>}
            <th scope="col">Bonuses</th>
            <th scope="col">Expected</th>
            <th scope="col">Paid</th>
            <th scope="col">Difference</th>
            <th scope="col">Status</th>
            {showEditButton && (
              <th scope="col" className="text-center">
                Action
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {displayEntries.map((entry) => (
            <tr key={entry.date}>
              <td className={styles.cellDate}>{entry.date}</td>
              <td className={styles.cellDay}>{entry.day}</td>
              <td className={styles.cellConsignments}>{entry.consignments}</td>
              <td className={styles.cellCurrency}>
                {viewMode === "week" ? formatCurrency(entry.rate || 0) : "N/A"}
              </td>
              <td className={styles.cellCurrency}>{formatCurrency(entry.basePay || 0)}</td>
              {!compactView && (
                <td className={styles.cellCurrency}>{formatCurrency(entry.pickupTotal || 0)}</td>
              )}
              <td className={styles.cellCurrency}>
                {formatCurrency(
                  (entry.bonuses.unloading || 0) +
                    (entry.bonuses.attendance || 0) +
                    (entry.bonuses.early || 0)
                )}
              </td>
              <td className={styles.cellCurrency}>{formatCurrency(entry.expected || 0)}</td>
              <td className={styles.cellCurrency}>{formatCurrency(entry.paid || 0)}</td>
              <td
                className={`${styles.cellCurrency} ${entry.difference >= 0 ? styles.cellPositive : styles.cellNegative}`}
              >
                {formatCurrency(entry.difference || 0)}
              </td>
              <td>{getStatusBadge(entry.status)}</td>
              {showEditButton && (
                <td className="text-center">
                  <button
                    type="button"
                    onClick={() => onEditDayData?.(entry)}
                    className={styles.editButton}
                    title="Edit day data"
                    aria-label={`Edit day data for ${entry.date}`}
                  >
                    <Edit2 className="w-4 h-4" aria-hidden="true" />
                    Edit
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Totals</td>
            <td className={styles.cellConsignments}>{totals.consignments}</td>
            <td>-</td>
            <td className={styles.cellCurrency}>{formatCurrency(totals.basePay || 0)}</td>
            {!compactView && (
              <td className={styles.cellCurrency}>{formatCurrency(totals.pickups || 0)}</td>
            )}
            <td className={styles.cellCurrency}>{formatCurrency(totals.bonuses || 0)}</td>
            <td className={styles.cellCurrency}>{formatCurrency(totals.expected || 0)}</td>
            <td className={styles.cellCurrency}>{formatCurrency(totals.paid || 0)}</td>
            <td
              className={`${styles.cellCurrency} ${totals.difference >= 0 ? styles.cellPositive : styles.cellNegative}`}
            >
              {formatCurrency(totals.difference || 0)}
            </td>
            <td>-</td>
            {showEditButton && <td>-</td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const renderCardsView = () => (
    <div className={styles.cardsContainer}>
      {displayEntries.map((entry) => (
        <div key={entry.date} className={styles.dayCard}>
          <div className={styles.dayCardHeader}>
            <div className={styles.dayCardDateInfo}>
              <div className={styles.dayCardDayName}>{entry.day}</div>
              <div className={styles.dayCardDate}>{entry.date}</div>
            </div>
            {getStatusBadge(entry.status)}
          </div>

          <div className={styles.dayCardBody}>
            <div className={styles.dayCardRow}>
              <div className={styles.dayCardLabel}>Consignments</div>
              <div className={styles.dayCardValue}>{entry.consignments}</div>
            </div>
            <div className={styles.dayCardRow}>
              <div className={styles.dayCardLabel}>Base Pay</div>
              <div className={styles.dayCardValue}>{formatCurrency(entry.basePay)}</div>
            </div>
            <div className={styles.dayCardRow}>
              <div className={styles.dayCardLabel}>Bonuses</div>
              <div className={styles.dayCardValue}>
                {formatCurrency(
                  (entry.bonuses.unloading || 0) +
                    (entry.bonuses.attendance || 0) +
                    (entry.bonuses.early || 0)
                )}
              </div>
            </div>
            <div className={styles.dayCardRow}>
              <div className={styles.dayCardLabel}>Expected</div>
              <div className={styles.dayCardValue}>{formatCurrency(entry.expected)}</div>
            </div>
            <div className={styles.dayCardRow}>
              <div className={styles.dayCardLabel}>Paid</div>
              <div className={styles.dayCardValue}>{formatCurrency(entry.paid)}</div>
            </div>
            <div className={styles.dayCardRow}>
              <div className={styles.dayCardLabel}>Difference</div>
              <div
                className={`${styles.dayCardValue} ${entry.difference >= 0 ? styles.cellPositive : styles.cellNegative}`}
              >
                {formatCurrency(entry.difference)}
              </div>
            </div>
          </div>

          {showEditButton && (
            <div className={styles.dayCardFooter}>
              <button
                type="button"
                onClick={() => onEditDayData?.(entry)}
                className={styles.editButton}
              >
                <Edit2 className="w-4 h-4" />
                Edit Day Data
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className={`${styles.dataDisplayContainer} ${className}`}>
      <div className={styles.dataDisplayHeader}>
        <h3 className={styles.dataDisplayTitle}>
          {viewMode === "week" ? "Daily Analysis Breakdown" : "Monthly Analysis Summary"}
        </h3>
        {onToggleCompactView && mode !== "cards" && (
          <button type="button" onClick={onToggleCompactView} className={styles.viewToggleButton}>
            {compactView ? "Detailed View" : "Compact View"}
          </button>
        )}
      </div>

      {mode === "cards" ? renderCardsView() : renderTableView()}
    </div>
  );
}
