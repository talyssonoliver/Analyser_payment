import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { analysisService } from '@/lib/services/analysis-service';
import { generateUUID } from '@/lib/utils';
import { z } from 'zod';

// Schema for migration data validation
const MigrationDataSchema = z.object({
  version: z.string(), // e.g., "v8", "v9"
  data: z.array(z.object({
    // Legacy analysis structure
    id: z.string().optional(),
    period: z.object({
      start: z.string(),
      end: z.string(),
    }),
    entries: z.array(z.object({
      date: z.string(),
      consignments: z.number().min(0),
      paid: z.number().min(0),
      bonuses: z.object({
        unloading: z.boolean().optional(),
        attendance: z.boolean().optional(),
        early: z.boolean().optional(),
      }).optional(),
      pickups: z.number().min(0).optional(),
    })),
    paymentRules: z.object({
      weekdayRate: z.number().min(0),
      saturdayRate: z.number().min(0),
      unloadingBonus: z.number().min(0),
      attendanceBonus: z.number().min(0),
      earlyBonus: z.number().min(0),
    }).optional(),
    metadata: z.object({
      description: z.string().optional(),
      notes: z.string().optional(),
      originalId: z.string().optional(),
      importDate: z.string().optional(),
    }).optional(),
  })),
});

const ValidateRequestSchema = z.object({
  version: z.string(),
  sampleData: z.unknown(), // Raw data for validation
});

// Type definitions based on Zod schemas
type LegacyAnalysisData = z.infer<typeof MigrationDataSchema>['data'][0];

// Migration progress tracking (in production, use Redis)
interface MigrationProgress {
  migrationId: string;
  stage: 'starting' | 'validating' | 'processing' | 'importing' | 'verifying' | 'completed' | 'error';
  progress: number;
  message: string;
  currentItem?: number;
  totalItems?: number;
  processedRecords?: number;
  totalRecords?: number;
  errors?: { index: number; error: string | undefined; originalId: string | undefined }[];
  processed?: number;
  userId?: string;
  error?: string;
  total?: number;
  version?: string;
  success?: string[];
  completedAt?: string;
  warnings?: string[];
  result?: {
    successCount: number;
    errorCount: number;
    analysisIds: string[];
  } | null;
}

const migrationProgress = new Map<string, MigrationProgress>();

/**
 * Update migration progress
 */
async function updateMigrationProgress(
  migrationId: string, 
  processed: number, 
  total: number
): Promise<void> {
  const currentProgress = migrationProgress.get(migrationId);
  if (currentProgress) {
    migrationProgress.set(migrationId, {
      ...currentProgress,
      migrationId,
      stage: 'processing',
      progress: Math.round((processed / total) * 100),
      message: `Processing analysis ${processed + 1} of ${total}`,
      processed,
    });
  }
}

/**
 * Process a single legacy analysis
 */
async function processSingleAnalysis(
  legacyAnalysis: LegacyAnalysisData,
  version: string,
  userId: string,
  migrationId: string,
  index: number
): Promise<{ success?: string; error?: { index: number; error: string; originalId: string } }> {
  try {
    const convertedAnalysis = convertLegacyAnalysis(legacyAnalysis, version);

    const result = await analysisService.createAnalysis({
      userId,
      manualEntries: convertedAnalysis.manualEntries,
      paymentRules: convertedAnalysis.paymentRules as Partial<{
        weekdayRate: number;
        saturdayRate: number;
        unloadingBonus: number;
        attendanceBonus: number;
        earlyBonus: number;
      }>,
      metadata: {
        ...convertedAnalysis.metadata,
        description: `Migrated from ${version}`,
        notes: `Migration ID: ${migrationId}\\nOriginal data preserved`,
      },
    });

    if (result.success) {
      return { success: result.analysisId };
    } else {
      return {
        error: {
          index,
          error: result.error || 'Unknown error',
          originalId: legacyAnalysis.id || 'unknown',
        }
      };
    }
  } catch (error) {
    return {
      error: {
        index,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalId: legacyAnalysis.id || 'unknown',
      }
    };
  }
}

/**
 * Process all migration data
 */
async function processMigrationData(
  migrationData: LegacyAnalysisData[],
  migrationId: string,
  version: string,
  userId: string
): Promise<{
  processedCount: number;
  errors: { index: number; error: string; originalId: string }[];
  success: string[];
}> {
  let processed = 0;
  const errors: { index: number; error: string; originalId: string }[] = [];
  const success: string[] = [];

  for (const legacyAnalysis of migrationData) {
    await updateMigrationProgress(migrationId, processed, migrationData.length);

    const result = await processSingleAnalysis(
      legacyAnalysis,
      version,
      userId,
      migrationId,
      processed
    );

    if (result.success) {
      success.push(result.success);
    } else if (result.error) {
      errors.push(result.error);
    }

    processed++;
  }

  return { processedCount: processed, errors, success };
}

