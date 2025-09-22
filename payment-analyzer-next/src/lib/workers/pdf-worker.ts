/**
 * PDF Processing Web Worker
 * Handles PDF parsing in a separate thread to avoid blocking the UI
 */

import { PDFProcessor, ProcessingResult, ProcessedFile } from '../infrastructure/pdf/pdf-processor';
import type { RunsheetData, InvoiceData } from '../infrastructure/pdf';
import type { PDFParseResult } from '../../types/core';

export interface PDFWorkerMessage {
  id: string;
  type: 'process-files';
  files: File[];
}

export interface PDFWorkerResponse {
  id: string;
  type: 'process-files-result' | 'process-files-error' | 'progress';
  result?: ProcessingResult;
  error?: string;
  progress?: {
    current: number;
    total: number;
    currentFile?: string;
  };
}

class PDFWorkerHandler {
  private processor = new PDFProcessor();

  async handleMessage(event: MessageEvent<PDFWorkerMessage>) {
    const { id, type, files } = event.data;

    try {
      switch (type) {
        case 'process-files':
          await this.processFiles(id, files);
          break;
        default:
          this.postError(id, `Unknown message type: ${type}`);
      }
    } catch (error) {
      this.postError(id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async processFiles(id: string, files: File[]) {
    try {
      // Send initial progress
      this.postProgress(id, 0, files.length, 'Starting processing...');

      // Process files with progress updates
      const result = await this.processFilesWithProgress(id, files);

      // Send final result
      self.postMessage({
        id,
        type: 'process-files-result',
        result,
      } as PDFWorkerResponse);
    } catch (error) {
      this.postError(id, error instanceof Error ? error.message : 'Processing failed');
    }
  }

  private async processFilesWithProgress(id: string, files: File[]): Promise<ProcessingResult> {
    const processedFiles = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Send progress update
      this.postProgress(id, i, files.length, `Processing ${file.name}...`);

      try {
        const processed = await this.processor.processFile(file);
        processedFiles.push(processed);
      } catch (error) {
        errors.push({
          file,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Send completion progress
    this.postProgress(id, files.length, files.length, 'Processing complete');

    // Categorize results (similar to PDFProcessor.processFiles)
    const runsheets = processedFiles.filter(file => file.type === 'runsheet');
    const invoices = processedFiles.filter(file => file.type === 'invoice');

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
      runsheets: runsheets as Array<ProcessedFile & { parseResult: PDFParseResult<RunsheetData> }>,
      invoices: invoices as Array<ProcessedFile & { parseResult: PDFParseResult<InvoiceData> }>,
      errors,
      summary,
    };
  }

  private postProgress(id: string, current: number, total: number, currentFile?: string) {
    self.postMessage({
      id,
      type: 'progress',
      progress: {
        current,
        total,
        currentFile,
      },
    } as PDFWorkerResponse);
  }

  private postError(id: string, error: string) {
    self.postMessage({
      id,
      type: 'process-files-error',
      error,
    } as PDFWorkerResponse);
  }
}

// Initialize worker handler
const handler = new PDFWorkerHandler();

// Listen for messages from main thread
self.addEventListener('message', (event: MessageEvent<PDFWorkerMessage>) => {
  handler.handleMessage(event);
});