/**
 * useFileValidationAndHashing Hook
 *
 * Provides file validation and hashing logic extracted from Step1Container.
 * Handles fingerprint generation, duplicate detection, and file validation.
 *
 * Extracted from:
 * - Step1Container lines 139-191: File upload with fingerprinting and validation
 *
 * @example
 * ```tsx
 * const { validateAndHash } = useFileValidationAndHashing({
 *   onSuccess: (files, hashes) => {
 *     console.log('Files validated:', files);
 *   },
 *   onError: (error) => {
 *     console.error('Validation failed:', error);
 *   }
 * });
 *
 * await validateAndHash(uploadedFiles);
 * ```
 */

"use client";

import { useCallback } from "react";
import {
  FileFingerprintService,
  type FingerprintValidation,
} from "@/lib/services/file-fingerprint-service";
import { toast } from "@/lib/utils/toast";

/**
 * Result from file validation and hashing
 */
export interface FileValidationResult {
  /**
   * Map of file keys to their SHA-256 hashes
   */
  hashes: Record<string, string>;

  /**
   * Fingerprint validation result
   */
  validation: FingerprintValidation;

  /**
   * Whether validation passed
   */
  isValid: boolean;

  /**
   * Array of validation errors
   */
  errors: string[];

  /**
   * Array of validation warnings
   */
  warnings: string[];
}

/**
 * Configuration for the useFileValidationAndHashing hook
 */
export interface UseFileValidationAndHashingConfig {
  /**
   * Callback invoked when validation succeeds
   */
  onSuccess?: (files: File[], result: FileValidationResult) => void;

  /**
   * Callback invoked when validation fails
   */
  onError?: (error: string) => void;

  /**
   * Whether to show toast notifications
   * @default true
   */
  showToasts?: boolean;

  /**
   * Whether to log debug information
   * @default false
   */
  debug?: boolean;
}

/**
 * Return type for useFileValidationAndHashing hook
 */
export interface UseFileValidationAndHashingReturn {
  /**
   * Validate files and generate hashes
   * Returns validation result or null if validation fails
   */
  validateAndHash: (files: File[]) => Promise<FileValidationResult | null>;

  /**
   * Generate hash for a single file
   */
  generateFileHash: (file: File) => Promise<string>;

  /**
   * Validate file set without generating hashes
   */
  validateFiles: (files: File[]) => Promise<FingerprintValidation>;
}

/**
 * Hook for file validation and hashing with fingerprint-based duplicate detection
 *
 * Extracted from Step1Container to provide reusable file validation logic.
 * Handles:
 * - SHA-256 hash generation for files
 * - Duplicate detection using FileFingerprintService
 * - Validation error and warning handling
 * - Toast notifications for user feedback
 *
 * @param config - Configuration options for file validation
 * @returns File validation functions and utilities
 */
