/**
 * Step 3 Analyze Section V2 - Pure React Component
 * Replaces dangerouslySetInnerHTML and legacy imports with modern React components
 */

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { Step3AnalysisData } from "@/lib/services/step3-analysis-service";
import { type WeekInfo, weekNavigationService } from "@/lib/services/week-navigation-service";
import type { ManualEntry } from "@/types/core";
import { Step3Actions, Step3SummaryCards, Step3WeekGroup } from "../results";

// Interface matching the original global state
interface Step3Props {
  // Data from analysis workflow
  lastAnalysisData: Step3AnalysisData | null;
  manualEntries: ManualEntry[];
  currentInputMethod: "upload" | "manual";

  // Callbacks
  onSetStep: (step: number) => void;
  onViewDetailedReport: () => void;
  onStartNewAnalysis: () => void;

  // Optional
  className?: string;
}

// EmptyState component moved outside parent
interface EmptyStateProps {
  onSetStep: (step: number) => void;
}

function EmptyState({ onSetStep }: Readonly<EmptyStateProps>) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">📊</div>
      <div className="empty-state-title">No Analysis Data</div>
      <div className="empty-state-message">
        Complete steps 1 and 2 to see your payment analysis results.
      </div>
      <button className="btn btn-primary" onClick={() => onSetStep(1)} type="button">
        <span className="btn-icon" aria-hidden="true">
          📁
        </span>
        <span className="btn-text">Start Analysis</span>
      </button>
    </div>
  );
}

export function Step3AnalyzeSectionV2({
  lastAnalysisData,
  manualEntries,
  currentInputMethod,
  onSetStep,
  onViewDetailedReport,
  onStartNewAnalysis,
  className = "",
}: Readonly<Step3Props>) {
  const router = useRouter();
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  // Helper function to get week start date (Monday)
  const getWeekStartDate = useCallback((year: number, weekNumber: number): Date => {
    const januaryFirst = new Date(year, 0, 1);
    const daysToFirstMonday = (8 - januaryFirst.getDay()) % 7;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
    return new Date(firstMonday.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
  }, []);

  // Helper function to get week end date (Sunday)
  const getWeekEndDate = useCallback(
    (year: number, weekNumber: number): Date => {
      const weekStart = getWeekStartDate(year, weekNumber);
      return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    },
    [getWeekStartDate]
  );

  // Group analysis results by week
  const weekGroups = useMemo(() => {
    if (!lastAnalysisData?.weeks) return [];

    // Convert our week calculation data to WeekGroup format for the UI
    return lastAnalysisData.weeks
      .map((week) => ({
        weekStart: new Date(week.weekStart),
        days: week.days,
        totalExpected: week.totalExpected,
        totalActual: week.totalActual,
        workingDays: week.workingDays,
      }))
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  }, [lastAnalysisData]);

  // Check if we have any data to display
  const hasData = lastAnalysisData?.days?.length || manualEntries.length > 0;

  // Handle week report generation
  const handleViewWeekReport = useCallback(
    (weekNumber: number, weekYear: number, weekIndex: number) => {
      try {
        console.log(
          `📊 Week report button clicked: Week ${weekNumber}, ${weekYear} (index: ${weekIndex})`
        );

        // Create week info object
        const weekInfo: WeekInfo = {
          week: weekNumber,
          year: weekYear,
        };

        // Get analysis ID
        const analysisId = lastAnalysisData?.id || "latest";

        // Use enhanced week navigation with proper URL parameters
        if (lastAnalysisData && analysisId !== "latest") {
          // Set selected week state
          weekNavigationService.setSelectedWeek(weekInfo, analysisId);

          // Calculate week date range for precise filtering
          const weekStartDate = getWeekStartDate(weekYear, weekNumber);
          const weekEndDate = getWeekEndDate(weekYear, weekNumber);
          const startDateStr = weekStartDate.toISOString().split("T")[0];
          const endDateStr = weekEndDate.toISOString().split("T")[0];

          // Navigate with week-specific parameters
          const params = new URLSearchParams();
          params.set("analysis", analysisId);
          params.set("week", weekNumber.toString());
          params.set("start", startDateStr);
          params.set("end", endDateStr);

          const reportUrl = `/reports?${params.toString()}`;
          console.log("🚀 NAVIGATING TO WEEK REPORT:", reportUrl);
          router.push(reportUrl);
          return;
        }

        // Fallback for legacy analysis data
        const reportUrl = `/reports?analysis=${analysisId}`;
        console.log("🚀 NAVIGATING TO (legacy):", reportUrl);
        router.push(reportUrl);
      } catch (error) {
        console.error("Failed to generate week report:", error);
      }
    },
    [lastAnalysisData, router, getWeekStartDate, getWeekEndDate]
  );

  // Handle week expand/collapse toggle
  const toggleWeek = useCallback(
    (weekId: string) => {
      console.log(`🔄 React state toggle for: ${weekId}`);

      const newExpanded = new Set(expandedWeeks);
      if (newExpanded.has(weekId)) {
        newExpanded.delete(weekId);
        console.log(`🔼 React: Collapsing ${weekId}`);
      } else {
        newExpanded.add(weekId);
        console.log(`🔽 React: Expanding ${weekId}`);
      }
      setExpandedWeeks(newExpanded);
    },
    [expandedWeeks]
  );

  return (
    <div className={`analyze-section active ${className}`}>
      <div className="analyze-content">
        <div className="analyze-header">
          <h2 className="analyze-title">📊 Payment Analysis Results</h2>
          <p className="analyze-subtitle">
            Review your payment calculation results and view detailed reports
          </p>
        </div>

        {hasData ? (
          <>
            <div className="analysis-summary">
              <Step3SummaryCards
                analysisData={lastAnalysisData}
                manualEntries={manualEntries}
                currentInputMethod={currentInputMethod}
              />
            </div>

            {weekGroups.length > 0 && (
              <div className="week-data-summary">
                <h3 className="week-summary-title">Breakdown by Week</h3>
                <div className="weeks-container">
                  {weekGroups.map((week, index) => {
                    const weekId = `week-${index}`;

                    return (
                      <Step3WeekGroup
                        key={weekId}
                        week={week}
                        weekIndex={index}
                        isExpanded={expandedWeeks.has(weekId)}
                        onToggle={() => toggleWeek(weekId)}
                        onViewWeekReport={handleViewWeekReport}
                        hasMultipleWeeks={weekGroups.length > 1}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="analysis-actions">
              <Step3Actions
                hasMultipleWeeks={weekGroups.length > 1}
                onViewDetailedReport={onViewDetailedReport}
                onStartNewAnalysis={onStartNewAnalysis}
              />
            </div>
          </>
        ) : (
          <EmptyState onSetStep={onSetStep} />
        )}
      </div>
    </div>
  );
}
