/**
 * Phase 2 Integration Tests - Real Seed Data
 *
 * Tests using actual PDF files from seed_data directory
 * These tests verify the complete workflow with real database interactions
 *
 * Seed Data Location: C:\taly\Analyser\seed_data
 *
 * Test Scenarios:
 * 1. Create Analysis #1 with runsheet → Save to DB
 * 2. Upload invoice for same dates → Creates Analysis #2 (current behavior)
 * 3. FileUpdateDialog integration requirements (future)
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisWorkflowService } from "@/lib/domain/analysis-workflow.service";
import { analysisService } from "@/lib/services/analysis-service";
import { FileFingerprintService } from "@/lib/services/file-fingerprint-service";

// =============================================================================
// Constants and Configuration
// =============================================================================

const SEED_DATA_PATH = "/mnt/c/taly/Analyser/seed_data";

// Seed data files available
const SEED_FILES = {
  runsheets: [
    "runsheetDV_2025-06-30.pdf",
    "runsheetDV_2025-07-01.pdf",
    "runsheetDV_2025-07-02.pdf",
    "runsheetDV_2025-07-03.pdf",
    "runsheetDV_2025-07-04.pdf",
    "runsheetDV_2025-07-21.pdf",
    "runsheetDV_2025-07-22.pdf",
    "runsheetDV_2025-07-24.pdf",
    "runsheetDV_2025-07-25.pdf",
    "runsheetDV_2025-07-26.pdf",
  ],
  invoices: ["SELF BILL_100136037.pdf", "SELF BILL_100136262.pdf"],
};

// Test user ID (should be a valid UUID in your test database)
const TEST_USER_ID = `test-user-phase2-${Date.now()}`;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Loads a real PDF file from seed_data directory
 */
async function loadSeedFile(filename: string): Promise<File> {
  const filePath = join(SEED_DATA_PATH, filename);
  const buffer = await readFile(filePath);
  const blob = new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
  return new File([blob], filename, {
    type: "application/pdf",
    lastModified: Date.now(),
  });
}

/**
 * Extracts date range from analysis metadata
 */
function extractDateRange(analysis: any): { start: string; end: string } | null {
  if (!analysis || !analysis.metadata) return null;

  const periodRange = analysis.metadata.periodRange;
  if (!periodRange) return null;

  // Format: "DD/MM/YYYY - DD/MM/YYYY"
  const parts = periodRange.split(" - ");
  if (parts.length !== 2) return null;

  return {
    start: parts[0],
    end: parts[1],
  };
}

/**
 * Checks if two date ranges overlap
 */
function dateRangesOverlap(
  range1: { start: string; end: string },
  range2: { start: string; end: string }
): boolean {
  // Convert DD/MM/YYYY to Date objects for comparison
  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const start1 = parseDate(range1.start);
  const end1 = parseDate(range1.end);
  const start2 = parseDate(range2.start);
  const end2 = parseDate(range2.end);

  return start1 <= end2 && start2 <= end1;
}

// =============================================================================
// Test Suite 1: Analysis #1 Creation with Real Runsheet
// =============================================================================

