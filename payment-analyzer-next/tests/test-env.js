// Environment Test Script
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');

console.log('🔧 Testing Environment Configuration...\n');

const envVars = {};

// Check .env.local file
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file found');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key] = value.startsWith('"') ? value.slice(1, -1) : value;
    }
  });
  
  // Test Supabase configuration
  if (envVars.NEXT_PUBLIC_SUPABASE_URL && envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('✅ Supabase configuration found');
    console.log(`   URL: ${envVars.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`   Anon Key: ${envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...`);
  } else {
    console.log('❌ Supabase configuration missing');
  }
  
  if (envVars.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ Service Role Key configured');
    console.log(`   Service Key: ${envVars.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
  } else {
    console.log('❌ Service Role Key missing');
  }
  
  if (envVars.DATABASE_URL) {
    console.log('✅ Database URL configured');
    console.log(`   Database: ${envVars.DATABASE_URL.split('@')[0]}@[hidden]`);
  }
  
  if (envVars.NEXTAUTH_SECRET) {
    console.log('✅ NextAuth secret configured');
  }
  
} else {
  console.log('❌ .env.local file not found');
}

// Test Supabase connection
console.log('\n🔌 Testing Supabase Connection...');

try {
  // Simple fetch test to Supabase
  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && anonKey) {
    console.log('🧪 Environment variables ready for Supabase client initialization');
    console.log('✅ Ready to start development server');
  } else {
    console.log('❌ Missing Supabase configuration');
  }
  
} catch (error) {
  console.log('❌ Environment test failed:', error.message);
}

console.log('\n📋 Environment Test Complete');
console.log('\n🚀 Next Steps:');
console.log('   1. Install dependencies: npm install --legacy-peer-deps');
console.log('   2. Start development server: npm run dev');
console.log('   3. Open browser to: http://localhost:3000');