import react from '@vitejs/plugin-react';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { defineConfig } from 'vitest/config';

// Load environment variables BEFORE defineConfig
// Try .env.test first, then fall back to .env.local
dotenvConfig({ path: path.resolve(__dirname, '.env.test') });
dotenvConfig({ path: path.resolve(__dirname, '.env.local'), override: false });

// Ensure variables are set in process.env for the config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS10ZXN0IiwicmVmIjoidGVzdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQwOTk1MjAwfQ.test_key_for_testing';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(SUPABASE_URL),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(SUPABASE_ANON_KEY),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'test'),
  },
  resolve: {
    alias: {
      '@/tests': path.resolve(__dirname, './tests'),
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  test: {
    // Multi-project setup for server (node) and client (jsdom)
    projects: [
      {
        test: {
          environment: 'node',
          globals: true,
          setupFiles: ['./tests/setup.server.ts'],

          // Timeout settings for API integration tests
          testTimeout: 10000,      // 10s per test (API tests need more time)
          hookTimeout: 5000,       // 5s for setup/teardown

          env: {
            NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
            NODE_ENV: 'test',
          },
          include: [
            'tests/integration/api/**/*.test.ts',
            'tests/integration/middleware.test.ts',
            'tests/unit/services/**/*.test.ts',
            'tests/unit/utils/**/*.test.ts',
            'tests/unit/infrastructure/**/*.test.ts',
            'tests/**/*.server.test.ts',
          ],
          exclude: [
            'node_modules',
            'dist',
            '.next',
            'out',
            '**/*.client.test.{ts,tsx}',
          ],
          // @ts-expect-error - Vitest workspace project config
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
              lines: 45,
              functions: 55,
              branches: 75,
              statements: 45,
            },
          },
        },
        resolve: {
          alias: {
            '@/tests': path.resolve(__dirname, './tests'),
            '@': path.resolve(__dirname, './src'),
          },
        },
      },
      {
        test: {
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./tests/setup.client.ts'],

          // Timeout settings
          testTimeout: 30000,      // 30s per test (prevent hangs)
          hookTimeout: 10000,      // 10s for setup/teardown
          // @ts-expect-error - Vitest workspace config
          teardownTimeout: 10000,   // 10s for cleanup

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
        resolve: {
          alias: {
            '@/tests': path.resolve(__dirname, './tests'),
            '@': path.resolve(__dirname, './src'),
          },
        },
      },
    ],
  },
});
