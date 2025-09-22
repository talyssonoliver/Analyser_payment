/**
 * PDF Parser Base Class
 * Handles common PDF parsing functionality using pdf.js
 */

import type { 
  PDFJSLib, 
  ParsedPDFData, 
  PDFParseResult,
  PDFTextContentItem
} from '../../../types/core';

const getPDFJS = (): PDFJSLib => {
  if (typeof window === 'undefined') {
    throw new Error('PDF processing only available on client side');
  }
  
  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }
  
  throw new Error('PDF.js not loaded. Please ensure PDF.js is included in your HTML.');
};

export abstract class PDFParserBase<T = Record<string, unknown>> {
  protected abstract fileTypeIdentifiers: string[];
  
  /**
   * Parse PDF file and extract specific data
   */
  async parse(file: File): Promise<PDFParseResult<T>> {
    try {
      // First, parse the PDF to get raw text
      const rawData = await this.parsePDFToText(file);
      
      // Then, extract specific data based on parser type
      const extractedData = await this.extractData(rawData, file.name);
      
      // Validate the extracted data
      const validation = await this.validateData(extractedData);
      
      return {
        success: validation.isValid,
        data: validation.isValid ? extractedData : undefined,
        error: validation.error,
        warnings: validation.warnings,
        rawData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        rawData: { text: '', pages: [] },
      };
    }
  }

  /**
   * Check if this parser can handle the given file
   */
  canParse(fileName: string, content?: string): boolean {
    const lowerName = fileName.toLowerCase();
    
    // Check file name patterns
    const nameMatches = this.fileTypeIdentifiers.some(identifier => 
      lowerName.includes(identifier.toLowerCase())
    );
    
    // If content is provided, check content patterns
    if (content) {
      const contentMatches = this.checkContentPatterns(content);
      return nameMatches || contentMatches;
    }
    
    return nameMatches;
  }

  /**
   * Parse PDF file to extract raw text content - matches original extractTextFromPDF
   */
  protected async parsePDFToText(file: File): Promise<ParsedPDFData> {
    const pdfjsLib = getPDFJS();
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    
    const pages: ParsedPDFData['pages'] = [];
    let fullText = '';
    
    // Extract text from each page - exact same logic as original
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: PDFTextContentItem) => item.str).join(' ') + '\n';
      
      pages.push({
        pageNumber: i,
        text: pageText,
      });
      
      fullText += pageText;
    }

    return {
      text: fullText,
      pages,
    };
  }

  /**
   * Extract specific data from parsed PDF - to be implemented by subclasses
   */
  protected abstract extractData(rawData: ParsedPDFData, filename?: string): Promise<T>;

  /**
   * Validate extracted data - to be implemented by subclasses
   */
  protected abstract validateData(data: T): Promise<{
    isValid: boolean;
    error?: string;
    warnings?: string[];
  }>;

  /**
   * Check content patterns specific to parser type - to be implemented by subclasses
   */
  protected abstract checkContentPatterns(content: string): boolean;

  /**
   * Utility method to extract dates from text
   * Refactored to reduce cognitive complexity
   */
  protected extractDates(text: string): Date[] {
    const dates: Date[] = [];
    
    // Common date patterns
    const datePatterns = [
      // DD/MM/YYYY or DD/MM/YY
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g,
      // DD-MM-YYYY or DD-MM-YY  
      /(\d{1,2})-(\d{1,2})-(\d{2,4})/g,
      // Date: DD/MM/YYYY format (common in runsheets)
      /Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
    ];

    for (const pattern of datePatterns) {
      const patternDates = this.extractDatesFromPattern(text, pattern);
      dates.push(...patternDates);
    }

    return this.removeDuplicatesAndSort(dates);
  }

  /**
   * Extract dates using a specific pattern - reduces complexity
   */
  private extractDatesFromPattern(text: string, pattern: RegExp): Date[] {
    const dates: Date[] = [];
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      const date = this.parseMatchToDate(match);
      if (date) {
        dates.push(date);
      }
    }
    
    return dates;
  }

  /**
   * Parse regex match to valid Date object - reduces complexity
   */
  private parseMatchToDate(match: RegExpExecArray): Date | null {
    try {
      const { day, month, year } = this.extractDateComponents(match);
      const date = new Date(year, month, day);
      
      return this.isValidDate(date, year, month, day) ? date : null;
    } catch {
      return null;
    }
  }

  /**
   * Extract day, month, year from regex match
   */
  private extractDateComponents(match: RegExpExecArray): { day: number; month: number; year: number } {
    if (match[0].toLowerCase().includes('date:')) {
      // Handle "Date: DD/MM/YYYY" format
      const datePart = match[1];
      const parts = datePart.split('/');
      return {
        day: parseInt(parts[0]),
        month: parseInt(parts[1]) - 1, // Month is 0-indexed
        year: parseInt(parts[2])
      };
    } else {
      let year = parseInt(match[3]);
      
      // Handle 2-digit years
      if (year < 100) {
        year += year <= 30 ? 2000 : 1900;
      }
      
      return {
        day: parseInt(match[1]),
        month: parseInt(match[2]) - 1, // Month is 0-indexed
        year
      };
    }
  }

  /**
   * Validate that the date object represents the intended date
   */
  private isValidDate(date: Date, year: number, month: number, day: number): boolean {
    return date.getFullYear() === year && 
           date.getMonth() === month && 
           date.getDate() === day;
  }

  /**
   * Remove duplicate dates and sort chronologically
   */
  private removeDuplicatesAndSort(dates: Date[]): Date[] {
    const uniqueDates = Array.from(
      new Map(dates.map(date => [date.getTime(), date])).values()
    );
    
    return uniqueDates.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Utility method to extract monetary amounts
   */
  protected extractAmounts(text: string): number[] {
    const amounts: number[] = [];
    
    // Pattern for £X.XX or £X,XXX.XX
    const amountPattern = /£(\d{1,3}(?:,\d{3})*\.?\d{0,2})/g;
    
    let match;
    while ((match = amountPattern.exec(text)) !== null) {
      const amount = this.parseAmount(match[1]);
      if (amount !== null) {
        amounts.push(amount);
      }
    }
    
    return amounts.sort((a, b) => a - b);
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amountStr: string): number | null {
    try {
      // Remove commas and convert to number
      const cleanAmount = amountStr.replace(/,/g, '');
      const amount = parseFloat(cleanAmount);
      
      return (!isNaN(amount) && amount >= 0) ? amount : null;
    } catch {
      return null;
    }
  }
}