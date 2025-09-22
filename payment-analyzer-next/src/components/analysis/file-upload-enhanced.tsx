'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from '@/lib/utils/toast';

interface FileUploadEnhancedProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // in bytes
  acceptedTypes?: string[];
}

interface UploadedFile {
  file: File;
  id: string;
  status: 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  fileType?: 'runsheet' | 'invoice' | 'unknown';
}

export function FileUploadEnhanced({
  onFilesSelected,
  maxFiles = 50,
  maxSizePerFile = 50 * 1024 * 1024, // 50MB
  acceptedTypes = ['.pdf']
}: FileUploadEnhancedProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect file type based on filename
  const detectFileType = (filename: string): 'runsheet' | 'invoice' | 'unknown' => {
    const lowerName = filename.toLowerCase();
    if (lowerName.includes('runsheet') || lowerName.includes('run_sheet') || lowerName.includes('run-sheet')) {
      return 'runsheet';
    }
    if (lowerName.includes('invoice') || lowerName.includes('bill') || lowerName.includes('dv_')) {
      return 'invoice';
    }
    return 'unknown';
  };

  // Validate files
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
      // Check file type
      if (!acceptedTypes.some(type => file.name.toLowerCase().endsWith(type.replace('.', '')))) {
        errors.push(`${file.name}: Only PDF files are allowed`);
        return;
      }

      // Check file size
      if (file.size > maxSizePerFile) {
        errors.push(`${file.name}: File size exceeds ${Math.round(maxSizePerFile / (1024 * 1024))}MB limit`);
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
  }, [uploadedFiles, maxFiles, maxSizePerFile, acceptedTypes]);

  // Process files (simulate upload and processing)
  const processFiles = useCallback(async (files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'uploading' as const,
      progress: 0,
      fileType: detectFileType(file.name)
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsProcessing(true);

    // Simulate file processing
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

    setIsProcessing(false);
    onFilesSelected(files);
    toast.success(`${files.length} file(s) processed successfully`);
  }, [onFilesSelected]);

  // Handle file selection
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const { valid, errors } = validateFiles(files);
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    if (valid.length === 0) {
      return;
    }

    await processFiles(valid);
  }, [processFiles, validateFiles]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles]);

  // Click handler
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // File input change handler
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFiles]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>;
      case 'error':
        return <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>;
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-300 hover:border-blue-400 bg-white'
        } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="upload-content">
          <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-600">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div className="upload-text-content">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {isDragging ? 'Drop files here' : 'Drag & Drop Files Here'}
            </h3>
            <p className="text-slate-600 mb-6">
              or <span className="text-blue-600 underline cursor-pointer">browse files</span> from your device
            </p>
            <div className="space-y-2 text-sm text-slate-500">
              <div className="flex items-center justify-center gap-2">
                <span className="w-4 h-4">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </span>
                <span>PDF files only</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span>📦</span>
                <span>Runsheets & Invoices</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span>⚡</span>
                <span>Max {Math.round(maxSizePerFile / (1024 * 1024))}MB per file • Max {maxFiles} files</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf"
        className="hidden"
        onChange={handleFileInputChange}
        aria-label="Select PDF files for analysis"
      />

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Uploaded Files</h3>
            <span className="text-sm text-slate-500">{uploadedFiles.length} file(s)</span>
          </div>
          <div className="space-y-3">
            {uploadedFiles.map((uploadedFile) => (
              <div key={uploadedFile.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex-shrink-0">
                  {getFileTypeIcon(uploadedFile.fileType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{uploadedFile.file.name}</p>
                  <p className="text-sm text-slate-500">
                    {uploadedFile.fileType} • {(uploadedFile.file.size / 1024).toFixed(1)} KB
                  </p>
                  {uploadedFile.status === 'error' && uploadedFile.error && (
                    <p className="text-sm text-red-600">{uploadedFile.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(uploadedFile.status)}
                  {uploadedFile.status === 'success' ? (
                    <span className="text-sm font-medium text-green-600">Ready</span>
                  ) : (
                    <span className="text-sm text-slate-600 capitalize">{uploadedFile.status}</span>
                  )}
                  <button
                    onClick={() => removeFile(uploadedFile.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove file"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}