/**
 * AnalysisWorkflowService
 *
 * Coordinates the entire analysis workflow across multiple services.
 * Implements the Coordinator pattern for better service orchestration.
 *
 * Phase 3: Service Layer Improvements
 *
 * Responsibilities:
 * - Orchestrate file upload, validation, and analysis
 * - Coordinate between file fingerprinting, validation, and analysis services
 * - Provide unified error handling
 * - Track workflow progress
 * - Ensure consistent state management
 */

import type { Analysis } from "@/lib/domain/entities/analysis";
import type { ValidationResult } from "@/lib/domain/services/file-validation-service";
import { NotFoundError, ServiceError } from "@/lib/interfaces/service-interfaces";
import { type AnalysisResult, analysisService } from "@/lib/services/analysis-service";
import { FileFingerprintService } from "@/lib/services/file-fingerprint-service";
import { PaymentCalculationService } from "@/lib/services/payment-calculation-service";
import { SessionRecoveryService } from "@/lib/services/session-recovery-service";
import { Step3AnalysisService } from "@/lib/services/step3-analysis-service";
import type { ManualEntry } from "@/types/core";

// ============================================================================
// Workflow Types
// ============================================================================

export interface WorkflowConfig {
  userId: string;
  validateFingerprints?: boolean;
  trackProgress?: boolean;
  saveSession?: boolean;
}

export interface WorkflowResult {
  success: boolean;
  analysisId?: string;
  analysis?: AnalysisResult | Analysis;
  errors?: string[];
  warnings?: string[];
}

export interface WorkflowProgress {
  stage: WorkflowStage;
  progress: number;
  message: string;
  timestamp: Date;
}

export type WorkflowStage =
  | "INITIALIZING"
  | "VALIDATING_FILES"
  | "CHECKING_FINGERPRINTS"
  | "PROCESSING_FILES"
  | "CALCULATING_PAYMENTS"
  | "GENERATING_ANALYSIS"
  | "SAVING_ANALYSIS"
  | "COMPLETE"
  | "FAILED";

export interface ValidationPhaseResult {
  isValid: boolean;
  fileValidation?: ValidationResult;
  fingerprintValidation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    duplicates: unknown[];
  };
  combinedErrors: string[];
  combinedWarnings: string[];
}

// ============================================================================
// AnalysisWorkflowService Class
// ============================================================================

export class AnalysisWorkflowService {
  private progressCallbacks: ((progress: WorkflowProgress) => void)[] = [];
  private paymentCalculationService = new PaymentCalculationService();

