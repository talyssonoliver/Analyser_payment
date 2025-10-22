/**
 * Analysis Merge Service
 * Phase 2.1: Smart merging of files into existing analyses
 *
 * Supports two main merge strategies:
 * - Strategy 1: Complementary Data (Runsheet + Invoice)
 * - Strategy 4: Simple Overwrite (Corrected Runsheet)
 */

import { DailyEntry } from "@/lib/domain/entities/daily-entry";
import type { PaymentRules } from "@/lib/domain/entities/payment-rules";
import type { InvoiceData } from "@/lib/infrastructure/pdf/invoice-parser";
import { PDFProcessor } from "@/lib/infrastructure/pdf/pdf-processor";
import type { RunsheetData } from "@/lib/infrastructure/pdf/runsheet-parser";
import type { DayCalculation } from "./payment-calculation-service";
import { Step3AnalysisService } from "./step3-analysis-service";

export interface MergeResult {
  success: boolean;
  message: string;
  mergedEntries?: DailyEntry[];
  errors?: string[];
  warnings?: string[];
  strategy?: "complementary" | "overwrite" | "mixed";
}

export interface MergeStrategy {
  type: "complementary" | "overwrite";
  description: string;
}

/**
 * Analysis Merge Service
 * Merges new files into existing analyses using intelligent strategies
 */
export class AnalysisMergeService {
  private readonly pdfProcessor = new PDFProcessor();

