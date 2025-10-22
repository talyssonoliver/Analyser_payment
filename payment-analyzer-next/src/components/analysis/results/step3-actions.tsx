/**
 * Step 3 Actions Component
 * Pure React component replacing HTML string generation from step3-content-generator.ts lines 539-581
 */

interface Step3ActionsProps {
  readonly hasMultipleWeeks: boolean;
  readonly onViewDetailedReport: () => void;
  readonly onStartNewAnalysis: () => void;
}

export function Step3Actions({
  hasMultipleWeeks,
  onViewDetailedReport,
  onStartNewAnalysis,
}: Step3ActionsProps) {
  if (hasMultipleWeeks) {
    // Multiple weeks - only show "Start New Analysis" button
    // Individual week report buttons will be shown in each week section
    return (
      <button type="button" className="btn btn-secondary" onClick={onStartNewAnalysis}>
        <span className="btn-icon">🔄</span>
        <span className="btn-text">Start New Analysis</span>
      </button>
    );
  } else {
    // Single week - show both global report button and start new analysis
    return (
      <>
        <button type="button" className="btn btn-primary" onClick={onViewDetailedReport}>
          <span className="btn-icon">📊</span>
          <span className="btn-text">View Detailed Report</span>
        </button>
        <div className="action-separator"></div>
        <button type="button" className="btn btn-secondary" onClick={onStartNewAnalysis}>
          <span className="btn-icon">🔄</span>
          <span className="btn-text">Start New Analysis</span>
        </button>
      </>
    );
  }
}
