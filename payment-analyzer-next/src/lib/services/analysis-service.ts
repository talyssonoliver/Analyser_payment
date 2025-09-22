import { Analysis, type AnalysisSource } from '@/lib/domain/entities/analysis';
import type { RunsheetData } from '@/lib/infrastructure/pdf/runsheet-parser';
import type { InvoiceData, InvoiceEntry } from '@/lib/infrastructure/pdf/invoice-parser';

// Union type for parsed PDF data
export type ParsedPDFDataTypes = (RunsheetData & { type: 'runsheet' }) | (InvoiceData & { type: 'invoice' });

// Payment object interface for validation
interface PaymentObject {
  date: string | number | Date;
  amount: number | string;
}
import { PaymentRules } from '@/lib/domain/entities/payment-rules';
import { DailyEntry } from '@/lib/domain/entities/daily-entry';
import { FileFingerprintService } from '@/lib/domain/services/file-fingerprint-service';
import { analysisRepository } from '@/lib/repositories/analysis-repository';
// Dynamic import for PDF processor to avoid SSR issues
const loadPDFProcessor = async () => {
  const { PDFProcessor } = await import('@/lib/infrastructure/pdf/pdf-processor');
  return PDFProcessor;
};
import { DEFAULT_PAYMENT_RULES, type FileType } from '@/lib/constants';
import { type StringKeyObject } from '@/types/core';

// Interface for file records - matches CreateAnalysisFileData
interface FileRecord {
  storage_path: string;
  original_name: string;
  file_size: number;
  file_hash: string;
  mime_type: string;
  file_type: FileType;
  parsed_data?: StringKeyObject;
}


export interface AnalysisFile {
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface CreateAnalysisRequest {
  userId: string;
  files?: AnalysisFile[];
  manualEntries?: {
    date: string;
    consignments: number;
    paid: number;
    hasUnloadingBonus?: boolean;
    hasAttendanceBonus?: boolean;
    hasEarlyBonus?: boolean;
    pickups?: number;
  }[];
  paymentRules?: Partial<{
    weekdayRate: number;
    saturdayRate: number;
    unloadingBonus: number;
    attendanceBonus: number;
    earlyBonus: number;
  }>;
  metadata?: {
    description?: string;
    notes?: string;
  };
}

export interface AnalysisProgress {
  stage: 'initializing' | 'processing_files' | 'calculating' | 'saving' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  currentFile?: string;
  totalFiles?: number;
  processedFiles?: number;
  error?: string;
}

export interface AnalysisResult {
  analysisId: string;
  analysis: Analysis;
  success: boolean;
  error?: string;
}

export class AnalysisService {
  private readonly fingerprintService = new FileFingerprintService();
  
  private async getPDFProcessor() {
    const PDFProcessorClass = await loadPDFProcessor();
    return new PDFProcessorClass();
  }

