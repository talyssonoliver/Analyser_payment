/**
 * PDF Processing Web Worker
 * Handles PDF parsing in a separate thread to avoid blocking the UI
 */

// Declare Web Worker globals
declare function importScripts(...urls: string[]): void;

// Load PDF.js in the Web Worker context
// This must be done before importing any modules that use PDF.js
if (typeof self !== "undefined" && typeof importScripts === "function") {
  try {
    console.log("🔄 Web Worker: Loading PDF.js from CDN...");
    importScripts("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");

    // Verify PDF.js loaded successfully
    const workerSelf = self as unknown as WorkerGlobalScope;
    if (typeof self !== "undefined" && workerSelf.pdfjsLib) {
      console.log("✅ Web Worker: PDF.js loaded successfully");

      // Configure PDF.js worker
      workerSelf.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

      console.log("✅ Web Worker: PDF.js worker configured");
    } else {
      console.error("❌ Web Worker: PDF.js loaded but pdfjsLib not available on self");
    }
  } catch (error) {
    console.error("❌ Web Worker: Failed to load PDF.js:", error);
    console.error('   This will cause "window is not defined" errors');
  }
} else {
  console.warn("⚠️ Web Worker: importScripts not available - may not be in worker context");
}

import type { PDFParseResult } from "../../types/core";
import type { InvoiceData, RunsheetData } from "../infrastructure/pdf";
import {
  PDFProcessor,
  type ProcessedFile,
  type ProcessingResult,
} from "../infrastructure/pdf/pdf-processor";

export interface PDFWorkerMessage {
  id: string;
  type: "process-files";
  files: File[];
}

export interface PDFWorkerResponse {
  id: string;
  type: "process-files-result" | "process-files-error" | "progress";
  result?: ProcessingResult;
  error?: string;
  progress?: {
    current: number;
    total: number;
    currentFile?: string;
  };
}

class PDFWorkerHandler {
  private readonly processor = new PDFProcessor();

  async handleMessage(event: MessageEvent<PDFWorkerMessage>) {
    // Validate message structure for security
    if (!event.data || typeof event.data !== "object") {
      console.error("Invalid message received: no data");
      return;
    }

    const { id, type, files } = event.data;

    // Validate required fields
    if (!id || typeof id !== "string") {
      console.error("Invalid message received: missing or invalid id");
      return;
    }

    if (!type || typeof type !== "string") {
      this.postError(id, "Invalid message: missing type");
      return;
    }

    try {
      if (type === "process-files") {
        await this.processFiles(id, files);
      } else {
        this.postError(id, `Unknown message type: ${type}`);
      }
    } catch (error) {
      this.postError(id, error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async processFiles(id: string, files: File[]) {
    try {
      // Send initial progress
      this.postProgress(id, 0, files.length, "Starting processing...");

      // Process files with progress updates
      const result = await this.processFilesWithProgress(id, files);

      // Send final result
      self.postMessage({
        id,
        type: "process-files-result",
        result,
      } as PDFWorkerResponse);
    } catch (error) {
      this.postError(id, error instanceof Error ? error.message : "Processing failed");
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
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Send completion progress
    this.postProgress(id, files.length, files.length, "Processing complete");

    // Categorize results (similar to PDFProcessor.processFiles)
    const runsheets = processedFiles.filter((file) => file.type === "runsheet");
    const invoices = processedFiles.filter((file) => file.type === "invoice");

    const summary = {
      totalFiles: files.length,
      successfulFiles: processedFiles.filter((f) => f.parseResult.success).length,
      failedFiles: processedFiles.filter((f) => !f.parseResult.success).length + errors.length,
      runsheetCount: runsheets.length,
      invoiceCount: invoices.length,
      unknownCount: processedFiles.filter((f) => f.type === "unknown").length,
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
      type: "progress",
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
      type: "process-files-error",
      error,
    } as PDFWorkerResponse);
  }
}

// Initialize worker handler
const handler = new PDFWorkerHandler();

// Listen for messages from main thread
self.addEventListener("message", (event: MessageEvent<PDFWorkerMessage>) => {
  // Security: Verify origin - Web Workers run in same-origin context
  // Check if origin is available (it exists in Worker context) and validate it
  if (typeof self.origin !== "undefined" && event.origin && event.origin !== self.origin) {
    console.error("PDF Worker: Rejected message from unauthorized origin:", event.origin);
    return;
  }

  // Validate message structure using optional chaining
  if (!event?.data) {
    console.error("PDF Worker: Invalid event received - no data");
    return;
  }

  // Additional security: verify message has expected structure
  if (typeof event.data !== "object" || !("type" in event.data)) {
    console.error("PDF Worker: Invalid message structure - missing type field");
    return;
  }

  // Verify message type is from expected set
  const allowedTypes = ["process-files"];
  if (!allowedTypes.includes(event.data.type)) {
    console.error(`PDF Worker: Invalid message type: ${event.data.type}`);
    return;
  }

  // All validations passed, delegate to handler
  handler.handleMessage(event);
});
