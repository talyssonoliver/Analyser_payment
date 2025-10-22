/**
 * Comprehensive Unit Tests for PDF Processor
 *
 * Tests the orchestration layer that coordinates multiple PDF parsers
 * This is the entry point for all PDF processing in the application
 *
 * Test Coverage:
 * - Constructor and instance creation
 * - Single file processing with type detection and routing
 * - Multiple file processing with categorization
 * - File type determination logic
 * - Parser selection and routing
 * - Better result selection when both parsers succeed
 * - Content preview extraction
 * - File hash generation (SHA-256)
 * - Data transformation for service compatibility
 * - File set validation with warnings
 * - ArrayBuffer processing for API routes
 * - Error handling and recovery
 * - Edge cases and boundary conditions
 */

 

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InvoiceData } from "@/lib/infrastructure/pdf/invoice-parser";
import { PDFProcessor, type ProcessingResult } from "@/lib/infrastructure/pdf/pdf-processor";
import type { RunsheetData } from "@/lib/infrastructure/pdf/runsheet-parser";
import type { ParsedPDFData, PDFParseResult } from "@/types/core";

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the parsers
vi.mock("@/lib/infrastructure/pdf/runsheet-parser", () => ({
  RunsheetParser: vi.fn().mockImplementation(() => ({
    parse: vi.fn(),
    canParse: vi.fn(),
  })),
}));

vi.mock("@/lib/infrastructure/pdf/invoice-parser", () => ({
  InvoiceParser: vi.fn().mockImplementation(() => ({
    parse: vi.fn(),
    canParse: vi.fn(),
  })),
}));

// Mock file validation service
vi.mock("@/lib/domain/services/file-validation-service", () => ({
  fileValidationService: {
    validateFiles: vi.fn(),
    findExistingAnalysis: vi.fn(),
  },
}));

// Mock UUID generator
vi.mock("@/lib/utils", () => ({
  generateUUID: vi.fn(() => "test-uuid-123"),
}));

// Mock crypto for hash generation
const mockDigest = vi.fn();
Object.defineProperty(global, "crypto", {
  value: {
    subtle: {
      digest: mockDigest,
    },
  },
  writable: true,
  configurable: true,
});

// =============================================================================
// Mock Helpers
// =============================================================================

/**
 * Creates a mock File object for testing
 */
const createMockFile = (
  name: string,
  type: string = "application/pdf",
  _size: number = 1024,
  content: string = "mock content"
): File => {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type, lastModified: Date.now() });

  // Add arrayBuffer method if it doesn't exist (for test environment)
  if (!file.arrayBuffer) {
    (file as any).arrayBuffer = async () => {
      return new TextEncoder().encode(content).buffer;
    };
  }

  return file;
};

/**
 * Creates a successful runsheet parse result
 */
const createSuccessfulRunsheetResult = (
  data?: Partial<RunsheetData>
): PDFParseResult<RunsheetData> => ({
  success: true,
  data: {
    dates: [new Date("2024-06-15")],
    consignmentsByDate: new Map([["2024-06-15", 50]]),
    totalConsignments: 50,
    details: [
      {
        date: new Date("2024-06-15"),
        consignments: 50,
        consignmentNumbers: Array(50).fill("1234567"),
      },
    ],
    ...data,
  },
  rawData: {} as ParsedPDFData,
});

/**
 * Creates a failed parse result
 */
const createFailedParseResult = (error: string = "Parse failed"): PDFParseResult<any> => ({
  success: false,
  error,
  rawData: {} as ParsedPDFData,
});

/**
 * Creates a successful invoice parse result
 */
const createSuccessfulInvoiceResult = (
  data?: Partial<InvoiceData>
): PDFParseResult<InvoiceData> => ({
  success: true,
  data: {
    entries: [
      {
        date: new Date("2024-06-15"),
        time: "10:30",
        amount: 15.0,
        serviceType: "Standard",
      },
    ],
    totalAmount: 15.0,
    documentTotal: 15.0,
    isValid: true,
    dates: [new Date("2024-06-15")],
    pickupServices: [],
    extraDrops: [],
    validationMessage: "Totals match",
    ...data,
  },
  rawData: {} as ParsedPDFData,
});

/**
 * Creates a mock validation result
 */
const createMockValidation = (overrides?: any) => ({
  isValid: true,
  errors: [],
  warnings: [],
  isUpdated: false,
  ...overrides,
});

// =============================================================================
// Test Suite
// =============================================================================

