import type { SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
}

// Request validation schema
const updateAnalysisSchema = z.object({
  files: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["runsheet", "invoice"]),
      content: z.string(), // Base64 encoded
    })
  ),
  mergeStrategy: z.enum(["add", "replace", "max", "smart"]).default("smart"),
});

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

// Helper functions to reduce cognitive complexity

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
 * Logs file processing to the database
 */
async function logFileProcessing(
  supabase: SupabaseClient,
  analysisId: string,
  userId: string,
  file: FileData,
  entriesCount: number
): Promise<void> {
  await supabase.from("analysis_file_processing_log").insert({
    analysis_id: analysisId,
    file_id: crypto.randomUUID(),
    user_id: userId,
    file_type: file.type,
    entries_affected: entriesCount,
    processing_notes: { file_name: file.name },
  });
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
  userId: string,
  dateStr: string,
  entries: ProcessedEntry[],
  mergeStrategy: string
): Promise<void> {
  const runsheetEntry = entries.find((e) => e.type === "runsheet");
  const invoiceEntries = entries.filter((e) => e.type === "invoice");

  const expectedAmount = runsheetEntry?.expectedAmount || 0;
  const paidAmount = invoiceEntries.reduce(
    (sum: number, e: ProcessedEntry) => sum + (e.paid_amount || 0),
    0
  );

  const newEntry = {
    analysis_id: analysisId,
    user_id: userId,
    date: dateStr,
    consignments: runsheetEntry?.consignments || 0,
    expected_amount: expectedAmount.toString(),
    paid_amount: paidAmount.toString(),
    difference: (expectedAmount - paidAmount).toString(),
    unloading_bonus: (runsheetEntry?.unloadingBonus ?? 0) > 0,
    attendance_bonus: (runsheetEntry?.attendanceBonus ?? 0) > 0,
    early_bonus: (runsheetEntry?.earlyBonus ?? 0) > 0,
    payment_merge_strategy: mergeStrategy,
  };

  await supabase.from("daily_entries").insert(newEntry);
}

/**
 * Recalculates and updates analysis totals
 */
async function updateAnalysisTotals(supabase: SupabaseClient, analysisId: string): Promise<void> {
  const { data: updatedEntries } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("analysis_id", analysisId);

  if (!updatedEntries || !Array.isArray(updatedEntries)) return;

  // Type assertion is safe here as we're querying the daily_entries table directly
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
    }),
    {
      totalConsignments: 0,
      totalExpected: 0,
      totalPaid: 0,
      totalDifference: 0,
      totalBonuses: 0,
    }
  );

  await supabase.from("analysis_totals").update(totals).eq("analysis_id", analysisId);
}

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
    const validatedData = updateAnalysisSchema.parse(body);

    // Check if analysis exists and belongs to user
    const { data: analysis, error: fetchError } = await supabase
      .from("analyses")
      .select("*, daily_entries(*)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    if (analysis.is_locked) {
      return NextResponse.json(
        { error: "Analysis is locked and cannot be updated" },
        { status: 403 }
      );
    }

    // Process all files
    const pdfProcessor = new PDFProcessor();
    const processedEntries: ProcessedEntry[] = [];

    for (const file of validatedData.files) {
      const fileEntries =
        file.type === "runsheet"
          ? await processRunsheetFile(pdfProcessor, file, analysis.payment_rules)
          : await processInvoiceFile(pdfProcessor, file);

      processedEntries.push(...fileEntries);
      await logFileProcessing(supabase, params.id, user.id, file, fileEntries.length);
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
        last_updated_at: new Date().toISOString(),
        update_count: analysis.update_count + 1,
      })
      .eq("id", params.id);

    // Recalculate totals
    await updateAnalysisTotals(supabase, params.id);

    return NextResponse.json({
      success: true,
      updatedEntries: updatedCount,
      createdEntries: createdCount,
      totalProcessed: updatedCount + createdCount,
      analysisId: params.id,
    });
  } catch (error) {
    console.error("Error updating analysis:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to update analysis" }, { status: 500 });
  }
}
