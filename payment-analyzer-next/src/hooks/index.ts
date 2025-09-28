/**
 * Hooks Index
 * Central export file for all validation hooks
 */

// File validation hook and utilities
export {
  useFileValidation,
  hasValidationErrors,
  hasValidationWarnings,
  getValidationStatusText,
  getValidationStatusColor
} from './use-file-validation';

export type {
  UseFileValidationConfig,
  UseFileValidationReturn
} from './use-file-validation';

// Fingerprint validation hook and utilities
export {
  useFingerprintValidation,
  getFileKey,
  hasFingerprintDuplicates,
  hasFingerprintWarnings,
  getFingerprintStatusText,
  getFingerprintIssueSummary
} from './use-fingerprint-validation';

export type {
  UseFingerprintValidationConfig,
  FileIndicator,
  UseFingerprintValidationReturn
} from './use-fingerprint-validation';