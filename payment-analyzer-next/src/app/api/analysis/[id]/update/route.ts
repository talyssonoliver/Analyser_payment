import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { PDFProcessor } from '@/lib/infrastructure/pdf/pdf-processor';

// Type definitions
interface ProcessedEntry {
  date: string;
  consignments?: number;
  expectedAmount?: number;
  unloadingBonus?: number;
  attendanceBonus?: number;
  earlyBonus?: number;
  paid_amount?: number;
  type: 'runsheet' | 'invoice';
}


interface InvoicePaymentData {
  date: string;
  amount: number;
}

// Type guards for safe data handling
function isValidConsignmentData(data: unknown): data is Record<string, number> {
  return typeof data === 'object' && data !== null &&
    Object.entries(data).every(([key, value]) =>
      typeof key === 'string' && typeof value === 'number'
    );
}

function isValidPaymentsArray(data: unknown): data is InvoicePaymentData[] {
  return Array.isArray(data) && data.every((item: unknown) =>
    typeof item === 'object' && item !== null &&
    'date' in item && typeof (item as Record<string, unknown>).date === 'string' &&
    'amount' in item && typeof (item as Record<string, unknown>).amount === 'number'
  );
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

// Request validation schema
const updateAnalysisSchema = z.object({
  files: z.array(z.object({
    name: z.string(),
    type: z.enum(['runsheet', 'invoice']),
    content: z.string(), // Base64 encoded
  })),
  mergeStrategy: z.enum(['add', 'replace', 'max', 'smart']).default('smart'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = updateAnalysisSchema.parse(body);

    // Check if analysis exists and belongs to user
    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('*, daily_entries(*)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Check if analysis is locked
    if (analysis.is_locked) {
      return NextResponse.json(
        { error: 'Analysis is locked and cannot be updated' },
        { status: 403 }
      );
    }

    // Process files
    const pdfProcessor = new PDFProcessor();
    const processedEntries: ProcessedEntry[] = [];

    for (const file of validatedData.files) {
      // Convert base64 to ArrayBuffer
      const binaryString = atob(file.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // Process file based on type
      if (file.type === 'runsheet') {
        const runsheetData = await pdfProcessor.processRunsheet(arrayBuffer, file.name);

        // Validate runsheet data structure
        if (!runsheetData || !isValidConsignmentData(runsheetData.consignments)) {
          console.warn(`Invalid runsheet data structure for file ${file.name}`);
          continue;
        }

        // Process consignments data manually since we can't access private method
        const consignmentEntries: ProcessedEntry[] = [];
        for (const [dateStr, countValue] of Object.entries(runsheetData.consignments)) {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) continue;

          const count = Number(countValue);
          if (isNaN(count)) continue;

          const dayOfWeek = date.getDay();
          const rate = dayOfWeek === 6 ? analysis.payment_rules.saturdayRate : analysis.payment_rules.weekdayRate;
          const expectedAmount = count * rate;

          // Calculate bonuses based on day of week
          const unloadingBonus = (dayOfWeek !== 0 && dayOfWeek !== 1) ? analysis.payment_rules.unloadingBonus : 0;
          const attendanceBonus = (dayOfWeek >= 1 && dayOfWeek <= 5) ? analysis.payment_rules.attendanceBonus : 0;
          const earlyBonus = (dayOfWeek >= 1 && dayOfWeek <= 5) ? analysis.payment_rules.earlyBonus : 0;

          consignmentEntries.push({
            date: dateStr,
            consignments: count,
            expectedAmount,
            unloadingBonus,
            attendanceBonus,
            earlyBonus,
            type: 'runsheet' as const
          });
        }

        processedEntries.push(...consignmentEntries);
      } else if (file.type === 'invoice') {
        const invoiceData = await pdfProcessor.processInvoice(arrayBuffer, file.name);

        // Validate invoice data structure
        if (!invoiceData || !isValidPaymentsArray(invoiceData.payments)) {
          console.warn(`Invalid invoice data structure for file ${file.name}`);
          continue;
        }

        const invoiceEntries = invoiceData.payments.map((payment: InvoicePaymentData) => ({
          date: payment.date,
          paid_amount: payment.amount,
          type: 'invoice' as const
        }));

        processedEntries.push(...invoiceEntries);
      }

      // Log file processing
      await supabase.from('analysis_file_processing_log').insert({
        analysis_id: params.id,
        file_id: crypto.randomUUID(), // You might want to save the file first
        user_id: user.id,
        file_type: file.type,
        entries_affected: processedEntries.length,
        processing_notes: { file_name: file.name }
      });
    }

    // Group entries by date
    const entriesByDate = processedEntries.reduce((acc: Record<string, ProcessedEntry[]>, entry: ProcessedEntry) => {
      const dateStr = new Date(entry.date).toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(entry);
      return acc;
    }, {} as Record<string, ProcessedEntry[]>);

    // Update entries based on merge strategy
    let updatedCount = 0;
    let createdCount = 0;

    for (const [dateStr, entries] of Object.entries(entriesByDate)) {
      const existingEntry = analysis.daily_entries.find(
        (e: DailyEntry) => new Date(e.date).toISOString().split('T')[0] === dateStr
      );

      if (existingEntry) {
        // Update existing entry
        const runsheetEntry = entries.find(e => e.type === 'runsheet');
        const invoiceEntries = entries.filter(e => e.type === 'invoice');
        
        const updates: Partial<DailyEntry> = {};

        if (runsheetEntry) {
          updates.consignments = runsheetEntry.consignments;
          updates.expected_amount = runsheetEntry.expectedAmount?.toString();
          updates.unloading_bonus = (runsheetEntry.unloadingBonus ?? 0) > 0;
          updates.attendance_bonus = (runsheetEntry.attendanceBonus ?? 0) > 0;
          updates.early_bonus = (runsheetEntry.earlyBonus ?? 0) > 0;
        }

        if (invoiceEntries.length > 0) {
          const totalInvoiceAmount = invoiceEntries.reduce((sum: number, e: ProcessedEntry) => sum + (e.paid_amount || 0), 0);
          
          switch (validatedData.mergeStrategy) {
            case 'replace':
              updates.paid_amount = totalInvoiceAmount.toString();
              break;
            case 'add':
              updates.paid_amount = (parseFloat(existingEntry.paid_amount) + totalInvoiceAmount).toString();
              break;
            case 'max':
              updates.paid_amount = Math.max(parseFloat(existingEntry.paid_amount), totalInvoiceAmount).toString();
              break;
            case 'smart':
              // Smart strategy: replace if same day, add if different times
              updates.paid_amount = (invoiceEntries.length === 1 
                ? totalInvoiceAmount 
                : parseFloat(existingEntry.paid_amount) + totalInvoiceAmount).toString();
              break;
          }
        }

        // Calculate difference
        const expectedAmount = typeof updates.expected_amount === 'string' ? parseFloat(updates.expected_amount) : parseFloat(existingEntry.expected_amount);
        const paidAmount = typeof updates.paid_amount === 'string' ? parseFloat(updates.paid_amount) : parseFloat(existingEntry.paid_amount);
        updates.difference = (expectedAmount - paidAmount).toString();

        await supabase
          .from('daily_entries')
          .update(updates)
          .eq('id', existingEntry.id);

        updatedCount++;
      } else {
        // Create new entry
        const runsheetEntry = entries.find(e => e.type === 'runsheet');
        const invoiceEntries = entries.filter(e => e.type === 'invoice');
        
        const expectedAmount = runsheetEntry?.expectedAmount || 0;
        const paidAmount = invoiceEntries.reduce((sum: number, e: ProcessedEntry) => sum + (e.paid_amount || 0), 0);
        
        const newEntry = {
          analysis_id: params.id,
          user_id: user.id,
          date: dateStr,
          consignments: runsheetEntry?.consignments || 0,
          expected_amount: expectedAmount.toString(),
          paid_amount: paidAmount.toString(),
          difference: (expectedAmount - paidAmount).toString(),
          unloading_bonus: (runsheetEntry?.unloadingBonus ?? 0) > 0,
          attendance_bonus: (runsheetEntry?.attendanceBonus ?? 0) > 0,
          early_bonus: (runsheetEntry?.earlyBonus ?? 0) > 0,
          payment_merge_strategy: validatedData.mergeStrategy
        };

        await supabase
          .from('daily_entries')
          .insert(newEntry);

        createdCount++;
      }
    }

    // Update analysis metadata
    await supabase
      .from('analyses')
      .update({
        last_updated_at: new Date().toISOString(),
        update_count: analysis.update_count + 1
      })
      .eq('id', params.id);

    // Recalculate totals
    const { data: updatedEntries } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('analysis_id', params.id);

    if (updatedEntries) {
      const totals = updatedEntries.reduce((acc: TotalsAccumulator, entry: DailyEntry) => ({
        totalConsignments: acc.totalConsignments + entry.consignments,
        totalExpected: acc.totalExpected + parseFloat(entry.expected_amount),
        totalPaid: acc.totalPaid + parseFloat(entry.paid_amount),
        totalDifference: acc.totalDifference + parseFloat(entry.difference),
        totalBonuses: acc.totalBonuses + 
          (entry.unloading_bonus ? 30 : 0) +
          (entry.attendance_bonus ? 25 : 0) +
          (entry.early_bonus ? 50 : 0),
      }), {
        totalConsignments: 0,
        totalExpected: 0,
        totalPaid: 0,
        totalDifference: 0,
        totalBonuses: 0,
      } as TotalsAccumulator);

      await supabase
        .from('analysis_totals')
        .update(totals)
        .eq('analysis_id', params.id);
    }

    return NextResponse.json({
      success: true,
      updatedEntries: updatedCount,
      createdEntries: createdCount,
      totalProcessed: updatedCount + createdCount,
      analysisId: params.id
    });

  } catch (error) {
    console.error('Error updating analysis:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update analysis' },
      { status: 500 }
    );
  }
}