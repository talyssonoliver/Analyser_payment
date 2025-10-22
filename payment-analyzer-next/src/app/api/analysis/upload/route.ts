import { type NextRequest, NextResponse } from "next/server";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { analysisService } from "@/lib/services/analysis-service";
import { QuickDateExtractor } from "@/lib/services/quick-date-extractor";
import { withAuth, type AuthContext, type RouteContext } from "@/lib/middleware/auth";
import { generateUUID } from "@/lib/utils";

// Constants for file validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["application/pdf"];

// Progress tracking (in production, this would use Redis or similar)
interface ProgressData {
  stage: string;
  progress: number;
  message: string;
  uploadId: string;
  result?: {
    analysisId: string;
    analysis: unknown;
  } | null;
  error?: string | null;
}

const progressMap = new Map<string, ProgressData>();

// Type definitions for parsed parameters
interface PaymentRules {
  weekdayRate?: number;
  saturdayRate?: number;
  unloadingBonus?: number;
  attendanceBonus?: number;
  earlyBonus?: number;
}

interface AnalysisMetadata {
  description?: string;
  notes?: string;
}

interface AnalysisFile {
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

/**
 * Validates a single file for size and type
 */
function validateSingleFile(file: File): NextResponse | null {
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Invalid file format" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File ${file.name} is too large. Maximum size is 10MB` },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `File ${file.name} has invalid type. Only PDF files are allowed` },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Validates uploaded files for size and type
 */
function validateFiles(files: File[]): NextResponse | null {
  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  for (const file of files) {
    const error = validateSingleFile(file);
    if (error) return error;
  }

  return null; // No errors
}

/**
 * Parses payment rules and metadata from form data
 */
function parseFormDataParams(
  paymentRulesStr: string | null,
  metadataStr: string | null
): { paymentRules?: Partial<PaymentRules>; metadata?: AnalysisMetadata } | NextResponse {
  try {
    const result: { paymentRules?: Partial<PaymentRules>; metadata?: AnalysisMetadata } = {};

    if (paymentRulesStr) {
      result.paymentRules = JSON.parse(paymentRulesStr) as Partial<PaymentRules>;
    }
    if (metadataStr) {
      result.metadata = JSON.parse(metadataStr) as AnalysisMetadata;
    }

    return result;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in paymentRules or metadata" },
      { status: 400 }
    );
  }
}

/**
 * Maps analysis data to conflict format for overlap response
 */
function mapAnalysisToConflict(analysis: {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  working_days: number;
  total_consignments: number;
  analysis_files?: Array<{ original_name: string }>;
  analysis_totals?: {
    expected_total: number;
    paid_total: number;
    difference_total: number;
  };
}) {
  return {
    analysisId: analysis.id,
    dateRange: {
      start: analysis.period_start,
      end: analysis.period_end,
    },
    status: analysis.status,
    createdAt: analysis.created_at,
    files: analysis.analysis_files?.map((f) => f.original_name) || [],
    totals: analysis.analysis_totals
      ? {
          expectedTotal: analysis.analysis_totals.expected_total,
          paidTotal: analysis.analysis_totals.paid_total,
          differenceTotal: analysis.analysis_totals.difference_total,
          workingDays: analysis.working_days,
          totalConsignments: analysis.total_consignments,
        }
      : null,
  };
}

/**
 * Creates overlap error response
 */
function createOverlapResponse(
  overlappingData: Parameters<typeof mapAnalysisToConflict>[0][],
  dateRange: { start: string; end: string }
): NextResponse {
  return NextResponse.json(
    {
      error: "DATE_RANGE_OVERLAP",
      message: "Files overlap with existing analysis",
      conflicts: overlappingData.map(mapAnalysisToConflict),
      uploadedDateRange: dateRange,
      options: {
        merge: `/api/analysis/${overlappingData[0].id}/merge`,
        createNew: true,
      },
    },
    { status: 409 }
  );
}

/**
 * Checks if overlap result has conflicts
 */
function hasOverlapConflicts(result: { isSuccess: boolean; data?: unknown[] }): boolean {
  return result.isSuccess && result.data && result.data.length > 0;
}

/**
 * Checks for date range overlap with existing analyses
 */
async function checkDateRangeOverlap(files: File[], userId: string): Promise<NextResponse | null> {
  try {
    const dateRange = await QuickDateExtractor.extractDateRange(files);

    if (!dateRange) {
      return null; // No date range extracted, skip overlap check
    }

    const overlappingResult = await analysisRepository.findAnalysesByDateRange(
      userId,
      dateRange.start,
      dateRange.end,
      { status: ["completed", "processing"] }
    );

    if (hasOverlapConflicts(overlappingResult)) {
      return createOverlapResponse(overlappingResult.data, dateRange);
    }

    return null; // No overlap
  } catch (dateError) {
    console.warn("Date extraction failed, proceeding without overlap check:", dateError);
    return null; // Don't fail on date extraction errors
  }
}

/**
 * Creates success progress data
 */
function createSuccessProgress(
  uploadId: string,
  result: { analysisId: string; analysis: unknown }
): ProgressData {
  return {
    stage: "completed",
    progress: 100,
    message: "Analysis completed successfully!",
    uploadId,
    result: { analysisId: result.analysisId, analysis: result.analysis },
    error: null,
  };
}

/**
 * Creates error progress data
 */
function createErrorProgress(uploadId: string, errorMessage?: string): ProgressData {
  return {
    stage: "error",
    progress: 0,
    message: errorMessage || "Analysis failed",
    uploadId,
    result: null,
    error: errorMessage || null,
  };
}

/**
 * Creates a background processing function for analysis
 */
function createBackgroundProcessor(
  userId: string,
  analysisFiles: AnalysisFile[],
  uploadId: string,
  paymentRules?: Partial<PaymentRules>,
  metadata?: AnalysisMetadata
) {
  return async () => {
    try {
      const result = await analysisService.createAnalysis(
        { userId, files: analysisFiles, paymentRules, metadata },
        (progress) => {
          progressMap.set(uploadId, { ...progress, uploadId });
        }
      );

      const progressData = result.success
        ? createSuccessProgress(uploadId, result)
        : createErrorProgress(uploadId, result.error);

      progressMap.set(uploadId, progressData);

      // Clean up progress after 5 minutes
      setTimeout(() => progressMap.delete(uploadId), 5 * 60 * 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      progressMap.set(uploadId, createErrorProgress(uploadId, errorMessage));
    }
  };
}

/**
 * POST /api/analysis/upload - Upload and process PDF files for analysis
 */
export const POST = withAuth(async (request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const paymentRulesStr = formData.get("paymentRules") as string | null;
    const metadataStr = formData.get("metadata") as string | null;

    // Validate files
    const validationError = validateFiles(files);
    if (validationError) return validationError;

    // Parse optional parameters
    const parsedParams = parseFormDataParams(paymentRulesStr, metadataStr);
    if (parsedParams instanceof NextResponse) return parsedParams;

    // Check for date range overlap
    const overlapError = await checkDateRangeOverlap(files, auth.user.id);
    if (overlapError) return overlapError;

    // Convert File objects to AnalysisFile format
    const analysisFiles: AnalysisFile[] = files.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified || Date.now(),
    }));

