/**
 * Unit Tests for useFileUpdateDetection Hook
 *
 * Tests file update detection logic using FileFingerprintService.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getNewFilesCount,
  getUpdatedFilesCount,
  hasAnyUpdates,
  useFileUpdateDetection,
} from "@/hooks/use-file-update-detection";
import { FileFingerprintService } from "@/lib/services/file-fingerprint-service";

// Mock FileFingerprintService
vi.mock("@/lib/services/file-fingerprint-service");

describe("useFileUpdateDetection", () => {
  // Create mock files
  const createMockFile = (name: string, size: number, lastModified: number): File => {
    const blob = new Blob(["test content"], { type: "application/pdf" });
    const file = new File([blob], name, {
      type: "application/pdf",
      lastModified,
    });

    // Override size property
    Object.defineProperty(file, "size", {
      value: size,
      writable: false,
    });

    return file;
  };

  const mockFile1 = createMockFile("runsheet.pdf", 1024, Date.now());
  const mockFile2 = createMockFile("invoice.pdf", 2048, Date.now());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Hook Behavior", () => {
    it("should return empty flags for no files", async () => {
      const { result } = renderHook(() => useFileUpdateDetection([]));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.fileUpdateFlags).toEqual({});
      expect(result.current.error).toBeNull();
    });

    it("should detect new files (no previous fingerprint)", async () => {
      // Mock FileFingerprintService to return no existing fingerprint
      vi.mocked(FileFingerprintService.compareWithExisting).mockResolvedValue({
        isIdentical: false,
        isDuplicate: false,
        hasChanged: false,
      });

      vi.mocked(FileFingerprintService.generateHash).mockResolvedValue("abc123");

      const { result } = renderHook(() => useFileUpdateDetection([mockFile1]));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fileKey = `${mockFile1.name}-${mockFile1.size}`;
      expect(result.current.fileUpdateFlags[fileKey]).toEqual({
        isUpdated: false,
        isNew: true,
        currentHash: "abc123",
      });
    });

    it("should detect updated files", async () => {
      const previousProcessedAt = Date.now() - 86400000; // 1 day ago

      // Mock FileFingerprintService to return changed file
      vi.mocked(FileFingerprintService.compareWithExisting).mockResolvedValue({
        isIdentical: false,
        isDuplicate: false,
        hasChanged: true,
        previousFingerprint: {
          hash: "old_hash",
          processedAt: previousProcessedAt,
          name: mockFile1.name,
          size: mockFile1.size,
          lastModified: mockFile1.lastModified,
          type: "runsheet",
        },
        changeType: "content",
      });

      vi.mocked(FileFingerprintService.generateHash).mockResolvedValue("new_hash");

      const { result } = renderHook(() => useFileUpdateDetection([mockFile1]));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fileKey = `${mockFile1.name}-${mockFile1.size}`;
      expect(result.current.fileUpdateFlags[fileKey]).toEqual({
        isUpdated: true,
        changeType: "content",
        lastProcessed: previousProcessedAt,
        previousHash: "old_hash",
        currentHash: "new_hash",
        isNew: false,
      });
    });

    it("should detect identical duplicate files", async () => {
      const previousProcessedAt = Date.now() - 3600000; // 1 hour ago

      // Mock FileFingerprintService to return identical duplicate
      vi.mocked(FileFingerprintService.compareWithExisting).mockResolvedValue({
        isIdentical: true,
        isDuplicate: true,
        hasChanged: false,
        previousFingerprint: {
          hash: "same_hash",
          processedAt: previousProcessedAt,
          name: mockFile1.name,
          size: mockFile1.size,
          lastModified: mockFile1.lastModified,
          type: "runsheet",
        },
      });

      vi.mocked(FileFingerprintService.generateHash).mockResolvedValue("same_hash");

      const { result } = renderHook(() => useFileUpdateDetection([mockFile1]));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fileKey = `${mockFile1.name}-${mockFile1.size}`;
      expect(result.current.fileUpdateFlags[fileKey]).toEqual({
        isUpdated: false, // Not marked as updated because it's a duplicate
        lastProcessed: previousProcessedAt,
        previousHash: "same_hash",
        currentHash: "same_hash",
        isNew: false,
      });
    });

    it("should handle multiple files", async () => {
      const previousProcessedAt = Date.now() - 86400000;

      vi.mocked(FileFingerprintService.compareWithExisting)
        .mockResolvedValueOnce({
          isIdentical: false,
          isDuplicate: false,
          hasChanged: true,
          previousFingerprint: {
            hash: "old_hash_1",
            processedAt: previousProcessedAt,
            name: mockFile1.name,
            size: mockFile1.size,
            lastModified: mockFile1.lastModified,
            type: "runsheet",
          },
          changeType: "size",
        })
        .mockResolvedValueOnce({
          isIdentical: false,
          isDuplicate: false,
          hasChanged: false,
        });

      vi.mocked(FileFingerprintService.generateHash)
        .mockResolvedValueOnce("new_hash_1")
        .mockResolvedValueOnce("new_hash_2");

      const { result } = renderHook(() => useFileUpdateDetection([mockFile1, mockFile2]));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fileKey1 = `${mockFile1.name}-${mockFile1.size}`;
      const fileKey2 = `${mockFile2.name}-${mockFile2.size}`;

      expect(result.current.fileUpdateFlags[fileKey1].isUpdated).toBe(true);
      expect(result.current.fileUpdateFlags[fileKey2].isNew).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(FileFingerprintService.compareWithExisting).mockRejectedValue(
        new Error("Hash generation failed")
      );

      const { result } = renderHook(() => useFileUpdateDetection([mockFile1]));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Failed to detect file updates");
    });

    it("should handle per-file errors gracefully", async () => {
      vi.mocked(FileFingerprintService.compareWithExisting)
        .mockRejectedValueOnce(new Error("Failed for file 1"))
        .mockResolvedValueOnce({
          isIdentical: false,
          isDuplicate: false,
          hasChanged: false,
        });

      vi.mocked(FileFingerprintService.generateHash).mockResolvedValue("hash");

      const { result } = renderHook(() => useFileUpdateDetection([mockFile1, mockFile2]));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fileKey1 = `${mockFile1.name}-${mockFile1.size}`;
      const fileKey2 = `${mockFile2.name}-${mockFile2.size}`;

      // File 1 should be marked as new (error fallback)
      expect(result.current.fileUpdateFlags[fileKey1].isNew).toBe(true);
      expect(result.current.fileUpdateFlags[fileKey1].isUpdated).toBe(false);

      // File 2 should be processed normally
      expect(result.current.fileUpdateFlags[fileKey2]).toBeDefined();
    });
  });

  describe("Change Type Detection", () => {
    it("should detect size changes", async () => {
      vi.mocked(FileFingerprintService.compareWithExisting).mockResolvedValue({
        isIdentical: false,
        isDuplicate: false,
        hasChanged: true,
        previousFingerprint: {
          hash: "old_hash",
          processedAt: Date.now() - 1000,
          name: mockFile1.name,
          size: 512, // Different size
          lastModified: mockFile1.lastModified,
          type: "runsheet",
        },
        changeType: "size",
      });

      vi.mocked(FileFingerprintService.generateHash).mockResolvedValue("new_hash");

      const { result } = renderHook(() => useFileUpdateDetection([mockFile1]));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fileKey = `${mockFile1.name}-${mockFile1.size}`;
      expect(result.current.fileUpdateFlags[fileKey].changeType).toBe("size");
    });

    it("should detect timestamp changes", async () => {
      vi.mocked(FileFingerprintService.compareWithExisting).mockResolvedValue({
        isIdentical: false,
        isDuplicate: false,
        hasChanged: true,
        previousFingerprint: {
          hash: "old_hash",
          processedAt: Date.now() - 1000,
          name: mockFile1.name,
          size: mockFile1.size,
          lastModified: mockFile1.lastModified - 1000,
          type: "runsheet",
        },
        changeType: "timestamp",
      });

      vi.mocked(FileFingerprintService.generateHash).mockResolvedValue("new_hash");

      const { result } = renderHook(() => useFileUpdateDetection([mockFile1]));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fileKey = `${mockFile1.name}-${mockFile1.size}`;
      expect(result.current.fileUpdateFlags[fileKey].changeType).toBe("timestamp");
    });
  });

  describe("Helper Functions", () => {
    it("hasAnyUpdates should return true when files are updated", () => {
      const flags = {
        "file1.pdf-1024": { isUpdated: true, isNew: false },
        "file2.pdf-2048": { isUpdated: false, isNew: true },
      };

      expect(hasAnyUpdates(flags)).toBe(true);
    });

    it("hasAnyUpdates should return false when no files are updated", () => {
      const flags = {
        "file1.pdf-1024": { isUpdated: false, isNew: true },
        "file2.pdf-2048": { isUpdated: false, isNew: true },
      };

      expect(hasAnyUpdates(flags)).toBe(false);
    });

    it("getUpdatedFilesCount should count updated files", () => {
      const flags = {
        "file1.pdf-1024": { isUpdated: true, isNew: false },
        "file2.pdf-2048": { isUpdated: true, isNew: false },
        "file3.pdf-4096": { isUpdated: false, isNew: true },
      };

      expect(getUpdatedFilesCount(flags)).toBe(2);
    });

    it("getNewFilesCount should count new files", () => {
      const flags = {
        "file1.pdf-1024": { isUpdated: true, isNew: false },
        "file2.pdf-2048": { isUpdated: false, isNew: true },
        "file3.pdf-4096": { isUpdated: false, isNew: true },
      };

      expect(getNewFilesCount(flags)).toBe(2);
    });
  });
});
