import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { analysisService } from '@/lib/services/analysis-service';
import { generateUUID } from '@/lib/utils';

// Constants for file validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

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

/**
 * POST /api/analysis/upload - Upload and process PDF files for analysis
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const paymentRulesStr = formData.get('paymentRules') as string;
    const metadataStr = formData.get('metadata') as string;

    // Validate files
    if (!files || files.length === 0) {
      return NextResponse.json({ 
        error: 'No files provided' 
      }, { status: 400 });
    }

    // Validate each file
    for (const file of files) {
      if (!file || !(file instanceof File)) {
        return NextResponse.json({ 
          error: 'Invalid file format' 
        }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ 
          error: `File ${file.name} is too large. Maximum size is 10MB` 
        }, { status: 400 });
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ 
          error: `File ${file.name} has invalid type. Only PDF files are allowed` 
        }, { status: 400 });
      }
    }

    // Parse optional parameters
    let paymentRules: Partial<{ weekdayRate: number; saturdayRate: number; unloadingBonus: number; attendanceBonus: number; earlyBonus: number; }> | undefined;
    let metadata: { description?: string; notes?: string; } | undefined;

    try {
      if (paymentRulesStr) {
        paymentRules = JSON.parse(paymentRulesStr) as Partial<{ weekdayRate: number; saturdayRate: number; unloadingBonus: number; attendanceBonus: number; earlyBonus: number; }>;
      }
      if (metadataStr) {
        metadata = JSON.parse(metadataStr) as { description?: string; notes?: string; };
      }
    } catch {
      return NextResponse.json({ 
        error: 'Invalid JSON in paymentRules or metadata' 
      }, { status: 400 });
    }

    // Convert File objects to AnalysisFile format
    const analysisFiles = files.map(file => ({
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
      stage: 'initializing',
      progress: 0,
      message: 'Starting analysis...',
      uploadId,
    });

    // Start processing in background (don't await)
    const processAnalysis = async () => {
      try {
        const result = await analysisService.createAnalysis(
          {
            userId: user.id,
            files: analysisFiles,
            paymentRules,
            metadata,
          },
          (progress) => {
            // Update progress in map
            progressMap.set(uploadId, {
              ...progress,
              uploadId,
            });
          }
        );

        // Set final result in progress map
        progressMap.set(uploadId, {
          stage: result.success ? 'completed' : 'error',
          progress: result.success ? 100 : 0,
          message: result.success ? 'Analysis completed successfully!' : (result.error || 'Analysis failed'),
          uploadId,
          result: result.success ? {
            analysisId: result.analysisId,
            analysis: result.analysis,
          } : null,
          error: result.success ? null : result.error,
        });

        // Clean up progress after 5 minutes
        setTimeout(() => {
          progressMap.delete(uploadId);
        }, 5 * 60 * 1000);

      } catch (error) {
        progressMap.set(uploadId, {
          stage: 'error',
          progress: 0,
          message: 'Processing failed',
          uploadId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    // Start processing
    processAnalysis();

    // Return upload ID for progress tracking
    return NextResponse.json({
      success: true,
      uploadId,
      message: 'Upload started. Use the uploadId to check progress.',
    }, { status: 202 }); // 202 Accepted

  } catch (error) {
    console.error('POST /api/analysis/upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * GET /api/analysis/upload?uploadId=... - Get upload/processing progress
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return NextResponse.json({ 
        error: 'uploadId is required' 
      }, { status: 400 });
    }

    const progress = progressMap.get(uploadId);

    if (!progress) {
      return NextResponse.json({ 
        error: 'Upload not found or expired' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: progress,
    });

  } catch (error) {
    console.error('GET /api/analysis/upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/analysis/upload?uploadId=... - Cancel upload/processing
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return NextResponse.json({ 
        error: 'uploadId is required' 
      }, { status: 400 });
    }

    // Remove from progress tracking (cancellation)
    const wasTracked = progressMap.has(uploadId);
    progressMap.delete(uploadId);

    if (!wasTracked) {
      return NextResponse.json({ 
        error: 'Upload not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Upload cancelled successfully',
    });

  } catch (error) {
    console.error('DELETE /api/analysis/upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}