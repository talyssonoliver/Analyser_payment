# Testing Guide

**Last Updated**: October 2025
**Framework**: Vitest 3.2.4 (multi-project) + Playwright 1.55
**Status**: Actively maintained

---

## ⚠️ CRITICAL: Environment Performance

### Docker vs WSL2 Comparison

| Metric | Docker | WSL2 | Winner |
|--------|--------|------|--------|
| **Execution Time** | ~2 minutes | ~9 minutes | 🏆 Docker (4.5x faster) |
| **Test Discovery** | 1349 tests (38 files) | 1169 tests (32 files) | 🏆 Docker (discovers 180 more tests) |
| **Reliability** | Native Linux FS | Cross-FS (/mnt/c/) | 🏆 Docker (consistent) |
| **CI/CD Ready** | ✅ Yes | ❌ No (incomplete) | 🏆 Docker |

**⚠️ MANDATE: Always use Docker for:**
- Full test suite validation
- CI/CD pipelines
- Pre-commit verification
- Test suite audits

**WSL2 is acceptable ONLY for:**
- Quick development feedback (single file tests)
- Watch mode during active development
- NOT for verifying "all tests pass"

---

## Test Statistics

### Docker (Complete Test Suite)
- **Total Tests**: 1,349
- **Test Files**: 38
- **Current Pass Rate**: 90.9% (1,223/1,349)
- **Failing**: 121 tests
- **Skipped**: 4 tests
- **Todo**: 1 test
- **Coverage Target**: 75%+

### WSL2 (Incomplete - DO NOT RELY ON)
- **Total Tests**: 1,169 (⚠️ 180 tests not discovered)
- **Test Files**: 32 (⚠️ 6 files not discovered)
- **Pass Rate**: Artificially inflated due to missing tests

---

## Test Structure

```
tests/
├── unit/          # 800+ tests - Pure logic
│   ├── components/    # React component tests (jsdom)
│   ├── domain/        # Business logic tests
│   ├── services/      # Service layer tests
│   ├── hooks/         # Custom React hooks
│   └── utils/         # Utility functions
├── integration/   # 400+ tests - Multi-component
│   ├── api/           # API route tests (node env)
│   ├── containers/    # Container components
│   ├── pages/         # Page-level integration
│   └── middleware/    # Middleware tests
└── e2e/          # 66+ tests - Full workflows
    └── (Playwright browser tests)
```

---

## Running Tests

### Docker (STRONGLY RECOMMENDED)

```bash
# Watch mode (recommended for development)
pnpm docker:test

# UI mode (visual test runner)
pnpm docker:test-ui    # http://localhost:51204

# One-time full run (for verification)
docker-compose -f docker-compose.dev.yml run --rm app pnpm test:run

# Specific file in Docker
docker-compose -f docker-compose.dev.yml run --rm app pnpm test tests/path/to/file.test.ts

# Shell access for debugging
pnpm docker:shell
```

### Traditional (Development Only)

```bash
# Interactive watch (quick feedback)
pnpm test

# Watch specific file
pnpm test tests/unit/services/my-service.test.ts

# UI mode (local)
pnpm test:ui

# ⚠️ Full run (SLOW, may miss tests)
pnpm test:run

# Coverage (use Docker for accurate results)
pnpm test:coverage

# Per-project runs
pnpm test:server   # Node env (API routes, middleware, services)
pnpm test:client   # jsdom env (components, pages, hooks)
```

---

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { PaymentCalculator } from '@/lib/domain/services/payment-calculator';

describe('PaymentCalculator', () => {
  it('calculates weekday rate correctly', () => {
    const calculator = new PaymentCalculator();
    const result = calculator.calculateDayPayment({
      date: '2025-01-01',  // Monday
      consignments: 50,
      paidAmount: 175
    });
    
    expect(result.rate).toBe(2.00);
    expect(result.basePayment).toBe(100.00);
    expect(result.totalBonus).toBe(75.00);  // No unloading on Monday
  });
});
```

### Component Test Example

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with correct variant', () => {
    render(<Button variant="primary">Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toHaveClass('bg-primary');
  });
});
```

