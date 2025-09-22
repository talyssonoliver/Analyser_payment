import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { analysisService, type AnalysisFile } from '@/lib/services/analysis-service';
import { z } from 'zod';

// Request schemas for validation
const CreateAnalysisSchema = z.object({
  files: z.array(z.object({
    name: z.string(),
    size: z.number(),
    type: z.string(),
    lastModified: z.number(),
  })).optional(),
  manualEntries: z.array(z.object({
    date: z.string(),
    consignments: z.number().min(0),
    paid: z.number().min(0),
    hasUnloadingBonus: z.boolean().optional(),
    hasAttendanceBonus: z.boolean().optional(),
    hasEarlyBonus: z.boolean().optional(),
    pickups: z.number().min(0).optional(),
  })).optional(),
  paymentRules: z.object({
    weekdayRate: z.number().min(0).optional(),
    saturdayRate: z.number().min(0).optional(),
    unloadingBonus: z.number().min(0).optional(),
    attendanceBonus: z.number().min(0).optional(),
    earlyBonus: z.number().min(0).optional(),
  }).optional(),
  metadata: z.object({
    description: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
});

const GetAnalysesSchema = z.object({
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
});

/**
 * GET /api/analysis - Get user analyses with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    
    const validationResult = GetAnalysesSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters',
        details: validationResult.error.issues 
      }, { status: 400 });
    }

    const { limit = 20, offset = 0, search, status } = validationResult.data;

    // Get analyses from service
    const { data: analyses, error } = await analysisService.getUserAnalyses(user.id, {
      limit,
      offset,
      search,
      status,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: analyses,
      pagination: {
        limit,
        offset,
        total: analyses?.length || 0,
      },
    });

  } catch (error) {
    console.error('GET /api/analysis error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * POST /api/analysis - Create new analysis
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = CreateAnalysisSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    const { files, manualEntries, paymentRules, metadata } = validationResult.data;

    // Validate that either files or manual entries are provided
    if (!files?.length && !manualEntries?.length) {
      return NextResponse.json({
        error: 'Analysis requires either files or manual entries'
      }, { status: 400 });
    }

    // Convert files if provided (this would handle file upload in a real implementation)
    const analysisFiles: AnalysisFile[] = [];
    if (files?.length) {
      // In a real implementation, this would handle multipart/form-data file uploads
      // For now, we'll return an error indicating file upload needs to be handled separately
      return NextResponse.json({
        error: 'File uploads must be handled via /api/analysis/upload endpoint'
      }, { status: 400 });
    }

    // Create analysis using service
    const result = await analysisService.createAnalysis({
      userId: user.id,
      files: analysisFiles,
      manualEntries,
      paymentRules,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        analysisId: result.analysisId,
        analysis: result.analysis,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/analysis error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}