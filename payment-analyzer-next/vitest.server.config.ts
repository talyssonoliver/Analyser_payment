import react from "@vitejs/plugin-react";
import { config as dotenvConfig } from "dotenv";
import path from "path";
import { defineConfig } from "vitest/config";

dotenvConfig({ path: path.resolve(__dirname, ".env.test") });
dotenvConfig({ path: path.resolve(__dirname, ".env.local"), override: false });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "test_key_for_testing";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(SUPABASE_ANON_KEY),
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "test"),
  },
  resolve: {
    alias: [
      { find: /^@\/tests\/(.*)$/, replacement: path.resolve(__dirname, "./tests/$1") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  test: {
    name: "server",
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.server.ts"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
      NODE_ENV: "test",
    },
    include: [
      "tests/integration/api/**/*.test.ts",
      "tests/integration/middleware.test.ts",
      "tests/unit/services/**/*.test.ts",
      "tests/unit/utils/**/*.test.ts",
      "tests/unit/infrastructure/**/*.test.ts",
      "tests/**/*.server.test.ts",
    ],
    exclude: ["node_modules", "dist", ".next", "out", "**/*.client.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      // Write into subdir to avoid rmdir on mountpoint volume
      reportsDirectory: "./coverage/vitest",
      clean: false,
      cleanOnRerun: false,
      exclude: [
        "node_modules/**",
        "tests/**",
        ".next/**",
        "dist/**",
        "out/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData/**",
        "**/.{idea,git,cache,output,temp}/**",
        "src/types/**",
      ],
      thresholds: {
        lines: 45,
        functions: 55,
        branches: 75,
        statements: 45,
      },
    },
  },
});
