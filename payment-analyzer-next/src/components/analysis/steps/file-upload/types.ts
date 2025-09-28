/**
 * Shared types for file upload components
 */

import { type UploadedFile } from '@/hooks/use-file-upload';

// Re-export UploadedFile for convenience
export type { UploadedFile };

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

export interface FileUploadAreaProps {
  readonly isDragOver: boolean;
  readonly disabled: boolean;
  readonly maxFiles: number;
  readonly maxFileSize: number;
  readonly acceptedTypes: readonly string[];
  readonly uploadedFilesCount: number;
  readonly onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  readonly onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  readonly onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  readonly onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  readonly onClick: () => void;
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly isProcessing: boolean;
}

export interface FileListProps {
  readonly files: UploadedFile[];
  readonly onRemove: (fileId: string) => void;
  readonly onClearAll?: () => void;
  readonly disabled: boolean;
  readonly isProcessing: boolean;
}

// Constants
export const FILE_UPLOAD_CONSTANTS = {
  DEFAULT_MAX_FILES: 50,
  DEFAULT_MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  DEFAULT_ACCEPTED_TYPES: ['application/pdf', '.pdf'] as const,
} as const;