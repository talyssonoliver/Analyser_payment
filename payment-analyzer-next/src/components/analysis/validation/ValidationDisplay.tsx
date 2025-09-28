/**
 * ValidationDisplay Component
 * Displays validation errors, warnings, and status information
 * Extracted from file-validation-panel.tsx (lines 223-417)
 */

'use client';

import React from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useFileValidation } from '@/hooks/use-file-validation';
import { useFingerprintValidation } from '@/hooks/use-fingerprint-validation';
import {
  ValidationDisplayProps,
  IssueType,
  combineValidationResults,
  formatFileSize
} from './types';

/**
 * ValidationDisplay component for showing validation results
 * Handles errors, warnings, duplicates, updates, and existing analyses
 */
export function ValidationDisplay({
  validationResult,
  fingerprintValidation,
  onRetryValidation,
  onFixIssue,
  className = ''
}: ValidationDisplayProps) {
  // Combine validation results for unified display
  const combined = combineValidationResults(validationResult, fingerprintValidation);
  const { errors, warnings, duplicates, status, hasFingerprintIssues } = combined;

  const getStatusIcon = () => {
    if (!status.isValid) return <XCircle className="w-5 h-5 text-red-600" />;
    if (warnings.length > 0 || validationResult?.isUpdated || hasFingerprintIssues) {
      return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  const statusColor = status.color;

  return (
    <div className={`validation-panel ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <div>
            <h3 className={`font-semibold text-${statusColor}-900`}>
              {status.text}
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

      {/* Errors Section */}
      {errors.length > 0 && (
        <div className="error-list mb-4">
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

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div className="warning-list mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-amber-900">
              Warnings ({warnings.length})
            </span>
          </div>
          <div className="space-y-2">
            {warnings.map((warning, index) => (
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

      {/* File Updates Section */}
      {validationResult?.isUpdated && (
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
                  onClick={() => onFixIssue('update', { isUpdated: true })}
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

      {/* Duplicate Files Section */}
      {duplicates && duplicates.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FileError className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-orange-900">
              Duplicate Files ({duplicates.length})
            </span>
          </div>
          <div className="space-y-2">
            {duplicates.map((file, index) => {
              // Find corresponding fingerprint duplicate info
              const fingerprintDup = fingerprintValidation?.duplicates?.find(d => d.current.name === file.name);
              return (
                <div
                  key={index}
                  className="duplicate-badge bg-orange-100 border border-orange-200 rounded-lg p-3"
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

      {/* Existing Analysis Section */}
      {validationResult?.existingAnalysis && (
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
                  Similar files were found in analysis: {validationResult.existingAnalysis}
                </span>
                <p className="text-xs text-indigo-600 mt-1">
                  You may want to view the existing analysis instead.
                </p>
              </div>
              {onFixIssue && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFixIssue('existing', { analysisId: validationResult.existingAnalysis })}
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 ml-2"
                >
                  View Analysis
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {status.isValid && warnings.length === 0 && !validationResult?.isUpdated && !hasFingerprintIssues && (
        <div className="flex items-center gap-2 text-green-800">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">
            All files passed validation and fingerprint analysis successfully
          </span>
        </div>
      )}
    </div>
  );
}

export default ValidationDisplay;