/**
 * File Upload Component
 * Drag-and-drop file upload matching the original app functionality
 */

'use client';

import { useCallback, useState, useRef, useEffect, ComponentType } from 'react';
import { 
  loadFramerMotion, 
  StaticDiv, 
  StaticPresence, 
  type MotionDivProps, 
  type AnimatePresenceProps 
} from '@/lib/optimization/dynamic-motion';
import { 
  Upload, 
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

export interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error' | 'processing';
  progress: number;
  error?: string;
  fileType?: 'runsheet' | 'invoice' | 'unknown';
}

export interface FileUploadProps {
  readonly onFilesSelected?: (files: File[]) => void;
  onFilesAdded?: (files: File[]) => void;
  onFileRemoved?: (fileId: string) => void;
  onClearAll?: () => void;
  uploadedFiles?: UploadedFile[];
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  maxSizePerFile?: number; // in bytes (legacy compatibility)
  acceptedTypes?: readonly string[];
  disabled?: boolean;
  isProcessing?: boolean;
  accept?: string;
  multiple?: boolean;
  className?: string;
  showProgressSimulation?: boolean;
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [, setDragCounter] = useState(0);
  const [internalUploadedFiles, setInternalUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use external uploaded files if provided, otherwise use internal state
  const uploadedFiles = externalUploadedFiles || internalUploadedFiles;
  const setUploadedFiles = externalUploadedFiles ? () => {} : setInternalUploadedFiles;

  // Use legacy prop if provided
  const effectiveMaxFileSize = maxSizePerFile || maxFileSize;

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

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  // Detect file type based on filename (from legacy component)
  const detectFileType = useCallback((filename: string): 'runsheet' | 'invoice' | 'unknown' => {
    const lowerName = filename.toLowerCase();
    if (lowerName.includes('runsheet') || lowerName.includes('run_sheet') || lowerName.includes('run-sheet')) {
      return 'runsheet';
    }
    if (lowerName.includes('invoice') || lowerName.includes('bill') || lowerName.includes('dv_')) {
      return 'invoice';
    }
    return 'unknown';
  }, []);

  // Validate files (enhanced from legacy component)
  const validateFiles = useCallback((files: FileList | File[]): { valid: File[], errors: string[] } => {
    const fileArray = Array.from(files);
    const errors: string[] = [];
    const valid: File[] = [];

    // Check total count
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return { valid, errors };
    }

    fileArray.forEach(file => {
      // Check file type (support both MIME types and extensions)
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.substring(1));
        }
        return file.type === type;
      });

      if (!isValidType) {
        errors.push(`${file.name}: Only PDF files are allowed`);
        return;
      }

      // Check file size
      if (file.size > effectiveMaxFileSize) {
        errors.push(`${file.name}: File size exceeds ${Math.round(effectiveMaxFileSize / (1024 * 1024))}MB limit`);
        return;
      }

      // Check for duplicates
      if (uploadedFiles.some(uploaded => uploaded.file.name === file.name && uploaded.file.size === file.size)) {
        errors.push(`${file.name}: Duplicate file`);
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  }, [uploadedFiles, maxFiles, effectiveMaxFileSize, acceptedTypes]);

  // Process files with optional progress simulation
  const processFiles = useCallback(async (files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      status: 'uploading' as const,
      progress: 0,
      fileType: detectFileType(file.name)
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    if (showProgressSimulation) {
      // Simulate file processing (from legacy component)
      for (const uploadedFile of newFiles) {
        try {
          // Simulate upload progress
          for (let progress = 0; progress <= 100; progress += 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            setUploadedFiles(prev => prev.map(f =>
              f.id === uploadedFile.id
                ? { ...f, progress }
                : f
            ));
          }

          // Switch to processing status
          setUploadedFiles(prev => prev.map(f =>
            f.id === uploadedFile.id
              ? { ...f, status: 'processing', progress: 0 }
              : f
          ));

          // Simulate processing
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Mark as success
          setUploadedFiles(prev => prev.map(f =>
            f.id === uploadedFile.id
              ? { ...f, status: 'success', progress: 100 }
              : f
          ));
        } catch {
          setUploadedFiles(prev => prev.map(f =>
            f.id === uploadedFile.id
              ? { ...f, status: 'error', error: 'Processing failed' }
              : f
          ));
        }
      }
    } else {
      // Mark all as success immediately if no simulation
      setUploadedFiles(prev => prev.map(f =>
        newFiles.some(nf => nf.id === f.id)
          ? { ...f, status: 'success', progress: 100 }
          : f
      ));
    }

    // Call both callbacks for compatibility
    onFilesSelected?.(files);
    onFilesAdded?.(files);
  }, [detectFileType, setUploadedFiles, showProgressSimulation, onFilesSelected, onFilesAdded]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return;

    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      // You can replace this with your preferred toast/notification system
      errors.forEach(error => console.error(error));
      return;
    }

    if (valid.length === 0) {
      return;
    }

    await processFiles(valid);
  }, [disabled, validateFiles, processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [disabled, handleFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
    // Reset input
    e.target.value = '';
  };

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

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

  // Legacy style file type icons for compatibility
  const getFileTypeIcon = (fileType: UploadedFile['fileType']) => {
    switch (fileType) {
      case 'runsheet':
        return <span className="text-blue-600">📦</span>;
      case 'invoice':
        return <span className="text-green-600">💰</span>;
      default:
        return <span className="text-gray-600">📄</span>;
    }
  };

  // Remove file handler
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    onFileRemoved?.(fileId);
  }, [setUploadedFiles, onFileRemoved]);

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
        className={cn(
          'relative transition-all duration-200 cursor-pointer',
          'border-2 border-dashed',
          isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-300 hover:border-slate-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={openFileDialog}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
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
          <motionComponents.MotionDiv
            animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Upload className="w-12 h-12 text-slate-400 mb-4" />
          </motionComponents.MotionDiv>

          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {isDragOver ? 'Drop files here' : 'Upload PDF Files'}
          </h3>

          <p className="text-sm text-slate-600 mb-4">
            Drag and drop your PDF files here, or click to browse
          </p>

          <div className="text-xs text-slate-500 space-y-1">
            <div>Maximum {maxFiles} files</div>
            <div>Up to {formatFileSize(effectiveMaxFileSize)} per file</div>
            <div>PDF files only</div>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-4">
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
                onClick={onClearAll}
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
                        onClick={() => onFileRemoved(file.id)}
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