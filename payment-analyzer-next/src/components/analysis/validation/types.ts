/**
 * Shared Types for Validation Components
 * Common types and interfaces used across validation sub-components
 */

import type { ValidationResult } from "@/lib/domain/services/file-validation-service";
import type {
  FileComparison,
  FingerprintValidation,
} from "@/lib/services/file-fingerprint-service";

/**
 * Issue type for handling different types of validation problems
 */
export type IssueType = "error" | "warning" | "duplicate" | "update" | "existing";

/**
 * File indicator variant for status badges
 */
export type FileIndicatorVariant = "secondary" | "error" | "warning" | "success" | "default";

/**
 * File indicator interface for displaying file status
 */
export interface FileIndicator {
  /** Badge variant for UI styling */
  variant: FileIndicatorVariant;
  /** Icon character to display */
  icon: string;
  /** Short status text */
  text: string;
  /** Detailed description */
  description: string;
}

/**
 * Base props for validation sub-components
 */
export interface BaseValidationProps {
  /** CSS class name for styling */
  className?: string;
  /** Whether component is in loading state */
  isLoading?: boolean;
}

/**
 * Props for ValidationDisplay component
 */
export interface ValidationDisplayProps extends BaseValidationProps {
  /** Validation result to display */
  validationResult: ValidationResult | null;
  /** Fingerprint validation result */
  fingerprintValidation?: FingerprintValidation | null;
  /** Callback for retrying validation */
  onRetryValidation?: () => void;
  /** Callback for fixing specific issues */
  onFixIssue?: (issueType: IssueType, data?: unknown) => void;
}

/**
 * Props for FingerprintDisplay component
 */
export interface FingerprintDisplayProps extends BaseValidationProps {
  /** Files being analyzed */
  files: File[];
  /** File comparison results */
  fileComparisons: Record<string, FileComparison>;
  /** Function to get file indicator */
  getFileIndicator: (file: File) => FileIndicator;
  /** Whether to show detailed fingerprint information */
  showDetails?: boolean;
  /** Whether fingerprint validation is loading */
  fingerprintLoading?: boolean;
}

/**
 * Props for ValidationActions component
 */
export interface ValidationActionsProps extends BaseValidationProps {
  /** Callback for retrying validation */
  onRetryValidation?: () => void;
  /** Callback for dismissing validation panel */
  onDismiss?: () => void;
  /** Whether there are validation errors */
  hasErrors?: boolean;
  /** Whether there are validation warnings */
  hasWarnings?: boolean;
  /** Whether validation is currently running */
  isValidating?: boolean;
  /** Custom action buttons */
  customActions?: React.ReactNode;
}

/**
 * Status color type for UI theming
 */
export type StatusColor = "red" | "amber" | "green" | "blue" | "indigo" | "orange" | "slate";

/**
 * Validation status interface
 */
export interface ValidationStatus {
  /** Overall validation state */
  isValid: boolean;
  /** Status color for theming */
  color: StatusColor;
  /** Status text for display */
  text: string;
  /** Status icon component */
  icon: React.ReactNode;
}

/**
 * Combined validation result interface
 */
export interface CombinedValidationResult {
  /** Standard validation result */
  validationResult: ValidationResult | null;
  /** Fingerprint validation result */
  fingerprintValidation: FingerprintValidation | null;
  /** Combined errors array */
  errors: string[];
  /** Combined warnings array */
  warnings: string[];
  /** Combined duplicates array */
  duplicates: (File | { name: string; size: number; lastModified: number; hash?: string })[];
  /** Whether there are fingerprint issues */
  hasFingerprintIssues: boolean;
  /** Overall validation status */
  status: ValidationStatus;
}

/**
 * Utility function to combine validation results
 */
export function combineValidationResults(
  validationResult: ValidationResult | null,
  fingerprintValidation: FingerprintValidation | null
): CombinedValidationResult {
  // Merge validation results - prioritize validationResult if available
  const mergedValidation = validationResult || {
    isValid: fingerprintValidation?.isValid ?? true,
    errors: fingerprintValidation?.errors ?? [],
    warnings: fingerprintValidation?.warnings ?? [],
    isUpdated: false,
    duplicateFiles: [],
    existingAnalysis: null,
  };

  const { isValid, errors, warnings, isUpdated, duplicateFiles } = mergedValidation;

  // Include fingerprint-specific issues
  const fingerprintDuplicates = fingerprintValidation?.duplicates ?? [];
  const allDuplicates = [...(duplicateFiles || []), ...fingerprintDuplicates.map((d) => d.current)];
  const hasFingerprintIssues =
    fingerprintDuplicates.length > 0 || (fingerprintValidation?.warnings?.length || 0) > 0;
  const combinedWarnings = [...warnings, ...(fingerprintValidation?.warnings || [])];

  // Determine status
  let color: StatusColor;
  let text: string;

  if (!isValid) {
    color = "red";
    text = "Validation Failed";
  } else if (combinedWarnings.length > 0 || isUpdated || hasFingerprintIssues) {
    color = "amber";
    text = "Validation Passed with Warnings";
  } else {
    color = "green";
    text = "Validation Passed";
  }

  return {
    validationResult,
    fingerprintValidation,
    errors,
    warnings: combinedWarnings,
    duplicates: allDuplicates,
    hasFingerprintIssues,
    status: {
      isValid,
      color,
      text,
      icon: null, // Will be set by components
    },
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get file key for comparison lookup
 */
export function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}
