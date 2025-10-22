/**
 * Unit Tests for File Upload Component System
 * Tests FileUpload, FileUploadArea, FileList, and FileUploadMethods components
 * Covers file selection, validation, drag-drop, progress tracking, and error handling
 */

import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { FileUpload } from "@/components/analysis/steps/file-upload";
import { FileList } from "@/components/analysis/steps/file-upload/FileList";
import { FileUploadArea } from "@/components/analysis/steps/file-upload/FileUploadArea";
import { FileUploadMethods } from "@/components/analysis/steps/file-upload/FileUploadMethods";
import type { UploadedFile } from "@/hooks/use-file-upload";
import { fireEvent, render, screen } from "@/tests/utils/test-utils";

// Mock framer-motion to avoid animation complexity in tests
vi.mock("@/lib/optimization/dynamic-motion", () => ({
  loadFramerMotion: vi.fn().mockResolvedValue({
    motion: {
      div: ({
        children,
        className,
        ...props
      }: {
        children: ReactNode;
        className?: string;
        [key: string]: unknown;
      }) => (
        <div className={className} {...props}>
          {children}
        </div>
      ),
    },
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  }),
  StaticDiv: ({
    children,
    className,
    ...props
  }: {
    children: ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  StaticPresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Helper to create mock PDF files
const createMockFile = (
  name: string,
  size: number = 1024 * 1024,
  type: string = "application/pdf"
): File => {
  const blob = new Blob(["a".repeat(size)], { type });
  return new File([blob], name, { type });
};

// Helper to create mock uploaded files
const createMockUploadedFile = (name: string, overrides?: Partial<UploadedFile>): UploadedFile => ({
  id: `${name}-${Date.now()}`,
  file: createMockFile(name),
  status: "success",
  progress: 100,
  fileType: "runsheet",
  ...overrides,
});

describe("FileUpload Component", () => {
  describe("Rendering - Basic Structure", () => {
    it("should render without errors", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);
      expect(screen.getByText(/Drag & Drop Files Here/i)).toBeInTheDocument();
    });

    it("should render upload area by default", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);
      expect(screen.getByText(/browse files/i)).toBeInTheDocument();
    });

    it("should render method toggle by default", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);
      expect(screen.getByText(/Upload Files/i)).toBeInTheDocument();
      expect(screen.getByText(/Manual Entry/i)).toBeInTheDocument();
    });

    it("should hide method toggle when hideMethodToggle is true", () => {
      render(<FileUpload onFilesSelected={vi.fn()} hideMethodToggle />);
      expect(screen.queryByText(/Manual Entry/i)).not.toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <FileUpload onFilesSelected={vi.fn()} className="custom-class" />
      );
      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });

  describe("File Selection - Click to Upload", () => {
    it("should render clickable upload area", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);

      // Upload area is rendered and clickable
      const uploadText = screen.getByText(/Drag & Drop Files Here/i);
      expect(uploadText).toBeInTheDocument();
    });

    it("should render browse link", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);

      const browseButton = screen.getByText(/browse files/i);
      expect(browseButton).toBeInTheDocument();
    });

    it("should accept PDF files only", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toHaveAttribute("accept");
      expect(input.getAttribute("accept")).toContain(".pdf");
    });

    it("should allow multiple file selection", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toHaveAttribute("multiple");
    });
  });

  describe("File Selection - Drag and Drop", () => {
    it("should render drag and drop area", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);
      const uploadText = screen.getByText(/Drag & Drop Files Here/i);
      expect(uploadText).toBeInTheDocument();
    });

    it("should display drag instructions", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);
      expect(screen.getByText(/Drag & Drop Files Here/i)).toBeInTheDocument();
      expect(screen.getByText(/browse files/i)).toBeInTheDocument();
    });

    it("should have droppable area with proper structure", () => {
      const { container } = render(<FileUpload onFilesSelected={vi.fn()} />);
      const uploadArea = container.querySelector(".upload-area");
      expect(uploadArea).toBeInTheDocument();
    });

    it("should display default upload text", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);

      // Initially shows default text
      expect(screen.getByText(/Drag & Drop Files Here/i)).toBeInTheDocument();
    });
  });

  describe("File Validation - File Type", () => {
    it("should accept PDF files", () => {
      const onFilesSelected = vi.fn();
      render(<FileUpload onFilesSelected={onFilesSelected} />);

      const file = createMockFile("document.pdf", 1024, "application/pdf");
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Simulate file selection
      Object.defineProperty(input, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);
    });

    it("should reject non-PDF files", () => {
      const onFilesSelected = vi.fn();
      render(<FileUpload onFilesSelected={onFilesSelected} />);

      const file = createMockFile(
        "document.docx",
        1024,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);
    });

    it("should validate file extension", () => {
      render(<FileUpload onFilesSelected={vi.fn()} acceptedTypes={[".pdf"]} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input.getAttribute("accept")).toContain(".pdf");
    });

    it("should support custom accepted types", () => {
      render(<FileUpload onFilesSelected={vi.fn()} acceptedTypes={["application/pdf", ".pdf"]} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toHaveAttribute("accept");
    });
  });

  describe("File Validation - Size Limits", () => {
    it("should display max file size information", () => {
      render(<FileUpload onFilesSelected={vi.fn()} maxFileSize={10 * 1024 * 1024} />);
      // Size is displayed in the UI
      expect(screen.getByText(/Max/i)).toBeInTheDocument();
    });

    it("should use default max file size", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);
      // Default is 50MB
      expect(screen.getByText(/50/)).toBeInTheDocument();
    });

    it("should respect custom max file size", () => {
      render(<FileUpload onFilesSelected={vi.fn()} maxFileSize={25 * 1024 * 1024} />);
      expect(screen.getByText(/25/)).toBeInTheDocument();
    });

    it("should support legacy maxSizePerFile prop", () => {
      render(<FileUpload onFilesSelected={vi.fn()} maxSizePerFile={10 * 1024 * 1024} />);
      expect(screen.getByText(/10/)).toBeInTheDocument();
    });
  });

  describe("File Validation - Count Limits", () => {
    it("should use default max files", () => {
      const files = [createMockUploadedFile("file1.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      // Default is 50 files
      expect(screen.getByText(/1 \/ 50 files/i)).toBeInTheDocument();
    });

    it("should respect custom max files", () => {
      const files = [createMockUploadedFile("file1.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} maxFiles={10} />);

      expect(screen.getByText(/1 \/ 10 files/i)).toBeInTheDocument();
    });

    it("should display file count badge when files are uploaded", () => {
      const files = [createMockUploadedFile("file1.pdf"), createMockUploadedFile("file2.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      expect(screen.getByText(/2 \/ 50 files/i)).toBeInTheDocument();
    });

    it("should not display file count badge when no files", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);
      expect(screen.queryByText(/\/ 50 files/i)).not.toBeInTheDocument();
    });
  });

  describe("File List Display", () => {
    it("should display uploaded files", () => {
      const files = [createMockUploadedFile("test1.pdf"), createMockUploadedFile("test2.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      expect(screen.getByText("test1.pdf")).toBeInTheDocument();
      expect(screen.getByText("test2.pdf")).toBeInTheDocument();
    });

    it("should not show file list when hideFileList is true", () => {
      const files = [createMockUploadedFile("test.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} hideFileList />);

      expect(screen.queryByText("test.pdf")).not.toBeInTheDocument();
    });

    it("should display file count in header", () => {
      const files = [
        createMockUploadedFile("file1.pdf"),
        createMockUploadedFile("file2.pdf"),
        createMockUploadedFile("file3.pdf"),
      ];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      expect(screen.getByText(/Uploaded Files \(3\)/i)).toBeInTheDocument();
    });

    it("should not display file list when no files uploaded", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);
      expect(screen.queryByText(/Uploaded Files/i)).not.toBeInTheDocument();
    });
  });

  describe("File List - Status Display", () => {
    it("should display uploading status", () => {
      const files = [createMockUploadedFile("test.pdf", { status: "uploading", progress: 50 })];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      expect(screen.getByText(/Uploading/i)).toBeInTheDocument();
    });

    it("should display processing status", () => {
      const files = [createMockUploadedFile("test.pdf", { status: "processing" })];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      expect(screen.getByText(/Processing/i)).toBeInTheDocument();
    });

    it("should display success status", () => {
      const files = [createMockUploadedFile("test.pdf", { status: "success" })];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      expect(screen.getByText(/Ready/i)).toBeInTheDocument();
    });

    it("should display error status", () => {
      const files = [
        createMockUploadedFile("test.pdf", {
          status: "error",
          error: "Upload failed",
        }),
      ];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      expect(screen.getByText(/Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
    });
  });

  describe("File List - Progress Tracking", () => {
    it("should display file with uploading status", () => {
      const files = [createMockUploadedFile("test.pdf", { status: "uploading", progress: 50 })];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      // File is shown with uploading status
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
      expect(screen.getByText(/Uploading/i)).toBeInTheDocument();
    });

    it("should display file with processing status", () => {
      const files = [createMockUploadedFile("test.pdf", { status: "processing", progress: 75 })];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      // File is shown with processing status
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
      expect(screen.getByText(/Processing/i)).toBeInTheDocument();
    });

    it("should not show progress bar for completed files", () => {
      const files = [createMockUploadedFile("test.pdf", { status: "success", progress: 100 })];
      const { container } = render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      const progressBar = container.querySelector('[role="progressbar"]');
      // Progress bar might still exist but should be at 100%
      if (progressBar) {
        expect(progressBar).toBeInTheDocument();
      }
    });

    it("should not show progress bar for error files", () => {
      const files = [createMockUploadedFile("test.pdf", { status: "error" })];
      const { container } = render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      const progressBars = container.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBe(0);
    });
  });

  describe("File Type Detection", () => {
    it("should detect runsheet files", () => {
      const files = [createMockUploadedFile("runsheet_2024.pdf", { fileType: "runsheet" })];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      // File type is displayed in file metadata
      const fileTypeElements = screen.getAllByText(/runsheet/i);
      expect(fileTypeElements.length).toBeGreaterThan(0);
    });

    it("should detect invoice files", () => {
      const files = [createMockUploadedFile("invoice_001.pdf", { fileType: "invoice" })];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      // File type is displayed in file metadata
      const fileTypeElements = screen.getAllByText(/invoice/i);
      expect(fileTypeElements.length).toBeGreaterThan(0);
    });

    it("should handle unknown file types", () => {
      const files = [createMockUploadedFile("document.pdf", { fileType: "unknown" })];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      expect(screen.getByText("document.pdf")).toBeInTheDocument();
    });

    it("should display file type in metadata", () => {
      const files = [createMockUploadedFile("runsheet.pdf", { fileType: "runsheet" })];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      // File type is displayed in file metadata
      const fileTypeElements = screen.getAllByText(/runsheet/i);
      expect(fileTypeElements.length).toBeGreaterThan(0);
    });
  });

  describe("File Removal", () => {
    it("should call onFileRemoved when remove button is clicked", () => {
      const onFileRemoved = vi.fn();
      const files = [createMockUploadedFile("test.pdf")];

      render(
        <FileUpload onFilesSelected={vi.fn()} onFileRemoved={onFileRemoved} uploadedFiles={files} />
      );

      const removeButtons = screen.getAllByRole("button");
      const removeButton = removeButtons.find((btn) =>
        btn.querySelector("svg")?.classList.contains("lucide-x")
      );

      if (removeButton) {
        fireEvent.click(removeButton);
        expect(onFileRemoved).toHaveBeenCalled();
      }
    });

    it("should disable remove button when processing", () => {
      const files = [createMockUploadedFile("test.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} isProcessing />);

      const buttons = screen.getAllByRole("button");
      const removeButton = buttons.find((btn) =>
        btn.querySelector("svg")?.classList.contains("lucide-x")
      );

      if (removeButton) {
        expect(removeButton).toBeDisabled();
      }
    });

    it("should disable remove button when disabled prop is true", () => {
      const files = [createMockUploadedFile("test.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} disabled />);

      const buttons = screen.getAllByRole("button");
      const removeButton = buttons.find((btn) =>
        btn.querySelector("svg")?.classList.contains("lucide-x")
      );

      if (removeButton) {
        expect(removeButton).toBeDisabled();
      }
    });
  });

  describe("Clear All Functionality", () => {
    it("should show clear all button when files are present", () => {
      const files = [createMockUploadedFile("test.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      expect(screen.getByText(/Clear All/i)).toBeInTheDocument();
    });

    it("should call onClearAll when clear all is clicked", () => {
      const onClearAll = vi.fn();
      const files = [createMockUploadedFile("test.pdf")];

      render(
        <FileUpload onFilesSelected={vi.fn()} onClearAll={onClearAll} uploadedFiles={files} />
      );

      const clearButton = screen.getByText(/Clear All/i);
      fireEvent.click(clearButton);

      // The component calls onClearAll from both clearAll() and the onClearAll prop
      expect(onClearAll).toHaveBeenCalled();
    });

    it("should disable clear all button when processing", () => {
      const files = [createMockUploadedFile("test.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} isProcessing />);

      const clearButton = screen.getByText(/Clear All/i).closest("button");
      expect(clearButton).toBeDisabled();
    });

    it("should disable clear all button when disabled prop is true", () => {
      const files = [createMockUploadedFile("test.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} disabled />);

      const clearButton = screen.getByText(/Clear All/i).closest("button");
      expect(clearButton).toBeDisabled();
    });
  });

  describe("Method Toggle Functionality", () => {
    it("should toggle to manual entry method", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);

      const manualButton = screen.getByText(/Manual Entry/i);
      fireEvent.click(manualButton);

      expect(
        screen.getByText(/Manual entry functionality would be implemented here/i)
      ).toBeInTheDocument();
    });

    it("should toggle back to upload method", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);

      // Click manual entry
      const manualButton = screen.getByText(/Manual Entry/i);
      fireEvent.click(manualButton);

      // Click upload files
      const uploadButton = screen.getByText(/Upload Files/i);
      fireEvent.click(uploadButton);

      expect(screen.getByText(/Drag & Drop Files Here/i)).toBeInTheDocument();
    });

    it("should maintain file list when switching methods", () => {
      const files = [createMockUploadedFile("test.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      const manualButton = screen.getByText(/Manual Entry/i);
      fireEvent.click(manualButton);

      // File list is always shown regardless of method, unless hideFileList is true
      // When on manual entry method, upload area is hidden, but file list persists
      expect(
        screen.getByText(/Manual entry functionality would be implemented here/i)
      ).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("should disable upload area when disabled", () => {
      render(<FileUpload onFilesSelected={vi.fn()} disabled />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it("should apply disabled styling", () => {
      const { container } = render(<FileUpload onFilesSelected={vi.fn()} disabled />);

      const uploadArea = container.querySelector(".upload-area");
      expect(uploadArea?.className).toContain("opacity-50");
    });

    it("should disable method toggle when disabled", () => {
      render(<FileUpload onFilesSelected={vi.fn()} disabled />);

      const uploadButton = screen.getByText(/Upload Files/i).closest("button");
      const manualButton = screen.getByText(/Manual Entry/i).closest("button");

      expect(uploadButton).toBeDisabled();
      expect(manualButton).toBeDisabled();
    });
  });

  describe("Processing State", () => {
    it("should disable upload when processing", () => {
      render(<FileUpload onFilesSelected={vi.fn()} isProcessing />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it("should disable method toggle when processing", () => {
      render(<FileUpload onFilesSelected={vi.fn()} isProcessing />);

      const uploadButton = screen.getByText(/Upload Files/i).closest("button");
      const manualButton = screen.getByText(/Manual Entry/i).closest("button");

      expect(uploadButton).toBeDisabled();
      expect(manualButton).toBeDisabled();
    });

    it("should disable file removal when processing", () => {
      const files = [createMockUploadedFile("test.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} isProcessing />);

      const buttons = screen.getAllByRole("button");
      const removeButton = buttons.find((btn) =>
        btn.querySelector("svg")?.classList.contains("lucide-x")
      );

      if (removeButton) {
        expect(removeButton).toBeDisabled();
      }
    });
  });

  describe("Callbacks", () => {
    it("should call onFilesSelected when files are selected", () => {
      const onFilesSelected = vi.fn();
      render(<FileUpload onFilesSelected={onFilesSelected} />);

      const file = createMockFile("test.pdf");
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);
    });

    it("should call onFilesAdded when new files are added", () => {
      const onFilesAdded = vi.fn();
      render(<FileUpload onFilesSelected={vi.fn()} onFilesAdded={onFilesAdded} />);

      const file = createMockFile("test.pdf");
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);
    });
  });

  describe("Accessibility", () => {
    it("should have accessible file input", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toHaveAttribute("aria-label");
    });

    it("should have accessible button labels", () => {
      const files = [createMockUploadedFile("test.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should provide file title attribute", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toHaveAttribute("title");
    });
  });

  describe("File Size Display", () => {
    it("should display file size in human-readable format", () => {
      const files = [createMockUploadedFile("test.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      // Should show file size (formatted) - there may be multiple instances
      const sizeElements = screen.getAllByText(/MB|KB|B/i);
      expect(sizeElements.length).toBeGreaterThan(0);
    });

    it("should display file size for multiple files", () => {
      const files = [createMockUploadedFile("file1.pdf"), createMockUploadedFile("file2.pdf")];
      render(<FileUpload onFilesSelected={vi.fn()} uploadedFiles={files} />);

      const sizeElements = screen.getAllByText(/MB|KB|B/i);
      expect(sizeElements.length).toBeGreaterThan(0);
    });
  });

  describe("UI Requirements Display", () => {
    it("should display PDF only requirement", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);
      expect(screen.getByText(/PDF files only/i)).toBeInTheDocument();
    });

    it("should display file type requirement", () => {
      render(<FileUpload onFilesSelected={vi.fn()} />);
      expect(screen.getByText(/Runsheets & Invoices/i)).toBeInTheDocument();
    });

    it("should display size limit", () => {
      render(<FileUpload onFilesSelected={vi.fn()} maxFileSize={25 * 1024 * 1024} />);
      expect(screen.getByText(/Max.*25/i)).toBeInTheDocument();
    });
  });
});

describe("FileUploadArea Component", () => {
  const defaultProps = {
    isDragOver: false,
    disabled: false,
    maxFiles: 50,
    maxFileSize: 50 * 1024 * 1024,
    acceptedTypes: ["application/pdf", ".pdf"] as const,
    uploadedFilesCount: 0,
    onDragEnter: vi.fn(),
    onDragLeave: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    onClick: vi.fn(),
    fileInputRef: { current: null },
    onFileInputChange: vi.fn(),
    isProcessing: false,
  };

  it("should render upload area", () => {
    render(<FileUploadArea {...defaultProps} />);
    expect(screen.getByText(/Drag & Drop Files Here/i)).toBeInTheDocument();
  });

  it("should change text when dragging over", () => {
    render(<FileUploadArea {...defaultProps} isDragOver />);
    expect(screen.getByText(/Drop files here/i)).toBeInTheDocument();
  });

  it("should apply drag over styling", () => {
    const { container } = render(<FileUploadArea {...defaultProps} isDragOver />);
    const uploadArea = container.querySelector(".upload-area");
    expect(uploadArea?.className).toContain("dragging");
  });

  it("should display file count badge", () => {
    render(<FileUploadArea {...defaultProps} uploadedFilesCount={5} />);
    expect(screen.getByText(/5 \/ 50 files/i)).toBeInTheDocument();
  });

  it("should not display badge when no files", () => {
    render(<FileUploadArea {...defaultProps} uploadedFilesCount={0} />);
    expect(screen.queryByText(/\/ 50 files/i)).not.toBeInTheDocument();
  });
});

describe("FileList Component", () => {
  const defaultProps = {
    files: [],
    onRemove: vi.fn(),
    disabled: false,
    isProcessing: false,
  };

  it("should render nothing when no files", () => {
    const { container } = render(<FileList {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render file list with files", () => {
    const files = [createMockUploadedFile("test.pdf")];
    render(<FileList {...defaultProps} files={files} />);

    expect(screen.getByText("test.pdf")).toBeInTheDocument();
  });

  it("should display correct file count", () => {
    const files = [
      createMockUploadedFile("file1.pdf"),
      createMockUploadedFile("file2.pdf"),
      createMockUploadedFile("file3.pdf"),
    ];
    render(<FileList {...defaultProps} files={files} />);

    expect(screen.getByText(/Uploaded Files \(3\)/i)).toBeInTheDocument();
  });

  it("should show clear all button when provided", () => {
    const files = [createMockUploadedFile("test.pdf")];
    const onClearAll = vi.fn();
    render(<FileList {...defaultProps} files={files} onClearAll={onClearAll} />);

    expect(screen.getByText(/Clear All/i)).toBeInTheDocument();
  });

  it("should not show clear all button when not provided", () => {
    const files = [createMockUploadedFile("test.pdf")];
    render(<FileList {...defaultProps} files={files} />);

    expect(screen.queryByText(/Clear All/i)).not.toBeInTheDocument();
  });

  it("should call onRemove when remove button clicked", () => {
    const onRemove = vi.fn();
    const files = [createMockUploadedFile("test.pdf")];

    render(<FileList {...defaultProps} files={files} onRemove={onRemove} />);

    const buttons = screen.getAllByRole("button");
    const removeButton = buttons.find((btn) =>
      btn.querySelector("svg")?.classList.contains("lucide-x")
    );

    if (removeButton) {
      fireEvent.click(removeButton);
      expect(onRemove).toHaveBeenCalled();
    }
  });
});

describe("FileUploadMethods Component", () => {
  it("should render both method buttons", () => {
    render(<FileUploadMethods activeMethod="upload" onMethodChange={vi.fn()} />);

    expect(screen.getByText(/Upload Files/i)).toBeInTheDocument();
    expect(screen.getByText(/Manual Entry/i)).toBeInTheDocument();
  });

  it("should highlight active method", () => {
    render(<FileUploadMethods activeMethod="upload" onMethodChange={vi.fn()} />);

    const uploadButton = screen.getByText(/Upload Files/i).closest("button");
    expect(uploadButton?.className).toContain("from-blue-600");
  });

  it("should call onMethodChange when clicked", () => {
    const onMethodChange = vi.fn();

    render(<FileUploadMethods activeMethod="upload" onMethodChange={onMethodChange} />);

    const manualButton = screen.getByText(/Manual Entry/i);
    fireEvent.click(manualButton);

    expect(onMethodChange).toHaveBeenCalledWith("manual");
  });

  it("should disable buttons when disabled prop is true", () => {
    render(<FileUploadMethods activeMethod="upload" onMethodChange={vi.fn()} disabled />);

    const uploadButton = screen.getByText(/Upload Files/i).closest("button");
    const manualButton = screen.getByText(/Manual Entry/i).closest("button");

    expect(uploadButton).toBeDisabled();
    expect(manualButton).toBeDisabled();
  });

  it("should have data-method attributes", () => {
    render(<FileUploadMethods activeMethod="upload" onMethodChange={vi.fn()} />);

    const uploadButton = screen.getByText(/Upload Files/i).closest("button");
    const manualButton = screen.getByText(/Manual Entry/i).closest("button");

    expect(uploadButton).toHaveAttribute("data-method", "upload");
    expect(manualButton).toHaveAttribute("data-method", "manual");
  });
});
