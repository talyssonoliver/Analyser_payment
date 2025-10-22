import type { SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FileFingerprintService } from "@/lib/domain/services/file-fingerprint-service";
import { PDFProcessor } from "@/lib/infrastructure/pdf/pdf-processor";
import { createClient } from "@/lib/supabase/server";

// Type definitions
interface ProcessedEntry {
  date: string;
  consignments?: number;
  expectedAmount?: number;
  unloadingBonus?: number;
  attendanceBonus?: number;
  earlyBonus?: number;
  paid_amount?: number;
  type: "runsheet" | "invoice";
}

interface InvoicePaymentData {
  date: string;
  amount: number;
}

interface TotalsAccumulator {
  totalConsignments: number;
  totalExpected: number;
  totalPaid: number;
  totalDifference: number;
  totalBonuses: number;
  unloadingBonusTotal: number;
  attendanceBonusTotal: number;
  earlyBonusTotal: number;
}

interface DailyEntry {
  id: string;
  date: string;
  consignments: number;
  expected_amount: string;
  paid_amount: string;
  difference: string;
  unloading_bonus: boolean;
  attendance_bonus: boolean;
  early_bonus: boolean;
}

interface PaymentRules {
  weekdayRate: number;
  saturdayRate: number;
  unloadingBonus: number;
  attendanceBonus: number;
  earlyBonus: number;
}

interface FileData {
  name: string;
  type: "runsheet" | "invoice";
  content: string;
  size: number;
  fingerprint: string;
}

interface MergeResult {
  success: boolean;
  analysisId: string;
  message: string;
  updatedTotals?: {
    totalConsignments: number;
    totalExpected: number;
    totalPaid: number;
    totalDifference: number;
    totalBonuses: number;
  };
  error?: string;
}

// Request validation schema
const mergeFilesSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(["runsheet", "invoice"]),
        content: z.string(), // Base64 encoded
        size: z.number().positive(),
      })
    )
    .min(1, "At least one file is required"),
  mergeStrategy: z.enum(["add", "replace", "max", "smart"]).default("smart"),
});

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const _ALLOWED_MIME_TYPES = ["application/pdf"]; // Reserved for future validation

// Type guards for safe data handling
function isValidConsignmentData(data: unknown): data is Record<string, number> {
  return (
    typeof data === "object" &&
    data !== null &&
    Object.entries(data).every(
      ([key, value]) => typeof key === "string" && typeof value === "number"
    )
  );
}

function isValidPaymentsArray(data: unknown): data is InvoicePaymentData[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        "date" in item &&
        typeof (item as Record<string, unknown>).date === "string" &&
        "amount" in item &&
        typeof (item as Record<string, unknown>).amount === "number"
    )
  );
}

// Helper functions

/**
 * Converts base64 string to ArrayBuffer for PDF processing
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Calculate bonuses based on day of week
 */
function calculateBonuses(
  dayOfWeek: number,
  paymentRules: PaymentRules
): {
  unloadingBonus: number;
  attendanceBonus: number;
  earlyBonus: number;
} {
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isEligibleForUnloading = dayOfWeek !== 0 && dayOfWeek !== 1;

  return {
    unloadingBonus: isEligibleForUnloading ? paymentRules.unloadingBonus : 0,
    attendanceBonus: isWeekday ? paymentRules.attendanceBonus : 0,
    earlyBonus: isWeekday ? paymentRules.earlyBonus : 0,
  };
}

/**
 * Process a single consignment date entry
 */
function processConsignmentEntry(
  dateStr: string,
  countValue: number,
  paymentRules: PaymentRules
): ProcessedEntry | null {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;

  const count = Number(countValue);
  if (Number.isNaN(count)) return null;

  const dayOfWeek = date.getDay();
  const rate = dayOfWeek === 6 ? paymentRules.saturdayRate : paymentRules.weekdayRate;
  const expectedAmount = count * rate;

  const bonuses = calculateBonuses(dayOfWeek, paymentRules);

  return {
    date: dateStr,
    consignments: count,
    expectedAmount,
    ...bonuses,
    type: "runsheet",
  };
}

/**
 * Processes a single runsheet file and returns processed entries
 */
