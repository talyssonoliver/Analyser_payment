/**
 * Service Interface Contracts
 *
 * Defines TypeScript interfaces for all services to ensure consistency,
 * testability, and proper dependency injection.
 *
 * Phase 3: Service Layer Improvements
 */

import type { Analysis } from "@/lib/domain/entities/analysis";
import type { DailyEntry } from "@/lib/domain/entities/daily-entry";
import type { ValidationResult } from "@/lib/domain/services/file-validation-service";
import type { AnalysisResult } from "@/lib/services/analysis-service";
import type {
  FileComparison,
  FingerprintValidation,
} from "@/lib/services/file-fingerprint-service";
import type { ManualEntry } from "@/types/core";

// ============================================================================
// File Management Interfaces
// ============================================================================

export interface IFileUploadService {
  /**
   * Validate uploaded files against business rules
   */
  validateFiles(files: File[], options?: FileValidationOptions): Promise<ValidationResult>;

  /**
   * Process and prepare files for analysis
   */
  processFiles(files: File[]): Promise<ProcessedFile[]>;

  /**
   * Get file metadata
   */
  getFileMetadata(file: File): Promise<FileMetadata>;
}

export interface IFileFingerprintService {
  /**
   * Generate fingerprint for a file
   */
  generateFingerprint(file: File): Promise<string>;

  /**
   * Validate file set for duplicates
   */
  validateFileSet(files: File[]): Promise<FingerprintValidation>;

  /**
   * Compare file with existing analyses
   */
  compareWithExisting(file: File): Promise<FileComparison>;

  /**
   * Store fingerprint for future comparison
   */
  storeFingerprint(file: File, fingerprint: string, analysisId: string): Promise<void>;
}

export interface IFileValidationService {
  /**
   * Perform comprehensive file validation
   */
  validateFiles(files: File[], options?: FileValidationOptions): Promise<ValidationResult>;

  /**
   * Check for file updates against stored analyses
   */
  checkForUpdates(files: File[]): Promise<FileUpdateResult>;

  /**
   * Detect duplicate files in current selection
   */
  detectDuplicates(files: File[]): Promise<DuplicateFile[]>;
}

// ============================================================================
// Analysis Interfaces
// ============================================================================

export interface IAnalysisService {
  /**
   * Create a new analysis from files
   */
  createAnalysis(files: File[], userId: string): Promise<Analysis | AnalysisResult>;

  /**
   * Create analysis from manual entries
   */
  createFromManualEntries(
    entries: ManualEntry[],
    userId: string
  ): Promise<Analysis | AnalysisResult>;

  /**
   * Get analysis by ID
   */
  getAnalysis(analysisId: string): Promise<Analysis | AnalysisResult | null>;

  /**
   * Update existing analysis
   */
  updateAnalysis(
    analysisId: string,
    updates: Partial<Analysis>
  ): Promise<Analysis | AnalysisResult>;

  /**
   * Delete analysis
   */
  deleteAnalysis(analysisId: string): Promise<void>;
}

export interface IPaymentCalculationService {
  /**
   * Calculate payment for a single day
   */
  calculateDailyPayment(entry: DailyEntry | ManualEntry): PaymentBreakdown;

  /**
   * Calculate total payments for multiple days
   */
  calculateTotalPayments(entries: DailyEntry[] | ManualEntry[]): TotalPaymentResult;

  /**
   * Apply payment rules
   */
  applyPaymentRules(entries: DailyEntry[] | ManualEntry[], rules: PaymentRules): DailyEntry[];

  /**
   * Get payment rules for date
   */
  getPaymentRules(date: Date): PaymentRules;
}

export interface IStep3AnalysisService {
  /**
   * Execute analysis workflow
   */
  executeAnalysis(files: File[], entries: ManualEntry[]): Promise<AnalysisResult | Analysis>;

  /**
   * Generate analysis report
   */
  generateReport(analysisId: string): Promise<AnalysisReport>;

  /**
   * Track analysis progress
   */
  trackProgress(analysisId: string, progress: number): Promise<void>;
}

// ============================================================================
// Storage & Session Interfaces
// ============================================================================

export interface ISessionRecoveryService {
  /**
   * Save current session state
   */
  saveSession(data: SessionData): Promise<void>;

  /**
   * Retrieve session data
   */
  getSession(): Promise<SessionData | null>;

  /**
   * Clear session data
   */
  clearSession(): Promise<void>;

  /**
   * Check if session exists
   */
  hasSession(): Promise<boolean>;
}

export interface IAnalysisStorageService {
  /**
   * Store analysis in database
   */
  storeAnalysis(analysis: AnalysisResult): Promise<string>;

  /**
   * Retrieve analysis from database
   */
  retrieveAnalysis(analysisId: string): Promise<AnalysisResult | null>;

