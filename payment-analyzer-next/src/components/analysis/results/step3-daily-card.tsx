/**
 * Step 3 Daily Card Component
 * Pure React component replacing HTML string generation from step3-content-generator.ts lines 252-325 and 422-500
 */

import type { ManualEntry } from "@/types/core";
import type { AnalysisResult } from "./types";

interface Step3DailyCardProps {
  readonly result?: AnalysisResult;
  readonly manualEntry?: ManualEntry;
  readonly isManualEntry: boolean;
}

export function Step3DailyCard({ result, manualEntry, isManualEntry }: Step3DailyCardProps) {
  if (isManualEntry && manualEntry) {
    // Manual entry card rendering (lines 422-500)
    const expectedTotal = manualEntry.expectedTotal || 0;
    const consignments = manualEntry.consignments || 0;
    const bonuses = (manualEntry.earlyArrive || 0) + (manualEntry.loadingBonus || 0);

    const date = new Date(manualEntry.date);
    const formattedDate = date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    const dayName = date.toLocaleDateString("en-GB", { weekday: "short" });

    return (
      <div className="step2-entry-card enhanced-daily-card">
        <div className="card-header">
          <div className="date-info">
            <h3 className="day-name">{dayName}</h3>
            <p className="day-date">{formattedDate}</p>
          </div>
          <div className="total-badge">
            <span className="total-amount">£{expectedTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="card-body">
          <div className="main-amounts">
            <div className="amount-row">
              <span className="amount-label">📦 Consignments</span>
              <span className="amount-value">{consignments}</span>
            </div>
            <div className="amount-row">
              <span className="amount-label">💰 Base Rate</span>
              <span className="amount-value">£{(manualEntry.baseAmount || 0).toFixed(2)}</span>
            </div>
            {bonuses > 0 && (
              <div className="amount-row bonus-row">
                <span className="amount-label">⭐ Bonuses</span>
                <span className="amount-value">£{bonuses.toFixed(2)}</span>
              </div>
            )}
          </div>

          {expectedTotal > 0 && (
            <div className="breakdown-section">
              <h4 className="breakdown-title">Payment Breakdown</h4>
              <div className="breakdown-grid">
                <div className="breakdown-item">
                  <span className="item-label">Base</span>
                  <span className="item-value">£{(manualEntry.baseAmount || 0).toFixed(2)}</span>
                </div>
                {(manualEntry.pickupBonus || 0) > 0 && (
                  <div className="breakdown-item">
                    <span className="item-label">Pickup</span>
                    <span className="item-value">£{(manualEntry.pickupBonus || 0).toFixed(2)}</span>
                  </div>
                )}
                {(manualEntry.loadingBonus || 0) > 0 && (
                  <div className="breakdown-item">
                    <span className="item-label">Loading</span>
                    <span className="item-value">
                      £{(manualEntry.loadingBonus || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                {(manualEntry.attendanceBonus || 0) > 0 && (
                  <div className="breakdown-item">
                    <span className="item-label">Attend</span>
                    <span className="item-value">
                      £{(manualEntry.attendanceBonus || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                {(manualEntry.earlyArrive || 0) > 0 && (
                  <div className="breakdown-item">
                    <span className="item-label">Early</span>
                    <span className="item-value">£{(manualEntry.earlyArrive || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (result) {
    // Analysis result card rendering (lines 252-325)
    const difference = (result.paidAmount || 0) - (result.expectedTotal || 0);
    const differenceClass = difference >= 0 ? "positive" : "negative";
    const differenceIcon = difference >= 0 ? "↗️" : "↘️";
    const dayName = new Date(result.date).toLocaleDateString("en-GB", { weekday: "short" });

    return (
      <div className="step2-entry-card enhanced-daily-card">
        <div className="card-header">
          <div className="date-info">
            <h3 className="day-name">{dayName}</h3>
            <p className="day-date">{result.date}</p>
          </div>
          {Math.abs(difference) > 0 && (
            <div className={`status-badge ${differenceClass}`}>
              <span className="status-icon">{differenceIcon}</span>
              <span className="status-amount">£{Math.abs(difference).toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="card-body">
          <div className="main-amounts">
            <div className="amount-row">
              <span className="amount-label">Expected</span>
              <span className="amount-value">£{(result.expectedTotal || 0).toFixed(2)}</span>
            </div>
            <div className="amount-row">
              <span className="amount-label">Actual</span>
              <span className="amount-value">£{(result.paidAmount || 0).toFixed(2)}</span>
            </div>
          </div>

          {(result.expectedTotal || 0) > 0 && (
            <div className="breakdown-section">
              <h4 className="breakdown-title">Breakdown</h4>
              <div className="breakdown-grid">
                <div className="breakdown-item">
                  <span className="item-label">Base</span>
                  <span className="item-value">£{(result.basePayment || 0).toFixed(2)}</span>
                </div>
                {(result.pickupTotal || 0) > 0 && (
                  <div className="breakdown-item">
                    <span className="item-label">Pickup</span>
                    <span className="item-value">£{(result.pickupTotal || 0).toFixed(2)}</span>
                  </div>
                )}
                {(result.unloadingBonus || 0) > 0 && (
                  <div className="breakdown-item">
                    <span className="item-label">Unload</span>
                    <span className="item-value">£{(result.unloadingBonus || 0).toFixed(2)}</span>
                  </div>
                )}
                {(result.attendanceBonus || 0) > 0 && (
                  <div className="breakdown-item">
                    <span className="item-label">Attend</span>
                    <span className="item-value">£{(result.attendanceBonus || 0).toFixed(2)}</span>
                  </div>
                )}
                {(result.earlyBonus || 0) > 0 && (
                  <div className="breakdown-item">
                    <span className="item-label">Early</span>
                    <span className="item-value">£{(result.earlyBonus || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback for invalid props
  return null;
}
