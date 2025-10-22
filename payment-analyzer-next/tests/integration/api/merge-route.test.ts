/**
 * Merge API Route Integration Tests
 * Tests for POST /api/analysis/[id]/merge endpoint
 * Phase 2.1: FileUpdateDialog Implementation
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analysis/[id]/merge/route";
import { createClient } from "@/lib/supabase/server";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock PDF Processor
vi.mock("@/lib/infrastructure/pdf/pdf-processor", () => ({
  PDFProcessor: vi.fn().mockImplementation(() => ({
    processRunsheet: vi.fn().mockResolvedValue({
      consignments: {
        "2025-06-30": 50,
        "2025-07-01": 45,
        "2025-07-02": 52,
      },
    }),
    processInvoice: vi.fn().mockResolvedValue({
      payments: [
        { date: "2025-06-30", amount: 205.0 },
        { date: "2025-07-01", amount: 195.0 },
        { date: "2025-07-02", amount: 209.0 },
      ],
    }),
  })),
}));

// Mock File Fingerprint Service
vi.mock("@/lib/domain/services/file-fingerprint-service", () => ({
  FileFingerprintService: vi.fn().mockImplementation(() => ({
    createFingerprint: vi.fn().mockResolvedValue({
      fingerprint: "test-fingerprint-123",
    }),
  })),
}));

describe("POST /api/analysis/[id]/merge", () => {
  const mockUser = {
    id: "test-user-123",
    email: "test@example.com",
  };

  const mockAnalysis = {
    id: "analysis-001",
    user_id: "test-user-123",
    status: "completed",
    period_start: "30/06/2025",
    period_end: "06/07/2025",
    working_days: 5,
    total_consignments: 250,
    payment_rules: {
      weekdayRate: 4.1,
      saturdayRate: 5.9,
      unloadingBonus: 30,
      attendanceBonus: 25,
      earlyBonus: 50,
    },
    daily_entries: [
      {
        id: "entry-001",
        date: "2025-06-30",
        consignments: 50,
        expected_amount: "205.00",
        paid_amount: "205.00",
        difference: "0.00",
        unloading_bonus: true,
        attendance_bonus: true,
        early_bonus: true,
      },
    ],
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup Supabase mock
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockAnalysis,
        error: null,
      }),
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      update: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      delete: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });
  });

  it("should successfully merge runsheet and invoice files", async () => {
    // Arrange
    const runsheetFile = {
      name: "runsheet_2025-06-30.pdf",
      type: "runsheet" as const,
      content: btoa("mock-runsheet-content"),
      size: 1024,
    };

    const invoiceFile = {
      name: "invoice_2025-06-30.pdf",
      type: "invoice" as const,
      content: btoa("mock-invoice-content"),
      size: 2048,
    };

    const request = new NextRequest("http://localhost:3000/api/analysis/analysis-001/merge", {
      method: "POST",
      body: JSON.stringify({
        files: [runsheetFile, invoiceFile],
        mergeStrategy: "smart",
      }),
    });

    // Act
    const response = await POST(request, { params: { id: "analysis-001" } });
    const result = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.message).toContain("Successfully merged");
    expect(result.updatedTotals).toBeDefined();
  });

  it("should reject request when user is not authenticated", async () => {
    // Arrange
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Unauthorized" },
        }),
      },
    });

    const request = new NextRequest("http://localhost:3000/api/analysis/analysis-001/merge", {
      method: "POST",
      body: JSON.stringify({
        files: [{ name: "test.pdf", type: "runsheet", content: "test", size: 100 }],
        mergeStrategy: "smart",
      }),
    });

    // Act
    const response = await POST(request, { params: { id: "analysis-001" } });

    // Assert
    expect(response.status).toBe(401);
    const result = await response.json();
    expect(result.error).toBe("Unauthorized");
  });

  it("should reject request when analysis does not exist", async () => {
    // Arrange
    const supabaseMock = await createClient();
    (
      supabaseMock.from("analyses").select().eq().single as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const request = new NextRequest("http://localhost:3000/api/analysis/non-existent/merge", {
      method: "POST",
      body: JSON.stringify({
        files: [{ name: "test.pdf", type: "runsheet", content: "test", size: 100 }],
        mergeStrategy: "smart",
      }),
    });

    // Act
    const response = await POST(request, { params: { id: "non-existent" } });

    // Assert
    expect(response.status).toBe(404);
    const result = await response.json();
    expect(result.error).toContain("not found");
  });

  it("should reject request when file size exceeds limit", async () => {
    // Arrange
    const largeFile = {
      name: "large.pdf",
      type: "runsheet" as const,
      content: btoa("x".repeat(100)),
      size: 11 * 1024 * 1024, // 11MB (exceeds 10MB limit)
    };

    const request = new NextRequest("http://localhost:3000/api/analysis/analysis-001/merge", {
      method: "POST",
      body: JSON.stringify({
        files: [largeFile],
        mergeStrategy: "smart",
      }),
    });

    // Act
    const response = await POST(request, { params: { id: "analysis-001" } });

    // Assert
    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toContain("exceeds maximum size");
  });

  it("should reject duplicate files", async () => {
    // Arrange
    const supabaseMock = await createClient();

    // Mock existing file check
    (
      supabaseMock.from("analysis_files").select().eq as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      data: [
        {
          file_fingerprint: "test-fingerprint-123",
          original_name: "runsheet_2025-06-30.pdf",
        },
      ],
      error: null,
    });

    const duplicateFile = {
      name: "runsheet_2025-06-30.pdf",
      type: "runsheet" as const,
      content: btoa("same-content"),
      size: 1024,
    };

    const request = new NextRequest("http://localhost:3000/api/analysis/analysis-001/merge", {
      method: "POST",
      body: JSON.stringify({
        files: [duplicateFile],
        mergeStrategy: "smart",
      }),
    });

    // Act
    const response = await POST(request, { params: { id: "analysis-001" } });

    // Assert
    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toContain("Duplicate files detected");
  });

  it("should handle invalid request body", async () => {
    // Arrange
    const request = new NextRequest("http://localhost:3000/api/analysis/analysis-001/merge", {
      method: "POST",
      body: JSON.stringify({
        files: [], // Empty array (invalid)
        mergeStrategy: "smart",
      }),
    });

    // Act
    const response = await POST(request, { params: { id: "analysis-001" } });

    // Assert
    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toBe("Invalid request data");
  });

  it("should use smart merge strategy by default", async () => {
    // Arrange
    const file = {
      name: "runsheet_2025-06-30.pdf",
      type: "runsheet" as const,
      content: btoa("content"),
      size: 1024,
    };

    const request = new NextRequest("http://localhost:3000/api/analysis/analysis-001/merge", {
      method: "POST",
      body: JSON.stringify({
        files: [file],
        // mergeStrategy omitted (should default to 'smart')
      }),
    });

    // Act
    const response = await POST(request, { params: { id: "analysis-001" } });
    const result = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
  });

  it("should update analysis metadata after merge", async () => {
    // Arrange
    const supabaseMock = await createClient();
    const updateSpy = vi.spyOn(supabaseMock.from("analyses"), "update");

    const file = {
      name: "runsheet_2025-07-07.pdf",
      type: "runsheet" as const,
      content: btoa("content"),
      size: 1024,
    };

    const request = new NextRequest("http://localhost:3000/api/analysis/analysis-001/merge", {
      method: "POST",
      body: JSON.stringify({
        files: [file],
        mergeStrategy: "smart",
      }),
    });

    // Act
    await POST(request, { params: { id: "analysis-001" } });

    // Assert
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        updated_at: expect.any(String),
        status: "completed",
      })
    );
  });

  it("should log merged files to analysis_files table", async () => {
    // Arrange
    const supabaseMock = await createClient();
    const insertSpy = vi.spyOn(supabaseMock.from("analysis_files"), "insert");

    const file = {
      name: "runsheet_2025-07-07.pdf",
      type: "runsheet" as const,
      content: btoa("content"),
      size: 1024,
    };

    const request = new NextRequest("http://localhost:3000/api/analysis/analysis-001/merge", {
      method: "POST",
      body: JSON.stringify({
        files: [file],
        mergeStrategy: "smart",
      }),
    });

    // Act
    await POST(request, { params: { id: "analysis-001" } });

    // Assert
    expect(insertSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          analysis_id: "analysis-001",
          original_name: file.name,
          file_size: file.size,
          file_type: file.type,
        }),
      ])
    );
  });

  it("should recalculate totals after merge", async () => {
    // Arrange
    const file = {
      name: "invoice_2025-07-01.pdf",
      type: "invoice" as const,
      content: btoa("content"),
      size: 2048,
    };

    const request = new NextRequest("http://localhost:3000/api/analysis/analysis-001/merge", {
      method: "POST",
      body: JSON.stringify({
        files: [file],
        mergeStrategy: "smart",
      }),
    });

    // Act
    const response = await POST(request, { params: { id: "analysis-001" } });
    const result = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(result.updatedTotals).toBeDefined();
    expect(result.updatedTotals).toHaveProperty("totalConsignments");
    expect(result.updatedTotals).toHaveProperty("totalExpected");
    expect(result.updatedTotals).toHaveProperty("totalPaid");
    expect(result.updatedTotals).toHaveProperty("totalDifference");
  });
});