---

## Test Commands

```bash
# Run specific test file
pnpm test path/to/test.test.ts

# Run tests matching pattern
pnpm test -t "Payment Calculator"

# Update snapshots
pnpm test -u

# Coverage report
pnpm test:coverage
# Report at: coverage/index.html
```

---

## Configuration & Timeouts

### Vitest Multi-Project Setup

```typescript
// vitest.config.ts - Unified configuration
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          environment: 'node',        // For API routes, middleware
          setupFiles: ['./tests/setup.server.ts'],
          testTimeout: 10000,         // 10s per test (API tests need time)
          hookTimeout: 5000,          // 5s for setup/teardown
          include: [
            'tests/integration/api/**/*.test.ts',
            'tests/unit/services/**/*.test.ts',
            'tests/**/*.server.test.ts',
          ],
        },
      },
      {
        test: {
          environment: 'jsdom',       // For components, pages
          setupFiles: ['./tests/setup.client.ts'],
          testTimeout: 30000,         // 30s per test (prevent hangs)
          hookTimeout: 10000,         // 10s for setup/teardown
          include: [
            'tests/unit/components/**/*.test.{ts,tsx}',
            'tests/integration/pages/**/*.test.tsx',
          ],
        },
      },
    ],
  },
});
```

**Key Points:**
- **Node environment:** 10s timeout for API/integration tests
- **jsdom environment:** 30s timeout to prevent component test hangs
- **No parallelization:** Removed due to race conditions in React tests

### Recent Fixes (October 2025)

**✅ API Integration Test Timeouts Fixed**
- **Issue:** 2 API tests timing out at default 5000ms
- **Fix:** Added `testTimeout: 10000` to node environment
- **Files:** `tests/integration/api/analysis.test.ts`, `export.test.ts`
- **Commit:** vitest.config.ts lines 38-40

---

## Coverage Thresholds

```typescript
// Node environment (API routes, services)
thresholds: {
  lines: 45,
  functions: 55,
  branches: 75,
  statements: 45
}

// jsdom environment (components, pages)
thresholds: {
  lines: 65,
  functions: 70,
  branches: 80,
  statements: 65
}
```

---

## Troubleshooting

### Test Timeouts

**Symptom:** `Test timed out in 5000ms`

**Solution:**
1. Check if test is in correct project (node vs jsdom)
2. Verify timeout settings in `vitest.config.ts`
3. For slow integration tests, increase timeout locally:
```typescript
it('slow integration test', { timeout: 15000 }, async () => {
  // Test code
});
```

### Test Discovery Issues

**Symptom:** Some tests not running

**Diagnosis:**
```bash
# Check which tests Docker finds
docker-compose -f docker-compose.dev.yml run --rm app pnpm test:run --reporter=verbose

# Compare with WSL2
pnpm test:run --reporter=verbose
```

**Solution:** Always use Docker for complete test discovery

### Mock Issues

**Symptom:** `Cannot find module '@/lib/...'`

**Solution:** Check `resolve.alias` in vitest.config.ts:
```typescript
resolve: {
  alias: {
    '@/tests': path.resolve(__dirname, './tests'),
    '@': path.resolve(__dirname, './src'),
  },
}
```

### React Not Defined Errors

**Symptom:** `ReferenceError: React is not defined` in jsdom tests

**Solution:** Verify `tests/setup.client.ts` has:
```typescript
import React from 'react';
(global as any).React = React;
```

---

**For More Details:**
- See `vitest.config.ts` for unified multi-project config (lines 30-162)
- See `tests/setup.server.ts` for node environment setup
- See `tests/setup.client.ts` for jsdom environment setup
- See `TEST_FIXES_SUMMARY.md` for recent test suite improvements