/**
 * Set migration as completed
 */
async function setMigrationCompleted(
  migrationId: string,
  success: string[],
  errors: { index: number; error: string; originalId: string }[],
  processed: number
): Promise<void> {
  const currentProgress = migrationProgress.get(migrationId);
  if (currentProgress) {
    migrationProgress.set(migrationId, {
      ...currentProgress,
      migrationId,
      stage: 'completed',
      progress: 100,
      message: `Migration completed. ${success.length} successful, ${errors.length} failed.`,
      processed,
      errors,
      success,
      completedAt: new Date().toISOString(),
      result: {
        successCount: success.length,
        errorCount: errors.length,
        analysisIds: success,
      },
    });
  }
}

/**
 * Set migration as error
 */
async function setMigrationError(migrationId: string, error: unknown): Promise<void> {
  const currentProgress = migrationProgress.get(migrationId);
  if (currentProgress) {
    migrationProgress.set(migrationId, {
      ...currentProgress,
      migrationId,
      stage: 'error',
      progress: 0,
      message: 'Migration failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date().toISOString(),
    });
  }
}

/**
 * Schedule migration cleanup
 */
function scheduleMigrationCleanup(migrationId: string): void {
  setTimeout(() => {
    migrationProgress.delete(migrationId);
  }, 30 * 60 * 1000);
}

/**
 * POST /api/migration/import - Import legacy data
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
    const validationResult = MigrationDataSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid migration data format',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    const { version, data: migrationData } = validationResult.data;

    // Generate migration ID for progress tracking
    const migrationId = generateUUID();

    // Initialize progress tracking
    migrationProgress.set(migrationId, {
      stage: 'starting',
      progress: 0,
      message: 'Starting migration...',
      total: migrationData.length,
      processed: 0,
      migrationId,
      version,
      userId: user.id,
      errors: [],
      success: [],
    });

    // Start migration in background
    const processMigration = async () => {
      try {
        const { processedCount, errors, success } = await processMigrationData(
          migrationData, 
          migrationId, 
          version, 
          user.id
        );

        await setMigrationCompleted(migrationId, success, errors, processedCount);
        scheduleMigrationCleanup(migrationId);

      } catch (error) {
        await setMigrationError(migrationId, error);
      }
    };

    // Start processing
    processMigration();

    return NextResponse.json({
      success: true,
      migrationId,
      message: 'Migration started. Use the migrationId to check progress.',
      total: migrationData.length,
    }, { status: 202 });

  } catch (error) {
    console.error('POST /api/migration/import error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * POST /api/migration/validate - Validate migration data before import
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validationResult = ValidateRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid validation request',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    const { version, sampleData } = validationResult.data;

    // Validate sample data
    const validation = validateLegacyData(sampleData, version);

    return NextResponse.json({
      success: true,
      validation,
    });

  } catch (error) {
    console.error('PATCH /api/migration/validate error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * GET /api/migration/status?migrationId=... - Get migration progress
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
    const migrationId = searchParams.get('migrationId');

    if (!migrationId) {
      return NextResponse.json({ 
        error: 'migrationId is required' 
      }, { status: 400 });
    }

    const progress = migrationProgress.get(migrationId);

    if (!progress) {
      return NextResponse.json({ 
        error: 'Migration not found or expired' 
      }, { status: 404 });
    }

    // Verify ownership
    if (progress.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: progress,
    });

  } catch (error) {
    console.error('GET /api/migration/status error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * Convert legacy analysis data to new format
 */
function convertLegacyAnalysis(legacyAnalysis: LegacyAnalysisData, version: string) {
  const manualEntries = legacyAnalysis.entries.map((entry) => ({
    date: entry.date,
    consignments: entry.consignments,
    paid: entry.paid,
    hasUnloadingBonus: entry.bonuses?.unloading || false,
    hasAttendanceBonus: entry.bonuses?.attendance || false,
    hasEarlyBonus: entry.bonuses?.early || false,
    pickups: entry.pickups || 0,
  }));

  return {
    manualEntries,
    paymentRules: legacyAnalysis.paymentRules,
    metadata: {
      description: legacyAnalysis.metadata?.description || `Migrated from ${version}`,
      notes: legacyAnalysis.metadata?.notes,
      originalId: legacyAnalysis.id,
      migrationVersion: version,
      importDate: new Date().toISOString(),
    },
  };
}

