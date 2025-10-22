/**
 * Step 3 Analysis Service
 * Equivalent to displayAnalysisResults and related functions from original HTML
 */

import { v4 as uuidv4 } from "uuid";
import { ProgressTrackingService } from "@/lib/services/progress-tracking-service";
import { pdfWorkerClient } from "@/lib/workers/pdf-worker-client";
import type { ManualEntry } from "@/types/core";
import { PDFProcessor, type ProcessingResult } from "../infrastructure/pdf/pdf-processor";
import { analysisRepository } from "../repositories/analysis-repository";
import {
  type DailyData,
  type DayCalculation,
  PaymentCalculationService,
  type PaymentTotals,
  type WeekCalculation,
} from "./payment-calculation-service";

interface DailyDataEntry {
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

interface HistoricalDailyEntry {
  date: string;
  consignments: number;
  expected_total: number;
  base_payment: number;
  unloading_bonus: number;
  attendance_bonus: number;
  early_bonus: number;
  rate: number;
  paid_amount: number;
  pickup_total?: number;
  pickups?: number;
}

interface HistoricalAnalysis {
  daily_entries?: HistoricalDailyEntry[];
}

export interface Step3AnalysisData {
  id: string;
  totals: PaymentTotals;
  weeks: WeekCalculation[];
  days: DayCalculation[];
  metadata: {
    analysisId: string;
    createdAt: Date;
    analysisDate: string;
    inputMethod: "upload" | "manual";
    totalFiles?: number;
    totalEntries: number;
    overallStatus: string;
    periodRange: string;
  };
}

export interface AnalysisInput {
  results?: DayCalculation[];
  totals?: PaymentTotals;
  weeks?: WeekCalculation[];
  files?: File[];
  manualEntries?: ManualEntry[];
  inputMethod: "upload" | "manual";
  userId?: string; // Optional: for fetching historical data
  enableHistoricalMerge?: boolean; // Optional: enable automatic historical data merge
}

// biome-ignore lint/complexity/noStaticOnlyClass: Intentional class-as-namespace for stable API surface
export class Step3AnalysisService {
  private static readonly calculationService = new PaymentCalculationService();

  /**
   * Main analysis processing function
   * Equivalent to the analyze() function in original HTML
   */
  static async processAnalysis(input: AnalysisInput): Promise<Step3AnalysisData | null> {
    console.log("� [CODE VERSION 2.0] processAnalysis called with input:", {
      inputMethod: input.inputMethod,
      filesCount: input.files?.length || 0,
      fileNames: input.files?.map((f) => f.name) || [],
      manualEntriesCount: input.manualEntries?.length || 0,
      hasResults: !!input.results,
    });

    try {
      const { inputMethod, files, manualEntries } = input;

      let dayCalculations: DayCalculation[] = [];

      // Process based on input method
      if (inputMethod === "manual" && manualEntries?.length) {
        console.log("✅ Using manual entry mode with", manualEntries.length, "entries");
        dayCalculations = Step3AnalysisService.processManualEntries(manualEntries);
      } else if (inputMethod === "upload" && files?.length) {
        // Process uploaded PDF files using the PDF processing infrastructure
        console.log("📄 Using upload mode - Processing uploaded PDF files:", files.length);
        console.log(
          "📄 File details:",
          files.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
            lastModified: new Date(f.lastModified).toISOString(),
          }))
        );
        dayCalculations = await Step3AnalysisService.processPDFFiles(
          files,
          input.userId,
          input.enableHistoricalMerge
        );
      } else if (input.results) {
        // Use pre-calculated results
        console.log("✅ Using pre-calculated results");
        dayCalculations = input.results;
      } else {
        console.warn("⚠️ No valid data for analysis");
        console.warn("Input state:", {
          inputMethod,
          hasFiles: !!files,
          filesLength: files?.length,
          hasManualEntries: !!manualEntries,
          manualEntriesLength: manualEntries?.length,
          hasResults: !!input.results,
        });
        return null;
      }

