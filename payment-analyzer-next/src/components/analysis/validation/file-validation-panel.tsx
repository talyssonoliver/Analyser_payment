/**
 * File Validation Panel Component
 * Displays comprehensive file validation results with actionable feedback
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  FileText as FileError,
  Clock,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ValidationResult } from '@/lib/domain/services/file-validation-service';
import { FileFingerprintService, FileComparison, FingerprintValidation } from '@/lib/services/file-fingerprint-service';

export interface FileValidationPanelProps {
  validationResult: ValidationResult | null;
  isValidating?: boolean;
  onRetryValidation?: () => void;
  onFixIssue?: (issueType: string, data?: unknown) => void;
  className?: string;
  // New props for fingerprint functionality
  files?: File[];
  showFingerprintDetails?: boolean;
  onFingerprintValidationComplete?: (validation: FingerprintValidation) => void;
}

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
  // State for fingerprint validation
  const [fingerprintValidation, setFingerprintValidation] = useState<FingerprintValidation | null>(null);
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [fileComparisons, setFileComparisons] = useState<Record<string, FileComparison>>({});

  // Fingerprint validation effect
  useEffect(() => {
    const validateFingerprints = async () => {
      if (files.length === 0) return;

      try {
        setFingerprintLoading(true);
        const validation = await FileFingerprintService.validateFileSet(files);
        setFingerprintValidation(validation);
        onFingerprintValidationComplete?.(validation);

        // Generate individual file comparisons for detailed display
        const comparisons: Record<string, FileComparison> = {};
        for (const file of files) {
          const comparison = await FileFingerprintService.compareWithExisting(file);
          const key = `${file.name}-${file.size}-${file.lastModified}`;
          comparisons[key] = comparison;
        }
        setFileComparisons(comparisons);

      } catch (error) {
        console.error('Fingerprint validation failed:', error);
        setFingerprintValidation(null);
      } finally {
        setFingerprintLoading(false);
      }
    };

    if (files.length > 0) {
      validateFingerprints();
    }
  }, [files, onFingerprintValidationComplete]);

  // Get individual file fingerprint indicator
  const getFileIndicator = useCallback((file: File) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    const comparison = fileComparisons[key];

    if (!comparison) {
      return {
        variant: 'secondary' as const,
        icon: '⏳',
        text: 'Checking...',
        description: 'Analyzing file fingerprint'
      };
    }

    if (comparison.isDuplicate) {
      return {
        variant: 'error' as const,
        icon: '🔄',
        text: 'Duplicate',
        description: 'This file was already processed'
      };
    }

    if (comparison.hasChanged) {
      return {
        variant: 'warning' as const,
        icon: '📝',
        text: 'Modified',
        description: `File has been ${comparison.changeType || 'changed'} since last analysis`
      };
    }

    if (comparison.previousFingerprint) {
      return {
        variant: 'success' as const,
        icon: '✅',
        text: 'Unchanged',
        description: 'File matches previous analysis'
      };
    }

    return {
      variant: 'default' as const,
      icon: '🆕',
      text: 'New',
      description: 'First time processing this file'
    };
  }, [fileComparisons]);
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

  if (!validationResult && !fingerprintValidation) return null;

  // Merge validation results - prioritize validationResult if available
  const mergedValidation = validationResult || {
    isValid: fingerprintValidation?.isValid ?? true,
    errors: fingerprintValidation?.errors ?? [],
    warnings: fingerprintValidation?.warnings ?? [],
    isUpdated: false,
    duplicateFiles: [],
    existingAnalysis: null
  };

  const { isValid, errors, warnings, isUpdated, duplicateFiles, existingAnalysis } = mergedValidation;

  // Include fingerprint-specific issues
  const hasFingerprint = fingerprintValidation !== null;
  const fingerprintDuplicates = fingerprintValidation?.duplicates ?? [];
  const allDuplicates = [...(duplicateFiles || []), ...fingerprintDuplicates.map(d => d.current)];
  const hasFingerprintIssues = fingerprintDuplicates.length > 0 || (fingerprintValidation?.warnings?.length || 0) > 0;
  const combinedWarnings = [...warnings, ...(fingerprintValidation?.warnings || [])];

  const getStatusIcon = () => {
    if (!isValid) return <XCircle className="w-5 h-5 text-red-600" />;
    if (combinedWarnings.length > 0 || isUpdated || hasFingerprintIssues) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  const getStatusText = () => {
    if (!isValid) return 'Validation Failed';
    if (combinedWarnings.length > 0 || isUpdated || hasFingerprintIssues) return 'Validation Passed with Warnings';
    return 'Validation Passed';
  };

  const getStatusColor = () => {
    if (!isValid) return 'red';
    if (combinedWarnings.length > 0 || isUpdated || hasFingerprintIssues) return 'amber';
    return 'green';
  };

  const statusColor = getStatusColor();

  return (
    <Card className={`border-${statusColor}-200 bg-${statusColor}-50 ${className}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <h3 className={`font-semibold text-${statusColor}-900`}>
                {getStatusText()}
              </h3>
              <p className={`text-sm text-${statusColor}-700 mt-1`}>
                File validation completed
              </p>
            </div>
          </div>
          {onRetryValidation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetryValidation}
              className={`text-${statusColor}-600 hover:text-${statusColor}-700 hover:bg-${statusColor}-100`}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Revalidate
            </Button>
          )}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="font-medium text-red-900">
                Errors ({errors.length})
              </span>
            </div>
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className="bg-red-100 border border-red-200 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-red-800">{error}</span>
                    {onFixIssue && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFixIssue('error', error)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-200 ml-2"
                      >
                        Fix
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {combinedWarnings.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-amber-900">
                Warnings ({combinedWarnings.length})
              </span>
            </div>
            <div className="space-y-2">
              {combinedWarnings.map((warning, index) => (
                <div
                  key={index}
                  className="bg-amber-100 border border-amber-200 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-amber-800">{warning}</span>
                    {onFixIssue && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFixIssue('warning', warning)}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-200 ml-2"
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Updates */}
        {isUpdated && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                File Updates Detected
              </span>
              <Badge variant="info" className="text-xs">
                Action Required
              </Badge>
            </div>
            <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm text-blue-800">
                    Some files have been modified since the last analysis.
                  </span>
                  <p className="text-xs text-blue-600 mt-1">
                    Re-processing these files may provide updated payment data.
                  </p>
                </div>
                {onFixIssue && (
                  <Button
                    size="sm"
                    onClick={() => onFixIssue('update', { isUpdated })}
                    className="bg-blue-600 hover:bg-blue-700 text-white ml-2"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Update
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Files - Enhanced with fingerprint data */}
        {allDuplicates && allDuplicates.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileError className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-orange-900">
                Duplicate Files ({allDuplicates.length})
              </span>
            </div>
            <div className="space-y-2">
              {allDuplicates.map((file, index) => {
                // Find corresponding fingerprint duplicate info
                const fingerprintDup = fingerprintDuplicates.find(d => d.current.name === file.name);
                return (
                  <div
                    key={index}
                    className="bg-orange-100 border border-orange-200 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-orange-800 font-medium">
                            {file.name}
                          </span>
                          {fingerprintDup && (
                            <Badge variant="secondary" className="text-xs">
                              {fingerprintDup.type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-orange-600">
                          {formatFileSize(file.size)} • Modified {new Date(file.lastModified).toLocaleDateString()}
                        </p>
                        {fingerprintDup?.existing && (
                          <p className="text-xs text-orange-500 mt-1">
                            Previously processed: {new Date(fingerprintDup.existing.processedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {onFixIssue && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFixIssue('duplicate', file)}
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-200 ml-2"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Existing Analysis */}
        {existingAnalysis && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-indigo-600" />
              <span className="font-medium text-indigo-900">
                Existing Analysis Found
              </span>
            </div>
            <div className="bg-indigo-100 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm text-indigo-800">
                    Similar files were found in analysis: {existingAnalysis}
                  </span>
                  <p className="text-xs text-indigo-600 mt-1">
                    You may want to view the existing analysis instead.
                  </p>
                </div>
                {onFixIssue && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onFixIssue('existing', { analysisId: existingAnalysis })}
                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 ml-2"
                  >
                    View Analysis
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fingerprint Analysis Details */}
        {showFingerprintDetails && files.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                File Analysis Details ({files.length})
              </span>
            </div>
            <div className="space-y-2">
              {files.map((file, index) => {
                const indicator = getFileIndicator(file);
                const key = `${file.name}-${file.size}-${file.lastModified}`;
                const comparison = fileComparisons[key];

                return (
                  <div
                    key={index}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-900">
                            {file.name}
                          </span>
                          <Badge variant={indicator.variant} className="text-xs">
                            <span className="mr-1">{indicator.icon}</span>
                            {indicator.text}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">
                          {indicator.description}
                        </p>
                        {comparison?.previousFingerprint && (
                          <p className="text-xs text-slate-500 mt-1">
                            Last seen: {new Date(comparison.previousFingerprint.processedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Success State */}
        {isValid && combinedWarnings.length === 0 && !isUpdated && !hasFingerprintIssues && (
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              All files passed validation and fingerprint analysis successfully
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default FileValidationPanel;