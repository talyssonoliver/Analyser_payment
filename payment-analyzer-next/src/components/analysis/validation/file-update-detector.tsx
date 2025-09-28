/**
 * File Update Detector Component
 * Shows file update notifications and allows users to handle updates
 */

'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface FileUpdateInfo {
  fileName: string;
  lastModified: number;
  currentModified: number;
  analysisId: string;
  analysisName: string;
}

export interface FileUpdateDetectorProps {
  updates: FileUpdateInfo[];
  onUpdateFile?: (fileName: string, analysisId: string) => void;
  onIgnoreUpdates?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function FileUpdateDetector({
  updates,
  onUpdateFile,
  onIgnoreUpdates,
  onDismiss,
  className = ''
}: FileUpdateDetectorProps) {
  if (updates.length === 0) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={`border-amber-200 bg-amber-50 ${className}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-900">
                File Updates Detected
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                {updates.length} file{updates.length > 1 ? 's have' : ' has'} been updated since last analysis
              </p>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-100"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* File List */}
        <div className="space-y-2 mb-4">
          {updates.map((update, index) => (
            <div 
              key={`${update.fileName}-${index}`}
              className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">
                    {update.fileName}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {update.analysisName}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600">
                  <div className="flex items-center gap-4">
                    <span>
                      Previous: {formatDate(update.lastModified)}
                    </span>
                    <span>
                      Current: {formatDate(update.currentModified)}
                    </span>
                  </div>
                </div>
              </div>
              
              {onUpdateFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateFile(update.fileName, update.analysisId)}
                  className="ml-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Update
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-amber-700">
            <Info className="w-3 h-3" />
            <span>Updates may contain new payment data</span>
          </div>
          
          <div className="flex items-center gap-2">
            {onIgnoreUpdates && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onIgnoreUpdates}
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-100"
              >
                Ignore Updates
              </Button>
            )}
            
            {onUpdateFile && (
              <Button
                size="sm"
                onClick={() => {
                  // Update all files
                  updates.forEach(update => {
                    onUpdateFile(update.fileName, update.analysisId);
                  });
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Update All
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default FileUpdateDetector;