      // Calculate totals and weeks
      const totals = Step3AnalysisService.calculationService.calculateTotals(dayCalculations);
      const weeks = Step3AnalysisService.calculationService.groupByWeeks(dayCalculations);

      // Generate metadata
      const metadata = Step3AnalysisService.generateMetadata(dayCalculations, totals);

      const analysisData: Step3AnalysisData = {
        id: metadata.analysisId,
        totals,
        weeks,
        days: dayCalculations,
        metadata,
      };

      console.log("📊 Step 3 analysis complete:", analysisData);
      return analysisData;
    } catch (error) {
      console.error("❌ Step 3 analysis failed:", error);
      return null;
    }
  }

  /**
   * Process manual entries into day calculations
   */
  private static processManualEntries(manualEntries: ManualEntry[]): DayCalculation[] {
    const dailyData: Record<string, DailyDataEntry> = {};

    // Convert manual entries to daily data format
    manualEntries.forEach((entry) => {
      if (entry.date) {
        dailyData[entry.date] = {
          consignments: entry.consignments || 0,
          basePayment: 0, // Will be calculated
          expectedTotal: 0, // Will be calculated
          paidAmount: entry.totalPay || 0,
          unloadingBonus: 0, // Will be calculated
          attendanceBonus: 0, // Will be calculated
          earlyBonus: 0, // Will be calculated
          pickups: entry.pickups || 0,
          pickupCount: entry.pickups || 0,
          pickupTotal: 0, // Will be calculated
          rate: 0, // Will be calculated
          status: "manual",
        };
      }
    });

    return Step3AnalysisService.calculationService.processDailyData(dailyData);
  }

  /**
   * Merge runsheet data from historical entry into current data
   */
  private static mergeRunsheetData(
    current: DailyDataEntry,
    historicalEntry: HistoricalDailyEntry,
    date: string
  ): DailyDataEntry {
    console.log(`  📊 [HISTORICAL MERGE] Merging runsheet data for ${date}:`, {
      consignments: historicalEntry.consignments,
      expectedTotal: historicalEntry.expected_total,
    });

    return {
      ...current,
      consignments: historicalEntry.consignments,
      expectedTotal: historicalEntry.expected_total,
      basePayment: historicalEntry.base_payment,
      unloadingBonus: historicalEntry.unloading_bonus,
      attendanceBonus: historicalEntry.attendance_bonus,
      earlyBonus: historicalEntry.early_bonus,
      rate: historicalEntry.rate,
    };
  }

  /**
   * Merge invoice data from historical entry into current data
   */
  private static mergeInvoiceData(
    current: DailyDataEntry,
    historicalEntry: HistoricalDailyEntry,
    date: string
  ): DailyDataEntry {
    console.log(`  💰 [HISTORICAL MERGE] Merging invoice data for ${date}:`, {
      paidAmount: historicalEntry.paid_amount,
      pickupTotal: historicalEntry.pickup_total,
    });

    return {
      ...current,
      paidAmount: historicalEntry.paid_amount,
      pickupTotal: historicalEntry.pickup_total || 0,
      pickupCount: historicalEntry.pickups || 0,
      pickups: historicalEntry.pickups || 0,
    };
  }

  /**
   * Process a single historical entry and merge it with current data
   */
  private static processSingleHistoricalEntry(
    mergedData: Record<string, DailyDataEntry>,
    historicalEntry: HistoricalDailyEntry,
    hasRunsheet: boolean,
    hasInvoice: boolean
  ): number {
    const date = historicalEntry.date;

    // If we don't have data for this date yet, skip (out of range)
    if (!mergedData[date]) return 0;

    const current = mergedData[date];
    let mergedCount = 0;

    // Merge runsheet data (consignments, expectedTotal) if missing
    if (!hasRunsheet && historicalEntry.consignments > 0) {
      mergedData[date] = Step3AnalysisService.mergeRunsheetData(current, historicalEntry, date);
      mergedCount++;
    }

    // Merge invoice data (paidAmount) if missing
    if (!hasInvoice && historicalEntry.paid_amount > 0) {
      mergedData[date] = Step3AnalysisService.mergeInvoiceData(current, historicalEntry, date);
      mergedCount++;
    }

    return mergedCount;
  }

  /**
   * Process historical entries and merge them with current daily data
   */
  private static processHistoricalEntries(
    mergedData: Record<string, DailyDataEntry>,
    historicalAnalyses: HistoricalAnalysis[],
    hasRunsheet: boolean,
    hasInvoice: boolean
  ): number {
    let mergedDaysCount = 0;

    for (const historicalAnalysis of historicalAnalyses) {
      if (!historicalAnalysis.daily_entries) continue;

      for (const historicalEntry of historicalAnalysis.daily_entries) {
        mergedDaysCount += Step3AnalysisService.processSingleHistoricalEntry(
          mergedData,
          historicalEntry,
          hasRunsheet,
          hasInvoice
        );
      }
    }

    return mergedDaysCount;
  }

  /**
   * Fetch and merge historical data for invoice-only or runsheet-only uploads
   * This solves the real-world workflow where users upload files separately
   *
   * @param dailyData - Current daily data from this upload
   * @param userId - User ID to fetch historical data for
   * @param dateRange - Date range of current upload
   * @param hasRunsheet - Whether current upload includes runsheet data
   * @param hasInvoice - Whether current upload includes invoice data
   * @returns Merged daily data with historical information
   */
  private static async mergeHistoricalData(
    dailyData: Record<string, DailyDataEntry>,
    userId: string,
    dateRange: { start: string; end: string },
    hasRunsheet: boolean,
    hasInvoice: boolean
  ): Promise<Record<string, DailyDataEntry>> {
    try {
      console.log("🔍 [HISTORICAL MERGE] Checking for historical data:", {
        dateRange,
        hasRunsheet,
        hasInvoice,
        currentDays: Object.keys(dailyData).length,
      });

      // Only fetch historical data if we're missing either runsheet or invoice
      if (hasRunsheet && hasInvoice) {
        console.log("✅ [HISTORICAL MERGE] Complete data in current upload, no merge needed");
        return dailyData;
      }

      // Query database for overlapping analyses
      const result = await analysisRepository.findAnalysesByDateRange(
        userId,
        dateRange.start, // DD/MM/YYYY format
        dateRange.end,
        {
          status: ["completed"], // Only fetch completed analyses
        }
      );

      if (result.isFailure || !result.data || result.data.length === 0) {
        console.log("⚠️ [HISTORICAL MERGE] No historical data found for this date range");
        return dailyData;
      }

      console.log(`📚 [HISTORICAL MERGE] Found ${result.data.length} historical analysis/analyses`);

      // Merge historical data
      const mergedData = { ...dailyData };
      const mergedDaysCount = Step3AnalysisService.processHistoricalEntries(
        mergedData,
        result.data,
        hasRunsheet,
        hasInvoice
      );

      if (mergedDaysCount > 0) {
        console.log(`✅ [HISTORICAL MERGE] Successfully merged data for ${mergedDaysCount} day(s)`);
      } else {
        console.log("⚠️ [HISTORICAL MERGE] No relevant historical data found to merge");
      }

      return mergedData;
    } catch (error) {
      console.error("❌ [HISTORICAL MERGE] Failed to fetch/merge historical data:", error);
      // Return original data if merge fails
      return dailyData;
    }
  }

  /**
   * Process PDF files using the PDF processing infrastructure
   */
  private static async processPDFFiles(
    files: File[],
    userId?: string,
    enableHistoricalMerge?: boolean
  ): Promise<DayCalculation[]> {
    console.log("🔍 DEBUG: Starting PDF processing for", files.length, "files");
    console.log(
      "🔍 DEBUG: File names:",
      files.map((f) => f.name)
    );

    try {
      const progress = ProgressTrackingService.getInstance();
      // Advance to reading PDFs stage and show total files
      progress.advanceToStage(2, `Reading ${files.length} PDF(s)`);

      let processingResult: ProcessingResult;

      // Prefer Web Worker if explicitly enabled and available
      if (pdfWorkerClient.isAvailable()) {
        console.log("📄 Using Web Worker PDF processing");
        processingResult = await pdfWorkerClient.processFiles(
          files,
          ({ current, total, currentFile, percentage }) => {
            // Update details in stages 2/3 while processing
            const fileInfo = currentFile ? ` • ${currentFile}` : "";
            progress.updateStageDetails(2, `Reading ${current}/${total}${fileInfo}`);
            // As we get progress, we can mark extract stage active too
            if (current >= 1) {
              progress.advanceToStage(3, `Extracting data… ${percentage}%`);
            }
          }
        );
      } else {
        // Fallback to main thread processing
        console.log("📄 Using direct PDF processing (main thread)");
        const processor = new PDFProcessor();
        console.log("🔍 DEBUG: PDFProcessor created, processing files...");
        processingResult = await processor.processFiles(files);
      }

      // Move to processing stage
      progress.advanceToStage(4, "Organizing and validating data");

      const calculations = await Step3AnalysisService.transformProcessingResultToDailyCalculations(
        processingResult,
        userId,
        enableHistoricalMerge
      );
      // Move to calculating stage
      progress.advanceToStage(6, "Calculating payments and totals");
      return calculations;
    } catch (error) {
      console.error("❌ PDF processing failed:", error);
      console.error("🔍 DEBUG: Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        error,
      });
      const progress = ProgressTrackingService.getInstance();
      progress.failStage(2, error instanceof Error ? error.message : "Processing error");
      // Re-throw the error so it can be handled by the caller
      throw error;
    }
  }

  /**
   * Transform PDF processing results into daily calculations
   */
  private static async transformProcessingResultToDailyCalculations(
    processingResult: ProcessingResult,
    userId?: string,
    enableHistoricalMerge?: boolean
  ): Promise<DayCalculation[]> {
    const dailyData: Record<string, DailyDataEntry> = {};

    // Debug: Log processing result summary
    console.log("📊 Processing Result Summary:", {
      runsheets: processingResult.runsheets?.length || 0,
      invoices: processingResult.invoices?.length || 0,
      errors: processingResult.errors?.length || 0,
    });

    // Debug: Log detailed runsheet data
    if (processingResult.runsheets?.length) {
      console.log(
        "📄 Runsheet details:",
        processingResult.runsheets.map((r) => ({
          fileName: r.file.name,
          hasParseResult: !!r.parseResult,
          hasData: !!r.parseResult?.data,
          parseSuccess: r.parseResult?.success,
          consignments: r.parseResult?.data?.totalConsignments,
          dates: r.parseResult?.data?.dates?.length,
          details: r.parseResult?.data?.details?.length,
          fullData: r.parseResult?.data, // Show complete data structure
        }))
      );

      // Log each runsheet's full parse result for debugging
      processingResult.runsheets.forEach((r, idx) => {
        console.log(`📄 Runsheet ${idx + 1} (${r.file.name}):`, {
          parseResult: r.parseResult,
          rawData: r.parseResult?.data,
        });
      });
    }

    // Debug: Log detailed invoice data
    if (processingResult.invoices?.length) {
      console.log(
        "📄 Invoice details:",
        processingResult.invoices.map((i) => ({
          fileName: i.file.name,
          hasParseResult: !!i.parseResult,
          hasData: !!i.parseResult?.data,
          parseSuccess: i.parseResult?.success,
          entries: i.parseResult?.data?.entries?.length,
          total: i.parseResult?.data?.totalAmount,
          fullData: i.parseResult?.data, // Show complete data structure
        }))
      );

      // Log each invoice's full parse result for debugging
      processingResult.invoices.forEach((inv, idx) => {
        console.log(`📄 Invoice ${idx + 1} (${inv.file.name}):`, {
          parseResult: inv.parseResult,
          rawData: inv.parseResult?.data,
        });
      });
    }

    // Process runsheets - FIXED: Use consignmentsByDate Map, not details array
    // Legacy code (line 8117): results.runsheets[date] = { consignments };
    processingResult.runsheets?.forEach((runsheet) => {
      if (runsheet.parseResult?.data) {
        const data = runsheet.parseResult.data;

        // Use consignmentsByDate Map - this already has the TOTAL per date
        // Details array has one entry PER PAGE, which would count pages multiple times!
        if (data.consignmentsByDate) {
          for (const [dateKey, consignmentCount] of data.consignmentsByDate) {
            // dateKey is already in YYYY-MM-DD format
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

            // Set the count (not add) since Map already has the total
            dailyData[date].consignments = consignmentCount;
          }
        }
      }
    });

    // Process invoices
    processingResult.invoices?.forEach((invoice) => {
      if (invoice.parseResult?.data) {
        const data = invoice.parseResult.data;
        const totalToDistribute = data.documentTotal ?? data.totalAmount;
        const entrySum = data.entries?.reduce((sum, e) => sum + e.amount, 0) || 0;

        console.log("💰 [INVOICE TOTAL FIX] Invoice processing:", {
          fileName: invoice.file.name,
          documentTotal: data.documentTotal,
          calculatedFromEntries: data.totalAmount,
          entrySum,
          usingTotal: totalToDistribute,
          difference: totalToDistribute - entrySum,
        });

        // Distribute the ACTUAL invoice total proportionally across days based on their entry amounts
        // FIX: Round to 2 decimal places and adjust last entry to ensure sum equals total exactly
        const distributedAmounts: { date: string; amount: number }[] = [];
        let runningTotal = 0;

        data.entries?.forEach((entry, index) => {
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

          // Proportionally distribute the document total based on this day's share of entries
          const proportion =
            entrySum > 0 ? entry.amount / entrySum : 1 / (data.entries?.length || 1);
          let adjustedAmount = totalToDistribute * proportion;

          // Round to 2 decimal places for all except the last entry
          const isLastEntry = index === (data.entries?.length ?? 0) - 1;
          if (!isLastEntry) {
            adjustedAmount = Math.round(adjustedAmount * 100) / 100;
            runningTotal += adjustedAmount;
          } else {
            // Last entry gets the remainder to ensure exact total
            adjustedAmount = totalToDistribute - runningTotal;
          }

          console.log(
            `  📅 ${date}: entry=${entry.amount.toFixed(2)}, proportion=${(proportion * 100).toFixed(2)}%, adjusted=${adjustedAmount.toFixed(2)}${isLastEntry ? " (final adjustment)" : ""}`
          );

          dailyData[date].paidAmount += adjustedAmount;
          distributedAmounts.push({ date, amount: adjustedAmount });
        });

        // Verify distribution equals total
        const distributedSum = distributedAmounts.reduce((sum, d) => sum + d.amount, 0);
        console.log(
          `  ✅ Distribution verification: total=${totalToDistribute.toFixed(2)}, distributed=${distributedSum.toFixed(2)}, diff=${(Math.abs(totalToDistribute - distributedSum)).toFixed(6)}`
        );

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

    // Debug: Log extracted daily data
    console.log("📊 Extracted daily data:", {
      daysCount: Object.keys(dailyData).length,
      dates: Object.keys(dailyData),
      data: dailyData,
    });

    // Debug: Check for pickup data
    Object.keys(dailyData).forEach((date) => {
      if (dailyData[date].pickupTotal > 0) {
        console.log(
          `🔍 [PICKUP DATA] ${date}: pickups=${dailyData[date].pickups}, pickupTotal=${dailyData[date].pickupTotal}, consignments=${dailyData[date].consignments}`
        );
      }
    });

    // If no data was extracted, throw an error with detailed information
    if (Object.keys(dailyData).length === 0) {
      console.error("❌ No data extracted from PDFs");
      console.error("Processing result:", {
        runsheetCount: processingResult.runsheets?.length || 0,
        invoiceCount: processingResult.invoices?.length || 0,
        errors: processingResult.errors || [],
      });

      // If there are errors in the processing result, include them in the error message
      if (processingResult.errors && processingResult.errors.length > 0) {
        const errorMessages = processingResult.errors
          .map((e) => `- ${typeof e === "object" && e !== null ? JSON.stringify(e) : String(e)}`)
          .join("\n");
        throw new Error(
          `Failed to extract data from uploaded PDFs:\n${errorMessages}\n\nPlease verify that your files are valid runsheets or invoices, or use manual entry to add data.`
        );
      }

      throw new Error(
        "Failed to extract data from uploaded PDFs. Please verify that your files are valid runsheets or invoices, or use manual entry to add data."
      );
    }

    // HISTORICAL MERGE: Fetch and merge data from previous uploads if enabled
    let finalDailyData = dailyData;
    if (enableHistoricalMerge && userId) {
      const hasRunsheet = (processingResult.runsheets?.length || 0) > 0;
      const hasInvoice = (processingResult.invoices?.length || 0) > 0;

      // Extract date range from daily data
      const dates = Object.keys(dailyData).sort((a, b) => a.localeCompare(b));
      if (dates.length > 0) {
        const formatDateToDDMMYYYY = (isoDate: string): string => {
          const [year, month, day] = isoDate.split("-");
          return `${day}/${month}/${year}`;
        };

        const dateRange = {
          start: formatDateToDDMMYYYY(dates[0]),
          end: formatDateToDDMMYYYY(dates[dates.length - 1]),
        };

        finalDailyData = await Step3AnalysisService.mergeHistoricalData(
          dailyData,
          userId,
          dateRange,
          hasRunsheet,
          hasInvoice
        );
      }
    }

    return Step3AnalysisService.calculationService.processDailyData(finalDailyData);
  }

  /**
   * Generate analysis metadata
   */
  private static generateMetadata(
    days: DayCalculation[],
    totals: PaymentTotals
  ): Step3AnalysisData["metadata"] {
    const sortedDays = days
      .filter((d) => d.consignments > 0 || d.paidAmount > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    const firstDay = sortedDays[0]?.date;
    const lastDay = sortedDays[sortedDays.length - 1]?.date;

    let periodRange = "No data";
    if (firstDay && lastDay) {
      const startDate = new Date(firstDay).toLocaleDateString("en-GB");
      const endDate = new Date(lastDay).toLocaleDateString("en-GB");
      periodRange = firstDay === lastDay ? startDate : `${startDate} - ${endDate}`;
    }

    const overallStatus =
      totals.differenceTotal >= 0
        ? "Payment Complete - Favorable"
        : "Payment Incomplete - Review Required";

    return {
      analysisId: uuidv4(),
      createdAt: new Date(),
      analysisDate: new Date().toISOString().split("T")[0],
      inputMethod: "upload" as const,
      totalEntries: days.length,
      overallStatus,
      periodRange,
    };
  }

  /**
   * Generate quick summary data for Step 3 cards
   * Equivalent to generateStep3SummaryCards data preparation
   */
  static generateQuickSummary(analysisData: Step3AnalysisData) {
    const { totals } = analysisData;

    return {
      totalActual: totals.paidTotal,
      totalExpected: totals.expectedTotal,
      difference: totals.differenceTotal,
      workingDays: totals.workingDays,
      dailyAverage: totals.workingDays > 0 ? totals.expectedTotal / totals.workingDays : 0,
      isDifferencePositive: totals.differenceTotal >= 0,
    };
  }

  /**
   * Validate analysis data
   * Equivalent to validation logic in original
   */
  static validateAnalysisData(analysisData: Step3AnalysisData | null): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!analysisData) {
      errors.push("No analysis data available");
      return { isValid: false, errors, warnings };
    }

    const { days, totals, weeks } = analysisData;

    // Basic validation
    if (!days.length) {
      errors.push("No daily data found");
    }

    if (!weeks.length) {
      errors.push("No weekly data found");
    }

    if (totals.workingDays === 0) {
      warnings.push("No working days detected");
    }

    if (totals.totalConsignments === 0) {
      warnings.push("No consignments recorded");
    }

    // Business rule validation
    days.forEach((day: DayCalculation) => {
      if (day.day === "Sunday" && (day.consignments > 0 || day.paidAmount > 0)) {
        warnings.push(`Work recorded on Sunday ${day.date} - unusual`);
      }

      if (day.day === "Monday" && day.unloadingBonus > 0) {
        errors.push(`Monday ${day.date} has unloading bonus - should be £0.00`);
      }

      if (day.day === "Saturday" && (day.attendanceBonus > 0 || day.earlyBonus > 0)) {
        errors.push(`Saturday ${day.date} has attendance/early bonus - should be £0.00`);
      }

      if (Math.abs(day.difference) > 100) {
        warnings.push(`Large payment difference on ${day.date}: £${day.difference.toFixed(2)}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Format analysis data for reports
   * Equivalent to generateAnalysisDataForReports in original
   */
  static formatForReports(analysisData: Step3AnalysisData) {
    const { totals, weeks, days, metadata } = analysisData;

    return {
      results: days,
      totals,
      weeks,
      metadata: {
        ...metadata,
        rulesVersion: "9.0.0",
        calculatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Prepare data for dashboard/history saving
   */
  static prepareForStorage(analysisData: Step3AnalysisData, inputMethod: "upload" | "manual") {
    const { totals, weeks, days, metadata } = analysisData;

    return {
      analysisData: {
        totals,
        weeks,
        days,
        metadata,
      },
      summary: {
        workingDays: totals.workingDays,
        totalConsignments: totals.totalConsignments,
        expectedTotal: totals.expectedTotal,
        paidTotal: totals.paidTotal,
        difference: totals.differenceTotal,
        status: metadata.overallStatus,
        periodRange: metadata.periodRange,
      },
      inputMethod,
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if analysis should show detailed report vs individual week reports
   */
  static shouldShowDetailedReport(analysisData: Step3AnalysisData): boolean {
    return analysisData.weeks.length === 1;
  }

  /**
   * Get analysis status for UI display
   */
  static getAnalysisStatus(analysisData: Step3AnalysisData | null) {
    if (!analysisData) {
      return {
        status: "empty",
        message: "No analysis data available",
        color: "gray",
      };
    }

    const { totals } = analysisData;
    const difference = totals.differenceTotal;

    if (difference > 0) {
      return {
        status: "favorable",
        message: "Payment Complete - Favorable",
        color: "green",
      };
    } else if (difference === 0) {
      return {
        status: "exact",
        message: "Payment Complete - Exact Match",
        color: "blue",
      };
    } else {
      return {
        status: "unfavorable",
        message: "Payment Incomplete - Review Required",
        color: "red",
      };
    }
  }

  /**
   * Public method to process daily data using the calculation service
   * This exposes the private calculationService functionality for use by other services
   */
  static processDailyDataCalculations(dailyData: DailyData): DayCalculation[] {
    return Step3AnalysisService.calculationService.processDailyData(dailyData);
  }
}
