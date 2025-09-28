/**
 * File Upload Component - Main orchestrator
 * Refactored from original to use focused sub-components
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useFileUpload, type UploadedFile } from '@/hooks/use-file-upload';
import { FileUploadArea } from './FileUploadArea';
import { FileList } from './FileList';
import { FileUploadMethods } from './FileUploadMethods';
import {
  FileUploadProps,
  FILE_UPLOAD_CONSTANTS,
} from './types';

// Re-export types for external use
export type { UploadedFile, FileUploadProps };

type InputMethod = 'upload' | 'manual';

export function FileUpload({
  onFilesSelected,
  onFilesAdded,
  onFileRemoved,
  onClearAll,
  uploadedFiles: externalUploadedFiles,
  maxFiles = FILE_UPLOAD_CONSTANTS.DEFAULT_MAX_FILES,
  maxFileSize = FILE_UPLOAD_CONSTANTS.DEFAULT_MAX_FILE_SIZE,
  maxSizePerFile, // Legacy compatibility
  acceptedTypes = FILE_UPLOAD_CONSTANTS.DEFAULT_ACCEPTED_TYPES,
  disabled = false,
  isProcessing = false,
  className,
  showProgressSimulation = false,
  hideMethodToggle = false,
}: Readonly<FileUploadProps>) {
  // Use legacy prop if provided
  const effectiveMaxFileSize = maxSizePerFile || maxFileSize;

  // Input method state for toggle functionality - only if toggle is not hidden
  const [inputMethod, setInputMethod] = useState<InputMethod>('upload');

  // File upload hook integration
  const {
    uploadedFiles,
    isDragOver,
    fileInputRef,
    handleDrop,
    handleDrag,
    handleDragIn,
    handleDragLeave,
    handleFileInputChange,
    removeFile,
    clearAll,
    openFileDialog,
  } = useFileUpload({
    maxFiles,
    maxFileSize: effectiveMaxFileSize,
    acceptedTypes,
    showProgressSimulation,
    onFilesSelected,
    onFilesAdded,
    onFileRemoved,
    onClearAll,
    uploadedFiles: externalUploadedFiles,
  });

  const handleMethodChange = (method: InputMethod) => {
    setInputMethod(method);
    console.log('📝 Input method changed to:', method);
  };

  const handleClearAll = () => {
    clearAll();
    if (onClearAll) {
      onClearAll();
    }
  };

  const handleFileRemove = (fileId: string) => {
    removeFile(fileId);
    if (onFileRemoved) {
      onFileRemoved(fileId);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Upload method toggle - only show if not hidden */}
      {!hideMethodToggle && (
        <div className="flex justify-center">
          <FileUploadMethods
            activeMethod={inputMethod}
            onMethodChange={handleMethodChange}
            disabled={disabled || isProcessing}
          />
        </div>
      )}

      {/* Conditional rendering based on input method - or always show upload area if toggle is hidden */}
      {(hideMethodToggle || inputMethod === 'upload') && (
        <div className="upload-section-enhanced space-y-4">
          {/* File upload area */}
          <FileUploadArea
            isDragOver={isDragOver}
            disabled={disabled}
            maxFiles={maxFiles}
            maxFileSize={effectiveMaxFileSize}
            acceptedTypes={acceptedTypes}
            uploadedFilesCount={uploadedFiles.length}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragLeave}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={openFileDialog}
            fileInputRef={fileInputRef}
            onFileInputChange={handleFileInputChange}
            isProcessing={isProcessing}
          />

          {/* File list */}
          <FileList
            files={uploadedFiles}
            onRemove={handleFileRemove}
            onClearAll={uploadedFiles.length > 0 ? handleClearAll : undefined}
            disabled={disabled}
            isProcessing={isProcessing}
          />
        </div>
      )}

      {!hideMethodToggle && inputMethod === 'manual' && (
        <div className="manual-entry-container">
          {/* Manual entry placeholder - would be implemented separately */}
          <div className="text-center py-12 text-slate-500">
            <p>Manual entry functionality would be implemented here</p>
            <p className="text-sm mt-2">This preserves the legacy toggle behavior</p>
          </div>
        </div>
      )}
    </div>
  );
}