/**
 * Validate a single record's basic structure
 */
function validateRecordStructure(record: unknown, index: number): string[] {
  const issues: string[] = [];

  if (typeof record !== 'object' || record === null) {
    issues.push(`Record ${index + 1}: Invalid record structure`);
    return issues;
  }

  const typedRecord = record as Record<string, unknown>;

  if (!typedRecord.period || typeof typedRecord.period !== 'object' ||
      !(typedRecord.period as Record<string, unknown>)?.start ||
      !(typedRecord.period as Record<string, unknown>)?.end) {
    issues.push(`Record ${index + 1}: Missing period information`);
  }

  if (!Array.isArray(typedRecord.entries) || typedRecord.entries.length === 0) {
    issues.push(`Record ${index + 1}: Missing or empty entries array`);
  }

  return issues;
}

/**
 * Validate a single entry within a record
 */
function validateEntry(entry: unknown, recordIndex: number, entryIndex: number): string[] {
  const issues: string[] = [];

  if (typeof entry !== 'object' || entry === null) {
    issues.push(`Record ${recordIndex + 1}, Entry ${entryIndex + 1}: Invalid entry structure`);
    return issues;
  }

  const typedEntry = entry as Record<string, unknown>;

  if (!typedEntry.date) {
    issues.push(`Record ${recordIndex + 1}, Entry ${entryIndex + 1}: Missing date`);
  }

  if (typeof typedEntry.consignments !== 'number' || typedEntry.consignments < 0) {
    issues.push(`Record ${recordIndex + 1}, Entry ${entryIndex + 1}: Invalid consignments value`);
  }

  if (typeof typedEntry.paid !== 'number' || typedEntry.paid < 0) {
    issues.push(`Record ${recordIndex + 1}, Entry ${entryIndex + 1}: Invalid paid amount`);
  }

  return issues;
}

/**
 * Validate all entries in a record
 */
function validateRecordEntries(record: unknown, recordIndex: number): { issues: string[]; isValid: boolean } {
  const issues: string[] = [];
  let isValid = true;

  if (typeof record !== 'object' || record === null) {
    issues.push(`Record ${recordIndex + 1}: Invalid record structure`);
    return { issues, isValid: false };
  }

  const typedRecord = record as Record<string, unknown>;

  if (!Array.isArray(typedRecord.entries)) {
    issues.push(`Record ${recordIndex + 1}: Invalid entries array`);
    return { issues, isValid: false };
  }

  for (let j = 0; j < typedRecord.entries.length; j++) {
    const entryIssues = validateEntry(typedRecord.entries[j], recordIndex, j);
    if (entryIssues.length > 0) {
      issues.push(...entryIssues);
      isValid = false;
    }
  }

  return { issues, isValid };
}

/**
 * Check for warnings in a record
 */
function checkRecordWarnings(record: unknown, recordIndex: number): string[] {
  const warnings: string[] = [];

  if (typeof record !== 'object' || record === null) {
    return warnings; // Already handled in validation
  }

  const typedRecord = record as Record<string, unknown>;

  if (!typedRecord.paymentRules) {
    warnings.push(`Record ${recordIndex + 1}: No payment rules specified, will use defaults`);
  }

  return warnings;
}

/**
 * Validate legacy data structure
 */
function validateLegacyData(data: unknown, version: string) {
  const issues: string[] = [];
  const warnings: string[] = [];
  let validRecords = 0;
  let totalRecords = 0;

  // Note: version parameter reserved for future version-specific validation
  console.debug(`Validating legacy data for version: ${version}`);

  try {
    if (!Array.isArray(data)) {
      issues.push('Data must be an array of analyses');
      return { valid: false, issues, warnings, validRecords, totalRecords };
    }

    totalRecords = data.length;

    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      
      // Validate basic record structure
      const structureIssues = validateRecordStructure(record, i);
      if (structureIssues.length > 0) {
        issues.push(...structureIssues);
        continue;
      }

      // Validate entries
      const { issues: entryIssues, isValid } = validateRecordEntries(record, i);
      issues.push(...entryIssues);

      if (isValid) {
        validRecords++;
      }

      // Check for warnings
      const recordWarnings = checkRecordWarnings(record, i);
      warnings.push(...recordWarnings);
    }

  } catch (error) {
    issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    validRecords,
    totalRecords,
    canProceed: validRecords > 0,
    summary: `${validRecords}/${totalRecords} records are valid for migration`,
  };
}