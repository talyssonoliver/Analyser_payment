/**
 * Runsheet PDF Parser
 * Extracts consignment counts from delivery runsheets
 * Based on the original system's parsing logic
 */

import { PDFParserBase } from './pdf-parser-base';
import type { ParsedPDFData } from '../../../types/core';

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
  protected fileTypeIdentifiers = ['runsheet', 'dv_'];

  protected async extractData(rawData: ParsedPDFData, filename?: string): Promise<RunsheetData> {
    const dates: Date[] = [];
    const consignmentsByDate = new Map<string, number>();
    const details: RunsheetData['details'] = [];
    
    // Process each page
    for (const page of rawData.pages) {
      const pageData = this.extractPageData(page.text);
      
      if (pageData.consignments.length > 0) {
        let dateToUse = pageData.date;
        
        // If no date found, try to infer from filename or use current date as fallback
        if (!dateToUse) {
          // Try to extract date from filename (e.g., "runsheetDV_2025-07-01.pdf")
          const filenameMatch = filename?.match(/(\d{4}[-\/]\d{2}[-\/]\d{2})/);
          if (filenameMatch) {
            const parts = filenameMatch[1].replace(/\//g, '-').split('-');
            dateToUse = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else {
            // As a last resort, use current date (this matches original behavior)
            dateToUse = new Date();
          }
        }
        
        const dateKey = dateToUse.toISOString().split('T')[0]; // Use ISO format like original
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

    // Remove duplicate dates and sort
    const uniqueDates = dates.filter(
      (date, index, self) => self.findIndex(d => d.getTime() === date.getTime()) === index
    );
    uniqueDates.sort((a, b) => a.getTime() - b.getTime());

    const totalConsignments = Array.from(consignmentsByDate.values())
      .reduce((sum, count) => sum + count, 0);

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
        error: 'No dates found in runsheet',
      };
    }

    if (data.totalConsignments === 0) {
      return {
        isValid: false,
        error: 'No consignments found in runsheet',
      };
    }

    // Check for reasonable consignment counts
    for (const [dateStr, count] of data.consignmentsByDate) {
      if (count > 200) {
        warnings.push(`Very high consignment count (${count}) on ${dateStr}`);
      }
    }

    // Check for Sunday deliveries (unusual but possible)
    const sundayDeliveries = data.dates.filter(date => date.getDay() === 0);
    if (sundayDeliveries.length > 0) {
      warnings.push('Sunday deliveries detected');
    }

    return {
      isValid: true,
      warnings,
    };
  }

  protected checkContentPatterns(content: string): boolean {
    const runsheetIndicators = [
      'runsheet',
      'delivery',
      'collection',
      'consignment',
      'dv_', // From filename patterns
    ];

    const lowerContent = content.toLowerCase();
    return runsheetIndicators.some(indicator => lowerContent.includes(indicator));
  }

  /**
   * Extract data from a single page of the runsheet
   */
  private extractPageData(pageText: string): {
    date: Date | null;
    consignments: string[];
  } {
    // Extract date using patterns from original system
    const date = this.extractDateFromPage(pageText);
    
    // Extract consignments using patterns from original system  
    const consignments = this.extractConsignmentsFromPage(pageText);
    
    return { date, consignments };
  }

  /**
   * Extract date from runsheet text - exact copy from original extractDateFromRunsheet
   */
  private extractDateFromPage(text: string): Date | null {
    const datePattern = /Date:\s*(\d{2}[-/]\d{2}[-/]\d{4})/;
    const match = datePattern.exec(text);
    
    if (match) {
      const parts = match[1].replace(/\//g, '-').split('-');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    
    // Try alternative date patterns that might be in the PDF
    const altPatterns = [
      /(\d{2}[-/]\d{2}[-/]\d{4})/,  // Any DD/MM/YYYY or DD-MM-YYYY
      /(\d{4}[-/]\d{2}[-/]\d{2})/,  // YYYY/MM/DD or YYYY-MM-DD
      /Date[\s:]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i, // Flexible Date: pattern
    ];
    
    for (const pattern of altPatterns) {
      const altMatch = pattern.exec(text);
      if (altMatch) {
        try {
          const dateStr = altMatch[1];
          const parts = dateStr.replace(/\//g, '-').split('-');
          
          let day, month, year;
          if (parts[0].length === 4) {
            // YYYY-MM-DD format
            year = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            day = parseInt(parts[2]);
          } else {
            // DD-MM-YYYY format
            day = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            year = parseInt(parts[2]);
            
            // Handle 2-digit years
            if (year < 100) {
              year += year < 50 ? 2000 : 1900;
            }
          }
          
          return new Date(year, month, day);
        } catch {
          // Continue to next pattern
        }
      }
    }
    
    return null;
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
        const num = parseInt(token);
        
        if (/^\d{7}$/.test(nextToken) || /^AH\d+$/.test(nextToken)) {
          const nearbyTokens = tokens.slice(i, i + 10).join(' ');
          
          if (nearbyTokens.includes('Delivery') || nearbyTokens.includes('Collection')) {
            consignmentsList.push({
              number: num,
              id: nextToken
            });
          }
        }
      }
    }
    
    // Return just the IDs as strings to match interface
    return consignmentsList.map(c => c.id);
  }
}