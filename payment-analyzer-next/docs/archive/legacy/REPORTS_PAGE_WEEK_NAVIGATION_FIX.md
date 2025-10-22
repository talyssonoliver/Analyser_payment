# Reports Page Week Navigation Fallback Fix

## Date
October 20, 2025

## Problem
After fixing the URL parameter extraction to support both `analysisId` and `analysis` parameter names, a new issue appeared:

1. User clicks "View Report" → Navigates to `/reports?analysisId=8a1050fc-...`
2. Reports page initially loads correctly with the right analysis ID
3. React re-renders → Week navigation fallback kicks in
4. Page loads wrong analysis (`8fd59a68-...`) from stale week navigation state

### Console Evidence

**Initial navigation (correct)**:
```
Step3Container.tsx:720 📊 Navigating to: /reports?analysisId=8a1050fc-e3dc-45a7-8890-dfa3a1e627dd
analysis-repository.ts:774 🔍 AnalysisRepository - Querying for analysis ID: 8a1050fc-e3dc-45a7-8890-dfa3a1e627dd
analysis-repository.ts:788 🔍 AnalysisRepository - Query result: {found: 1} ✅
```

**After re-render (incorrect)**:
```
useReportUrlParams.ts:68 🔍 Reports Debug - Using week navigation state as fallback
analysis-repository.ts:774 🔍 AnalysisRepository - Querying for analysis ID: 8fd59a68-af58-4034-afe1-3ebb6217f0be
analysis-repository.ts:788 🔍 AnalysisRepository - Query result: {found: 0} ❌
```

## Root Cause

### Issue 1: Direct `window.location.search` Access
**File**: `src/hooks/useReportUrlParams.ts`

```typescript
// BEFORE (PROBLEMATIC)
const extractUrlParameters = useCallback((): ReportUrlParams => {
  const urlParams = new URLSearchParams(window.location.search);
  // ❌ In Next.js client-side navigation, window.location.search
  //    might not be updated synchronously with React renders
  return {
    analysisId: urlParams.get("analysisId") || urlParams.get("analysis"),
    // ...
  };
}, []);
```

**Problem**: 
- `window.location.search` is not reactive in Next.js
- During client-side navigation, the URL might change but `window.location.search` returns old/empty values
- This causes `urlParams.analysisId` to be `null` on re-renders

### Issue 2: Week Navigation Fallback Logic
```typescript
// Fallback logic that was triggered incorrectly
if (!urlParams.analysisId && !urlParams.weekFilter && selectedWeek && weekAnalysisId) {
  console.log("Using week navigation state as fallback");
  finalAnalysisId = weekAnalysisId; // ❌ Uses OLD analysis ID from previous session
}
```

**Problem**:
- Week navigation service (`sessionStorage`) persists old analysis ID: `8fd59a68-...`
- When URL parameter extraction fails, fallback uses this stale ID
- Result: Wrong analysis loaded

## Solution

### 1. Use Next.js `useSearchParams` Hook

**File**: `src/hooks/useReportUrlParams.ts`

```typescript
// AFTER (FIXED)
import { useSearchParams } from "next/navigation";

export function useReportUrlParams() {
  const searchParams = useSearchParams(); // ✅ Reactive to URL changes
  
  const extractUrlParameters = useCallback((): ReportUrlParams => {
    return {
      // ✅ searchParams always reflects current URL
      analysisId: searchParams.get("analysisId") || searchParams.get("analysis"),
      dayFilter: searchParams.get("day"),
      weekFilter: searchParams.get("week"),
      startDate: searchParams.get("start"),
      endDate: searchParams.get("end"),
    };
  }, [searchParams]); // ✅ Depends on searchParams
```

**Benefits**:
- ✅ `searchParams` is reactive to Next.js client-side navigation
- ✅ Always synchronized with current URL
- ✅ Proper Next.js pattern for reading URL parameters
- ✅ `useCallback` dependency on `searchParams` ensures fresh extraction

### 2. Improved Fallback Logic

