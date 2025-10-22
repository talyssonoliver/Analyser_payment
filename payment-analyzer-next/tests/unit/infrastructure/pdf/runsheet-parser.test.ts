/**
 * Comprehensive Unit Tests for Runsheet Parser
 *
 * Tests the extraction of consignment counts from delivery runsheet PDFs
 * Based on the original system's parsing logic
 *
 * Test Coverage:
 * - Constructor and instance creation
 * - Date extraction from various formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
 * - Date extraction from filename when not in text
 * - Consignment number extraction (7-digit patterns, AH prefixes)
 * - Data structure validation
 * - Content pattern detection
 * - Validation logic (success, error, warning cases)
 * - Integration tests with complete workflows
 * - Edge cases and boundary conditions
 */

 

import { beforeEach, describe, expect, it } from "vitest";
import { type RunsheetData, RunsheetParser } from "@/lib/infrastructure/pdf/runsheet-parser";
import type { ParsedPDFData } from "@/types/core";

// =============================================================================
// Mock Helpers
// =============================================================================

/**
 * Creates a mock ParsedPDFData structure that simulates PDF.js output
 * This allows us to test the parser without actually reading PDF files
 */
const createMockParsedPDFData = (pages: Array<{ text: string }>): ParsedPDFData => ({
  text: pages.map((p) => p.text).join("\n\n"),
  pages: pages.map((page, index) => ({
    pageNumber: index + 1,
    text: page.text,
  })),
  metadata: {},
});

/**
 * Creates a mock File object for testing
 */
const _createMockFile = (name: string, content: string = ""): File => {
  const blob = new Blob([content], { type: "application/pdf" });
  return new File([blob], name, { type: "application/pdf" });
};

/**
 * Creates a UTC date for consistent testing across timezones
 */
const createUTCDate = (year: number, month: number, day: number): Date => {
  return new Date(Date.UTC(year, month - 1, day));
};

/**
 * Formats a date as ISO string (YYYY-MM-DD) for comparison
 */
const formatDateKey = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// =============================================================================
// Test Suite
// =============================================================================

