import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { AppError, ErrorCodes, Result } from "@/lib/utils/errors";
import { queryMonitor } from "@/lib/utils/query-performance-monitor";
import type {
  AnalysisMetadata,
  AnalysisSource,
  AnalysisStatus,
  StringKeyObject,
  SupabaseClient,
  SupabaseError,
  SupabaseResponse,
} from "@/types/core";

// Enhanced validation schemas
// Type aliases for union types (use imports from core)
// AnalysisStatus and AnalysisSource are imported from core
type DailyEntryStatus = "balanced" | "overpaid" | "underpaid";
type FileType = "runsheet" | "invoice" | "other";
export type CreateDailyEntryData = Omit<DailyEntryRecord, "id" | "analysis_id" | "created_at">;
type CreateAnalysisTotalData = Omit<AnalysisTotalRecord, "id" | "analysis_id" | "created_at">;
type CreateAnalysisFileData = Omit<AnalysisFileRecord, "id" | "analysis_id" | "created_at">;

const createAnalysisSchema = z.object({
  userId: z.string().uuid(),
  fingerprint: z.string().optional(),
  source: z.enum(["upload", "manual", "import"]),
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
  status: "pending" | "processing" | "completed" | "error";
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
  unloading_bonus_total?: number; // Individual bonus breakdown (matching legacy)
  attendance_bonus_total?: number;
  early_bonus_total?: number;
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

export interface PaginatedAnalysesResult {
  data: AnalysisWithDetails[];
  count: number;
}

export interface AnalyticsData {
  totalAnalyses: number;
  thisMonthEarnings: number;
  avgDailyConsignments: number;
  completionRate: number;
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
          new AppError("Invalid analysis data", ErrorCodes.VALIDATION_INVALID_FORMAT, 400, true, {
            validationErrors: validationResult.error.issues,
          })
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
        .from("analyses")
        .insert({
          user_id: validatedData.userId,
          fingerprint: validatedData.fingerprint,
          source: validatedData.source,
          status: "pending" as const,
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
        return this.handleDatabaseError(error, "create analysis");
      }

      return Result.success(analysis as unknown as AnalysisRecord);
    } catch (error) {
      return Result.failure(
        new AppError(
          "Failed to create analysis",
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          { originalError: error instanceof Error ? error.message : "Unknown error" }
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
          new AppError("Analysis ID is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
        );
      }

      const validStatuses = ["pending", "processing", "completed", "error"];
      if (!validStatuses.includes(status)) {
        return Result.failure(
          new AppError(
            `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
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
        .from("analyses")
        .update(updateData)
        .eq("id", analysisId);

      if (error) {
        return this.handleDatabaseError(error, "update analysis status");
      }

      return Result.success(undefined);
    } catch (error) {
      return Result.failure(
        new AppError(
          "Failed to update analysis status",
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            analysisId,
            status,
            originalError: error instanceof Error ? error.message : "Unknown error",
          }
        )
      );
    }
  }

  /**
   * Validate entry date and return error if invalid
   * @private
   */
  private validateEntryDate(entry: CreateDailyEntryData, index: number): Result<void> {
    if (!entry.date || Number.isNaN(Date.parse(entry.date))) {
      return Result.failure(
        new AppError(
          `Invalid date in entry ${index + 1}`,
          ErrorCodes.VALIDATION_INVALID_DATE,
          400,
          true,
          { entryIndex: index, date: entry.date }
        )
      );
    }
    return Result.success(undefined);
  }

  /**
   * Calculate difference and status for a daily entry
   * @private
   */
  private calculateEntryStatus(entry: CreateDailyEntryData): CreateDailyEntryData {
    const normalized = { ...entry };
    normalized.difference = normalized.paid_amount - normalized.expected_total;

    // Update status based on difference
    if (normalized.difference > 0.01) {
      normalized.status = "overpaid";
    } else if (normalized.difference < -0.01) {
      normalized.status = "underpaid";
    } else {
      normalized.status = "balanced";
    }

    return normalized;
  }

  /**
   * Check if an entry has consignments data
   * @private
   */
  private hasConsignments(entry: CreateDailyEntryData): boolean {
    return (entry.consignments || 0) > 0;
  }

  /**
   * Check if an entry has payment data
   * @private
   */
  private hasPayment(entry: CreateDailyEntryData): boolean {
    return (entry.paid_amount || 0) > 0;
  }

  /**
   * Merge invoice payment with runsheet data
   * @private
   */
  private mergeInvoiceToRunsheet(
    existing: CreateDailyEntryData,
    entry: CreateDailyEntryData,
    dateKey: string
  ): CreateDailyEntryData {
    const merged = {
      ...existing,
      // Keep consignments and bonuses from existing runsheet
      // Add/update payment from invoice
      paid_amount: entry.paid_amount || existing.paid_amount,
      pickup_total: (existing.pickup_total || 0) + (entry.pickup_total || 0),
      pickups: (existing.pickups || 0) + (entry.pickups || 0),
      // Recalculate difference
      base_payment: existing.base_payment,
      expected_total: existing.expected_total,
      difference: 0, // Will be calculated by calculateEntryStatus
    };
    console.log(`📄 Adding invoice payment to runsheet for date: ${dateKey}`);
    return merged;
  }

  /**
   * Merge runsheet data with invoice payment
   * @private
   */
  private mergeRunsheetToInvoice(
    existing: CreateDailyEntryData,
    entry: CreateDailyEntryData,
    dateKey: string
  ): CreateDailyEntryData {
    const merged = {
      ...entry,
      // Keep payment from existing invoice
      paid_amount: existing.paid_amount || entry.paid_amount,
      // Use new consignments and bonuses from runsheet
      base_payment: entry.base_payment,
      expected_total: entry.expected_total,
      difference: 0, // Will be calculated by calculateEntryStatus
    };
    console.log(`📋 Adding runsheet data to invoice for date: ${dateKey}`);
    return merged;
  }

  /**
   * Replace existing runsheet with new runsheet data
   * @private
   */
  private replaceRunsheet(
    existing: CreateDailyEntryData,
    entry: CreateDailyEntryData,
    dateKey: string
  ): CreateDailyEntryData {
    const merged = {
      ...entry,
      // Keep payment if it exists in either
      paid_amount: entry.paid_amount || existing.paid_amount,
      pickup_total: entry.pickup_total || existing.pickup_total,
      pickups: entry.pickups || existing.pickups,
    };
    console.log(`🔄 Replacing runsheet data for date: ${dateKey}`);
    return merged;
  }

  /**
   * Simple overwrite merge (legacy behavior)
   * @private
   */
  private simpleOverwriteMerge(
    existing: CreateDailyEntryData,
    entry: CreateDailyEntryData,
    dateKey: string
  ): CreateDailyEntryData {
    const merged = {
      ...entry,
      // Keep payment from either source (prefer new, fallback to existing)
      paid_amount: entry.paid_amount || existing.paid_amount,
    };
    console.log(`🔄 Simple overwrite (legacy behavior) for date: ${dateKey}`);
    return merged;
  }

  /**
   * Merge duplicate entries intelligently based on data patterns
   * @private
   */
  private mergeDuplicateEntry(
    existing: CreateDailyEntryData,
    entry: CreateDailyEntryData,
    dateKey: string
  ): CreateDailyEntryData {
    // Determine merge strategy based on data patterns
    const existingHasConsignments = this.hasConsignments(existing);
    const newHasConsignments = this.hasConsignments(entry);
    const existingHasPayment = this.hasPayment(existing);
    const newHasPayment = this.hasPayment(entry);

    let merged: CreateDailyEntryData;

    // Strategy 1: Adding invoice to runsheet (most common)
    if (existingHasConsignments && !newHasConsignments && newHasPayment) {
      merged = this.mergeInvoiceToRunsheet(existing, entry, dateKey);
    }
    // Strategy 2: Adding runsheet to invoice
    else if (!existingHasConsignments && existingHasPayment && newHasConsignments) {
      merged = this.mergeRunsheetToInvoice(existing, entry, dateKey);
    }
    // Strategy 3: Both have consignments - replace with newer data
    else if (existingHasConsignments && newHasConsignments) {
      merged = this.replaceRunsheet(existing, entry, dateKey);
    }
    // Strategy 4: Fallback - simple overwrite (matching legacy behavior)
    else {
      merged = this.simpleOverwriteMerge(existing, entry, dateKey);
    }

    return merged;
  }

  /**
   * Process and deduplicate daily entries
   * @private
   */
  private processAndDeduplicateEntries(
    entries: CreateDailyEntryData[]
  ): Result<CreateDailyEntryData[]> {
    const dateMap = new Map<string, CreateDailyEntryData>();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Validate date
      const dateValidation = this.validateEntryDate(entry, i);
      if (dateValidation.isFailure) {
        return Result.failure(dateValidation.error);
      }

      const dateKey = entry.date;

      const existing = dateMap.get(dateKey);
      if (!existing) {
        // First entry for this date - normalize and add
        const normalized = this.calculateEntryStatus(entry);
        dateMap.set(dateKey, normalized);
        console.log(`📅 Adding new entry for date: ${dateKey}`);
      } else {
        // Duplicate entry for same date - merge intelligently
        const merged = this.mergeDuplicateEntry(existing, entry, dateKey);
        // Recalculate status after merge
        const normalizedMerged = this.calculateEntryStatus(merged);
        dateMap.set(dateKey, normalizedMerged);
      }
    }

    const validEntries = Array.from(dateMap.values());

    if (validEntries.length === 0) {
      return Result.failure(
        new AppError(
          "No valid entries after deduplication",
          ErrorCodes.VALIDATION_REQUIRED_FIELD,
          400
        )
      );
    }

    return Result.success(validEntries);
  }

  /**
   * Delete existing entries for an analysis
   * @private
   */
  private async deleteExistingEntries(analysisId: string): Promise<void> {
    const { error: deleteError }: SupabaseResponse = await this.supabase
      .from("daily_entries")
      .delete()
      .eq("analysis_id", analysisId);

    if (deleteError) {
      console.warn("Failed to delete existing entries:", deleteError);
      // Continue anyway - we'll use insert instead of upsert
    }
  }

  /**
   * Insert daily entries into database
   * @private
   */
  private async insertDailyEntries(
    analysisId: string,
    entries: CreateDailyEntryData[]
  ): Promise<Result<void>> {
    const entriesWithAnalysisId = entries.map((entry) => ({
      ...entry,
      analysis_id: analysisId,
    }));

    const { error }: SupabaseResponse = await this.supabase
      .from("daily_entries")
      .insert(entriesWithAnalysisId);

    if (error) {
      return this.handleDatabaseError(error, "create daily entries");
    }

    return Result.success(undefined);
  }

  /**
   * Create daily entries for an analysis with validation
   */
  async createDailyEntries(
    analysisId: string,
    entries: CreateDailyEntryData[]
  ): Promise<Result<void>> {
    try {
      // Validate analysis ID
      if (!analysisId?.trim()) {
        return Result.failure(
          new AppError("Analysis ID is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
        );
      }

      // Validate entries array
      if (!entries || entries.length === 0) {
        return Result.failure(
          new AppError(
            "At least one daily entry is required",
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      // Process and deduplicate entries
      const processResult = this.processAndDeduplicateEntries(entries);
      if (processResult.isFailure) {
        return Result.failure(processResult.error);
      }

      const validEntries = processResult.data;

      // Delete existing entries for this analysis
      await this.deleteExistingEntries(analysisId);

      // Insert new entries
      return await this.insertDailyEntries(analysisId, validEntries);
    } catch (error) {
      return Result.failure(
        new AppError(
          "Failed to create daily entries",
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            analysisId,
            entryCount: entries?.length || 0,
            originalError: error instanceof Error ? error.message : "Unknown error",
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
  ): Promise<Result<void>> {
    try {
      if (!analysisId?.trim()) {
        return Result.failure(
          new AppError("Analysis ID is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
        );
      }

      // First, delete any existing totals for this analysis
      const { error: deleteError }: SupabaseResponse = await this.supabase
        .from("analysis_totals")
        .delete()
        .eq("analysis_id", analysisId);

      if (deleteError) {
        console.warn("Failed to delete existing totals:", deleteError);
      }

      // Insert new totals
      const { error }: SupabaseResponse = await this.supabase.from("analysis_totals").insert({
        ...totals,
        analysis_id: analysisId,
      });

      if (error) {
        return this.handleDatabaseError(error, "create analysis totals");
      }

      return Result.success(undefined);
    } catch (error) {
      return Result.failure(
        new AppError(
          "Failed to create analysis totals",
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            analysisId,
            originalError: error instanceof Error ? error.message : "Unknown error",
          }
        )
      );
    }
  }

  /**
   * Create file records
   */
  async createAnalysisFiles(
    analysisId: string,
    files: CreateAnalysisFileData[]
  ): Promise<Result<void>> {
    try {
      if (!analysisId?.trim()) {
        return Result.failure(
          new AppError("Analysis ID is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
        );
      }

      if (!files || files.length === 0) {
        return Result.failure(
          new AppError(
            "At least one file record is required",
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      // First, delete any existing files for this analysis
      const { error: deleteError }: SupabaseResponse = await this.supabase
        .from("analysis_files")
        .delete()
        .eq("analysis_id", analysisId);

      if (deleteError) {
        console.warn("Failed to delete existing files:", deleteError);
      }

      const filesWithAnalysisId = files.map((file) => ({
        ...file,
        analysis_id: analysisId,
      }));

      // Insert new files
      const { error }: SupabaseResponse = await this.supabase
        .from("analysis_files")
        .insert(filesWithAnalysisId);

      if (error) {
        return this.handleDatabaseError(error, "create analysis files");
      }

      return Result.success(undefined);
    } catch (error) {
      return Result.failure(
        new AppError(
          "Failed to create file records",
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            analysisId,
            fileCount: files?.length || 0,
            originalError: error instanceof Error ? error.message : "Unknown error",
          }
        )
      );
    }
  }

  /**
   * Delete a single file record from analysis_files table
   */
  async deleteAnalysisFile(analysisId: string, fileName: string): Promise<Result<void>> {
    try {
      if (!analysisId?.trim()) {
        return Result.failure(
          new AppError("Analysis ID is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
        );
      }

      if (!fileName?.trim()) {
        return Result.failure(
          new AppError("File name is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
        );
      }

      console.log(`🗑️ Deleting file record: ${fileName} from analysis ${analysisId}`);

      // Delete the file record where original_name matches
      const { error }: SupabaseResponse = await this.supabase
        .from("analysis_files")
        .delete()
        .eq("analysis_id", analysisId)
        .eq("original_name", fileName);

      if (error) {
        return this.handleDatabaseError(error, "delete analysis file");
      }

      console.log(`✅ Deleted file record: ${fileName}`);
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(
        new AppError(
          "Failed to delete file record",
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            analysisId,
            fileName,
            originalError: error instanceof Error ? error.message : "Unknown error",
          }
        )
      );
    }
  }

  /**
   * Get analysis by ID with related data
   */
  async getAnalysisById(analysisId: string): Promise<Result<AnalysisWithDetails | null>> {
    try {
      if (!analysisId?.trim()) {
        return Result.failure(
          new AppError("Analysis ID is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
        );
      }

      return await queryMonitor.trackQuery("getAnalysisById", "analyses", async () => {
        console.log("🔍 AnalysisRepository - Querying for analysis ID:", analysisId);

        // First, try to get the main analysis record
        const { data: analyses, error: analysisError } = await this.supabase
          .from("analyses")
          .select("*")
          .eq("id", analysisId)
          .limit(1);

        if (analysisError) {
          console.error("getAnalysisById - Main query error:", analysisError);
          return this.handleDatabaseError(analysisError, "get analysis by ID");
        }

        console.log("🔍 AnalysisRepository - Query result:", {
          analysisId,
          found: analyses?.length || 0,
          analyses: (analyses as unknown as AnalysisRecord[])?.map((a: AnalysisRecord) => ({
            id: a.id,
            status: a.status,
            user_id: a.user_id,
          })),
        });

        if (!analyses || analyses.length === 0) {
          return Result.success(null); // Not found is a valid success case
        }

        const analysis = (analyses as unknown as AnalysisRecord[])[0];

        // Now get related data separately to avoid complex join issues
        const [
          { data: dailyEntries, error: dailyError },
          { data: analysisTotals, error: totalsError },
          { data: analysisFiles, error: filesError },
        ] = await Promise.all([
          this.supabase
            .from("daily_entries")
            .select("*")
            .eq("analysis_id", analysisId)
            .order("date", { ascending: true }),
          this.supabase.from("analysis_totals").select("*").eq("analysis_id", analysisId),
          this.supabase
            .from("analysis_files")
            .select("*")
            .eq("analysis_id", analysisId)
            .order("created_at", { ascending: true }),
        ]);

        if (dailyError) {
          console.warn("getAnalysisById - Daily entries error:", dailyError);
        }
        if (totalsError) {
          console.warn("getAnalysisById - Totals error:", totalsError);
        }
        if (filesError) {
          console.warn("getAnalysisById - Files error:", filesError);
        }

        // Construct the complete analysis object
        const analysisWithDetails: AnalysisWithDetails = {
          ...analysis,
          daily_entries: (dailyEntries as unknown as DailyEntryRecord[]) || [],
          analysis_totals:
            Array.isArray(analysisTotals) && analysisTotals.length > 0
              ? (analysisTotals[0] as unknown as AnalysisTotalRecord)
              : undefined,
          analysis_files: (analysisFiles as unknown as AnalysisFileRecord[]) || [],
        };

        return Result.success(analysisWithDetails);
      });
    } catch (error) {
      console.error("getAnalysisById - Unexpected error:", error);
      return Result.failure(
        new AppError("Failed to fetch analysis", ErrorCodes.DATABASE_CONNECTION_ERROR, 500, false, {
          analysisId,
          originalError: error instanceof Error ? error.message : "Unknown error",
        })
      );
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
      orderBy?: "created_at" | "updated_at" | "period_start";
      order?: "asc" | "desc";
    } = {}
  ): Promise<Result<PaginatedAnalysesResult>> {
    try {
      if (!userId?.trim()) {
        return Result.failure(
          new AppError("User ID is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
        );
      }

      // OPTIMIZATION: Build query to leverage idx_analyses_user_status_created index
      // Include all related data in single query to avoid N+1 problem
      // This reduces database round trips from 1+N*3 to just 1 query
      let query = this.supabase.from("analyses").select(`
          *,
          daily_entries(*),
          analysis_totals(*),
          analysis_files(*)
        `);

      // Apply user filter first (most selective)
      query = query.eq("user_id", userId);

      // Apply status filter next (if provided) to leverage composite index
      if (options.status) {
        query = query.eq("status", options.status);
      }

      // Apply search filters (less selective, applied after indexes)
      // Note: Search functionality requires client-side filtering or a custom RPC function
      // Skipping search for now to avoid type errors with Supabase query builder
      if (options.search) {
        console.warn("Search functionality is not yet implemented for analyses");
      }

      // Apply ordering (leverages index for created_at DESC)
      const orderBy = options.orderBy || "created_at";
      const order = options.order || "desc";
      query = query.order(orderBy, { ascending: order === "asc" });

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data: analyses, error, count } = await query;

      if (error) {
        return this.handleDatabaseError(error, "get user analyses");
      }

      return Result.success({
        data: (analyses as unknown as AnalysisWithDetails[]) || [],
        count: count || 0,
      });
    } catch (error) {
      return Result.failure(
        new AppError(
          "Failed to fetch user analyses",
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            userId,
            options,
            originalError: error instanceof Error ? error.message : "Unknown error",
          }
        )
      );
    }
  }

  /**
   * Delete analysis and all related data
   */
  async deleteAnalysis(analysisId: string): Promise<Result<void>> {
    try {
      if (!analysisId?.trim()) {
        return Result.failure(
          new AppError("Analysis ID is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
        );
      }

      // Delete in reverse dependency order
      await Promise.all([
        this.supabase.from("analysis_files").delete().eq("analysis_id", analysisId),
        this.supabase.from("analysis_totals").delete().eq("analysis_id", analysisId),
        this.supabase.from("daily_entries").delete().eq("analysis_id", analysisId),
      ]);

      const { error } = await this.supabase.from("analyses").delete().eq("id", analysisId);

      if (error) {
        return this.handleDatabaseError(error, "delete analysis");
      }

      return Result.success(undefined);
    } catch (error) {
      return Result.failure(
        new AppError(
          "Failed to delete analysis",
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            analysisId,
            originalError: error instanceof Error ? error.message : "Unknown error",
          }
        )
      );
    }
  }

  /**
   * Get analysis statistics for dashboard
   */
  async getAnalyticsData(userId: string): Promise<Result<AnalyticsData>> {
    try {
      if (!userId?.trim()) {
        return Result.failure(
          new AppError("User ID is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
        );
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [
        { data: totalAnalyses, error: totalError },
        { data: thisMonth, error: monthError },
        { data: avgData, error: avgError },
        { data: completionData, error: completionError },
      ] = await Promise.all([
        // Total analyses count
        this.supabase
          .from("analyses")
          .select("id")
          .eq("user_id", userId),

        // This month earnings
        this.supabase
          .from("analyses")
          .select("analysis_totals(expected_total)")
          .eq("user_id", userId)
          .eq("status", "completed")
          .gte("created_at", startOfMonth.toISOString()),

        // Average daily consignments
        this.supabase
          .from("analyses")
          .select("total_consignments, working_days")
          .eq("user_id", userId)
          .eq("status", "completed"),

        // Completion rate
        this.supabase
          .from("analyses")
          .select("status")
          .eq("user_id", userId),
      ]);

      if (totalError || monthError || avgError || completionError) {
        const firstError = totalError || monthError || avgError || completionError;
        return Result.failure(
          new AppError(
            "Failed to fetch analytics data",
            ErrorCodes.DATABASE_CONNECTION_ERROR,
            500,
            false,
            {
              userId,
              dbError: firstError?.message,
            }
          )
        );
      }

      // Calculate metrics
      const totalCount = (totalAnalyses as StringKeyObject[])?.length || 0;

      const monthlyEarnings =
        (thisMonth as StringKeyObject[])?.reduce((sum: number, analysis: StringKeyObject) => {
          const totals = analysis.analysis_totals as StringKeyObject[];
          return sum + ((totals?.[0]?.expected_total as number) || 0);
        }, 0) || 0;

      const avgConsignments = (avgData as StringKeyObject[])?.length
        ? (avgData as StringKeyObject[]).reduce((sum: number, analysis: StringKeyObject) => {
            const consignments = (analysis.total_consignments as number) || 0;
            const workingDays = (analysis.working_days as number) || 1;
            return sum + consignments / workingDays;
          }, 0) / (avgData as StringKeyObject[]).length
        : 0;

      const completedCount =
        (completionData as StringKeyObject[])?.filter(
          (a: StringKeyObject) => a.status === "completed"
        ).length || 0;
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return Result.success({
        totalAnalyses: totalCount,
        thisMonthEarnings: Math.round(monthlyEarnings * 100) / 100,
        avgDailyConsignments: Math.round(avgConsignments),
        completionRate,
      });
    } catch (error) {
      return Result.failure(
        new AppError(
          "Failed to fetch analytics data",
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            userId,
            originalError: error instanceof Error ? error.message : "Unknown error",
          }
        )
      );
    }
  }

  /**
   * Centralized database error handling
   */
  private handleDatabaseError(error: SupabaseError, operation: string): Result<never> {
    console.error(`Database error during ${operation}:`, error);

    // Handle specific PostgreSQL error codes
    switch (error.code) {
      case "23505": // Unique violation
        return Result.failure(
          new AppError("Duplicate entry detected", ErrorCodes.DATABASE_DUPLICATE_ENTRY, 409, true, {
            operation,
            dbError: error.message,
          })
        );

      case "23503": // Foreign key violation
        return Result.failure(
          new AppError(
            "Referenced record not found",
            ErrorCodes.DATABASE_CONSTRAINT_VIOLATION,
            400,
            true,
            { operation, dbError: error.message }
          )
        );

      case "23514": // Check constraint violation
        return Result.failure(
          new AppError(
            "Data validation failed",
            ErrorCodes.DATABASE_CONSTRAINT_VIOLATION,
            400,
            true,
            { operation, dbError: error.message }
          )
        );

      case "PGRST116": // Not found
        return Result.failure(
          new AppError("Record not found", ErrorCodes.DATABASE_NOT_FOUND, 404, true, { operation })
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
   * Checks both modern and legacy fingerprints for backward compatibility
   */
  async findAnalysisByFingerprint(
    userId: string,
    fingerprint: string,
    legacyFingerprint?: string
  ): Promise<Result<AnalysisRecord | null>> {
    try {
      if (!userId?.trim() || !fingerprint?.trim()) {
        return Result.failure(
          new AppError(
            "User ID and fingerprint are required",
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      // First, try exact match on primary fingerprint column
      const { data: analysis, error } = await this.supabase
        .from("analyses")
        .select("*")
        .eq("user_id", userId)
        .eq("fingerprint", fingerprint)
        .maybeSingle();

      if (error) {
        return this.handleDatabaseError(error, "find analysis by fingerprint");
      }

      // If found, return immediately
      if (analysis) {
        return Result.success(analysis as unknown as AnalysisRecord);
      }

      // If not found and we have a legacy fingerprint, check legacy fingerprint in metadata
      if (legacyFingerprint) {
        const { data: legacyAnalysis, error: legacyError } = await this.supabase
          .from("analyses")
          .select("*")
          .eq("user_id", userId)
          .eq("fingerprint", legacyFingerprint)
          .maybeSingle();

        if (legacyError) {
          return this.handleDatabaseError(legacyError, "find analysis by legacy fingerprint");
        }

        if (legacyAnalysis) {
          return Result.success(legacyAnalysis as unknown as AnalysisRecord);
        }
      }

      // Not found in either modern or legacy
      return Result.success(null);
    } catch (error) {
      return Result.failure(
        new AppError(
          "Failed to check for duplicate analysis",
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            userId,
            fingerprint,
            legacyFingerprint,
            originalError: error instanceof Error ? error.message : "Unknown error",
          }
        )
      );
    }
  }

  /**
   * Find analyses that overlap with a given date range
   * Used for detecting potential merge candidates when uploading new files
   *
   * @param userId - User ID to filter analyses
   * @param startDate - Start date of the range (DD/MM/YYYY format)
   * @param endDate - End date of the range (DD/MM/YYYY format)
   * @param options - Optional filters
   * @returns Array of overlapping analyses with full details
   */
  async findAnalysesByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
    options?: {
      excludeAnalysisId?: string;
      status?: AnalysisStatus[];
      includeDetails?: boolean;
    }
  ): Promise<Result<AnalysisWithDetails[]>> {
    try {
      if (!userId?.trim()) {
        return Result.failure(
          new AppError("User ID is required", ErrorCodes.VALIDATION_REQUIRED_FIELD, 400)
        );
      }

      if (!startDate?.trim() || !endDate?.trim()) {
        return Result.failure(
          new AppError(
            "Start date and end date are required",
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      // Convert DD/MM/YYYY to YYYY-MM-DD for database comparison
      const parseDate = (dateStr: string): string => {
        const parts = dateStr.split("/");
        if (parts.length !== 3) {
          throw new Error(`Invalid date format: ${dateStr}. Expected DD/MM/YYYY`);
        }
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      };

      const startISO = parseDate(startDate);
      const endISO = parseDate(endDate);

      // Build query to find overlapping analyses
      // Two date ranges overlap if: start1 <= end2 AND start2 <= end1
      let query = this.supabase
        .from("analyses")
        .select(`
          *,
          daily_entries(*),
          analysis_totals(*),
          analysis_files(*)
        `)
        .eq("user_id", userId)
        .lte("period_start", endISO)
        .gte("period_end", startISO);

      // Apply optional filters
      if (options?.excludeAnalysisId) {
        query = query.neq("id", options.excludeAnalysisId);
      }

      if (options?.status && options.status.length > 0) {
        query = query.in("status", options.status);
      }

      // Order by period_start (most recent first)
      query = query.order("period_start", { ascending: false });

      const { data: analyses, error } = await query;

      if (error) {
        return this.handleDatabaseError(error, "find analyses by date range");
      }

      return Result.success((analyses as unknown as AnalysisWithDetails[]) || []);
    } catch (error) {
      return Result.failure(
        new AppError(
          "Failed to find analyses by date range",
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            userId,
            startDate,
            endDate,
            options,
            originalError: error instanceof Error ? error.message : "Unknown error",
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
            "User ID, analysis ID, and entry date are required",
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      // First verify the analysis belongs to the user
      const { data: analysis, error: analysisError } = await this.supabase
        .from("analyses")
        .select("id")
        .eq("id", analysisId)
        .eq("user_id", userId)
        .single();

      if (analysisError || !analysis) {
        return Result.failure(
          new AppError("Analysis not found or access denied", ErrorCodes.ANALYSIS_NOT_FOUND, 404)
        );
      }

      // Update the daily entry
      const { error: updateError } = await this.supabase
        .from("daily_entries")
        .update(updateData)
        .eq("analysis_id", analysisId)
        .eq("date", entryDate);

      if (updateError) {
        return this.handleDatabaseError(updateError, "update daily entry");
      }

      return Result.success(undefined);
    } catch (error) {
      return Result.failure(
        new AppError(
          "Failed to update daily entry",
          ErrorCodes.DATABASE_CONNECTION_ERROR,
          500,
          false,
          {
            userId,
            analysisId,
            entryDate,
            originalError: error instanceof Error ? error.message : "Unknown error",
          }
        )
      );
    }
  }
}

// Export singleton instance
export const analysisRepository = new AnalysisRepository();