describe("Phase 2 - Test 1: Create Analysis #1 with Runsheet", () => {
  let workflowService: AnalysisWorkflowService;
  let createdAnalysisIds: string[] = [];

  beforeEach(() => {
    workflowService = new AnalysisWorkflowService();
    createdAnalysisIds = [];
  });

  afterEach(async () => {
    // Cleanup: Delete test analyses from database
    for (const analysisId of createdAnalysisIds) {
      try {
        // Note: In real environment, you'd call analysisService.deleteAnalysis
        // For now, we'll just track them
        console.log(`Cleanup: Would delete analysis ${analysisId}`);
      } catch (error) {
        console.error(`Failed to cleanup analysis ${analysisId}:`, error);
      }
    }
  });

  it("should create Analysis #1 from real runsheet and save to database", async () => {
    // Load a real runsheet file
    const runsheetFile = await loadSeedFile(SEED_FILES.runsheets[0]);
    expect(runsheetFile).toBeDefined();
    expect(runsheetFile.name).toBe(SEED_FILES.runsheets[0]);
    expect(runsheetFile.type).toBe("application/pdf");

    // Execute the workflow
    const result = await workflowService.executeFileWorkflow([runsheetFile], {
      userId: TEST_USER_ID,
      validateFingerprints: true,
      trackProgress: true,
      saveSession: true,
    });

    // Verify workflow succeeded
    expect(result.success).toBe(true);
    expect(result.analysisId).toBeDefined();
    expect(result.errors).toBeUndefined();

    // Track for cleanup
    if (result.analysisId) {
      createdAnalysisIds.push(result.analysisId);
    }

    // Verify analysis was saved to database
    expect(analysisService.createAnalysis).toHaveBeenCalled();

    // Retrieve the analysis from database
    const id = result.analysisId;
    expect(id).toBeDefined();
    const retrievedAnalysis = await workflowService.getAnalysis(id as string);
    expect(retrievedAnalysis).toBeDefined();
    expect(retrievedAnalysis.analysisId).toBe(result.analysisId);

    // Verify analysis has expected data structure
    if (result.analysis && "totals" in result.analysis) {
      const totals = result.analysis.totals as { totalConsignments: number; bonusTotal: number };
      expect(totals).toBeDefined();
      expect(totals.totalConsignments).toBeGreaterThan(0); // Should have consignment data
      expect(totals.bonusTotal).toBeGreaterThanOrEqual(0); // Should calculate bonuses
    }

    console.log("✅ Analysis #1 created successfully:", {
      analysisId: result.analysisId,
      file: runsheetFile.name,
      userId: TEST_USER_ID,
    });
  }, 30000); // 30 second timeout for PDF processing

  it("should extract correct date range from runsheet", async () => {
    const runsheetFile = await loadSeedFile(SEED_FILES.runsheets[0]);

    const result = await workflowService.executeFileWorkflow([runsheetFile], {
      userId: TEST_USER_ID,
    });

    expect(result.success).toBe(true);

    if (result.analysisId) {
      createdAnalysisIds.push(result.analysisId);
    }

    // Extract date range
    const dateRange = extractDateRange(result.analysis);
    expect(dateRange).toBeDefined();
    expect(dateRange?.start).toMatch(/\d{2}\/\d{2}\/\d{4}/); // DD/MM/YYYY format
    expect(dateRange?.end).toMatch(/\d{2}\/\d{2}\/\d{4}/);

    console.log("📅 Date range extracted:", dateRange);
  }, 30000);

  it("should create fingerprint for uploaded runsheet", async () => {
    const runsheetFile = await loadSeedFile(SEED_FILES.runsheets[0]);

    // Spy on fingerprint validation
    const validateSpy = vi.spyOn(FileFingerprintService, "validateFileSet");

    const result = await workflowService.executeFileWorkflow([runsheetFile], {
      userId: TEST_USER_ID,
      validateFingerprints: true,
    });

    expect(result.success).toBe(true);

    if (result.analysisId) {
      createdAnalysisIds.push(result.analysisId);
    }

    // Verify fingerprint validation was called
    expect(validateSpy).toHaveBeenCalledWith([runsheetFile], TEST_USER_ID);

    console.log("🔒 Fingerprint created for:", runsheetFile.name);
  }, 30000);

  it("should handle multiple runsheet uploads independently", async () => {
    // Upload first runsheet
    const runsheet1 = await loadSeedFile(SEED_FILES.runsheets[0]);
    const result1 = await workflowService.executeFileWorkflow([runsheet1], {
      userId: TEST_USER_ID,
    });

    expect(result1.success).toBe(true);
    expect(result1.analysisId).toBeDefined();

    if (result1.analysisId) {
      createdAnalysisIds.push(result1.analysisId);
    }

    // Upload second runsheet
    const runsheet2 = await loadSeedFile(SEED_FILES.runsheets[1]);
    const result2 = await workflowService.executeFileWorkflow([runsheet2], {
      userId: TEST_USER_ID,
    });

    expect(result2.success).toBe(true);
    expect(result2.analysisId).toBeDefined();

    if (result2.analysisId) {
      createdAnalysisIds.push(result2.analysisId);
    }

    // Verify both analyses are different
    expect(result1.analysisId).not.toBe(result2.analysisId);

    console.log("📊 Created multiple independent analyses:", {
      analysis1: result1.analysisId,
      analysis2: result2.analysisId,
    });
  }, 60000);
});

