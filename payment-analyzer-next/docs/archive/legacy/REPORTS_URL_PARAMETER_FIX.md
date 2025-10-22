# Reports Page URL Parameter Fix

## Problem

After completing analysis in Step 3, clicking "View Report" would not show the report. Instead, it showed an empty state with the error:

```
🔍 Reports Debug - Analysis not found in database or localStorage
```

## Root Cause

The issue was a **URL parameter name mismatch**:

### What Was Happening

1. **Step 3 Navigation**:
   ```typescript
   // Step3Container.tsx line 720
   router.push(`/reports?analysisId=011f3343-4386-46de-b0ef-6097939e6eb3`);
   //                      ^^^^^^^^^^^ Using 'analysisId'
   ```

2. **Reports Page URL Parsing**:
   ```typescript
   // useReportUrlParams.ts line 51 (BEFORE FIX)
   analysisId: urlParams.get("analysis"), // ❌ Looking for 'analysis' (no 'Id')
   //                         ^^^^^^^^
   ```

3. **Fallback Behavior**:
   - Since URL had no `analysis` parameter, `analysisId` was `null`
   - Code fell back to week navigation state
   - Loaded a **different analysis ID** from previous navigation: `8fd59a68-af58-4034-afe1-3ebb6217f0be`
   - That analysis didn't exist → Empty state

### Console Evidence

```
Step3Container.tsx:720 📊 Navigating to: /reports?analysisId=011f3343-4386-46de-b0ef-6097939e6eb3
                                                    ^^^^^^^^^^^ Correct ID in URL

useReportUrlParams.ts:67 🔍 Reports Debug - Using week navigation state as fallback
                                            ^^^^^^^^^^^^^^^ URL param not found!

analysis-repository.ts:774 🔍 AnalysisRepository - Querying for analysis ID: 8fd59a68-af58-4034-afe1-3ebb6217f0be
                                                                              ^^^^^^^^^^^ Wrong ID loaded!
```

## Solution

Updated `useReportUrlParams.ts` to support **both** parameter names for backwards compatibility:

```typescript
// BEFORE
analysisId: urlParams.get("analysis"),

// AFTER
analysisId: urlParams.get("analysisId") || urlParams.get("analysis"),
//          ^^^^^^^^^^^^^^^^^^^^^^^^^^ Check 'analysisId' first, fallback to 'analysis'
```

This ensures:
- ✅ New URLs with `?analysisId=xxx` work correctly
- ✅ Old URLs with `?analysis=xxx` still work (backwards compatibility)
- ✅ No more incorrect fallback to week navigation state

## Expected Behavior (After Fix)

### Successful Report Loading

```
Step3Container.tsx:720 📊 Navigating to: /reports?analysisId=011f3343-4386-46de-b0ef-6097939e6eb3

useReportUrlParams.ts:51 ✅ Extracted analysisId: 011f3343-4386-46de-b0ef-6097939e6eb3

analysis-repository.ts:774 🔍 AnalysisRepository - Querying for analysis ID: 011f3343-4386-46de-b0ef-6097939e6eb3
                                                                              ✅ Correct ID!

analysis-repository.ts:788 🔍 AnalysisRepository - Query result: {found: 1, analyses: [...]}
                                                                   ^^^^^^^^ Found!

ReportDataConverter.ts:157 📊 Period: 02/07/2025 - 02/07/2025 (Single day)
                               ✅ Report displays correctly!
```

## Files Modified

1. **`src/hooks/useReportUrlParams.ts`** - Line 51
   - Added support for `analysisId` parameter name
   - Kept backwards compatibility with `analysis` parameter

## Related Issues

This was blocking the complete workflow:
- ✅ Upload → Analyze → Save to DB → **View Report** ❌ (was broken, now fixed)

Now the full workflow works end-to-end:
- ✅ Upload → Analyze → Save to DB → **View Report** ✅

## Testing

1. **Upload a file** in Step 1
2. **Analyze** in Step 3
3. **Click "View Report"**
4. **Expected**: Report page shows analysis data with correct date and consignments
5. **Check console**: Should see correct analysis ID being loaded

## Additional Notes

The codebase uses **two different URL patterns** for reports:

1. **Direct Analysis View**: `/reports?analysisId=xxx`
2. **History Navigation**: `/reports?analysis=xxx&week=xx&start=xxx&end=xxx`

The fix ensures both patterns work correctly.
