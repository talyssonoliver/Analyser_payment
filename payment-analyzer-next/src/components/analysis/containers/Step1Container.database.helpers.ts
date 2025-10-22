/**
 * Step1Container Database Helpers
 * Functions to integrate database-first file upload into existing Step1Container
 *
 * Usage: Import these helpers into Step1Container.tsx and replace the existing
 * handleFilesUploaded function with handleFilesUploadedDatabase
 */

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { FileFingerprintService } from "@/lib/domain/services/file-fingerprint-service";
import { fileValidationService } from "@/lib/domain/services/file-validation-service";
import { toast } from "@/lib/utils/toast";

export interface DatabaseUploadOptions {
  router: AppRouterInstance;
  inputMethod: "upload" | "manual";
  onError: (error: string) => void;
}

/**
 * Generate a fingerprint for files to detect duplicates
 */
export async function generateFilesFingerprint(files: File[]): Promise<string> {
  try {
    const fingerprintService = new FileFingerprintService();

    // Convert File[] to FileInfo[] format expected by the service
    const fileInfos = files.map((f) => ({
      name: f.name,
      size: f.size,
      lastModified: f.lastModified,
      type: f.type,
    }));

    const result = await fingerprintService.createFingerprint(fileInfos);

    // Return the primary SHA-256 fingerprint
    return result.fingerprint;
  } catch (error) {
    console.error("Error generating fingerprint:", error);

    // Fallback to simple hash if service fails
    const fileSignature = files
      .map((f) => `${f.name}_${f.size}_${f.lastModified}`)
      .sort()
      .join("|");

    return `fallback_${btoa(fileSignature).substring(0, 32)}`;
  }
}

/**
 * Upload files using database-first approach
 * Replaces the old localStorage-based upload
 */
export async function uploadFilesToDatabase(
  files: File[],
  options: DatabaseUploadOptions
): Promise<{ success: boolean; analysisId?: string; error?: string }> {
  const { router, inputMethod, onError } = options;

  try {
    // 1. Validate files first
    console.log("📋 Validating files...");
    const validationResult = await fileValidationService.validateFiles(files);

    if (!validationResult.isValid) {
      const errorMessage = validationResult.errors.join(", ");
      throw new Error(errorMessage);
    }

    // Show warnings if any (e.g., for restored empty files)
    if (validationResult.warnings.length > 0) {
      validationResult.warnings.forEach((warning) => {
        console.warn("⚠️", warning);
      });
    }

    // 2. Generate fingerprint for duplicate detection
    const fingerprint = await generateFilesFingerprint(files);

    // 3. Create FormData for API request
    console.log("📤 Preparing file upload...");
    const formData = new FormData();
    formData.append("source", "upload");
    formData.append("inputMethod", inputMethod);
    formData.append("fingerprint", fingerprint);

    // Add all files
    files.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });

    // 4. Call API to create analysis and upload files to storage
    console.log(`📤 Uploading ${files.length} file(s) to database...`);
    const response = await fetch("/api/analysis/create-with-files", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload files");
    }

    const result = await response.json();
    const { analysisId, filesUploaded } = result;

    console.log(`✅ Upload successful! Analysis ID: ${analysisId}`);
    toast.success(`${filesUploaded} file${filesUploaded > 1 ? "s" : ""} uploaded successfully!`);

    // 5. Navigate to step 2 with analysis ID in URL (database-first approach)
    router.push(`/analysis?id=${analysisId}&step=2`);

    return {
      success: true,
      analysisId,
    };
  } catch (error) {
    console.error("Database upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload files";

    toast.error(errorMessage);
    onError(errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Modified version of handleFilesUploaded that uses database-first approach
 * while preserving existing file update detection logic
 *
 * Integration Steps:
 * 1. Import this function in Step1Container.tsx
 * 2. Add router: const router = useRouter()
 * 3. Replace existing handleFilesUploaded with this version
 */
interface ExistingAnalysisTotals {
  workingDays: number;
  totalConsignments: number;
  baseTotal: number;
  pickupTotal: number;
  bonusTotal: number;
  expectedTotal: number;
  paidTotal: number;
  differenceTotal: number;
}

export function createDatabaseFileUploadHandler(
  options: DatabaseUploadOptions & {
    onShowFileUpdateDialog: (data: {
      existingAnalysis: {
        id: string;
        dateRange: { start: string; end: string };
        files: string[];
        totals?: ExistingAnalysisTotals;
      };
      newFiles: File[];
      newFileDateRange: { start: string; end: string };
    }) => void;
  }
) {
  return async (files: File[]) => {
    const { router, inputMethod, onError, onShowFileUpdateDialog } = options;

    try {
      // Import required dependencies dynamically
      const { QuickDateExtractor } = await import("@/lib/services/quick-date-extractor");
      const { analysisRepository } = await import("@/lib/repositories/analysis-repository");
      const { createClient } = await import("@/lib/supabase/client");

      // 1. Extract date range from new files (quick, no full processing)
      const newFileDateRange = await QuickDateExtractor.extractDateRange(files);

      // Early exit if we can't extract dates - proceed with upload
      if (!newFileDateRange) {
        console.warn("Could not extract date range from files, proceeding without overlap check");
        await uploadFilesToDatabase(files, { router, inputMethod, onError });
        return;
      }

      // 2. Get authenticated user
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.user?.id) {
        console.warn("No authenticated user, skipping overlap check");
        await uploadFilesToDatabase(files, { router, inputMethod, onError });
        return;
      }

      const userId = session.session.user.id;

      // 3. Check for overlapping analyses in database
      const analysesResult = await analysisRepository.findAnalysesByDateRange(
        userId,
        newFileDateRange.start,
        newFileDateRange.end,
        {
          status: ["completed"],
        }
      );

      if (analysesResult.isFailure || !analysesResult.data || analysesResult.data.length === 0) {
        // No overlapping analyses found - proceed with normal upload
        await uploadFilesToDatabase(files, { router, inputMethod, onError });
        return;
      }

      // 4. Found overlapping analysis - show file update dialog
      const overlappingAnalysis = analysesResult.data[0];

      console.log("📊 Found overlapping analysis:", overlappingAnalysis.id);

      onShowFileUpdateDialog({
        existingAnalysis: {
          id: overlappingAnalysis.id,
          dateRange: {
            start: overlappingAnalysis.period_start,
            end: overlappingAnalysis.period_end,
          },
          files: overlappingAnalysis.analysis_files?.map((f) => f.original_name) || [],
          totals: overlappingAnalysis.analysis_totals
            ? {
                workingDays: overlappingAnalysis.working_days,
                totalConsignments: overlappingAnalysis.total_consignments,
                baseTotal: overlappingAnalysis.analysis_totals.base_total,
                pickupTotal: overlappingAnalysis.analysis_totals.pickup_total,
                bonusTotal: overlappingAnalysis.analysis_totals.bonus_total,
                expectedTotal: overlappingAnalysis.analysis_totals.expected_total,
                paidTotal: overlappingAnalysis.analysis_totals.paid_total,
                differenceTotal: overlappingAnalysis.analysis_totals.difference_total,
              }
            : undefined,
        },
        newFiles: files,
        newFileDateRange,
      });

      // Wait for user choice (merge or create new)
    } catch (error) {
      console.error("Error during file upload processing:", error);
      onError(error instanceof Error ? error.message : "Failed to process files");
    }
  };
}
