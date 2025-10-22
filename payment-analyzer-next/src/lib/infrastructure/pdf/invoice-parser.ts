/**
 * Invoice PDF Parser
 * Extracts payment amounts and service details from invoices
 * Based on the original system's parsing logic
 */

import type { ParsedPDFData } from "../../../types/core";
import { PDFParserBase } from "./pdf-parser-base";

export interface InvoiceEntry {
  date: Date;
  time?: string;
  amount: number;
  serviceType?: string;
  description?: string;
}

export interface InvoiceData {
  entries: InvoiceEntry[];
  totalAmount: number;
  documentTotal: number | null;
  isValid: boolean;
  dates: Date[];
  pickupServices: InvoiceEntry[];
  extraDrops: InvoiceEntry[];
  validationMessage?: string;
}

export class InvoiceParser extends PDFParserBase<InvoiceData> {
  protected fileTypeIdentifiers = ["self", "invoice", "bill"];
  private readonly processedExtraDrops = new Set<string>();

  protected async extractData(rawData: ParsedPDFData): Promise<InvoiceData> {
    const entries: InvoiceEntry[] = [];
    const pickupServices: InvoiceEntry[] = [];
    const extraDrops: InvoiceEntry[] = [];

    // Combine all pages for processing
    const fullText = rawData.text;

    // Extract document total first
    const documentTotal = this.extractDocumentTotal(fullText);

    // Extract individual entries
    const extractedEntries = this.extractEntries(fullText);

    // Categorize entries
    for (const entry of extractedEntries) {
      if (entry.serviceType?.toLowerCase().includes("pickup")) {
        pickupServices.push(entry);
      } else if (entry.description?.toLowerCase().includes("extra drop")) {
        extraDrops.push(entry);
      } else {
        entries.push(entry);
      }
    }

    // Calculate total from entries
    const calculatedTotal = extractedEntries.reduce((sum, entry) => sum + entry.amount, 0);

    // Validation
    const isValid = this.validateTotals(calculatedTotal, documentTotal);
    const validationMessage = this.getValidationMessage(calculatedTotal, documentTotal);

    // Extract unique dates
    const dates = Array.from(
      new Map(extractedEntries.map((entry) => [entry.date.getTime(), entry.date])).values()
    ).sort((a, b) => a.getTime() - b.getTime());

    return {
      entries: entries.toSorted((a, b) => a.date.getTime() - b.date.getTime()),
      totalAmount: calculatedTotal,
      documentTotal,
      isValid,
      dates,
      pickupServices,
      extraDrops,
      validationMessage,
    };
  }

  protected async validateData(data: InvoiceData): Promise<{
    isValid: boolean;
    error?: string;
    warnings?: string[];
  }> {
    const warnings: string[] = [];

    // Check if any entries were extracted
    if (
      data.entries.length === 0 &&
      data.pickupServices.length === 0 &&
      data.extraDrops.length === 0
    ) {
      return {
        isValid: false,
        error: "No payment entries found in invoice",
      };
    }

    // Check total validation
    if (!data.isValid && data.validationMessage) {
      warnings.push(data.validationMessage);
    }

    // Check for unreasonable amounts
    const highAmountEntries = [...data.entries, ...data.pickupServices, ...data.extraDrops].filter(
      (entry) => entry.amount > 500
    );

    if (highAmountEntries.length > 0) {
      warnings.push(`${highAmountEntries.length} entries with amounts over £500 detected`);
    }

    // Check for zero amounts
    const zeroAmountEntries = [...data.entries, ...data.pickupServices, ...data.extraDrops].filter(
      (entry) => entry.amount === 0
    );

    if (zeroAmountEntries.length > 0) {
      warnings.push(`${zeroAmountEntries.length} entries with zero amounts detected`);
    }

    return {
      isValid: true,
      warnings,
    };
  }

  protected checkContentPatterns(content: string): boolean {
    const invoiceIndicators = ["invoice", "docket total", "gbp", "total:", "£"];

    const lowerContent = content.toLowerCase();
    return invoiceIndicators.some((indicator) => lowerContent.includes(indicator));
  }

