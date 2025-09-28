/**
 * useFileUpload Hook
 * Reusable file upload logic with drag-and-drop, validation, and processing
 * Extracted from FileUpload component for reusability across the application
 */

'use client';

import { useCallback, useState, useRef, useMemo } from 'react';

export interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error' | 'processing';
  progress: number;
  error?: string;
  fileType?: 'runsheet' | 'invoice' | 'unknown';
}

export interface UseFileUploadConfig {
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: readonly string[];
  showProgressSimulation?: boolean;
  onFilesSelected?: (files: File[]) => void;
  onFilesAdded?: (files: File[]) => void;
  onFileRemoved?: (fileId: string) => void;
  onClearAll?: () => void;
  uploadedFiles?: UploadedFile[];
}

/**
 * Hook for managing file upload functionality
 * @param config Configuration options for file upload behavior
 * @returns File upload state and handlers
 */
export function useFileUpload(config: UseFileUploadConfig) {
  const {
    maxFiles = 50,
    maxFileSize = 50 * 1024 * 1024, // 50MB
    acceptedTypes = ['application/pdf', '.pdf'],
    showProgressSimulation = false,
    onFilesSelected,
    onFilesAdded,
    onFileRemoved,
    onClearAll,
    uploadedFiles: externalUploadedFiles,
  } = config;

  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [internalUploadedFiles, setInternalUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use external files if provided, otherwise use internal state
  const uploadedFiles = externalUploadedFiles || internalUploadedFiles;
  const setUploadedFiles = useMemo(
    () => externalUploadedFiles ? () => {} : setInternalUploadedFiles,
    [externalUploadedFiles]
  );

  /**
   * Detect file type based on filename patterns
   * @param filename - The name of the file to analyze
   * @returns The detected file type
   */
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

  /**
   * Validate uploaded files against business rules
   * @param files - Files to validate
   * @returns Object containing valid files and error messages
   */
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
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`);
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
  }, [uploadedFiles, maxFiles, maxFileSize, acceptedTypes]);

  /**
   * Simulate file upload progress for UI feedback
   * @param uploadedFile - File to simulate upload for
   */
  const simulateFileUpload = useCallback(async (uploadedFile: UploadedFile) => {
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setUploadedFiles(prev => prev.map(f =>
        f.id === uploadedFile.id ? { ...f, progress } : f
      ));
    }
  }, [setUploadedFiles]);

  /**
   * Simulate file processing for UI feedback
   * @param uploadedFile - File to simulate processing for
   */
  const simulateFileProcessing = useCallback(async (uploadedFile: UploadedFile) => {
    setUploadedFiles(prev => prev.map(f =>
      f.id === uploadedFile.id ? { ...f, status: 'processing', progress: 0 } : f
    ));
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUploadedFiles(prev => prev.map(f =>
      f.id === uploadedFile.id ? { ...f, status: 'success', progress: 100 } : f
    ));
  }, [setUploadedFiles]);

  /**
   * Mark file as having an error
   * @param uploadedFile - File that encountered an error
   */
  const handleFileError = useCallback((uploadedFile: UploadedFile) => {
    setUploadedFiles(prev => prev.map(f =>
      f.id === uploadedFile.id ? { ...f, status: 'error', error: 'Processing failed' } : f
    ));
  }, [setUploadedFiles]);

  /**
   * Mark files as successfully processed
   * @param newFiles - Files to mark as successful
   */
  const markFilesAsSuccess = useCallback((newFiles: UploadedFile[]) => {
    const newFileIds = new Set(newFiles.map(f => f.id));
    setUploadedFiles(prev => prev.map(f =>
      newFileIds.has(f.id) ? { ...f, status: 'success', progress: 100 } : f
    ));
  }, [setUploadedFiles]);

  /**
   * Process and add files to the upload list
   * @param files - Files to process
   */
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
      for (const uploadedFile of newFiles) {
        try {
          await simulateFileUpload(uploadedFile);
          await simulateFileProcessing(uploadedFile);
        } catch {
          handleFileError(uploadedFile);
        }
      }
    } else {
      markFilesAsSuccess(newFiles);
    }

    onFilesSelected?.(files);
    onFilesAdded?.(files);
  }, [detectFileType, setUploadedFiles, showProgressSimulation, simulateFileUpload, simulateFileProcessing, handleFileError, markFilesAsSuccess, onFilesSelected, onFilesAdded]);

  /**
   * Handle drag events for drag-and-drop functionality
   */
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

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newCounter = dragCounter - 1;
    if (newCounter === 0) {
      setIsDragOver(false);
    }
    setDragCounter(newCounter);
  }, [dragCounter]);

  /**
   * Handle dropped files
   * @param e - Drop event
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      // You can replace this with your preferred toast/notification system
      errors.forEach(error => console.error(error));
      return;
    }

    if (valid.length > 0) {
      processFiles(valid);
    }
  }, [validateFiles, processFiles]);

  /**
   * Handle file input change events
   * @param e - Change event from file input
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const { valid, errors } = validateFiles(files);

      if (errors.length > 0) {
        errors.forEach(error => console.error(error));
        return;
      }

      if (valid.length > 0) {
        processFiles(valid);
      }
    }
    // Reset input
    e.target.value = '';
  }, [validateFiles, processFiles]);

  /**
   * Remove a specific file from the upload list
   * @param fileId - ID of the file to remove
   */
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    onFileRemoved?.(fileId);
  }, [setUploadedFiles, onFileRemoved]);

  /**
   * Clear all uploaded files
   */
  const clearAll = useCallback(() => {
    setUploadedFiles([]);
    onClearAll?.();
  }, [setUploadedFiles, onClearAll]);

  /**
   * Open the file dialog
   */
  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    // State
    uploadedFiles,
    isDragOver,
    fileInputRef,

    // Handlers
    handleDrop,
    handleDrag,
    handleDragIn,
    handleDragLeave,
    handleFileInputChange,
    removeFile,
    clearAll,
    openFileDialog,

    // Utilities
    validateFiles,
    detectFileType,
  };
}