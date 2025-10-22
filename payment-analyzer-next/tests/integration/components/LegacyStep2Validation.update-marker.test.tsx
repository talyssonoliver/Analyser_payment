/**
 * Integration Tests for LegacyStep2Validation with Update Markers
 *
 * Tests the integration of file update markers in Step 2 validation.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LegacyStep2Validation } from "@/components/analysis/validation/legacy-step2-validation";
import { FileFingerprintService } from "@/lib/services/file-fingerprint-service";

// Mock FileFingerprintService
vi.mock("@/lib/services/file-fingerprint-service");

describe("LegacyStep2Validation - Update Markers Integration", () => {
  // Create mock files
  const createMockFile = (name: string, size: number, lastModified: number): File => {
    const blob = new Blob(["test content"], { type: "application/pdf" });
    const file = new File([blob], name, {
      type: "application/pdf",
      lastModified,
    });

    Object.defineProperty(file, "size", {
      value: size,
      writable: false,
    });

    return file;
  };

  const mockRunsheet = createMockFile("runsheet_week1.pdf", 1024, Date.now());
  const mockInvoice = createMockFile("invoice_week1.pdf", 2048, Date.now());

  const mockValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const mockOnAnalyzeWeek = vi.fn();
  const mockOnFileRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("New Files Scenario", () => {
    it("should NOT show update markers for new files", async () => {
      // Mock: No previous fingerprints exist
      vi.mocked(FileFingerprintService.compareWithExisting).mockResolvedValue({
        isIdentical: false,
        isDuplicate: false,
        hasChanged: false,
      });

      vi.mocked(FileFingerprintService.generateHash).mockResolvedValue("abc123");

      render(
        <LegacyStep2Validation
          uploadedFiles={[mockRunsheet, mockInvoice]}
          validationResult={mockValidationResult}
          onAnalyzeWeek={mockOnAnalyzeWeek}
          onFileRemove={mockOnFileRemove}
        />
      );

      // Wait for file update detection to complete
      await waitFor(() => {
        expect(screen.getByText("runsheet_week1.pdf")).toBeInTheDocument();
      });

      // Should NOT show "Updated" markers
      const updatedMarkers = screen.queryAllByText("Updated");
      expect(updatedMarkers).toHaveLength(0);
    });
  });

  describe("Updated Files Scenario", () => {
    it("should show update markers for modified files", async () => {
      const previousProcessedAt = Date.now() - 86400000; // 1 day ago

      // Mock: Runsheet is updated, invoice is new
      vi.mocked(FileFingerprintService.compareWithExisting)
        .mockResolvedValueOnce({
          isIdentical: false,
          isDuplicate: false,
          hasChanged: true,
          previousFingerprint: {
            hash: "old_runsheet_hash",
            processedAt: previousProcessedAt,
            name: mockRunsheet.name,
            size: mockRunsheet.size,
            lastModified: mockRunsheet.lastModified - 1000,
            type: "runsheet",
          },
          changeType: "content",
        })
        .mockResolvedValueOnce({
          isIdentical: false,
          isDuplicate: false,
          hasChanged: false,
        });

      vi.mocked(FileFingerprintService.generateHash)
        .mockResolvedValueOnce("new_runsheet_hash")
        .mockResolvedValueOnce("new_invoice_hash");

      render(
        <LegacyStep2Validation
          uploadedFiles={[mockRunsheet, mockInvoice]}
          validationResult={mockValidationResult}
          onAnalyzeWeek={mockOnAnalyzeWeek}
          onFileRemove={mockOnFileRemove}
        />
      );

      // Wait for update detection
      await waitFor(() => {
        const markers = screen.queryAllByText("Updated");
        expect(markers.length).toBeGreaterThan(0);
      });

      // Should show exactly 1 "Updated" marker (for runsheet only)
      const updatedMarkers = screen.getAllByText("Updated");
      expect(updatedMarkers).toHaveLength(1);
    });

    it("should show update marker with correct change type in tooltip", async () => {
      const previousProcessedAt = Date.now() - 3600000; // 1 hour ago

      vi.mocked(FileFingerprintService.compareWithExisting).mockResolvedValue({
        isIdentical: false,
        isDuplicate: false,
        hasChanged: true,
        previousFingerprint: {
          hash: "old_hash",
          processedAt: previousProcessedAt,
          name: mockRunsheet.name,
          size: 512, // Different size
          lastModified: mockRunsheet.lastModified,
          type: "runsheet",
        },
        changeType: "size",
      });

      vi.mocked(FileFingerprintService.generateHash).mockResolvedValue("new_hash");

      render(
        <LegacyStep2Validation
          uploadedFiles={[mockRunsheet]}
          validationResult={mockValidationResult}
          onAnalyzeWeek={mockOnAnalyzeWeek}
          onFileRemove={mockOnFileRemove}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Updated")).toBeInTheDocument();
      });

      // Check for update marker
      const updateMarker = screen.getByRole("status");
      expect(updateMarker).toBeInTheDocument();

      // Verify aria-label contains change type
      const ariaLabel = updateMarker.getAttribute("aria-label") || "";
      expect(ariaLabel).toContain("Size");
    });
  });

  describe("Duplicate Files Scenario", () => {
    it("should NOT show update markers for identical duplicates", async () => {
      const previousProcessedAt = Date.now() - 3600000;

      // Mock: Files are identical duplicates
      vi.mocked(FileFingerprintService.compareWithExisting).mockResolvedValue({
        isIdentical: true,
        isDuplicate: true,
        hasChanged: false,
        previousFingerprint: {
          hash: "same_hash",
          processedAt: previousProcessedAt,
          name: mockRunsheet.name,
          size: mockRunsheet.size,
          lastModified: mockRunsheet.lastModified,
          type: "runsheet",
        },
      });

      vi.mocked(FileFingerprintService.generateHash).mockResolvedValue("same_hash");

      render(
        <LegacyStep2Validation
          uploadedFiles={[mockRunsheet]}
          validationResult={mockValidationResult}
          onAnalyzeWeek={mockOnAnalyzeWeek}
          onFileRemove={mockOnFileRemove}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("runsheet_week1.pdf")).toBeInTheDocument();
      });

      // Should NOT show "Updated" markers for duplicates
      const updatedMarkers = screen.queryAllByText("Updated");
      expect(updatedMarkers).toHaveLength(0);
    });
  });

  describe("Mixed Files Scenario", () => {
    it("should show markers only for updated files in mixed set", async () => {
      const previousProcessedAt = Date.now() - 86400000;
      const mockInvoice2 = createMockFile("invoice_week2.pdf", 3072, Date.now());

      // Runsheet: Updated
      // Invoice 1: New
      // Invoice 2: Duplicate
      vi.mocked(FileFingerprintService.compareWithExisting)
        .mockResolvedValueOnce({
          isIdentical: false,
          isDuplicate: false,
          hasChanged: true,
          previousFingerprint: {
            hash: "old_runsheet",
            processedAt: previousProcessedAt,
            name: mockRunsheet.name,
            size: mockRunsheet.size,
            lastModified: mockRunsheet.lastModified - 1000,
            type: "runsheet",
          },
          changeType: "timestamp",
        })
        .mockResolvedValueOnce({
          isIdentical: false,
          isDuplicate: false,
          hasChanged: false,
        })
        .mockResolvedValueOnce({
          isIdentical: true,
          isDuplicate: true,
          hasChanged: false,
          previousFingerprint: {
            hash: "same_invoice",
            processedAt: previousProcessedAt,
            name: mockInvoice2.name,
            size: mockInvoice2.size,
            lastModified: mockInvoice2.lastModified,
            type: "invoice",
          },
        });

      vi.mocked(FileFingerprintService.generateHash)
        .mockResolvedValueOnce("new_runsheet")
        .mockResolvedValueOnce("new_invoice1")
        .mockResolvedValueOnce("same_invoice");

      render(
        <LegacyStep2Validation
          uploadedFiles={[mockRunsheet, mockInvoice, mockInvoice2]}
          validationResult={mockValidationResult}
          onAnalyzeWeek={mockOnAnalyzeWeek}
          onFileRemove={mockOnFileRemove}
        />
      );

      await waitFor(() => {
        const markers = screen.queryAllByText("Updated");
        expect(markers.length).toBe(1);
      });

      // Should show exactly 1 "Updated" marker (for runsheet only)
      const updatedMarkers = screen.getAllByText("Updated");
      expect(updatedMarkers).toHaveLength(1);
    });
  });

  describe("UI Integration", () => {
    it("should display update marker beside file name", async () => {
      const previousProcessedAt = Date.now() - 86400000;

      vi.mocked(FileFingerprintService.compareWithExisting).mockResolvedValue({
        isIdentical: false,
        isDuplicate: false,
        hasChanged: true,
        previousFingerprint: {
          hash: "old_hash",
          processedAt: previousProcessedAt,
          name: mockRunsheet.name,
          size: mockRunsheet.size,
          lastModified: mockRunsheet.lastModified - 1000,
          type: "runsheet",
        },
        changeType: "content",
      });

      vi.mocked(FileFingerprintService.generateHash).mockResolvedValue("new_hash");

      render(
        <LegacyStep2Validation
          uploadedFiles={[mockRunsheet]}
          validationResult={mockValidationResult}
          onAnalyzeWeek={mockOnAnalyzeWeek}
          onFileRemove={mockOnFileRemove}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Updated")).toBeInTheDocument();
      });

      // File name and update marker should be in the same container
      const fileName = screen.getByText("runsheet_week1.pdf");
      const updateMarker = screen.getByText("Updated");

      // Both should be present
      expect(fileName).toBeInTheDocument();
      expect(updateMarker).toBeInTheDocument();
    });

    it("should NOT show update markers while detection is loading", () => {
      // Don't mock the service to keep it in loading state
      vi.mocked(FileFingerprintService.compareWithExisting).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <LegacyStep2Validation
          uploadedFiles={[mockRunsheet]}
          validationResult={mockValidationResult}
          onAnalyzeWeek={mockOnAnalyzeWeek}
          onFileRemove={mockOnFileRemove}
        />
      );

      // Should not show markers while loading
      const updatedMarkers = screen.queryAllByText("Updated");
      expect(updatedMarkers).toHaveLength(0);
    });

    it("should maintain file list functionality with update markers", async () => {
      const previousProcessedAt = Date.now() - 86400000;

      vi.mocked(FileFingerprintService.compareWithExisting).mockResolvedValue({
        isIdentical: false,
        isDuplicate: false,
        hasChanged: true,
        previousFingerprint: {
          hash: "old_hash",
          processedAt: previousProcessedAt,
          name: mockRunsheet.name,
          size: mockRunsheet.size,
          lastModified: mockRunsheet.lastModified - 1000,
          type: "runsheet",
        },
        changeType: "content",
      });

      vi.mocked(FileFingerprintService.generateHash).mockResolvedValue("new_hash");

      render(
        <LegacyStep2Validation
          uploadedFiles={[mockRunsheet]}
          validationResult={mockValidationResult}
          onAnalyzeWeek={mockOnAnalyzeWeek}
          onFileRemove={mockOnFileRemove}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Updated")).toBeInTheDocument();
      });

      // File type badge should still be displayed
      expect(screen.getByText("Runsheet")).toBeInTheDocument();

      // File size should still be displayed
      expect(screen.getByText("1.0KB")).toBeInTheDocument();

      // Remove button should still be present
      const removeButton = screen.getByLabelText("Remove runsheet_week1.pdf");
      expect(removeButton).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle file update detection errors gracefully", async () => {
      // Mock service to throw error
      vi.mocked(FileFingerprintService.compareWithExisting).mockRejectedValue(
        new Error("Hash generation failed")
      );

      render(
        <LegacyStep2Validation
          uploadedFiles={[mockRunsheet]}
          validationResult={mockValidationResult}
          onAnalyzeWeek={mockOnAnalyzeWeek}
          onFileRemove={mockOnFileRemove}
        />
      );

      // Component should still render file list
      await waitFor(() => {
        expect(screen.getByText("runsheet_week1.pdf")).toBeInTheDocument();
      });

      // Should not show update markers on error
      const updatedMarkers = screen.queryAllByText("Updated");
      expect(updatedMarkers).toHaveLength(0);
    });
  });
});
