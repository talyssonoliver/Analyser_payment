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

async function queryWeek30Data() {
  console.log('🔍 Querying data for Week 30 (Jul 21-27, 2025)...\n');

  // Query analyses that overlap with Week 30
  const { data: analyses, error } = await supabase
    .from('analyses')
    .select('id, period_start, period_end, status, source, working_days, total_consignments, daily_entries(date, consignments, expected_total, paid_amount)')
    .or('and(period_start.lte.2025-07-27,period_end.gte.2025-07-21)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Found ${analyses?.length || 0} analyses overlapping Week 30\n`);

  if (!analyses || analyses.length === 0) {
    console.log('No data found for Week 30');
    return;
  }

  let grandTotal = { consignments: 0, expected: 0, paid: 0 };

  analyses.forEach((analysis, idx) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Analysis ${idx + 1}`);
    console.log(`ID: ${analysis.id}`);
    console.log(`Status: ${analysis.status}, Source: ${analysis.source}`);
    console.log(`Date Range: ${analysis.period_start} to ${analysis.period_end}`);
    console.log(`Working Days: ${analysis.working_days}, Total Consignments: ${analysis.total_consignments}`);
    console.log(`Daily Entries: ${analysis.daily_entries?.length || 0}`);

    if (analysis.daily_entries && analysis.daily_entries.length > 0) {
      // Filter entries to only Week 30
      const weekEntries = analysis.daily_entries.filter(entry => {
        const d = new Date(entry.date);
        return d >= new Date('2025-07-21') && d <= new Date('2025-07-27');
      });

      if (weekEntries.length > 0) {
        console.log(`\nEntries in Week 30 (${weekEntries.length} days):`);
        weekEntries.forEach(entry => {
          console.log(`\n  📅 ${entry.date}:`);
          console.log(`     Consignments: ${entry.consignments || 0}`);
          console.log(`     Expected Total: £${(entry.expected_total || 0).toFixed(2)}`);
          console.log(`     Paid Amount: £${(entry.paid_amount || 0).toFixed(2)}`);

          // Add to grand total
          grandTotal.consignments += (entry.consignments || 0);
          grandTotal.expected += (entry.expected_total || 0);
          grandTotal.paid += (entry.paid_amount || 0);
        });

        const totals = weekEntries.reduce((acc, entry) => ({
          consignments: acc.consignments + (entry.consignments || 0),
          expected: acc.expected + (entry.expected_total || 0),
          paid: acc.paid + (entry.paid_amount || 0)
        }), { consignments: 0, expected: 0, paid: 0 });

        console.log(`\n  📈 This Analysis - Week 30 Subtotal:`);
        console.log(`     Total Consignments: ${totals.consignments}`);
        console.log(`     Total Expected: £${totals.expected.toFixed(2)}`);
        console.log(`     Total Paid: £${totals.paid.toFixed(2)}`);
      } else {
        console.log('\n  (No entries in Week 30 date range)');
      }
    }
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n🎯 GRAND TOTAL - Week 30 (All Analyses Combined):`);
  console.log(`   Total Consignments: ${grandTotal.consignments}`);
  console.log(`   Total Expected: £${grandTotal.expected.toFixed(2)}`);
  console.log(`   Total Paid: £${grandTotal.paid.toFixed(2)}`);
  console.log(`\n${'='.repeat(60)}\n`);
}

queryWeek30Data().catch(console.error);
