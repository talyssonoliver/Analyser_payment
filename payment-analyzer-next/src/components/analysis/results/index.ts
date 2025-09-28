/**
 * Step 3 Results Components - Index
 * Exports all pure React components that replace legacy HTML string generation
 */

export { Step3SummaryCards } from './step3-summary-cards';
export { Step3DailyCard } from './step3-daily-card';
export { Step3WeekGroup } from './step3-week-group';
export { Step3Actions } from './step3-actions';

// Export types
export type {
  AnalysisResult,
  AnalysisTotals,
  AnalysisMetadata,
  AnalysisData,
  WeekGroup,
  GlobalState
} from './types';