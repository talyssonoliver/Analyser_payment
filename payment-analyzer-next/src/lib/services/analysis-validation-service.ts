/**
 * Analysis Validation Service
 * Validates analysis state and completeness before operations
 */

import { AppError, ErrorCodes, Result } from "@/lib/utils/errors";
import { analysisRepository } from "../repositories/analysis-repository";

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suggestion?: string;
}

export class AnalysisValidationService {
  /**
   * Validate if an analysis is ready to be viewed in reports
   */
  static async validateForReports(analysisId: string): Promise<Result<ValidationResult>> {
    try {
      const result = await analysisRepository.getAnalysisById(analysisId);

      if (result.isFailure) {
        return Result.success({
          isValid: false,
          reason: "Analysis not found in database",
          suggestion: "Please start a new analysis",
        });
      }

      const analysis = result.data;

      if (!analysis) {
        return Result.success({
          isValid: false,
          reason: "Analysis not found in database",
          suggestion: "Please start a new analysis",
        });
      }

      // Check if analysis has been processed
      if (!analysis.daily_entries || analysis.daily_entries.length === 0) {
        return Result.success({
          isValid: false,
          reason: "Analysis has not been processed yet",
          suggestion: "Return to Step 3 and run the analysis",
        });
      }

      // Check if analysis is in error state
      if (analysis.status === "error") {
        return Result.success({
          isValid: false,
          reason: "Analysis encountered an error during processing",
          suggestion: "Please try running the analysis again",
        });
      }

      // Check if analysis is still processing
      if (analysis.status === "processing") {
        return Result.success({
          isValid: false,
          reason: "Analysis is still being processed",
          suggestion: "Please wait a moment and try again",
        });
      }

      // Analysis is valid and ready
      return Result.success({
        isValid: true,
      });
    } catch (error) {
      return Result.failure(
        new AppError(
          `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          ErrorCodes.INTERNAL_ERROR,
          500
        )
      );
    }
  }

  /**
   * Check if user can view report for this analysis
   */
  static async canViewReport(analysisId: string): Promise<boolean> {
    const result = await AnalysisValidationService.validateForReports(analysisId);
    return result.isSuccess && result.data.isValid;
  }

  /**
   * Get analysis completeness percentage (0-100)
   */
  static async getAnalysisCompleteness(analysisId: string): Promise<number> {
    try {
      const result = await analysisRepository.getAnalysisById(analysisId);

      if (result.isFailure || !result.data) {
        return 0;
      }

      const analysis = result.data;
      let completeness = 0;

      // Has daily entries
      if (analysis.daily_entries && analysis.daily_entries.length > 0) {
        completeness += 50;
      }

      // Has totals calculated
      if (analysis.analysis_totals) {
        completeness += 25;
      }

      // Status is completed
      if (analysis.status === "completed") {
        completeness += 25;
      }

      return completeness;
    } catch {
      return 0;
    }
  }

  /**
   * Validate analysis before allowing navigation to reports
   * Shows appropriate toast message if invalid
   */
  static async validateAndNotify(
    analysisId: string,
    toast: { warning: (message: string) => void }
  ): Promise<boolean> {
    const result = await AnalysisValidationService.validateForReports(analysisId);

    if (result.isFailure) {
      toast.warning("Unable to validate analysis. Please try again.");
      return false;
    }

    const validation = result.data;

    if (!validation.isValid) {
      const message = validation.suggestion
        ? `${validation.reason}. ${validation.suggestion}`
        : validation.reason || "Analysis is not ready";

      toast.warning(message);
      return false;
    }

    return true;
  }
}
