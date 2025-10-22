/**
 * Unit Tests for useFileUpload Hook
 *
 * Tests the file upload hook functionality including:
 * - File validation
 * - Drag and drop handling
 * - File type detection
 * - Progress simulation
 * - Error handling
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFileUpload } from "@/hooks/use-file-upload";

describe("useFileUpload", () => {
  // Helper function to create mock files
  const createMockFile = (
    name: string,
    size: number = 1024,
    type: string = "application/pdf"
  ): File => {
    const file = new File(["test content"], name, { type });
    Object.defineProperty(file, "size", { value: size });
    return file;
  };

  describe("File Validation", () => {
    it("should accept valid PDF files", () => {
      const { result } = renderHook(() =>
        useFileUpload({
          maxFiles: 10,
          maxFileSize: 50 * 1024 * 1024,
          acceptedTypes: ["application/pdf", ".pdf"],
        })
      );

      const validFile = createMockFile("document.pdf", 1024 * 1024);
      const { valid, errors } = result.current.validateFiles([validFile]);

      expect(valid).toHaveLength(1);
      expect(errors).toHaveLength(0);
    });

    it("should reject files exceeding max size", () => {
      const { result } = renderHook(() =>
        useFileUpload({
          maxFileSize: 1024 * 1024, // 1MB
        })
      );

      const largeFile = createMockFile("large.pdf", 2 * 1024 * 1024); // 2MB
      const { valid, errors } = result.current.validateFiles([largeFile]);

      expect(valid).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("File size exceeds");
    });

    it("should reject non-PDF files", () => {
      const { result } = renderHook(() =>
        useFileUpload({
          acceptedTypes: [".pdf", "application/pdf"],
        })
      );

      const invalidFile = createMockFile("document.txt", 1024, "text/plain");
      const { valid, errors } = result.current.validateFiles([invalidFile]);

      expect(valid).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("Only PDF files are allowed");
    });

    it("should reject duplicate files", () => {
      const { result } = renderHook(() =>
        useFileUpload({
          maxFiles: 10,
        })
      );

      const file1 = createMockFile("document.pdf", 1024);
      const file2 = createMockFile("document.pdf", 1024);

      // First file should be accepted
      act(() => {
        result.current.handleFileInputChange({
          target: { files: [file1], value: "" },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      });

      // Wait for file processing
      waitFor(() => {
        expect(result.current.uploadedFiles).toHaveLength(1);
      });

      // Second file (duplicate) should be rejected
      const { errors } = result.current.validateFiles([file2]);
      expect(errors).toContain("document.pdf: Duplicate file");
    });

    it("should enforce max file count", () => {
      const { result } = renderHook(() =>
        useFileUpload({
          maxFiles: 2,
        })
      );

      const files = [
        createMockFile("file1.pdf"),
        createMockFile("file2.pdf"),
        createMockFile("file3.pdf"),
      ];

      const { valid, errors } = result.current.validateFiles(files);

      expect(valid).toHaveLength(0);
      expect(errors).toContain("Maximum 2 files allowed");
    });
  });

  describe("File Type Detection", () => {
    it("should detect runsheet files", () => {
      const { result } = renderHook(() => useFileUpload({}));

      expect(result.current.detectFileType("runsheet_2024.pdf")).toBe("runsheet");
      expect(result.current.detectFileType("run_sheet_monday.pdf")).toBe("runsheet");
      expect(result.current.detectFileType("run-sheet-01.pdf")).toBe("runsheet");
    });

    it("should detect invoice files", () => {
      const { result } = renderHook(() => useFileUpload({}));

      expect(result.current.detectFileType("invoice_2024.pdf")).toBe("invoice");
      expect(result.current.detectFileType("bill_123.pdf")).toBe("invoice");
      expect(result.current.detectFileType("dv_payment.pdf")).toBe("invoice");
    });

    it("should return unknown for unrecognized files", () => {
      const { result } = renderHook(() => useFileUpload({}));

      expect(result.current.detectFileType("document.pdf")).toBe("unknown");
      expect(result.current.detectFileType("random_file.pdf")).toBe("unknown");
    });
  });

  describe("File Upload Process", () => {
    it("should add files to upload list", async () => {
      const onFilesSelected = vi.fn();
      const { result } = renderHook(() =>
        useFileUpload({
          onFilesSelected,
          showProgressSimulation: false,
        })
      );

      const file = createMockFile("document.pdf");

      await act(async () => {
        await result.current.handleFileInputChange({
          target: { files: [file], value: "" },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      });

      await waitFor(() => {
        expect(result.current.uploadedFiles).toHaveLength(1);
        expect(result.current.uploadedFiles[0].file).toBe(file);
        expect(result.current.uploadedFiles[0].status).toBe("success");
        expect(onFilesSelected).toHaveBeenCalledWith([file]);
      });
    });

    it("should simulate upload progress when enabled", async () => {
      const { result } = renderHook(() =>
        useFileUpload({
          showProgressSimulation: true,
        })
      );

      const file = createMockFile("document.pdf");

      await act(async () => {
        await result.current.handleFileInputChange({
          target: { files: [file], value: "" },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      });

      // Should go through uploading -> processing -> success stages
      await waitFor(
        () => {
          const uploadedFile = result.current.uploadedFiles[0];
          expect(uploadedFile.status).toBe("success");
          expect(uploadedFile.progress).toBe(100);
        },
        { timeout: 3000 }
      );
    });

    it("should remove files from upload list", () => {
      const onFileRemoved = vi.fn();
      const { result } = renderHook(() =>
        useFileUpload({
          onFileRemoved,
        })
      );

      const file = createMockFile("document.pdf");

      act(() => {
        result.current.handleFileInputChange({
          target: { files: [file], value: "" },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      });

      waitFor(() => {
        expect(result.current.uploadedFiles).toHaveLength(1);
      });

      const fileId = result.current.uploadedFiles[0].id;

      act(() => {
        result.current.removeFile(fileId);
      });

      expect(result.current.uploadedFiles).toHaveLength(0);
      expect(onFileRemoved).toHaveBeenCalledWith(fileId);
    });

    it("should clear all files", () => {
      const onClearAll = vi.fn();
      const { result } = renderHook(() =>
        useFileUpload({
          onClearAll,
        })
      );

      const files = [createMockFile("file1.pdf"), createMockFile("file2.pdf")];

      act(() => {
        result.current.handleFileInputChange({
          target: { files, value: "" },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      });

      waitFor(() => {
        expect(result.current.uploadedFiles).toHaveLength(2);
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.uploadedFiles).toHaveLength(0);
      expect(onClearAll).toHaveBeenCalled();
    });
  });

  describe("Drag and Drop", () => {
    it("should handle drag over event", () => {
      const { result } = renderHook(() => useFileUpload({}));

      const event = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { items: [{}] },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragIn(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(result.current.isDragOver).toBe(true);
    });

    it("should handle drag leave event", () => {
      const { result } = renderHook(() => useFileUpload({}));

      const dragInEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { items: [{}] },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragIn(dragInEvent);
      });

      expect(result.current.isDragOver).toBe(true);

      const dragLeaveEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragLeave(dragLeaveEvent);
      });

      expect(result.current.isDragOver).toBe(false);
    });

    it("should handle file drop", async () => {
      const { result } = renderHook(() =>
        useFileUpload({
          showProgressSimulation: false,
        })
      );

      const file = createMockFile("document.pdf");
      const event = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: [file],
        },
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleDrop(event);
      });

      await waitFor(() => {
        expect(result.current.uploadedFiles).toHaveLength(1);
        expect(result.current.isDragOver).toBe(false);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty file list", () => {
      const { result } = renderHook(() => useFileUpload({}));

      const { valid, errors } = result.current.validateFiles([]);

      expect(valid).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });

    it("should handle files with special characters in name", () => {
      const { result } = renderHook(() => useFileUpload({}));

      const file = createMockFile("file (1) - copy [2024].pdf");
      const { valid, errors } = result.current.validateFiles([file]);

      expect(valid).toHaveLength(1);
      expect(errors).toHaveLength(0);
    });

    it("should generate unique IDs for files", async () => {
      const { result } = renderHook(() =>
        useFileUpload({
          showProgressSimulation: false,
        })
      );

      const file = createMockFile("document.pdf");

      await act(async () => {
        await result.current.handleFileInputChange({
          target: { files: [file], value: "" },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      });

      await waitFor(() => {
        expect(result.current.uploadedFiles).toHaveLength(1);
      });

      const id1 = result.current.uploadedFiles[0].id;

      act(() => {
        result.current.clearAll();
      });

      await act(async () => {
        await result.current.handleFileInputChange({
          target: { files: [file], value: "" },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      });

      await waitFor(() => {
        expect(result.current.uploadedFiles).toHaveLength(1);
      });

      const id2 = result.current.uploadedFiles[0].id;

      expect(id1).not.toBe(id2);
    });
  });
});