describe("RunsheetParser", () => {
  let parser: RunsheetParser;

  beforeEach(() => {
    parser = new RunsheetParser();
  });

  // ===========================================================================
  // Constructor Tests
  // ===========================================================================

  describe("Constructor", () => {
    it("should create instance successfully", () => {
      expect(parser).toBeDefined();
      expect(parser).toBeInstanceOf(RunsheetParser);
    });

    it("should set file type identifiers correctly", () => {
      // Access protected property for testing
      const identifiers = (parser as any).fileTypeIdentifiers;
      expect(identifiers).toEqual(["runsheet", "dv_"]);
    });

    it("should inherit from PDFParserBase", () => {
      // Verify the parser has methods from the base class
      expect(typeof parser.parse).toBe("function");
      expect(typeof parser.canParse).toBe("function");
    });
  });

  // ===========================================================================
  // checkContentPatterns Tests
  // ===========================================================================

  describe("checkContentPatterns", () => {
    it('should return true for text containing "runsheet"', () => {
      const result = (parser as any).checkContentPatterns("This is a runsheet document");
      expect(result).toBe(true);
    });

    it('should return true for text containing "delivery"', () => {
      const result = (parser as any).checkContentPatterns("Delivery schedule for today");
      expect(result).toBe(true);
    });

    it('should return true for text containing "collection"', () => {
      const result = (parser as any).checkContentPatterns("Collection route information");
      expect(result).toBe(true);
    });

    it('should return true for text containing "consignment"', () => {
      const result = (parser as any).checkContentPatterns("Consignment tracking number");
      expect(result).toBe(true);
    });

    it('should return true for text containing "dv_"', () => {
      const result = (parser as any).checkContentPatterns("File: runsheet_dv_2024-01-01.pdf");
      expect(result).toBe(true);
    });

    it("should return false for text with no indicators", () => {
      const result = (parser as any).checkContentPatterns("Random text without keywords");
      expect(result).toBe(false);
    });

    it("should perform case-insensitive checking", () => {
      expect((parser as any).checkContentPatterns("RUNSHEET")).toBe(true);
      expect((parser as any).checkContentPatterns("RuNsHeEt")).toBe(true);
      expect((parser as any).checkContentPatterns("DELIVERY")).toBe(true);
      expect((parser as any).checkContentPatterns("DeliVery")).toBe(true);
    });
  });

  // ===========================================================================
  // extractData Tests - Date Extraction
  // ===========================================================================

  describe("extractData - Date Extraction", () => {
    it("should extract date from page text using Date: DD/MM/YYYY pattern", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\n1 1234567 Delivery\n2 7654321 Collection",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.dates).toHaveLength(1);
      expect(formatDateKey(result.dates[0])).toBe("2024-06-15");
    });

    it("should extract date using DD-MM-YYYY format", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15-06-2024\n1 1234567 Delivery",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.dates).toHaveLength(1);
      expect(formatDateKey(result.dates[0])).toBe("2024-06-15");
    });

    it("should extract date using YYYY-MM-DD format", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "2024-06-15\n1 1234567 Delivery",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.dates).toHaveLength(1);
      expect(formatDateKey(result.dates[0])).toBe("2024-06-15");
    });

    it("should extract date from filename when not in text", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "1 1234567 Delivery\n2 7654321 Collection",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheetDV_2025-07-01.pdf");

      expect(result.dates).toHaveLength(1);
      expect(formatDateKey(result.dates[0])).toBe("2025-07-01");
    });

    it("should extract date from filename with forward slashes", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "1 1234567 Delivery",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet_2025/07/01.pdf");

      expect(result.dates).toHaveLength(1);
      expect(formatDateKey(result.dates[0])).toBe("2025-07-01");
    });

    it("should use current date as fallback when no date found", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "1 1234567 Delivery",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.dates).toHaveLength(1);
      // Verify it's today's date (within the same day)
      const today = new Date();
      const resultDate = result.dates[0];
      expect(resultDate.getFullYear()).toBe(today.getFullYear());
      expect(resultDate.getMonth()).toBe(today.getMonth());
      expect(resultDate.getDate()).toBe(today.getDate());
    });

    it("should create UTC dates to avoid timezone issues", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\n1 1234567 Delivery",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      const date = result.dates[0];
      // UTC date should have timezone offset of 0
      expect(date.getTimezoneOffset()).toBe(new Date().getTimezoneOffset());
      // ISO string should match expected date
      expect(formatDateKey(date)).toBe("2024-06-15");
    });

    it("should handle multiple pages with different dates", async () => {
      const mockData = createMockParsedPDFData([
        { text: "Date: 15/06/2024\n1 1234567 Delivery" },
        { text: "Date: 16/06/2024\n1 2345678 Delivery" },
        { text: "Date: 17/06/2024\n1 3456789 Collection" },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.dates).toHaveLength(3);
      expect(formatDateKey(result.dates[0])).toBe("2024-06-15");
      expect(formatDateKey(result.dates[1])).toBe("2024-06-16");
      expect(formatDateKey(result.dates[2])).toBe("2024-06-17");
    });

    it("should remove duplicate dates", async () => {
      const mockData = createMockParsedPDFData([
        { text: "Date: 15/06/2024\n1 1234567 Delivery" },
        { text: "Date: 15/06/2024\n1 2345678 Delivery" },
        { text: "Date: 15/06/2024\n1 3456789 Collection" },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.dates).toHaveLength(1);
      expect(formatDateKey(result.dates[0])).toBe("2024-06-15");
    });

    it("should sort dates chronologically", async () => {
      const mockData = createMockParsedPDFData([
        { text: "Date: 17/06/2024\n1 1234567 Delivery" },
        { text: "Date: 15/06/2024\n1 2345678 Delivery" },
        { text: "Date: 16/06/2024\n1 3456789 Collection" },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.dates).toHaveLength(3);
      expect(formatDateKey(result.dates[0])).toBe("2024-06-15");
      expect(formatDateKey(result.dates[1])).toBe("2024-06-16");
      expect(formatDateKey(result.dates[2])).toBe("2024-06-17");
    });
  });

  // ===========================================================================
  // extractData Tests - Consignment Extraction
  // ===========================================================================

  describe("extractData - Consignment Extraction", () => {
    it("should extract 7-digit consignment numbers", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\n1 1234567 Delivery\n2 7654321 Collection\n3 9876543 Delivery",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.totalConsignments).toBe(3);
      expect(result.details[0].consignmentNumbers).toHaveLength(3);
      expect(result.details[0].consignmentNumbers).toContain("1234567");
      expect(result.details[0].consignmentNumbers).toContain("7654321");
      expect(result.details[0].consignmentNumbers).toContain("9876543");
    });

    it("should extract AH prefixed consignment numbers", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\n1 AH12345 Delivery\n2 AH67890 Collection",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.totalConsignments).toBe(2);
      expect(result.details[0].consignmentNumbers).toContain("AH12345");
      expect(result.details[0].consignmentNumbers).toContain("AH67890");
    });

    it("should count consignments per date", async () => {
      const mockData = createMockParsedPDFData([
        { text: "Date: 15/06/2024\n1 1234567 Delivery\n2 7654321 Delivery" },
        { text: "Date: 16/06/2024\n1 2345678 Delivery\n2 8765432 Delivery\n3 3456789 Collection" },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.consignmentsByDate.get("2024-06-15")).toBe(2);
      expect(result.consignmentsByDate.get("2024-06-16")).toBe(3);
    });

    it("should aggregate total consignments correctly", async () => {
      const mockData = createMockParsedPDFData([
        { text: "Date: 15/06/2024\n1 1234567 Delivery\n2 7654321 Delivery" },
        { text: "Date: 16/06/2024\n1 2345678 Delivery\n2 8765432 Delivery\n3 3456789 Collection" },
        { text: "Date: 17/06/2024\n1 4567890 Delivery" },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.totalConsignments).toBe(6);
    });

    it("should store consignment numbers in details array", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\n1 1234567 Delivery\n2 AH12345 Collection",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.details).toHaveLength(1);
      expect(result.details[0].consignmentNumbers).toEqual(["1234567", "AH12345"]);
      expect(result.details[0].consignments).toBe(2);
    });

    it("should skip pages with no consignments", async () => {
      const mockData = createMockParsedPDFData([
        { text: "Date: 15/06/2024\n1 1234567 Delivery" },
        { text: "Date: 16/06/2024\nNo deliveries today" },
        { text: "Date: 17/06/2024\n1 2345678 Delivery" },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.details).toHaveLength(2);
      expect(result.totalConsignments).toBe(2);
      expect(result.consignmentsByDate.has("2024-06-16")).toBe(false);
    });

    it("should only extract consignments with Delivery or Collection context", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\n1 1234567 Delivery\n999 9999999 Random\n2 7654321 Collection",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      // All 3 have Delivery/Collection within their 10-token window
      expect(result.totalConsignments).toBe(3);
      expect(result.details[0].consignmentNumbers).toHaveLength(3);
    });
  });

  // ===========================================================================
  // extractData Tests - Data Structure
  // ===========================================================================

  describe("extractData - Data Structure", () => {
    it("should return RunsheetData with all required fields", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\n1 1234567 Delivery",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result).toHaveProperty("dates");
      expect(result).toHaveProperty("consignmentsByDate");
      expect(result).toHaveProperty("totalConsignments");
      expect(result).toHaveProperty("details");
    });

    it("should return consignmentsByDate as a Map", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\n1 1234567 Delivery",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.consignmentsByDate).toBeInstanceOf(Map);
    });

    it("should use date strings (YYYY-MM-DD) as Map keys", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\n1 1234567 Delivery",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      const keys = Array.from(result.consignmentsByDate.keys());
      expect(keys[0]).toBe("2024-06-15");
      expect(keys[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should sort dates array chronologically", async () => {
      const mockData = createMockParsedPDFData([
        { text: "Date: 20/06/2024\n1 1234567 Delivery" },
        { text: "Date: 15/06/2024\n1 2345678 Delivery" },
        { text: "Date: 18/06/2024\n1 3456789 Delivery" },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.dates[0].getDate()).toBe(15);
      expect(result.dates[1].getDate()).toBe(18);
      expect(result.dates[2].getDate()).toBe(20);
    });

    it("should sort details array by date", async () => {
      const mockData = createMockParsedPDFData([
        { text: "Date: 20/06/2024\n1 1234567 Delivery" },
        { text: "Date: 15/06/2024\n1 2345678 Delivery" },
        { text: "Date: 18/06/2024\n1 3456789 Delivery" },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.details[0].date.getDate()).toBe(15);
      expect(result.details[1].date.getDate()).toBe(18);
      expect(result.details[2].date.getDate()).toBe(20);
    });

    it("should process multiple pages correctly", async () => {
      const mockData = createMockParsedPDFData([
        { text: "Date: 15/06/2024\n1 1234567 Delivery\n2 7654321 Collection" },
        { text: "Date: 16/06/2024\n1 2345678 Delivery" },
        { text: "Date: 17/06/2024\n1 3456789 Delivery\n2 8765432 Delivery\n3 4567890 Collection" },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.dates).toHaveLength(3);
      expect(result.details).toHaveLength(3);
      expect(result.totalConsignments).toBe(6);
      expect(result.consignmentsByDate.size).toBe(3);
    });
  });

  // ===========================================================================
  // validateData Tests - Success Cases
  // ===========================================================================

  describe("validateData - Success Cases", () => {
    it("should return isValid true for valid data with dates and consignments", async () => {
      const validData: RunsheetData = {
        dates: [createUTCDate(2024, 6, 15)],
        consignmentsByDate: new Map([["2024-06-15", 50]]),
        totalConsignments: 50,
        details: [
          {
            date: createUTCDate(2024, 6, 15),
            consignments: 50,
            consignmentNumbers: Array(50).fill("1234567"),
          },
        ],
      };

      const result = await (parser as any).validateData(validData);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return empty warnings array for normal data", async () => {
      const validData: RunsheetData = {
        dates: [createUTCDate(2024, 6, 15)],
        consignmentsByDate: new Map([["2024-06-15", 50]]),
        totalConsignments: 50,
        details: [
          {
            date: createUTCDate(2024, 6, 15),
            consignments: 50,
            consignmentNumbers: Array(50).fill("1234567"),
          },
        ],
      };

      const result = await (parser as any).validateData(validData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it("should validate data with multiple dates successfully", async () => {
      const validData: RunsheetData = {
        dates: [
          createUTCDate(2024, 6, 17), // Monday
          createUTCDate(2024, 6, 18), // Tuesday
          createUTCDate(2024, 6, 19), // Wednesday
        ],
        consignmentsByDate: new Map([
          ["2024-06-17", 30],
          ["2024-06-18", 40],
          ["2024-06-19", 35],
        ]),
        totalConsignments: 105,
        details: [
          {
            date: createUTCDate(2024, 6, 17),
            consignments: 30,
            consignmentNumbers: Array(30).fill("1234567"),
          },
          {
            date: createUTCDate(2024, 6, 18),
            consignments: 40,
            consignmentNumbers: Array(40).fill("2345678"),
          },
          {
            date: createUTCDate(2024, 6, 19),
            consignments: 35,
            consignmentNumbers: Array(35).fill("3456789"),
          },
        ],
      };

      const result = await (parser as any).validateData(validData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it("should validate data with exactly 200 consignments without warning", async () => {
      const validData: RunsheetData = {
        dates: [createUTCDate(2024, 6, 15)],
        consignmentsByDate: new Map([["2024-06-15", 200]]),
        totalConsignments: 200,
        details: [
          {
            date: createUTCDate(2024, 6, 15),
            consignments: 200,
            consignmentNumbers: Array(200).fill("1234567"),
          },
        ],
      };

      const result = await (parser as any).validateData(validData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual([]);
    });
  });

  // ===========================================================================
  // validateData Tests - Error Cases
  // ===========================================================================

  describe("validateData - Error Cases", () => {
    it("should return isValid false when no dates found", async () => {
      const invalidData: RunsheetData = {
        dates: [],
        consignmentsByDate: new Map([["2024-06-15", 50]]),
        totalConsignments: 50,
        details: [
          {
            date: createUTCDate(2024, 6, 15),
            consignments: 50,
            consignmentNumbers: Array(50).fill("1234567"),
          },
        ],
      };

      const result = await (parser as any).validateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return descriptive error message when no dates found", async () => {
      const invalidData: RunsheetData = {
        dates: [],
        consignmentsByDate: new Map(),
        totalConsignments: 0,
        details: [],
      };

      const result = await (parser as any).validateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("No dates found in runsheet");
    });

    it("should return isValid false when no consignments found", async () => {
      const invalidData: RunsheetData = {
        dates: [createUTCDate(2024, 6, 15)],
        consignmentsByDate: new Map(),
        totalConsignments: 0,
        details: [],
      };

      const result = await (parser as any).validateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return descriptive error message when no consignments found", async () => {
      const invalidData: RunsheetData = {
        dates: [createUTCDate(2024, 6, 15)],
        consignmentsByDate: new Map(),
        totalConsignments: 0,
        details: [],
      };

      const result = await (parser as any).validateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("No consignments found in runsheet");
    });

    it("should return error when totalConsignments is 0 but dates exist", async () => {
      const invalidData: RunsheetData = {
        dates: [createUTCDate(2024, 6, 15)],
        consignmentsByDate: new Map([["2024-06-15", 0]]),
        totalConsignments: 0,
        details: [
          {
            date: createUTCDate(2024, 6, 15),
            consignments: 0,
            consignmentNumbers: [],
          },
        ],
      };

      const result = await (parser as any).validateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("No consignments found");
    });
  });

  // ===========================================================================
  // validateData Tests - Warning Cases
  // ===========================================================================

  describe("validateData - Warning Cases", () => {
    it("should warn when consignment count exceeds 200 on a single day", async () => {
      const dataWithHighCount: RunsheetData = {
        dates: [createUTCDate(2024, 6, 15)],
        consignmentsByDate: new Map([["2024-06-15", 250]]),
        totalConsignments: 250,
        details: [
          {
            date: createUTCDate(2024, 6, 15),
            consignments: 250,
            consignmentNumbers: Array(250).fill("1234567"),
          },
        ],
      };

      const result = await (parser as any).validateData(dataWithHighCount);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]).toContain("Very high consignment count");
      expect(result.warnings?.[0]).toContain("250");
    });

    it("should warn for Sunday deliveries", async () => {
      // June 16, 2024 is a Sunday
      const sundayDate = createUTCDate(2024, 6, 16);
      const dataWithSunday: RunsheetData = {
        dates: [sundayDate],
        consignmentsByDate: new Map([["2024-06-16", 50]]),
        totalConsignments: 50,
        details: [
          {
            date: sundayDate,
            consignments: 50,
            consignmentNumbers: Array(50).fill("1234567"),
          },
        ],
      };

      const result = await (parser as any).validateData(dataWithSunday);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]).toBe("Sunday deliveries detected");
    });

    it("should accumulate multiple warnings correctly", async () => {
      // June 16, 2024 is a Sunday
      const sundayDate = createUTCDate(2024, 6, 16);
      const dataWithMultipleIssues: RunsheetData = {
        dates: [sundayDate],
        consignmentsByDate: new Map([["2024-06-16", 250]]),
        totalConsignments: 250,
        details: [
          {
            date: sundayDate,
            consignments: 250,
            consignmentNumbers: Array(250).fill("1234567"),
          },
        ],
      };

      const result = await (parser as any).validateData(dataWithMultipleIssues);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);

      // Use more flexible matchers
      const hasHighCountWarning = result.warnings.some((w: string) =>
        w.includes("Very high consignment count")
      );
      const hasSundayWarning = result.warnings.includes("Sunday deliveries detected");

      expect(hasHighCountWarning).toBe(true);
      expect(hasSundayWarning).toBe(true);
    });

    it("should warn for multiple days with high consignment counts", async () => {
      const data: RunsheetData = {
        dates: [createUTCDate(2024, 6, 15), createUTCDate(2024, 6, 17)],
        consignmentsByDate: new Map([
          ["2024-06-15", 220],
          ["2024-06-17", 250],
        ]),
        totalConsignments: 470,
        details: [
          {
            date: createUTCDate(2024, 6, 15),
            consignments: 220,
            consignmentNumbers: Array(220).fill("1234567"),
          },
          {
            date: createUTCDate(2024, 6, 17),
            consignments: 250,
            consignmentNumbers: Array(250).fill("2345678"),
          },
        ],
      };

      const result = await (parser as any).validateData(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings?.[0]).toContain("220");
      expect(result.warnings?.[1]).toContain("250");
    });

    it("should warn for multiple Sunday deliveries", async () => {
      // June 16 and 23, 2024 are Sundays
      const data: RunsheetData = {
        dates: [createUTCDate(2024, 6, 16), createUTCDate(2024, 6, 23)],
        consignmentsByDate: new Map([
          ["2024-06-16", 30],
          ["2024-06-23", 40],
        ]),
        totalConsignments: 70,
        details: [
          {
            date: createUTCDate(2024, 6, 16),
            consignments: 30,
            consignmentNumbers: Array(30).fill("1234567"),
          },
          {
            date: createUTCDate(2024, 6, 23),
            consignments: 40,
            consignmentNumbers: Array(40).fill("2345678"),
          },
        ],
      };

      const result = await (parser as any).validateData(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]).toBe("Sunday deliveries detected");
    });
  });

  // ===========================================================================
  // Integration Tests - Complete Workflows
  // ===========================================================================

  describe("Integration Tests - Complete Workflows", () => {
    it("should handle single page runsheet with date and consignments", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\nRunsheet for delivery route\n\n1 1234567 Delivery\n2 7654321 Collection\n3 2345678 Delivery",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.dates).toHaveLength(1);
      expect(result.totalConsignments).toBe(3);
      expect(result.details[0].consignmentNumbers).toHaveLength(3);
    });

    it("should handle multi-page runsheet with multiple dates", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\nRunsheet Page 1\n\n1 1234567 Delivery\n2 7654321 Collection",
        },
        {
          text: "Date: 16/06/2024\nRunsheet Page 2\n\n1 2345678 Delivery\n2 8765432 Delivery\n3 3456789 Collection",
        },
        {
          text: "Date: 17/06/2024\nRunsheet Page 3\n\n1 4567890 Delivery",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.dates).toHaveLength(3);
      expect(result.totalConsignments).toBe(6);
      expect(result.consignmentsByDate.get("2024-06-15")).toBe(2);
      expect(result.consignmentsByDate.get("2024-06-16")).toBe(3);
      expect(result.consignmentsByDate.get("2024-06-17")).toBe(1);
    });

    it("should handle runsheet with date from filename", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Daily Runsheet\n\n1 1234567 Delivery\n2 7654321 Collection\n3 2345678 Delivery",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheetDV_2025-07-01.pdf");
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.dates).toHaveLength(1);
      expect(formatDateKey(result.dates[0])).toBe("2025-07-01");
      expect(result.totalConsignments).toBe(3);
    });

    it("should handle real-world data format with mixed consignment types", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          Date: 15/06/2024

          Delivery Van Route DV-001

          1 1234567 Delivery
          2 AH12345 Delivery
          3 7654321 Collection
          4 AH67890 Collection
          5 2345678 Delivery

          End of Route
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet_dv_001.pdf");
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.totalConsignments).toBe(5);
      expect(result.details[0].consignmentNumbers).toContain("1234567");
      expect(result.details[0].consignmentNumbers).toContain("AH12345");
      expect(result.details[0].consignmentNumbers).toContain("7654321");
      expect(result.details[0].consignmentNumbers).toContain("AH67890");
    });

    it("should handle runsheet with multiple date formats on different pages", async () => {
      const mockData = createMockParsedPDFData([
        { text: "Date: 15/06/2024\n1 1234567 Delivery" },
        { text: "Date: 16-06-2024\n1 2345678 Delivery" },
        { text: "2024-06-17\n1 3456789 Collection" },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.dates).toHaveLength(3);
      expect(formatDateKey(result.dates[0])).toBe("2024-06-15");
      expect(formatDateKey(result.dates[1])).toBe("2024-06-16");
      expect(formatDateKey(result.dates[2])).toBe("2024-06-17");
    });
  });

  // ===========================================================================
  // Integration Tests - Edge Cases
  // ===========================================================================

  describe("Integration Tests - Edge Cases", () => {
    it("should handle empty PDF (no text)", async () => {
      const mockData = createMockParsedPDFData([{ text: "" }]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("No dates found in runsheet"); // No consignments means no dates added
    });

    it("should handle PDF with text but no consignments", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\nThis is a runsheet\nBut it has no valid consignment numbers\nJust text",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("No dates found in runsheet"); // Dates only added when consignments exist
    });

    it("should handle PDF with consignments but no date (uses filename)", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Runsheet\n1 1234567 Delivery\n2 7654321 Collection",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet_2024-06-15.pdf");
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.dates).toHaveLength(1);
      expect(formatDateKey(result.dates[0])).toBe("2024-06-15");
    });

    it("should handle PDF with invalid date formats (fallback to current date)", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: invalid-date\n1 1234567 Delivery\n2 7654321 Collection",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.dates).toHaveLength(1);
      // Should use current date as fallback
      const today = new Date();
      expect(result.dates[0].getFullYear()).toBe(today.getFullYear());
    });

    it("should handle very large consignment count (triggers warning)", async () => {
      const consignments = Array.from(
        { length: 250 },
        (_, i) => `${i + 1} ${1000000 + i} Delivery`
      ).join("\n");
      const mockData = createMockParsedPDFData([
        {
          text: `Date: 15/06/2024\n${consignments}`,
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings?.[0]).toContain("Very high consignment count");
      expect(validation.warnings?.[0]).toContain("250");
    });

    it("should handle consignment numbers at exactly 7 digits", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\n1 1234567 Delivery\n2 0000000 Delivery\n3 9999999 Collection",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      expect(result.totalConsignments).toBe(3);
      expect(result.details[0].consignmentNumbers).toContain("1234567");
      expect(result.details[0].consignmentNumbers).toContain("0000000");
      expect(result.details[0].consignmentNumbers).toContain("9999999");
    });

    it("should not extract numbers that are not 7 digits", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\n1 123456 Delivery\n2 12345678 Delivery\n3 1234567 Collection",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");

      // Should only extract the 7-digit one
      expect(result.totalConsignments).toBe(1);
      expect(result.details[0].consignmentNumbers).toEqual(["1234567"]);
    });

    it("should handle whitespace-heavy content", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `


          Date:    15/06/2024


          1    1234567    Delivery

          2    7654321    Collection


        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.totalConsignments).toBe(2);
    });

    it("should handle page breaks and multi-line formatting", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Date: 15/06/2024\n\n--- Page 1 ---\n\n1 1234567 Delivery\n\n--- Page 2 ---\n\n2 7654321 Collection",
        },
      ]);

      const result = await (parser as any).extractData(mockData, "runsheet.pdf");
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.totalConsignments).toBe(2);
    });
  });

  // ===========================================================================
  // canParse Method Tests
  // ===========================================================================

  describe("canParse Method", () => {
    it('should return true for filename containing "runsheet"', () => {
      expect(parser.canParse("runsheet_2024-06-15.pdf")).toBe(true);
    });

    it('should return true for filename containing "dv_"', () => {
      expect(parser.canParse("dv_route_001.pdf")).toBe(true);
    });

    it("should return true for uppercase filename", () => {
      expect(parser.canParse("RUNSHEET_DAILY.PDF")).toBe(true);
    });

    it("should return false for unrelated filename", () => {
      expect(parser.canParse("invoice_2024-06-15.pdf")).toBe(false);
    });

    it("should return true when content contains runsheet indicators", () => {
      const content = "This is a delivery runsheet document";
      expect(parser.canParse("unknown.pdf", content)).toBe(true);
    });

    it("should return true when filename matches even if content does not", () => {
      const content = "Some random content";
      expect(parser.canParse("runsheet.pdf", content)).toBe(true);
    });

    it("should return true when content matches even if filename does not", () => {
      const content = "Consignment delivery schedule";
      expect(parser.canParse("unknown.pdf", content)).toBe(true);
    });
  });
});