  /**
   * Merge new files into an existing analysis
   * @param analysisId - ID of the existing analysis
   * @param existingEntries - Current daily entries from the analysis
   * @param newFiles - New files to merge
   * @param paymentRules - Payment rules for calculating bonuses
   * @returns MergeResult with merged entries
   */
  async mergeFilesIntoAnalysis(
    analysisId: string,
    existingEntries: DailyEntry[],
    newFiles: File[],
    paymentRules: PaymentRules
  ): Promise<MergeResult> {
    try {
      // 1. Process new files
      const processingResult = await this.pdfProcessor.processFiles(newFiles);

      if (processingResult.errors.length > 0) {
        return {
          success: false,
          message: "Failed to process some files",
          errors: processingResult.errors.map((e) => e.error),
        };
      }

      // 2. Extract daily entries from processed files
      const newDayCalculations = this.extractDayCalculations(processingResult);

      if (newDayCalculations.length === 0) {
        return {
          success: false,
          message: "No data extracted from new files",
          errors: ["Could not extract any daily data from the uploaded files"],
        };
      }

      // 3. Convert to DailyEntry format
      const newEntries = this.convertToDailyEntries(newDayCalculations, analysisId, paymentRules);

      // 4. Merge with existing entries
      const mergeResult = await this.mergeDailyEntries(existingEntries, newEntries);

      return {
        success: true,
        message: `Successfully merged ${newFiles.length} file(s)`,
        mergedEntries: mergeResult.entries,
        warnings: mergeResult.warnings,
        strategy: mergeResult.strategy,
      };
    } catch (error) {
      return {
        success: false,
        message: "Merge operation failed",
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  /**
   * Merge daily entries using smart strategies
   * @param existing - Existing daily entries
   * @param newEntries - New daily entries to merge
   * @returns Merged entries with strategy used
   */
  async mergeDailyEntries(
    existing: DailyEntry[],
    newEntries: DailyEntry[]
  ): Promise<{
    entries: DailyEntry[];
    strategy: "complementary" | "overwrite" | "mixed";
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const entriesByDate = new Map<string, DailyEntry[]>();

    // Group all entries by date
    [...existing, ...newEntries].forEach((entry) => {
      const dateKey = this.getDateKey(entry.date);
      if (!entriesByDate.has(dateKey)) {
        entriesByDate.set(dateKey, []);
      }
      entriesByDate.get(dateKey)?.push(entry);
    });

    // Merge entries for each date
    const mergedEntries: DailyEntry[] = [];
    const strategiesUsed = new Set<"complementary" | "overwrite">();

    for (const [dateKey, entries] of Array.from(entriesByDate.entries())) {
      if (entries.length === 1) {
        // No conflict: use as-is
        mergedEntries.push(entries[0]);
      } else {
        // Merge using appropriate strategy
        const { entry, strategy, warning } = await this.mergeEntries(entries, dateKey);
        mergedEntries.push(entry);
        strategiesUsed.add(strategy);

        if (warning) {
          warnings.push(warning);
        }
      }
    }

    // Sort by date
    mergedEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Determine overall strategy
    let overallStrategy: "complementary" | "overwrite" | "mixed";
    if (strategiesUsed.size === 0) {
      overallStrategy = "complementary"; // Default
    } else if (strategiesUsed.size === 1) {
      overallStrategy = Array.from(strategiesUsed)[0];
    } else {
      overallStrategy = "mixed";
    }

    return {
      entries: mergedEntries,
      strategy: overallStrategy,
      warnings,
    };
  }

  /**
   * Merge multiple entries for the same date
   * Uses Strategy 1 (Complementary) or Strategy 4 (Overwrite)
   */
  private async mergeEntries(
    entries: DailyEntry[],
    dateKey: string
  ): Promise<{
    entry: DailyEntry;
    strategy: "complementary" | "overwrite";
    warning?: string;
  }> {
    // Sort by creation time (if available) - newer entries first
    // For now, we'll use the order they come in
    const sorted = [...entries];

    // Detect merge strategy
    const hasComplementaryData = this.hasComplementaryData(sorted);

    if (hasComplementaryData) {
      // Strategy 1: Complementary Data (Runsheet + Invoice)
      return {
        entry: this.mergeComplementary(sorted),
        strategy: "complementary",
      };
    } else {
      // Strategy 4: Simple Overwrite (use latest data)
      return {
        entry: this.mergeOverwrite(sorted),
        strategy: "overwrite",
        warning: `Multiple entries for ${dateKey}: using most recent data`,
      };
    }
  }

  /**
   * Check if entries have complementary data (one has consignments, another has payment)
   */
  private hasComplementaryData(entries: DailyEntry[]): boolean {
    const hasConsignments = entries.some((e) => e.consignments.count > 0);
    const hasPayment = entries.some((e) => e.paidAmount.amount > 0);
    const allHaveBoth = entries.every((e) => e.consignments.count > 0 && e.paidAmount.amount > 0);

    // Complementary if we have both types of data but not all entries have both
    return hasConsignments && hasPayment && !allHaveBoth;
  }

  /**
   * Strategy 1: Merge complementary data (Runsheet + Invoice)
   * Combine consignments from runsheet with payment from invoice
   */
  private mergeComplementary(entries: DailyEntry[]): DailyEntry {
    // Find entry with consignments (runsheet)
    const runsheetEntry = entries.find((e) => e.consignments.count > 0);

    // Find entry with payment (invoice)
    const invoiceEntry = entries.find((e) => e.paidAmount.amount > 0);

    // Use runsheet as base, add invoice payment
    const baseEntry = runsheetEntry || entries[0];
    const paymentAmount = invoiceEntry?.paidAmount.amount || 0;
    const pickups = Math.max(...entries.map((e) => e.pickups.count));
    const pickupTotal = entries.reduce((sum, e) => sum + e.pickupTotal.amount, 0);

    return new DailyEntry({
      id: baseEntry.id,
      analysisId: baseEntry.analysisId,
      date: baseEntry.date,
      consignments: baseEntry.consignments.count,
      rate: baseEntry.rate.amount,
      basePayment: baseEntry.basePayment.amount,
      pickups,
      pickupTotal,
      unloadingBonus: baseEntry.unloadingBonus.amount,
      attendanceBonus: baseEntry.attendanceBonus.amount,
      earlyBonus: baseEntry.earlyBonus.amount,
      paidAmount: paymentAmount,
    });
  }

  /**
   * Strategy 4: Simple Overwrite
   * Use the latest entry (most recent timestamp/position in array)
   */
  private mergeOverwrite(entries: DailyEntry[]): DailyEntry {
    // Use the last entry (assumed to be most recent)
    return entries[entries.length - 1];
  }

  /**
   * Extract day calculations from PDF processing result
   */
  private extractDayCalculations(
    processingResult: Awaited<ReturnType<typeof PDFProcessor.prototype.processFiles>>
  ): DayCalculation[] {
    const dailyData: Record<
      string,
      {
        consignments: number;
        basePayment: number;
        expectedTotal: number;
        paidAmount: number;
        unloadingBonus: number;
        attendanceBonus: number;
        earlyBonus: number;
        pickupCount: number;
        pickupTotal: number;
        pickups: number;
        rate: number;
        status: string;
      }
    > = {};

    // Process runsheets
    processingResult.runsheets?.forEach((runsheet) => {
      if (runsheet.parseResult?.success && runsheet.parseResult.data) {
        const data = runsheet.parseResult.data as RunsheetData;

        if (data.consignmentsByDate) {
          for (const [dateKey, consignmentCount] of Array.from(data.consignmentsByDate.entries())) {
            const date = dateKey;

            if (!dailyData[date]) {
              dailyData[date] = {
                consignments: 0,
                basePayment: 0,
                expectedTotal: 0,
                paidAmount: 0,
                unloadingBonus: 0,
                attendanceBonus: 0,
                earlyBonus: 0,
                pickups: 0,
                pickupCount: 0,
                pickupTotal: 0,
                rate: 0,
                status: "processed",
              };
            }

            dailyData[date].consignments = consignmentCount;
          }
        }
      }
    });

    // Process invoices
    processingResult.invoices?.forEach((invoice) => {
      if (invoice.parseResult?.success && invoice.parseResult.data) {
        const data = invoice.parseResult.data as InvoiceData;

        // Process individual entries
        data.entries?.forEach((entry) => {
          const date = entry.date.toISOString().split("T")[0];

          if (!dailyData[date]) {
            dailyData[date] = {
              consignments: 0,
              basePayment: 0,
              expectedTotal: 0,
              paidAmount: 0,
              unloadingBonus: 0,
              attendanceBonus: 0,
              earlyBonus: 0,
              pickups: 0,
              pickupCount: 0,
              pickupTotal: 0,
              rate: 0,
              status: "processed",
            };
          }

          dailyData[date].paidAmount += entry.amount || 0;
        });

        // Track pickup services
        data.pickupServices?.forEach((pickup) => {
          const date = pickup.date.toISOString().split("T")[0];
          if (dailyData[date]) {
            dailyData[date].pickups += 1;
            dailyData[date].pickupCount = dailyData[date].pickups;
            dailyData[date].pickupTotal += pickup.amount || 0;
          }
        });
      }
    });

    // Convert to DayCalculation array using Step3AnalysisService's public method
    return Step3AnalysisService.processDailyDataCalculations(dailyData);
  }

  /**
   * Convert DayCalculation to DailyEntry
   */
  private convertToDailyEntries(
    dayCalculations: DayCalculation[],
    analysisId: string,
    paymentRules: PaymentRules
  ): DailyEntry[] {
    return dayCalculations.map((day) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      const rate = paymentRules.getRateForDay(dayOfWeek);
      const bonuses = paymentRules.getApplicableBonuses(dayOfWeek);

      return new DailyEntry({
        analysisId,
        date,
        consignments: day.consignments,
        rate: rate.amount,
        basePayment: day.basePayment,
        pickups: day.pickupCount,
        pickupTotal: day.pickupTotal,
        unloadingBonus: bonuses.unloading.amount,
        attendanceBonus: bonuses.attendance.amount,
        earlyBonus: bonuses.early.amount,
        paidAmount: day.paidAmount,
      });
    });
  }

  /**
   * Get date key for grouping (YYYY-MM-DD format)
   */
  private getDateKey(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Detect merge strategy for a set of entries
   */
  detectMergeStrategy(entries: DailyEntry[]): MergeStrategy {
    if (this.hasComplementaryData(entries)) {
      return {
        type: "complementary",
        description: "Combining runsheet consignments with invoice payments",
      };
    } else {
      return {
        type: "overwrite",
        description: "Using latest data (corrected values)",
      };
    }
  }

  /**
   * Validate merge result
   */
  validateMergeResult(result: MergeResult): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = result.warnings || [];

    if (!result.success) {
      errors.push("Merge operation failed");
      if (result.errors) {
        errors.push(...result.errors);
      }
    }

    if (!result.mergedEntries || result.mergedEntries.length === 0) {
      errors.push("No entries in merge result");
    }

    // Check for data integrity
    result.mergedEntries?.forEach((entry) => {
      if (entry.consignments.count < 0) {
        errors.push(`Invalid consignments on ${entry.dateFormatted}: ${entry.consignments.count}`);
      }

      if (entry.paidAmount.amount < 0) {
        errors.push(`Invalid paid amount on ${entry.dateFormatted}: ${entry.paidAmount.amount}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Export singleton instance
export const analysisMergeService = new AnalysisMergeService();
