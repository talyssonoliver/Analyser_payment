/**
 * Step 3 Week Group Component
 * Pure React component replacing HTML string generation from step3-content-generator.ts lines 230-396
 */

import type React from "react";
import { Step3DailyCard } from "./step3-daily-card";
import type { WeekGroup } from "./types";

interface Step3WeekGroupProps {
  readonly week: WeekGroup;
  readonly weekIndex: number;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly onViewWeekReport: (weekNumber: number, weekYear: number, weekIndex: number) => void;
  readonly hasMultipleWeeks: boolean;
}

/**
 * Get week number of year
 * Helper function for week calculation
 */
function getWeekOfYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function Step3WeekGroup({
  week,
  weekIndex,
  isExpanded,
  onToggle,
  onViewWeekReport,
  hasMultipleWeeks,
}: Step3WeekGroupProps) {
  const weekEndDate = new Date(week.weekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  // Calculate week number and year
  const weekNumber = getWeekOfYear(week.weekStart);
  const weekYear = week.weekStart.getFullYear();
  const dailyAverage = week.workingDays > 0 ? week.totalExpected / week.workingDays : 0;
  const weekDifference = week.totalActual - week.totalExpected;
  const weekDifferenceClass = weekDifference >= 0 ? "positive" : "negative";

  // Sort days within week (non-mutating)
  const sortedDays = week.days.toSorted(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const handleViewWeekReport = () => {
    onViewWeekReport(weekNumber, weekYear, weekIndex);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div className="week-group">
      <button
        type="button"
        className="week-header text-left"
        data-week-id={`week-${weekIndex}`}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-controls={`week-${weekIndex}-content`}
      >
        <div className="week-info">
          <h3 className="week-title">
            Week {weekNumber}, {weekYear}
          </h3>
          <div className="week-dates">
            {week.weekStart.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}{" "}
            -{" "}
            {weekEndDate.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
        <div className="week-summary">
          <div className={`week-badge ${weekDifferenceClass}`}>
            {weekDifference >= 0 ? "↗️" : "↘️"} £{Math.abs(weekDifference).toFixed(2)}
          </div>
          <div className="week-toggle">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </button>

      <div
        className="week-content"
        id={`week-${weekIndex}-content`}
        style={{ display: isExpanded ? "block" : "none" }}
      >
        <div className="week-days-list">
          {sortedDays.map((result, dayIndex) => (
            <Step3DailyCard
              key={`${result.date}-${dayIndex}`}
              result={result}
              isManualEntry={false}
            />
          ))}
        </div>

        <div className="week-summary-totals">
          <div className="preview-card enhanced compact">
            <div className="preview-card-icon">📋</div>
            <div className="preview-card-content">
              <div className="preview-card-label">Week Expected</div>
              <div className="preview-card-value">£{week.totalExpected.toFixed(2)}</div>
            </div>
          </div>
          <div className="preview-card enhanced compact">
            <div className="preview-card-icon">💰</div>
            <div className="preview-card-content">
              <div className="preview-card-label">Week Actual</div>
              <div className="preview-card-value">£{week.totalActual.toFixed(2)}</div>
            </div>
          </div>
          <div className="preview-card enhanced compact">
            <div className="preview-card-icon">📅</div>
            <div className="preview-card-content">
              <div className="preview-card-label">Working Days</div>
              <div className="preview-card-value">{week.workingDays}</div>
            </div>
          </div>
          <div className="preview-card enhanced">
            <div className="preview-card-icon" aria-hidden="true">
              📊
            </div>
            <div className="preview-card-content">
              <div className="preview-card-label">Daily Average</div>
              <div className="preview-card-value">£{dailyAverage.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {hasMultipleWeeks && (
          <div className="week-actions">
            <button
              type="button"
              className="btn btn-primary view-week-report-btn"
              data-week-number={weekNumber}
              data-week-year={weekYear}
              data-week-index={weekIndex}
              onClick={handleViewWeekReport}
            >
              <span className="btn-icon">📊</span>
              <span className="btn-text">View Week {weekNumber} Report</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
