/**
 * File Storage Service
 * Handles upload/download/delete operations for analysis files in Supabase Storage
 *
 * This service replaces localStorage for file handling, providing:
 * - Reliable file persistence
 * - Multi-device access
 * - Large file support (up to 50MB per file)
 * - Proper file content preservation across sessions
 */

import { createClient } from "@/lib/supabase/client";
import { AppError, ErrorCodes, Result } from "@/lib/utils/errors";
import type { SupabaseClient } from "@/types/core";

interface StorageFileObject {
  name: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata?: Record<string, unknown>;
}

export interface FileUploadResult {
  fileName: string;
  storagePath: string;
  size: number;
  type: string;
  hash: string;
}

export interface FileDownloadResult {
  file: File;
  metadata: {
    fileName: string;
    size: number;
    type: string;
  };
}

export class FileStorageService {
  private readonly supabase: SupabaseClient = createClient();
  private readonly BUCKET_NAME = "analysis-files";
  private readonly MAX_FILE_SIZE = 52428800; // 50MB

  /**
   * Validate upload inputs
   */
  private validateUploadInputs(userId: string, analysisId: string, files: File[]): Result<void> {
    if (!userId?.trim()) {
      return Result.failure(
        new AppError("User ID is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
      );
    }

    if (!analysisId?.trim()) {
      return Result.failure(
        new AppError("Analysis ID is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
      );
    }

    if (!files || files.length === 0) {
      return Result.failure(
        new AppError("At least one file is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
      );
    }

    return Result.success(undefined);
  }

  /**
   * Validate a single file
   */
  private validateFile(file: File): Result<void> {
    if (file.size === 0) {
      return Result.failure(
        new AppError(`File "${file.name}" is empty`, ErrorCodes.VALIDATION_INVALID_FORMAT, 400)
      );
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return Result.failure(
        new AppError(
          `File "${file.name}" exceeds 50MB limit`,
          ErrorCodes.VALIDATION_INVALID_FORMAT,
          400
        )
      );
    }

    return Result.success(undefined);
  }

  /**
   * Upload a single file to storage
   */
  private async uploadSingleFile(
    file: File,
    userId: string,
    analysisId: string
  ): Promise<Result<FileUploadResult>> {
    const storagePath = `${userId}/${analysisId}/${file.name}`;

    console.log(`📤 Uploading file: ${file.name} (${file.size} bytes) to ${storagePath}`);

    // Upload file to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error && !error.message.includes("already exists")) {
      console.error("Upload error:", error);
      return Result.failure(
        new AppError(
          `Failed to upload file "${file.name}": ${error.message}`,
          ErrorCodes.STORAGE_ERROR,
          500,
          false,
          { fileName: file.name, error: error.message }
        )
      );
    }

    if (error?.message.includes("already exists")) {
      console.warn(`File already exists: ${storagePath}, using existing file`);
    }

    // Generate file hash for integrity checking
    const hash = await this.generateFileHash(file);

    console.log(`✅ Uploaded: ${file.name} -> ${storagePath}`);

    return Result.success({
      fileName: file.name,
      storagePath: data?.path || storagePath,
      size: file.size,
      type: file.type,
      hash,
    });
  }

  /**
   * Upload multiple files to Supabase Storage
   * Path format: {userId}/{analysisId}/{fileName}
   */
  async uploadFiles(
    userId: string,
    analysisId: string,
    files: File[]
  ): Promise<Result<FileUploadResult[]>> {
    try {
      const validationResult = this.validateUploadInputs(userId, analysisId, files);
      if (validationResult.isFailure) {
        return Result.failure(validationResult.error);
      }

      console.log(`📤 Uploading ${files.length} file(s) to storage for analysis ${analysisId}`);

      const results: FileUploadResult[] = [];

      for (const file of files) {
        const fileValidation = this.validateFile(file);
        if (fileValidation.isFailure) {
          return Result.failure(fileValidation.error);
        }

        const uploadResult = await this.uploadSingleFile(file, userId, analysisId);
        if (uploadResult.isFailure) {
          return Result.failure(uploadResult.error);
        }

        results.push(uploadResult.data);
      }

      console.log(`✅ Successfully uploaded ${results.length} file(s)`);
      return Result.success(results);
    } catch (error) {
      console.error("File upload error:", error);
      return Result.failure(
        new AppError("Failed to upload files", ErrorCodes.STORAGE_ERROR, 500, false, {
          userId,
          analysisId,
          fileCount: files?.length || 0,
          originalError: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  }

  /**
   * Download a single file from Supabase Storage
   */
  async downloadFile(storagePath: string): Promise<Result<File>> {
    try {
      if (!storagePath?.trim()) {
        return Result.failure(
          new AppError("Storage path is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
        );
      }

      console.log(`📥 Downloading file from: ${storagePath}`);

      // Download file from Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .download(storagePath);

      if (error) {
        console.error("Download error:", error);
        return Result.failure(
          new AppError(
            `Failed to download file: ${error.message}`,
            ErrorCodes.STORAGE_ERROR,
            404,
            false,
            { storagePath, error: error.message }
          )
        );
      }

      if (!data) {
        return Result.failure(
          new AppError("File not found in storage", ErrorCodes.STORAGE_ERROR, 404, false, {
            storagePath,
          })
        );
      }

      // Extract filename from path (format: userId/analysisId/fileName)
      const fileName = storagePath.split("/").pop() || "file.pdf";

      // Create File object from downloaded Blob
      const file = new File([data], fileName, {
        type: "application/pdf",
      });

      console.log(`✅ Downloaded: ${fileName} (${file.size} bytes)`);

      return Result.success(file);
    } catch (error) {
      console.error("File download error:", error);
      return Result.failure(
        new AppError("Failed to download file", ErrorCodes.STORAGE_ERROR, 500, false, {
          storagePath,
          originalError: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  }

  /**
   * Download multiple files for an analysis
   */
  async downloadAnalysisFiles(
    userId: string,
    analysisId: string,
    fileNames: string[]
  ): Promise<Result<File[]>> {
    try {
      if (!userId?.trim() || !analysisId?.trim()) {
        return Result.failure(
          new AppError(
            "User ID and analysis ID are required",
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      if (!fileNames || fileNames.length === 0) {
        return Result.failure(
          new AppError(
            "At least one file name is required",
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      console.log(`📥 Downloading ${fileNames.length} file(s) for analysis ${analysisId}`);

      const files: File[] = [];

      for (const fileName of fileNames) {
        const storagePath = `${userId}/${analysisId}/${fileName}`;
        const result = await this.downloadFile(storagePath);

        if (result.isFailure) {
          return Result.failure(result.error);
        }

        files.push(result.data);
      }

      console.log(`✅ Downloaded ${files.length} file(s)`);
      return Result.success(files);
    } catch (error) {
      console.error("Analysis files download error:", error);
      return Result.failure(
        new AppError("Failed to download analysis files", ErrorCodes.STORAGE_ERROR, 500, false, {
          userId,
          analysisId,
          fileCount: fileNames?.length || 0,
          originalError: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  }

  /**
   * Delete files for an analysis
   */
  async deleteAnalysisFiles(userId: string, analysisId: string): Promise<Result<void>> {
    try {
      if (!userId?.trim() || !analysisId?.trim()) {
        return Result.failure(
          new AppError(
            "User ID and analysis ID are required",
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      console.log(`🗑️ Deleting files for analysis ${analysisId}`);

      // List all files in the analysis folder
      const folderPath = `${userId}/${analysisId}`;
      const { data: files, error: listError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .list(folderPath);

      if (listError) {
        console.error("List files error:", listError);
        return Result.failure(
          new AppError(
            `Failed to list files: ${listError.message}`,
            ErrorCodes.STORAGE_ERROR,
            500,
            false,
            { userId, analysisId, error: listError.message }
          )
        );
      }

      if (!files || files.length === 0) {
        console.log("No files to delete");
        return Result.success(undefined);
      }

      // Delete all files
      const storageFiles = files as unknown as StorageFileObject[];
      const filePaths = storageFiles.map((file) => `${folderPath}/${file.name}`);

      const { error: deleteError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove(filePaths);

      if (deleteError) {
        console.error("Delete files error:", deleteError);
        return Result.failure(
          new AppError(
            `Failed to delete files: ${deleteError.message}`,
            ErrorCodes.STORAGE_ERROR,
            500,
            false,
            { userId, analysisId, error: deleteError.message }
          )
        );
      }

      console.log(`✅ Deleted ${filePaths.length} file(s)`);
      return Result.success(undefined);
    } catch (error) {
      console.error("Delete analysis files error:", error);
      return Result.failure(
        new AppError("Failed to delete analysis files", ErrorCodes.STORAGE_ERROR, 500, false, {
          userId,
          analysisId,
          originalError: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  }

  /**
   * Generate SHA-256 hash of file content for integrity checking
   */
  private async generateFileHash(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (error) {
      console.error("Error generating file hash:", error);
      // Fallback to simple identifier
      return `${file.name}_${file.size}_${file.lastModified}`;
    }
  }

  /**
   * Delete a single file from storage
   */
  async deleteFile(userId: string, analysisId: string, fileName: string): Promise<Result<void>> {
    try {
      if (!userId?.trim() || !analysisId?.trim() || !fileName?.trim()) {
        return Result.failure(
          new AppError(
            "User ID, analysis ID, and file name are required",
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      const storagePath = `${userId}/${analysisId}/${fileName}`;

      console.log(`🗑️ Deleting file: ${storagePath}`);

      const { error } = await this.supabase.storage.from(this.BUCKET_NAME).remove([storagePath]);

      if (error) {
        console.error("Delete file error:", error);
        return Result.failure(
          new AppError(
            `Failed to delete file "${fileName}": ${error.message}`,
            ErrorCodes.STORAGE_ERROR,
            500,
            false,
            { userId, analysisId, fileName, error: error.message }
          )
        );
      }

      console.log(`✅ Deleted file: ${fileName}`);
      return Result.success(undefined);
    } catch (error) {
      console.error("Delete file error:", error);
      return Result.failure(
        new AppError("Failed to delete file", ErrorCodes.STORAGE_ERROR, 500, false, {
          userId,
          analysisId,
          fileName,
          originalError: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  }

  /**
   * Check if files exist in storage
   */
  async checkFilesExist(
    userId: string,
    analysisId: string,
    fileNames: string[]
  ): Promise<Result<Record<string, boolean>>> {
    try {
      if (!userId?.trim() || !analysisId?.trim()) {
        return Result.failure(
          new AppError(
            "User ID and analysis ID are required",
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      const folderPath = `${userId}/${analysisId}`;
      const { data: files, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .list(folderPath);

      if (error) {
        console.error("List files error:", error);
        return Result.failure(
          new AppError(`Failed to list files: ${error.message}`, ErrorCodes.STORAGE_ERROR, 500)
        );
      }

      const storageFiles = (files || []) as unknown as StorageFileObject[];
      const existingFileNames = new Set(storageFiles.map((f) => f.name));
      const result: Record<string, boolean> = {};

      for (const fileName of fileNames) {
        result[fileName] = existingFileNames.has(fileName);
      }

      return Result.success(result);
    } catch (error) {
      console.error("Check files exist error:", error);
      return Result.failure(
        new AppError("Failed to check file existence", ErrorCodes.STORAGE_ERROR, 500, false, {
          userId,
          analysisId,
          originalError: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  }
}

// Export singleton instance
export const fileStorageService = new FileStorageService();
