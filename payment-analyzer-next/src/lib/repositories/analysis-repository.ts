import { createClient } from '@/lib/supabase/client';
import { AppError, ErrorCodes, Result } from '@/lib/utils/errors';
import { queryMonitor } from '@/lib/utils/query-performance-monitor';
import { z } from 'zod';
import { 
  SupabaseClient, 
  SupabaseResponse, 
  SupabaseError,
  StringKeyObject,
  AnalysisMetadata,
  AnalysisStatus,
  AnalysisSource
} from '@/types/core';

// Enhanced validation schemas
// Type aliases for union types (use imports from core)
// AnalysisStatus and AnalysisSource are imported from core
type DailyEntryStatus = 'balanced' | 'overpaid' | 'underpaid';
type FileType = 'runsheet' | 'invoice' | 'other';
export type CreateDailyEntryData = Omit<DailyEntryRecord, 'id' | 'analysis_id' | 'created_at'>;
type CreateAnalysisTotalData = Omit<AnalysisTotalRecord, 'id' | 'analysis_id' | 'created_at'>;
type CreateAnalysisFileData = Omit<AnalysisFileRecord, 'id' | 'analysis_id' | 'created_at'>;

const createAnalysisSchema = z.object({
  userId: z.string().uuid(),
  fingerprint: z.string().optional(),
  source: z.enum(['upload', 'manual', 'import']),
  periodStart: z.string(),
  periodEnd: z.string(),
  rulesVersion: z.number(),
  workingDays: z.number(),
  totalConsignments: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export interface CreateAnalysisData {
  userId: string;
  fingerprint?: string;
  source: AnalysisSource;
  periodStart: string; // ISO date string
  periodEnd: string; // ISO date string
  rulesVersion: number;
  workingDays: number;
  totalConsignments: number;
  metadata?: AnalysisMetadata;
}

export interface AnalysisRecord {
  id: string;
  user_id: string;
  fingerprint?: string;
  source: AnalysisSource;
  status: 'pending' | 'processing' | 'completed' | 'error';
  period_start: string;
  period_end: string;
  rules_version: number;
  working_days: number;
  total_consignments: number;
  metadata: AnalysisMetadata;
  created_at: string;
  updated_at: string;
}

export interface DailyEntryRecord {
  id: string;
  analysis_id: string;
  date: string;
  day_of_week: number;
  consignments: number;
  rate: number;
  base_payment: number;
  pickups: number;
  pickup_total: number;
  unloading_bonus: number;
  attendance_bonus: number;
  early_bonus: number;
  expected_total: number;
  paid_amount: number;
  difference: number;
  status: DailyEntryStatus;
  created_at: string;
}

export interface AnalysisTotalRecord {
  id: string;
  analysis_id: string;
  base_total: number;
  pickup_total: number;
  bonus_total: number;
  expected_total: number;
  paid_total: number;
  difference_total: number;
  created_at: string;
}

export interface AnalysisFileRecord {
  id: string;
  analysis_id: string;
  storage_path: string;
  original_name: string;
  file_size: number;
  file_hash: string;
  mime_type: string;
  file_type: FileType;
  parsed_data?: StringKeyObject;
  created_at: string;
}

export interface AnalysisWithDetails extends AnalysisRecord {
  daily_entries?: DailyEntryRecord[];
  analysis_totals?: AnalysisTotalRecord;
  analysis_files?: AnalysisFileRecord[];
}

export class AnalysisRepository {
  private readonly supabase: SupabaseClient = createClient();

  /**
   * Create a new analysis with comprehensive validation and error handling
   */
  async createAnalysis(data: CreateAnalysisData): Promise<Result<AnalysisRecord>> {
    try {
      // Validate input data
      const validationResult = createAnalysisSchema.safeParse(data);
      if (!validationResult.success) {
        return Result.failure(
          new AppError(
            'Invalid analysis data',
            ErrorCodes.VALIDATION_INVALID_FORMAT,
            400,
            true,
            { validationErrors: validationResult.error.issues }
          )
        );
      }

      const validatedData = validationResult.data;

      // Check for duplicate fingerprint if provided
      if (validatedData.fingerprint) {
        const duplicateCheck = await this.findAnalysisByFingerprint(
          validatedData.userId,
          validatedData.fingerprint
        );
        
        if (duplicateCheck.isSuccess && duplicateCheck.data) {
          return Result.failure(
            new AppError(
              `Duplicate analysis detected. Analysis from ${new Date(duplicateCheck.data.created_at).toLocaleDateString()} already exists.`,
              ErrorCodes.ANALYSIS_DUPLICATE,
              409,
              true,
              { existingAnalysisId: duplicateCheck.data.id }
            )
          );
        }
      }

      // Insert analysis with proper error handling
      const { data: analysis, error } = await this.supabase
        .from('analyses')
        .insert({
          user_id: validatedData.userId,
          fingerprint: validatedData.fingerprint,
          source: validatedData.source,
          status: 'pending' as const,
          period_start: validatedData.periodStart,
          period_end: validatedData.periodEnd,
          rules_version: validatedData.rulesVersion,
          working_days: validatedData.workingDays,
          total_consignments: validatedData.totalConsignments,
          metadata: validatedData.metadata,
        })
        .select()
        .single();

      if (error) {
        return this.handleDatabaseError(error, 'create analysis');
      }

      return Result.success(analysis as unknown as AnalysisRecord);

    } catch (error) {
      return Result.failure(
        new AppError(
          'Failed to create analysis',
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          { originalError: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  /**
   * Update analysis status with validation
   */
  async updateAnalysisStatus(
    analysisId: string,
    status: AnalysisStatus,
    metadata?: AnalysisMetadata
  ): Promise<Result<void>> {
    try {
      // Validate inputs
      if (!analysisId?.trim()) {
        return Result.failure(
          new AppError(
            'Analysis ID is required',
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      const validStatuses = ['pending', 'processing', 'completed', 'error'];
      if (!validStatuses.includes(status)) {
        return Result.failure(
          new AppError(
            `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            ErrorCodes.VALIDATION_INVALID_FORMAT,
            400
          )
        );
      }

      const updateData: Partial<AnalysisRecord> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (metadata) {
        updateData.metadata = metadata;
      }

      const { error }: SupabaseResponse = await this.supabase
        .from('analyses')
        .update(updateData)
        .eq('id', analysisId);

      if (error) {
        return this.handleDatabaseError(error, 'update analysis status');
      }

      return Result.success(undefined);

    } catch (error) {
      return Result.failure(
        new AppError(
          'Failed to update analysis status',
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            analysisId,
            status,
            originalError: error instanceof Error ? error.message : 'Unknown error'
          }
        )
      );
    }
  }

  /**
   * Create daily entries for an analysis with validation
   */
  async createDailyEntries(analysisId: string, entries: CreateDailyEntryData[]): Promise<Result<void>> {
    try {
      if (!analysisId?.trim()) {
        return Result.failure(
          new AppError(
            'Analysis ID is required',
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      if (!entries || entries.length === 0) {
        return Result.failure(
          new AppError(
            'At least one daily entry is required',
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      // Validate and merge duplicate entries
      const dateMap = new Map<string, CreateDailyEntryData>();

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry.date || isNaN(Date.parse(entry.date))) {
          return Result.failure(
            new AppError(
              `Invalid date in entry ${i + 1}`,
              ErrorCodes.VALIDATION_INVALID_DATE,
              400,
              true,
              { entryIndex: i, date: entry.date }
            )
          );
        }

        const dateKey = entry.date;
        if (!dateMap.has(dateKey)) {
          // First entry for this date
          dateMap.set(dateKey, { ...entry });
          console.log(`📅 Adding new entry for date: ${dateKey}`);
        } else {
          // Merge with existing entry for this date
          const existing = dateMap.get(dateKey)!;
          const merged = {
            ...existing,
            // Merge consignments and payments (additive)
            consignments: (existing.consignments || 0) + (entry.consignments || 0),
            pickups: (existing.pickups || 0) + (entry.pickups || 0),
            pickup_total: (existing.pickup_total || 0) + (entry.pickup_total || 0),
            paid_amount: (existing.paid_amount || 0) + (entry.paid_amount || 0),
            // Take the maximum for rates and bonuses (they should be the same for a date)
            rate: Math.max(existing.rate || 0, entry.rate || 0),
            unloading_bonus: Math.max(existing.unloading_bonus || 0, entry.unloading_bonus || 0),
            attendance_bonus: Math.max(existing.attendance_bonus || 0, entry.attendance_bonus || 0),
            early_bonus: Math.max(existing.early_bonus || 0, entry.early_bonus || 0),
            // Recalculate derived values
            base_payment: 0, // Will be calculated below
            expected_total: 0, // Will be calculated below
            difference: 0, // Will be calculated below
            status: existing.status === 'balanced' && entry.status === 'balanced' ? 'balanced' : 
                   existing.status === 'balanced' || entry.status === 'balanced' ? 'balanced' : 
                   'underpaid' as DailyEntryStatus
          };
          
          // Recalculate derived values
          merged.base_payment = merged.consignments * merged.rate;
          merged.expected_total = merged.base_payment + merged.unloading_bonus + merged.attendance_bonus + merged.early_bonus + merged.pickup_total;
          merged.difference = merged.paid_amount - merged.expected_total;
          
          // Update status based on difference
          if (merged.difference > 0.01) {
            merged.status = 'overpaid';
          } else if (merged.difference < -0.01) {
            merged.status = 'underpaid';
          } else {
            merged.status = 'balanced';
          }
          
          dateMap.set(dateKey, merged);
          console.log(`🔄 Merged duplicate entry for date: ${dateKey} - consignments: ${existing.consignments} + ${entry.consignments} = ${merged.consignments}, payments: ${existing.paid_amount} + ${entry.paid_amount} = ${merged.paid_amount}`);
        }
      }

      const validEntries = Array.from(dateMap.values());

      if (validEntries.length === 0) {
        return Result.failure(
          new AppError(
            'No valid entries after deduplication',
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      // First, delete any existing entries for this analysis to avoid duplicates
      const { error: deleteError }: SupabaseResponse = await this.supabase
        .from('daily_entries')
        .delete()
        .eq('analysis_id', analysisId);

      if (deleteError) {
        console.warn('Failed to delete existing entries:', deleteError);
        // Continue anyway - we'll use insert instead of upsert
      }

      const entriesWithAnalysisId = validEntries.map(entry => ({
        ...entry,
        analysis_id: analysisId,
      }));

      // Use simple insert since we've deleted existing entries and deduplicated
      const { error }: SupabaseResponse = await this.supabase
        .from('daily_entries')
        .insert(entriesWithAnalysisId);

      if (error) {
        return this.handleDatabaseError(error, 'create daily entries');
      }

      return Result.success(undefined);

    } catch (error) {
      return Result.failure(
        new AppError(
          'Failed to create daily entries',
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            analysisId,
            entryCount: entries?.length || 0,
            originalError: error instanceof Error ? error.message : 'Unknown error'
          }
        )
      );
    }
  }

  /**
   * Create analysis totals
   */
  async createAnalysisTotals(
    analysisId: string, 
    totals: CreateAnalysisTotalData
  ): Promise<{ error?: string }> {
    try {
      // First, delete any existing totals for this analysis
      const { error: deleteError }: SupabaseResponse = await this.supabase
        .from('analysis_totals')
        .delete()
        .eq('analysis_id', analysisId);

      if (deleteError) {
        console.warn('Failed to delete existing totals:', deleteError);
      }

      // Insert new totals
      const { error }: SupabaseResponse = await this.supabase
        .from('analysis_totals')
        .insert({
          ...totals,
          analysis_id: analysisId,
        });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to create analysis totals',
      };
    }
  }

  /**
   * Create file records
   */
  async createAnalysisFiles(
    analysisId: string, 
    files: CreateAnalysisFileData[]
  ): Promise<{ error?: string }> {
    try {
      // First, delete any existing files for this analysis
      const { error: deleteError }: SupabaseResponse = await this.supabase
        .from('analysis_files')
        .delete()
        .eq('analysis_id', analysisId);

      if (deleteError) {
        console.warn('Failed to delete existing files:', deleteError);
      }

      const filesWithAnalysisId = files.map(file => ({
        ...file,
        analysis_id: analysisId,
      }));

      // Insert new files
      const { error }: SupabaseResponse = await this.supabase
        .from('analysis_files')
        .insert(filesWithAnalysisId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to create file records',
      };
    }
  }

  /**
   * Get analysis by ID with related data
   */
  async getAnalysisById(analysisId: string): Promise<{ data: AnalysisWithDetails | null; error?: string }> {
    try {
      return await queryMonitor.trackQuery(
        'getAnalysisById',
        'analyses',
        async () => {
          // First, try to get the main analysis record
          const { data: analyses, error: analysisError } = await this.supabase
            .from('analyses')
            .select('*')
            .eq('id', analysisId)
            .limit(1);

          if (analysisError) {
            console.error('getAnalysisById - Main query error:', analysisError);
            return { data: null, error: analysisError.message };
          }

          if (!analyses || analyses.length === 0) {
            return { data: null, error: 'Analysis not found' };
          }

          const analysis = (analyses as unknown as AnalysisRecord[])[0];

          // Now get related data separately to avoid complex join issues
          const [
            { data: dailyEntries, error: dailyError },
            { data: analysisTotals, error: totalsError },
            { data: analysisFiles, error: filesError }
          ] = await Promise.all([
            this.supabase
              .from('daily_entries')
              .select('*')
              .eq('analysis_id', analysisId)
              .order('date', { ascending: true }),
            this.supabase
              .from('analysis_totals')
              .select('*')
              .eq('analysis_id', analysisId),
            this.supabase
              .from('analysis_files')
              .select('*')
              .eq('analysis_id', analysisId)
              .order('created_at', { ascending: true })
          ]);

          if (dailyError) {
            console.warn('getAnalysisById - Daily entries error:', dailyError);
          }
          if (totalsError) {
            console.warn('getAnalysisById - Totals error:', totalsError);
          }
          if (filesError) {
            console.warn('getAnalysisById - Files error:', filesError);
          }

          // Construct the complete analysis object
          const analysisWithDetails: AnalysisWithDetails = {
            ...analysis,
            daily_entries: (dailyEntries as unknown as DailyEntryRecord[]) || [],
            analysis_totals: Array.isArray(analysisTotals) && analysisTotals.length > 0 ? (analysisTotals[0] as unknown as AnalysisTotalRecord) : undefined,
            analysis_files: (analysisFiles as unknown as AnalysisFileRecord[]) || []
          };

          return { data: analysisWithDetails };
        }
      );
    } catch (error) {
      console.error('getAnalysisById - Unexpected error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch analysis',
      };
    }
  }

  /**
   * Get user's analyses with pagination
   */
  async getUserAnalyses(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      status?: string;
      orderBy?: 'created_at' | 'updated_at' | 'period_start';
      order?: 'asc' | 'desc';
    } = {}
  ): Promise<{ data: AnalysisWithDetails[]; count?: number; error?: string }> {
    try {
      // OPTIMIZATION: Build query to leverage idx_analyses_user_status_created index
      // Include all related data in single query to avoid N+1 problem
      // This reduces database round trips from 1+N*3 to just 1 query
      let query = this.supabase
        .from('analyses')
        .select(`
          *,
          daily_entries(*),
          analysis_totals(*),
          analysis_files(*)
        `);

      // Apply user filter first (most selective)
      query = query.eq('user_id', userId);

      // Apply status filter next (if provided) to leverage composite index
      if (options.status) {
        query = query.eq('status', options.status);
      }

      // Apply search filters (less selective, applied after indexes)
      if (options.search) {
        // TODO: Implement proper search functionality with supported Supabase query builder methods
        // query = query.or(`metadata->>period.ilike.%${options.search}%,metadata->>description.ilike.%${options.search}%`);
        console.warn('Search functionality temporarily disabled due to missing query builder method');
      }

      // Apply ordering (leverages index for created_at DESC)
      const orderBy = options.orderBy || 'created_at';
      const order = options.order || 'desc';
      query = query.order(orderBy, { ascending: order === 'asc' });

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data: analyses, error, count } = await query;

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: (analyses as unknown as AnalysisWithDetails[]) || [], count: count || 0 };
    } catch (error) {
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch user analyses',
      };
    }
  }


  /**
   * Delete analysis and all related data
   */
  async deleteAnalysis(analysisId: string): Promise<{ error?: string }> {
    try {
      // Delete in reverse dependency order
      await Promise.all([
        this.supabase.from('analysis_files').delete().eq('analysis_id', analysisId),
        this.supabase.from('analysis_totals').delete().eq('analysis_id', analysisId),
        this.supabase.from('daily_entries').delete().eq('analysis_id', analysisId),
      ]);

      const { error } = await this.supabase
        .from('analyses')
        .delete()
        .eq('id', analysisId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to delete analysis',
      };
    }
  }

  /**
   * Get analysis statistics for dashboard
   */
  async getAnalyticsData(userId: string): Promise<{
    data: {
      totalAnalyses: number;
      thisMonthEarnings: number;
      avgDailyConsignments: number;
      completionRate: number;
    };
    error?: string;
  }> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [
        { data: totalAnalyses, error: totalError },
        { data: thisMonth, error: monthError },
        { data: avgData, error: avgError },
        { data: completionData, error: completionError }
      ] = await Promise.all([
        // Total analyses count
        this.supabase
          .from('analyses')
          .select('id')
          .eq('user_id', userId),

        // This month earnings
        this.supabase
          .from('analyses')
          .select('analysis_totals(expected_total)')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .gte('created_at', startOfMonth.toISOString()),

        // Average daily consignments
        this.supabase
          .from('analyses')
          .select('total_consignments, working_days')
          .eq('user_id', userId)
          .eq('status', 'completed'),

        // Completion rate
        this.supabase
          .from('analyses')
          .select('status')
          .eq('user_id', userId)
      ]);

      if (totalError || monthError || avgError || completionError) {
        return {
          data: { totalAnalyses: 0, thisMonthEarnings: 0, avgDailyConsignments: 0, completionRate: 0 },
          error: 'Failed to fetch analytics data'
        };
      }

      // Calculate metrics
      const totalCount = (totalAnalyses as StringKeyObject[])?.length || 0;

      const monthlyEarnings = (thisMonth as StringKeyObject[])?.reduce((sum: number, analysis: StringKeyObject) => {
        const totals = analysis.analysis_totals as StringKeyObject[];
        return sum + (totals?.[0]?.expected_total as number || 0);
      }, 0) || 0;

      const avgConsignments = (avgData as StringKeyObject[])?.length ?
        (avgData as StringKeyObject[]).reduce((sum: number, analysis: StringKeyObject) => {
          const consignments = analysis.total_consignments as number || 0;
          const workingDays = analysis.working_days as number || 1;
          return sum + (consignments / workingDays);
        }, 0) / (avgData as StringKeyObject[]).length : 0;

      const completedCount = (completionData as StringKeyObject[])?.filter((a: StringKeyObject) => a.status === 'completed').length || 0;
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return {
        data: {
          totalAnalyses: totalCount,
          thisMonthEarnings: Math.round(monthlyEarnings * 100) / 100,
          avgDailyConsignments: Math.round(avgConsignments),
          completionRate,
        }
      };
    } catch (error) {
      return {
        data: { totalAnalyses: 0, thisMonthEarnings: 0, avgDailyConsignments: 0, completionRate: 0 },
        error: error instanceof Error ? error.message : 'Failed to fetch analytics data',
      };
    }
  }

  /**
   * Centralized database error handling
   */
  private handleDatabaseError(error: SupabaseError, operation: string): Result<never> {
    console.error(`Database error during ${operation}:`, error);

    // Handle specific PostgreSQL error codes
    switch (error.code) {
      case '23505': // Unique violation
        return Result.failure(
          new AppError(
            'Duplicate entry detected',
            ErrorCodes.DATABASE_DUPLICATE_ENTRY,
            409,
            true,
            { operation, dbError: error.message }
          )
        );

      case '23503': // Foreign key violation
        return Result.failure(
          new AppError(
            'Referenced record not found',
            ErrorCodes.DATABASE_CONSTRAINT_VIOLATION,
            400,
            true,
            { operation, dbError: error.message }
          )
        );

      case '23514': // Check constraint violation
        return Result.failure(
          new AppError(
            'Data validation failed',
            ErrorCodes.DATABASE_CONSTRAINT_VIOLATION,
            400,
            true,
            { operation, dbError: error.message }
          )
        );

      case 'PGRST116': // Not found
        return Result.failure(
          new AppError(
            'Record not found',
            ErrorCodes.DATABASE_NOT_FOUND,
            404,
            true,
            { operation }
          )
        );

      default:
        return Result.failure(
          new AppError(
            `Database operation failed: ${operation}`,
            ErrorCodes.DATABASE_CONNECTION_ERROR,
            500,
            false,
            { operation, dbError: error.message }
          )
        );
    }
  }

  /**
   * Enhanced findAnalysisByFingerprint with Result pattern
   */
  async findAnalysisByFingerprint(
    userId: string,
    fingerprint: string
  ): Promise<Result<AnalysisRecord | null>> {
    try {
      if (!userId?.trim() || !fingerprint?.trim()) {
        return Result.failure(
          new AppError(
            'User ID and fingerprint are required',
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      const { data: analysis, error } = await this.supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId)
        .eq('fingerprint', fingerprint)
        .maybeSingle();

      if (error) {
        return this.handleDatabaseError(error, 'find analysis by fingerprint');
      }

      return Result.success(analysis as AnalysisRecord | null);

    } catch (error) {
      return Result.failure(
        new AppError(
          'Failed to check for duplicate analysis',
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            userId,
            fingerprint,
            originalError: error instanceof Error ? error.message : 'Unknown error'
          }
        )
      );
    }
  }

  /**
   * Update a daily entry for an analysis
   */
  async updateDailyEntry(
    userId: string,
    analysisId: string,
    entryDate: string,
    updateData: Partial<DailyEntryRecord>
  ): Promise<Result<void>> {
    try {
      if (!userId?.trim() || !analysisId?.trim() || !entryDate?.trim()) {
        return Result.failure(
          new AppError(
            'User ID, analysis ID, and entry date are required',
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      // First verify the analysis belongs to the user
      const { data: analysis, error: analysisError } = await this.supabase
        .from('analyses')
        .select('id')
        .eq('id', analysisId)
        .eq('user_id', userId)
        .single();

      if (analysisError || !analysis) {
        return Result.failure(
          new AppError(
            'Analysis not found or access denied',
            ErrorCodes.ANALYSIS_NOT_FOUND,
            404
          )
        );
      }

      // Update the daily entry
      const { error: updateError } = await this.supabase
        .from('daily_entries')
        .update(updateData)
        .eq('analysis_id', analysisId)
        .eq('date', entryDate);

      if (updateError) {
        return this.handleDatabaseError(updateError, 'update daily entry');
      }

      return Result.success(undefined);

    } catch (error) {
      return Result.failure(
        new AppError(
          'Failed to update daily entry',
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            userId,
            analysisId,
            entryDate,
            originalError: error instanceof Error ? error.message : 'Unknown error'
          }
        )
      );
    }
  }

}

// Export singleton instance
export const analysisRepository = new AnalysisRepository();