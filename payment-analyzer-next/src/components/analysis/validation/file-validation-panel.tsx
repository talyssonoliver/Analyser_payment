/**
 * File Validation Panel Component
 * Orchestrates validation display using focused sub-components and hooks
 * Refactored from 489 lines to use ValidationDisplay, FingerprintDisplay, and ValidationActions
 */

'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ValidationResult } from '@/lib/domain/services/file-validation-service';
import { FingerprintValidation } from '@/lib/services/file-fingerprint-service';
import { useFingerprintValidation } from '@/hooks/use-fingerprint-validation';
import ValidationDisplay from './ValidationDisplay';
import FingerprintDisplay from './FingerprintDisplay';
import ValidationActions from './ValidationActions';
import { IssueType, combineValidationResults } from './types';

export interface FileValidationPanelProps {
  validationResult: ValidationResult | null;
  isValidating?: boolean;
  onRetryValidation?: () => void;
  onFixIssue?: (issueType: IssueType, data?: unknown) => void;
  className?: string;
  // New props for fingerprint functionality
  files?: File[];
  showFingerprintDetails?: boolean;
  onFingerprintValidationComplete?: (validation: FingerprintValidation) => void;
}

/**
 * Main FileValidationPanel orchestrator component
 * Uses hooks and sub-components for focused responsibilities
 */
export function FileValidationPanel({
  validationResult,
  isValidating = false,
  onRetryValidation,
  onFixIssue,
  className = '',
  files = [],
  showFingerprintDetails = false,
  onFingerprintValidationComplete
}: FileValidationPanelProps) {
  // Use fingerprint validation hook for state management
  const {
    fingerprintValidation,
    fingerprintLoading,
    fileComparisons,
    getFileIndicator,
    hasFingerprintIssues
  } = useFingerprintValidation({
    files,
    autoValidate: true,
    onValidationComplete: onFingerprintValidationComplete,
    showDetails: showFingerprintDetails
  });

  // Combine validation results for status determination
  const combined = combineValidationResults(validationResult, fingerprintValidation);
  const { status } = combined;
  // Loading state - show progress when validating
  if (isValidating || fingerprintLoading) {
    return (
      <Card className={`border-blue-200 bg-blue-50 ${className}`}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            <div>
              <h3 className="font-semibold text-blue-900">
                {isValidating ? 'Validating Files...' : 'Analyzing File Fingerprints...'}
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Checking file integrity, updates, and duplicates
              </p>
            </div>
          </div>
          <Progress value={fingerprintLoading ? 50 : 75} className="mt-3 h-2" />
        </div>
      </Card>
    );
  }

  // Empty state - nothing to display
  if (!validationResult && !fingerprintValidation) {
    return null;
  }

  // Main validation display using sub-components
  return (
    <Card className={`border-${status.color}-200 bg-${status.color}-50 ${className}`}>
      <div className="p-4">
        {/* Main Validation Display */}
        <ValidationDisplay
          validationResult={validationResult}
          fingerprintValidation={fingerprintValidation}
          onRetryValidation={onRetryValidation}
          onFixIssue={onFixIssue}
        />

        {/* Fingerprint Analysis Details */}
        <FingerprintDisplay
          files={files}
          fileComparisons={fileComparisons}
          getFileIndicator={getFileIndicator}
          showDetails={showFingerprintDetails}
          fingerprintLoading={fingerprintLoading}
          className="mt-4"
        />

        {/* Action Buttons */}
        <ValidationActions
          onRetryValidation={onRetryValidation}
          hasErrors={!combined.status.isValid}
          hasWarnings={combined.warnings.length > 0 || validationResult?.isUpdated || hasFingerprintIssues}
          isValidating={isValidating || fingerprintLoading}
          className="mt-4"
        />
      </div>
    </Card>
  );
}

export default FileValidationPanel;