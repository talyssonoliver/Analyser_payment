import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  type AnalysisWithDetails,
  analysisRepository,
} from "@/lib/repositories/analysis-repository";
import { analysisService } from "@/lib/services/analysis-service";
import { exportService } from "@/lib/services/export-service";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Schema for export requests
const ExportRequestSchema = z.object({
  format: z.enum(["csv", "json", "pdf"]),
  analysisIds: z.array(z.string()).optional(),
  dateRange: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  includeCharts: z.boolean().optional(),
  filename: z.string().optional(),
});

type ExportFormat = "csv" | "json" | "pdf";

interface ContentTypeInfo {
  contentType: string;
  exportFilename: string;
}

/**
 * Fetch specific analyses by their IDs
 * Returns raw database records (AnalysisWithDetails) not domain entities
 */
async function fetchAnalysesByIds(
  analysisIds: string[],
  userId: string
): Promise<AnalysisWithDetails[]> {
  const analysisPromises = analysisIds.map(async (id) => {
    const result = await analysisRepository.getAnalysisById(id);
    return result.isSuccess ? result.data : null;
  });

  const analysisResults = await Promise.all(analysisPromises);

  return analysisResults.filter(
    (analysis): analysis is AnalysisWithDetails => analysis !== null && analysis.user_id === userId
  );
}

/**
 * Fetch all user analyses with optional date range filter
 */
async function fetchAllUserAnalyses(userId: string, dateRange?: { start: string; end: string }) {
  const options: Record<string, unknown> = {};

  if (dateRange) {
    options.dateRange = dateRange;
  }

  return await analysisService.getUserAnalyses(userId, options);
}

/**
 * Get analyses to export based on request parameters
 */
async function getAnalysesToExport(
  analysisIds: string[] | undefined,
  userId: string,
  dateRange?: { start: string; end: string }
): Promise<{ analyses?: AnalysisWithDetails[]; error?: string; status?: number }> {
  if (analysisIds && analysisIds.length > 0) {
    const analyses = await fetchAnalysesByIds(analysisIds, userId);

    if (analyses.length === 0) {
      return { error: "No valid analyses found", status: 404 };
    }

    return { analyses };
  }

  const { data: userAnalyses, error } = await fetchAllUserAnalyses(userId, dateRange);

  if (error) {
    return { error, status: 500 };
  }

  if (!userAnalyses || userAnalyses.length === 0) {
    return { error: "No analyses found to export", status: 404 };
  }

  return { analyses: userAnalyses };
}

/**
 * Determine content type and filename based on format
 */
function getContentTypeInfo(
  format: ExportFormat,
  customFilename?: string,
  exportFilename?: string
): ContentTypeInfo {
  const formatConfig: Record<ExportFormat, ContentTypeInfo> = {
    csv: {
      contentType: "text/csv",
      exportFilename: customFilename || exportFilename || "analyses.csv",
    },
    json: {
      contentType: "application/json",
      exportFilename: customFilename || exportFilename || "analyses.json",
    },
    pdf: {
      contentType: "application/pdf",
      exportFilename: customFilename || exportFilename || "analyses.pdf",
    },
  };

  return formatConfig[format];
}

/**
 * Create response from export result
 */
function createExportResponse(
  exportResult: { data?: unknown; filename?: string },
  format: ExportFormat,
  customFilename?: string
): NextResponse {
  const { contentType, exportFilename } = getContentTypeInfo(
    format,
    customFilename,
    exportResult.filename
  );

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${exportFilename}"`,
    "Cache-Control": "no-cache, no-store, must-revalidate",
  });

  if (typeof exportResult.data === "string") {
    return new NextResponse(exportResult.data, { headers });
  }

  if (exportResult.data instanceof Blob) {
    return new NextResponse(exportResult.data, { headers });
  }

  return NextResponse.json(
    {
      error: "Invalid export data format",
    },
    { status: 500 }
  );
}

/**
 * POST /api/export - Export analyses data
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ExportRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { format, analysisIds, dateRange, includeCharts, filename } = validationResult.data;

    // Get analyses to export
    const fetchResult = await getAnalysesToExport(analysisIds, user.id, dateRange);

    if (fetchResult.error) {
      return NextResponse.json({ error: fetchResult.error }, { status: fetchResult.status || 500 });
    }

    // Perform the export
    const analyses = fetchResult.analyses ?? [];
    const exportResult = await exportService.exportAnalyses(analyses, {
      format,
      includeCharts,
      dateRange,
    });

    if (!exportResult.success) {
      return NextResponse.json(
        {
          error: exportResult.error,
        },
        { status: 400 }
      );
    }

    // Create and return response
    return createExportResponse(exportResult, format, filename);
  } catch (error) {
    console.error("POST /api/export error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export - Get available export formats and options
 */
export async function GET(/* request: NextRequest */) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's analysis count for export limits
    const { data: analyses } = await analysisService.getUserAnalyses(user.id, { limit: 1 });

    const analysisCount = analyses?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        availableFormats: [
          {
            format: "csv",
            name: "CSV (Spreadsheet)",
            description: "Comma-separated values file for Excel/Google Sheets",
            maxRecords: 10000,
            supportsCharts: false,
          },
          {
            format: "json",
            name: "JSON (Data)",
            description: "Structured data format for developers",
            maxRecords: 5000,
            supportsCharts: false,
          },
          {
            format: "pdf",
            name: "PDF (Report)",
            description: "Formatted report with charts and summaries",
            maxRecords: 100,
            supportsCharts: true,
            status: "coming-soon",
          },
        ],
        userLimits: {
          totalAnalyses: analysisCount,
          maxExportSize: 1000,
          formatsAvailable: ["csv", "json"],
        },
        examples: {
          csv: "/api/export?format=csv&analysisIds=123,456",
          json: "/api/export?format=json&dateRange[start]=2024-01-01&dateRange[end]=2024-12-31",
        },
      },
    });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
