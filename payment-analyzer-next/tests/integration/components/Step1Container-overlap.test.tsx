/**
 * Step1Container Overlap Detection Integration Tests
 * Tests for file overlap detection and FileUpdateDialog flow
 * Phase 2.1: FileUpdateDialog Implementation
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Step1Container } from "@/components/analysis/containers/Step1Container";
import type { AnalysisWithDetails } from "@/lib/repositories/analysis-repository";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { QuickDateExtractor } from "@/lib/services/quick-date-extractor";
import { Result } from "@/lib/utils/errors";

// Mock dependencies
vi.mock("@/lib/services/quick-date-extractor");
vi.mock("@/lib/repositories/analysis-repository");
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: "test-user-123",
            },
          },
        },
      }),
    },
  }),
}));

vi.mock("@/hooks/useSessionRecovery", () => ({
  useSessionRecovery: vi.fn().mockReturnValue({
    recoveryData: null,
    showBanner: false,
    handleRestore: vi.fn(),
    handleDismiss: vi.fn(),
  }),
}));

vi.mock("@/hooks/useFileValidationAndHashing", () => ({
  useFileValidationAndHashing: vi.fn().mockReturnValue({
    validateAndHash: vi.fn(),
  }),
}));

describe("Step1Container - Overlap Detection", () => {
  const mockProps = {
    inputMethod: "upload" as const,
    uploadedFiles: [],
    manualEntries: [],
    currentStep: 1,
    onInputMethodChange: vi.fn(),
    onFilesUploaded: vi.fn(),
    onManualEntriesChanged: vi.fn(),
    onStepComplete: vi.fn(),
    onError: vi.fn(),
  };

  const mockExistingAnalysis: AnalysisWithDetails = {
    id: "analysis-001",
    user_id: "test-user-123",
    fingerprint: "test-fingerprint",
    source: "upload",
    status: "completed",
    period_start: "30/06/2025",
    period_end: "06/07/2025",
    rules_version: 1,
    working_days: 5,
    total_consignments: 250,
    metadata: {},
    created_at: "2025-06-30T00:00:00Z",
    updated_at: "2025-06-30T00:00:00Z",
    analysis_totals: {
      id: "totals-001",
      analysis_id: "analysis-001",
      base_total: 1000,
      pickup_total: 50,
      bonus_total: 200,
      expected_total: 1250,
      paid_total: 1250,
      difference_total: 0,
      created_at: "2025-06-30T00:00:00Z",
    },
    analysis_files: [
      {
        id: "file-001",
        analysis_id: "analysis-001",
        storage_path: "path/to/file",
        original_name: "runsheet_2025-06-30.pdf",
        file_size: 1024,
        file_hash: "hash123",
        mime_type: "application/pdf",
        file_type: "runsheet",
        created_at: "2025-06-30T00:00:00Z",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect overlap and show FileUpdateDialog", async () => {
    // Arrange
    const newFiles = [
      new File(["content"], "runsheet_2025-07-01.pdf", { type: "application/pdf" }),
    ];

    // Mock date extraction
    (QuickDateExtractor.extractDateRange as ReturnType<typeof vi.fn>).mockResolvedValue({
      start: "30/06/2025",
      end: "06/07/2025",
    });

    // Mock overlap detection
    (QuickDateExtractor.dateRangesOverlap as ReturnType<typeof vi.fn>).mockReturnValue(true);

    // Mock repository
    (analysisRepository.getUserAnalyses as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.success({
        data: [mockExistingAnalysis],
        count: 1,
      })
    );

    // Act
    render(<Step1Container {...mockProps} />);

    // Find file input and upload files
    const fileInput = screen.getByLabelText(/upload/i);
    fireEvent.change(fileInput, { target: { files: newFiles } });

    // Assert - Dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/File Update Detected/i)).toBeInTheDocument();
    });

    // Check dialog content
    expect(screen.getByText(/Existing Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/New Files Being Uploaded/i)).toBeInTheDocument();
    expect(screen.getByText(/Merge with existing analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Create new analysis/i)).toBeInTheDocument();
  });

  it("should proceed without dialog when no overlap detected", async () => {
    // Arrange
    const newFiles = [
      new File(["content"], "runsheet_2025-07-14.pdf", { type: "application/pdf" }),
    ];

    // Mock date extraction (different week)
    (QuickDateExtractor.extractDateRange as ReturnType<typeof vi.fn>).mockResolvedValue({
      start: "14/07/2025",
      end: "20/07/2025",
    });

    // Mock no overlap
    (QuickDateExtractor.dateRangesOverlap as ReturnType<typeof vi.fn>).mockReturnValue(false);

    // Mock repository
    (analysisRepository.getUserAnalyses as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.success({
        data: [mockExistingAnalysis],
        count: 1,
      })
    );

    // Act
    render(<Step1Container {...mockProps} />);

    const fileInput = screen.getByLabelText(/upload/i);
    fireEvent.change(fileInput, { target: { files: newFiles } });

    // Assert - Dialog should NOT appear
    await waitFor(() => {
      expect(screen.queryByText(/File Update Detected/i)).not.toBeInTheDocument();
    });
  });

  it("should handle merge action from dialog", async () => {
    // Arrange
    const newFiles = [new File(["content"], "invoice_2025-07-01.pdf", { type: "application/pdf" })];

    (QuickDateExtractor.extractDateRange as ReturnType<typeof vi.fn>).mockResolvedValue({
      start: "30/06/2025",
      end: "06/07/2025",
    });

    (QuickDateExtractor.dateRangesOverlap as ReturnType<typeof vi.fn>).mockReturnValue(true);

    (analysisRepository.getUserAnalyses as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.success({
        data: [mockExistingAnalysis],
        count: 1,
      })
    );

    // Mock successful merge API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Successfully merged 1 file(s)",
        updatedTotals: {
          totalConsignments: 260,
          totalExpected: 1300,
          totalPaid: 1300,
          totalDifference: 0,
        },
      }),
    });

    // Act
    render(<Step1Container {...mockProps} />);

    const fileInput = screen.getByLabelText(/upload/i);
    fireEvent.change(fileInput, { target: { files: newFiles } });

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText(/File Update Detected/i)).toBeInTheDocument();
    });

    // Click Continue (with Merge selected by default)
    const continueButton = screen.getByText(/Continue/i);
    fireEvent.click(continueButton);

    // Assert - Merge API should be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/analysis/analysis-001/merge",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
    });
  });

  it("should handle create new action from dialog", async () => {
    // Arrange
    const newFiles = [
      new File(["content"], "runsheet_2025-07-01.pdf", { type: "application/pdf" }),
    ];

    (QuickDateExtractor.extractDateRange as ReturnType<typeof vi.fn>).mockResolvedValue({
      start: "30/06/2025",
      end: "06/07/2025",
    });

    (QuickDateExtractor.dateRangesOverlap as ReturnType<typeof vi.fn>).mockReturnValue(true);

    (analysisRepository.getUserAnalyses as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.success({
        data: [mockExistingAnalysis],
        count: 1,
      })
    );

    // Mock validation
    const { validateAndHash } = vi
      .mocked(await import("@/hooks/useFileValidationAndHashing"))
      .useFileValidationAndHashing();

    // Act
    render(<Step1Container {...mockProps} />);

    const fileInput = screen.getByLabelText(/upload/i);
    fireEvent.change(fileInput, { target: { files: newFiles } });

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText(/File Update Detected/i)).toBeInTheDocument();
    });

    // Select "Create new analysis"
    const createNewRadio = screen.getByLabelText(/Create new analysis/i);
    fireEvent.click(createNewRadio);

    // Click Continue
    const continueButton = screen.getByText(/Continue/i);
    fireEvent.click(continueButton);

    // Assert - Should proceed with normal workflow
    await waitFor(() => {
      expect(validateAndHash).toHaveBeenCalledWith(newFiles);
    });
  });

  it("should handle dialog cancellation", async () => {
    // Arrange
    const newFiles = [
      new File(["content"], "runsheet_2025-07-01.pdf", { type: "application/pdf" }),
    ];

    (QuickDateExtractor.extractDateRange as ReturnType<typeof vi.fn>).mockResolvedValue({
      start: "30/06/2025",
      end: "06/07/2025",
    });

    (QuickDateExtractor.dateRangesOverlap as ReturnType<typeof vi.fn>).mockReturnValue(true);

    (analysisRepository.getUserAnalyses as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.success({
        data: [mockExistingAnalysis],
        count: 1,
      })
    );

    // Act
    render(<Step1Container {...mockProps} />);

    const fileInput = screen.getByLabelText(/upload/i);
    fireEvent.change(fileInput, { target: { files: newFiles } });

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText(/File Update Detected/i)).toBeInTheDocument();
    });

    // Click Cancel
    const cancelButton = screen.getByText(/Cancel/i);
    fireEvent.click(cancelButton);

    // Assert - Dialog should close
    await waitFor(() => {
      expect(screen.queryByText(/File Update Detected/i)).not.toBeInTheDocument();
    });

    // Files should not be processed
    expect(mockProps.onFilesUploaded).not.toHaveBeenCalled();
  });

  it("should display existing analysis details in dialog", async () => {
    // Arrange
    const newFiles = [new File(["content"], "invoice_2025-07-01.pdf", { type: "application/pdf" })];

    (QuickDateExtractor.extractDateRange as ReturnType<typeof vi.fn>).mockResolvedValue({
      start: "30/06/2025",
      end: "06/07/2025",
    });

    (QuickDateExtractor.dateRangesOverlap as ReturnType<typeof vi.fn>).mockReturnValue(true);

    (analysisRepository.getUserAnalyses as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.success({
        data: [mockExistingAnalysis],
        count: 1,
      })
    );

    // Act
    render(<Step1Container {...mockProps} />);

    const fileInput = screen.getByLabelText(/upload/i);
    fireEvent.change(fileInput, { target: { files: newFiles } });

    // Assert - Dialog should show existing analysis details
    await waitFor(() => {
      expect(screen.getByText(/30 Jun 2025 - 06 Jul 2025/i)).toBeInTheDocument();
      expect(screen.getByText(/1 file/i)).toBeInTheDocument();
      expect(screen.getByText(/runsheet_2025-06-30.pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/Working Days:/i)).toBeInTheDocument();
      expect(screen.getByText(/5/i)).toBeInTheDocument();
    });
  });

  it("should display new files details in dialog", async () => {
    // Arrange
    const newFiles = [
      new File(["content"], "invoice_2025-07-01.pdf", { type: "application/pdf" }),
      new File(["content"], "invoice_2025-07-02.pdf", { type: "application/pdf" }),
    ];

    (QuickDateExtractor.extractDateRange as ReturnType<typeof vi.fn>).mockResolvedValue({
      start: "30/06/2025",
      end: "06/07/2025",
    });

    (QuickDateExtractor.dateRangesOverlap as ReturnType<typeof vi.fn>).mockReturnValue(true);

    (analysisRepository.getUserAnalyses as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.success({
        data: [mockExistingAnalysis],
        count: 1,
      })
    );

    // Act
    render(<Step1Container {...mockProps} />);

    const fileInput = screen.getByLabelText(/upload/i);
    fireEvent.change(fileInput, { target: { files: newFiles } });

    // Assert - Dialog should show new files
    await waitFor(() => {
      expect(screen.getByText(/New Files Being Uploaded/i)).toBeInTheDocument();
      expect(screen.getByText(/2 files/i)).toBeInTheDocument();
      expect(screen.getByText(/invoice_2025-07-01.pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/invoice_2025-07-02.pdf/i)).toBeInTheDocument();
    });
  });

  it("should show dialog within 200ms performance target", async () => {
    // Arrange
    const newFiles = [
      new File(["content"], "runsheet_2025-07-01.pdf", { type: "application/pdf" }),
    ];

    (QuickDateExtractor.extractDateRange as ReturnType<typeof vi.fn>).mockResolvedValue({
      start: "30/06/2025",
      end: "06/07/2025",
    });

    (QuickDateExtractor.dateRangesOverlap as ReturnType<typeof vi.fn>).mockReturnValue(true);

    (analysisRepository.getUserAnalyses as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.success({
        data: [mockExistingAnalysis],
        count: 1,
      })
    );

    // Act
    const startTime = performance.now();
    render(<Step1Container {...mockProps} />);

    const fileInput = screen.getByLabelText(/upload/i);
    fireEvent.change(fileInput, { target: { files: newFiles } });

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText(/File Update Detected/i)).toBeInTheDocument();
    });

    const elapsed = performance.now() - startTime;

    // Assert - Should appear quickly (within 200ms target)
    expect(elapsed).toBeLessThan(200);
  });

  it("should gracefully handle auth errors", async () => {
    // Arrange
    const newFiles = [
      new File(["content"], "runsheet_2025-07-01.pdf", { type: "application/pdf" }),
    ];

    (QuickDateExtractor.extractDateRange as ReturnType<typeof vi.fn>).mockResolvedValue({
      start: "30/06/2025",
      end: "06/07/2025",
    });

    // Mock auth error
    vi.mocked(await import("@/lib/supabase/client")).createClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    } as never);

    const { validateAndHash } = vi
      .mocked(await import("@/hooks/useFileValidationAndHashing"))
      .useFileValidationAndHashing();

    // Act
    render(<Step1Container {...mockProps} />);

    const fileInput = screen.getByLabelText(/upload/i);
    fireEvent.change(fileInput, { target: { files: newFiles } });

    // Assert - Should proceed without dialog when auth fails
    await waitFor(() => {
      expect(validateAndHash).toHaveBeenCalledWith(newFiles);
    });

    expect(screen.queryByText(/File Update Detected/i)).not.toBeInTheDocument();
  });
});