  /**
   * Create and process a new analysis
   */
  async createAnalysis(
    request: CreateAnalysisRequest,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResult> {
    try {
      onProgress?.({
        stage: 'initializing',
        progress: 0,
        message: 'Initializing analysis...',
      });

      // Validate request
      if (!request.files?.length && !request.manualEntries?.length) {
        throw new Error('Analysis requires either files or manual entries');
      }

      // Create payment rules
      const paymentRules = new PaymentRules({
        userId: request.userId,
        ...DEFAULT_PAYMENT_RULES,
        ...request.paymentRules,
      });

      // Generate fingerprint for duplicate detection
      let fingerprint: string | undefined;
      if (request.files?.length) {
        const fingerprintResult = await this.fingerprintService.createFingerprint(request.files);
        fingerprint = fingerprintResult.fingerprint;
        
        // Check for duplicate
        const { data: existingAnalysis } = await analysisRepository.findAnalysisByFingerprint(
          request.userId,
          fingerprint
        );
        
        if (existingAnalysis) {
          throw new Error(`Duplicate analysis detected. Analysis from ${new Date(existingAnalysis.created_at).toLocaleDateString()} already exists.`);
        }
      }

      onProgress?.({
        stage: 'processing_files',
        progress: 10,
        message: 'Processing files...',
        totalFiles: request.files?.length || 0,
        processedFiles: 0,
      });

      // Process files if provided
      let dailyEntries: DailyEntry[] = [];
      let fileRecords: FileRecord[] = [];
      
      if (request.files?.length) {
        const { entries, files } = await this.processFiles(
          request.files,
          paymentRules,
          (fileProgress) => {
            onProgress?.({
              stage: 'processing_files',
              progress: 10 + (fileProgress.progress * 0.5), // 10-60% for file processing
              message: `Processing ${fileProgress.currentFile}...`,
              currentFile: fileProgress.currentFile,
              totalFiles: fileProgress.totalFiles,
              processedFiles: fileProgress.processedFiles,
            });
          }
        );
        dailyEntries = entries;
        fileRecords = files;
      }

      // Process manual entries if provided
      if (request.manualEntries?.length) {
        onProgress?.({
          stage: 'processing_files',
          progress: 60,
          message: 'Processing manual entries...',
        });

        const manualDailyEntries = this.processManualEntries(request.manualEntries, paymentRules);
        dailyEntries = [...dailyEntries, ...manualDailyEntries];
      }

      onProgress?.({
        stage: 'calculating',
        progress: 70,
        message: 'Calculating payment totals...',
      });

      // Create analysis entity
      const analysis = new Analysis({
        userId: request.userId,
        fingerprint: fingerprint || '',
        source: request.files?.length ? 'upload' : 'manual',
        periodStart: new Date(), // This will be calculated based on entries
        periodEnd: new Date(),   // This will be calculated based on entries
        rulesVersion: 1, // Placeholder
        dailyEntries,
        metadata: {
          description: request.metadata?.description,
          notes: request.metadata?.notes,
          fileCount: request.files?.length || 0,
          manualEntryCount: request.manualEntries?.length || 0,
        },
      });

      onProgress?.({
        stage: 'saving',
        progress: 80,
        message: 'Saving analysis to database...',
      });

      // Save to database
      const analysisId = await this.saveAnalysisToDatabase(analysis, fileRecords);

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: 'Analysis completed successfully!',
      });

      return {
        analysisId,
        analysis,
        success: true,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: 'Analysis failed',
        error: errorMessage,
      });

