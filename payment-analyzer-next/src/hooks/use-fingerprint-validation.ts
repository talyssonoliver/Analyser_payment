/**
 * Fingerprint Validation Hook
 * Provides file fingerprint validation logic extracted from file-validation-panel.tsx
 *
 * This hook handles:
 * - Fingerprint validation state (lines 48-50 from original)
 * - validateFingerprints effect (lines 53-83 from original)
 * - getFileIndicator callback (lines 86-132 from original)
 * - File comparison state and management
 */

import { useState, useEffect, useCallback } from 'react';
import { FileFingerprintService, FileComparison, FingerprintValidation } from '@/lib/services/file-fingerprint-service';

export interface UseFingerprintValidationConfig {
  /** Files to validate for fingerprints */
  files: File[];
  /** Whether to automatically start fingerprint validation */
  autoValidate?: boolean;
  /** Callback when validation completes */
  onValidationComplete?: (validation: FingerprintValidation) => void;
  /** Callback when validation fails */
  onValidationError?: (error: Error) => void;
  /** Whether to show detailed fingerprint information */
  showDetails?: boolean;
}

export interface FileIndicator {
  /** Badge variant for UI styling */
  variant: 'secondary' | 'error' | 'warning' | 'success' | 'default';
  /** Icon character to display */
  icon: string;
  /** Short status text */
  text: string;
  /** Detailed description */
  description: string;
}

export interface UseFingerprintValidationReturn {
  /** Current fingerprint validation result */
  fingerprintValidation: FingerprintValidation | null;
  /** Whether fingerprint validation is in progress */
  fingerprintLoading: boolean;
  /** Individual file comparison results */
  fileComparisons: Record<string, FileComparison>;
  /** Get status indicator for a specific file */
  getFileIndicator: (file: File) => FileIndicator;
  /** Manually trigger fingerprint validation */
  validateFingerprints: () => Promise<void>;
  /** Reset fingerprint validation state */
  resetFingerprintValidation: () => void;
  /** Whether there are any fingerprint issues */
  hasFingerprintIssues: boolean;
  /** Get duplicates from fingerprint validation */
  duplicates: FingerprintValidation['duplicates'];
  /** Get warnings from fingerprint validation */
  warnings: string[];
}

/**
 * Hook for file fingerprint validation and duplicate detection
 *
 * @param config - Configuration options for fingerprint validation
 * @returns Fingerprint validation state and control functions
 *
 * @example
 * ```tsx
 * const {
 *   fingerprintValidation,
 *   fingerprintLoading,
 *   getFileIndicator,
 *   hasFingerprintIssues
 * } = useFingerprintValidation({
 *   files: selectedFiles,
 *   autoValidate: true,
 *   onValidationComplete: (validation) => {
 *     console.log('Fingerprint validation completed:', validation);
 *   }
 * });
 * ```
 */
