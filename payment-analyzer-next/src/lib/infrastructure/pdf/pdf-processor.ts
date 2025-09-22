/**
 * PDF Processor
 * Orchestrates PDF parsing using the appropriate parser based on file content
 */

import { RunsheetParser, RunsheetData } from './runsheet-parser';
import { InvoiceParser, InvoiceData } from './invoice-parser';
import type { PDFParseResult } from '../../../types/core';
import { generateUUID } from '@/lib/utils';
import { fileValidationService, FileMetadata } from '@/lib/domain/services/file-validation-service';
import type { PDFTextContentItem, StringKeyObject } from '@/types/core';

export interface ProcessedFile {
  id: string;
  file: File;
  type: 'runsheet' | 'invoice' | 'unknown';
  parseResult: PDFParseResult<RunsheetData | InvoiceData>;
  hash: string;
  transformedData?: StringKeyObject; // Optional transformed data for service compatibility
}

export interface ProcessingResult {
  files: ProcessedFile[];
  runsheets: Array<ProcessedFile & { parseResult: PDFParseResult<RunsheetData> }>;
  invoices: Array<ProcessedFile & { parseResult: PDFParseResult<InvoiceData> }>;
  errors: Array<{
    file: File;
    error: string;
  }>;
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    runsheetCount: number;
    invoiceCount: number;
    unknownCount: number;
  };
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    isUpdated?: boolean;
    existingAnalysis?: string;
  };
  fileMetadata?: FileMetadata[];
}

export class PDFProcessor {
  private runsheetParser = new RunsheetParser();
  private invoiceParser = new InvoiceParser();

