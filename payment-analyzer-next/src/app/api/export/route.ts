import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { exportService } from '@/lib/services/export-service';
import { analysisService } from '@/lib/services/analysis-service';
import type { AnalysisWithDetails } from '@/lib/repositories/analysis-repository';
import { z } from 'zod';

// Schema for export requests
const ExportRequestSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']),
  analysisIds: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  includeCharts: z.boolean().optional(),
  filename: z.string().optional(),
});

/**
 * POST /api/export - Export analyses data
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
    const validationResult = ExportRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    const { format, analysisIds, dateRange, includeCharts, filename } = validationResult.data;

    // Get analyses data
    let analysesToExport;
    
    if (analysisIds && analysisIds.length > 0) {
      // Export specific analyses
      const analysisPromises = analysisIds.map(id => analysisService.getAnalysisById(id));
      const analysisResults = await Promise.all(analysisPromises);
      
      // Filter out failed requests and verify ownership
      const validAnalyses = analysisResults
        .filter(result => result.analysis && result.analysis.userId === user.id)
        .map(result => result.analysis!)
        .filter(analysis => analysis !== null);
        
      analysesToExport = validAnalyses;
        
      if (analysesToExport.length === 0) {
        return NextResponse.json({ 
          error: 'No valid analyses found' 
        }, { status: 404 });
      }
    } else {
      // Export all user analyses (with date range filter if provided)
      const options: Record<string, unknown> = {};
      
      if (dateRange) {
        // This would need to be implemented in the service to filter by date range
        options.dateRange = dateRange;
      }
      
      const { data: userAnalyses, error } = await analysisService.getUserAnalyses(user.id, options);
      
      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }
      
      if (!userAnalyses || userAnalyses.length === 0) {
        return NextResponse.json({ 
          error: 'No analyses found to export' 
        }, { status: 404 });
      }
      
      analysesToExport = userAnalyses;
    }

    // Perform the export
    const exportResult = await exportService.exportAnalyses(analysesToExport as AnalysisWithDetails[], {
      format,
      includeCharts,
      dateRange,
    });

    if (!exportResult.success) {
      return NextResponse.json({ 
        error: exportResult.error 
      }, { status: 400 });
    }

    // Determine content type and filename
    let contentType: string;
    let exportFilename: string;
    
    switch (format) {
      case 'csv':
        contentType = 'text/csv';
        exportFilename = filename || exportResult.filename || 'analyses.csv';
        break;
      case 'json':
        contentType = 'application/json';
        exportFilename = filename || exportResult.filename || 'analyses.json';
        break;
      case 'pdf':
        contentType = 'application/pdf';
        exportFilename = filename || exportResult.filename || 'analyses.pdf';
        break;
    }

    // Return the file data
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${exportFilename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    if (typeof exportResult.data === 'string') {
      return new NextResponse(exportResult.data, { headers });
    } else if (exportResult.data instanceof Blob) {
      return new NextResponse(exportResult.data, { headers });
    } else {
      return NextResponse.json({ 
        error: 'Invalid export data format' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('POST /api/export error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * GET /api/export - Get available export formats and options
 */
export async function GET(/* request: NextRequest */) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's analysis count for export limits
    const { data: analyses } = await analysisService.getUserAnalyses(user.id, { limit: 1 });
    
    const analysisCount = analyses?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        availableFormats: [
          {
            format: 'csv',
            name: 'CSV (Spreadsheet)',
            description: 'Comma-separated values file for Excel/Google Sheets',
            maxRecords: 10000,
            supportsCharts: false,
          },
          {
            format: 'json',
            name: 'JSON (Data)',
            description: 'Structured data format for developers',
            maxRecords: 5000,
            supportsCharts: false,
          },
          {
            format: 'pdf',
            name: 'PDF (Report)',
            description: 'Formatted report with charts and summaries',
            maxRecords: 100,
            supportsCharts: true,
            status: 'coming-soon',
          },
        ],
        userLimits: {
          totalAnalyses: analysisCount,
          maxExportSize: 1000,
          formatsAvailable: ['csv', 'json'],
        },
        examples: {
          csv: '/api/export?format=csv&analysisIds=123,456',
          json: '/api/export?format=json&dateRange[start]=2024-01-01&dateRange[end]=2024-12-31',
        },
      },
    });

  } catch (error) {
    console.error('GET /api/export error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}