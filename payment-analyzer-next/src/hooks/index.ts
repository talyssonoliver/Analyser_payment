/**
 * Hooks Index
 * Central export file for all validation hooks
 */

export type {
  UseFileValidationConfig,
  UseFileValidationReturn,
} from "./use-file-validation";
// File validation hook and utilities
export {
  getValidationStatusColor,
  getValidationStatusText,
  hasValidationErrors,
  hasValidationWarnings,
  useFileValidation,
} from "./use-file-validation";
export type {
  FileIndicator,
  UseFingerprintValidationConfig,
  UseFingerprintValidationReturn,
} from "./use-fingerprint-validation";
// Fingerprint validation hook and utilities
export {
  getFileKey,
  getFingerprintIssueSummary,
  getFingerprintStatusText,
  hasFingerprintDuplicates,
  hasFingerprintWarnings,
  useFingerprintValidation,
} from "./use-fingerprint-validation";
export type {
  FileValidationResult,
  UseFileValidationAndHashingConfig,
  UseFileValidationAndHashingReturn,
} from "./useFileValidationAndHashing";
// File validation and hashing hook and utilities
export {
  generateFileKey,
  getValidationSummary,
  hasValidationErrors as hasFileHashingErrors,
  hasValidationWarnings as hasFileHashingWarnings,
  useFileValidationAndHashing,
} from "./useFileValidationAndHashing";
export type {
  NavigationBadges,
  UseNavigationBadgesOptions,
} from "./useNavigationBadges";
// Navigation badges hook
export { useNavigationBadges } from "./useNavigationBadges";
export type {
  UseSessionRecoveryConfig,
  UseSessionRecoveryReturn,
} from "./useSessionRecovery";
// Session recovery hook and utilities
export {
  checkForSessionRecovery,
  clearSessionData,
  saveSessionData,
  useSessionRecovery,
} from "./useSessionRecovery";