    // Generate a unique ID for progress tracking
    const uploadId = generateUUID();

    // Set initial progress
    progressMap.set(uploadId, {
      stage: "initializing",
      progress: 0,
      message: "Starting analysis...",
      uploadId,
    });

    // Start processing in background (don't await)
    const processAnalysis = createBackgroundProcessor(
      auth.user.id,
      analysisFiles,
      uploadId,
      parsedParams.paymentRules,
      parsedParams.metadata
    );
    processAnalysis();

    // Return upload ID for progress tracking
    return NextResponse.json(
      {
        success: true,
        uploadId,
        message: "Upload started. Use the uploadId to check progress.",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("POST /api/analysis/upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

/**
 * GET /api/analysis/upload?uploadId=... - Get upload/processing progress
 */
export const GET = withAuth(async (request: NextRequest, _context: RouteContext, _auth: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json(
        {
          error: "uploadId is required",
        },
        { status: 400 }
      );
    }

    const progress = progressMap.get(uploadId);

    if (!progress) {
      return NextResponse.json(
        {
          error: "Upload not found or expired",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error("GET /api/analysis/upload error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/analysis/upload?uploadId=... - Cancel upload/processing
 */
export const DELETE = withAuth(async (request: NextRequest, _context: RouteContext, _auth: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json(
        {
          error: "uploadId is required",
        },
        { status: 400 }
      );
    }

    // Remove from progress tracking (cancellation)
    const wasTracked = progressMap.has(uploadId);
    progressMap.delete(uploadId);

    if (!wasTracked) {
      return NextResponse.json(
        {
          error: "Upload not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Upload cancelled successfully",
    });
  } catch (error) {
    console.error("DELETE /api/analysis/upload error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
});
