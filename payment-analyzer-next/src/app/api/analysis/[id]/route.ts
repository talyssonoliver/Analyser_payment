import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analysisService } from "@/lib/services/analysis-service";
import { withAuth, type AuthContext, type RouteContext } from "@/lib/middleware/auth";

// Schema for PATCH requests
const UpdateAnalysisStatusSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "error"]),
});

/**
 * GET /api/analysis/[id] - Get analysis by ID
 */
export const GET = withAuth(async (_request: NextRequest, context: RouteContext, auth: AuthContext) => {
  try {
    const params = context.params as Promise<{ id: string }>;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Analysis ID is required" }, { status: 400 });
    }

    // Get analysis from service
    const { analysis, error } = await analysisService.getAnalysisById(id);

    if (error) {
      if (error === "Analysis not found") {
        return NextResponse.json({ error }, { status: 404 });
      }
      return NextResponse.json({ error }, { status: 500 });
    }

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // Verify the analysis belongs to the authenticated user
    if (analysis.userId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error(`GET /api/analysis/[id] error:`, error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/analysis/[id] - Delete analysis by ID
 */
export const DELETE = withAuth(async (_request: NextRequest, context: RouteContext, auth: AuthContext) => {
  try {
    const params = context.params as Promise<{ id: string }>;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Analysis ID is required" }, { status: 400 });
    }

    // First, verify the analysis exists and belongs to the user
    const { analysis, error: fetchError } = await analysisService.getAnalysisById(id);

    if (fetchError || !analysis) {
      return NextResponse.json(
        {
          error: fetchError || "Analysis not found",
        },
        { status: 404 }
      );
    }

    if (analysis.userId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete analysis
    const { error: deleteError } = await analysisService.deleteAnalysis(id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Analysis deleted successfully",
    });
  } catch (error) {
    console.error(`DELETE /api/analysis/[id] error:`, error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/analysis/[id] - Update analysis status
 */
export const PATCH = withAuth(async (request: NextRequest, context: RouteContext, auth: AuthContext) => {
  try {
    const params = context.params as Promise<{ id: string }>;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Analysis ID is required" }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateAnalysisStatusSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { status } = validationResult.data;

    // First, verify the analysis exists and belongs to the user
    const { analysis, error: fetchError } = await analysisService.getAnalysisById(id);

    if (fetchError || !analysis) {
      return NextResponse.json(
        {
          error: fetchError || "Analysis not found",
        },
        { status: 404 }
      );
    }

    if (analysis.userId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update analysis status
    const updateResult = await analysisService.updateAnalysisStatus(id, status);

    if (!updateResult.success) {
      return NextResponse.json(
        {
          error: updateResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Analysis status updated to ${status}`,
      data: updateResult.analysis,
    });
  } catch (error) {
    console.error(`PATCH /api/analysis/[id] error:`, error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
});