  /**
   * Process multiple PDF files
   */
  async processFiles(files: File[]): Promise<ProcessingResult> {
    // Run comprehensive file validation first
    const validation = await fileValidationService.validateFiles(files, {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['application/pdf'],
      checkForUpdates: true,
      checkForDuplicates: true,
    });

    // Extract file metadata for storage
    const fileMetadata: FileMetadata[] = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    }));

    // Check for existing analysis
    const existingAnalysisId = fileValidationService.findExistingAnalysis(files);
    if (existingAnalysisId) {
      validation.existingAnalysis = existingAnalysisId;
      validation.warnings.push(`Files match existing analysis: ${existingAnalysisId}`);
    }

    const processedFiles: ProcessedFile[] = [];
    const errors: ProcessingResult['errors'] = [];

    // Only process if validation passes or user wants to continue with warnings
    if (validation.isValid || validation.errors.length === 0) {
      // Process each file
      for (const file of files) {
        try {
          const processed = await this.processFile(file);
          processedFiles.push(processed);
        } catch (error) {
          errors.push({
            file,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } else {
      // Add validation errors to processing errors
      validation.errors.forEach(error => {
        errors.push({
          file: files[0], // Associate with first file for simplicity
          error,
        });
      });
    }

    // Categorize files
    const runsheets = processedFiles.filter(
      (file): file is ProcessedFile & { parseResult: PDFParseResult<RunsheetData> } =>
        file.type === 'runsheet'
    );

    const invoices = processedFiles.filter(
      (file): file is ProcessedFile & { parseResult: PDFParseResult<InvoiceData> } =>
        file.type === 'invoice'
    );

    const summary = {
      totalFiles: files.length,
      successfulFiles: processedFiles.filter(f => f.parseResult.success).length,
      failedFiles: processedFiles.filter(f => !f.parseResult.success).length + errors.length,
      runsheetCount: runsheets.length,
      invoiceCount: invoices.length,
      unknownCount: processedFiles.filter(f => f.type === 'unknown').length,
    };

    return {
      files: processedFiles,
      runsheets,
      invoices,
      errors,
      summary,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        isUpdated: validation.isUpdated,
        existingAnalysis: validation.existingAnalysis,
      },
      fileMetadata,
    };
  }

  /**
   * Process a single PDF file
   */
  async processFile(file: File): Promise<ProcessedFile> {
    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new Error(`Invalid file type: ${file.type}. Only PDF files are supported.`);
    }

    // Generate file ID and hash
    const id = generateUUID();
    const hash = await this.generateFileHash(file);

    // Get a preview of the file content for parser selection
    const preview = await this.getFileContentPreview(file);

    // Determine file type and select parser
    const fileType = this.determineFileType(file.name, preview);

    let parseResult: PDFParseResult<RunsheetData | InvoiceData>;

    switch (fileType) {
      case 'runsheet':
        parseResult = await this.runsheetParser.parse(file);
        break;
      case 'invoice':
        parseResult = await this.invoiceParser.parse(file);
        break;
      default:
        // Try both parsers to see which one works better
        const runsheetResult = await this.runsheetParser.parse(file);
        const invoiceResult = await this.invoiceParser.parse(file);

        if (runsheetResult.success && !invoiceResult.success) {
          parseResult = runsheetResult;
        } else if (invoiceResult.success && !runsheetResult.success) {
          parseResult = invoiceResult;
        } else if (runsheetResult.success && invoiceResult.success) {
          // Both succeeded, choose based on content quality
          parseResult = this.chooseBetterResult(runsheetResult, invoiceResult);
        } else {
          // Both failed, return the runsheet result as default
          parseResult = runsheetResult;
        }
        break;
    }

    // Generate transformed data for service compatibility if parsing was successful
    let transformedData: StringKeyObject | undefined;
    if (parseResult.success && parseResult.data) {
      if (this.isRunsheetData(parseResult.data)) {
        transformedData = this.transformRunsheetData(parseResult.data);
      } else if (this.isInvoiceData(parseResult.data)) {
        transformedData = this.transformInvoiceData(parseResult.data);
      }
    }

    return {
      id,
      file,
      type: fileType,
      parseResult,
      hash,
      transformedData,
    };
  }

  /**
   * Determine file type based on name and content
   */
  private determineFileType(fileName: string, content: string): 'runsheet' | 'invoice' | 'unknown' {
    // Check for runsheet indicators
    if (this.runsheetParser.canParse(fileName, content)) {
      return 'runsheet';
    }

    // Check for invoice indicators
    if (this.invoiceParser.canParse(fileName, content)) {
      return 'invoice';
    }

    return 'unknown';
  }

  /**
   * Get a preview of file content for parser selection
   */
  private async getFileContentPreview(file: File): Promise<string> {
    try {
      // Check if PDF.js is available
      if (typeof window !== 'undefined' && window.pdfjsLib) {
        // Parse first page to get content preview
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
        
        if (pdf.numPages > 0) {
          const page = await pdf.getPage(1);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: PDFTextContentItem) => item.str)
            .join(' ')
            .substring(0, 1000); // First 1000 characters for preview
          
          return pageText;
        }
      }
      
      // Fallback to filename-based detection
      return file.name;
    } catch (error) {
      console.warn('PDF content preview failed, falling back to filename:', error);
      return file.name;
    }
  }

  /**
   * Generate SHA-256 hash for file
   */
  private async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Choose the better result between two successful parses
   */
  private chooseBetterResult(
    runsheetResult: PDFParseResult<RunsheetData>,
    invoiceResult: PDFParseResult<InvoiceData>
  ): PDFParseResult<RunsheetData | InvoiceData> {
    // Simple heuristic: choose the one with more extracted data
    const runsheetDataPoints = runsheetResult.data?.totalConsignments || 0;
    const invoiceDataPoints = invoiceResult.data?.entries.length || 0;

    return runsheetDataPoints >= invoiceDataPoints ? runsheetResult : invoiceResult;
  }

  /**
   * Type guard to check if data is RunsheetData
   */
  private isRunsheetData(data: unknown): data is RunsheetData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'consignmentsByDate' in data &&
      'totalConsignments' in data &&
      'dates' in data &&
      'details' in data
    );
  }

  /**
   * Type guard to check if data is InvoiceData
   */
  private isInvoiceData(data: unknown): data is InvoiceData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'entries' in data &&
      'totalAmount' in data &&
      'isValid' in data &&
      'dates' in data
    );
  }

  /**
   * Validate file set - provides warnings but allows analysis with partial data (matching original system)
   */
  validateFileSet(result: ProcessingResult): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for file types - both runsheets and invoices are optional
    if (result.runsheets.length === 0 && result.invoices.length === 0 && result.summary.totalFiles > 0) {
      // Only error if files were uploaded but none could be parsed
      errors.push('No valid runsheet or invoice files could be processed. Please check your file formats.');
    }

    // Provide warnings for missing file types
    if (result.runsheets.length === 0) {
      warnings.push('No runsheet files found. Consignment counts will need to be entered manually.');
    }

    if (result.invoices.length === 0) {
      warnings.push('No invoice files found. Paid amounts will default to £0.00 for payment reconciliation.');
    }

    // Check for parsing failures
    const failedRunsheets = result.runsheets.filter(r => !r.parseResult.success);
    if (failedRunsheets.length > 0) {
      warnings.push(`${failedRunsheets.length} runsheet(s) failed to parse correctly.`);
    }

    const failedInvoices = result.invoices.filter(i => !i.parseResult.success);
    if (failedInvoices.length > 0) {
      warnings.push(`${failedInvoices.length} invoice(s) failed to parse correctly.`);
    }

    // Check for unknown file types
    if (result.summary.unknownCount > 0) {
      warnings.push(`${result.summary.unknownCount} file(s) could not be classified.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Transform runsheet data to match service expectations
   */
  transformRunsheetData(data: RunsheetData): StringKeyObject {
    // Convert Map to plain object for service compatibility
    const consignments: Record<string, number> = {};
    for (const [dateStr, count] of data.consignmentsByDate) {
      // Convert to YYYY-MM-DD format for consistency
      const date = new Date(dateStr);
      const isoDate = date.toISOString().split('T')[0];
      consignments[isoDate] = count;
    }

    return {
      type: 'runsheet',
      consignments,
      totalConsignments: data.totalConsignments,
      dates: data.dates,
      details: data.details,
    };
  }

  /**
   * Transform invoice data to match service expectations
   */
  transformInvoiceData(data: InvoiceData): StringKeyObject {
    // Convert entries to the format expected by service
    const payments = data.entries.map(entry => ({
      date: entry.date,
      time: entry.time,
      amount: entry.amount,
      serviceType: entry.serviceType,
      description: entry.description,
    }));

    return {
      type: 'invoice',
      payments,
      totalAmount: data.totalAmount,
      documentTotal: data.documentTotal,
      isValid: data.isValid,
      dates: data.dates,
      pickupServices: data.pickupServices,
      extraDrops: data.extraDrops,
      validationMessage: data.validationMessage,
    };
  }

  /**
   * Process runsheet from ArrayBuffer (for API routes)
   */
  async processRunsheet(arrayBuffer: ArrayBuffer, fileName: string): Promise<StringKeyObject> {
    // Create a File object from ArrayBuffer
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const file = new File([blob], fileName, { type: 'application/pdf' });
    
    // Use existing runsheet parser
    const parseResult = await this.runsheetParser.parse(file);
    
    if (parseResult.success && parseResult.data) {
      return this.transformRunsheetData(parseResult.data);
    } else {
      throw new Error(parseResult.error || 'Failed to process runsheet');
    }
  }

  /**
   * Process invoice from ArrayBuffer (for API routes)
   */
  async processInvoice(arrayBuffer: ArrayBuffer, fileName: string): Promise<StringKeyObject> {
    // Create a File object from ArrayBuffer
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const file = new File([blob], fileName, { type: 'application/pdf' });
    
    // Use existing invoice parser
    const parseResult = await this.invoiceParser.parse(file);
    
    if (parseResult.success && parseResult.data) {
      return this.transformInvoiceData(parseResult.data);
    } else {
      throw new Error(parseResult.error || 'Failed to process invoice');
    }
  }
}