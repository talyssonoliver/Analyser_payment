/**
 * Database-First File Upload Hook
 * Handles file upload to database + Supabase Storage
 * Replaces localStorage-based approach
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fileValidationService } from "@/lib/domain/services/file-validation-service";
import { toast } from "@/lib/utils/toast";

export interface UseFileUploadDatabaseOptions {
  inputMethod: "upload" | "manual";
  onError?: (error: string) => void;
}

export function useFileUploadDatabase({ inputMethod, onError }: UseFileUploadDatabaseOptions) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Upload files using database-first approach
   * Creates analysis record, uploads files to storage, saves metadata
   */
  const uploadFiles = async (files: File[], fingerprint?: string) => {
    try {
      setIsUploading(true);
      setUploadProgress(10);

      // 1. Validate files
      console.log("📋 Validating files...");
      const validationResult = await fileValidationService.validateFiles(files);

      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join(", "));
      }

      // Show warnings if any
      if (validationResult.warnings.length > 0) {
        validationResult.warnings.forEach((warning) => {
          console.warn("⚠️", warning);
          toast.warning(warning);
        });
      }

      setUploadProgress(30);

      // 2. Create FormData for API request
      console.log("📤 Preparing upload...");
      const formData = new FormData();
      formData.append("source", "upload");
      formData.append("inputMethod", inputMethod);

      if (fingerprint) {
        formData.append("fingerprint", fingerprint);
      }

      // Add all files
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      setUploadProgress(50);

      // 3. Call API to create analysis and upload files
      console.log("📤 Uploading files to server...");
      const response = await fetch("/api/analysis/create-with-files", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload files");
      }

      const result = await response.json();
      const { analysisId } = result;

      setUploadProgress(100);

      console.log("✅ Upload successful! Analysis ID:", analysisId);

      // 4. Navigate to step 2 with analysis ID in URL
      toast.success(
        `Files uploaded successfully! (${files.length} file${files.length > 1 ? "s" : ""})`
      );

      // Small delay to show success state
      setTimeout(() => {
        router.push(`/analysis?id=${analysisId}&step=2`);
      }, 500);

      return {
        success: true,
        analysisId,
      };
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload files";
      toast.error(errorMessage);

      if (onError) {
        onError(errorMessage);
      }

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    uploadFiles,
    isUploading,
    uploadProgress,
  };
}