  /**
   * Extract document total from invoice (based on original system patterns)
   */
  private extractDocumentTotal(text: string): number | null {
    // Pattern 1: "Docket Total: £X.XX" (with currency symbol)
    const docketTotalPattern = /docket\s+total:\s*£(\d+(?:,\d{3})*\.?\d{0,2})/i;
    let match = docketTotalPattern.exec(text);

    if (match) {
      return this.parseInvoiceAmount(match[1]);
    }

    // Pattern 2: "Total: GBP £X.XX"
    const gbpTotalPattern = /total:\s*gbp\s*£(\d+(?:,\d{3})*\.?\d{0,2})/i;
    match = gbpTotalPattern.exec(text);

    if (match) {
      return this.parseInvoiceAmount(match[1]);
    }

    // Pattern 3: "GBP £X.XX Total:"
    const gbpTotalPattern2 = /gbp\s*£(\d+(?:,\d{3})*\.?\d{0,2})\s*total:/i;
    match = gbpTotalPattern2.exec(text);

    if (match) {
      return this.parseInvoiceAmount(match[1]);
    }

    // Fallback Pattern 1: "Docket Total: X.XX" (without £ symbol - legacy compatibility)
    const docketTotalFallback = /docket\s+total:\s*([0-9,]+\.?\d*)/i;
    match = docketTotalFallback.exec(text);

    if (match) {
      return this.parseInvoiceAmount(match[1]);
    }

    // Fallback Pattern 2: "Total: GBP X.XX" (without £ symbol)
    const gbpTotalFallback = /total:\s*gbp\s*([0-9,]+\.?\d*)/i;
    match = gbpTotalFallback.exec(text);

    if (match) {
      return this.parseInvoiceAmount(match[1]);
    }

    // Fallback Pattern 3: "GBP X.XX Total:" (without £ symbol)
    const gbpTotalFallback2 = /gbp\s*([0-9,]+\.?\d*)\s*total:/i;
    match = gbpTotalFallback2.exec(text);

    if (match) {
      return this.parseInvoiceAmount(match[1]);
    }

    return null;
  }

  /**
   * Extract invoice amounts using token-based approach - exact copy from original extractInvoiceAmounts
   */
  private extractEntries(text: string): InvoiceEntry[] {
    const entries: InvoiceEntry[] = [];
    const tokens = text.split(/\s+/);
    let currentDate: string | null = null;
    let currentTime: string | null = null;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Stop at Docket Total marker
      if (this.isDocketTotalMarker(token, tokens, i)) {
        break;
      }

      // Process date tokens
      const dateResult = this.processDateToken(token, tokens, i);
      if (dateResult) {
        currentDate = dateResult.date;
        currentTime = dateResult.time;

        const entry = this.findStandardEntry(
          tokens,
          i,
          currentDate,
          currentTime,
          dateResult.isPickup
        );
        if (entry) {
          entries.push(entry);
        }
      }

      // Process extra drops
      const extraEntry = this.processExtraDropToken(token, tokens, i, currentDate, currentTime);
      if (extraEntry) {
        entries.push(extraEntry);
      }
    }

