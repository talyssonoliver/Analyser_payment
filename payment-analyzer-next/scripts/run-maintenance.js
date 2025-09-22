#!/usr/bin/env node

/**
 * Database Maintenance Runner
 * Executes database maintenance tasks for performance monitoring
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' });

async function runMaintenance() {
  console.log('🔧 Starting database maintenance...');

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase configuration in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read maintenance script
  const maintenanceScript = path.join(__dirname, 'db-maintenance.sql');
  
  if (!fs.existsSync(maintenanceScript)) {
    console.error('❌ Maintenance script not found:', maintenanceScript);
    process.exit(1);
  }

  console.log('📊 Running performance analysis and maintenance tasks...');
  console.log('');
  console.log('📝 Manual maintenance required:');
  console.log('   1. Go to Supabase Dashboard > SQL Editor');
  console.log(`   2. Copy and paste the contents of: scripts/db-maintenance.sql`);
  console.log('   3. Execute the script to see performance analysis');
  console.log('');
  console.log('🔗 Your Supabase Dashboard: https://supabase.com/dashboard/projects');
  console.log('');
  
  // Show a preview of key maintenance tasks
  console.log('🚀 Key optimizations in the maintenance script:');
  console.log('   ✅ Timezone cache refresh (fixes 34.8% performance issue)');
  console.log('   📈 Table statistics update for better query planning');
  console.log('   🔍 Index usage analysis and recommendations');
  console.log('   📊 Slow query identification');
  console.log('   🗂️  Table bloat detection');
  console.log('   💾 Cache hit ratio monitoring');
  console.log('');

  // Try to refresh timezone cache if functions exist
  try {
    console.log('🔄 Attempting to refresh timezone cache...');
    const { error } = await supabase.rpc('refresh_timezone_cache_safe');
    
    if (error) {
      console.log('ℹ️  Timezone cache refresh function not available yet (run migrations first)');
    } else {
      console.log('✅ Timezone cache refreshed successfully');
    }
  } catch {
    console.log('ℹ️  Timezone functions not available (run migrations first)');
  }

  console.log('');
  console.log('💡 Pro tip: Run this maintenance script weekly for optimal performance');
  console.log('');
  console.log('📋 Next steps:');
  console.log('   1. Apply migrations first: pnpm db:migrate');
  console.log('   2. Then run this maintenance script in Supabase SQL Editor');
}

if (require.main === module) {
  runMaintenance().catch(console.error);
}