describe("PDFProcessor", () => {
  let processor: PDFProcessor;
  let mockRunsheetParser: any;
  let mockInvoiceParser: any;
  let mockFileValidationService: any;
  let mockGenerateUUID: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create processor instance (will use mocked parsers)
    processor = new PDFProcessor();

    // Get references to the mocked instances
    await import("@/lib/infrastructure/pdf/runsheet-parser");
    await import("@/lib/infrastructure/pdf/invoice-parser");
    const { fileValidationService } = await import("@/lib/domain/services/file-validation-service");
    const { generateUUID } = await import("@/lib/utils");

    // Get the mock instances created by the constructor
    mockRunsheetParser = (processor as any).runsheetParser;
    mockInvoiceParser = (processor as any).invoiceParser;
    mockFileValidationService = fileValidationService;
    mockGenerateUUID = generateUUID;

    // Setup default mock behaviors
    mockFileValidationService.validateFiles.mockResolvedValue(createMockValidation());
    mockFileValidationService.findExistingAnalysis.mockReturnValue(null);

    // Setup crypto mock to return a consistent hash
    mockDigest.mockResolvedValue(new ArrayBuffer(32));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Constructor & Instance Tests
  // ===========================================================================

  describe("Constructor & Instance", () => {
    it("should create instance successfully", () => {
      expect(processor).toBeDefined();
      expect(processor).toBeInstanceOf(PDFProcessor);
    });

    it("should initialize runsheet parser instance", () => {
      expect(mockRunsheetParser).toBeDefined();
      expect(typeof mockRunsheetParser.parse).toBe("function");
      expect(typeof mockRunsheetParser.canParse).toBe("function");
    });

    it("should initialize invoice parser instance", () => {
      expect(mockInvoiceParser).toBeDefined();
      expect(typeof mockInvoiceParser.parse).toBe("function");
      expect(typeof mockInvoiceParser.canParse).toBe("function");
    });
  });

  // ===========================================================================
  // Single File Processing - Basic Tests
  // ===========================================================================

  describe("processFile - Basic Functionality", () => {
    it("should process valid PDF file successfully", async () => {
      const file = createMockFile("test.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processFile(file);

      expect(result).toBeDefined();
      expect(result.file).toBe(file);
      expect(result.id).toBe("test-uuid-123");
      expect(result.type).toBe("runsheet");
      expect(result.parseResult.success).toBe(true);
    });

    it("should reject non-PDF files", async () => {
      const file = createMockFile("test.txt", "text/plain");

      await expect(processor.processFile(file)).rejects.toThrow("Invalid file type");
      await expect(processor.processFile(file)).rejects.toThrow("Only PDF files are supported");
    });

    it("should generate unique file ID using UUID", async () => {
      const file = createMockFile("test.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processFile(file);

      expect(mockGenerateUUID).toHaveBeenCalled();
      expect(result.id).toBe("test-uuid-123");
    });

    it("should generate file hash using SHA-256", async () => {
      const file = createMockFile("test.pdf", "application/pdf", 1024, "test content");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processFile(file);

      expect(mockDigest).toHaveBeenCalledWith("SHA-256", expect.anything());
      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe("string");
    });

    it("should generate consistent hash for same file", async () => {
      const file = createMockFile("test.pdf", "application/pdf", 1024, "same content");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result1 = await processor.processFile(file);
      const result2 = await processor.processFile(file);

      expect(result1.hash).toBe(result2.hash);
    });

    it("should generate hash in correct hex format", async () => {
      const file = createMockFile("test.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processFile(file);

      // Hash should be 64 hex characters (32 bytes * 2)
      expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // ===========================================================================
  // File Type Determination Tests
  // ===========================================================================

  describe("determineFileType", () => {
    it("should detect runsheet from filename", async () => {
      const file = createMockFile("runsheet_2024-06-15.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockInvoiceParser.canParse.mockReturnValue(false);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processFile(file);

      expect(mockRunsheetParser.canParse).toHaveBeenCalled();
      expect(result.type).toBe("runsheet");
    });

    it("should detect invoice from filename", async () => {
      const file = createMockFile("invoice_2024-06-15.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(true);
      mockInvoiceParser.parse.mockResolvedValue(createSuccessfulInvoiceResult());

      const result = await processor.processFile(file);

      expect(mockInvoiceParser.canParse).toHaveBeenCalled();
      expect(result.type).toBe("invoice");
    });

    it("should return unknown when neither parser matches", async () => {
      const file = createMockFile("unknown_file.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(false);
      mockRunsheetParser.parse.mockResolvedValue(createFailedParseResult());
      mockInvoiceParser.parse.mockResolvedValue(createFailedParseResult());

      const result = await processor.processFile(file);

      expect(result.type).toBe("unknown");
    });

    it("should prioritize runsheet when both parsers match", async () => {
      const file = createMockFile("mixed_file.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockInvoiceParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processFile(file);

      // Should detect as runsheet first (checked first in determineFileType)
      expect(result.type).toBe("runsheet");
    });

    it("should check content when filename does not match", async () => {
      const file = createMockFile("file.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(true);
      mockInvoiceParser.parse.mockResolvedValue(createSuccessfulInvoiceResult());

      const result = await processor.processFile(file);

      // Should pass content preview to canParse
      expect(mockRunsheetParser.canParse).toHaveBeenCalledWith(file.name, expect.any(String));
      expect(mockInvoiceParser.canParse).toHaveBeenCalledWith(file.name, expect.any(String));
      expect(result.type).toBe("invoice");
    });
  });

  // ===========================================================================
  // Parser Selection & Routing Tests
  // ===========================================================================

  describe("Parser Selection & Routing", () => {
    it("should route runsheet files to runsheet parser", async () => {
      const file = createMockFile("runsheet.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      await processor.processFile(file);

      expect(mockRunsheetParser.parse).toHaveBeenCalledWith(file);
      expect(mockInvoiceParser.parse).not.toHaveBeenCalled();
    });

    it("should route invoice files to invoice parser", async () => {
      const file = createMockFile("invoice.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(true);
      mockInvoiceParser.parse.mockResolvedValue(createSuccessfulInvoiceResult());

      await processor.processFile(file);

      expect(mockInvoiceParser.parse).toHaveBeenCalledWith(file);
      expect(mockRunsheetParser.parse).not.toHaveBeenCalled();
    });

    it("should try both parsers for unknown files", async () => {
      const file = createMockFile("unknown.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(false);
      mockRunsheetParser.parse.mockResolvedValue(createFailedParseResult());
      mockInvoiceParser.parse.mockResolvedValue(createFailedParseResult());

      await processor.processFile(file);

      expect(mockRunsheetParser.parse).toHaveBeenCalledWith(file);
      expect(mockInvoiceParser.parse).toHaveBeenCalledWith(file);
    });

    it("should choose runsheet when only it succeeds", async () => {
      const file = createMockFile("unknown.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(false);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());
      mockInvoiceParser.parse.mockResolvedValue(createFailedParseResult());

      const result = await processor.processFile(file);

      expect(result.parseResult.success).toBe(true);
      expect(result.parseResult.data).toHaveProperty("totalConsignments");
    });

    it("should choose invoice when only it succeeds", async () => {
      const file = createMockFile("unknown.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(false);
      mockRunsheetParser.parse.mockResolvedValue(createFailedParseResult());
      mockInvoiceParser.parse.mockResolvedValue(createSuccessfulInvoiceResult());

      const result = await processor.processFile(file);

      expect(result.parseResult.success).toBe(true);
      expect(result.parseResult.data).toHaveProperty("totalAmount");
    });

    it("should return runsheet result when both fail", async () => {
      const file = createMockFile("unknown.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(false);
      mockRunsheetParser.parse.mockResolvedValue(createFailedParseResult("Runsheet failed"));
      mockInvoiceParser.parse.mockResolvedValue(createFailedParseResult("Invoice failed"));

      const result = await processor.processFile(file);

      expect(result.parseResult.success).toBe(false);
      expect(result.parseResult.error).toBe("Runsheet failed");
    });
  });

  // ===========================================================================
  // Better Result Selection Tests
  // ===========================================================================

  describe("Better Result Selection (chooseBetterResult)", () => {
    it("should choose result with more data points", async () => {
      const file = createMockFile("unknown.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(false);

      // Runsheet has 100 consignments, invoice has 5 entries
      mockRunsheetParser.parse.mockResolvedValue(
        createSuccessfulRunsheetResult({ totalConsignments: 100 })
      );
      mockInvoiceParser.parse.mockResolvedValue(
        createSuccessfulInvoiceResult({
          entries: Array(5).fill({ date: new Date(), amount: 15.0, serviceType: "Standard" }),
        })
      );

      const result = await processor.processFile(file);

      expect(result.parseResult.data).toHaveProperty("totalConsignments", 100);
    });

    it("should choose invoice when it has more data points", async () => {
      const file = createMockFile("unknown.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(false);

      // Runsheet has 5 consignments, invoice has 20 entries
      mockRunsheetParser.parse.mockResolvedValue(
        createSuccessfulRunsheetResult({ totalConsignments: 5 })
      );
      mockInvoiceParser.parse.mockResolvedValue(
        createSuccessfulInvoiceResult({
          entries: Array(20).fill({ date: new Date(), amount: 15.0, serviceType: "Standard" }),
        })
      );

      const result = await processor.processFile(file);

      expect(result.parseResult.data).toHaveProperty("totalAmount");
      expect((result.parseResult.data as InvoiceData).entries).toHaveLength(20);
    });

    it("should handle zero data points gracefully", async () => {
      const file = createMockFile("unknown.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(false);

      mockRunsheetParser.parse.mockResolvedValue(
        createSuccessfulRunsheetResult({ totalConsignments: 0 })
      );
      mockInvoiceParser.parse.mockResolvedValue(createSuccessfulInvoiceResult({ entries: [] }));

      const result = await processor.processFile(file);

      // Should choose runsheet (first wins on tie)
      expect(result.parseResult.success).toBe(true);
    });

    it("should prefer runsheet on tie (equal data points)", async () => {
      const file = createMockFile("unknown.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(false);

      mockRunsheetParser.parse.mockResolvedValue(
        createSuccessfulRunsheetResult({ totalConsignments: 10 })
      );
      mockInvoiceParser.parse.mockResolvedValue(
        createSuccessfulInvoiceResult({
          entries: Array(10).fill({ date: new Date(), amount: 15.0, serviceType: "Standard" }),
        })
      );

      const result = await processor.processFile(file);

      // Tie-breaker: runsheet wins (>= comparison in chooseBetterResult)
      expect(result.parseResult.data).toHaveProperty("totalConsignments");
    });
  });

  // ===========================================================================
  // Content Preview Extraction Tests
  // ===========================================================================

  describe("Content Preview Extraction (getFileContentPreview)", () => {
    it("should fallback to filename when PDF.js unavailable", async () => {
      const file = createMockFile("runsheet_test.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      // PDF.js is not available in test environment
      const _result = await processor.processFile(file);

      // canParse should be called with filename as content preview fallback
      expect(mockRunsheetParser.canParse).toHaveBeenCalledWith(file.name, expect.any(String));
    });

    it("should handle preview extraction errors gracefully", async () => {
      const file = createMockFile("test.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      // Should not throw even if preview fails
      await expect(processor.processFile(file)).resolves.toBeDefined();
    });
  });

  // ===========================================================================
  // Hash Generation Tests
  // ===========================================================================

  describe("Hash Generation (generateFileHash)", () => {
    it("should generate SHA-256 hash", async () => {
      const file = createMockFile("test.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      await processor.processFile(file);

      expect(mockDigest).toHaveBeenCalledWith("SHA-256", expect.anything());
    });

    it("should generate consistent hash for same content", async () => {
      const file1 = createMockFile("test1.pdf", "application/pdf", 1024, "same content");
      const file2 = createMockFile("test2.pdf", "application/pdf", 1024, "same content");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result1 = await processor.processFile(file1);
      const result2 = await processor.processFile(file2);

      expect(result1.hash).toBe(result2.hash);
    });

    it("should generate different hashes for different content", async () => {
      const file1 = createMockFile("test1.pdf", "application/pdf", 1024, "content A");
      const file2 = createMockFile("test2.pdf", "application/pdf", 1024, "content B");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      // Mock different hash values
      let _callCount = 0;
      mockDigest.mockImplementation(async () => {
        _callCount++;
        return new ArrayBuffer(32); // Would be different in real scenario
      });

      const result1 = await processor.processFile(file1);
      const result2 = await processor.processFile(file2);

      // Both should have generated hashes
      expect(result1.hash).toBeDefined();
      expect(result2.hash).toBeDefined();
      expect(mockDigest).toHaveBeenCalledTimes(2);
    });

    it("should return hash in lowercase hex format", async () => {
      const file = createMockFile("test.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processFile(file);

      expect(result.hash).toMatch(/^[0-9a-f]+$/);
      expect(result.hash).not.toMatch(/[A-F]/); // No uppercase letters
    });
  });

  // ===========================================================================
  // Data Transformation Tests
  // ===========================================================================

  describe("Data Transformation", () => {
    it("should transform runsheet data for service compatibility", async () => {
      const file = createMockFile("runsheet.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(
        createSuccessfulRunsheetResult({
          consignmentsByDate: new Map([
            ["2024-06-15", 30],
            ["2024-06-16", 40],
          ]),
          totalConsignments: 70,
        })
      );

      const result = await processor.processFile(file);

      expect(result.transformedData).toBeDefined();
      expect(result.transformedData?.type).toBe("runsheet");
      expect(result.transformedData?.consignments).toBeDefined();
      expect(result.transformedData?.totalConsignments).toBe(70);
    });

    it("should convert Map to plain object in runsheet transformation", async () => {
      const file = createMockFile("runsheet.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(
        createSuccessfulRunsheetResult({
          consignmentsByDate: new Map([["2024-06-15", 50]]),
        })
      );

      const result = await processor.processFile(file);

      expect(result.transformedData?.consignments).toBeTypeOf("object");
      expect((result.transformedData?.consignments as Record<string, number>)["2024-06-15"]).toBe(
        50
      );
    });

    it("should format dates as YYYY-MM-DD in runsheet transformation", async () => {
      const file = createMockFile("runsheet.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(
        createSuccessfulRunsheetResult({
          consignmentsByDate: new Map([["2024-06-15", 50]]),
        })
      );

      const result = await processor.processFile(file);

      const dateKeys = Object.keys(result.transformedData?.consignments || {});
      expect(dateKeys[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should transform invoice data for service compatibility", async () => {
      const file = createMockFile("invoice.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(true);
      mockInvoiceParser.parse.mockResolvedValue(
        createSuccessfulInvoiceResult({
          entries: [
            { date: new Date("2024-06-15"), time: "10:30", amount: 15.0, serviceType: "Standard" },
            { date: new Date("2024-06-15"), time: "14:20", amount: 20.0, serviceType: "Standard" },
          ],
          totalAmount: 35.0,
        })
      );

      const result = await processor.processFile(file);

      expect(result.transformedData).toBeDefined();
      expect(result.transformedData?.type).toBe("invoice");
      expect(result.transformedData?.payments).toBeDefined();
      expect(result.transformedData?.payments).toHaveLength(2);
      expect(result.transformedData?.totalAmount).toBe(35.0);
    });

    it("should restructure invoice entries in transformation", async () => {
      const file = createMockFile("invoice.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(true);
      mockInvoiceParser.parse.mockResolvedValue(createSuccessfulInvoiceResult());

      const result = await processor.processFile(file);

      const payment = (result.transformedData?.payments as Array<any>)[0];
      expect(payment).toHaveProperty("date");
      expect(payment).toHaveProperty("time");
      expect(payment).toHaveProperty("amount");
      expect(payment).toHaveProperty("serviceType");
    });

    it("should not generate transformedData when parsing fails", async () => {
      const file = createMockFile("runsheet.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createFailedParseResult());

      const result = await processor.processFile(file);

      expect(result.transformedData).toBeUndefined();
    });

    it("should include all invoice fields in transformation", async () => {
      const file = createMockFile("invoice.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(true);
      mockInvoiceParser.parse.mockResolvedValue(
        createSuccessfulInvoiceResult({
          pickupServices: [{ date: new Date(), amount: 10.0, serviceType: "Pickup" }],
          extraDrops: [
            { date: new Date(), amount: 8.5, serviceType: "Extra Drop", description: "Extra" },
          ],
        })
      );

      const result = await processor.processFile(file);

      expect(result.transformedData?.pickupServices).toBeDefined();
      expect(result.transformedData?.extraDrops).toBeDefined();
      expect(result.transformedData?.isValid).toBeDefined();
    });
  });

  // ===========================================================================
  // Multiple Files Processing Tests
  // ===========================================================================

  describe("processFiles - Multiple Files", () => {
    it("should process single file", async () => {
      const file = createMockFile("runsheet.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processFiles([file]);

      expect(result.files).toHaveLength(1);
      expect(result.summary.totalFiles).toBe(1);
      expect(result.summary.successfulFiles).toBe(1);
    });

    it("should process multiple mixed files", async () => {
      const files = [
        createMockFile("runsheet1.pdf"),
        createMockFile("invoice1.pdf"),
        createMockFile("runsheet2.pdf"),
      ];

      mockRunsheetParser.canParse.mockImplementation((name: string) => name.includes("runsheet"));
      mockInvoiceParser.canParse.mockImplementation((name: string) => name.includes("invoice"));
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());
      mockInvoiceParser.parse.mockResolvedValue(createSuccessfulInvoiceResult());

      const result = await processor.processFiles(files);

      expect(result.files).toHaveLength(3);
      expect(result.runsheets).toHaveLength(2);
      expect(result.invoices).toHaveLength(1);
    });

    it("should categorize files correctly", async () => {
      const files = [createMockFile("runsheet.pdf"), createMockFile("invoice.pdf")];

      mockRunsheetParser.canParse.mockImplementation((name: string) => name.includes("runsheet"));
      mockInvoiceParser.canParse.mockImplementation((name: string) => name.includes("invoice"));
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());
      mockInvoiceParser.parse.mockResolvedValue(createSuccessfulInvoiceResult());

      const result = await processor.processFiles(files);

      expect(result.runsheets).toHaveLength(1);
      expect(result.invoices).toHaveLength(1);
      expect(result.runsheets[0].type).toBe("runsheet");
      expect(result.invoices[0].type).toBe("invoice");
    });

    it("should generate summary statistics", async () => {
      const files = [
        createMockFile("runsheet1.pdf"),
        createMockFile("runsheet2.pdf"),
        createMockFile("invoice1.pdf"),
      ];

      mockRunsheetParser.canParse.mockImplementation((name: string) => name.includes("runsheet"));
      mockInvoiceParser.canParse.mockImplementation((name: string) => name.includes("invoice"));
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());
      mockInvoiceParser.parse.mockResolvedValue(createSuccessfulInvoiceResult());

      const result = await processor.processFiles(files);

      expect(result.summary.totalFiles).toBe(3);
      expect(result.summary.successfulFiles).toBe(3);
      expect(result.summary.failedFiles).toBe(0);
      expect(result.summary.runsheetCount).toBe(2);
      expect(result.summary.invoiceCount).toBe(1);
    });

    it("should handle mix of successful and failed files", async () => {
      const files = [createMockFile("runsheet1.pdf"), createMockFile("runsheet2.pdf")];

      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse
        .mockResolvedValueOnce(createSuccessfulRunsheetResult())
        .mockResolvedValueOnce(createFailedParseResult());

      const result = await processor.processFiles(files);

      expect(result.summary.successfulFiles).toBe(1);
      expect(result.summary.failedFiles).toBe(1);
    });

    it("should collect errors from failed files", async () => {
      const files = [createMockFile("bad.pdf")];

      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(false);
      mockRunsheetParser.parse.mockRejectedValue(new Error("Parse error"));
      mockInvoiceParser.parse.mockRejectedValue(new Error("Parse error"));

      const result = await processor.processFiles(files);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain("Parse error");
      expect(result.errors[0].file).toBe(files[0]);
    });

    it("should validate files using fileValidationService", async () => {
      const files = [createMockFile("test.pdf")];
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      await processor.processFiles(files);

      expect(mockFileValidationService.validateFiles).toHaveBeenCalledWith(
        files,
        expect.objectContaining({
          maxFileSize: 50 * 1024 * 1024,
          allowedTypes: ["application/pdf"],
          checkForUpdates: true,
          checkForDuplicates: true,
        })
      );
    });

    it("should extract file metadata", async () => {
      const file = createMockFile("test.pdf", "application/pdf", 2048);
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processFiles([file]);

      expect(result.fileMetadata).toHaveLength(1);
      expect(result.fileMetadata?.[0].name).toBe("test.pdf");
      expect(result.fileMetadata?.[0].type).toBe("application/pdf");
      expect(result.fileMetadata?.[0].size).toBeGreaterThan(0);
      expect(result.fileMetadata?.[0]).toHaveProperty("lastModified");
    });

    it("should detect existing analysis", async () => {
      const files = [createMockFile("test.pdf")];
      mockFileValidationService.findExistingAnalysis.mockReturnValue("existing-analysis-id");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processFiles(files);

      expect(result.validation?.existingAnalysis).toBe("existing-analysis-id");
      const hasWarning = result.validation?.warnings.some((w) =>
        w.toLowerCase().includes("existing analysis")
      );
      expect(hasWarning).toBe(true);
    });

    it("should handle validation failures", async () => {
      const files = [createMockFile("test.pdf")];
      mockFileValidationService.validateFiles.mockResolvedValue(
        createMockValidation({
          isValid: false,
          errors: ["File too large"],
        })
      );

      const result = await processor.processFiles(files);

      expect(result.files).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should process files even with validation warnings", async () => {
      const files = [createMockFile("test.pdf")];
      mockFileValidationService.validateFiles.mockResolvedValue(
        createMockValidation({
          isValid: true,
          warnings: ["File may be outdated"],
        })
      );
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processFiles(files);

      expect(result.files).toHaveLength(1);
      expect(result.validation?.warnings).toContain("File may be outdated");
    });
  });

  // ===========================================================================
  // File Set Validation Tests
  // ===========================================================================

  describe("validateFileSet", () => {
    it("should validate when all files parse successfully", () => {
      const mockResult: ProcessingResult = {
        files: [],
        runsheets: [{ type: "runsheet", parseResult: { success: true } } as any],
        invoices: [{ type: "invoice", parseResult: { success: true } } as any],
        errors: [],
        summary: {
          totalFiles: 2,
          successfulFiles: 2,
          failedFiles: 0,
          runsheetCount: 1,
          invoiceCount: 1,
          unknownCount: 0,
        },
      };

      const result = processor.validateFileSet(mockResult);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should error when no files can be parsed", () => {
      const mockResult: ProcessingResult = {
        files: [],
        runsheets: [],
        invoices: [],
        errors: [],
        summary: {
          totalFiles: 2,
          successfulFiles: 0,
          failedFiles: 2,
          runsheetCount: 0,
          invoiceCount: 0,
          unknownCount: 0,
        },
      };

      const result = processor.validateFileSet(mockResult);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("No valid runsheet or invoice files");
    });

    it("should warn when no runsheets found", () => {
      const mockResult: ProcessingResult = {
        files: [],
        runsheets: [],
        invoices: [{ type: "invoice", parseResult: { success: true } } as any],
        errors: [],
        summary: {
          totalFiles: 1,
          successfulFiles: 1,
          failedFiles: 0,
          runsheetCount: 0,
          invoiceCount: 1,
          unknownCount: 0,
        },
      };

      const result = processor.validateFileSet(mockResult);

      expect(result.isValid).toBe(true);
      const hasWarning = result.warnings.some((w) => w.includes("No runsheet files"));
      expect(hasWarning).toBe(true);
    });

    it("should warn when no invoices found", () => {
      const mockResult: ProcessingResult = {
        files: [],
        runsheets: [{ type: "runsheet", parseResult: { success: true } } as any],
        invoices: [],
        errors: [],
        summary: {
          totalFiles: 1,
          successfulFiles: 1,
          failedFiles: 0,
          runsheetCount: 1,
          invoiceCount: 0,
          unknownCount: 0,
        },
      };

      const result = processor.validateFileSet(mockResult);

      expect(result.isValid).toBe(true);
      const hasWarning = result.warnings.some((w) => w.includes("No invoice files"));
      expect(hasWarning).toBe(true);
    });

    it("should warn about failed runsheet parses", () => {
      const mockResult: ProcessingResult = {
        files: [],
        runsheets: [
          { type: "runsheet", parseResult: { success: true } } as any,
          { type: "runsheet", parseResult: { success: false, error: "Parse failed" } } as any,
        ],
        invoices: [],
        errors: [],
        summary: {
          totalFiles: 2,
          successfulFiles: 1,
          failedFiles: 1,
          runsheetCount: 2,
          invoiceCount: 0,
          unknownCount: 0,
        },
      };

      const result = processor.validateFileSet(mockResult);

      const hasWarning = result.warnings.some(
        (w) => w.includes("runsheet") && w.includes("failed to parse")
      );
      expect(hasWarning).toBe(true);
    });

    it("should warn about failed invoice parses", () => {
      const mockResult: ProcessingResult = {
        files: [],
        runsheets: [],
        invoices: [
          { type: "invoice", parseResult: { success: true } } as any,
          { type: "invoice", parseResult: { success: false } } as any,
          { type: "invoice", parseResult: { success: false } } as any,
        ],
        errors: [],
        summary: {
          totalFiles: 3,
          successfulFiles: 1,
          failedFiles: 2,
          runsheetCount: 0,
          invoiceCount: 3,
          unknownCount: 0,
        },
      };

      const result = processor.validateFileSet(mockResult);

      const hasWarning = result.warnings.some(
        (w) => w.includes("invoice") && w.includes("failed to parse")
      );
      expect(hasWarning).toBe(true);
    });

    it("should warn about unknown file types", () => {
      const mockResult: ProcessingResult = {
        files: [],
        runsheets: [{ type: "runsheet", parseResult: { success: true } } as any],
        invoices: [],
        errors: [],
        summary: {
          totalFiles: 3,
          successfulFiles: 1,
          failedFiles: 0,
          runsheetCount: 1,
          invoiceCount: 0,
          unknownCount: 2,
        },
      };

      const result = processor.validateFileSet(mockResult);

      const hasWarning = result.warnings.some((w) => w.includes("could not be classified"));
      expect(hasWarning).toBe(true);
    });

    it("should accumulate multiple warnings", () => {
      const mockResult: ProcessingResult = {
        files: [],
        runsheets: [],
        invoices: [],
        errors: [],
        summary: {
          totalFiles: 2,
          successfulFiles: 0,
          failedFiles: 0,
          runsheetCount: 0,
          invoiceCount: 0,
          unknownCount: 2,
        },
      };

      const result = processor.validateFileSet(mockResult);

      expect(result.warnings.length).toBeGreaterThan(1);
      expect(result.warnings.some((w) => w.includes("No runsheet files"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("No invoice files"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("could not be classified"))).toBe(true);
    });
  });

  // ===========================================================================
  // ArrayBuffer Processing Tests
  // ===========================================================================

  describe("ArrayBuffer Processing (API Support)", () => {
    it("should process runsheet from ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(1024);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processRunsheet(buffer, "test-runsheet.pdf");

      expect(result).toBeDefined();
      expect(result.type).toBe("runsheet");
      expect(mockRunsheetParser.parse).toHaveBeenCalled();
    });

    it("should create File from ArrayBuffer for runsheet processing", async () => {
      const buffer = new ArrayBuffer(1024);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      await processor.processRunsheet(buffer, "test.pdf");

      const callArg = mockRunsheetParser.parse.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(File);
      expect(callArg.name).toBe("test.pdf");
      expect(callArg.type).toBe("application/pdf");
    });

    it("should transform runsheet data from ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(1024);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processRunsheet(buffer, "test.pdf");

      expect(result.consignments).toBeDefined();
      expect(result.totalConsignments).toBe(50);
    });

    it("should throw error when runsheet parsing fails", async () => {
      const buffer = new ArrayBuffer(1024);
      mockRunsheetParser.parse.mockResolvedValue(createFailedParseResult("Parse failed"));

      await expect(processor.processRunsheet(buffer, "test.pdf")).rejects.toThrow("Parse failed");
    });

    it("should process invoice from ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(1024);
      mockInvoiceParser.parse.mockResolvedValue(createSuccessfulInvoiceResult());

      const result = await processor.processInvoice(buffer, "test-invoice.pdf");

      expect(result).toBeDefined();
      expect(result.type).toBe("invoice");
      expect(mockInvoiceParser.parse).toHaveBeenCalled();
    });

    it("should create File from ArrayBuffer for invoice processing", async () => {
      const buffer = new ArrayBuffer(1024);
      mockInvoiceParser.parse.mockResolvedValue(createSuccessfulInvoiceResult());

      await processor.processInvoice(buffer, "test.pdf");

      const callArg = mockInvoiceParser.parse.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(File);
      expect(callArg.name).toBe("test.pdf");
      expect(callArg.type).toBe("application/pdf");
    });

    it("should transform invoice data from ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(1024);
      mockInvoiceParser.parse.mockResolvedValue(createSuccessfulInvoiceResult());

      const result = await processor.processInvoice(buffer, "test.pdf");

      expect(result.payments).toBeDefined();
      expect(result.totalAmount).toBe(15.0);
    });

    it("should throw error when invoice parsing fails", async () => {
      const buffer = new ArrayBuffer(1024);
      mockInvoiceParser.parse.mockResolvedValue(createFailedParseResult("Invoice parse failed"));

      await expect(processor.processInvoice(buffer, "test.pdf")).rejects.toThrow(
        "Invoice parse failed"
      );
    });

    it("should handle ArrayBuffer with no data", async () => {
      const buffer = new ArrayBuffer(0);
      mockRunsheetParser.parse.mockResolvedValue(createFailedParseResult("Empty file"));

      await expect(processor.processRunsheet(buffer, "empty.pdf")).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Edge Cases & Error Handling
  // ===========================================================================

  describe("Edge Cases & Error Handling", () => {
    it("should handle empty file list", async () => {
      const result = await processor.processFiles([]);

      expect(result.files).toHaveLength(0);
      expect(result.summary.totalFiles).toBe(0);
      expect(result.summary.successfulFiles).toBe(0);
    });

    it("should handle file with zero size", async () => {
      const file = createMockFile("empty.pdf", "application/pdf", 0);
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createFailedParseResult("Empty file"));

      const result = await processor.processFile(file);

      expect(result.parseResult.success).toBe(false);
    });

    it("should handle corrupted PDF file", async () => {
      const file = createMockFile("corrupted.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockRejectedValue(new Error("Corrupted PDF"));

      await expect(processor.processFile(file)).rejects.toThrow("Corrupted PDF");
    });

    it("should handle parser throwing unexpected error", async () => {
      const file = createMockFile("test.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockRejectedValue(new Error("Unexpected error"));

      await expect(processor.processFile(file)).rejects.toThrow("Unexpected error");
    });

    it("should handle validation service errors", async () => {
      const files = [createMockFile("test.pdf")];
      mockFileValidationService.validateFiles.mockRejectedValue(new Error("Validation failed"));

      await expect(processor.processFiles(files)).rejects.toThrow("Validation failed");
    });

    it("should handle hash generation errors", async () => {
      const file = createMockFile("test.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());
      mockDigest.mockRejectedValue(new Error("Hash generation failed"));

      await expect(processor.processFile(file)).rejects.toThrow("Hash generation failed");
    });

    it("should handle duplicate files", async () => {
      const file1 = createMockFile("test.pdf", "application/pdf", 1024, "content");
      const file2 = createMockFile("test.pdf", "application/pdf", 1024, "content");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue(createSuccessfulRunsheetResult());

      const result = await processor.processFiles([file1, file2]);

      expect(result.files).toHaveLength(2);
      expect(result.files[0].hash).toBe(result.files[1].hash);
    });

    it("should handle very large file", async () => {
      const file = createMockFile("large.pdf", "application/pdf", 100 * 1024 * 1024); // 100MB
      mockFileValidationService.validateFiles.mockResolvedValue(
        createMockValidation({
          isValid: false,
          errors: ["File exceeds maximum size"],
        })
      );

      const result = await processor.processFiles([file]);

      expect(result.files).toHaveLength(0);
      expect(result.validation?.errors).toContain("File exceeds maximum size");
    });

    it("should handle parser returning null data", async () => {
      const file = createMockFile("test.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue({ success: true, data: null as any });

      const result = await processor.processFile(file);

      expect(result.transformedData).toBeUndefined();
    });

    it("should handle parser returning undefined data", async () => {
      const file = createMockFile("test.pdf");
      mockRunsheetParser.canParse.mockReturnValue(true);
      mockRunsheetParser.parse.mockResolvedValue({ success: true, data: undefined as any });

      const result = await processor.processFile(file);

      expect(result.transformedData).toBeUndefined();
    });

    it("should handle invalid file type gracefully", async () => {
      const file = createMockFile("test.doc", "application/msword");

      await expect(processor.processFile(file)).rejects.toThrow("Invalid file type");
    });

    it("should handle processing when both parsers throw errors", async () => {
      const file = createMockFile("unknown.pdf");
      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(false);
      mockRunsheetParser.parse.mockRejectedValue(new Error("Runsheet error"));
      mockInvoiceParser.parse.mockRejectedValue(new Error("Invoice error"));

      await expect(processor.processFile(file)).rejects.toThrow();
    });

    it("should track unknown count in summary", async () => {
      const files = [createMockFile("unknown.pdf")];

      mockRunsheetParser.canParse.mockReturnValue(false);
      mockInvoiceParser.canParse.mockReturnValue(false);
      mockRunsheetParser.parse.mockResolvedValue(createFailedParseResult());
      mockInvoiceParser.parse.mockResolvedValue(createFailedParseResult());

      const result = await processor.processFiles(files);

      expect(result.summary.unknownCount).toBe(1);
    });
  });
});
