'use client';

import { useState, useEffect } from 'react';
import { FileFingerprintService, FileComparison, FingerprintValidation } from '@/lib/services/file-fingerprint-service';
import { Badge } from '@/components/ui/badge';

// Use service types for consistency
type FileValidationResult = FingerprintValidation;
type FileDuplicate = FingerprintValidation['duplicates'][0];

interface FileUpdateIndicatorProps {
  file: File;
  className?: string;
  showDetails?: boolean;
}

export function FileUpdateIndicator({ 
  file, 
  className = '', 
  showDetails = false 
}: FileUpdateIndicatorProps) {
  const [comparison, setComparison] = useState<FileComparison | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFile = async () => {
      try {
        setLoading(true);
        const result = await FileFingerprintService.compareWithExisting(file);
        setComparison(result);
      } catch (error) {
        console.error('File comparison failed:', error);
        setComparison(null);
      } finally {
        setLoading(false);
      }
    };

    checkFile();
  }, [file]);

  if (loading) {
    return (
      <div className={`file-update-indicator ${className}`}>
        <Badge variant="secondary" className="animate-pulse" style={{ isolation: 'isolate', contain: 'layout style' }}>
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-spin mr-1"></span>
          Checking...
        </Badge>
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  const getIndicator = () => {
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
  };

  const indicator = getIndicator();

  return (
    <div className={`file-update-indicator ${className}`}>
      <div className="flex items-center gap-2">
        <Badge variant={indicator.variant} className="text-xs">
          <span className="mr-1">{indicator.icon}</span>
          {indicator.text}
        </Badge>
        
        {showDetails && comparison.previousFingerprint && (
          <span className="text-xs text-slate-500">
            Last seen: {new Date(comparison.previousFingerprint.processedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      
      {showDetails && (
        <div className="mt-1">
          <p className="text-xs text-slate-600">{indicator.description}</p>
          
          {comparison.isDuplicate && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
              <p className="font-medium text-orange-800">⚠️ Duplicate File Detected</p>
              <p className="text-orange-600 mt-1">
                This file was processed on{' '}
                {new Date(comparison.previousFingerprint!.processedAt).toLocaleDateString()}.
                Re-analyzing may produce duplicate results.
              </p>
            </div>
          )}
          
          {comparison.hasChanged && comparison.changeType && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <p className="font-medium text-blue-800">📝 File Modified</p>
              <p className="text-blue-600 mt-1">
                Change detected: {comparison.changeType}
                {comparison.previousFingerprint && (
                  <span className="block mt-1">
                    Previous version from{' '}
                    {new Date(comparison.previousFingerprint.processedAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Bulk file validation component
interface FileSetValidationProps {
  files: File[];
  onValidationComplete?: (validation: FileValidationResult) => void;
  className?: string;
}

export function FileSetValidation({ 
  files, 
  onValidationComplete, 
  className = '' 
}: FileSetValidationProps) {
  const [validation, setValidation] = useState<FileValidationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateFiles = async () => {
      try {
        setLoading(true);
        const result = await FileFingerprintService.validateFileSet(files);
        setValidation(result);
        onValidationComplete?.(result);
      } catch (error) {
        console.error('File validation failed:', error);
      } finally {
        setLoading(false);
      }
    };

    if (files.length > 0) {
      validateFiles();
    }
  }, [files, onValidationComplete]);

  if (loading) {
    return (
      <div className={`file-set-validation ${className}`}>
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm text-slate-600">Validating files...</span>
        </div>
      </div>
    );
  }

  if (!validation || files.length === 0) {
    return null;
  }

  return (
    <div className={`file-set-validation ${className}`}>
      {/* Validation Status */}
      <div className={`p-3 rounded-lg border ${
        validation.isValid 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {validation.isValid ? '✅' : '❌'}
          </span>
          <span className={`font-medium ${
            validation.isValid ? 'text-green-800' : 'text-red-800'
          }`}>
            {validation.isValid ? 'Files Ready for Analysis' : 'File Validation Issues'}
          </span>
        </div>
        
        <div className="mt-2 text-sm">
          <p className={validation.isValid ? 'text-green-700' : 'text-red-700'}>
            {files.length} file(s) processed
            {validation.duplicates.length > 0 && (
              <span className="ml-2">• {validation.duplicates.length} duplicate(s) detected</span>
            )}
          </p>
        </div>
      </div>

      {/* Errors */}
      {validation.errors.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="font-medium text-red-800 mb-2">❌ Errors:</div>
          <ul className="text-sm text-red-700 space-y-1">
            {validation.errors.map((error: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="font-medium text-orange-800 mb-2">⚠️ Warnings:</div>
          <ul className="text-sm text-orange-700 space-y-1">
            {validation.warnings.map((warning: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Duplicates Details */}
      {validation.duplicates.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="font-medium text-slate-800">🔍 File Analysis:</div>
          {validation.duplicates.map((dup: FileDuplicate, index: number) => (
            <div key={index} className="p-2 bg-slate-50 border border-slate-200 rounded text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {dup.type === 'identical' ? '🔄' : dup.type === 'updated' ? '📝' : '🔍'}
                </span>
                <span className="font-medium">{dup.current.name}</span>
                <Badge variant={dup.type === 'identical' ? 'error' : 'warning'}>
                  {dup.type}
                </Badge>
              </div>
              
              {dup.existing && (
                <p className="text-xs text-slate-600 mt-1">
                  Previously processed: {new Date(dup.existing.processedAt).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}