  /**
   * List user analyses
   */
  listAnalyses(userId: string, options?: ListOptions): Promise<AnalysisList>;

  /**
   * Update analysis metadata
   */
  updateMetadata(analysisId: string, metadata: AnalysisMetadata): Promise<void>;
}

export interface ICompressedStorageService {
  /**
   * Compress and store data
   */
  compress(data: unknown): Promise<string>;

  /**
   * Decompress stored data
   */
  decompress(compressed: string): Promise<unknown>;

  /**
   * Check storage size
   */
  getStorageSize(): number;

  /**
   * Clear compressed storage
   */
  clearStorage(): Promise<void>;
}

// ============================================================================
// Authentication & User Interfaces
// ============================================================================

export interface IAuthService {
  /**
   * Sign in user
   */
  signIn(email: string, password: string): Promise<AuthResult>;

  /**
   * Sign up new user
   */
  signUp(email: string, password: string, metadata?: UserMetadata): Promise<AuthResult>;

  /**
   * Sign out current user
   */
  signOut(): Promise<void>;

  /**
   * Get current user
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Reset password
   */
  resetPassword(email: string): Promise<void>;
}

// ============================================================================
// Export & Analytics Interfaces
// ============================================================================

export interface IExportService {
  /**
   * Export analysis to CSV
   */
  exportToCSV(analysisId: string): Promise<string>;

  /**
   * Export analysis to JSON
   */
  exportToJSON(analysisId: string): Promise<string>;

  /**
   * Export analysis to PDF
   */
  exportToPDF(analysisId: string): Promise<Blob>;
}

export interface IAnalyticsService {
  /**
   * Get dashboard KPIs
   */
  getDashboardKPIs(userId: string, period: DateRange): Promise<DashboardKPIs>;

  /**
   * Get revenue trends
   */
  getRevenueTrends(userId: string, period: DateRange): Promise<RevenueTrend[]>;

  /**
   * Get analysis statistics
   */
  getStatistics(userId: string): Promise<AnalyticsStats>;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface FileValidationOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  checkForUpdates?: boolean;
  checkForDuplicates?: boolean;
}

export interface ProcessedFile {
  original: File;
  fingerprint: string;
  metadata: FileMetadata;
  validationResult: ValidationResult;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  hash?: string;
}

export interface FileUpdateResult {
  hasUpdates: boolean;
  updatedFiles: File[];
  unchangedFiles: File[];
}

export interface DuplicateFile {
  file: File;
  duplicateOf: string;
  reason: string;
}

export interface PaymentBreakdown {
  baseAmount: number;
  bonuses: {
    early?: number;
    attendance?: number;
    unloading?: number;
  };
  total: number;
}

export interface TotalPaymentResult {
  dailyPayments: PaymentBreakdown[];
  grandTotal: number;
  totalBonuses: number;
  averageDaily: number;
}

export interface PaymentRules {
  weekdayRate: number;
  saturdayRate: number;
  unloadingBonus: number;
  attendanceBonus: number;
  earlyBonus: number;
  effectiveDate: Date;
}

export interface AnalysisReport {
  analysisId: string;
  generatedAt: Date;
  summary: string;
  dailyBreakdown: DailyEntry[] | ManualEntry[];
  totals: TotalPaymentResult;
  charts?: ChartData[];
}

export interface SessionData {
  currentStep: number;
  inputMethod: "upload" | "manual";
  uploadedFiles?: FileMetadata[];
  manualEntries?: DailyEntry[];
  timestamp: number;
}

export interface AnalysisMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, unknown>;
}

export interface AnalysisList {
  items: AnalysisResult[];
  total: number;
  hasMore: boolean;
}

export interface AuthResult {
  user: User;
  session: Session;
}

export interface User {
  id: string;
  email: string;
  metadata?: UserMetadata;
}

export interface UserMetadata {
  displayName?: string;
  avatar?: string;
  preferences?: Record<string, unknown>;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DashboardKPIs {
  totalRevenue: number;
  averageDaily: number;
  totalDays: number;
  totalBonuses: number;
  trends: {
    revenue: number;
    days: number;
  };
}

export interface RevenueTrend {
  date: Date;
  revenue: number;
  bonuses: number;
}

export interface AnalyticsStats {
  totalAnalyses: number;
  totalFiles: number;
  totalEntries: number;
  averageEntriesPerAnalysis: number;
}

export interface ChartData {
  type: "bar" | "line" | "pie";
  data: unknown[];
  labels: string[];
}

// ============================================================================
// Error Types
// ============================================================================

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends ServiceError {
  constructor(message: string, details?: unknown) {
    super(message, "AUTH_ERROR", details);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends ServiceError {
  constructor(message: string, details?: unknown) {
    super(message, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
}
