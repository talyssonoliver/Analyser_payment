/**
 * File Upload Component - Legacy compatibility export
 * Now uses focused sub-components for better maintainability
 */

'use client';

// Re-export the new modular FileUpload component and types
export { FileUpload } from './file-upload/index';
export type { FileUploadProps, UploadedFile } from './file-upload/types';