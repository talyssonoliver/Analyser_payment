import react from '@vitejs/plugin-react';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { defineConfig } from 'vitest/config';

dotenvConfig({ path: path.resolve(__dirname, '.env.test') });
dotenvConfig({ path: path.resolve(__dirname, '.env.local'), override: false });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test_key_for_testing';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(SUPABASE_URL),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(SUPABASE_ANON_KEY),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'test'),
  },
  resolve: {
    alias: [
      { find: /^@\/tests\/(.*)$/, replacement: path.resolve(__dirname, './tests/$1') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  test: {
    name: 'client',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.client.ts'],

    // Timeout settings
    testTimeout: 30000,      // 30s per test (prevent hangs)
    hookTimeout: 10000,      // 10s for setup/teardown
    teardownTimeout: 5000,   // 5s for cleanup

    // NOTE: Parallelization removed - caused race conditions in React component tests
    // Re-enable carefully if needed: pool: 'threads', maxConcurrency: 3

    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
      NODE_ENV: 'test',
    },
    include: [
      'tests/unit/components/**/*.test.{ts,tsx}',
      'tests/integration/pages/**/*.test.tsx',
      'tests/**/*.client.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'out',
      '**/*.server.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // Write into subdir to avoid rmdir on mountpoint volume
      reportsDirectory: './coverage/vitest',
      clean: false,
      cleanOnRerun: false,
      exclude: [
        'node_modules/**',
        'tests/**',
        '.next/**',
        'dist/**',
        'out/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        '**/.{idea,git,cache,output,temp}/**',
        'src/types/**',
      ],
      thresholds: {
        lines: 65,
        functions: 70,
        branches: 80,
        statements: 65,
      },
    },
  },
});