    return entries;
  }

  /**
   * Check if current token is the Docket Total marker
   */
  private isDocketTotalMarker(token: string, tokens: string[], index: number): boolean {
    return token === "Docket" && index + 1 < tokens.length && tokens[index + 1] === "Total:";
  }

  /**
   * Process a date token and extract date/time info
   */
  private processDateToken(
    token: string,
    tokens: string[],
    index: number
  ): { date: string; time: string; isPickup: boolean } | null {
    if (!/^\d{2}\/\d{2}\/\d{2}$/.test(token)) {
      return null;
    }

    if (index + 1 >= tokens.length || !/^\d{2}:\d{2}$/.test(tokens[index + 1])) {
      return null;
    }

    const [day, month, year] = token.split("/");
    const date = `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const time = tokens[index + 1];
    const isPickup = index + 2 < tokens.length && tokens[index + 2] === "-PickUp";

    return { date, time, isPickup };
  }

  /**
   * Find standard entry amount in token range
   */
  private findStandardEntry(
    tokens: string[],
    startIndex: number,
    currentDate: string,
    currentTime: string,
    isPickup: boolean
  ): InvoiceEntry | null {
    for (let j = startIndex + 2; j < Math.min(startIndex + 30, tokens.length); j++) {
      const checkToken = tokens[j];

      // Stop if we hit a marker that indicates end of this entry
      if (this.isEndOfEntryMarker(checkToken, tokens, j)) {
        break;
      }

      // Try to extract and validate amount from token
      const amount = this.extractValidAmount(checkToken);
      if (amount === null) {
        continue;
      }

      return {
        date: this.createDateFromString(currentDate),
        time: currentTime || undefined,
        amount,
        serviceType: isPickup ? "Pickup Service" : "Standard",
      };
    }

    return null;
  }

  /**
   * Check if token marks the end of an entry (date, extra drops, or docket total)
   */
  private isEndOfEntryMarker(token: string, tokens: string[], index: number): boolean {
    // Stop if we hit another date token (next entry)
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(token)) {
      return true;
    }

    // Stop if we hit "Extra Drops" pattern (separate entry type)
    if (token === "Extra" && index + 1 < tokens.length && tokens[index + 1] === "Drops") {
      return true;
    }

    // Stop if we hit "Docket Total" marker
    if (token === "Docket" && index + 1 < tokens.length && tokens[index + 1] === "Total:") {
      return true;
    }

    return false;
  }

  /**
   * Extract and validate amount from token (returns null if invalid)
   */
  private extractValidAmount(token: string): number | null {
    // Check if token looks like a decimal number
    if (!/^\d+\.\d+/.test(token)) {
      return null;
    }

    // Extract amount with exactly 2 decimal places
    const amountPattern = /^(\d+\.\d{2})/;
    const match = amountPattern.exec(token);
    if (!match) {
      return null;
    }

    // Validate amount is in reasonable range
    const amount = parseFloat(match[1]);
    if (amount < 3.0 || amount > 500.0) {
      return null;
    }

    return amount;
  }

  /**
   * Process extra drop token and extract entry
   */
  private processExtraDropToken(
    token: string,
    tokens: string[],
    index: number,
    currentDate: string | null,
    currentTime: string | null
  ): InvoiceEntry | null {
    if (token !== "Extra" || index + 1 >= tokens.length || tokens[index + 1] !== "Drops") {
      return null;
    }

    if (!currentDate || !currentTime) {
      return null;
    }

    for (let m = index + 2; m < Math.min(index + 5, tokens.length); m++) {
      const extraDropPattern = /^(\d+\.\d{2})/;
      const extraMatch = extraDropPattern.exec(tokens[m]);

      if (!extraMatch) {
        continue;
      }

      const extraAmount = parseFloat(extraMatch[1]);
      if (extraAmount <= 0 || extraAmount >= 50) {
        continue;
      }

      const extraKey = `${currentDate}|${currentTime}|${index}|${extraAmount}`;
      if (this.processedExtraDrops.has(extraKey)) {
        continue;
      }

      this.processedExtraDrops.add(extraKey);
      return {
        date: this.createDateFromString(currentDate),
        time: currentTime,
        amount: extraAmount,
        serviceType: "Extra Drops",
        description: "Extra drop charge",
      };
    }

    return null;
  }

  /**
   * Create Date object from ISO date string
   */
  private createDateFromString(dateString: string): Date {
    const dateParts = dateString.split("-");
    return new Date(
      Date.UTC(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[2], 10)
      )
    );
  }

  /**
   * Parse amount string to number (invoice-specific implementation)
   */
  private parseInvoiceAmount(amountStr: string): number {
    return parseFloat(amountStr.replace(/,/g, ""));
  }

  /**
   * Validate totals match (with tolerance for rounding)
   */
  private validateTotals(calculatedTotal: number, documentTotal: number | null): boolean {
    if (documentTotal === null) return true; // Can't validate without document total

    const tolerance = 0.01; // £0.01 tolerance
    return Math.abs(calculatedTotal - documentTotal) <= tolerance;
  }

  /**
   * Get validation message for total comparison
   */
  private getValidationMessage(
    calculatedTotal: number,
    documentTotal: number | null
  ): string | undefined {
    if (documentTotal === null) {
      return "Could not find document total for validation";
    }

    const difference = calculatedTotal - documentTotal;

    if (Math.abs(difference) <= 0.01) {
      return "Totals match - validation successful";
    }

    return `Total mismatch: calculated £${calculatedTotal.toFixed(2)}, document shows £${documentTotal.toFixed(2)} (difference: £${difference.toFixed(2)})`;
  }
}
