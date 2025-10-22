/**
 * Quick Date Extractor Service
 *
 * Extracts date ranges from PDF files WITHOUT full processing.
 * Optimized for speed (<500ms per file) to enable fast file update detection.
 *
 * Phase 2.1: FileUpdateDialog Implementation
 *
 * @see docs/FILEUPDATEDIALOG_REQUIREMENTS.md (lines 145-171)
 */

import { logger } from "@/lib/utils/logger";

export interface DateRange {
  start: string; // DD/MM/YYYY format
  end: string; // DD/MM/YYYY format
}

export interface DateExtractionResult {
  dateRange: DateRange | null;
  fileName: string;
  extractionMethod: "filename" | "content" | "failed";
  processingTime: number; // milliseconds
}

export interface BatchExtractionResult {
  dateRange: DateRange | null;
  files: DateExtractionResult[];
  totalProcessingTime: number; // milliseconds
}

/**
 * Quick Date Extractor Service
 *
 * Performance targets:
 * - Single file: <500ms
 * - Batch processing: <2s for typical upload (2-4 files)
 * - Memory efficient: Reads only first 5 pages maximum
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional class-as-namespace for stable API surface
export class QuickDateExtractor {
  private static readonly MAX_PAGES_TO_SCAN = 5;
  private static readonly CACHE = new Map<string, DateRange>();

  /**
   * Extract date range from multiple files
   * Returns earliest start date and latest end date
   */
  static async extractDateRange(files: File[]): Promise<DateRange | null> {
    const startTime = performance.now();

    try {
      if (files.length === 0) {
        logger.warn("[QuickDateExtractor] No files provided");
        return null;
      }

      const results = await Promise.all(
        files.map((file) => QuickDateExtractor.extractDateRangeFromFile(file))
      );

      const validResults = results.filter((r) => r.dateRange !== null);

      if (validResults.length === 0) {
        logger.warn("[QuickDateExtractor] No valid dates extracted from any file");
        return null;
      }

      // Find earliest start and latest end
      const allDates = validResults
        .map((r) => r.dateRange)
        .filter((range): range is DateRange => range !== null)
        .flatMap((range) => [
          QuickDateExtractor.parseDateString(range.start),
          QuickDateExtractor.parseDateString(range.end),
        ])
        .filter((date) => date !== null) as Date[];

      if (allDates.length === 0) {
        return null;
      }

      const earliest = new Date(Math.min(...allDates.map((d) => d.getTime())));
      const latest = new Date(Math.max(...allDates.map((d) => d.getTime())));

      const dateRange = {
        start: QuickDateExtractor.formatDate(earliest),
        end: QuickDateExtractor.formatDate(latest),
      };

      const elapsed = performance.now() - startTime;
      logger.info(
        `[QuickDateExtractor] Extracted date range from ${files.length} file(s): ${dateRange.start} - ${dateRange.end} (${elapsed.toFixed(0)}ms)`
      );

      return dateRange;
    } catch (error) {
      const elapsed = performance.now() - startTime;
      logger.error("[QuickDateExtractor] Extraction failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        elapsed: `${elapsed.toFixed(0)}ms`,
      });
      return null;
    }
  }

  /**
   * Extract date range from a single file
   */
  static async extractDateRangeFromFile(file: File): Promise<DateExtractionResult> {
    const startTime = performance.now();

    try {
      // Generate cache key from file metadata
      const cacheKey = QuickDateExtractor.generateCacheKey(file);

      // Check cache first
      const cached = QuickDateExtractor.CACHE.get(cacheKey);
      if (cached) {
        const elapsed = performance.now() - startTime;
        logger.debug(`[QuickDateExtractor] Cache hit for ${file.name} (${elapsed.toFixed(0)}ms)`);
        return {
          dateRange: cached,
          fileName: file.name,
          extractionMethod: "filename",
          processingTime: elapsed,
        };
      }

      // Strategy 1: Try filename pattern (fastest)
      const filenameDate = QuickDateExtractor.extractFromFilename(file.name);
      if (filenameDate) {
        QuickDateExtractor.CACHE.set(cacheKey, filenameDate);
        const elapsed = performance.now() - startTime;
        logger.debug(
          `[QuickDateExtractor] Extracted from filename: ${file.name} -> ${filenameDate.start} - ${filenameDate.end} (${elapsed.toFixed(0)}ms)`
        );
        return {
          dateRange: filenameDate,
          fileName: file.name,
          extractionMethod: "filename",
          processingTime: elapsed,
        };
      }

      // Strategy 2: Quick scan PDF content (slower but more reliable)
      const contentDate = await QuickDateExtractor.extractFromContent(file);
      if (contentDate) {
        QuickDateExtractor.CACHE.set(cacheKey, contentDate);
        const elapsed = performance.now() - startTime;
        logger.debug(
          `[QuickDateExtractor] Extracted from content: ${file.name} -> ${contentDate.start} - ${contentDate.end} (${elapsed.toFixed(0)}ms)`
        );
        return {
          dateRange: contentDate,
          fileName: file.name,
          extractionMethod: "content",
          processingTime: elapsed,
        };
      }

      // Failed to extract
      const elapsed = performance.now() - startTime;
      logger.warn(
        `[QuickDateExtractor] Failed to extract dates from ${file.name} (${elapsed.toFixed(0)}ms)`
      );
      return {
        dateRange: null,
        fileName: file.name,
        extractionMethod: "failed",
        processingTime: elapsed,
      };
    } catch (error) {
      const elapsed = performance.now() - startTime;
      logger.error(`[QuickDateExtractor] Error processing ${file.name}`, {
        error: error instanceof Error ? error.message : "Unknown error",
        elapsed: `${elapsed.toFixed(0)}ms`,
      });
      return {
        dateRange: null,
        fileName: file.name,
        extractionMethod: "failed",
        processingTime: elapsed,
      };
    }
  }

  /**
   * Extract date from filename patterns
   *
   * Supported patterns:
   * - runsheetDV_YYYY-MM-DD.pdf
   * - SELF BILL_YYYYMMDD.pdf
   * - invoice_DD-MM-YYYY.pdf
   */
  private static extractFromFilename(fileName: string): DateRange | null {
    // Helper to validate and create date range
    const createDateRange = (y: number, m: number, d: number): DateRange | null => {
      // Validate ranges
      if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
        return null;
      }

      const date = new Date(Date.UTC(y, m - 1, d));

      // Verify the date is valid (e.g., not Feb 31, handles invalid month/day combos)
      if (date.getUTCDate() !== d || date.getUTCMonth() !== m - 1 || date.getUTCFullYear() !== y) {
        return null;
      }

      // Verify date is within reasonable range (last 2 years to next year)
      const now = new Date();
      const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1);
      const nextYear = new Date(now.getFullYear() + 1, 11, 31);
      if (date < twoYearsAgo || date > nextYear) {
        return null;
      }

      const weekStart = QuickDateExtractor.getWeekStart(date);
      const weekEnd = QuickDateExtractor.getWeekEnd(weekStart);

      return {
        start: QuickDateExtractor.formatDate(weekStart),
        end: QuickDateExtractor.formatDate(weekEnd),
      };
    };

    // Pattern 1: runsheetDV_YYYY-MM-DD.pdf (most common runsheet format)
    const runsheetPattern = /runsheet.*?(\d{4})[-_](\d{2})[-_](\d{2})/i;
    const runsheetMatch = fileName.match(runsheetPattern);
    if (runsheetMatch) {
      const [, year, month, day] = runsheetMatch;
      const result = createDateRange(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10));
      if (result) return result;
    }

    // Pattern 2: YYYY-MM-DD or YYYYMMDD anywhere in filename
    const isoPattern = /(\d{4})[-_]?(\d{2})[-_]?(\d{2})/;
    const isoMatch = fileName.match(isoPattern);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const result = createDateRange(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10));
      if (result) return result;
    }

    // Pattern 3: DD-MM-YYYY or DD_MM_YYYY
    const ddmmyyyyPattern = /(\d{2})[-_](\d{2})[-_](\d{4})/;
    const ddmmyyyyMatch = fileName.match(ddmmyyyyPattern);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const result = createDateRange(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10));
      if (result) return result;
    }

    return null;
  }

  /**
   * Extract date from PDF content (quick scan)
   * Only reads first few pages for performance
   */
  private static async extractFromContent(file: File): Promise<DateRange | null> {
    try {
      // Check if PDF.js is available
      const pdfjsLib = QuickDateExtractor.getPDFJS();
      if (!pdfjsLib) {
        logger.warn("[QuickDateExtractor] PDF.js not available, skipping content extraction");
        return null;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

      const pagesToScan = Math.min(QuickDateExtractor.MAX_PAGES_TO_SCAN, pdf.numPages);
      const dates: Date[] = [];

      // Scan first few pages
      for (let i = 1; i <= pagesToScan; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => {
            // PDF.js text items can be TextItem or TextMarkedContent; only TextItem has `str`
            const maybe = item as unknown as { str?: string };
            return typeof maybe.str === "string" ? maybe.str : "";
          })
          .join(" ");

        const pageDates = QuickDateExtractor.extractDatesFromText(pageText);
        dates.push(...pageDates);

        // Early exit if we found dates
        if (dates.length > 0 && i >= 2) {
          break;
        }
      }

      if (dates.length === 0) {
        return null;
      }

      // Find earliest and latest dates
      const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
      const latest = new Date(Math.max(...dates.map((d) => d.getTime())));

      return {
        start: QuickDateExtractor.formatDate(earliest),
        end: QuickDateExtractor.formatDate(latest),
      };
    } catch (error) {
      logger.error("[QuickDateExtractor] Content extraction failed", {
        fileName: file.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Extract dates from text using regex patterns
   */
  private static extractDatesFromText(text: string): Date[] {
    const dates: Date[] = [];

    // Pattern 1: DD/MM/YYYY or DD/MM/YY
    const ddmmyyyyPattern = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g;
    let match = ddmmyyyyPattern.exec(text);
    while (match !== null) {
      const date = QuickDateExtractor.parseDDMMYYYY(match[1], match[2], match[3]);
      if (date) dates.push(date);
      match = ddmmyyyyPattern.exec(text);
    }

    // Pattern 2: Date: DD/MM/YYYY (runsheet format)
    const dateColonPattern = /Date:\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/gi;
    match = dateColonPattern.exec(text);
    while (match !== null) {
      const date = QuickDateExtractor.parseDDMMYYYY(match[1], match[2], match[3]);
      if (date) dates.push(date);
      match = dateColonPattern.exec(text);
    }

    // Pattern 3: YYYY-MM-DD (ISO format)
    const isoPattern = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
    match = isoPattern.exec(text);
    while (match !== null) {
      const date = QuickDateExtractor.parseYYYYMMDD(match[1], match[2], match[3]);
      if (date) dates.push(date);
      match = isoPattern.exec(text);
    }

    // Remove duplicates and filter reasonable dates (last 2 years to next year)
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1);
    const nextYear = new Date(now.getFullYear() + 1, 11, 31);

    return Array.from(new Set(dates.map((d) => d.getTime())))
      .map((time) => new Date(time))
      .filter((date) => date >= twoYearsAgo && date <= nextYear)
      .sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Parse DD/MM/YYYY or DD/MM/YY format
   */
  private static parseDDMMYYYY(day: string, month: string, year: string): Date | null {
    try {
      const d = parseInt(day, 10);
      const m = parseInt(month, 10);
      let y = parseInt(year, 10);

      // Handle 2-digit year
      if (y < 100) {
        y += y <= 30 ? 2000 : 1900;
      }

      // Validate ranges
      if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) {
        return null;
      }

      const date = new Date(Date.UTC(y, m - 1, d));

      // Verify the date is valid (e.g., not Feb 31)
      if (date.getUTCDate() !== d || date.getUTCMonth() !== m - 1 || date.getUTCFullYear() !== y) {
        return null;
      }

      return date;
    } catch {
      return null;
    }
  }

  /**
   * Parse YYYY-MM-DD format
   */
  private static parseYYYYMMDD(year: string, month: string, day: string): Date | null {
    try {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      const d = parseInt(day, 10);

      // Validate ranges
      if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) {
        return null;
      }

      const date = new Date(Date.UTC(y, m - 1, d));

      // Verify the date is valid
      if (date.getUTCDate() !== d || date.getUTCMonth() !== m - 1 || date.getUTCFullYear() !== y) {
        return null;
      }

      return date;
    } catch {
      return null;
    }
  }

  /**
   * Parse DD/MM/YYYY string to Date
   */
  private static parseDateString(dateStr: string): Date | null {
    try {
      const parts = dateStr.split("/");
      if (parts.length !== 3) return null;

      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);

      return new Date(Date.UTC(year, month, day));
    } catch {
      return null;
    }
  }

  /**
   * Format Date as DD/MM/YYYY
   */
  private static formatDate(date: Date): string {
    const day = date.getUTCDate().toString().padStart(2, "0");
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Get Monday of the week containing the given date (ISO week)
   */
  private static getWeekStart(date: Date): Date {
    const dayOfWeek = date.getUTCDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so go back 6 days
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + diff);
    return monday;
  }

  /**
   * Get Sunday of the week containing the given date
   */
  private static getWeekEnd(weekStart: Date): Date {
    const sunday = new Date(weekStart);
    sunday.setUTCDate(weekStart.getUTCDate() + 6);
    return sunday;
  }

  /**
   * Check if two date ranges overlap
   */
  static dateRangesOverlap(
    range1: { start: string; end: string },
    range2: { start: string; end: string }
  ): boolean {
    const start1 = QuickDateExtractor.parseDateString(range1.start);
    const end1 = QuickDateExtractor.parseDateString(range1.end);
    const start2 = QuickDateExtractor.parseDateString(range2.start);
    const end2 = QuickDateExtractor.parseDateString(range2.end);

    if (!start1 || !end1 || !start2 || !end2) {
      return false;
    }

    // Check if ranges overlap
    // Range 1: [start1, end1]
    // Range 2: [start2, end2]
    // Overlap if: start1 <= end2 AND start2 <= end1
    return start1 <= end2 && start2 <= end1;
  }

  /**
   * Generate cache key from file metadata
   */
  private static generateCacheKey(file: File): string {
    return `${file.name}|${file.size}|${file.lastModified}`;
  }

  /**
   * Get PDF.js instance (supports both main thread and worker contexts)
   */
  private static getPDFJS(): typeof import("pdfjs-dist") | null {
    // Access global scope safely and cast through unknown to satisfy TS
    const g = (typeof globalThis !== "undefined" ? (globalThis as unknown) : undefined) as
      | { pdfjsLib?: unknown }
      | undefined;
    if (g?.pdfjsLib) {
      return g.pdfjsLib as typeof import("pdfjs-dist");
    }
    return null;
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  static clearCache(): void {
    QuickDateExtractor.CACHE.clear();
    logger.debug("[QuickDateExtractor] Cache cleared");
  }

  /**
   * Get cache size
   */
  static getCacheSize(): number {
    return QuickDateExtractor.CACHE.size;
  }
}
