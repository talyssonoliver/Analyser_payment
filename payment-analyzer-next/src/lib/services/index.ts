/**
 * Services Index
 * Central export point for all application services
 */

export type {
  MergeResult,
  MergeStrategy,
} from "./analysis-merge-service";
export { AnalysisMergeService, analysisMergeService } from "./analysis-merge-service";
// Type exports
export type {
  AnalysisFile,
  AnalysisProgress,
  AnalysisResult,
  CreateAnalysisRequest,
} from "./analysis-service";
// Analysis services
export { AnalysisService, analysisService } from "./analysis-service";
export { AnalysisStorageService } from "./analysis-storage-service";
// Analytics services
export { AnalyticsService } from "./analytics-service";
// User services
export { AuthService } from "./auth-service";
// Storage and compression services
export { CompressedStorageService } from "./compressed-storage-service";
export { DatabaseSyncService } from "./database-sync-service";

// Export and reporting services
export { ExportService } from "./export-service";
// File services
export { FileFingerprintService } from "./file-fingerprint-service";
export { FileUpdateDetectionService } from "./file-update-detection-service";
export { InlineReportGenerator } from "./inline-report-generator";
export type {
  DailyData,
  DayCalculation,
  PaymentRules,
  PaymentTotals,
  WeekCalculation,
} from "./payment-calculation-service";
// Payment and calculation services
export { DEFAULT_PAYMENT_RULES, PaymentCalculationService } from "./payment-calculation-service";
export { PreferencesService } from "./preferences-service";

// Progress tracking
export { ProgressTrackingService } from "./progress-tracking-service";
export type {
  BatchExtractionResult,
  DateExtractionResult,
  DateRange as QuickDateRange,
} from "./quick-date-extractor";
// Date extraction
export { QuickDateExtractor } from "./quick-date-extractor";
// Session services
export { SessionRecoveryService } from "./session-recovery-service";
export type {
  AnalysisInput,
  Step3AnalysisData,
} from "./step3-analysis-service";
export { Step3AnalysisService } from "./step3-analysis-service";
// Navigation and UI services
export { WeekNavigationService } from "./week-navigation-service";
