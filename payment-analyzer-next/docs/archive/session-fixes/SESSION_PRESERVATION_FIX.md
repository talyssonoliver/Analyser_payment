# Session Preservation Bug Fix

## Problem

The `dbAnalysisId` was being saved to session in Step 1, but then **overwritten by subsequent session saves** that didn't include it. This caused Step 3 to create NEW analyses instead of updating existing ones.

## Root Cause

Three locations were calling `SessionRecoveryService.saveSession()` **without preserving `dbAnalysisId`**:

### 1. Step1Container.tsx - validateAndHash callback (Line 166)

**Before**:
```typescript
SessionRecoveryService.saveSession({
  currentStep,
  inputMethod,
  uploadedFiles: files.map(...),
  manualEntries: manualEntries,
  // ❌ Missing dbAnalysisId - overwrites it!
});
```

**After**:
```typescript
// ✅ Load existing session to preserve dbAnalysisId
const existingSession = SessionRecoveryService.loadSession();

SessionRecoveryService.saveSession({
  currentStep,
  inputMethod,
  uploadedFiles: files.map(...),
  manualEntries: manualEntries,
  dbAnalysisId: existingSession?.dbAnalysisId, // ✅ PRESERVE IT!
});
```

### 2. page.tsx - Auto-save effect (Line 177)

**Before**:
```typescript
SessionRecoveryService.saveSession({
  currentStep,
  inputMethod,
  uploadedFiles: hookUploadedFiles.map(...),
  manualEntries: hookManualEntries,
  hasBeenAnalyzed,
  lastAnalysisData: lastAnalysisData || undefined,
  // ❌ Missing dbAnalysisId - overwrites it!
});
```

**After**:
```typescript
// ✅ Load existing session to preserve dbAnalysisId
const existingSession = SessionRecoveryService.loadSession();

SessionRecoveryService.saveSession({
  currentStep,
  inputMethod,
  uploadedFiles: hookUploadedFiles.map(...),
  manualEntries: hookManualEntries,
  hasBeenAnalyzed,
  lastAnalysisData: lastAnalysisData || undefined,
  dbAnalysisId: existingSession?.dbAnalysisId, // ✅ PRESERVE IT!
});
```

## The Bug Flow

```
1. Step1Container uploads files → Creates analysis → Saves dbAnalysisId to session ✅
   Log: "💾 Saved dbAnalysisId to session: 18ae2d61-28da-4535-80a5-1ff88efc68a6"

2. validateAndHash callback runs → Saves session WITHOUT dbAnalysisId ❌
   Log: "💾 Session saved: session-1760924407594"
   Result: dbAnalysisId LOST

3. page.tsx auto-save runs → Saves session WITHOUT dbAnalysisId ❌
   Log: "💾 Auto-saving session - Step: 1 Files: true Entries: false Analyzed: false"
   Result: dbAnalysisId STILL LOST

4. Step 3 checks session → No dbAnalysisId found → Creates NEW analysis ❌
   Log: "⚠️ No dbAnalysisId in session, creating new analysis (fallback)"
   Log: "✅ Analysis record created: 78fbb01b-f2c5-481c-aa2f-973640be5469" (NEW ID!)
```

## Console Logs Evidence

**Before Fix**:
```
Step1Container.tsx:377 💾 Saved dbAnalysisId to session: 18ae2d61-28da-4535-80a5-1ff88efc68a6
session-recovery-service.ts:83 💾 Session saved: session-1760924407594
page.tsx:176 💾 Auto-saving session - Step: 1 Files: true Entries: false Analyzed: false
page.tsx:99   - dbAnalysisId: undefined  ← LOST!
Step3Container.tsx:229 ⚠️ No dbAnalysisId in session, creating new analysis (fallback)
Step3Container.tsx:264 ✅ Analysis record created: 78fbb01b-f2c5-481c-aa2f-973640be5469  ← NEW DUPLICATE!
```

**After Fix** (Expected):
```
Step1Container.tsx:377 💾 Saved dbAnalysisId to session: 18ae2d61-28da-4535-80a5-1ff88efc68a6
session-recovery-service.ts:83 💾 Session saved: session-1760924407594 (preserved dbAnalysisId)
page.tsx:176 💾 Auto-saving session - Step: 1 Files: true Entries: false Analyzed: false
page.tsx:99   - dbAnalysisId: 18ae2d61-28da-4535-80a5-1ff88efc68a6  ← PRESERVED! ✅
Step3Container.tsx:202 💾 Updating existing analysis: 18ae2d61-28da-4535-80a5-1ff88efc68a6
Step3Container.tsx:223 ✅ Analysis record updated: 18ae2d61-28da-4535-80a5-1ff88efc68a6  ← SAME ID! ✅
```

## Files Modified

1. **src/components/analysis/containers/Step1Container.tsx** (Line 166)
   - Added `const existingSession = SessionRecoveryService.loadSession()`
   - Added `dbAnalysisId: existingSession?.dbAnalysisId` to session save

2. **src/app/(dashboard)/analysis/page.tsx** (Line 177)
   - Added `const existingSession = SessionRecoveryService.loadSession()`
   - Added `dbAnalysisId: existingSession?.dbAnalysisId` to session save

3. **src/components/analysis/containers/Step3Container.tsx** (Line 196)
   - Modified to check for `session?.dbAnalysisId`
   - UPDATE existing analysis when dbAnalysisId exists
   - CREATE new analysis as fallback when dbAnalysisId missing

## Solution Pattern

**Always preserve existing session fields when saving**:

```typescript
// ✅ CORRECT PATTERN
const existingSession = SessionRecoveryService.loadSession();

SessionRecoveryService.saveSession({
  // ... your new fields ...
  dbAnalysisId: existingSession?.dbAnalysisId, // Preserve it!
});
```

```typescript
// ❌ WRONG PATTERN
SessionRecoveryService.saveSession({
  // ... your new fields ...
  // Missing dbAnalysisId - will overwrite and lose it!
});
```

## Testing

1. **Upload file in Step 1**:
   ```
   ✅ Check console: "💾 Saved dbAnalysisId to session: <ID>"
   ```

2. **Check page auto-save**:
   ```
   ✅ Check console: "💾 Auto-saving session"
   ✅ Verify dbAnalysisId still present (not undefined)
   ```

3. **Navigate to Step 3 and analyze**:
   ```
   ✅ Check console: "💾 Updating existing analysis: <SAME ID>"
   ✅ NOT: "⚠️ No dbAnalysisId in session"
   ✅ NOT: "✅ Analysis record created: <DIFFERENT ID>"
   ```

4. **Verify database**:
   ```sql
   SELECT id, status, created_at 
   FROM analyses 
   WHERE user_id = '<your-user-id>' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
   Expected: Only ONE analysis record with status='completed'

## Status

✅ **FIXED** - Both session preservation bugs resolved
🔄 **TESTING REQUIRED** - User needs to test with fresh upload

## Next Steps

1. User should clear localStorage and test with fresh upload
2. Verify dbAnalysisId persists across navigation
3. Verify Step 3 updates existing analysis (not creates new)
4. Apply database migration (015_add_analysis_status.sql)
