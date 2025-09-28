/**
 * FileUploadArea - Drag & drop zone UI component
 * Matches legacy CSS classes: upload-area, enhanced-upload-v2, upload-content, upload-icon-large, upload-title, upload-subtitle
 */

'use client';

import { useEffect, ComponentType, useState } from 'react';
import {
  loadFramerMotion,
  StaticDiv,
  type MotionDivProps,
} from '@/lib/optimization/dynamic-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatFileSize } from '@/lib/utils';
import { FileUploadAreaProps } from './types';

export function FileUploadArea({
  isDragOver,
  disabled,
  maxFiles,
  maxFileSize,
  acceptedTypes,
  uploadedFilesCount,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onClick,
  fileInputRef,
  onFileInputChange,
  isProcessing,
}: FileUploadAreaProps) {
  // Dynamic motion loading
  const [MotionDiv, setMotionDiv] = useState<ComponentType<MotionDivProps>>(StaticDiv);

  useEffect(() => {
    // Load framer-motion only when component mounts and user might interact
    loadFramerMotion().then(({ motion }) => {
      setMotionDiv(motion.div as ComponentType<MotionDivProps>);
    });
  }, []);

  return (
    <Card
      variant="secondary"
      className={cn(
        // Legacy CSS class compatibility
        'upload-area enhanced-upload-v2',
        'relative transition-all duration-200 cursor-pointer',
        'border-2 border-dashed min-h-[280px]',
        isDragOver
          ? 'border-blue-500 bg-blue-50 dragging'
          : 'border-slate-300 hover:border-slate-400',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={onClick}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      padding="lg"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.map(type => type.startsWith('.') ? type : '.pdf').join(',')}
        onChange={onFileInputChange}
        className="hidden"
        disabled={disabled || isProcessing}
        aria-label="Select PDF files for analysis"
        title="Choose PDF files to upload"
      />

      {/* Background pattern for legacy compatibility */}
      <div className="upload-background-pattern" />

      {/* Upload content container */}
      <div className="upload-content flex flex-col items-center justify-center text-center">
        {/* Upload Icon - Legacy: upload-icon-large */}
        <MotionDiv
          animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="mb-6"
        >
          <div className="upload-icon-large w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-1">
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
        </MotionDiv>

        {/* Upload text content */}
        <div className="upload-text-content">
          {/* Main Title - Legacy: upload-title */}
          <h3 className="upload-title text-xl font-semibold text-slate-900 mb-2">
            {isDragOver ? 'Drop files here' : 'Drag & Drop Files Here'}
          </h3>

          {/* Subtitle with browse link - Legacy: upload-subtitle */}
          <p className="upload-subtitle text-sm text-slate-600 mb-6">
            or <button
              onClick={onClick}
              className="upload-browse text-blue-600 hover:text-blue-700 underline font-medium"
              type="button"
            >
              browse files
            </button> from your device
          </p>

          {/* Requirements section */}
          <div className="upload-requirements space-y-3 text-sm">
            <div className="requirement-item flex items-center justify-center gap-2 text-slate-600">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <span>PDF files only</span>
            </div>

            <div className="requirement-item flex items-center justify-center gap-2 text-slate-600">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              </svg>
              <span>Runsheets & Invoices</span>
            </div>

            <div className="requirement-item flex items-center justify-center gap-2 text-slate-600">
              <span className="requirement-icon text-lg">⚡</span>
              <span>Max {formatFileSize(maxFileSize)} per file</span>
            </div>
          </div>

          {/* File count badge */}
          {uploadedFilesCount > 0 && (
            <div className="mt-6">
              <Badge variant="info">
                {uploadedFilesCount} / {maxFiles} files
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}