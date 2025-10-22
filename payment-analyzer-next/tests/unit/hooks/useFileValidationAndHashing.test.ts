/**
 * Tests for useFileValidationAndHashing Hook
 *
 * Covers:
 * - Hook initialization and configuration
 * - generateFileHash function
 * - validateFiles function
 * - validateAndHash main workflow
 * - Error handling and edge cases
 * - Callback invocations
 * - Helper functions
 * - Integration scenarios
 */

import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import {
  generateFileKey,
  getValidationSummary,
  hasValidationErrors,
  hasValidationWarnings,
  useFileValidationAndHashing,
} from "@/hooks/useFileValidationAndHashing";
import {
  FileFingerprintService,
  type FingerprintValidation,
} from "@/lib/services/file-fingerprint-service";
import { toast } from "@/lib/utils/toast";

// Mock dependencies
vi.mock("@/lib/services/file-fingerprint-service");
vi.mock("@/lib/utils/toast");

// Mock console methods
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
const consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

describe("useFileValidationAndHashing", () => {
  // Mock data
  const mockFile1 = new File(["content1"], "test1.pdf", {
    type: "application/pdf",
    lastModified: 1000000,
  });
  const mockFile2 = new File(["content2"], "test2.pdf", {
    type: "application/pdf",
    lastModified: 2000000,
  });

  const mockHash1 = "abc123def456789";
  const mockHash2 = "xyz987uvw654321";

  const mockValidationSuccess: FingerprintValidation = {
    isValid: true,
    errors: [],
    warnings: [],
    duplicates: [],
  };

  const mockValidationWithWarnings: FingerprintValidation = {
    isValid: true,
    errors: [],
    warnings: ["Warning: Similar file found"],
    duplicates: [],
  };

  const mockValidationFailure: FingerprintValidation = {
    isValid: false,
    errors: ["Duplicate file detected", "Invalid file format"],
    warnings: [],
    duplicates: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleDebugSpy.mockClear();

    // Default mock implementations
    (FileFingerprintService.generateHash as Mock).mockResolvedValue(mockHash1);
    (FileFingerprintService.validateFileSet as Mock).mockResolvedValue(mockValidationSuccess);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // 1. INITIALIZATION & CONFIGURATION
  // ========================================

  describe("Initialization & Configuration", () => {
    it("should return all three functions", () => {
      const { result } = renderHook(() => useFileValidationAndHashing());

      expect(result.current).toHaveProperty("validateAndHash");
      expect(result.current).toHaveProperty("generateFileHash");
      expect(result.current).toHaveProperty("validateFiles");
      expect(typeof result.current.validateAndHash).toBe("function");
      expect(typeof result.current.generateFileHash).toBe("function");
      expect(typeof result.current.validateFiles).toBe("function");
    });

    it("should apply default config values", () => {
      const { result } = renderHook(() => useFileValidationAndHashing());

      // Default showToasts=true, debug=false - verify by checking behavior
      expect(result.current.validateAndHash).toBeDefined();
    });

    it("should accept custom config values", () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useFileValidationAndHashing({
          onSuccess,
          onError,
          showToasts: false,
          debug: true,
        })
      );

      expect(result.current.validateAndHash).toBeDefined();
    });

    it("should initialize callbacks correctly", () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() => useFileValidationAndHashing({ onSuccess, onError }));

      expect(result.current).toBeDefined();
    });

    it("should work without callbacks", () => {
      const { result } = renderHook(() => useFileValidationAndHashing({}));

      expect(result.current.validateAndHash).toBeDefined();
      expect(result.current.generateFileHash).toBeDefined();
      expect(result.current.validateFiles).toBeDefined();
    });
  });

  // ========================================
  // 2. GENERATE FILE HASH
  // ========================================

  describe("generateFileHash", () => {
    it("should generate hash for file successfully", async () => {
      const { result } = renderHook(() => useFileValidationAndHashing());

      const hash = await result.current.generateFileHash(mockFile1);

      expect(hash).toBe(mockHash1);
      expect(FileFingerprintService.generateHash).toHaveBeenCalledWith(mockFile1);
      expect(FileFingerprintService.generateHash).toHaveBeenCalledTimes(1);
    });

    it("should call FileFingerprintService.generateHash with correct file", async () => {
      const { result } = renderHook(() => useFileValidationAndHashing());

      await result.current.generateFileHash(mockFile2);

      expect(FileFingerprintService.generateHash).toHaveBeenCalledWith(mockFile2);
    });

    it("should return hash string", async () => {
      const { result } = renderHook(() => useFileValidationAndHashing());

      const hash = await result.current.generateFileHash(mockFile1);

      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should log debug info when debug=true", async () => {
      const { result } = renderHook(() => useFileValidationAndHashing({ debug: true }));

      await result.current.generateFileHash(mockFile1);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Generating hash for file:"),
        mockFile1.name
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Hash generated:"),
        expect.any(String)
      );
    });

    it("should not log when debug=false", async () => {
      consoleLogSpy.mockClear();
      const { result } = renderHook(() => useFileValidationAndHashing({ debug: false }));

      await result.current.generateFileHash(mockFile1);

      // Should not have debug logs
      const debugLogs = consoleLogSpy.mock.calls.filter(
        (call) => call[0]?.includes("🔐") || call[0]?.includes("✅")
      );
      expect(debugLogs.length).toBe(0);
    });

    it("should handle hash generation error", async () => {
      const error = new Error("Hash generation failed");
      (FileFingerprintService.generateHash as Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useFileValidationAndHashing());

      await expect(result.current.generateFileHash(mockFile1)).rejects.toThrow(
        "Hash generation failed"
      );
    });

    it("should throw error on failure", async () => {
      const error = new Error("Service unavailable");
      (FileFingerprintService.generateHash as Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useFileValidationAndHashing());

      await expect(result.current.generateFileHash(mockFile1)).rejects.toThrow();
    });
  });

  // ========================================
  // 3. VALIDATE FILES
  // ========================================

  describe("validateFiles", () => {
    it("should validate files successfully", async () => {
      const { result } = renderHook(() => useFileValidationAndHashing());

      const validation = await result.current.validateFiles([mockFile1, mockFile2]);

      expect(validation).toEqual(mockValidationSuccess);
      expect(FileFingerprintService.validateFileSet).toHaveBeenCalledWith([mockFile1, mockFile2]);
    });

    it("should call FileFingerprintService.validateFileSet", async () => {
      const { result } = renderHook(() => useFileValidationAndHashing());

      await result.current.validateFiles([mockFile1]);

      expect(FileFingerprintService.validateFileSet).toHaveBeenCalledWith([mockFile1]);
      expect(FileFingerprintService.validateFileSet).toHaveBeenCalledTimes(1);
    });

    it("should return FingerprintValidation object", async () => {
      const { result } = renderHook(() => useFileValidationAndHashing());

      const validation = await result.current.validateFiles([mockFile1]);

      expect(validation).toHaveProperty("isValid");
      expect(validation).toHaveProperty("errors");
      expect(validation).toHaveProperty("warnings");
      expect(validation).toHaveProperty("duplicates");
    });

    it("should log debug info when debug=true", async () => {
      const { result } = renderHook(() => useFileValidationAndHashing({ debug: true }));

      await result.current.validateFiles([mockFile1, mockFile2]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Validating file set:"),
        2,
        "files"
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Validation result:"),
        expect.any(Object)
      );
    });

    it("should not log when debug=false", async () => {
      consoleLogSpy.mockClear();
      const { result } = renderHook(() => useFileValidationAndHashing({ debug: false }));

      await result.current.validateFiles([mockFile1]);

      const debugLogs = consoleLogSpy.mock.calls.filter(
        (call) => call[0]?.includes("🔍") || call[0]?.includes("📊")
      );
      expect(debugLogs.length).toBe(0);
    });

    it("should handle validation service error", async () => {
      const error = new Error("Validation service failed");
      (FileFingerprintService.validateFileSet as Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useFileValidationAndHashing());

      await expect(result.current.validateFiles([mockFile1])).rejects.toThrow(
        "Validation service failed"
      );
    });

    it("should throw error on failure", async () => {
      const error = new Error("Network error");
      (FileFingerprintService.validateFileSet as Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useFileValidationAndHashing());

      await expect(result.current.validateFiles([mockFile1])).rejects.toThrow();
    });
  });

  // ========================================
  // 4. VALIDATE AND HASH - SUCCESS PATH
  // ========================================

  describe("validateAndHash - Success Path", () => {
    beforeEach(() => {
      // Reset mocks before each test in this suite
      vi.clearAllMocks();
      (FileFingerprintService.validateFileSet as Mock).mockResolvedValue(mockValidationSuccess);
    });

    it("should validate and hash files successfully", async () => {
      (FileFingerprintService.generateHash as Mock).mockResolvedValueOnce(mockHash1);

      const { result } = renderHook(() => useFileValidationAndHashing());

      const validationResult = await result.current.validateAndHash([mockFile1]);

      expect(validationResult).not.toBeNull();
      expect(validationResult?.isValid).toBe(true);
      expect(validationResult?.hashes).toBeDefined();
      expect(validationResult?.validation).toEqual(mockValidationSuccess);
    });

    it("should generate hashes for all files", async () => {
      (FileFingerprintService.generateHash as Mock)
        .mockResolvedValueOnce(mockHash1)
        .mockResolvedValueOnce(mockHash2);

      const { result } = renderHook(() => useFileValidationAndHashing());

      const validationResult = await result.current.validateAndHash([mockFile1, mockFile2]);

      expect(FileFingerprintService.generateHash).toHaveBeenCalledTimes(2);
      expect(FileFingerprintService.generateHash).toHaveBeenCalledWith(mockFile1);
      expect(FileFingerprintService.generateHash).toHaveBeenCalledWith(mockFile2);
      expect(Object.keys(validationResult?.hashes || {})).toHaveLength(2);
    });

    it("should create correct file keys", async () => {
      (FileFingerprintService.generateHash as Mock).mockResolvedValueOnce(mockHash1);

      const { result } = renderHook(() => useFileValidationAndHashing());

      const validationResult = await result.current.validateAndHash([mockFile1]);

      const expectedKey = `${mockFile1.name}-${mockFile1.size}-${mockFile1.lastModified}`;
      expect(validationResult?.hashes[expectedKey]).toBe(mockHash1);
    });

    it("should call validation service after hashing", async () => {
      const { result } = renderHook(() => useFileValidationAndHashing());

      await result.current.validateAndHash([mockFile1, mockFile2]);

      expect(FileFingerprintService.validateFileSet).toHaveBeenCalledWith([mockFile1, mockFile2]);
      expect(FileFingerprintService.validateFileSet).toHaveBeenCalledTimes(1);
    });

    it("should return FileValidationResult with all fields", async () => {
      const { result } = renderHook(() => useFileValidationAndHashing());

      const validationResult = await result.current.validateAndHash([mockFile1]);

      expect(validationResult).toHaveProperty("hashes");
      expect(validationResult).toHaveProperty("validation");
      expect(validationResult).toHaveProperty("isValid");
      expect(validationResult).toHaveProperty("errors");
      expect(validationResult).toHaveProperty("warnings");
      expect(validationResult?.errors).toEqual([]);
      expect(validationResult?.warnings).toEqual([]);
    });

    it("should call onSuccess callback with files and result", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useFileValidationAndHashing({ onSuccess }));

      const validationResult = await result.current.validateAndHash([mockFile1]);

      expect(onSuccess).toHaveBeenCalledWith([mockFile1], validationResult);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("should handle warnings with toasts", async () => {
      (FileFingerprintService.validateFileSet as Mock).mockResolvedValue(
        mockValidationWithWarnings
      );

      const { result } = renderHook(() => useFileValidationAndHashing({ showToasts: true }));

      const validationResult = await result.current.validateAndHash([mockFile1]);

      expect(validationResult).not.toBeNull();
      expect(validationResult?.warnings).toEqual(["Warning: Similar file found"]);
      expect(toast.warning).toHaveBeenCalledWith("Warning: Similar file found");
    });

    it("should handle warnings without toasts when showToasts=false", async () => {
      (FileFingerprintService.validateFileSet as Mock).mockResolvedValue(
        mockValidationWithWarnings
      );

      const { result } = renderHook(() => useFileValidationAndHashing({ showToasts: false }));

      const validationResult = await result.current.validateAndHash([mockFile1]);

      expect(validationResult).not.toBeNull();
      expect(toast.warning).not.toHaveBeenCalled();
    });

    it("should log debug info when debug=true", async () => {
      const { result } = renderHook(() => useFileValidationAndHashing({ debug: true }));

      await result.current.validateAndHash([mockFile1]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Starting file validation and hashing"),
        1,
        "files"
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("File validation and hashing completed successfully")
      );
    });

    it("should not log debug info when debug=false", async () => {
      consoleLogSpy.mockClear();
      const { result } = renderHook(() => useFileValidationAndHashing({ debug: false }));

      await result.current.validateAndHash([mockFile1]);

      const debugLogs = consoleLogSpy.mock.calls.filter(
        (call) => call[0]?.includes("🚀") || call[0]?.includes("✅")
      );
      expect(debugLogs.length).toBe(0);
    });
  });

  // ========================================
  // 5. VALIDATE AND HASH - ERROR PATH
  // ========================================

  describe("validateAndHash - Error Path", () => {
    it("should return null when validation fails", async () => {
      (FileFingerprintService.validateFileSet as Mock).mockResolvedValue(mockValidationFailure);

      const { result } = renderHook(() => useFileValidationAndHashing());

      const validationResult = await result.current.validateAndHash([mockFile1]);

      expect(validationResult).toBeNull();
    });

    it("should call onError callback with error message", async () => {
      (FileFingerprintService.validateFileSet as Mock).mockResolvedValue(mockValidationFailure);
      const onError = vi.fn();

      const { result } = renderHook(() => useFileValidationAndHashing({ onError }));

      await result.current.validateAndHash([mockFile1]);

      expect(onError).toHaveBeenCalledWith("Duplicate file detected, Invalid file format");
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should show error toasts when showToasts=true", async () => {
      (FileFingerprintService.validateFileSet as Mock).mockResolvedValue(mockValidationFailure);

      const { result } = renderHook(() => useFileValidationAndHashing({ showToasts: true }));

      await result.current.validateAndHash([mockFile1]);

      expect(toast.error).toHaveBeenCalledWith("Duplicate file detected");
      expect(toast.error).toHaveBeenCalledWith("Invalid file format");
      expect(toast.error).toHaveBeenCalledTimes(2);
    });

    it("should not show error toasts when showToasts=false", async () => {
      (FileFingerprintService.validateFileSet as Mock).mockResolvedValue(mockValidationFailure);

      const { result } = renderHook(() => useFileValidationAndHashing({ showToasts: false }));

      await result.current.validateAndHash([mockFile1]);

      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should handle hash generation error", async () => {
      vi.clearAllMocks();
      const error = new Error("Hash generation failed");
      (FileFingerprintService.generateHash as Mock).mockRejectedValueOnce(error);
      const onError = vi.fn();

      const { result } = renderHook(() => useFileValidationAndHashing({ onError }));

      const validationResult = await result.current.validateAndHash([mockFile1]);

      expect(validationResult).toBeNull();
      expect(onError).toHaveBeenCalledWith("Hash generation failed");
    });

    it("should handle validation service error", async () => {
      vi.clearAllMocks();
      (FileFingerprintService.generateHash as Mock).mockResolvedValueOnce(mockHash1);
      (FileFingerprintService.validateFileSet as Mock).mockRejectedValueOnce(
        new Error("Validation service error")
      );
      const onError = vi.fn();

      const { result } = renderHook(() => useFileValidationAndHashing({ onError }));

      const validationResult = await result.current.validateAndHash([mockFile1]);

      expect(validationResult).toBeNull();
      expect(onError).toHaveBeenCalledWith("Validation service error");
    });

    it("should handle generic errors", async () => {
      vi.clearAllMocks();
      (FileFingerprintService.generateHash as Mock).mockRejectedValueOnce("Unknown error");
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useFileValidationAndHashing({ onError, showToasts: true })
      );

      const validationResult = await result.current.validateAndHash([mockFile1]);

      expect(validationResult).toBeNull();
      expect(onError).toHaveBeenCalledWith("Failed to process uploaded files");
      expect(toast.error).toHaveBeenCalledWith("Failed to process uploaded files");
    });

    it("should not call onSuccess when validation fails", async () => {
      (FileFingerprintService.validateFileSet as Mock).mockResolvedValue(mockValidationFailure);
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useFileValidationAndHashing({ onSuccess }));

      await result.current.validateAndHash([mockFile1]);

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // 6. HELPER FUNCTIONS
  // ========================================

  describe("Helper Functions", () => {
    describe("generateFileKey", () => {
      it("should create correct file key format", () => {
        const key = generateFileKey(mockFile1);

        expect(key).toBe(`${mockFile1.name}-${mockFile1.size}-${mockFile1.lastModified}`);
        expect(key).toContain(mockFile1.name);
        expect(key).toContain(mockFile1.size.toString());
        expect(key).toContain(mockFile1.lastModified.toString());
      });
    });

    describe("hasValidationErrors", () => {
      it("should detect errors in validation", () => {
        const result = hasValidationErrors(mockValidationFailure);

        expect(result).toBe(true);
      });

      it("should return false when no errors", () => {
        const result = hasValidationErrors(mockValidationSuccess);

        expect(result).toBe(false);
      });
    });

    describe("hasValidationWarnings", () => {
      it("should detect warnings in validation", () => {
        const result = hasValidationWarnings(mockValidationWithWarnings);

        expect(result).toBe(true);
      });

      it("should return false when no warnings", () => {
        const result = hasValidationWarnings(mockValidationSuccess);

        expect(result).toBe(false);
      });
    });

    describe("getValidationSummary", () => {
      it("should create summary for successful validation", () => {
        const summary = getValidationSummary(mockValidationSuccess);

        expect(summary.isValid).toBe(true);
        expect(summary.errorCount).toBe(0);
        expect(summary.warningCount).toBe(0);
        expect(summary.duplicateCount).toBe(0);
        expect(summary.summary).toBe("Validation passed");
      });

      it("should create summary for failed validation", () => {
        const summary = getValidationSummary(mockValidationFailure);

        expect(summary.isValid).toBe(false);
        expect(summary.errorCount).toBe(2);
        expect(summary.warningCount).toBe(0);
        expect(summary.duplicateCount).toBe(0);
        expect(summary.summary).toContain("Validation failed");
        expect(summary.summary).toContain("2 error(s)");
      });

      it("should create summary with warnings", () => {
        const summary = getValidationSummary(mockValidationWithWarnings);

        expect(summary.isValid).toBe(true);
        expect(summary.errorCount).toBe(0);
        expect(summary.warningCount).toBe(1);
        expect(summary.summary).toContain("Validation passed");
        expect(summary.summary).toContain("1 warning(s)");
      });
    });
  });

  // ========================================
  // 7. CALLBACK STABILITY
  // ========================================

  describe("Callback Stability", () => {
    it("validateAndHash should be stable with useCallback", () => {
      const { result, rerender } = renderHook(() => useFileValidationAndHashing({ debug: true }));

      const firstCallback = result.current.validateAndHash;
      rerender();
      const secondCallback = result.current.validateAndHash;

      expect(firstCallback).toBe(secondCallback);
    });

    it("generateFileHash should be stable with useCallback", () => {
      const { result, rerender } = renderHook(() => useFileValidationAndHashing({ debug: true }));

      const firstCallback = result.current.generateFileHash;
      rerender();
      const secondCallback = result.current.generateFileHash;

      expect(firstCallback).toBe(secondCallback);
    });

    it("validateFiles should be stable with useCallback", () => {
      const { result, rerender } = renderHook(() => useFileValidationAndHashing({ debug: false }));

      const firstCallback = result.current.validateFiles;
      rerender();
      const secondCallback = result.current.validateFiles;

      expect(firstCallback).toBe(secondCallback);
    });
  });

  // ========================================
  // 8. INTEGRATION TESTS
  // ========================================

  describe("Integration Tests", () => {
    it("should handle complete workflow: files → hashes → validation → success", async () => {
      const onSuccess = vi.fn();
      (FileFingerprintService.generateHash as Mock)
        .mockResolvedValueOnce(mockHash1)
        .mockResolvedValueOnce(mockHash2);
      (FileFingerprintService.validateFileSet as Mock).mockResolvedValue(mockValidationSuccess);

      const { result } = renderHook(() =>
        useFileValidationAndHashing({ onSuccess, showToasts: true })
      );

      const validationResult = await result.current.validateAndHash([mockFile1, mockFile2]);

      // Verify hash generation
      expect(FileFingerprintService.generateHash).toHaveBeenCalledTimes(2);

      // Verify validation
      expect(FileFingerprintService.validateFileSet).toHaveBeenCalledWith([mockFile1, mockFile2]);

      // Verify result
      expect(validationResult).not.toBeNull();
      expect(validationResult?.isValid).toBe(true);
      expect(Object.keys(validationResult?.hashes || {})).toHaveLength(2);

      // Verify callback
      expect(onSuccess).toHaveBeenCalledWith([mockFile1, mockFile2], validationResult);
    });

    it("should handle complete error workflow: files → errors → null", async () => {
      const onError = vi.fn();
      (FileFingerprintService.generateHash as Mock).mockResolvedValue(mockHash1);
      (FileFingerprintService.validateFileSet as Mock).mockResolvedValue(mockValidationFailure);

      const { result } = renderHook(() =>
        useFileValidationAndHashing({ onError, showToasts: true })
      );

      const validationResult = await result.current.validateAndHash([mockFile1]);

      // Verify hash generation
      expect(FileFingerprintService.generateHash).toHaveBeenCalled();

      // Verify validation
      expect(FileFingerprintService.validateFileSet).toHaveBeenCalled();

      // Verify error handling
      expect(validationResult).toBeNull();
      expect(onError).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledTimes(2);
    });

    it("should handle warnings workflow: files → warnings → success", async () => {
      const onSuccess = vi.fn();
      (FileFingerprintService.generateHash as Mock).mockResolvedValue(mockHash1);
      (FileFingerprintService.validateFileSet as Mock).mockResolvedValue(
        mockValidationWithWarnings
      );

      const { result } = renderHook(() =>
        useFileValidationAndHashing({ onSuccess, showToasts: true })
      );

      const validationResult = await result.current.validateAndHash([mockFile1]);

      expect(validationResult).not.toBeNull();
      expect(validationResult?.isValid).toBe(true);
      expect(validationResult?.warnings).toHaveLength(1);
      expect(toast.warning).toHaveBeenCalledWith("Warning: Similar file found");
      expect(onSuccess).toHaveBeenCalled();
    });

    it("should work with multiple files", async () => {
      const files = [mockFile1, mockFile2];
      (FileFingerprintService.generateHash as Mock)
        .mockResolvedValueOnce(mockHash1)
        .mockResolvedValueOnce(mockHash2);

      const { result } = renderHook(() => useFileValidationAndHashing());

      const validationResult = await result.current.validateAndHash(files);

      expect(validationResult).not.toBeNull();
      expect(Object.keys(validationResult?.hashes || {})).toHaveLength(2);
      expect(validationResult?.hashes[generateFileKey(mockFile1)]).toBe(mockHash1);
      expect(validationResult?.hashes[generateFileKey(mockFile2)]).toBe(mockHash2);
    });

    it("should handle empty file array", async () => {
      const { result } = renderHook(() => useFileValidationAndHashing());

      const validationResult = await result.current.validateAndHash([]);

      expect(FileFingerprintService.generateHash).not.toHaveBeenCalled();
      expect(FileFingerprintService.validateFileSet).toHaveBeenCalledWith([]);
      expect(validationResult).not.toBeNull();
      expect(Object.keys(validationResult?.hashes || {})).toHaveLength(0);
    });
  });
});
