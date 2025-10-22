import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryJuly2025Data() {
  console.log('🔍 Querying ALL data for July 2025...\n');

  // Query all analyses in July 2025
  const { data: analyses, error } = await supabase
    .from('analyses')
    .select('id, period_start, period_end, status, source, working_days, total_consignments, created_at, daily_entries(date, consignments, expected_total, paid_amount)')
    .or('and(period_start.lte.2025-07-31,period_end.gte.2025-07-01)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Found ${analyses?.length || 0} analyses in July 2025\n`);

  if (!analyses || analyses.length === 0) {
    console.log('No data found for July 2025');
    return;
  }

  analyses.forEach((analysis, idx) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Analysis ${idx + 1}`);
    console.log(`ID: ${analysis.id}`);
    console.log(`Status: ${analysis.status}, Source: ${analysis.source}`);
    console.log(`Date Range: ${analysis.period_start} to ${analysis.period_end}`);
    console.log(`Created: ${analysis.created_at}`);
    console.log(`Working Days: ${analysis.working_days}, Total Consignments: ${analysis.total_consignments}`);
    console.log(`Daily Entries: ${analysis.daily_entries?.length || 0}`);

    if (analysis.daily_entries && analysis.daily_entries.length > 0) {
      console.log(`\nDaily Entries:`);
      analysis.daily_entries.forEach(entry => {
        console.log(`  📅 ${entry.date}: consignments=${entry.consignments}, expected=£${(entry.expected_total || 0).toFixed(2)}, paid=£${(entry.paid_amount || 0).toFixed(2)}`);
      });

      const totals = analysis.daily_entries.reduce((acc, entry) => ({
        consignments: acc.consignments + (entry.consignments || 0),
        expected: acc.expected + (entry.expected_total || 0),
        paid: acc.paid + (entry.paid_amount || 0)
      }), { consignments: 0, expected: 0, paid: 0 });

      console.log(`\n  📈 Analysis Totals:`);
      console.log(`     Total Consignments: ${totals.consignments}`);
      console.log(`     Total Expected: £${totals.expected.toFixed(2)}`);
      console.log(`     Total Paid: £${totals.paid.toFixed(2)}`);
    }
  });

  console.log(`\n${'='.repeat(60)}\n`);
}

queryJuly2025Data().catch(console.error);
