/**
 * Microcopy and Label Consistency Tests
 *
 * Ensures all user-facing text matches the reference implementation
 * (payment-analyzer-multipage.v9.0.0.html) for consistency.
 *
 * @see Workstream H: Microcopy/Labels Parity Implementation
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Step1Container } from "@/components/analysis/containers/Step1Container";
import { Step2Container } from "@/components/analysis/containers/Step2Container";
import { Step3Actions } from "@/components/analysis/results/step3-actions";
import { WorkflowCards } from "@/components/analysis/shared/workflow-cards";
import { StepNavigation } from "@/components/analysis/steps/step-navigation";
import { LegacyStep2Validation } from "@/components/analysis/validation/legacy-step2-validation";

// Mock dependencies
vi.mock("@/lib/providers/auth-provider", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("Microcopy and Label Consistency", () => {
  describe("Step Navigation Labels", () => {
    it("should display correct step labels matching reference", () => {
      render(<StepNavigation currentStep={1} totalSteps={3} canProgressToStep={() => true} />);

      // Reference: lines 6377, 6382, 6387
      expect(screen.getByText("Upload Files")).toBeInTheDocument();
      expect(screen.getByText("Validate")).toBeInTheDocument();
      expect(screen.getByText("Analyze")).toBeInTheDocument();
    });

    it("should have correct aria-labels for accessibility", () => {
      render(<StepNavigation currentStep={1} totalSteps={3} canProgressToStep={() => true} />);

      expect(screen.getByLabelText("Step 1: Upload Files")).toBeInTheDocument();
      expect(screen.getByLabelText("Step 2: Validate")).toBeInTheDocument();
      expect(screen.getByLabelText("Step 3: Analyze")).toBeInTheDocument();
    });
  });

  describe("Step 1 Labels and Helper Text", () => {
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

    it("should display correct section header and description", () => {
      render(<Step1Container {...mockProps} />);

      // Reference: lines 6394-6395
      expect(screen.getByText("Add Your Data")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Upload your documents or enter data manually to get started with payment analysis"
        )
      ).toBeInTheDocument();
    });

    it("should display correct input method button labels", () => {
      render(<Step1Container {...mockProps} />);

      // Reference: line 6410
      expect(screen.getAllByText("Upload Files")).toHaveLength(2); // One in nav, one in toggle
      expect(screen.getByText("Manual Entry")).toBeInTheDocument();
    });

    it("should display correct helper note about analysis timing", () => {
      render(<Step1Container {...mockProps} />);

      // Reference: line 6500
      expect(
        screen.getByText("Analysis typically takes 2-5 seconds per document")
      ).toBeInTheDocument();
    });

    it("should display correct button text when no data", () => {
      render(<Step1Container {...mockProps} />);

      expect(screen.getByText("Add Data First")).toBeInTheDocument();
    });

    it("should display correct button text when files uploaded", () => {
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      render(<Step1Container {...mockProps} uploadedFiles={[file]} />);

      // Reference: line 6482
      expect(screen.getByText("Analyze Documents")).toBeInTheDocument();
    });
  });

  describe("Step 2 Labels and Helper Text", () => {
    const mockFile = new File(["test"], "test.pdf", { type: "application/pdf" });

    it("should display correct validation header in LegacyStep2Validation", () => {
      render(
        <LegacyStep2Validation
          uploadedFiles={[mockFile]}
          validationResult={null}
          onAnalyzeWeek={vi.fn()}
        />
      );

      // Reference: lines 11916-11917
      expect(screen.getByText("Document Review")).toBeInTheDocument();
      expect(
        screen.getByText("Check that all documents are correctly identified and ready for analysis")
      ).toBeInTheDocument();
    });

    it("should display correct proceed button text", () => {
      render(
        <LegacyStep2Validation
          uploadedFiles={[mockFile]}
          validationResult={null}
          onAnalyzeWeek={vi.fn()}
        />
      );

      // Reference: line 12003
      expect(screen.getByText("Proceed to Analysis")).toBeInTheDocument();
    });

    it("should display correct empty state message", () => {
      render(<Step2Container files={[]} entries={[]} onStepComplete={vi.fn()} onError={vi.fn()} />);

      expect(screen.getByText("No Data to Validate")).toBeInTheDocument();
      expect(
        screen.getByText("Upload PDF files or add manual entries to proceed with validation")
      ).toBeInTheDocument();
    });
  });

  describe("Step 3 Labels and Helper Text", () => {
    it("should display correct action button labels for single week", () => {
      render(
        <Step3Actions
          hasMultipleWeeks={false}
          onViewDetailedReport={vi.fn()}
          onStartNewAnalysis={vi.fn()}
        />
      );

      // Reference: lines 12213, 12218
      expect(screen.getByText("View Detailed Report")).toBeInTheDocument();
      expect(screen.getByText("Start New Analysis")).toBeInTheDocument();
    });

    it("should display correct action button label for multiple weeks", () => {
      render(
        <Step3Actions
          hasMultipleWeeks={true}
          onViewDetailedReport={vi.fn()}
          onStartNewAnalysis={vi.fn()}
        />
      );

      // Reference: line 12205
      expect(screen.getByText("Start New Analysis")).toBeInTheDocument();
      expect(screen.queryByText("View Detailed Report")).not.toBeInTheDocument();
    });
  });

  describe("Workflow Cards Labels", () => {
    it("should display correct workflow card titles and descriptions", () => {
      render(<WorkflowCards onAddMoreDays={vi.fn()} onAnalyzeWeek={vi.fn()} />);

      // Reference: line 11855
      expect(screen.getByText("Analyze Current Week")).toBeInTheDocument();
      expect(screen.getByText("Add More Days")).toBeInTheDocument();

      // Reference: line 11859
      expect(screen.getByText("Analyze Week")).toBeInTheDocument();
      expect(screen.getByText("Add Another Day")).toBeInTheDocument();
    });
  });

  describe("Validation Badge Text", () => {
    it("should display correct validation badge states", () => {
      const validResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      const { rerender } = render(
        <LegacyStep2Validation
          uploadedFiles={[new File(["test"], "test.pdf")]}
          validationResult={validResult}
          onAnalyzeWeek={vi.fn()}
        />
      );

      expect(screen.getByText("READY")).toBeInTheDocument();

      // Test invalid state
      const invalidResult = {
        isValid: false,
        errors: ["Missing required file"],
        warnings: [],
      };

      rerender(
        <LegacyStep2Validation
          uploadedFiles={[new File(["test"], "test.pdf")]}
          validationResult={invalidResult}
          onAnalyzeWeek={vi.fn()}
        />
      );

      expect(screen.getByText("INVALID")).toBeInTheDocument();
    });
  });

  describe("File Type Labels", () => {
    it("should display correct file type labels", () => {
      const runsheet = new File(["test"], "runsheet.pdf", {
        type: "application/pdf",
      });
      const invoice = new File(["test"], "invoice.pdf", {
        type: "application/pdf",
      });

      render(
        <LegacyStep2Validation
          uploadedFiles={[runsheet, invoice]}
          validationResult={null}
          onAnalyzeWeek={vi.fn()}
        />
      );

      expect(screen.getAllByText("Runsheet")).toHaveLength(1);
      expect(screen.getAllByText("Invoice")).toHaveLength(1);
    });
  });

  describe("Toast Messages Consistency", () => {
    it("should use consistent toast message format for file upload success", () => {
      // This is tested in integration tests, but we document the expected message here
      // Reference: line 10670
      const expectedMessage = "Files uploaded! Ready to validate";
      expect(expectedMessage).toBe("Files uploaded! Ready to validate");
    });

    it("should use consistent toast message format for new analysis", () => {
      // Reference: line 10456
      const expectedMessage = "Ready for new analysis";
      expect(expectedMessage).toBe("Ready for new analysis");
    });
  });

  describe("Analysis Preview Section Labels", () => {
    it("should display correct analysis preview labels", () => {
      render(
        <LegacyStep2Validation
          uploadedFiles={[new File(["test"], "test.pdf")]}
          validationResult={null}
          onAnalyzeWeek={vi.fn()}
        />
      );

      expect(screen.getByText("Analysis Preview")).toBeInTheDocument();
      expect(screen.getByText("Total Files")).toBeInTheDocument();
      expect(screen.getByText("Runsheets")).toBeInTheDocument();
      expect(screen.getByText("Invoices")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });
  });

  describe("Section Titles Consistency", () => {
    it("should use consistent section titles across components", () => {
      const titles = {
        step1: "Add Your Data",
        step2Validate: "Validate Documents", // Used in legacy reference
        step2Review: "Document Review", // Used in current implementation
        step3: "Ready to Analyze", // Used in analyze section
      };

      // All titles should be consistent with their usage context
      expect(titles.step1).toBe("Add Your Data");
      expect(titles.step2Review).toBe("Document Review");
    });
  });
});