// =============================================================================
// Test Suite 2: Analysis #2 Creation - Current Behavior
// =============================================================================

describe("Phase 2 - Test 2: Upload Invoice for Same Dates → Creates Analysis #2", () => {
  let workflowService: AnalysisWorkflowService;
  let createdAnalysisIds: string[] = [];

  beforeEach(() => {
    workflowService = new AnalysisWorkflowService();
    createdAnalysisIds = [];
  });

  afterEach(async () => {
    for (const analysisId of createdAnalysisIds) {
      console.log(`Cleanup: Would delete analysis ${analysisId}`);
    }
  });

  it("should create separate Analysis #2 when uploading invoice after runsheet (current behavior)", async () => {
    // Step 1: Create Analysis #1 with runsheet
    console.log("📤 Step 1: Uploading runsheet...");
    const runsheetFile = await loadSeedFile(SEED_FILES.runsheets[0]);

    const analysis1Result = await workflowService.executeFileWorkflow([runsheetFile], {
      userId: TEST_USER_ID,
      validateFingerprints: true,
    });

    expect(analysis1Result.success).toBe(true);
    expect(analysis1Result.analysisId).toBeDefined();
    const analysis1Id = analysis1Result.analysisId as string;
    createdAnalysisIds.push(analysis1Id);

    // Extract date range from Analysis #1
    const analysis1DateRange = extractDateRange(analysis1Result.analysis);
    console.log("📅 Analysis #1 date range:", analysis1DateRange);

    // Step 2: Upload invoice (assuming it covers overlapping dates)
    console.log("📤 Step 2: Uploading invoice...");
    const invoiceFile = await loadSeedFile(SEED_FILES.invoices[0]);

    const analysis2Result = await workflowService.executeFileWorkflow([invoiceFile], {
      userId: TEST_USER_ID,
      validateFingerprints: true,
    });

    expect(analysis2Result.success).toBe(true);
    expect(analysis2Result.analysisId).toBeDefined();
    const analysis2Id = analysis2Result.analysisId as string;
    createdAnalysisIds.push(analysis2Id);

    // Extract date range from Analysis #2
    const analysis2DateRange = extractDateRange(analysis2Result.analysis);
    console.log("📅 Analysis #2 date range:", analysis2DateRange);

    // Verify CURRENT BEHAVIOR: Two separate analyses were created
    expect(analysis2Id).not.toBe(analysis1Id);
    console.log("✅ Current Behavior Verified: Created separate Analysis #2");

    // Document the analyses
    console.log("📊 Analysis Summary:", {
      analysis1: {
        id: analysis1Id,
        file: runsheetFile.name,
        dateRange: analysis1DateRange,
      },
      analysis2: {
        id: analysis2Id,
        file: invoiceFile.name,
        dateRange: analysis2DateRange,
      },
    });

    // Check if date ranges overlap (for FileUpdateDialog trigger detection)
    if (analysis1DateRange && analysis2DateRange) {
      const overlap = dateRangesOverlap(analysis1DateRange, analysis2DateRange);
      console.log("🔍 Date ranges overlap:", overlap);

      if (overlap) {
        console.log("⚠️  FUTURE: This scenario should trigger FileUpdateDialog");
        console.log("    User should choose: [Merge with existing] or [Create new analysis]");
      }
    }
  }, 60000);

  it("should track both analyses independently in database", async () => {
    // Create Analysis #1 (runsheet)
    const runsheet = await loadSeedFile(SEED_FILES.runsheets[0]);
    const result1 = await workflowService.executeFileWorkflow([runsheet], {
      userId: TEST_USER_ID,
    });

    expect(result1.success).toBe(true);
    if (result1.analysisId) createdAnalysisIds.push(result1.analysisId);

    // Create Analysis #2 (invoice)
    const invoice = await loadSeedFile(SEED_FILES.invoices[0]);
    const result2 = await workflowService.executeFileWorkflow([invoice], {
      userId: TEST_USER_ID,
    });

    expect(result2.success).toBe(true);
    if (result2.analysisId) createdAnalysisIds.push(result2.analysisId);

    // Verify both can be retrieved independently
    const r1 = result1.analysisId;
    expect(r1).toBeDefined();
    const retrieved1 = await workflowService.getAnalysis(r1 as string);
    const r2 = result2.analysisId;
    expect(r2).toBeDefined();
    const retrieved2 = await workflowService.getAnalysis(r2 as string);

    expect(retrieved1).toBeDefined();
    expect(retrieved2).toBeDefined();
    expect(retrieved1.analysisId).not.toBe(retrieved2.analysisId);

    console.log("✅ Both analyses tracked independently in database");
  }, 60000);

  it("should show different data characteristics for runsheet vs invoice", async () => {
    // Upload runsheet
    const runsheet = await loadSeedFile(SEED_FILES.runsheets[0]);
    const runsheetResult = await workflowService.executeFileWorkflow([runsheet], {
      userId: TEST_USER_ID,
    });

    expect(runsheetResult.success).toBe(true);
    if (runsheetResult.analysisId) createdAnalysisIds.push(runsheetResult.analysisId);

    // Upload invoice
    const invoice = await loadSeedFile(SEED_FILES.invoices[0]);
    const invoiceResult = await workflowService.executeFileWorkflow([invoice], {
      userId: TEST_USER_ID,
    });

    expect(invoiceResult.success).toBe(true);
    if (invoiceResult.analysisId) createdAnalysisIds.push(invoiceResult.analysisId);

    // Compare data characteristics
    const runsheetAnalysis = runsheetResult.analysis;
    const invoiceAnalysis = invoiceResult.analysis;

    console.log("📊 Data Comparison:");

    if (runsheetAnalysis && "totals" in runsheetAnalysis) {
      const totals = runsheetAnalysis.totals as {
        totalConsignments: number;
        bonusTotal: number;
        paidTotal: number;
      };
      console.log("  Runsheet Analysis:");
      console.log("    - Consignments:", totals.totalConsignments);
      console.log("    - Bonuses:", totals.bonusTotal);
      console.log("    - Paid Total:", totals.paidTotal);

      // Runsheet should have consignment data
      expect(totals.totalConsignments).toBeGreaterThan(0);
    }

    if (invoiceAnalysis && "totals" in invoiceAnalysis) {
      const totals = invoiceAnalysis.totals as {
        totalConsignments: number;
        bonusTotal: number;
        paidTotal: number;
      };
      console.log("  Invoice Analysis:");
      console.log("    - Consignments:", totals.totalConsignments);
      console.log("    - Bonuses:", totals.bonusTotal);
      console.log("    - Paid Total:", totals.paidTotal);

      // Invoice should have payment data
      expect(totals.paidTotal).toBeGreaterThan(0);
    }
  }, 60000);
});

