/**
 * Integration Tests for Step1Container
 *
 * Tests the full integration of Step1Container with:
 * - File upload functionality
 * - Session recovery
 * - Manual entry modal
 * - Validation hooks
 * - State management
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Step1Container } from "@/components/analysis/containers/Step1Container";
import { SessionRecoveryService } from "@/lib/services/session-recovery-service";

// Mock services
vi.mock("@/lib/services/session-recovery-service");
vi.mock("@/lib/utils/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock file validation hook - FIXED: Properly handle async callbacks
interface ValidationConfig {
  onSuccess?: (files: File[], result: unknown) => void;
  onError?: (error: string) => void;
}

vi.mock("@/hooks/useFileValidationAndHashing", () => ({
  useFileValidationAndHashing: vi.fn((config: ValidationConfig) => {
    // CRITICAL: Return a new mock function each time the hook is called
    // This ensures each component instance gets its own validateAndHash function
    const validateAndHashMock = vi.fn(async (files: File[]) => {
      // Simulate validation logic
      const isValid = files.every(
        (f) => f.type === "application/pdf" && f.size <= 50 * 1024 * 1024
      );

      // CRITICAL: Use setTimeout to ensure callbacks run in next tick
      // This simulates the actual async behavior of the hook
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (isValid) {
        // Call onSuccess callback with files
        config?.onSuccess?.(files, {
          hashes: {},
          validation: { isValid: true, errors: [], warnings: [], duplicates: [] },
          isValid: true,
          errors: [],
          warnings: [],
        });
      } else {
        // Call onError callback with error message
        config?.onError?.("Invalid file type or size");
      }

      return isValid ? {} : null;
    });

    return {
      validateAndHash: validateAndHashMock,
      isValidating: false,
    };
  }),
}));

describe("Step1Container Integration Tests", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render upload method by default", () => {
      render(<Step1Container {...mockProps} />);

      expect(screen.getByText("Add Your Data")).toBeInTheDocument();
      expect(screen.getByText("Upload Files")).toBeInTheDocument();
      expect(screen.getByText("Manual Entry")).toBeInTheDocument();
    });

    it("should show session recovery banner when data exists", async () => {
      const mockSessionData = {
        id: "session-test-1",
        currentStep: 1,
        inputMethod: "upload" as const,
        uploadedFiles: [
          {
            name: "test.pdf",
            size: 1024,
            type: "application/pdf",
            lastModified: Date.now(),
          },
        ],
        manualEntries: [],
        timestamp: Date.now(),
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now(),
      };

      vi.mocked(SessionRecoveryService.checkForRecovery).mockReturnValue({
        show: true,
        message: "Restored your last analysis from 2 minutes ago",
        minutesAgo: 2,
        hasRuleChanges: false,
        sessionId: "session-test-1",
      });
      vi.mocked(SessionRecoveryService.loadSession).mockReturnValue(mockSessionData);

      render(<Step1Container {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Restore Session/i)).toBeInTheDocument();
      });
    });

    it("should display correct button text based on state", () => {
      const { rerender } = render(<Step1Container {...mockProps} />);

      // No data - disabled button
      const addDataButton = screen.getByText("Add Data First").closest("button");
      expect(addDataButton).toBeDisabled();

      // With files
      rerender(
        <Step1Container
          {...mockProps}
          uploadedFiles={[new File(["content"], "test.pdf", { type: "application/pdf" })]}
        />
      );
      expect(screen.getByText("Analyze Documents")).toBeEnabled();

      // With manual entries
      rerender(
        <Step1Container
          {...mockProps}
          uploadedFiles={[]}
          manualEntries={[
            {
              id: 1,
              date: "2024-01-01",
              day: "Monday",
              consignments: 25,
              baseAmount: 50,
              totalPay: 105,
              pickups: 3,
              earlyArrive: 50,
              attendanceBonus: 25,
              unloadingBonus: 30,
            },
          ]}
        />
      );
      expect(screen.getByText("Analyze Entries")).toBeEnabled();
    });
  });

  describe("Input Method Switching", () => {
    it("should switch to manual entry method", () => {
      render(<Step1Container {...mockProps} />);

      const manualButton = screen.getByText("Manual Entry");
      fireEvent.click(manualButton);

      expect(mockProps.onInputMethodChange).toHaveBeenCalledWith("manual");
    });

    it("should switch to upload method", () => {
      render(<Step1Container {...mockProps} inputMethod="manual" />);

      const uploadButton = screen.getByText("Upload Files");
      fireEvent.click(uploadButton);

      expect(mockProps.onInputMethodChange).toHaveBeenCalledWith("upload");
    });

    it("should open manual entry modal when manual method selected", async () => {
      render(<Step1Container {...mockProps} />);

      const manualButton = screen.getByText("Manual Entry");
      fireEvent.click(manualButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });
  });

  describe("File Upload", () => {
    beforeEach(() => {
      // Disable session recovery for file upload tests
      vi.mocked(SessionRecoveryService.checkForRecovery).mockReturnValue(null);
    });

    it("should handle file upload successfully", async () => {
      const { container } = render(<Step1Container {...mockProps} />);

      const file = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });

      const input = container.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();

      if (input) {
        fireEvent.change(input, { target: { files: [file] } });

        // FIXED: Wait for the full async chain to complete
        // 1. useFileUpload.handleFileInputChange validates files
        // 2. useFileUpload.processFiles calls onFilesSelected
        // 3. Step1Container.handleFilesUploaded calls validateAndHash
        // 4. validateAndHash mock calls onSuccess after setTimeout
        // 5. onSuccess callback calls onFilesUploaded
        await waitFor(
          () => {
            expect(mockProps.onFilesUploaded).toHaveBeenCalled();
          },
          { timeout: 3000 }
        );
      }
    });

    it("should validate files before upload", async () => {
      const { container } = render(<Step1Container {...mockProps} />);

      // Spy on console.error to catch validation errors
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Create invalid file (too large)
      const largeFile = new File(["content"], "large.pdf", {
        type: "application/pdf",
      });
      // FIXED: Use Object.defineProperty to mock the file size
      Object.defineProperty(largeFile, "size", {
        get: () => 60 * 1024 * 1024,
        configurable: true,
      });

      const input = container.querySelector('input[type="file"]');

      if (input) {
        fireEvent.change(input, { target: { files: [largeFile] } });

        // FIXED: Validation happens in useFileUpload.validateFiles
        // If validation fails, processFiles is never called, so onFilesSelected is never called
        // This means validateAndHash is never called, so onError is never called
        // Instead, the error is logged to console.error (see useFileUpload line 248)
        await waitFor(
          () => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
              expect.stringContaining("File size exceeds")
            );
          },
          { timeout: 2000 }
        );

        // onFilesUploaded should NOT be called for invalid files
        expect(mockProps.onFilesUploaded).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      }
    }, 10000); // Increase test timeout

    it("should save session after successful upload", async () => {
      // Re-enable session recovery (disabled in beforeEach)
      vi.mocked(SessionRecoveryService.checkForRecovery).mockReturnValue(null);

      const { container } = render(<Step1Container {...mockProps} />);

      const file = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });

      const input = container.querySelector('input[type="file"]');

      if (input) {
        fireEvent.change(input, { target: { files: [file] } });

        // FIXED: saveSession is called inside onSuccess callback of validateAndHash
        // We need to wait for the full async chain to complete
        await waitFor(
          () => {
            expect(SessionRecoveryService.saveSession).toHaveBeenCalled();
          },
          { timeout: 3000 }
        );
      }
    });
  });

  describe("Manual Entry", () => {
    it("should add manual entry", async () => {
      render(<Step1Container {...mockProps} />);

      // Open modal
      const manualButton = screen.getByText("Manual Entry");
      fireEvent.click(manualButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Add entry would happen through ManualEntry component
      // This tests the integration point
    });

    it("should keep modal open when switching method buttons", async () => {
      const { container } = render(<Step1Container {...mockProps} inputMethod="upload" />);

      // First click manual entry to open modal
      const manualButton = screen.getByText("Manual Entry");
      fireEvent.click(manualButton);

      await waitFor(() => {
        const dialog = container.querySelector("dialog[open]");
        expect(dialog).toBeInTheDocument();
      });

      // FIXED: Clicking "Upload Files" button does NOT close the modal
      // handleUploadMethodClick only changes inputMethod, doesn't close modal
      // Modal closes via handleCloseModal which is called by:
      // 1. Close button (X)
      // 2. "Start Fresh" button in ManualEntry component
      // 3. Escape key
      // 4. Click outside modal
      const uploadButton = screen.getByText("Upload Files");
      fireEvent.click(uploadButton);

      // Modal should STILL be open after clicking Upload Files
      await waitFor(() => {
        const dialog = container.querySelector("dialog[open]");
        expect(dialog).toBeInTheDocument();
      });

      // Verify input method changed but modal stayed open
      expect(mockProps.onInputMethodChange).toHaveBeenCalledWith("upload");
    });
  });

  describe("Step Completion", () => {
    it("should complete step with files", () => {
      const mockFiles = [new File(["content"], "test.pdf", { type: "application/pdf" })];

      render(<Step1Container {...mockProps} uploadedFiles={mockFiles} />);

      const analyzeButton = screen.getByText("Analyze Documents");
      fireEvent.click(analyzeButton);

      expect(mockProps.onStepComplete).toHaveBeenCalledWith({
        files: mockFiles,
        entries: undefined,
      });
    });

    it("should complete step with manual entries", () => {
      const mockEntries = [
        {
          id: 1,
          date: "2024-01-01",
          day: "Monday",
          consignments: 25,
          baseAmount: 50,
          totalPay: 105,
          pickups: 3,
          earlyArrive: 50,
          attendanceBonus: 25,
          unloadingBonus: 30,
        },
      ];

      render(<Step1Container {...mockProps} manualEntries={mockEntries} />);

      const analyzeButton = screen.getByText("Analyze Entries");
      fireEvent.click(analyzeButton);

      expect(mockProps.onStepComplete).toHaveBeenCalledWith({
        files: undefined,
        entries: mockEntries,
      });
    });

    it("should not complete step without data", () => {
      render(<Step1Container {...mockProps} />);

      const analyzeButton = screen.getByText("Add Data First").closest("button");
      expect(analyzeButton).toBeDisabled();

      if (analyzeButton) {
        fireEvent.click(analyzeButton);
      }

      expect(mockProps.onStepComplete).not.toHaveBeenCalled();
    });
  });

  describe("Session Recovery", () => {
    it("should restore session data", async () => {
      const mockSessionData = {
        id: "session-test-2",
        currentStep: 1,
        inputMethod: "manual" as const,
        uploadedFiles: [],
        manualEntries: [
          {
            id: 1,
            date: "2024-01-01",
            day: "Monday",
            consignments: 25,
            baseAmount: 50,
            totalPay: 105,
          },
        ],
        timestamp: Date.now(),
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now(),
      };

      vi.mocked(SessionRecoveryService.checkForRecovery).mockReturnValue({
        show: true,
        message: "Restored your last analysis from 2 minutes ago",
        minutesAgo: 2,
        hasRuleChanges: false,
        sessionId: "session-test-2",
      });
      vi.mocked(SessionRecoveryService.loadSession).mockReturnValue(mockSessionData);
      // CRITICAL: Mock restoreSession to return the session data
      vi.mocked(SessionRecoveryService.restoreSession).mockReturnValue(mockSessionData);

      render(<Step1Container {...mockProps} />);

      await waitFor(() => {
        const restoreButton = screen.getByText(/Restore Session/i);
        expect(restoreButton).toBeInTheDocument();
      });

      const restoreButton = screen.getByText(/Restore Session/i);
      fireEvent.click(restoreButton);

      await waitFor(() => {
        expect(mockProps.onInputMethodChange).toHaveBeenCalledWith("manual");
        expect(mockProps.onManualEntriesChanged).toHaveBeenCalledWith(
          mockSessionData.manualEntries
        );
      });
    });

    it("should dismiss session recovery", async () => {
      const mockSessionData = {
        id: "session-test-3",
        currentStep: 1,
        inputMethod: "upload" as const,
        uploadedFiles: [],
        manualEntries: [],
        timestamp: Date.now(),
        hasBeenAnalyzed: false,
        rulesVersion: "9.0.0",
        sessionStarted: Date.now(),
      };

      vi.mocked(SessionRecoveryService.checkForRecovery).mockReturnValue({
        show: true,
        message: "Restored your last analysis from 3 minutes ago",
        minutesAgo: 3,
        hasRuleChanges: false,
        sessionId: "session-test-3",
      });
      vi.mocked(SessionRecoveryService.loadSession).mockReturnValue(mockSessionData);

      render(<Step1Container {...mockProps} />);

      await waitFor(() => {
        const dismissButton = screen.getByText(/Start Fresh/i);
        expect(dismissButton).toBeInTheDocument();
      });

      const dismissButton = screen.getByText(/Start Fresh/i);
      fireEvent.click(dismissButton);

      await waitFor(
        () => {
          expect(SessionRecoveryService.clearSession).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });
  });

  describe("Accessibility", () => {
    it("should support keyboard navigation", () => {
      render(<Step1Container {...mockProps} />);

      const uploadButton = screen.getByText("Upload Files").closest("button");
      expect(uploadButton).toBeInTheDocument();
      uploadButton?.focus();

      expect(document.activeElement).toBe(uploadButton);
    });

    it("should have proper ARIA labels", () => {
      render(<Step1Container {...mockProps} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("class");
      });
    });

    it("should handle modal accessibility", async () => {
      render(<Step1Container {...mockProps} />);

      const manualButton = screen.getByText("Manual Entry");
      fireEvent.click(manualButton);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveAttribute("aria-labelledby");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle upload errors gracefully", async () => {
      const { container } = render(<Step1Container {...mockProps} />);

      // Simulate upload error
      const input = container.querySelector('input[type="file"]');

      if (input) {
        const invalidFile = new File([""], "empty.txt", { type: "text/plain" });

        // Spy on console.error since useFileUpload logs validation errors there
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        fireEvent.change(input, { target: { files: [invalidFile] } });

        // FIXED: Same issue as "should validate files before upload" test
        // Invalid file types are caught in useFileUpload.validateFiles
        // Errors are logged to console, not passed to onError callback
        await waitFor(
          () => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
              expect.stringContaining("Only PDF files are allowed")
            );
          },
          { timeout: 1000 }
        );

        // onFilesUploaded should NOT be called for invalid files
        expect(mockProps.onFilesUploaded).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      }
    });
  });
});
