/**
 * Runsheet PDF Parser
 * Extracts consignment counts from delivery runsheets
 * Based on the original system's parsing logic
 */

import type { ParsedPDFData } from "../../../types/core";
import { PDFParserBase } from "./pdf-parser-base";

export interface RunsheetData {
  dates: Date[];
  consignmentsByDate: Map<string, number>; // date string -> consignment count
  totalConsignments: number;
  details: Array<{
    date: Date;
    consignments: number;
    consignmentNumbers: string[];
  }>;
}

export class RunsheetParser extends PDFParserBase<RunsheetData> {
  protected fileTypeIdentifiers = ["runsheet", "dv_"];

  protected async extractData(rawData: ParsedPDFData, filename?: string): Promise<RunsheetData> {
    const dates: Date[] = [];
    const consignmentsByDate = new Map<string, number>();
    const details: RunsheetData["details"] = [];

    // Determine if multi-date or single-date runsheet
    const isMultiDate = this.isMultiDateRunsheet(rawData);

    console.log("🔍 RUNSHEET DEBUG - Processing", rawData.pages.length, "pages");
    console.log("🔍 RUNSHEET DEBUG - Type:", isMultiDate ? "multi-date" : "single-date");

    if (isMultiDate) {
      this.processMultiDateRunsheet(rawData, filename, dates, consignmentsByDate, details);
    } else {
      this.processSingleDateRunsheet(rawData, filename, dates, consignmentsByDate, details);
    }

    return this.aggregateResults(dates, consignmentsByDate, details);
  }

  /**
   * Check if runsheet contains multiple dates (multi-date) or single date
   */
  private isMultiDateRunsheet(rawData: ParsedPDFData): boolean {
    const datesPerPage = rawData.pages.map((page) => this.extractDateFromPage(page.text));
    const uniqueDatesInPages = datesPerPage.filter(
      (d, i, self) => d && self.findIndex((d2) => d2 && d2.getTime() === d.getTime()) === i
    );

    console.log("🔍 RUNSHEET DEBUG - Unique dates found per page:", uniqueDatesInPages.length);
    return uniqueDatesInPages.length > 1;
  }

  /**
   * Process multi-date runsheet (different date per page)
   */
  private processMultiDateRunsheet(
    rawData: ParsedPDFData,
    filename: string | undefined,
    dates: Date[],
    consignmentsByDate: Map<string, number>,
    details: RunsheetData["details"]
  ): void {
    console.log("🔍 RUNSHEET DEBUG - Multi-date runsheet detected, processing per page");

    for (const page of rawData.pages) {
      const pageData = this.extractPageData(page.text);

      if (pageData.consignments.length > 0) {
        const dateToUse = pageData.date || this.extractDateFallback(filename);
        const dateKey = dateToUse.toISOString().split("T")[0];
        const consignmentCount = pageData.consignments.length;

        dates.push(dateToUse);
        consignmentsByDate.set(dateKey, consignmentCount);

        details.push({
          date: dateToUse,
          consignments: consignmentCount,
          consignmentNumbers: pageData.consignments,
        });
      }
    }
  }

  /**
   * Process single-date runsheet (same date across all pages)
   */
  private processSingleDateRunsheet(
    rawData: ParsedPDFData,
    filename: string | undefined,
    dates: Date[],
    consignmentsByDate: Map<string, number>,
    details: RunsheetData["details"]
  ): void {
    console.log("🔍 RUNSHEET DEBUG - Single-date runsheet detected, processing as full document");

    const fullText = rawData.pages.map((page) => page.text).join("\n");
    console.log("🔍 RUNSHEET DEBUG - Full text length:", fullText.length);

    // Extract date from the full document or filename
    const documentDate = this.extractDateFromPage(fullText) || this.extractDateFallback(filename);
    console.log("🔍 RUNSHEET DEBUG - Date extracted:", documentDate);

    // Extract ALL consignments from the full document
    const allConsignments = this.extractConsignmentsFromPage(fullText);
    console.log("🔍 RUNSHEET DEBUG - Total consignments found:", allConsignments.length);
    console.log("🔍 RUNSHEET DEBUG - First 5 consignments:", allConsignments.slice(0, 5));
    console.log("🔍 RUNSHEET DEBUG - Last 5 consignments:", allConsignments.slice(-5));

    // Store the data with the single date
    if (allConsignments.length > 0 && documentDate) {
      const dateKey = documentDate.toISOString().split("T")[0];

      dates.push(documentDate);
      consignmentsByDate.set(dateKey, allConsignments.length);

      details.push({
        date: documentDate,
        consignments: allConsignments.length,
        consignmentNumbers: allConsignments,
      });
    }
  }