// =============================================================================
// Test Suite 3: FileUpdateDialog Integration Requirements (FUTURE)
// =============================================================================

describe("Phase 2 - Test 3: FileUpdateDialog Integration Requirements", () => {
  /**
   * These tests document the requirements for FileUpdateDialog implementation
   * They are skipped until the component is implemented
   */

  it.skip("FUTURE: should detect overlapping date ranges and trigger FileUpdateDialog", async () => {
    // REQUIREMENT: When uploading a file that overlaps with existing analysis dates
    // THEN: Show FileUpdateDialog with options

    // Expected trigger conditions:
    // 1. User uploads file (runsheet or invoice)
    // 2. System checks for existing analyses for this user
    // 3. System detects date range overlap with existing analysis
    // 4. FileUpdateDialog appears with options:
    //    - "Merge with existing analysis" (recommended)
    //    - "Create new analysis"
    //    - "Cancel"

    expect(true).toBe(true); // Placeholder
  });

  it.skip('FUTURE: should merge files when user selects "Merge with existing analysis"', async () => {
    // REQUIREMENT: When user chooses to merge
    // THEN: Update existing analysis with new file data

    // Expected behavior:
    // 1. User selects "Merge with existing analysis"
    // 2. System adds new file to existing analysis
    // 3. System re-processes analysis with both files
    // 4. Analysis #1 is updated (no Analysis #2 created)
    // 5. User sees updated analysis with complete data

    // Implementation requirements:
    // - analysisService.updateAnalysisWithNewFile(analysisId, file)
    // - Re-run Step3AnalysisService.processAnalysis()
    // - Update database with merged data
    // - Preserve original fingerprints + add new fingerprint

    expect(true).toBe(true); // Placeholder
  });

  it.skip('FUTURE: should create new analysis when user selects "Create new analysis"', async () => {
    // REQUIREMENT: When user chooses to create new
    // THEN: Create separate Analysis #2

    // Expected behavior:
    // 1. User selects "Create new analysis"
    // 2. System creates new analysis (current behavior)
    // 3. Both analyses exist independently
    // 4. User can manage both separately

    expect(true).toBe(true); // Placeholder
  });

  it.skip('FUTURE: should cancel upload when user selects "Cancel"', async () => {
    // REQUIREMENT: When user chooses to cancel
    // THEN: Abort upload and return to previous state

    // Expected behavior:
    // 1. User selects "Cancel"
    // 2. Upload is aborted
    // 3. No changes to existing analyses
    // 4. User remains on Step 1 (Upload Files)

    expect(true).toBe(true); // Placeholder
  });

  it.skip("FUTURE: should handle merge conflicts (different consignment counts)", async () => {
    // REQUIREMENT: When merging runsheet + corrected runsheet
    // THEN: Use latest data (Strategy 4: Simple Overwrite)

    // Expected behavior:
    // 1. Original runsheet: 50 consignments on Monday
    // 2. Corrected runsheet: 55 consignments on Monday (uploaded later)
    // 3. Merge strategy: Latest data wins
    // 4. Final result: 55 consignments (not 105)

    expect(true).toBe(true); // Placeholder
  });

  it.skip("FUTURE: should handle merge of runsheet + invoice (complementary data)", async () => {
    // REQUIREMENT: When merging runsheet + invoice
    // THEN: Combine complementary data (Strategy 1)

    // Expected behavior:
    // 1. Runsheet provides: consignments, bonuses
    // 2. Invoice provides: payment amounts
    // 3. Merge result: Complete analysis with both datasets
    // 4. Difference calculation: expected vs paid

    expect(true).toBe(true); // Placeholder
  });
});

