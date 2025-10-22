# Test Helpers

This directory contains reusable test utilities and helpers.

## Structure

- **date-helpers.ts** - Date/time mocking utilities
- **money-helpers.ts** - Money value assertion helpers
- **test-factories.ts** - Test data factory functions
- **mock-supabase.ts** - Supabase client mocking utilities
- **mock-pdf.ts** - PDF.js mocking utilities

## Usage

```typescript
import { mockDate, resetDate } from '@/tests/helpers/date-helpers';
import { expectMoneyEqual } from '@/tests/helpers/money-helpers';
import { createMockAnalysis } from '@/tests/helpers/test-factories';
```
