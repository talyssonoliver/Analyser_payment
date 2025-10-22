/**
 * Integration Tests for Step2Container
 *
 * Tests the full integration of Step2Container with:
 * - File validation display
 * - Entry cards rendering
 * - Workflow actions
 * - File management
 * - Error handling
 * - State management
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Step2Container } from "@/components/analysis/containers/Step2Container";

// Mock child components
vi.mock("@/components/analysis", () => ({
  EntryCards: vi.fn(({ entries, onEditEntry }) => (
    <div data-testid="entry-cards">
      <div>Entry Cards Component</div>
      {entries.map((entry: { id: number; date: string }) => (
        <button
          key={entry.id}
          data-testid={`edit-entry-${entry.id}`}
          onClick={() => onEditEntry(entry.id)}
        >
          Edit Entry {entry.id}
        </button>
      ))}
    </div>
  )),
  WorkflowCards: vi.fn(({ onAddMoreDays, onAnalyzeWeek }) => (
    <div data-testid="workflow-cards">
      <button data-testid="add-more-days" onClick={onAddMoreDays}>
        Add More Days
      </button>
      <button data-testid="analyze-week" onClick={onAnalyzeWeek}>
        Analyze Week
      </button>
    </div>
  )),
}));

vi.mock("@/components/analysis/validation/legacy-step2-validation", () => ({
  LegacyStep2Validation: vi.fn(
    ({ uploadedFiles, validationResult, onAnalyzeWeek, onFileRemove }) => (
      <div data-testid="legacy-validation">
        <div>Legacy Step2 Validation</div>
        <div data-testid="file-count">{uploadedFiles.length} files</div>
        <div data-testid="validation-status">{validationResult?.isValid ? "Valid" : "Invalid"}</div>
        {uploadedFiles.map((file: File) => (
          <button
            key={file.name}
            data-testid={`remove-file-${file.name}`}
            onClick={() => onFileRemove?.(file.name, file.size)}
          >
            Remove {file.name}
          </button>
        ))}
        <button data-testid="legacy-analyze-week" onClick={onAnalyzeWeek}>
          Proceed to Analysis
        </button>
      </div>
    )
  ),
}));

describe("Step2Container Integration Tests", () => {
  const mockFiles = [
    new File(["content1"], "runsheet1.pdf", { type: "application/pdf" }),
    new File(["content2"], "invoice1.pdf", { type: "application/pdf" }),
  ];

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
    {
      id: 2,
      date: "2024-01-02",
      day: "Tuesday",
      consignments: 30,
      baseAmount: 60,
      totalPay: 115,
      pickups: 2,
      earlyArrive: 50,
      attendanceBonus: 25,
      unloadingBonus: 30,
    },
  ];

  const mockValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const mockProps = {
    files: [],
    entries: [],
    validationResult: null,
    onStepComplete: vi.fn(),
    onEditEntry: vi.fn(),
    onAddMoreDays: vi.fn(),
    onError: vi.fn(),
    onFileRemove: vi.fn(),
    onGoToStep1: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render with default props", () => {
      render(<Step2Container {...mockProps} />);
      expect(screen.getByText("No Data to Validate")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(<Step2Container {...mockProps} className="custom-class" />);
      const containerElement = container.querySelector(".step2-container");
      expect(containerElement).toHaveClass("custom-class");
    });

    it("should render with max-width constraint", () => {
      const { container } = render(<Step2Container {...mockProps} />);
      const containerElement = container.querySelector(".step2-container");
      expect(containerElement).toHaveClass("max-w-4xl");
    });

    it("should be centered with mx-auto", () => {
      const { container } = render(<Step2Container {...mockProps} />);
      const containerElement = container.querySelector(".step2-container");
      expect(containerElement).toHaveClass("mx-auto");
    });
  });

  describe("Empty State Display", () => {
    it("should show empty state when no files or entries", () => {
      render(<Step2Container {...mockProps} />);

      expect(screen.getByText("No Data to Validate")).toBeInTheDocument();
      expect(screen.getByText(/Upload PDF files or add manual entries/)).toBeInTheDocument();
    });

    it("should display empty state icon", () => {
      const { container } = render(<Step2Container {...mockProps} />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it('should show "Go Back to Upload" button in empty state', () => {
      render(<Step2Container {...mockProps} />);

      const backButton = screen.getByText("Go Back to Upload");
      expect(backButton).toBeInTheDocument();
    });

    it("should call onGoToStep1 when back button clicked", () => {
      render(<Step2Container {...mockProps} />);

      const backButton = screen.getByText("Go Back to Upload");
      fireEvent.click(backButton);

      expect(mockProps.onGoToStep1).toHaveBeenCalledTimes(1);
    });

    it("should handle missing onGoToStep1 gracefully", () => {
      const propsWithoutGoBack = { ...mockProps, onGoToStep1: undefined };
      render(<Step2Container {...propsWithoutGoBack} />);

      const backButton = screen.getByText("Go Back to Upload");
      fireEvent.click(backButton);

      // Should not throw error
      expect(backButton).toBeInTheDocument();
    });

    it("should style back button with primary colors", () => {
      render(<Step2Container {...mockProps} />);

      const backButton = screen.getByText("Go Back to Upload");
      expect(backButton).toHaveClass("bg-blue-600");
      expect(backButton).toHaveClass("hover:bg-blue-700");
    });
  });

  describe("Manual Entry Display", () => {
    it("should render EntryCards when entries exist", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} />);

      expect(screen.getByTestId("entry-cards")).toBeInTheDocument();
    });

    it("should not render file validation when entries exist", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} files={mockFiles} />);

      expect(screen.queryByTestId("legacy-validation")).not.toBeInTheDocument();
    });

    it("should render WorkflowCards with entries", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} />);

      expect(screen.getByTestId("workflow-cards")).toBeInTheDocument();
    });

    it("should pass entries to EntryCards component", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} />);

      expect(screen.getByText("Edit Entry 1")).toBeInTheDocument();
      expect(screen.getByText("Edit Entry 2")).toBeInTheDocument();
    });

    it("should have validate-content class wrapper for entries", () => {
      const { container } = render(<Step2Container {...mockProps} entries={mockEntries} />);

      const wrapper = container.querySelector(".validate-content");
      expect(wrapper).toBeInTheDocument();
    });

    it("should space WorkflowCards with mt-8", () => {
      const { container } = render(<Step2Container {...mockProps} entries={mockEntries} />);

      const workflowWrapper = container.querySelector(".mt-8");
      expect(workflowWrapper).toBeInTheDocument();
    });
  });

  describe("File Upload Display", () => {
    it("should render LegacyStep2Validation when files exist", () => {
      render(<Step2Container {...mockProps} files={mockFiles} />);

      expect(screen.getByTestId("legacy-validation")).toBeInTheDocument();
    });

    it("should not render EntryCards when only files exist", () => {
      render(<Step2Container {...mockProps} files={mockFiles} />);

      expect(screen.queryByTestId("entry-cards")).not.toBeInTheDocument();
    });

    it("should pass files to validation component", () => {
      render(<Step2Container {...mockProps} files={mockFiles} />);

      expect(screen.getByTestId("file-count")).toHaveTextContent("2 files");
    });

    it("should pass validation result to validation component", () => {
      render(
        <Step2Container {...mockProps} files={mockFiles} validationResult={mockValidationResult} />
      );

      expect(screen.getByTestId("validation-status")).toHaveTextContent("Valid");
    });

    it("should handle null validation result", () => {
      render(<Step2Container {...mockProps} files={mockFiles} validationResult={null} />);

      expect(screen.getByTestId("legacy-validation")).toBeInTheDocument();
    });

    it("should handle undefined validation result", () => {
      render(<Step2Container {...mockProps} files={mockFiles} validationResult={undefined} />);

      expect(screen.getByTestId("legacy-validation")).toBeInTheDocument();
    });
  });

  describe("Entry Editing", () => {
    it("should call onEditEntry when entry edit button clicked", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} />);

      const editButton = screen.getByTestId("edit-entry-1");
      fireEvent.click(editButton);

      expect(mockProps.onEditEntry).toHaveBeenCalledWith(1);
    });

    it("should handle editing multiple entries", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} />);

      fireEvent.click(screen.getByTestId("edit-entry-1"));
      fireEvent.click(screen.getByTestId("edit-entry-2"));

      expect(mockProps.onEditEntry).toHaveBeenCalledTimes(2);
      expect(mockProps.onEditEntry).toHaveBeenNthCalledWith(1, 1);
      expect(mockProps.onEditEntry).toHaveBeenNthCalledWith(2, 2);
    });

    it("should handle missing onEditEntry gracefully", () => {
      const propsWithoutEdit = { ...mockProps, entries: mockEntries, onEditEntry: undefined };

      render(<Step2Container {...propsWithoutEdit} />);

      const editButton = screen.getByTestId("edit-entry-1");
      fireEvent.click(editButton);

      // Should not throw error
      expect(editButton).toBeInTheDocument();
    });

    it("should call onError when edit entry fails", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const errorOnEdit = vi.fn(() => {
        throw new Error("Edit failed");
      });

      render(<Step2Container {...mockProps} entries={mockEntries} onEditEntry={errorOnEdit} />);

      const editButton = screen.getByTestId("edit-entry-1");
      fireEvent.click(editButton);

      expect(mockProps.onError).toHaveBeenCalledWith("Failed to edit entry");
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should log error details when edit fails", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const testError = new Error("Test edit error");
      const errorOnEdit = vi.fn(() => {
        throw testError;
      });

      render(<Step2Container {...mockProps} entries={mockEntries} onEditEntry={errorOnEdit} />);

      fireEvent.click(screen.getByTestId("edit-entry-1"));

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error editing entry:", testError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Workflow Actions", () => {
    it("should call onAddMoreDays when add button clicked", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} />);

      const addButton = screen.getByTestId("add-more-days");
      fireEvent.click(addButton);

      expect(mockProps.onAddMoreDays).toHaveBeenCalledTimes(1);
    });

    it("should handle missing onAddMoreDays gracefully", () => {
      const propsWithoutAdd = { ...mockProps, entries: mockEntries, onAddMoreDays: undefined };

      render(<Step2Container {...propsWithoutAdd} />);

      const addButton = screen.getByTestId("add-more-days");
      fireEvent.click(addButton);

      // Should not throw error
      expect(addButton).toBeInTheDocument();
    });

    it("should call onError when add more days fails", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const errorOnAdd = vi.fn(() => {
        throw new Error("Add failed");
      });

      render(<Step2Container {...mockProps} entries={mockEntries} onAddMoreDays={errorOnAdd} />);

      fireEvent.click(screen.getByTestId("add-more-days"));

      expect(mockProps.onError).toHaveBeenCalledWith("Failed to open add more days dialog");

      consoleErrorSpy.mockRestore();
    });

    it("should log error details when add more days fails", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const testError = new Error("Test add error");
      const errorOnAdd = vi.fn(() => {
        throw testError;
      });

      render(<Step2Container {...mockProps} entries={mockEntries} onAddMoreDays={errorOnAdd} />);

      fireEvent.click(screen.getByTestId("add-more-days"));

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error adding more days:", testError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Analysis Actions", () => {
    it("should call onStepComplete when analyze button clicked (entries)", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} />);

      const analyzeButton = screen.getByTestId("analyze-week");
      fireEvent.click(analyzeButton);

      expect(mockProps.onStepComplete).toHaveBeenCalledTimes(1);
    });

    it("should call onStepComplete when analyze button clicked (files)", () => {
      render(<Step2Container {...mockProps} files={mockFiles} />);

      const analyzeButton = screen.getByTestId("legacy-analyze-week");
      fireEvent.click(analyzeButton);

      expect(mockProps.onStepComplete).toHaveBeenCalledTimes(1);
    });

    it("should call onError when analysis fails (entries)", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const errorOnComplete = vi.fn(() => {
        throw new Error("Analysis failed");
      });

      render(
        <Step2Container {...mockProps} entries={mockEntries} onStepComplete={errorOnComplete} />
      );

      fireEvent.click(screen.getByTestId("analyze-week"));

      expect(mockProps.onError).toHaveBeenCalledWith("Failed to start analysis");

      consoleErrorSpy.mockRestore();
    });

    it("should log error details when analysis fails", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const testError = new Error("Test analysis error");
      const errorOnComplete = vi.fn(() => {
        throw testError;
      });

      render(
        <Step2Container {...mockProps} entries={mockEntries} onStepComplete={errorOnComplete} />
      );

      fireEvent.click(screen.getByTestId("analyze-week"));

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error starting analysis:", testError);

      consoleErrorSpy.mockRestore();
    });

    it("should handle analyze click from legacy validation", () => {
      render(<Step2Container {...mockProps} files={mockFiles} />);

      fireEvent.click(screen.getByTestId("legacy-analyze-week"));

      expect(mockProps.onStepComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("File Management", () => {
    it("should call onFileRemove when remove button clicked", () => {
      render(<Step2Container {...mockProps} files={mockFiles} />);

      const removeButton = screen.getByTestId("remove-file-runsheet1.pdf");
      fireEvent.click(removeButton);

      expect(mockProps.onFileRemove).toHaveBeenCalledWith("runsheet1.pdf", expect.any(Number));
    });

    it("should pass correct file size to onFileRemove", () => {
      const fileWithSize = new File(["test content"], "test.pdf", { type: "application/pdf" });
      Object.defineProperty(fileWithSize, "size", {
        get: () => 12345,
        configurable: true,
      });

      render(<Step2Container {...mockProps} files={[fileWithSize]} />);

      const removeButton = screen.getByTestId("remove-file-test.pdf");
      fireEvent.click(removeButton);

      expect(mockProps.onFileRemove).toHaveBeenCalledWith("test.pdf", 12345);
    });

    it("should handle missing onFileRemove gracefully", () => {
      const propsWithoutRemove = { ...mockProps, files: mockFiles, onFileRemove: undefined };

      render(<Step2Container {...propsWithoutRemove} />);

      const removeButton = screen.getByTestId("remove-file-runsheet1.pdf");
      fireEvent.click(removeButton);

      // Should not throw error
      expect(removeButton).toBeInTheDocument();
    });

    it("should remove multiple files independently", () => {
      render(<Step2Container {...mockProps} files={mockFiles} />);

      fireEvent.click(screen.getByTestId("remove-file-runsheet1.pdf"));
      fireEvent.click(screen.getByTestId("remove-file-invoice1.pdf"));

      expect(mockProps.onFileRemove).toHaveBeenCalledTimes(2);
    });
  });

  describe("Priority Rendering Logic", () => {
    it("should prioritize entries over files when both exist", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} files={mockFiles} />);

      expect(screen.getByTestId("entry-cards")).toBeInTheDocument();
      expect(screen.queryByTestId("legacy-validation")).not.toBeInTheDocument();
    });

    it("should show files when no entries", () => {
      render(<Step2Container {...mockProps} entries={[]} files={mockFiles} />);

      expect(screen.queryByTestId("entry-cards")).not.toBeInTheDocument();
      expect(screen.getByTestId("legacy-validation")).toBeInTheDocument();
    });

    it("should show empty state when both are empty", () => {
      render(<Step2Container {...mockProps} entries={[]} files={[]} />);

      expect(screen.getByText("No Data to Validate")).toBeInTheDocument();
    });

    it("should update display when entries added to files", () => {
      const { rerender } = render(<Step2Container {...mockProps} files={mockFiles} />);

      expect(screen.getByTestId("legacy-validation")).toBeInTheDocument();

      rerender(<Step2Container {...mockProps} files={mockFiles} entries={mockEntries} />);

      expect(screen.getByTestId("entry-cards")).toBeInTheDocument();
      expect(screen.queryByTestId("legacy-validation")).not.toBeInTheDocument();
    });

    it("should update display when entries removed", () => {
      const { rerender } = render(
        <Step2Container {...mockProps} entries={mockEntries} files={mockFiles} />
      );

      expect(screen.getByTestId("entry-cards")).toBeInTheDocument();

      rerender(<Step2Container {...mockProps} entries={[]} files={mockFiles} />);

      expect(screen.queryByTestId("entry-cards")).not.toBeInTheDocument();
      expect(screen.getByTestId("legacy-validation")).toBeInTheDocument();
    });
  });

  describe("Validation Result Handling", () => {
    it("should handle valid validation result", () => {
      render(
        <Step2Container
          {...mockProps}
          files={mockFiles}
          validationResult={{
            isValid: true,
            errors: [],
            warnings: [],
          }}
        />
      );

      expect(screen.getByTestId("validation-status")).toHaveTextContent("Valid");
    });

    it("should handle invalid validation result", () => {
      render(
        <Step2Container
          {...mockProps}
          files={mockFiles}
          validationResult={{
            isValid: false,
            errors: ["Error 1"],
            warnings: [],
          }}
        />
      );

      expect(screen.getByTestId("validation-status")).toHaveTextContent("Invalid");
    });

    it("should handle validation with warnings", () => {
      render(
        <Step2Container
          {...mockProps}
          files={mockFiles}
          validationResult={{
            isValid: true,
            errors: [],
            warnings: ["Warning 1"],
          }}
        />
      );

      expect(screen.getByTestId("validation-status")).toHaveTextContent("Valid");
    });

    it("should update when validation result changes", () => {
      const { rerender } = render(
        <Step2Container
          {...mockProps}
          files={mockFiles}
          validationResult={{
            isValid: false,
            errors: ["Error"],
            warnings: [],
          }}
        />
      );

      expect(screen.getByTestId("validation-status")).toHaveTextContent("Invalid");

      rerender(
        <Step2Container
          {...mockProps}
          files={mockFiles}
          validationResult={{
            isValid: true,
            errors: [],
            warnings: [],
          }}
        />
      );

      expect(screen.getByTestId("validation-status")).toHaveTextContent("Valid");
    });
  });

  describe("Edge Cases", () => {
    it("should handle single entry", () => {
      render(<Step2Container {...mockProps} entries={[mockEntries[0]]} />);

      expect(screen.getByTestId("entry-cards")).toBeInTheDocument();
      expect(screen.getByText("Edit Entry 1")).toBeInTheDocument();
    });

    it("should handle single file", () => {
      render(<Step2Container {...mockProps} files={[mockFiles[0]]} />);

      expect(screen.getByTestId("file-count")).toHaveTextContent("1 files");
    });

    it("should handle large number of entries", () => {
      const manyEntries = Array.from({ length: 50 }, (_, i) => ({
        ...mockEntries[0],
        id: i + 1,
        date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      }));

      render(<Step2Container {...mockProps} entries={manyEntries} />);

      expect(screen.getByTestId("entry-cards")).toBeInTheDocument();
    });

    it("should handle large number of files", () => {
      const manyFiles = Array.from(
        { length: 20 },
        (_, i) => new File([`content${i}`], `file${i}.pdf`, { type: "application/pdf" })
      );

      render(<Step2Container {...mockProps} files={manyFiles} />);

      expect(screen.getByTestId("file-count")).toHaveTextContent("20 files");
    });

    it("should handle entry with missing optional fields", () => {
      const minimalEntry = [
        {
          id: 1,
          date: "2024-01-01",
          day: "Monday",
          consignments: 25,
          baseAmount: 50,
          totalPay: 50,
        },
      ];

      render(<Step2Container {...mockProps} entries={minimalEntry} />);

      expect(screen.getByTestId("entry-cards")).toBeInTheDocument();
    });

    it("should handle very long file names", () => {
      const longNameFile = new File(
        ["content"],
        "this-is-a-very-long-file-name-that-might-cause-layout-issues-in-the-ui-component.pdf",
        { type: "application/pdf" }
      );

      render(<Step2Container {...mockProps} files={[longNameFile]} />);

      expect(screen.getByTestId("legacy-validation")).toBeInTheDocument();
    });

    it("should handle special characters in file names", () => {
      const specialCharFile = new File(
        ["content"],
        "file (with) [special] {chars} & symbols!.pdf",
        { type: "application/pdf" }
      );

      render(<Step2Container {...mockProps} files={[specialCharFile]} />);

      expect(screen.getByTestId("legacy-validation")).toBeInTheDocument();
    });
  });

  describe("Error Handling Robustness", () => {
    it("should continue functioning after edit error", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      let shouldError = true;
      const conditionalError = vi.fn(() => {
        if (shouldError) {
          shouldError = false;
          throw new Error("First call fails");
        }
      });

      render(
        <Step2Container {...mockProps} entries={mockEntries} onEditEntry={conditionalError} />
      );

      // First click should error
      fireEvent.click(screen.getByTestId("edit-entry-1"));
      expect(mockProps.onError).toHaveBeenCalledWith("Failed to edit entry");

      // Second click should work
      fireEvent.click(screen.getByTestId("edit-entry-1"));
      expect(conditionalError).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });

    it("should continue functioning after add more days error", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      let shouldError = true;
      const conditionalError = vi.fn(() => {
        if (shouldError) {
          shouldError = false;
          throw new Error("First call fails");
        }
      });

      render(
        <Step2Container {...mockProps} entries={mockEntries} onAddMoreDays={conditionalError} />
      );

      // First click should error
      fireEvent.click(screen.getByTestId("add-more-days"));
      expect(mockProps.onError).toHaveBeenCalledWith("Failed to open add more days dialog");

      // Second click should work
      fireEvent.click(screen.getByTestId("add-more-days"));
      expect(conditionalError).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });

    it("should continue functioning after analysis error", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      let shouldError = true;
      const conditionalError = vi.fn(() => {
        if (shouldError) {
          shouldError = false;
          throw new Error("First call fails");
        }
      });

      render(
        <Step2Container {...mockProps} entries={mockEntries} onStepComplete={conditionalError} />
      );

      // First click should error
      fireEvent.click(screen.getByTestId("analyze-week"));
      expect(mockProps.onError).toHaveBeenCalledWith("Failed to start analysis");

      // Second click should work
      fireEvent.click(screen.getByTestId("analyze-week"));
      expect(conditionalError).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button in empty state", () => {
      render(<Step2Container {...mockProps} />);

      const backButton = screen.getByText("Go Back to Upload");
      expect(backButton.tagName).toBe("BUTTON");
    });

    it("should maintain focus management", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} />);

      const addButton = screen.getByTestId("add-more-days");
      addButton.focus();

      expect(document.activeElement).toBe(addButton);
    });

    it("should support keyboard navigation for entry editing", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} />);

      const editButton = screen.getByTestId("edit-entry-1");
      editButton.focus();

      expect(document.activeElement).toBe(editButton);
    });

    it("should support keyboard navigation for workflow actions", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} />);

      const analyzeButton = screen.getByTestId("analyze-week");
      analyzeButton.focus();

      expect(document.activeElement).toBe(analyzeButton);
    });
  });

  describe("Component Integration", () => {
    it("should properly integrate EntryCards and WorkflowCards", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} />);

      expect(screen.getByTestId("entry-cards")).toBeInTheDocument();
      expect(screen.getByTestId("workflow-cards")).toBeInTheDocument();
    });

    it("should properly integrate LegacyStep2Validation", () => {
      render(
        <Step2Container {...mockProps} files={mockFiles} validationResult={mockValidationResult} />
      );

      expect(screen.getByTestId("legacy-validation")).toBeInTheDocument();
    });

    it("should pass all required props to child components", () => {
      render(<Step2Container {...mockProps} entries={mockEntries} />);

      // Verify EntryCards was called with the correct entries
      expect(screen.getByTestId("entry-cards")).toBeInTheDocument();

      // Verify edit buttons are rendered for all entries
      mockEntries.forEach((entry) => {
        expect(screen.getByTestId(`edit-entry-${entry.id}`)).toBeInTheDocument();
      });

      // Verify WorkflowCards buttons are present
      expect(screen.getByTestId("add-more-days")).toBeInTheDocument();
      expect(screen.getByTestId("analyze-week")).toBeInTheDocument();
    });
  });
});