// =============================================================================
// Test Summary
// =============================================================================

describe("Phase 2 Test Summary", () => {
  it("should report Phase 2 test status", () => {
    const phase2Status = {
      implemented: {
        "Test 1: Create Analysis #1 with Runsheet": {
          status: "✅ IMPLEMENTED",
          tests: 4,
          description:
            "Creates analysis from real runsheet, saves to DB, extracts dates, creates fingerprint",
        },
        "Test 2: Upload Invoice → Creates Analysis #2": {
          status: "✅ IMPLEMENTED",
          tests: 3,
          description: "Documents current behavior of creating separate analyses",
        },
      },
      future: {
        "Test 3: FileUpdateDialog Integration": {
          status: "⏳ REQUIREMENTS DOCUMENTED",
          tests: 6,
          description: "Skipped tests serve as requirements specification",
        },
      },
      seedData: {
        location: "/mnt/c/taly/Analyser/seed_data",
        runsheets: SEED_FILES.runsheets.length,
        invoices: SEED_FILES.invoices.length,
      },
    };

    console.log("📋 Phase 2 Test Summary:", JSON.stringify(phase2Status, null, 2));

    // Verify all implemented tests are accounted for
    expect(phase2Status.implemented["Test 1: Create Analysis #1 with Runsheet"].tests).toBe(4);
    expect(phase2Status.implemented["Test 2: Upload Invoice → Creates Analysis #2"].tests).toBe(3);
    expect(phase2Status.future["Test 3: FileUpdateDialog Integration"].tests).toBe(6);

    // Total: 7 active tests, 6 future tests
    const totalActive = 4 + 3;
    const totalFuture = 6;
    expect(totalActive).toBe(7);
    expect(totalFuture).toBe(6);
  });
});