export function useFileValidationAndHashing(
  config: UseFileValidationAndHashingConfig = {}
): UseFileValidationAndHashingReturn {
  const { onSuccess, onError, showToasts = true, debug = false } = config;

  /**
   * Generate hash for a single file
   */
  const generateFileHash = useCallback(
    async (file: File): Promise<string> => {
      try {
        if (debug) {
          console.log("🔐 Generating hash for file:", file.name);
        }

        const hash = await FileFingerprintService.generateHash(file);

        if (debug) {
          console.log("✅ Hash generated:", `${hash.substring(0, 16)}...`);
        }

        return hash;
      } catch (error) {
        console.error("❌ Failed to generate hash for file:", file.name, error);
        throw error;
      }
    },
    [debug]
  );

  /**
   * Validate file set without generating individual hashes
   */
  const validateFiles = useCallback(
    async (files: File[]): Promise<FingerprintValidation> => {
      try {
        if (debug) {
          console.log("🔍 Validating file set:", files.length, "files");
        }

        const validation = await FileFingerprintService.validateFileSet(files);

        if (debug) {
          console.log("📊 Validation result:", {
            isValid: validation.isValid,
            errors: validation.errors.length,
            warnings: validation.warnings.length,
            duplicates: validation.duplicates.length,
          });
        }

        return validation;
      } catch (error) {
        console.error("❌ File validation failed:", error);
        throw error;
      }
    },
    [debug]
  );

  /**
   * Generate hashes for all files
   * Helper to reduce complexity of validateAndHash
   */
  const generateHashesForFiles = useCallback(
    async (files: File[]): Promise<Record<string, string>> => {
      const hashes: Record<string, string> = {};

      for (const file of files) {
        const hash = await FileFingerprintService.generateHash(file);
        const key = generateFileKey(file);
        hashes[key] = hash;

        if (debug) {
          console.log(`📄 Hash for ${file.name}:`, `${hash.substring(0, 16)}...`);
        }
      }

      return hashes;
    },
    [debug]
  );

  /**
   * Handle validation errors
   * Helper to reduce complexity of validateAndHash
   */
  const handleValidationErrors = useCallback(
    (validation: FingerprintValidation): void => {
      if (showToasts) {
        validation.errors.forEach((error) => {
          toast.error(error);
        });
      }

      const errorMessage = validation.errors.join(", ");
      onError?.(errorMessage);

      console.error("❌ File validation failed:", validation.errors);
    },
    [showToasts, onError]
  );

  /**
   * Handle validation warnings
   * Helper to reduce complexity of validateAndHash
   */
  const handleValidationWarnings = useCallback(
    (validation: FingerprintValidation): void => {
      if (validation.warnings.length === 0) {
        return;
      }

      if (showToasts) {
        validation.warnings.forEach((warning) => {
          toast.warning(warning);
        });
      }

      if (debug) {
        console.warn("⚠️ Validation warnings:", validation.warnings);
      }
    },
    [showToasts, debug]
  );

  /**
   * Handle validation and hashing errors
   * Helper to reduce complexity of validateAndHash
   */
  const handleProcessingError = useCallback(
    (error: unknown): void => {
      console.error("❌ File validation and hashing error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Failed to process uploaded files";

      if (showToasts) {
        toast.error(errorMessage);
      }

      onError?.(errorMessage);
    },
    [showToasts, onError]
  );

  /**
   * Create validation result object
   * Helper to reduce complexity of validateAndHash
   */
  const createValidationResult = useCallback(
    (hashes: Record<string, string>, validation: FingerprintValidation): FileValidationResult => {
      return {
        hashes,
        validation,
        isValid: true,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    },
    []
  );

  /**
   * Validate and hash files
   * Extracted from Step1Container lines 139-191
   */
  const validateAndHash = useCallback(
    async (files: File[]): Promise<FileValidationResult | null> => {
      try {
        if (debug) {
          console.log("🚀 Starting file validation and hashing for", files.length, "files");
        }

        // Generate fingerprints for duplicate detection
        const newHashes = await generateHashesForFiles(files);

        // Check for duplicates
        const validation = await FileFingerprintService.validateFileSet(files);

        // Handle validation errors
        if (!validation.isValid) {
          handleValidationErrors(validation);
          return null;
        }

        // Show warnings if any
        handleValidationWarnings(validation);

        // Log file hashes for debugging
        if (debug) {
          console.debug("Generated file hashes:", newHashes);
        }

        // Create result object
        const result = createValidationResult(newHashes, validation);

        // Trigger success callback
        onSuccess?.(files, result);

        if (debug) {
          console.log("✅ File validation and hashing completed successfully");
        }

        return result;
      } catch (error) {
        handleProcessingError(error);
        return null;
      }
    },
    [
      onSuccess,
      debug,
      generateHashesForFiles,
      handleValidationErrors,
      handleValidationWarnings,
      handleProcessingError,
      createValidationResult,
    ]
  );

  return {
    validateAndHash,
    generateFileHash,
    validateFiles,
  };
}

/**
 * Helper function to generate a file key for hash lookup
 */
export function generateFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Helper function to check if validation has errors
 */
export function hasValidationErrors(validation: FingerprintValidation): boolean {
  return validation.errors.length > 0;
}

/**
 * Helper function to check if validation has warnings
 */
export function hasValidationWarnings(validation: FingerprintValidation): boolean {
  return validation.warnings.length > 0;
}

/**
 * Helper function to get validation summary
 */
export function getValidationSummary(validation: FingerprintValidation): {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  duplicateCount: number;
  summary: string;
} {
  const errorCount = validation.errors.length;
  const warningCount = validation.warnings.length;
  const duplicateCount = validation.duplicates.length;

  let summary = "Validation passed";
  if (!validation.isValid) {
    summary = `Validation failed with ${errorCount} error(s)`;
  } else if (warningCount > 0 || duplicateCount > 0) {
    summary = `Validation passed with ${warningCount} warning(s) and ${duplicateCount} duplicate(s)`;
  }

  return {
    isValid: validation.isValid,
    errorCount,
    warningCount,
    duplicateCount,
    summary,
  };
}
