/**
 * File Validation Hook
 * Provides comprehensive file validation logic extracted from file-validation-panel.tsx
 *
 * This hook handles:
 * - Basic file validation (size, type, count)
 * - Integration with fileValidationService
 * - Validation state management
 * - Retry functionality
 */

import { useState, useCallback, useEffect } from 'react';
import { ValidationResult, fileValidationService, FileValidationOptions } from '@/lib/domain/services/file-validation-service';

export interface UseFileValidationConfig {
  /** Files to validate */
  files: File[];
  /** Maximum file size in bytes (default: 50MB) */
  maxFileSize?: number;
  /** Allowed MIME types (default: ['application/pdf']) */
  allowedTypes?: string[];
  /** Whether to check for file updates against stored analyses */
  checkForUpdates?: boolean;
  /** Whether to check for duplicate files in the current selection */
  checkForDuplicates?: boolean;
  /** Auto-validate when files change */
  autoValidate?: boolean;
  /** Callback when validation completes */
  onValidationComplete?: (result: ValidationResult) => void;
  /** Callback when validation fails */
  onValidationError?: (error: Error) => void;
}

export interface UseFileValidationReturn {
  /** Current validation result */
  validationResult: ValidationResult | null;
  /** Whether validation is currently in progress */
  isValidating: boolean;
  /** Manually trigger validation */
  validateFiles: () => Promise<void>;
  /** Retry validation (same as validateFiles) */
  retryValidation: () => Promise<void>;
  /** Reset validation state */
  resetValidation: () => void;
  /** Whether files have passed basic validation */
  isValid: boolean;
  /** Whether files have validation errors */
  hasErrors: boolean;
  /** Whether files have validation warnings */
  hasWarnings: boolean;
  /** Total error count */
  errorCount: number;
  /** Total warning count */
  warningCount: number;
}

/**
 * Hook for comprehensive file validation
 *
 * @param config - Configuration options for file validation
 * @returns Validation state and control functions
 *
 * @example
 * ```tsx
 * const {
 *   validationResult,
 *   isValidating,
 *   validateFiles,
 *   isValid,
 *   hasErrors
 * } = useFileValidation({
 *   files: selectedFiles,
 *   maxFileSize: 50 * 1024 * 1024, // 50MB
 *   allowedTypes: ['application/pdf'],
 *   checkForUpdates: true,
 *   autoValidate: true,
 *   onValidationComplete: (result) => {
 *     console.log('Validation completed:', result);
 *   }
 * });
 * ```
 */
export function useFileValidation(config: UseFileValidationConfig): UseFileValidationReturn {
  const {
    files,
    maxFileSize = 50 * 1024 * 1024, // 50MB default
    allowedTypes = ['application/pdf'],
    checkForUpdates = true,
    checkForDuplicates = true,
    autoValidate = true,
    onValidationComplete,
    onValidationError
  } = config;

  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Perform file validation using the fileValidationService
   */
  const validateFiles = useCallback(async (): Promise<void> => {
    if (files.length === 0) {
      setValidationResult(null);
      return;
    }

    try {
      setIsValidating(true);

      // Prepare validation options
      const validationOptions: Partial<FileValidationOptions> = {
        maxFileSize,
        allowedTypes,
        checkForUpdates,
        checkForDuplicates
      };

      console.log('🔍 Starting file validation...', {
        fileCount: files.length,
        options: validationOptions
      });

      // Perform validation using the service
      const result = await fileValidationService.validateFiles(files, validationOptions);

      console.log('✅ File validation completed:', {
        isValid: result.isValid,
        errors: result.errors.length,
        warnings: result.warnings.length,
        isUpdated: result.isUpdated,
        duplicates: result.duplicateFiles?.length || 0
      });

      setValidationResult(result);
      onValidationComplete?.(result);

    } catch (error) {
      console.error('❌ File validation failed:', error);

      const errorResult: ValidationResult = {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };

      setValidationResult(errorResult);
      onValidationError?.(error instanceof Error ? error : new Error('Unknown validation error'));

    } finally {
      setIsValidating(false);
    }
  }, [
    files,
    maxFileSize,
    allowedTypes,
    checkForUpdates,
    checkForDuplicates,
    onValidationComplete,
    onValidationError
  ]);

  /**
   * Retry validation (alias for validateFiles)
   */
  const retryValidation = useCallback((): Promise<void> => {
    console.log('🔄 Retrying file validation...');
    return validateFiles();
  }, [validateFiles]);

  /**
   * Reset validation state
   */
  const resetValidation = useCallback((): void => {
    console.log('🧹 Resetting validation state...');
    setValidationResult(null);
    setIsValidating(false);
  }, []);

  // Auto-validate when files change
  useEffect(() => {
    if (autoValidate && files.length > 0) {
      console.log('🔄 Auto-validating files due to changes...');
      validateFiles();
    } else if (files.length === 0) {
      resetValidation();
    }
  }, [files, autoValidate, validateFiles, resetValidation]);

  // Derived state for convenience
  const isValid = validationResult?.isValid ?? false;
  const hasErrors = (validationResult?.errors?.length ?? 0) > 0;
  const hasWarnings = (validationResult?.warnings?.length ?? 0) > 0;
  const errorCount = validationResult?.errors?.length ?? 0;
  const warningCount = validationResult?.warnings?.length ?? 0;

  return {
    validationResult,
    isValidating,
    validateFiles,
    retryValidation,
    resetValidation,
    isValid,
    hasErrors,
    hasWarnings,
    errorCount,
    warningCount
  };
}

/**
 * Type guard to check if a validation result has errors
 */
export function hasValidationErrors(result: ValidationResult | null): boolean {
  return (result?.errors?.length ?? 0) > 0;
}

/**
 * Type guard to check if a validation result has warnings
 */
export function hasValidationWarnings(result: ValidationResult | null): boolean {
  return (result?.warnings?.length ?? 0) > 0;
}

/**
 * Get validation status text for display
 */
export function getValidationStatusText(result: ValidationResult | null): string {
  if (!result) return 'No validation performed';
  if (!result.isValid) return 'Validation Failed';
  if (hasValidationWarnings(result) || result.isUpdated) return 'Validation Passed with Warnings';
  return 'Validation Passed';
}

/**
 * Get validation status color for UI theming
 */
export function getValidationStatusColor(result: ValidationResult | null): 'red' | 'amber' | 'green' | 'gray' {
  if (!result) return 'gray';
  if (!result.isValid) return 'red';
  if (hasValidationWarnings(result) || result.isUpdated) return 'amber';
  return 'green';
}