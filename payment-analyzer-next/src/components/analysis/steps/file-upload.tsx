/**
 * File Upload Component
 * Drag-and-drop file upload matching the original app functionality
 */

'use client';

import { useEffect, ComponentType, useState } from 'react';
import {
  loadFramerMotion,
  StaticDiv,
  StaticPresence,
  type MotionDivProps,
  type AnimatePresenceProps
} from '@/lib/optimization/dynamic-motion';
import {
  File,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn, formatFileSize } from '@/lib/utils';
import { useFileUpload, type UploadedFile } from '@/hooks/use-file-upload';

export interface FileUploadProps {
  readonly onFilesSelected?: (files: File[]) => void;
  readonly onFilesAdded?: (files: File[]) => void;
  readonly onFileRemoved?: (fileId: string) => void;
  readonly onClearAll?: () => void;
  readonly uploadedFiles?: UploadedFile[];
  readonly maxFiles?: number;
  readonly maxFileSize?: number;
  readonly maxSizePerFile?: number;
  readonly acceptedTypes?: readonly string[];
  readonly disabled?: boolean;
  readonly isProcessing?: boolean;
  readonly className?: string;
  readonly showProgressSimulation?: boolean;
}

export function FileUpload({
  onFilesSelected,
  onFilesAdded,
  onFileRemoved,
  onClearAll,
  uploadedFiles: externalUploadedFiles,
  maxFiles = 50,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  maxSizePerFile, // Legacy compatibility
  acceptedTypes = ['application/pdf', '.pdf'],
  disabled = false,
  isProcessing = false,
  className,
  showProgressSimulation = false,
}: FileUploadProps) {
  // Use legacy prop if provided
  const effectiveMaxFileSize = maxSizePerFile || maxFileSize;

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

  // Dynamic motion loading
  const [motionComponents, setMotionComponents] = useState<{
    MotionDiv: ComponentType<MotionDivProps>;
    AnimatePresence: ComponentType<AnimatePresenceProps>;
  }>({
    MotionDiv: StaticDiv,
    AnimatePresence: StaticPresence,
  });

  useEffect(() => {
    // Load framer-motion only when component mounts and user might interact
    loadFramerMotion().then(({ motion, AnimatePresence }) => {
      setMotionComponents({
        MotionDiv: motion.div as ComponentType<MotionDivProps>,
        AnimatePresence,
      });
    });
  }, []);

  const getFileIcon = (file: UploadedFile) => {
    switch (file.fileType) {
      case 'runsheet':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'invoice':
        return <FileText className="w-5 h-5 text-green-600" />;
      default:
        return <File className="w-5 h-5 text-slate-600" />;
    }
  };


  const getStatusIcon = (file: UploadedFile) => {
    switch (file.status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusBadge = (file: UploadedFile) => {
    switch (file.status) {
      case 'uploading':
        return <Badge variant="info" size="sm">Uploading</Badge>;
      case 'processing':
        return <Badge variant="info" size="sm">Processing</Badge>;
      case 'success':
        return <Badge variant="success" size="sm">Ready</Badge>;
      case 'error':
        return <Badge variant="error" size="sm">Error</Badge>;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <Card
        variant="secondary"
        className={cn(
          'relative transition-all duration-200 cursor-pointer',
          'border-2 border-dashed min-h-[280px]',
          isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-300 hover:border-slate-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={openFileDialog}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragLeave}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        padding="lg"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.map(type => type.startsWith('.') ? type : '.pdf').join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isProcessing}
          aria-label="Select PDF files for analysis"
          title="Choose PDF files to upload"
        />

        <div className="flex flex-col items-center justify-center text-center">
          {/* Upload Icon */}
          <motionComponents.MotionDiv
            animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="mb-6"
          >
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-1">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
          </motionComponents.MotionDiv>

          {/* Main Title */}
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {isDragOver ? 'Drop files here' : 'Drag & Drop Files Here'}
          </h3>

          {/* Subtitle with browse link */}
          <p className="text-sm text-slate-600 mb-6">
            or <button 
              onClick={openFileDialog}
              className="text-blue-600 hover:text-blue-700 underline font-medium"
              type="button"
            >
              browse files
            </button> from your device
          </p>

          {/* Requirements */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <span>PDF files only</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              </svg>
              <span>Runsheets & Invoices</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <span className="text-lg">⚡</span>
              <span>Max {formatFileSize(effectiveMaxFileSize)} per file</span>
            </div>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <Badge variant="info">
                {uploadedFiles.length} / {maxFiles} files
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card padding="none">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="font-semibold text-slate-900">
              Uploaded Files ({uploadedFiles.length})
            </h4>
            {onClearAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={disabled || isProcessing}
              >
                Clear All
              </Button>
            )}
          </div>

          <div className="divide-y divide-slate-200">
            <motionComponents.AnimatePresence>
              {uploadedFiles.map((file) => (
                <motionComponents.MotionDiv
                  key={file.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 flex items-center space-x-3"
                >
                  {/* File icon */}
                  {getFileIcon(file)}

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {file.file.name}
                      </p>
                      {getStatusBadge(file)}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span>{formatFileSize(file.file.size)}</span>
                      {file.fileType && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{file.fileType}</span>
                        </>
                      )}
                    </div>

                    {/* Progress bar for uploading files */}
                    {(file.status === 'uploading' || file.status === 'processing') && (
                      <div className="mt-2">
                        <Progress 
                          value={file.progress} 
                          size="sm"
                          animated 
                        />
                      </div>
                    )}

                    {/* Error message */}
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {file.error}
                      </p>
                    )}
                  </div>

                  {/* Status icon and remove button */}
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(file)}
                    
                    {onFileRemoved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        disabled={disabled || isProcessing}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </motionComponents.MotionDiv>
              ))}
            </motionComponents.AnimatePresence>
          </div>
        </Card>
      )}


    </div>
  );
}