async function processRunsheetFile(
  pdfProcessor: PDFProcessor,
  file: FileData,
  paymentRules: PaymentRules
): Promise<ProcessedEntry[]> {
  const arrayBuffer = base64ToArrayBuffer(file.content);
  const runsheetData = await pdfProcessor.processRunsheet(arrayBuffer, file.name);

  if (!runsheetData || !isValidConsignmentData(runsheetData.consignments)) {
    console.warn(`Invalid runsheet data structure for file ${file.name}`);
    return [];
  }

  const entries: ProcessedEntry[] = [];
  for (const [dateStr, countValue] of Object.entries(runsheetData.consignments)) {
    const entry = processConsignmentEntry(dateStr, countValue, paymentRules);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Processes a single invoice file and returns processed entries
 */
async function processInvoiceFile(
  pdfProcessor: PDFProcessor,
  file: FileData
): Promise<ProcessedEntry[]> {
  const arrayBuffer = base64ToArrayBuffer(file.content);
  const invoiceData = await pdfProcessor.processInvoice(arrayBuffer, file.name);

  if (!invoiceData || !isValidPaymentsArray(invoiceData.payments)) {
    console.warn(`Invalid invoice data structure for file ${file.name}`);
    return [];
  }

  return invoiceData.payments.map((payment: InvoicePaymentData) => ({
    date: payment.date,
    paid_amount: payment.amount,
    type: "invoice" as const,
  }));
}

/**
 * Groups processed entries by date
 */
function groupEntriesByDate(entries: ProcessedEntry[]): Record<string, ProcessedEntry[]> {
  return entries.reduce((acc: Record<string, ProcessedEntry[]>, entry: ProcessedEntry) => {
    const dateStr = new Date(entry.date).toISOString().split("T")[0];
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(entry);
    return acc;
  }, {});
}

/**
 * Calculates paid amount based on merge strategy
 */
function calculateMergedPaidAmount(
  existingAmount: string,
  newAmount: number,
  mergeStrategy: string,
  invoiceCount: number
): string {
  switch (mergeStrategy) {
    case "replace":
      return newAmount.toString();
    case "add":
      return (parseFloat(existingAmount) + newAmount).toString();
    case "max":
      return Math.max(parseFloat(existingAmount), newAmount).toString();
    case "smart":
      return (invoiceCount === 1 ? newAmount : parseFloat(existingAmount) + newAmount).toString();
    default:
      return newAmount.toString();
  }
}

/**
 * Updates an existing daily entry with new data
 */
async function updateExistingEntry(
  supabase: SupabaseClient,
  existingEntry: DailyEntry,
  entries: ProcessedEntry[],
  mergeStrategy: string
): Promise<void> {
  const runsheetEntry = entries.find((e) => e.type === "runsheet");
  const invoiceEntries = entries.filter((e) => e.type === "invoice");
  const updates: Partial<DailyEntry> = {};

  if (runsheetEntry) {
    updates.consignments = runsheetEntry.consignments;
    updates.expected_amount = runsheetEntry.expectedAmount?.toString();
    updates.unloading_bonus = (runsheetEntry.unloadingBonus ?? 0) > 0;
    updates.attendance_bonus = (runsheetEntry.attendanceBonus ?? 0) > 0;
    updates.early_bonus = (runsheetEntry.earlyBonus ?? 0) > 0;
  }

  if (invoiceEntries.length > 0) {
    const totalInvoiceAmount = invoiceEntries.reduce(
      (sum: number, e: ProcessedEntry) => sum + (e.paid_amount || 0),
      0
    );
    updates.paid_amount = calculateMergedPaidAmount(
      existingEntry.paid_amount,
      totalInvoiceAmount,
      mergeStrategy,
      invoiceEntries.length
    );
  }

  const expectedAmount =
    typeof updates.expected_amount === "string"
      ? parseFloat(updates.expected_amount)
      : parseFloat(existingEntry.expected_amount);
  const paidAmount =
    typeof updates.paid_amount === "string"
      ? parseFloat(updates.paid_amount)
      : parseFloat(existingEntry.paid_amount);
  updates.difference = (expectedAmount - paidAmount).toString();

  await supabase.from("daily_entries").update(updates).eq("id", existingEntry.id);
}

/**
 * Creates a new daily entry from processed data
 */
async function createNewEntry(
  supabase: SupabaseClient,
  analysisId: string,
  _userId: string,
  dateStr: string,
  entries: ProcessedEntry[],
  _mergeStrategy: string
): Promise<void> {
  const runsheetEntry = entries.find((e) => e.type === "runsheet");
  const invoiceEntries = entries.filter((e) => e.type === "invoice");

  const expectedAmount = runsheetEntry?.expectedAmount || 0;
  const paidAmount = invoiceEntries.reduce(
    (sum: number, e: ProcessedEntry) => sum + (e.paid_amount || 0),
    0
  );

  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();

  const newEntry = {
    analysis_id: analysisId,
    date: dateStr,
    day_of_week: dayOfWeek,
    consignments: runsheetEntry?.consignments || 0,
    rate:
      runsheetEntry?.expectedAmount && runsheetEntry.consignments
        ? runsheetEntry.expectedAmount / runsheetEntry.consignments
        : 0,
    base_payment: expectedAmount,
    pickups: 0,
    pickup_total: 0,
    expected_total: expectedAmount.toString(),
    paid_amount: paidAmount.toString(),
    difference: (expectedAmount - paidAmount).toString(),
    unloading_bonus: runsheetEntry?.unloadingBonus || 0,
    attendance_bonus: runsheetEntry?.attendanceBonus || 0,
    early_bonus: runsheetEntry?.earlyBonus || 0,
    status:
      expectedAmount === paidAmount
        ? "balanced"
        : paidAmount > expectedAmount
          ? "overpaid"
          : "underpaid",
  };

  await supabase.from("daily_entries").insert(newEntry);
}

/**
 * Recalculates and updates analysis totals
 */
async function updateAnalysisTotals(
  supabase: SupabaseClient,
  analysisId: string
): Promise<TotalsAccumulator> {
  const { data: updatedEntries } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("analysis_id", analysisId);

  if (!updatedEntries || !Array.isArray(updatedEntries)) {
    throw new Error("Failed to fetch updated entries");
  }

  // Calculate totals
  const totals = (updatedEntries as unknown as DailyEntry[]).reduce(
    (acc: TotalsAccumulator, entry: DailyEntry) => ({
      totalConsignments: acc.totalConsignments + entry.consignments,
      totalExpected: acc.totalExpected + parseFloat(entry.expected_amount),
      totalPaid: acc.totalPaid + parseFloat(entry.paid_amount),
      totalDifference: acc.totalDifference + parseFloat(entry.difference),
      totalBonuses:
        acc.totalBonuses +
        (entry.unloading_bonus ? 30 : 0) +
        (entry.attendance_bonus ? 25 : 0) +
        (entry.early_bonus ? 50 : 0),
      unloadingBonusTotal: acc.unloadingBonusTotal + (entry.unloading_bonus ? 30 : 0),
      attendanceBonusTotal: acc.attendanceBonusTotal + (entry.attendance_bonus ? 25 : 0),
      earlyBonusTotal: acc.earlyBonusTotal + (entry.early_bonus ? 50 : 0),
    }),
    {
      totalConsignments: 0,
      totalExpected: 0,
      totalPaid: 0,
      totalDifference: 0,
      totalBonuses: 0,
      unloadingBonusTotal: 0,
      attendanceBonusTotal: 0,
      earlyBonusTotal: 0,
    }
  );

  // Update analysis_totals table
  await supabase
    .from("analysis_totals")
    .update({
      expected_total: totals.totalExpected,
      paid_total: totals.totalPaid,
      difference_total: totals.totalDifference,
      bonus_total: totals.totalBonuses,
      unloading_bonus_total: totals.unloadingBonusTotal,
      attendance_bonus_total: totals.attendanceBonusTotal,
      early_bonus_total: totals.earlyBonusTotal,
    })
    .eq("analysis_id", analysisId);

  return totals;
}

/**
 * Log file merge to database
 */
async function logFileMerge(
  supabase: SupabaseClient,
  analysisId: string,
  files: FileData[]
): Promise<void> {
  const fileRecords = files.map((file) => ({
    analysis_id: analysisId,
    original_name: file.name,
    file_size: file.size,
    file_hash: file.fingerprint,
    file_fingerprint: file.fingerprint,
    mime_type: "application/pdf",
    file_type: file.type,
    storage_path: `analyses/${analysisId}/${Date.now()}_${file.name}`,
    uploaded_at: new Date().toISOString(),
  }));

  await supabase.from("analysis_files").insert(fileRecords);
}

/**
 * POST /api/analysis/[id]/merge - Merge files into existing analysis
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const validatedData = mergeFilesSchema.parse(body);

    // Validate file sizes
    for (const file of validatedData.files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File ${file.name} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          },
          { status: 400 }
        );
      }
    }

    // Check if analysis exists and belongs to user
    const { data: analysis, error: fetchError } = await supabase
      .from("analyses")
      .select("*, daily_entries(*), payment_rules:rules_version(*)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json(
        {
          error: "Analysis not found or access denied",
        },
        { status: 404 }
      );
    }

    // Check if analysis is locked
    if (analysis.status === "error") {
      return NextResponse.json(
        {
          error: "Cannot merge files into an analysis with error status",
        },
        { status: 403 }
      );
    }

    // Generate fingerprints for duplicate detection
    const fingerprintService = new FileFingerprintService();
    const filesWithFingerprints: FileData[] = await Promise.all(
      validatedData.files.map(async (file): Promise<FileData> => {
        const fingerprintResult = await fingerprintService.createFingerprint([
          {
            name: file.name,
            size: file.size,
            lastModified: Date.now(),
          },
        ]);
        return {
          name: file.name,
          type: file.type,
          content: file.content,
          size: file.size,
          fingerprint: fingerprintResult.fingerprint,
        };
      })
    );

    // Check for duplicate files
    const { data: existingFiles } = await supabase
      .from("analysis_files")
      .select("file_fingerprint, original_name")
      .eq("analysis_id", params.id);

    if (existingFiles) {
      const existingFingerprints = new Set(
        existingFiles.map((f: { file_fingerprint: string }) => f.file_fingerprint)
      );
      const duplicates = filesWithFingerprints.filter((f: FileData) =>
        existingFingerprints.has(f.fingerprint)
      );

      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            error: `Duplicate files detected: ${duplicates.map((f: FileData) => f.name).join(", ")}. These files have already been processed in this analysis.`,
          },
          { status: 400 }
        );
      }
    }

    // Process all files
    const pdfProcessor = new PDFProcessor();
    const processedEntries: ProcessedEntry[] = [];

    for (const file of filesWithFingerprints) {
      const fileEntries =
        file.type === "runsheet"
          ? await processRunsheetFile(
              pdfProcessor,
              file,
              analysis.payment_rules || {
                weekdayRate: 4.1,
                saturdayRate: 5.9,
                unloadingBonus: 30,
                attendanceBonus: 25,
                earlyBonus: 50,
              }
            )
          : await processInvoiceFile(pdfProcessor, file);

      processedEntries.push(...fileEntries);
    }

    if (processedEntries.length === 0) {
      return NextResponse.json(
        {
          error: "No valid entries could be extracted from the provided files",
        },
        { status: 400 }
      );
    }

    // Group entries by date and update/create entries
    const entriesByDate = groupEntriesByDate(processedEntries);
    let updatedCount = 0;
    let createdCount = 0;

    for (const [dateStr, entries] of Object.entries(entriesByDate)) {
      const existingEntry = analysis.daily_entries.find(
        (e: DailyEntry) => new Date(e.date).toISOString().split("T")[0] === dateStr
      );

      if (existingEntry) {
        await updateExistingEntry(supabase, existingEntry, entries, validatedData.mergeStrategy);
        updatedCount++;
      } else {
        await createNewEntry(
          supabase,
          params.id,
          user.id,
          dateStr,
          entries,
          validatedData.mergeStrategy
        );
        createdCount++;
      }
    }

    // Update analysis metadata
    await supabase
      .from("analyses")
      .update({
        updated_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", params.id);

    // Recalculate totals
    const updatedTotals = await updateAnalysisTotals(supabase, params.id);

    // Log merged files
    await logFileMerge(supabase, params.id, filesWithFingerprints);

    const response: MergeResult = {
      success: true,
      analysisId: params.id,
      message: `Successfully merged ${validatedData.files.length} file(s). Updated ${updatedCount} existing entries, created ${createdCount} new entries.`,
      updatedTotals: {
        totalConsignments: updatedTotals.totalConsignments,
        totalExpected: updatedTotals.totalExpected,
        totalPaid: updatedTotals.totalPaid,
        totalDifference: updatedTotals.totalDifference,
        totalBonuses: updatedTotals.totalBonuses,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error merging files into analysis:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to merge files into analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
