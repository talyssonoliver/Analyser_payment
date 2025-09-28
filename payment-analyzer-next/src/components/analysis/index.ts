// Steps - Step-based workflow components
export { StepNavigation } from './steps/step-navigation';
export { FileUpload } from './steps/file-upload';
export { ManualEntry } from './steps/manual-entry';
export { EntryRow } from './steps/entry-row';
export { AddEntryForm } from './steps/add-entry-form';
export { UpdateAnalysisDialog } from './steps/update-analysis-dialog';

// Validation - Validation and fingerprint components
export { FileValidationPanel } from './validation/file-validation-panel';
export { ValidationSystem } from './validation/validation-badge-system';
export { FileUpdateDetector } from './validation/file-update-detector';
export { LegacyStep2Validation } from './validation/legacy-step2-validation';

// Results - Analysis results display
export { AnalysisSummary } from './results/analysis-summary';
export { KPISection } from './results/kpi-section';
export { WeeklyBreakdown } from './results/weekly-breakdown';
export { InlineReportModal } from './results/inline-report-modal';

// Shared - Shared analysis components
export { ProgressOverlay, useProgressOverlay } from './shared/progress-overlay';
export { EntryCards } from './shared/entry-cards';
export { WorkflowCards } from './shared/workflow-cards';
export { Step3AnalyzeSectionV2 } from './shared/step3-analyze-section-v2';

// Containers - Step container components
export { Step1Container } from './containers/Step1Container';
export { Step2Container } from './containers/Step2Container';
export { Step3Container } from './containers/Step3Container';

// Legacy exports removed - replaced with pure React components in results/

// Types
export type { UploadedFile } from '../../hooks/use-file-upload';
export type { ManualEntryData } from './steps/manual-entry';