      return {
        analysisId: '',
        analysis: null as unknown as Analysis,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Process uploaded files
   */
  private async processFiles(
    files: AnalysisFile[],
    paymentRules: PaymentRules,
    onProgress?: (progress: { progress: number; currentFile: string; totalFiles: number; processedFiles: number }) => void
  ): Promise<{ entries: DailyEntry[]; files: FileRecord[] }> {
    const dailyEntries: DailyEntry[] = [];
    const fileRecords: FileRecord[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      onProgress?.({
        progress: (i / files.length) * 100,
        currentFile: file.name,
        totalFiles: files.length,
        processedFiles: i,
      });

      try {
        // Process PDF file
        const pdfProcessor = await this.getPDFProcessor();
        const result = await pdfProcessor.processFile(file.file);
        
        if (result.parseResult.success && result.parseResult.data) {
          // Convert processed data to daily entries
          const entries = this.convertToDailyEntries(result.parseResult.data as ParsedPDFDataTypes, paymentRules);
          dailyEntries.push(...entries);

          // Create file record
          fileRecords.push({
            storage_path: `analyses/${Date.now()}_${file.name}`, // Would upload to storage in production
            original_name: file.name,
            file_size: file.size,
            file_hash: await this.calculateFileHash(file.file),
            mime_type: file.type,
            file_type: this.detectFileType(file.name),
            parsed_data: result.parseResult.data as unknown as StringKeyObject,
          });
        } else {
          console.warn(`Failed to process file ${file.name}:`, result.parseResult.error || 'Unknown error');
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    onProgress?.({
      progress: 100,
      currentFile: '',
      totalFiles: files.length,
      processedFiles: files.length,
    });

    return { entries: dailyEntries, files: fileRecords };
  }

  /**
   * Process manual entries
   */
  private processManualEntries(
    entries: CreateAnalysisRequest['manualEntries'],
    paymentRules: PaymentRules
  ): DailyEntry[] {
    if (!entries) return [];

    return entries.map(entry => {
      const date = new Date(entry.date);
      const dayOfWeek = date.getDay();
      const rate = paymentRules.getRateForDay(dayOfWeek);
      const bonuses = paymentRules.getApplicableBonuses(dayOfWeek);
      
      return new DailyEntry({
        analysisId: '', // Will be set later
        date,
        consignments: entry.consignments,
        rate: rate.amount,
        paidAmount: entry.paid,
        pickups: entry.pickups || 0,
        unloadingBonus: entry.hasUnloadingBonus ? bonuses.unloading.amount : 0,
        attendanceBonus: entry.hasAttendanceBonus ? bonuses.attendance.amount : 0,
        earlyBonus: entry.hasEarlyBonus ? bonuses.early.amount : 0,
      });
    });
  }

  /**
   * Convert processed PDF data to daily entries
   */
  private convertToDailyEntries(data: ParsedPDFDataTypes, paymentRules: PaymentRules): DailyEntry[] {
    const entries: DailyEntry[] = [];

    // Handle runsheet data
    if (data.type === 'runsheet' && data.consignmentsByDate) {
      const consignmentData = data.consignmentsByDate;
      const runsheetEntries = this.processRunsheetData(consignmentData, paymentRules);
      entries.push(...runsheetEntries);
    }

    // Handle invoice data
    if (data.type === 'invoice' && Array.isArray(data.entries)) {
      this.processInvoiceData(data.entries, entries, paymentRules);
    }

    return entries;
  }

  /**
   * Process runsheet data and create daily entries
   */
  private processRunsheetData(consignments: Map<string, number> | Record<string, number>, paymentRules: PaymentRules): DailyEntry[] {
    const entries: DailyEntry[] = [];

    const consignmentEntries = consignments instanceof Map ? Array.from(consignments.entries()) : Object.entries(consignments);

    for (const [dateStr, count] of consignmentEntries) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;

      const entry = this.createDailyEntryFromRunsheet(date, count, paymentRules);
      entries.push(entry);
    }

    return entries;
  }

  /**
   * Create daily entry from runsheet data
   */
  private createDailyEntryFromRunsheet(date: Date, count: number, paymentRules: PaymentRules): DailyEntry {
    const dayOfWeek = date.getDay();
    const rate = paymentRules.getRateForDay(dayOfWeek);
    const bonuses = paymentRules.getApplicableBonuses(dayOfWeek);

    return new DailyEntry({
      analysisId: '', // Will be set later
      date,
      consignments: count,
      rate: rate.amount,
      paidAmount: 0, // Will be calculated
      pickups: 0,
      unloadingBonus: bonuses.unloading.amount,
      attendanceBonus: bonuses.attendance.amount,
      earlyBonus: bonuses.early.amount,
    });
  }

  /**
   * Process invoice data and update/create daily entries
   */
  private processInvoiceData(payments: InvoiceEntry[], entries: DailyEntry[], paymentRules: PaymentRules): void {
    for (const payment of payments) {
      if (!payment.date || !payment.amount) {
        console.warn('Invalid payment object found:', payment);
        continue;
      }
      const date = new Date(payment.date);
      if (isNaN(date.getTime())) continue;

      const existingEntry = entries.find(e =>
        e.date.toDateString() === date.toDateString()
      );

      if (existingEntry) {
        this.updateEntryWithPayment(entries, existingEntry, payment, paymentRules);
      } else {
        const newEntry = this.createDailyEntryFromInvoice(date, payment.amount, paymentRules);
        entries.push(newEntry);
      }
    }
  }

  /**
   * Update existing entry with payment information
   */
  private updateEntryWithPayment(entries: DailyEntry[], existingEntry: DailyEntry, payment: InvoiceEntry, paymentRules: PaymentRules): void {
    const index = entries.indexOf(existingEntry);
    const currentPaid = existingEntry.paidAmount;
    const dayOfWeek = existingEntry.date.getDay();
    const rate = paymentRules.getRateForDay(dayOfWeek);

    // Default strategy: add payment amounts
    const newPaidAmount = currentPaid.amount + payment.amount;

    entries[index] = new DailyEntry({
      analysisId: '', // Will be set later
      date: existingEntry.date,
      consignments: existingEntry.consignments.count,
      rate: rate.amount,
      paidAmount: newPaidAmount,
      pickups: existingEntry.pickups?.count || 0,
      unloadingBonus: existingEntry.unloadingBonus.amount,
      attendanceBonus: existingEntry.attendanceBonus.amount,
      earlyBonus: existingEntry.earlyBonus.amount,
    });
  }

  /**
   * Create daily entry from invoice data
   */
  private createDailyEntryFromInvoice(date: Date, amount: number, paymentRules: PaymentRules): DailyEntry {
    const dayOfWeek = date.getDay();
    const rate = paymentRules.getRateForDay(dayOfWeek);

    return new DailyEntry({
      analysisId: '', // Will be set later
      date,
      consignments: 0,
      rate: rate.amount,
      paidAmount: amount,
      pickups: 0,
      unloadingBonus: 0,
      attendanceBonus: 0,
      earlyBonus: 0,
    });
  }

  /**
   * Save analysis to database
   */
  private async saveAnalysisToDatabase(analysis: Analysis, fileRecords: FileRecord[]): Promise<string> {
    // Get analysis data
    const analysisData = analysis.toJSON();
    const periodStart = analysis.period.start;
    const periodEnd = analysis.period.end;

    // Create analysis record
    const { data: analysisRecord, error: createError } = await analysisRepository.createAnalysis({
      userId: analysis.userId,
      fingerprint: analysis.fingerprint,
      source: (analysisData.metadata?.source as AnalysisSource) || 'upload',
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      rulesVersion: 1, // Will be enhanced with versioning
      workingDays: analysis.workingDaysCount,
      totalConsignments: analysis.totalConsignments.count,
      metadata: analysisData.metadata,
    });

    if (createError || !analysisRecord) {
      throw new Error(createError?.message || 'Failed to create analysis record');
    }

    const analysisId = analysisRecord.id;

    // Create daily entries
    const dailyEntries = analysis.dailyEntries.map(entry => ({
      date: entry.date.toISOString().split('T')[0],
      day_of_week: entry.date.getDay(),
      consignments: entry.consignments.count,
      rate: entry.rate.amount,
      base_payment: entry.basePayment.amount,
      pickups: entry.pickups.count,
      pickup_total: entry.pickupTotal.amount,
      unloading_bonus: entry.unloadingBonus.amount,
      attendance_bonus: entry.attendanceBonus.amount,
      early_bonus: entry.earlyBonus.amount,
      expected_total: entry.expectedTotal.amount,
      paid_amount: entry.paidAmount.amount,
      difference: entry.difference.amount,
      status: entry.status,
    }));

    const { error: entriesError } = await analysisRepository.createDailyEntries(analysisId, dailyEntries);
    if (entriesError) {
      throw new Error(entriesError?.message || 'Failed to save daily entries');
    }

    // Create analysis totals
    const { error: totalsError } = await analysisRepository.createAnalysisTotals(analysisId, {
      base_total: analysis.baseTotal.amount,
      pickup_total: analysis.pickupTotal.amount,
      bonus_total: analysis.bonusTotal.amount,
      expected_total: analysis.expectedTotal.amount,
      paid_total: analysis.paidTotal.amount,
      difference_total: analysis.differenceTotal.amount,
    });
    if (totalsError) {
      throw new Error(totalsError);
    }

    // Create file records if any
    if (fileRecords.length > 0) {
      const { error: filesError } = await analysisRepository.createAnalysisFiles(analysisId, fileRecords);
      if (filesError) {
        throw new Error(filesError);
      }
    }

    // Update status to completed
    await analysisRepository.updateAnalysisStatus(analysisId, 'completed');

    return analysisId;
  }

  /**
   * Get analysis by ID
   */
  async getAnalysisById(analysisId: string): Promise<{ analysis: Analysis | null; error?: string }> {
    try {
      const { data: analysisData, error } = await analysisRepository.getAnalysisById(analysisId);
      
      if (error) {
        return { analysis: null, error };
      }

      if (!analysisData) {
        return { analysis: null, error: 'Analysis not found' };
      }

      // Convert database records back to domain entities
      const analysis = this.convertDatabaseToAnalysis();
      
      return { analysis };
    } catch (error) {
      return {
        analysis: null,
        error: error instanceof Error ? error.message : 'Failed to fetch analysis',
      };
    }
  }

  /**
   * Get user analyses with pagination
   */
  async getUserAnalyses(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      search?: string;
      status?: string;
    }
  ) {
    return analysisRepository.getUserAnalyses(userId, options);
  }

  /**
   * Get dashboard analytics
   */
  async getAnalyticsData(userId: string) {
    return analysisRepository.getAnalyticsData(userId);
  }

  /**
   * Delete analysis
   */
  async deleteAnalysis(analysisId: string) {
    return analysisRepository.deleteAnalysis(analysisId);
  }

  /**
   * Update analysis status
   */
  async updateAnalysisStatus(
    analysisId: string, 
    status: 'pending' | 'processing' | 'completed' | 'error'
  ): Promise<{ success: boolean; error?: string; analysis?: { id: string; status: string } }> {
    try {
      const result = await analysisRepository.updateAnalysisStatus(analysisId, status);
      
      if (!result.isSuccess) {
        return {
          success: false,
          error: result.error.message,
        };
      }

      return {
        success: true,
        analysis: {
          id: analysisId,
          status,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update analysis status',
      };
    }
  }

  /**
   * Utility methods
   */
  private async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private detectFileType(filename: string): FileType {
    const lower = filename.toLowerCase();
    if (lower.includes('runsheet') || lower.includes('dv_')) {
      return 'runsheet';
    } else if (lower.includes('invoice') || lower.includes('bill')) {
      return 'invoice';
    }
    return 'other';
  }

  private convertDatabaseToAnalysis(): Analysis {
    // Convert database records back to Analysis entity
    // This would involve reconstructing DailyEntry objects and PaymentRules
    // Implementation would be similar to Analysis.fromJSON()

    // For now, return a placeholder - this would be fully implemented
    // based on the specific Analysis entity structure
    throw new Error('convertDatabaseToAnalysis not fully implemented yet');
  }

  /**
   * Type guard to check if an object is a valid payment object
   */
  private isValidPaymentObject(obj: unknown): obj is PaymentObject {
    if (!obj || typeof obj !== 'object') return false;

    const typedObj = obj as Record<string, unknown>;
    return (typeof typedObj.date === 'string' || typeof typedObj.date === 'number' || typedObj.date instanceof Date) &&
           (typeof typedObj.amount === 'number' || !isNaN(Number(typedObj.amount)));
  }

  /**
   * Safely extract a number value from unknown type
   */
  private getNumberValue(value: unknown): number {
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}

// Export singleton instance
export const analysisService = new AnalysisService();