  /**
   * Extract date from filename or return current date as fallback
   */
  private extractDateFallback(filename: string | undefined): Date {
    const filenameMatch = filename?.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
    if (filenameMatch) {
      const parts = filenameMatch[1].replace(/\//g, "-").split("-");
      const date = new Date(
        Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      );
      console.log("🔍 RUNSHEET DEBUG - Date extracted from filename:", date);
      return date;
    }

    console.log("🔍 RUNSHEET DEBUG - Using current date as fallback");
    return new Date();
  }

  /**
   * Aggregate and sort results
   */
  private aggregateResults(
    dates: Date[],
    consignmentsByDate: Map<string, number>,
    details: RunsheetData["details"]
  ): RunsheetData {
    // Remove duplicate dates and sort
    const uniqueDates = dates.filter(
      (date, index, self) => self.findIndex((d) => d.getTime() === date.getTime()) === index
    );
    uniqueDates.sort((a, b) => a.getTime() - b.getTime());

    const totalConsignments = Array.from(consignmentsByDate.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    const sortedDetails = details.toSorted((a, b) => a.date.getTime() - b.date.getTime());

    return {
      dates: uniqueDates,
      consignmentsByDate,
      totalConsignments,
      details: sortedDetails,
    };
  }

  protected async validateData(data: RunsheetData): Promise<{
    isValid: boolean;
    error?: string;
    warnings?: string[];
  }> {
    const warnings: string[] = [];

    // Check if any data was extracted
    if (data.dates.length === 0) {
      return {
        isValid: false,
        error: "No dates found in runsheet",
      };
    }

    if (data.totalConsignments === 0) {
      return {
        isValid: false,
        error: "No consignments found in runsheet",
      };
    }

    // Check for reasonable consignment counts
    for (const [dateStr, count] of data.consignmentsByDate) {
      if (count > 200) {
        warnings.push(`Very high consignment count (${count}) on ${dateStr}`);
      }
    }

    // Check for Sunday deliveries (unusual but possible)
    const sundayDeliveries = data.dates.filter((date) => date.getDay() === 0);
    if (sundayDeliveries.length > 0) {
      warnings.push("Sunday deliveries detected");
    }

    return {
      isValid: true,
      warnings,
    };
  }

  protected checkContentPatterns(content: string): boolean {
    const runsheetIndicators = [
      "runsheet",
      "delivery",
      "collection",
      "consignment",
      "dv_", // From filename patterns
    ];

    const lowerContent = content.toLowerCase();
    return runsheetIndicators.some((indicator) => lowerContent.includes(indicator));
  }

  /**
   * Extract data from a single page of the runsheet
   */
  private extractPageData(pageText: string): {
    date: Date | null;
    consignments: string[];
  } {
    // DEBUG: Log first 500 chars of page text to see what we're working with
    console.log(
      "🔍 RUNSHEET DEBUG - Page text preview (first 500 chars):",
      pageText.substring(0, 500)
    );

    // Extract date using patterns from original system
    const date = this.extractDateFromPage(pageText);
    console.log("🔍 RUNSHEET DEBUG - Extracted date:", date);

    // Extract consignments using patterns from original system
    const consignments = this.extractConsignmentsFromPage(pageText);
    console.log("🔍 RUNSHEET DEBUG - Extracted consignments count:", consignments.length);
    console.log("🔍 RUNSHEET DEBUG - First 5 consignments:", consignments.slice(0, 5));

    return { date, consignments };
  }

  /**
   * Extract date from runsheet text - exact copy from original extractDateFromRunsheet
   */
  private extractDateFromPage(text: string): Date | null {
    // Try primary pattern: "Date: DD/MM/YYYY"
    const primaryPattern = /Date:\s*(\d{2}[-/]\d{2}[-/]\d{4})/;
    const primaryMatch = primaryPattern.exec(text);

    if (primaryMatch) {
      return this.parseDateString(primaryMatch[1], "DD-MM-YYYY");
    }

    // Try alternative date patterns that might be in the PDF
    const altPatterns = [
      /(\d{2}[-/]\d{2}[-/]\d{4})/, // Any DD/MM/YYYY or DD-MM-YYYY
      /(\d{4}[-/]\d{2}[-/]\d{2})/, // YYYY/MM/DD or YYYY-MM-DD
      /Date[\s:]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i, // Flexible Date: pattern
    ];

    for (const pattern of altPatterns) {
      const date = this.tryExtractDate(text, pattern);
      if (date) {
        return date;
      }
    }

    return null;
  }

  /**
   * Try to extract and parse date using a given pattern
   */
  private tryExtractDate(text: string, pattern: RegExp): Date | null {
    const match = pattern.exec(text);
    if (!match) {
      return null;
    }

    try {
      const dateStr = match[1];
      return this.parseDateString(dateStr);
    } catch {
      return null;
    }
  }

  /**
   * Parse date string and return UTC Date object
   * Handles both DD-MM-YYYY and YYYY-MM-DD formats
   */
  private parseDateString(dateStr: string, knownFormat?: "DD-MM-YYYY"): Date | null {
    const parts = dateStr.replace(/\//g, "-").split("-");

    if (knownFormat === "DD-MM-YYYY") {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(Date.UTC(year, month, day));
    }

    // Auto-detect format based on first part length
    if (parts[0].length === 4) {
      // YYYY-MM-DD format
      return this.createUTCDate(
        parseInt(parts[0], 10), // year
        parseInt(parts[1], 10) - 1, // month
        parseInt(parts[2], 10) // day
      );
    }

    // DD-MM-YYYY format with 2-digit year handling
    let year = parseInt(parts[2], 10);
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }

    return this.createUTCDate(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }

  /**
   * Create UTC date from parts
   */
  private createUTCDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month, day));
  }

  /**
   * Extract consignment count using token-based approach - exact copy from original extractConsignmentsFromRunsheet
   */
  private extractConsignmentsFromPage(text: string): string[] {
    const tokens = text.split(/\s+/);
    const consignmentsList = [];

    for (let i = 0; i < tokens.length - 1; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];

      if (/^\d+$/.test(token)) {
        const num = parseInt(token, 10);

        if (/^\d{7}$/.test(nextToken) || /^AH\d+$/.test(nextToken)) {
          const nearbyTokens = tokens.slice(i, i + 10).join(" ");

          if (nearbyTokens.includes("Delivery") || nearbyTokens.includes("Collection")) {
            consignmentsList.push({
              number: num,
              id: nextToken,
            });
          }
        }
      }
    }

    // Return just the IDs as strings to match interface
    return consignmentsList.map((c) => c.id);
  }
}