```typescript
// Prioritize URL parameter over week navigation state
if (urlParams.analysisId) {
  console.log("Using URL analysisId:", urlParams.analysisId);
  // ✅ URL parameter takes precedence - do NOT use week navigation fallback
} else if (!urlParams.weekFilter && selectedWeek && weekAnalysisId) {
  // Only use week navigation fallback if NO analysisId in URL
  console.log("Using week navigation state as fallback");
  finalAnalysisId = weekAnalysisId;
```

**Logic**:
1. **If `analysisId` in URL**: Use it (no fallback)
2. **If no `analysisId` but have `weekFilter`**: Use week filter logic
3. **If neither**: Use week navigation service as last resort

## Expected Behavior

### Successful Flow
```
1. Step 3: Click "View Report"
   📊 Navigating to: /reports?analysisId=8a1050fc-...

2. Reports Page: First render
   🔍 Using URL analysisId: 8a1050fc-...
   ✅ Query result: {found: 1}

3. Reports Page: Re-render (React Strict Mode)
   🔍 Using URL analysisId: 8a1050fc-... (still correct!)
   ✅ Query result: {found: 1}

4. Report Displays
   ✅ Correct analysis data
   ✅ Correct date range
   ✅ Correct consignment count
```

### Console Logs to Verify
```
✅ "Using URL analysisId: 8a1050fc-..." (NOT "Using week navigation state as fallback")
✅ AnalysisRepository - Query result: {found: 1}
✅ Report data displayed with correct totals
```

## Testing

### Test Case 1: Direct Navigation
1. Complete analysis in Step 3
2. Click "View Report"
3. **Expected**: Report displays immediately with correct data
4. **Verify**: Console shows "Using URL analysisId" (not "fallback")

### Test Case 2: Multiple Re-renders
1. Navigate to reports page
2. Open DevTools → Console
3. **Expected**: Multiple "Using URL analysisId" logs (React Strict Mode)
4. **Verify**: NO "Using week navigation state as fallback" logs

### Test Case 3: Back Button Navigation
1. View report → Click back → Click "View Report" again
2. **Expected**: Same analysis loaded both times
3. **Verify**: Analysis ID matches in all logs

### Test Case 4: Week Navigation (Legacy)
1. Navigate to `/reports?week=28&analysis=xxx` (old format)
2. **Expected**: Fallback logic works
3. **Verify**: "Using week navigation state as fallback"

## Files Modified

### `src/hooks/useReportUrlParams.ts`
**Changes**:
1. Added import: `useSearchParams` from `next/navigation`
2. Updated `extractUrlParameters` to use `searchParams` instead of `window.location.search`
3. Added `searchParams` to `useCallback` dependency array
4. Improved fallback logic comments

**Lines Modified**: 
- Line 6: Added import
- Line 26: Added `const searchParams = useSearchParams()`
- Lines 46-54: Updated parameter extraction logic

## Related Issues

- **Previous Fix**: `REPORTS_URL_PARAMETER_FIX.md` - Fixed parameter name mismatch (`analysisId` vs `analysis`)
- **Related Feature**: Week navigation service (`week-navigation-service.ts`)
- **Root System**: Next.js App Router client-side navigation

## Technical Background

### Why `window.location.search` Failed

In traditional React apps, `window.location.search` is updated synchronously with navigation. But in Next.js:

1. **Client-Side Navigation**: Next.js intercepts `<Link>` and `router.push()` calls
2. **Shallow Routing**: URL changes without full page reload
3. **React Render Timing**: Components may render BEFORE `window.location` updates
4. **Solution**: `useSearchParams()` hook is synchronized with Next.js router

### Why `useSearchParams` Works

```typescript
// Next.js synchronizes searchParams with router state
const searchParams = useSearchParams();

// Changes trigger re-renders automatically
useEffect(() => {
  const id = searchParams.get("analysisId");
  // ✅ Always current
}, [searchParams]);
```

## Additional Notes

- This fix makes the reports page more robust for client-side navigation
- Backwards compatible with old `?analysis=xxx` URLs
- Week navigation service fallback still works when appropriate
- React Strict Mode double-rendering no longer causes issues
