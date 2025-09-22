import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
// Types are imported but used only for schema validation - keeping for type safety

// Validation schemas
const DisplayPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  currencyFormat: z.enum(['symbol', 'code', 'name']).optional(),
  numberFormat: z.enum(['standard', 'compact']).optional(),
  compactMode: z.boolean().optional(),
  showAdvancedFeatures: z.boolean().optional(),
}).optional();

const NotificationPreferencesSchema = z.object({
  analysisComplete: z.boolean().optional(),
  errorAlerts: z.boolean().optional(),
  dailyDigest: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
}).optional();

const AnalysisPreferencesSchema = z.object({
  autoSave: z.boolean().optional(),
  autoExport: z.boolean().optional(),
  defaultExportFormat: z.enum(['pdf', 'excel', 'csv']).optional(),
  includeCharts: z.boolean().optional(),
  includeSummary: z.boolean().optional(),
  maxHistoryDays: z.number().min(1).max(365).optional(),
}).optional();

const PrivacyPreferencesSchema = z.object({
  analyticsEnabled: z.boolean().optional(),
  errorReportingEnabled: z.boolean().optional(),
  dataRetentionDays: z.number().min(1).max(1095).optional(),
}).optional();

const UpdatePreferencesSchema = z.object({
  display: DisplayPreferencesSchema,
  notifications: NotificationPreferencesSchema,
  analysis: AnalysisPreferencesSchema,
  privacy: PrivacyPreferencesSchema,
}).partial();

/**
 * GET /api/preferences - Get user preferences from database
 */
export async function GET(/* request: NextRequest */) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user preferences:', profileError);
      return NextResponse.json({ 
        error: 'Failed to fetch preferences',
        details: profileError.message 
      }, { status: 500 });
    }

    // Return preferences or empty object if none set
    const preferences = profile?.preferences || {};

    return NextResponse.json({
      success: true,
      data: {
        preferences,
        userId: user.id,
      },
    });

  } catch (error) {
    console.error('GET /api/preferences error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * PUT /api/preferences - Update user preferences in database
 */
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdatePreferencesSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid preference data',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    const updatedPreferences = validationResult.data;

    // Get current preferences first
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching current preferences:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch current preferences',
        details: fetchError.message 
      }, { status: 500 });
    }

    // Merge current preferences with updates
    const currentPreferences = currentProfile?.preferences || {};
    const mergedPreferences = {
      ...currentPreferences,
      ...(updatedPreferences.display && {
        display: {
          ...currentPreferences.display,
          ...updatedPreferences.display,
        }
      }),
      ...(updatedPreferences.notifications && {
        notifications: {
          ...currentPreferences.notifications,
          ...updatedPreferences.notifications,
        }
      }),
      ...(updatedPreferences.analysis && {
        analysis: {
          ...currentPreferences.analysis,
          ...updatedPreferences.analysis,
        }
      }),
      ...(updatedPreferences.privacy && {
        privacy: {
          ...currentPreferences.privacy,
          ...updatedPreferences.privacy,
        }
      }),
    };

    // Update preferences in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        preferences: mergedPreferences,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update preferences',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences: mergedPreferences,
        userId: user.id,
        updatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('PUT /api/preferences error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}