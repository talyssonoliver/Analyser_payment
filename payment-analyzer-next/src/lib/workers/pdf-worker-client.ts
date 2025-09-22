/**
 * PDF Worker Client
 * Provides a clean interface for using the PDF processing worker
 */

import type { ProcessingResult } from '../infrastructure/pdf/pdf-processor';
import type { PDFWorkerMessage, PDFWorkerResponse } from './pdf-worker';

export interface ProcessingProgress {
  current: number;
  total: number;
  percentage: number;
  currentFile?: string;
}

export class PDFWorkerClient {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingRequests = new Map<string, {
    resolve: (result: ProcessingResult) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: ProcessingProgress) => void;
  }>();

  /**
   * Initialize the worker
   */
  async init() {
    if (this.worker) {
      return; // Already initialized
    }

    // Create worker from the worker file
    // Use dynamic import for Next.js compatibility
    this.worker = new Worker(
      new URL('./pdf-worker.js', import.meta.url),
      { type: 'module' }
    );

    // Listen for worker messages
    this.worker.onmessage = (event: MessageEvent<PDFWorkerResponse>) => {
      this.handleWorkerMessage(event.data);
    };

    // Handle worker errors
    this.worker.onerror = (error) => {
      console.error('PDF Worker error:', error);
      // Reject all pending requests
      this.pendingRequests.forEach(({ reject }) => {
        reject(new Error('Worker error occurred'));
      });
      this.pendingRequests.clear();
    };
  }

  /**
   * Process PDF files
   */
  async processFiles(
    files: File[],
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {
    await this.init();

    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const id = (++this.messageId).toString();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, onProgress });

      // Send message to worker
      const message: PDFWorkerMessage = {
        id,
        type: 'process-files',
        files,
      };

      this.worker!.postMessage(message);
    });
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending requests
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Worker terminated'));
    });
    this.pendingRequests.clear();
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(response: PDFWorkerResponse) {
    const { id, type } = response;
    const request = this.pendingRequests.get(id);

    if (!request) {
      console.warn('Received response for unknown request:', id);
      return;
    }

    switch (type) {
      case 'process-files-result':
        if (response.result) {
          request.resolve(response.result);
        } else {
          request.reject(new Error('No result received'));
        }
        this.pendingRequests.delete(id);
        break;

      case 'process-files-error':
        request.reject(new Error(response.error || 'Processing failed'));
        this.pendingRequests.delete(id);
        break;

      case 'progress':
        if (request.onProgress && response.progress) {
          const { current, total, currentFile } = response.progress;
          request.onProgress({
            current,
            total,
            percentage: total > 0 ? Math.round((current / total) * 100) : 0,
            currentFile,
          });
        }
        break;

      default:
        console.warn('Unknown response type:', type);
    }
  }

  /**
   * Check if worker is available
   */
  isAvailable(): boolean {
    return typeof Worker !== 'undefined';
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PDFWorkerClient {
    if (!PDFWorkerClient.instance) {
      PDFWorkerClient.instance = new PDFWorkerClient();
    }
    return PDFWorkerClient.instance;
  }

  private static instance: PDFWorkerClient | null = null;
}

// Export singleton instance
export const pdfWorkerClient = PDFWorkerClient.getInstance();