  /**
   * Register a progress callback
   */
  public onProgress(callback: (progress: WorkflowProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Emit progress update to all registered callbacks
   */
  private emitProgress(stage: WorkflowStage, progress: number, message: string): void {
    const progressUpdate: WorkflowProgress = {
      stage,
      progress,
      message,
      timestamp: new Date(),
    };

    this.progressCallbacks.forEach((callback) => {
      try {
        callback(progressUpdate);
      } catch (error) {
        console.error("Error in progress callback:", error);
      }
    });
  }

  /**
   * Execute complete file-based analysis workflow
   *
   * @param files - Files to analyze
   * @param config - Workflow configuration
   * @returns Workflow result with analysis data
   */
  public async executeFileWorkflow(files: File[], config: WorkflowConfig): Promise<WorkflowResult> {
    try {
      this.emitProgress("INITIALIZING", 0, "Initializing analysis workflow...");

      // Phase 1: Validation
      this.emitProgress("VALIDATING_FILES", 10, "Validating uploaded files...");
      const validationResult = await this.validateFiles(files);

      if (!validationResult.isValid) {
        this.emitProgress("FAILED", 100, "Validation failed");
        return {
          success: false,
          errors: validationResult.combinedErrors,
          warnings: validationResult.combinedWarnings,
        };
      }

      // Phase 2: Fingerprint checking (if enabled)
      if (config.validateFingerprints) {
        this.emitProgress("CHECKING_FINGERPRINTS", 25, "Checking file fingerprints...");
        const fingerprintResult = await this.checkFingerprints(files);

        if (fingerprintResult.duplicates.length > 0) {
          this.emitProgress("FAILED", 100, "Duplicate files detected");
          return {
            success: false,
            errors: ["Duplicate files detected"],
            warnings: fingerprintResult.warnings,
          };
        }
      }

      // Phase 3: Process files
      this.emitProgress("PROCESSING_FILES", 40, "Processing PDF files...");
      const processedData = await this.processFiles(files);

      // Phase 4: Calculate payments
      this.emitProgress("CALCULATING_PAYMENTS", 60, "Calculating payment details...");
      const calculatedEntries = this.calculatePayments(processedData);

      // Phase 5: Generate analysis
      this.emitProgress("GENERATING_ANALYSIS", 75, "Generating analysis report...");
      const analysis = await this.generateAnalysis(calculatedEntries, files, config.userId);

      // Phase 6: Save analysis
      this.emitProgress("SAVING_ANALYSIS", 90, "Saving analysis to database...");
      const analysisId = await this.saveAnalysis(analysis);

      // Phase 7: Save session (if enabled)
      if (config.saveSession) {
        await SessionRecoveryService.saveSession({
          currentStep: 3,
          inputMethod: "upload",
          uploadedFiles: files.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
            lastModified: f.lastModified,
          })),
          manualEntries: [],
          timestamp: Date.now(),
        });
      }

      this.emitProgress("COMPLETE", 100, "Analysis completed successfully");

      return {
        success: true,
        analysisId,
        analysis,
        warnings: validationResult.combinedWarnings,
      };
    } catch (error) {
      this.emitProgress("FAILED", 100, "Workflow failed");

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(
        `Workflow execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "WORKFLOW_ERROR",
        { originalError: error }
      );
    }
  }

  /**
   * Execute manual entry-based analysis workflow
   *
   * @param entries - Manual entries to analyze
   * @param config - Workflow configuration
   * @returns Workflow result with analysis data
   */
  public async executeManualWorkflow(
    entries: ManualEntry[],
    config: WorkflowConfig
  ): Promise<WorkflowResult> {
    try {
      this.emitProgress("INITIALIZING", 0, "Initializing manual entry workflow...");

      // Validate entries
      this.emitProgress("VALIDATING_FILES", 20, "Validating manual entries...");
      const validationErrors = this.validateEntries(entries);

      if (validationErrors.length > 0) {
        this.emitProgress("FAILED", 100, "Validation failed");
        return {
          success: false,
          errors: validationErrors,
        };
      }

      // Calculate payments
      this.emitProgress("CALCULATING_PAYMENTS", 50, "Calculating payment details...");
      const calculatedEntries = this.calculatePayments(entries);

      // Generate analysis
      this.emitProgress("GENERATING_ANALYSIS", 75, "Generating analysis report...");
      const analysis = await this.generateAnalysis(calculatedEntries, [], config.userId);

      // Save analysis
      this.emitProgress("SAVING_ANALYSIS", 90, "Saving analysis to database...");
      const analysisId = await this.saveAnalysis(analysis);

      this.emitProgress("COMPLETE", 100, "Analysis completed successfully");

      return {
        success: true,
        analysisId,
        analysis,
      };
    } catch (error) {
      this.emitProgress("FAILED", 100, "Workflow failed");

      throw new ServiceError(
        `Manual workflow execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "WORKFLOW_ERROR",
        { originalError: error }
      );
    }
  }

  /**
   * Retrieve existing analysis by ID
   *
   * @param analysisId - Analysis ID to retrieve
   * @returns Analysis result
   */
  public async getAnalysis(analysisId: string): Promise<AnalysisResult> {
    try {
      const result = await analysisService.getAnalysisById(analysisId);

      if (result.error || !result.analysis) {
        throw new NotFoundError(result.error || `Analysis not found: ${analysisId}`, {
          analysisId,
        });
      }

      return {
        analysisId: result.analysis.id,
        analysis: result.analysis,
        success: true,
      };
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(
        `Failed to retrieve analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
        "RETRIEVAL_ERROR",
        { analysisId, originalError: error }
      );
    }
  }

  /**
   * Update existing analysis status
   *
   * @param analysisId - Analysis ID to update
   * @param status - New status
   * @returns Updated analysis result
   */
  public async updateAnalysis(
    analysisId: string,
    status: "pending" | "processing" | "completed" | "error"
  ): Promise<AnalysisResult> {
    try {
      await analysisService.updateAnalysisStatus(analysisId, status);
      return await this.getAnalysis(analysisId);
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(
        `Failed to update analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
        "UPDATE_ERROR",
        { analysisId, status, originalError: error }
      );
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validate files using fingerprint service
   */
  private async validateFiles(files: File[]): Promise<ValidationPhaseResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic file validation
    if (files.length === 0) {
      errors.push("No files provided");
      return {
        isValid: false,
        combinedErrors: errors,
        combinedWarnings: warnings,
      };
    }

    // Validate file types and sizes
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        errors.push(`Invalid file type: ${file.name}. Only PDF files are allowed.`);
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        errors.push(`File too large: ${file.name}. Maximum size is 50MB.`);
      }

      if (file.size === 0) {
        errors.push(`Empty file: ${file.name}`);
      }
    }

    return {
      isValid: errors.length === 0,
      combinedErrors: errors,
      combinedWarnings: warnings,
    };
  }

  /**
   * Check file fingerprints for duplicates
   */
  private async checkFingerprints(files: File[]) {
    return await FileFingerprintService.validateFileSet(files);
  }

  /**
   * Process files to extract manual entries for further processing
   */
  private async processFiles(files: File[]): Promise<ManualEntry[]> {
    const analysisInput = {
      inputMethod: "upload" as const,
      files: files,
      manualEntries: [],
    };

    const result = await Step3AnalysisService.processAnalysis(analysisInput);

    if (result?.days) {
      return result.days.map((day) => ({
        id: 0,
        date: day.date,
        day: day.day,
        consignments: day.consignments,
        baseAmount: day.basePayment,
        totalPay: day.paidAmount,
        expectedTotal: day.expectedTotal,
        pickups: day.pickupCount || 0,
      }));
    }

    return [];
  }

  /**
   * Validate manual entries
   */
  private validateEntries(entries: ManualEntry[]): string[] {
    const errors: string[] = [];

    if (entries.length === 0) {
      errors.push("No entries provided");
      return errors;
    }

    for (const entry of entries) {
      if (!entry.date) {
        errors.push("Entry missing date");
      }

      if (entry.consignments < 0) {
        errors.push(`Invalid consignment count for ${entry.date}`);
      }

      if (entry.totalPay < 0) {
        errors.push(`Invalid total pay for ${entry.date}`);
      }
    }

    return errors;
  }

  /**
   * Calculate payments for entries
   */
  private calculatePayments(entries: ManualEntry[]): ManualEntry[] {
    return entries.map((entry) => {
      const calculated = this.paymentCalculationService.calculateDayPayment(
        entry.date,
        entry.consignments,
        entry.totalPay || 0
      );
      return {
        ...entry,
        baseAmount: calculated.basePayment,
        expectedTotal: calculated.expectedTotal,
      };
    });
  }

  /**
   * Generate and save analysis from entries
   */
  private async generateAnalysis(
    entries: ManualEntry[],
    files: File[],
    userId: string
  ): Promise<AnalysisResult> {
    const result = await analysisService.createAnalysis({
      userId,
      files: files.map((f) => ({
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified,
      })),
      manualEntries: entries.map((e) => ({
        date: e.date,
        consignments: e.consignments,
        paid: e.totalPay,
        pickups: e.pickups,
      })),
    });

    return result;
  }

  /**
   * Save analysis result - extract ID from already saved analysis
   */
  private async saveAnalysis(analysis: AnalysisResult): Promise<string> {
    // Analysis is already saved by createAnalysis, just return the ID
    return analysis.analysisId;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const analysisWorkflowService = new AnalysisWorkflowService();
