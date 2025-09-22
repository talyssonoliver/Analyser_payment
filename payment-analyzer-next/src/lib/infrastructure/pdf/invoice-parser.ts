/**
 * Invoice PDF Parser
 * Extracts payment amounts and service details from invoices
 * Based on the original system's parsing logic
 */

import { PDFParserBase } from './pdf-parser-base';
import type { ParsedPDFData } from '../../../types/core';

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
  protected fileTypeIdentifiers = ['self', 'invoice', 'bill'];

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
      if (entry.serviceType?.toLowerCase().includes('pickup')) {
        pickupServices.push(entry);
      } else if (entry.description?.toLowerCase().includes('extra drop')) {
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
      new Map(extractedEntries.map(entry => [entry.date.getTime(), entry.date])).values()
    ).sort((a, b) => a.getTime() - b.getTime());

    return {
      entries: entries.sort((a, b) => a.date.getTime() - b.date.getTime()),
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
    if (data.entries.length === 0 && data.pickupServices.length === 0 && data.extraDrops.length === 0) {
      return {
        isValid: false,
        error: 'No payment entries found in invoice',
      };
    }

    // Check total validation
    if (!data.isValid && data.validationMessage) {
      warnings.push(data.validationMessage);
    }

    // Check for unreasonable amounts
    const highAmountEntries = [...data.entries, ...data.pickupServices, ...data.extraDrops]
      .filter(entry => entry.amount > 500);
    
    if (highAmountEntries.length > 0) {
      warnings.push(`${highAmountEntries.length} entries with amounts over £500 detected`);
    }

    // Check for zero amounts
    const zeroAmountEntries = [...data.entries, ...data.pickupServices, ...data.extraDrops]
      .filter(entry => entry.amount === 0);
    
    if (zeroAmountEntries.length > 0) {
      warnings.push(`${zeroAmountEntries.length} entries with zero amounts detected`);
    }

    return {
      isValid: true,
      warnings,
    };
  }

  protected checkContentPatterns(content: string): boolean {
    const invoiceIndicators = [
      'invoice',
      'docket total',
      'gbp',
      'total:',
      '£',
    ];

    const lowerContent = content.toLowerCase();
    return invoiceIndicators.some(indicator => lowerContent.includes(indicator));
  }

  /**
   * Extract document total from invoice (based on original system patterns)
   */
  private extractDocumentTotal(text: string): number | null {
    // Pattern 1: "Docket Total: £X.XX"
    const docketTotalPattern = /docket\s+total:\s*£(\d+(?:,\d{3})*\.?\d{0,2})/i;
    let match = text.match(docketTotalPattern);
    
    if (match) {
      return this.parseInvoiceAmount(match[1]);
    }

    // Pattern 2: "Total: GBP £X.XX"
    const gbpTotalPattern = /total:\s*gbp\s*£(\d+(?:,\d{3})*\.?\d{0,2})/i;
    match = text.match(gbpTotalPattern);
    
    if (match) {
      return this.parseInvoiceAmount(match[1]);
    }

    // Pattern 3: "GBP £X.XX Total:"
    const gbpTotalPattern2 = /gbp\s*£(\d+(?:,\d{3})*\.?\d{0,2})\s*total:/i;
    match = text.match(gbpTotalPattern2);
    
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
      
      // Stop at Docket Total marker - exact same logic as original
      if (token === 'Docket' && i + 1 < tokens.length && tokens[i+1] === 'Total:') {
        break;
      }
      
      // Look for date patterns DD/MM/YY
      if (/^\d{2}\/\d{2}\/\d{2}$/.test(token)) {
        if (i + 1 < tokens.length && /^\d{2}:\d{2}$/.test(tokens[i + 1])) {
          
          const [day, month, year] = token.split('/');
          currentDate = `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          currentTime = tokens[i + 1];
          
          const isPickup = i + 2 < tokens.length && tokens[i + 2] === '-PickUp';
          
          // Look for amount in next 30 tokens
          for (let j = i + 2; j < Math.min(i + 30, tokens.length); j++) {
            const checkToken = tokens[j];

            if (/^\d+\.\d+/.test(checkToken)) {
              const match = checkToken.match(/^(\d+\.\d{2})/);
              if (match) {
                const amount = parseFloat(match[1]);

                // Apply original validation: amounts between £3.00 and £500.00
                if (amount >= 3.00 && amount <= 500.00) {
                  const dateParts = currentDate.split('-');
                  const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));

                  entries.push({
                    date,
                    time: currentTime || undefined,
                    amount,
                    serviceType: isPickup ? 'Pickup Service' : 'Standard',
                  });
                }
                break;
              }
            }
          }
        }
      }
    }
    
    return entries;
  }

  /**
   * Identify service type from description
   */
  private identifyServiceType(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('multidrop')) return 'Multidrop';
    if (lowerDesc.includes('small van')) return 'Small Van';
    if (lowerDesc.includes('lwb transit')) return 'LWB Transit';
    if (lowerDesc.includes('pickup')) return 'Pickup Service';
    if (lowerDesc.includes('extra drop')) return 'Extra Drop';
    
    return 'Standard';
  }

  /**
   * Parse amount string to number (invoice-specific implementation)
   */
  private parseInvoiceAmount(amountStr: string): number {
    return parseFloat(amountStr.replace(/,/g, ''));
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
  private getValidationMessage(calculatedTotal: number, documentTotal: number | null): string | undefined {
    if (documentTotal === null) {
      return 'Could not find document total for validation';
    }
    
    const difference = calculatedTotal - documentTotal;
    
    if (Math.abs(difference) <= 0.01) {
      return 'Totals match - validation successful';
    }
    
    return `Total mismatch: calculated £${calculatedTotal.toFixed(2)}, document shows £${documentTotal.toFixed(2)} (difference: £${difference.toFixed(2)})`;
  }
}