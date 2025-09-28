/**
 * FingerprintDisplay Component
 * Shows detailed fingerprint analysis for individual files
 * Extracted from file-validation-panel.tsx (lines 419-465)
 */

'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFingerprintValidation } from '@/hooks/use-fingerprint-validation';
import {
  FingerprintDisplayProps,
  getFileKey
} from './types';

/**
 * FingerprintDisplay component for showing file fingerprint analysis
 * Displays individual file status, indicators, and processing history
 */
export function FingerprintDisplay({
  files,
  fileComparisons,
  getFileIndicator,
  showDetails = false,
  fingerprintLoading = false,
  className = ''
}: FingerprintDisplayProps) {
  // Don't render if no files or not showing details
  if (!showDetails || files.length === 0) {
    return null;
  }

  // Don't render during loading
  if (fingerprintLoading) {
    return null;
  }

  return (
    <div className={`fingerprint-display ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-4 h-4 text-blue-600" />
        <span className="font-medium text-blue-900">
          File Analysis Details ({files.length})
        </span>
      </div>

      {/* Individual File Cards */}
      <div className="space-y-2">
        {files.map((file, index) => {
          const indicator = getFileIndicator(file);
          const key = getFileKey(file);
          const comparison = fileComparisons[key];

          return (
            <div
              key={index}
              className="fingerprint-card bg-slate-50 border border-slate-200 rounded-lg p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* File Name and Status Badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-900">
                      {file.name}
                    </span>
                    <Badge variant={indicator.variant} className="status-badge text-xs">
                      <span className="mr-1 file-indicator">{indicator.icon}</span>
                      {indicator.text}
                    </Badge>
                  </div>

                  {/* File Description */}
                  <p className="text-xs text-slate-600">
                    {indicator.description}
                  </p>

                  {/* File Size and Modified Date */}
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-slate-500">
                      Size: {formatFileSize(file.size)}
                    </span>
                    <span className="text-xs text-slate-500">
                      Modified: {new Date(file.lastModified).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Previous Processing Information */}
                  {comparison?.previousFingerprint && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-500">
                        <span className="font-medium">Last seen:</span>{' '}
                        {new Date(comparison.previousFingerprint.processedAt).toLocaleDateString()}
                      </p>

                      {comparison.previousFingerprint.analysisId && (
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="font-medium">Analysis ID:</span>{' '}
                          {comparison.previousFingerprint.analysisId.slice(0, 8)}...
                        </p>
                      )}

                      {comparison.hasChanged && comparison.changeType && (
                        <p className="text-xs text-amber-600 mt-1">
                          <span className="font-medium">Change detected:</span>{' '}
                          {comparison.changeType}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Duplicate Information */}
                  {comparison?.isDuplicate && comparison.previousFingerprint && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs text-orange-600">
                        <span className="font-medium">Duplicate detected:</span>{' '}
                        Previously processed on{' '}
                        {new Date(comparison.previousFingerprint.processedAt).toLocaleDateString()}
                      </p>

                      {comparison.previousFingerprint.analysisId && (
                        <p className="text-xs text-orange-500 mt-1">
                          <span className="font-medium">Original analysis:</span>{' '}
                          {comparison.previousFingerprint.analysisId.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Processing Statistics */}
                  {comparison?.previousFingerprint && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div>
                          <span className="font-medium">MD5:</span>{' '}
                          {comparison.previousFingerprint.md5Hash.slice(0, 8)}...
                        </div>
                        <div>
                          <span className="font-medium">SHA256:</span>{' '}
                          {comparison.previousFingerprint.sha256Hash.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Information */}
      {files.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {files.length} file{files.length !== 1 ? 's' : ''} analyzed
            </span>
            <div className="flex items-center gap-3">
              {getFileSummary(files, fileComparisons, getFileIndicator).map(({ label, count, color }) => (
                <span key={label} className={`text-${color}-600`}>
                  {count} {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper function to get file summary statistics
 */
function getFileSummary(
  files: File[],
  fileComparisons: Record<string, any>,
  getFileIndicator: (file: File) => any
): Array<{ label: string; count: number; color: string }> {
  const summary = {
    new: 0,
    unchanged: 0,
    modified: 0,
    duplicate: 0,
    checking: 0
  };

  files.forEach(file => {
    const indicator = getFileIndicator(file);
    switch (indicator.text) {
      case 'New':
        summary.new++;
        break;
      case 'Unchanged':
        summary.unchanged++;
        break;
      case 'Modified':
        summary.modified++;
        break;
      case 'Duplicate':
        summary.duplicate++;
        break;
      case 'Checking...':
        summary.checking++;
        break;
    }
  });

  return [
    { label: 'new', count: summary.new, color: 'blue' },
    { label: 'unchanged', count: summary.unchanged, color: 'green' },
    { label: 'modified', count: summary.modified, color: 'amber' },
    { label: 'duplicate', count: summary.duplicate, color: 'red' },
    { label: 'checking', count: summary.checking, color: 'gray' }
  ].filter(item => item.count > 0);
}

export default FingerprintDisplay;