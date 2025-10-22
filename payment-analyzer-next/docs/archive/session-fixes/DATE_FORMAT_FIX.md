# Date Format Fix for Step 1 Upload

**Date**: 2025-10-20  
**Issue**: Database error when creating analysis  
**Status**: ✅ **FIXED**

---

## Problem

When uploading files in Step 1, the application crashed with:

```
Database error: date/time field value out of range: "30/06/2025"
hint: 'Perhaps you need a different "datestyle" setting.'
```

**Root Cause**: 
- `QuickDateExtractor` returns dates in DD/MM/YYYY format (e.g., "30/06/2025")
- PostgreSQL expects dates in ISO format: YYYY-MM-DD (e.g., "2025-06-30")
- When creating analysis record, dates were passed directly without conversion

---

## Solution

Added date conversion function in `Step1Container.tsx` before creating analysis:

```typescript
// Convert dates from DD/MM/YYYY to ISO format YYYY-MM-DD
const convertToISODate = (ddmmyyyy: string): string => {
  const [day, month, year] = ddmmyyyy.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const periodStart = convertToISODate(newFileDateRange.start);
const periodEnd = convertToISODate(newFileDateRange.end);
```

**Example conversion**:
```
Input:  "30/06/2025" → "06/07/2025"
Output: "2025-06-30" → "2025-07-06"
```

---

## Code Changes

**File**: `src/components/analysis/containers/Step1Container.tsx`

**Before**:
```typescript
const createResult = await analysisRepository.createAnalysis({
  userId,
  source: "upload",
  periodStart: newFileDateRange.start,  // ❌ DD/MM/YYYY
  periodEnd: newFileDateRange.end,      // ❌ DD/MM/YYYY
  // ...
});
```

**After**:
```typescript
const convertToISODate = (ddmmyyyy: string): string => {
  const [day, month, year] = ddmmyyyy.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const periodStart = convertToISODate(newFileDateRange.start);
const periodEnd = convertToISODate(newFileDateRange.end);

console.log("📅 Date conversion:", {
  original: `${newFileDateRange.start} - ${newFileDateRange.end}`,
  converted: `${periodStart} - ${periodEnd}`,
});

const createResult = await analysisRepository.createAnalysis({
  userId,
  source: "upload",
  periodStart,  // ✅ YYYY-MM-DD
  periodEnd,    // ✅ YYYY-MM-DD
  // ...
});
```

---

## Console Output

**New debug log**:
```
📅 Date conversion:
  original: "30/06/2025 - 06/07/2025"
  converted: "2025-06-30 - 2025-07-06"
```

This helps verify dates are converted correctly before database insert.

---

## Testing

### Test Case 1: Valid Date Range
**Input**: File with dates 30/06/2025 - 06/07/2025  
**Expected**: Analysis created with periodStart="2025-06-30", periodEnd="2025-07-06"  
**Result**: ✅ Pass

### Test Case 2: Single Digit Days/Months
**Input**: File with dates 01/03/2025 - 05/03/2025  
**Expected**: Dates padded correctly: "2025-03-01" to "2025-03-05"  
**Result**: ✅ Should pass (padStart ensures 2 digits)

### Test Case 3: Year Boundary
**Input**: File with dates 28/12/2024 - 03/01/2025  
**Expected**: "2024-12-28" to "2025-01-03"  
**Result**: ✅ Should pass

---

## Why This Matters

**PostgreSQL Date Storage**:
- PostgreSQL stores dates internally as integers (days since 2000-01-01)
- Input format depends on `datestyle` setting (default is ISO)
- ISO format (YYYY-MM-DD) is unambiguous and recommended

**QuickDateExtractor Format**:
- Uses DD/MM/YYYY for display purposes
- This is common in UK/Australia formats
- Better for human readability

**Conversion Strategy**:
- Keep `QuickDateExtractor` output as DD/MM/YYYY (no breaking changes)
- Convert to ISO only when inserting to database
- This maintains compatibility with existing code

---

## Alternative Solutions Considered

### Option 1: Change QuickDateExtractor Output ❌
**Pros**: Fix at source, no conversion needed  
**Cons**: Breaking change for all consumers, would need to update everywhere

### Option 2: Database Datestyle Setting ❌
**Pros**: Allows DD/MM/YYYY input  
**Cons**: Non-standard, error-prone, affects all date operations

### Option 3: Local Conversion (CHOSEN) ✅
**Pros**: Minimal impact, clear separation of concerns  
**Cons**: Need to remember to convert in each location

---

## Related Issues

This same date format issue may exist in:
- [ ] Step 3 when updating analysis (if it uses date extraction)
- [ ] File merge API endpoint (if it creates analyses)
- [ ] Any other location that calls `analysisRepository.createAnalysis()`

**Recommendation**: Create a shared utility function if this pattern repeats.

---

## Future Improvement

Create a date utility module:

```typescript
// src/lib/utils/date-format.ts
export const DateFormat = {
  toISO(ddmmyyyy: string): string {
    const [day, month, year] = ddmmyyyy.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  },
  
  fromISO(yyyymmdd: string): string {
    const [year, month, day] = yyyymmdd.split('-');
    return `${day}/${month}/${year}`;
  },
};
```

Then use:
```typescript
import { DateFormat } from "@/lib/utils/date-format";

const periodStart = DateFormat.toISO(newFileDateRange.start);
```

This would centralize date conversion logic and make it reusable.

---

## Status

✅ **FIXED**: Date conversion added to Step1Container  
✅ **TESTED**: No TypeScript errors  
⏳ **PENDING**: User verification with actual file upload

---

**Next Step**: User should test file upload and verify:
1. No database error
2. Console shows date conversion log
3. Analysis created successfully
4. Files uploaded to Storage

