/**
 * File Validation Panel Component
 * Displays comprehensive file validation results with actionable feedback
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
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ValidationResult } from '@/lib/domain/services/file-validation-service';

export interface FileValidationPanelProps {
  validationResult: ValidationResult | null;
  isValidating?: boolean;
  onRetryValidation?: () => void;
  onFixIssue?: (issueType: string, data?: unknown) => void;
  className?: string;
}

export function FileValidationPanel({
  validationResult,
  isValidating = false,
  onRetryValidation,
  onFixIssue,
  className = ''
}: FileValidationPanelProps) {
  if (isValidating) {
    return (
      <Card className={`border-blue-200 bg-blue-50 ${className}`}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            <div>
              <h3 className="font-semibold text-blue-900">
                Validating Files...
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Checking file integrity, updates, and duplicates
              </p>
            </div>
          </div>
          <Progress value={75} className="mt-3 h-2" />
        </div>
      </Card>
    );
  }

  if (!validationResult) return null;

  const { isValid, errors, warnings, isUpdated, duplicateFiles, existingAnalysis } = validationResult;

  const getStatusIcon = () => {
    if (!isValid) return <XCircle className="w-5 h-5 text-red-600" />;
    if (warnings.length > 0 || isUpdated) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  const getStatusText = () => {
    if (!isValid) return 'Validation Failed';
    if (warnings.length > 0 || isUpdated) return 'Validation Passed with Warnings';
    return 'Validation Passed';
  };

  const getStatusColor = () => {
    if (!isValid) return 'red';
    if (warnings.length > 0 || isUpdated) return 'amber';
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
        {warnings.length > 0 && (
          <div className="mb-4">
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

        {/* Duplicate Files */}
        {duplicateFiles && duplicateFiles.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileError className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-orange-900">
                Duplicate Files ({duplicateFiles.length})
              </span>
            </div>
            <div className="space-y-2">
              {duplicateFiles.map((file, index) => (
                <div
                  key={index}
                  className="bg-orange-100 border border-orange-200 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm text-orange-800 font-medium">
                        {file.name}
                      </span>
                      <p className="text-xs text-orange-600 mt-1">
                        {formatFileSize(file.size)} • Modified {new Date(file.lastModified).toLocaleDateString()}
                      </p>
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
              ))}
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

        {/* Success State */}
        {isValid && warnings.length === 0 && !isUpdated && (
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              All files passed validation successfully
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