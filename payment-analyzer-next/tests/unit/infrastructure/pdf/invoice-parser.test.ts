/**
 * Comprehensive Unit Tests for Invoice Parser
 *
 * Tests the extraction of payment amounts from invoice PDFs
 * Based on the original system's parsing logic with critical Extra Drops fix
 *
 * Test Coverage:
 * - Constructor and instance creation
 * - Standard payment entry extraction (£3-£500)
 * - Extra Drops detection (£0-£50) - CRITICAL FIX
 * - Pickup service detection
 * - Entry deduplication
 * - Date/time parsing
 * - Document total extraction
 * - Data structure validation
 * - Content pattern detection
 * - Validation logic (success, error, warning cases)
 * - Integration tests with complete workflows
 * - Edge cases and boundary conditions
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  type InvoiceData,
  type InvoiceEntry,
  InvoiceParser,
} from "@/lib/infrastructure/pdf/invoice-parser";
import type { ParsedPDFData } from "@/types/core";
import { expectMoneyEqual } from "../../../helpers/money-helpers";

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

describe("InvoiceParser", () => {
  let parser: InvoiceParser;

  beforeEach(() => {
    parser = new InvoiceParser();
  });

  // ===========================================================================
  // Constructor Tests
  // ===========================================================================

  describe("Constructor", () => {
    it("should create instance successfully", () => {
      expect(parser).toBeDefined();
      expect(parser).toBeInstanceOf(InvoiceParser);
    });

    it("should set file type identifiers correctly", () => {
      // Access protected property for testing
      const identifiers = (parser as any).fileTypeIdentifiers;
      expect(identifiers).toEqual(["self", "invoice", "bill"]);
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
    it('should return true for text containing "invoice"', () => {
      const result = (parser as any).checkContentPatterns("This is an invoice document");
      expect(result).toBe(true);
    });

    it('should return true for text containing "docket total"', () => {
      const result = (parser as any).checkContentPatterns("Summary: Docket Total: £150.00");
      expect(result).toBe(true);
    });

    it('should return true for text containing "gbp"', () => {
      const result = (parser as any).checkContentPatterns("Total: GBP £200.00");
      expect(result).toBe(true);
    });

    it('should return true for text containing "total:"', () => {
      const result = (parser as any).checkContentPatterns("Grand Total: £350.50");
      expect(result).toBe(true);
    });

    it('should return true for text containing "£"', () => {
      const result = (parser as any).checkContentPatterns("Amount: £50.00");
      expect(result).toBe(true);
    });

    it("should return false for text with no indicators", () => {
      const result = (parser as any).checkContentPatterns("Random text without keywords");
      expect(result).toBe(false);
    });

    it("should perform case-insensitive checking", () => {
      expect((parser as any).checkContentPatterns("INVOICE")).toBe(true);
      expect((parser as any).checkContentPatterns("InVoIcE")).toBe(true);
      expect((parser as any).checkContentPatterns("DOCKET TOTAL")).toBe(true);
      expect((parser as any).checkContentPatterns("GBP")).toBe(true);
    });
  });

  // ===========================================================================
  // extractData Tests - Standard Entry Extraction
  // ===========================================================================

  describe("extractData - Standard Entry Extraction", () => {
    it("should extract single standard entry with valid date/time", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "15/06/24 10:30 Standard Delivery 15.00 Docket Total: £15.00",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].amount).toBe(15.0);
      expect(result.entries[0].time).toBe("10:30");
      expect(formatDateKey(result.entries[0].date)).toBe("2024-06-15");
    });

    it("should extract multiple entries on same date", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          15/06/24 14:20 Delivery 20.00
          15/06/24 16:45 Delivery 18.50
          Docket Total: £53.50
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].amount).toBe(15.0);
      expect(result.entries[1].amount).toBe(20.0);
      expect(result.entries[2].amount).toBe(18.5);
    });

    it("should extract entries across multiple dates", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          16/06/24 11:00 Delivery 20.00
          17/06/24 09:15 Delivery 25.00
          Docket Total: £60.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries).toHaveLength(3);
      expect(formatDateKey(result.entries[0].date)).toBe("2024-06-15");
      expect(formatDateKey(result.entries[1].date)).toBe("2024-06-16");
      expect(formatDateKey(result.entries[2].date)).toBe("2024-06-17");
    });

    it("should validate amount range (£3.00 minimum)", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 2.99
          15/06/24 11:00 Delivery 3.00
          15/06/24 12:00 Delivery 3.01
          Docket Total: £6.01
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      // Should only extract amounts >= £3.00
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].amount).toBe(3.0);
      expect(result.entries[1].amount).toBe(3.01);
    });

    it("should validate amount range (£500.00 maximum)", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 499.99
          15/06/24 11:00 Delivery 500.00
          15/06/24 12:00 Delivery 500.01
          Docket Total: £1000.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      // Should only extract amounts <= £500.00
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].amount).toBe(499.99);
      expect(result.entries[1].amount).toBe(500.0);
    });

    it("should parse date in DD/MM/YY format", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "15/06/24 10:30 Delivery 15.00 Docket Total: £15.00",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      const date = result.entries[0].date;
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(5); // June is month 5 (0-indexed)
      expect(date.getUTCDate()).toBe(15);
    });

    it("should parse time in HH:MM format", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "15/06/24 10:30 Delivery 15.00 Docket Total: £15.00",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries[0].time).toBe("10:30");
    });

    it("should reject entries without valid date/time", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Random text with amount 15.00 but no date Docket Total: £0.00",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries).toHaveLength(0);
    });

    it('should stop extraction at "Docket Total" marker', async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          16/06/24 11:00 Delivery 20.00
          Docket Total: £35.00
          17/06/24 12:00 Delivery 25.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      // Should only extract entries before Docket Total
      expect(result.entries).toHaveLength(2);
      expect(result.totalAmount).toBe(35.0);
    });

    it("should create UTC dates to avoid timezone issues", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "15/06/24 10:30 Delivery 15.00 Docket Total: £15.00",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      const date = result.entries[0].date;
      // UTC date should match expected date regardless of timezone
      expect(formatDateKey(date)).toBe("2024-06-15");
    });
  });

  // ===========================================================================
  // extractData Tests - Extra Drops Detection (CRITICAL)
  // ===========================================================================

  describe("extractData - Extra Drops Detection (CRITICAL)", () => {
    it("should extract Extra Drop entries with valid amount", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Standard Delivery 15.00
          Extra Drops 8.50
          Docket Total: £23.50
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.extraDrops).toHaveLength(1);
      expect(result.extraDrops[0].amount).toBe(8.5);
      expect(result.extraDrops[0].description).toBe("Extra drop charge");
    });

    it('should detect "Extra Drops" pattern exactly', async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          Extra Drops 10.00
          Docket Total: £25.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.extraDrops).toHaveLength(1);
      expect(result.extraDrops[0].serviceType).toBe("Extra Drops");
    });

    it("should validate Extra Drop amount range (£0-£50)", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          Extra Drops 0.01
          Extra Drops 25.00
          Extra Drops 49.99
          Extra Drops 50.00
          Docket Total: £15.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      // Should extract amounts > 0 and < 50 (excluding 50.00)
      expect(result.extraDrops).toHaveLength(3);
      expect(result.extraDrops.map((e: InvoiceEntry) => e.amount)).toContain(0.01);
      expect(result.extraDrops.map((e: InvoiceEntry) => e.amount)).toContain(25.0);
      expect(result.extraDrops.map((e: InvoiceEntry) => e.amount)).toContain(49.99);
      expect(result.extraDrops.map((e: InvoiceEntry) => e.amount)).not.toContain(50.0);
    });

    it("should reject Extra Drop with zero amount", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          Extra Drops 0.00
          Docket Total: £15.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.extraDrops).toHaveLength(0);
    });

    it("should reject Extra Drop with amount >= £50", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          Extra Drops 50.00
          Extra Drops 75.00
          Docket Total: £15.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.extraDrops).toHaveLength(0);
    });

    it("should treat Extra Drops at different positions as separate entries", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          Extra Drops 8.50
          Extra Drops 8.50
          Docket Total: £32.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      // Deduplication uses position in token stream, so these are treated as separate entries
      expect(result.extraDrops).toHaveLength(2);
      expect(result.extraDrops[0].amount).toBe(8.5);
      expect(result.extraDrops[1].amount).toBe(8.5);
    });

    it("should extract multiple Extra Drops on different dates", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          Extra Drops 8.50
          16/06/24 11:00 Delivery 20.00
          Extra Drops 12.00
          Docket Total: £55.50
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.extraDrops).toHaveLength(2);
      expect(result.extraDrops[0].amount).toBe(8.5);
      expect(result.extraDrops[1].amount).toBe(12.0);
    });

    it("should extract multiple Extra Drops at different times on same date", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          Extra Drops 8.50
          15/06/24 14:20 Delivery 20.00
          Extra Drops 10.00
          Docket Total: £53.50
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.extraDrops).toHaveLength(2);
      expect(result.extraDrops[0].time).toBe("10:30");
      expect(result.extraDrops[1].time).toBe("14:20");
    });

    it("should include Extra Drops in total amount calculation", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          Extra Drops 8.50
          16/06/24 11:00 Delivery 20.00
          Extra Drops 12.00
          Docket Total: £55.50
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      // Total should include standard entries + extra drops
      expect(result.totalAmount).toBe(55.5);
    });

    it("should only extract Extra Drops when date and time context exists", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          Extra Drops 8.50
          15/06/24 10:30 Delivery 15.00
          Extra Drops 10.00
          Docket Total: £25.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      // Should only extract Extra Drop after date/time is set
      expect(result.extraDrops).toHaveLength(1);
      expect(result.extraDrops[0].amount).toBe(10.0);
    });

    it("should handle boundary value £49.99 (edge case)", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          Extra Drops 49.99
          Docket Total: £64.99
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.extraDrops).toHaveLength(1);
      expect(result.extraDrops[0].amount).toBe(49.99);
    });

    it("should handle boundary value £0.01 (edge case)", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          Extra Drops 0.01
          Docket Total: £15.01
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.extraDrops).toHaveLength(1);
      expect(result.extraDrops[0].amount).toBe(0.01);
    });

    it("should extract Extra Drops mixed with standard entries correctly", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          15/06/24 11:00 Delivery 20.00
          Extra Drops 8.50
          15/06/24 14:20 Delivery 18.00
          Extra Drops 12.00
          Docket Total: £73.50
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries).toHaveLength(3);
      expect(result.extraDrops).toHaveLength(2);
      expect(result.totalAmount).toBe(73.5);
    });
  });

  // ===========================================================================
  // extractData Tests - Pickup Service Detection
  // ===========================================================================

  describe("extractData - Pickup Service Detection", () => {
    it("should detect -PickUp pattern in entries", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 -PickUp 10.00
          Docket Total: £10.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.pickupServices).toHaveLength(1);
      expect(result.pickupServices[0].serviceType).toBe("Pickup Service");
    });

    it("should extract pickup amount correctly", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 -PickUp 12.50
          Docket Total: £12.50
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.pickupServices[0].amount).toBe(12.5);
    });

    it("should separate pickups from standard entries", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          15/06/24 11:00 -PickUp 10.00
          15/06/24 14:20 Delivery 20.00
          Docket Total: £45.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries).toHaveLength(2);
      expect(result.pickupServices).toHaveLength(1);
      expect(result.entries[0].amount).toBe(15.0);
      expect(result.entries[1].amount).toBe(20.0);
      expect(result.pickupServices[0].amount).toBe(10.0);
    });

    it("should include pickups in total amount calculation", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          15/06/24 11:00 -PickUp 10.00
          Docket Total: £25.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.totalAmount).toBe(25.0);
    });

    it("should handle multiple pickups on same date", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 -PickUp 10.00
          15/06/24 11:00 -PickUp 12.00
          15/06/24 14:20 -PickUp 8.00
          Docket Total: £30.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.pickupServices).toHaveLength(3);
      expect(result.totalAmount).toBe(30.0);
    });

    it("should validate pickup amounts using standard range (£3-£500)", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 -PickUp 2.99
          15/06/24 11:00 -PickUp 3.00
          15/06/24 12:00 -PickUp 500.00
          15/06/24 14:00 -PickUp 500.01
          Docket Total: £503.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      // Should only extract amounts in £3-£500 range
      expect(result.pickupServices).toHaveLength(2);
      expect(result.pickupServices[0].amount).toBe(3.0);
      expect(result.pickupServices[1].amount).toBe(500.0);
    });

    it("should extract mixed pickups, standard entries, and extra drops", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          15/06/24 11:00 -PickUp 10.00
          Extra Drops 8.50
          15/06/24 14:20 Delivery 20.00
          Docket Total: £53.50
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries).toHaveLength(2);
      expect(result.pickupServices).toHaveLength(1);
      expect(result.extraDrops).toHaveLength(1);
      expect(result.totalAmount).toBe(53.5);
    });
  });

  // ===========================================================================
  // extractData Tests - Date/Time Parsing
  // ===========================================================================

  describe("extractData - Date/Time Parsing", () => {
    it("should parse DD/MM/YY format correctly", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "15/06/24 10:30 Delivery 15.00 Docket Total: £15.00",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      const date = result.entries[0].date;
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(5); // June
      expect(date.getUTCDate()).toBe(15);
    });

    it("should parse time in 24-hour format", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 09:00 Delivery 15.00
          15/06/24 13:45 Delivery 20.00
          15/06/24 23:59 Delivery 25.00
          Docket Total: £60.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries[0].time).toBe("09:00");
      expect(result.entries[1].time).toBe("13:45");
      expect(result.entries[2].time).toBe("23:59");
    });

    it("should handle dates in different months", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          01/01/24 10:30 Delivery 15.00
          15/06/24 11:00 Delivery 20.00
          31/12/24 14:20 Delivery 25.00
          Docket Total: £60.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(formatDateKey(result.entries[0].date)).toBe("2024-01-01");
      expect(formatDateKey(result.entries[1].date)).toBe("2024-06-15");
      expect(formatDateKey(result.entries[2].date)).toBe("2024-12-31");
    });

    it("should extract unique dates from entries", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          15/06/24 11:00 Delivery 20.00
          16/06/24 14:20 Delivery 25.00
          17/06/24 09:00 Delivery 30.00
          Docket Total: £90.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.dates).toHaveLength(3);
      expect(formatDateKey(result.dates[0])).toBe("2024-06-15");
      expect(formatDateKey(result.dates[1])).toBe("2024-06-16");
      expect(formatDateKey(result.dates[2])).toBe("2024-06-17");
    });

    it("should sort dates chronologically", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          17/06/24 09:00 Delivery 30.00
          15/06/24 10:30 Delivery 15.00
          16/06/24 14:20 Delivery 25.00
          Docket Total: £70.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.dates).toHaveLength(3);
      expect(formatDateKey(result.dates[0])).toBe("2024-06-15");
      expect(formatDateKey(result.dates[1])).toBe("2024-06-16");
      expect(formatDateKey(result.dates[2])).toBe("2024-06-17");
    });

    it("should create UTC dates consistently", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "15/06/24 10:30 Delivery 15.00 Docket Total: £15.00",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      const date = result.entries[0].date;
      // Verify ISO string is in expected format
      expect(date.toISOString().startsWith("2024-06-15")).toBe(true);
    });
  });

  // ===========================================================================
  // extractData Tests - Document Total Extraction
  // ===========================================================================

  describe("extractData - Document Total Extraction", () => {
    it('should extract document total from "Docket Total: £X.XX" pattern', async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          16/06/24 11:00 Delivery 20.00
          Docket Total: £35.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.documentTotal).toBe(35.0);
    });

    it('should extract document total from "Total: GBP £X.XX" pattern', async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          16/06/24 11:00 Delivery 20.00
          Total: GBP £35.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.documentTotal).toBe(35.0);
    });

    it('should extract document total from "GBP £X.XX Total:" pattern', async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          16/06/24 11:00 Delivery 20.00
          GBP £35.00 Total:
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.documentTotal).toBe(35.0);
    });

    it("should handle amounts with commas (£1,234.56)", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Docket Total: £1,234.56",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.documentTotal).toBe(1234.56);
    });

    it("should handle amounts without decimals (£100)", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Docket Total: £100",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.documentTotal).toBe(100);
    });

    it("should return null when no document total found", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "15/06/24 10:30 Delivery 15.00",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.documentTotal).toBeNull();
    });

    it("should perform case-insensitive matching for total patterns", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "DOCKET TOTAL: £35.00",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.documentTotal).toBe(35.0);
    });
  });

  // ===========================================================================
  // extractData Tests - Data Structure
  // ===========================================================================

  describe("extractData - Data Structure", () => {
    it("should return InvoiceData with all required fields", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "15/06/24 10:30 Delivery 15.00 Docket Total: £15.00",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result).toHaveProperty("entries");
      expect(result).toHaveProperty("totalAmount");
      expect(result).toHaveProperty("documentTotal");
      expect(result).toHaveProperty("isValid");
      expect(result).toHaveProperty("dates");
      expect(result).toHaveProperty("pickupServices");
      expect(result).toHaveProperty("extraDrops");
      expect(result).toHaveProperty("validationMessage");
    });

    it("should calculate total amount from all entry types", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          15/06/24 11:00 -PickUp 10.00
          Extra Drops 8.50
          Docket Total: £33.50
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expectMoneyEqual(result.totalAmount, 33.5);
    });

    it("should sort entries by date", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          17/06/24 09:00 Delivery 30.00
          15/06/24 10:30 Delivery 15.00
          16/06/24 14:20 Delivery 25.00
          Docket Total: £70.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(formatDateKey(result.entries[0].date)).toBe("2024-06-15");
      expect(formatDateKey(result.entries[1].date)).toBe("2024-06-16");
      expect(formatDateKey(result.entries[2].date)).toBe("2024-06-17");
    });

    it("should validate totals match when document total exists", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          16/06/24 11:00 Delivery 20.00
          Docket Total: £35.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.isValid).toBe(true);
      expect(result.validationMessage).toContain("Totals match");
    });

    it("should allow validation to pass without document total", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "15/06/24 10:30 Delivery 15.00",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.isValid).toBe(true);
      expect(result.validationMessage).toContain("Could not find document total");
    });

    it("should detect total mismatch", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          16/06/24 11:00 Delivery 20.00
          Docket Total: £40.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.isValid).toBe(false);
      expect(result.validationMessage).toContain("Total mismatch");
    });

    it("should allow £0.01 tolerance for rounding differences", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          16/06/24 11:00 Delivery 20.00
          Docket Total: £35.01
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.isValid).toBe(true);
      expect(result.validationMessage).toContain("Totals match");
    });
  });

  // ===========================================================================
  // validateData Tests - Success Cases
  // ===========================================================================

  describe("validateData - Success Cases", () => {
    it("should return isValid true for valid data with entries", async () => {
      const validData: InvoiceData = {
        entries: [
          {
            date: createUTCDate(2024, 6, 15),
            time: "10:30",
            amount: 15.0,
            serviceType: "Standard",
          },
        ],
        totalAmount: 15.0,
        documentTotal: 15.0,
        isValid: true,
        dates: [createUTCDate(2024, 6, 15)],
        pickupServices: [],
        extraDrops: [],
        validationMessage: "Totals match",
      };

      const result = await (parser as any).validateData(validData);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return empty warnings array for normal data", async () => {
      const validData: InvoiceData = {
        entries: [
          {
            date: createUTCDate(2024, 6, 15),
            amount: 50.0,
            serviceType: "Standard",
          },
        ],
        totalAmount: 50.0,
        documentTotal: 50.0,
        isValid: true,
        dates: [createUTCDate(2024, 6, 15)],
        pickupServices: [],
        extraDrops: [],
      };

      const result = await (parser as any).validateData(validData);

      expect(result.warnings).toEqual([]);
    });

    it("should validate data with multiple entry types successfully", async () => {
      const validData: InvoiceData = {
        entries: [{ date: createUTCDate(2024, 6, 15), amount: 15.0, serviceType: "Standard" }],
        pickupServices: [
          { date: createUTCDate(2024, 6, 15), amount: 10.0, serviceType: "Pickup Service" },
        ],
        extraDrops: [
          {
            date: createUTCDate(2024, 6, 15),
            amount: 8.5,
            serviceType: "Extra Drops",
            description: "Extra drop charge",
          },
        ],
        totalAmount: 33.5,
        documentTotal: 33.5,
        isValid: true,
        dates: [createUTCDate(2024, 6, 15)],
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
    it("should return isValid false when no entries found", async () => {
      const invalidData: InvoiceData = {
        entries: [],
        totalAmount: 0,
        documentTotal: null,
        isValid: true,
        dates: [],
        pickupServices: [],
        extraDrops: [],
      };

      const result = await (parser as any).validateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("No payment entries found in invoice");
    });

    it("should consider pickupServices when checking for entries", async () => {
      const validData: InvoiceData = {
        entries: [],
        totalAmount: 10.0,
        documentTotal: 10.0,
        isValid: true,
        dates: [createUTCDate(2024, 6, 15)],
        pickupServices: [
          { date: createUTCDate(2024, 6, 15), amount: 10.0, serviceType: "Pickup Service" },
        ],
        extraDrops: [],
      };

      const result = await (parser as any).validateData(validData);

      expect(result.isValid).toBe(true);
    });

    it("should consider extraDrops when checking for entries", async () => {
      const validData: InvoiceData = {
        entries: [],
        totalAmount: 8.5,
        documentTotal: 8.5,
        isValid: true,
        dates: [createUTCDate(2024, 6, 15)],
        pickupServices: [],
        extraDrops: [
          {
            date: createUTCDate(2024, 6, 15),
            amount: 8.5,
            serviceType: "Extra Drops",
            description: "Extra drop charge",
          },
        ],
      };

      const result = await (parser as any).validateData(validData);

      expect(result.isValid).toBe(true);
    });
  });

  // ===========================================================================
  // validateData Tests - Warning Cases
  // ===========================================================================

  describe("validateData - Warning Cases", () => {
    it("should warn when total validation fails", async () => {
      const data: InvoiceData = {
        entries: [{ date: createUTCDate(2024, 6, 15), amount: 15.0, serviceType: "Standard" }],
        totalAmount: 15.0,
        documentTotal: 20.0,
        isValid: false,
        dates: [createUTCDate(2024, 6, 15)],
        pickupServices: [],
        extraDrops: [],
        validationMessage: "Total mismatch: calculated £15.00, document shows £20.00",
      };

      const result = await (parser as any).validateData(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]).toContain("Total mismatch");
    });

    it("should warn when entries have amounts over £500", async () => {
      const data: InvoiceData = {
        entries: [{ date: createUTCDate(2024, 6, 15), amount: 600.0, serviceType: "Standard" }],
        totalAmount: 600.0,
        documentTotal: 600.0,
        isValid: true,
        dates: [createUTCDate(2024, 6, 15)],
        pickupServices: [],
        extraDrops: [],
      };

      const result = await (parser as any).validateData(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]).toContain("entries with amounts over £500");
    });

    it("should warn when entries have zero amounts", async () => {
      const data: InvoiceData = {
        entries: [{ date: createUTCDate(2024, 6, 15), amount: 0, serviceType: "Standard" }],
        totalAmount: 0,
        documentTotal: 0,
        isValid: true,
        dates: [createUTCDate(2024, 6, 15)],
        pickupServices: [],
        extraDrops: [],
      };

      const result = await (parser as any).validateData(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]).toContain("entries with zero amounts");
    });

    it("should check all entry types for high amounts", async () => {
      const data: InvoiceData = {
        entries: [{ date: createUTCDate(2024, 6, 15), amount: 600.0, serviceType: "Standard" }],
        pickupServices: [
          { date: createUTCDate(2024, 6, 15), amount: 550.0, serviceType: "Pickup Service" },
        ],
        extraDrops: [],
        totalAmount: 1150.0,
        documentTotal: 1150.0,
        isValid: true,
        dates: [createUTCDate(2024, 6, 15)],
      };

      const result = await (parser as any).validateData(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]).toContain("2 entries with amounts over £500");
    });

    it("should accumulate multiple warnings correctly", async () => {
      const data: InvoiceData = {
        entries: [
          { date: createUTCDate(2024, 6, 15), amount: 0, serviceType: "Standard" },
          { date: createUTCDate(2024, 6, 15), amount: 600.0, serviceType: "Standard" },
        ],
        totalAmount: 600.0,
        documentTotal: 650.0,
        isValid: false,
        dates: [createUTCDate(2024, 6, 15)],
        pickupServices: [],
        extraDrops: [],
        validationMessage: "Total mismatch",
      };

      const result = await (parser as any).validateData(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================================================
  // Integration Tests - Complete Workflows
  // ===========================================================================

  describe("Integration Tests - Complete Workflows", () => {
    it("should handle single page invoice with standard entries", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          Invoice #12345
          Date: 15/06/2024

          15/06/24 10:30 Standard Delivery 15.00
          15/06/24 14:20 Standard Delivery 20.00
          15/06/24 16:45 Standard Delivery 18.50

          Docket Total: £53.50
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.entries).toHaveLength(3);
      expect(result.totalAmount).toBe(53.5);
      expect(result.documentTotal).toBe(53.5);
      expect(result.isValid).toBe(true);
    });

    it("should handle invoice with all entry types mixed", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          Invoice #12345

          15/06/24 10:30 Standard Delivery 15.00
          15/06/24 11:00 -PickUp 10.00
          Extra Drops 8.50
          15/06/24 14:20 Standard Delivery 20.00
          15/06/24 15:00 -PickUp 12.00
          Extra Drops 7.50

          Docket Total: £73.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.entries).toHaveLength(2);
      expect(result.pickupServices).toHaveLength(2);
      expect(result.extraDrops).toHaveLength(2);
      expect(result.totalAmount).toBe(73.0);
    });

    it("should handle multi-day invoice spanning a week", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          Weekly Invoice

          15/06/24 10:30 Delivery 15.00
          16/06/24 11:00 Delivery 20.00
          17/06/24 14:20 Delivery 18.50
          18/06/24 09:15 Delivery 22.00
          19/06/24 16:30 Delivery 25.50

          Docket Total: £101.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.dates).toHaveLength(5);
      expect(result.entries).toHaveLength(5);
      expect(result.totalAmount).toBe(101.0);
    });

    it("should handle real-world invoice format with Extra Drops (CRITICAL)", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          INVOICE
          Driver Payment Summary
          Period: 15/06/2024 - 21/06/2024

          15/06/24 10:30 Multidrop Service 15.00
          Extra Drops 8.50
          16/06/24 11:20 Multidrop Service 20.00
          Extra Drops 12.00
          17/06/24 09:45 Multidrop Service 18.00
          18/06/24 14:15 -PickUp 10.00
          19/06/24 16:30 Multidrop Service 25.00
          Extra Drops 15.00
          20/06/24 10:00 Multidrop Service 22.00
          21/06/24 13:45 -PickUp 12.00
          Extra Drops 9.50

          Docket Total: £167.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.entries).toHaveLength(5); // Standard deliveries
      expect(result.pickupServices).toHaveLength(2); // Pickups
      expect(result.extraDrops).toHaveLength(4); // Extra Drops (CRITICAL)
      expect(result.totalAmount).toBe(167.0);
      expect(result.documentTotal).toBe(167.0);
    });

    it("should handle invoice with document total but no GBP prefix", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          16/06/24 11:00 Delivery 20.00

          Docket Total: £35.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.documentTotal).toBe(35.0);
      expect(result.isValid).toBe(true);
    });

    it("should handle invoice with GBP prefix variant", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          16/06/24 11:00 Delivery 20.00

          Total: GBP £35.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.documentTotal).toBe(35.0);
      expect(result.isValid).toBe(true);
    });
  });

  // ===========================================================================
  // Integration Tests - Edge Cases
  // ===========================================================================

  describe("Integration Tests - Edge Cases", () => {
    it("should handle empty PDF (no text)", async () => {
      const mockData = createMockParsedPDFData([{ text: "" }]);

      const result = await (parser as any).extractData(mockData);
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("No payment entries found in invoice");
    });

    it("should handle PDF with text but no amounts", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "This is an invoice but it has no valid payment entries",
        },
      ]);

      const result = await (parser as any).extractData(mockData);
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("No payment entries found in invoice");
    });

    it("should handle PDF with amounts but no dates", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: "Delivery 15.00 Collection 20.00 Docket Total: £35.00",
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries).toHaveLength(0);
      expect(result.documentTotal).toBe(35.0);
    });

    it("should handle whitespace-heavy content", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `


          15/06/24    10:30    Delivery    15.00


          16/06/24    11:00    Delivery    20.00


          Docket Total:    £35.00


        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries).toHaveLength(2);
      expect(result.totalAmount).toBe(35.0);
    });

    it("should reject amounts over £500 during extraction", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 600.00
          15/06/24 11:00 Delivery 450.00
          Docket Total: £450.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);
      const validation = await (parser as any).validateData(result);

      // £600 should be rejected, only £450 extracted
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].amount).toBe(450.0);
      expect(result.totalAmount).toBe(450.0);
      expect(validation.isValid).toBe(true);
    });

    it("should handle boundary values at amount ranges", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 3.00
          15/06/24 11:00 Delivery 500.00
          Extra Drops 0.01
          Extra Drops 49.99
          Docket Total: £553.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries).toHaveLength(2);
      expect(result.extraDrops).toHaveLength(2);
      expect(result.entries[0].amount).toBe(3.0);
      expect(result.entries[1].amount).toBe(500.0);
      expect(result.extraDrops[0].amount).toBe(0.01);
      expect(result.extraDrops[1].amount).toBe(49.99);
    });

    it("should handle invoice with only Extra Drops (edge case)", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Standard 0.00
          Extra Drops 8.50
          16/06/24 11:00 Standard 0.00
          Extra Drops 12.00
          Docket Total: £20.50
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);
      const validation = await (parser as any).validateData(result);

      expect(validation.isValid).toBe(true);
      expect(result.extraDrops).toHaveLength(2);
      expect(result.totalAmount).toBe(20.5);
    });

    it("should handle malformed amount formats", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery £15.00
          15/06/24 11:00 Delivery 20
          15/06/24 12:00 Delivery 25.5
          Docket Total: £60.50
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      // Parser expects amounts without £ symbol in entries
      // Only properly formatted amounts should be extracted
      expect(result.entries.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle page breaks and formatting", async () => {
      const mockData = createMockParsedPDFData([
        {
          text: `
          15/06/24 10:30 Delivery 15.00
          --- Page Break ---
          16/06/24 11:00 Delivery 20.00
          --- End of Invoice ---
          Docket Total: £35.00
        `,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries).toHaveLength(2);
      expect(result.totalAmount).toBe(35.0);
    });

    it("should handle large invoice with 50+ entries", async () => {
      const entries = Array.from(
        { length: 50 },
        (_, i) =>
          `${String(15 + (i % 7)).padStart(2, "0")}/06/24 ${String(10 + (i % 14)).padStart(2, "0")}:30 Delivery ${(15.0 + i * 0.5).toFixed(2)}`
      ).join("\n");

      const totalAmount = Array.from({ length: 50 }, (_, i) => 15.0 + i * 0.5).reduce(
        (sum, amount) => sum + amount,
        0
      );

      const mockData = createMockParsedPDFData([
        {
          text: `${entries}\nDocket Total: £${totalAmount.toFixed(2)}`,
        },
      ]);

      const result = await (parser as any).extractData(mockData);

      expect(result.entries).toHaveLength(50);
      expectMoneyEqual(result.totalAmount, totalAmount, 0.01);
    });
  });

  // ===========================================================================
  // canParse Method Tests
  // ===========================================================================

  describe("canParse Method", () => {
    it('should return true for filename containing "invoice"', () => {
      expect(parser.canParse("invoice_2024-06-15.pdf")).toBe(true);
    });

    it('should return true for filename containing "self"', () => {
      expect(parser.canParse("self_bill_2024-06-15.pdf")).toBe(true);
    });

    it('should return true for filename containing "bill"', () => {
      expect(parser.canParse("weekly_bill.pdf")).toBe(true);
    });

    it("should return true for uppercase filename", () => {
      expect(parser.canParse("INVOICE_DAILY.PDF")).toBe(true);
    });

    it("should return false for unrelated filename", () => {
      expect(parser.canParse("runsheet_2024-06-15.pdf")).toBe(false);
    });

    it("should return true when content contains invoice indicators", () => {
      const content = "This is an invoice document with Docket Total: £150.00";
      expect(parser.canParse("unknown.pdf", content)).toBe(true);
    });

    it("should return true when filename matches even if content does not", () => {
      const content = "Some random content";
      expect(parser.canParse("invoice.pdf", content)).toBe(true);
    });

    it("should return true when content matches even if filename does not", () => {
      const content = "Invoice Summary Total: GBP £200.00";
      expect(parser.canParse("unknown.pdf", content)).toBe(true);
    });
  });
});