export function useFingerprintValidation(config: UseFingerprintValidationConfig): UseFingerprintValidationReturn {
  const {
    files,
    autoValidate = true,
    onValidationComplete,
    onValidationError,
    showDetails = false
  } = config;

  // State for fingerprint validation (extracted from lines 48-50)
  const [fingerprintValidation, setFingerprintValidation] = useState<FingerprintValidation | null>(null);
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [fileComparisons, setFileComparisons] = useState<Record<string, FileComparison>>({});

  /**
   * Validate fingerprints for all files
   * Extracted from validateFingerprints effect (lines 53-83)
   */
  const validateFingerprints = useCallback(async (): Promise<void> => {
    if (files.length === 0) {
      setFingerprintValidation(null);
      setFileComparisons({});
      return;
    }

    try {
      setFingerprintLoading(true);

      console.log('🔍 Starting fingerprint validation...', {
        fileCount: files.length
      });

      // Validate the entire file set for duplicates and issues
      const validation = await FileFingerprintService.validateFileSet(files);
      setFingerprintValidation(validation);
      onValidationComplete?.(validation);

      console.log('✅ Fingerprint validation completed:', {
        isValid: validation.isValid,
        errors: validation.errors.length,
        warnings: validation.warnings.length,
        duplicates: validation.duplicates.length
      });

      // Generate individual file comparisons for detailed display
      const comparisons: Record<string, FileComparison> = {};
      for (const file of files) {
        try {
          const comparison = await FileFingerprintService.compareWithExisting(file);
          const key = `${file.name}-${file.size}-${file.lastModified}`;
          comparisons[key] = comparison;

          if (showDetails) {
            console.log(`📄 File comparison for ${file.name}:`, {
              isDuplicate: comparison.isDuplicate,
              hasChanged: comparison.hasChanged,
              changeType: comparison.changeType,
              hasPrevious: !!comparison.previousFingerprint
            });
          }
        } catch (error) {
          console.error(`Failed to compare file ${file.name}:`, error);
        }
      }
      setFileComparisons(comparisons);

    } catch (error) {
      console.error('❌ Fingerprint validation failed:', error);
      setFingerprintValidation(null);
      onValidationError?.(error instanceof Error ? error : new Error('Unknown fingerprint validation error'));
    } finally {
      setFingerprintLoading(false);
    }
  }, [files, onValidationComplete, onValidationError, showDetails]);

  /**
   * Get individual file fingerprint indicator
   * Extracted from getFileIndicator callback (lines 86-132)
   */
  const getFileIndicator = useCallback((file: File): FileIndicator => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    const comparison = fileComparisons[key];

    // Still checking (no comparison data available)
    if (!comparison) {
      return {
        variant: 'secondary' as const,
        icon: '⏳',
        text: 'Checking...',
        description: 'Analyzing file fingerprint'
      };
    }

    // File is a duplicate (identical content, not changed)
    if (comparison.isDuplicate) {
      return {
        variant: 'error' as const,
        icon: '🔄',
        text: 'Duplicate',
        description: 'This file was already processed'
      };
    }

    // File has been modified since last processing
    if (comparison.hasChanged) {
      return {
        variant: 'warning' as const,
        icon: '📝',
        text: 'Modified',
        description: `File has been ${comparison.changeType || 'changed'} since last analysis`
      };
    }

    // File exists and hasn't changed
    if (comparison.previousFingerprint) {
      return {
        variant: 'success' as const,
        icon: '✅',
        text: 'Unchanged',
        description: 'File matches previous analysis'
      };
    }

    // New file (first time processing)
    return {
      variant: 'default' as const,
      icon: '🆕',
      text: 'New',
      description: 'First time processing this file'
    };
  }, [fileComparisons]);

  /**
   * Reset fingerprint validation state
   */
  const resetFingerprintValidation = useCallback((): void => {
    console.log('🧹 Resetting fingerprint validation state...');
    setFingerprintValidation(null);
    setFingerprintLoading(false);
    setFileComparisons({});
  }, []);

  // Auto-validate when files change (extracted from useEffect lines 53-83)
  useEffect(() => {
    if (autoValidate && files.length > 0) {
      console.log('🔄 Auto-validating fingerprints due to file changes...');
      validateFingerprints();
    } else if (files.length === 0) {
      resetFingerprintValidation();
    }
  }, [files, autoValidate, validateFingerprints, resetFingerprintValidation]);

  // Derived state for convenience
  const hasFingerprintIssues = (fingerprintValidation?.duplicates?.length || 0) > 0 ||
                              (fingerprintValidation?.warnings?.length || 0) > 0;
  const duplicates = fingerprintValidation?.duplicates ?? [];
  const warnings = fingerprintValidation?.warnings ?? [];

  return {
    fingerprintValidation,
    fingerprintLoading,
    fileComparisons,
    getFileIndicator,
    validateFingerprints,
    resetFingerprintValidation,
    hasFingerprintIssues,
    duplicates,
    warnings
  };
}

/**
 * Get file key for comparison lookup
 */
export function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Type guard to check if fingerprint validation has duplicates
 */
export function hasFingerprintDuplicates(validation: FingerprintValidation | null): boolean {
  return (validation?.duplicates?.length ?? 0) > 0;
}

/**
 * Type guard to check if fingerprint validation has warnings
 */
export function hasFingerprintWarnings(validation: FingerprintValidation | null): boolean {
  return (validation?.warnings?.length ?? 0) > 0;
}

/**
 * Get fingerprint validation status text for display
 */
export function getFingerprintStatusText(validation: FingerprintValidation | null): string {
  if (!validation) return 'No fingerprint analysis performed';
  if (!validation.isValid) return 'Fingerprint validation failed';
  if (hasFingerprintWarnings(validation) || hasFingerprintDuplicates(validation)) {
    return 'Fingerprint analysis completed with issues';
  }
  return 'Fingerprint analysis passed';
}

/**
 * Get summary of fingerprint issues for display
 */
export function getFingerprintIssueSummary(validation: FingerprintValidation | null): {
  duplicateCount: number;
  warningCount: number;
  errorCount: number;
  hasIssues: boolean;
} {
  if (!validation) {
    return {
      duplicateCount: 0,
      warningCount: 0,
      errorCount: 0,
      hasIssues: false
    };
  }

  const duplicateCount = validation.duplicates?.length ?? 0;
  const warningCount = validation.warnings?.length ?? 0;
  const errorCount = validation.errors?.length ?? 0;

  return {
    duplicateCount,
    warningCount,
    errorCount,
    hasIssues: duplicateCount > 0 || warningCount > 0 || errorCount > 0
  };
}