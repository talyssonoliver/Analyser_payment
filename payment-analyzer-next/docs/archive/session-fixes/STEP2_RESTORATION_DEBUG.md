# Step 2 File Restoration Not Triggering - Fix

**Date**: October 20, 2025  
**Issue**: Step 2 shows empty state when navigating back from Step 3  
**Status**: 🟡 **IN PROGRESS** - Debugging required

---

## Problem

When user navigates **Step 3 → Step 2** (clicking back on the step icons), Step 2 shows empty state with no files visible.

### Console Evidence

```
📁 Restoring file metadata from session: 0 files    ❌ NO FILES
💾 Auto-saving session - Step: 2 Files: false       ❌ Files: false
use-analysis-steps.ts:251 📍 Step changed to: 2
```

### Expected Behavior

Files should be restored from database when navigating to Step 2, showing the uploaded files.

---

## Root Cause Analysis

### Investigation

The file restoration logic exists in `page.tsx` lines 79-160, with trigger conditions:

```typescript
if (
  (currentStep === 2 || currentStep === 3) &&
  needsRestoration &&
  hasBeenAnalyzed &&
  session?.dbAnalysisId &&
  user
)
```

However, the **useEffect dependencies** were:

```typescript
}, [currentStep, hookUploadedFiles.length, hasBeenAnalyzed, user, setHookUploadedFiles]);
```

### The Problem

**Using `hookUploadedFiles.length` instead of full array reference**

When navigating Step 3 → Step 2:
1. Files array is already empty (length = 0)
2. Step changes from 3 → 2
3. useEffect SHOULD trigger due to `currentStep` change
4. BUT React may optimize away the effect if the array reference doesn't change

### Additional Issue

The debug logging shows that we need to understand which condition is failing:
- Is `dbAnalysisId` in session?
- Is `hasBeenAnalyzed` true?
- Is `user` defined?
- Is `needsRestoration` evaluating correctly?

---

## The Fix

### 1. Changed useEffect Dependencies

**File**: `src/app/(dashboard)/analysis/page.tsx` (Line 160)

```typescript
// BEFORE - Only tracked length
}, [currentStep, hookUploadedFiles.length, hasBeenAnalyzed, user, setHookUploadedFiles]);

// AFTER - Track full array reference
}, [currentStep, hookUploadedFiles, hasBeenAnalyzed, user, setHookUploadedFiles]);
```

**Why**: Using the full array ensures React detects changes properly. When files are cleared (empty array → different empty array), the reference changes and triggers the effect.

### 2. Added Debug Logging

**File**: `src/app/(dashboard)/analysis/page.tsx` (Lines 91-102)

```typescript
// Debug logging to understand why restoration doesn't trigger
console.log("🔍 File restoration check:", {
  currentStep,
  filesCount: hookUploadedFiles.length,
  hasEmptyFiles,
  needsRestoration,
  hasBeenAnalyzed,
  dbAnalysisId: session?.dbAnalysisId,
  hasUser: !!user,
  willRestore: (currentStep === 2 || currentStep === 3) && needsRestoration && hasBeenAnalyzed && !!session?.dbAnalysisId && !!user
});
```

**Why**: This will show us exactly which condition is failing when restoration doesn't trigger.

---

## Testing Required

### Test Scenario

1. **Upload files** → 3 files in Step 1
2. **Validate** → Proceed to Step 2
3. **Analyze** → Proceed to Step 3, complete analysis
4. **Save to database** → Analysis saved successfully
5. **Navigate back to Step 2** → Click Step 2 icon
6. **Check console** → Look for debug output

### Expected Console Output

```
🔍 File restoration check: {
  currentStep: 2,
  filesCount: 0,
  hasEmptyFiles: false,
  needsRestoration: true,
  hasBeenAnalyzed: true,
  dbAnalysisId: "073c71f0-0f8f-412a-be89-512c02949a9b",
  hasUser: true,
  willRestore: true
}
📥 Restoring files from database for analysis: 073c71f0-0f8f-412a-be89-512c02949a9b
📥 Current step: 2, Files count: 0, Has empty: false
📥 Found 3 file(s) in database
📥 Downloading 3 file(s) from storage...
✅ Restored 3 file(s) from database storage
toast: Restored 3 file(s) from previous analysis
```

### If Restoration Still Doesn't Trigger

Check the debug output to see which condition is `false`:

**Condition 1: `currentStep === 2`**
- Should be `true` when on Step 2

**Condition 2: `needsRestoration`**
- Requires: `hookUploadedFiles.length === 0` OR `hasEmptyFiles`
- Should be `true` when files array is empty

**Condition 3: `hasBeenAnalyzed`**
- Should be `true` after analysis completes
- Stored in session recovery state

**Condition 4: `session?.dbAnalysisId`**
- Should be set after database save (line 471 in Step3Container)
- Check if `SessionRecoveryService.saveSession()` was called with `dbAnalysisId`

**Condition 5: `user`**
- Should be defined when user is authenticated
- From `useAuth()` hook

---

## Possible Root Causes (If Still Failing)

### Issue A: dbAnalysisId Not Saved to Session

**Check**: Line 471 in Step3Container.tsx

```typescript
SessionRecoveryService.saveSession({
  hasBeenAnalyzed: true,
  lastAnalysisData: { id: dbAnalysisId, localStorageId: analysisData.id },
  dbAnalysisId, // ✨ Should be here
});
```

**Verify**: Add console.log before this line:
```typescript
console.log("💾 Saving dbAnalysisId to session:", dbAnalysisId);
```

### Issue B: Session Cleared on Navigation

**Check**: Look for any calls to `SessionRecoveryService.clearSession()` between Step 3 and Step 2

**Search for**: `clearSession()` calls in navigation code

### Issue C: User State Lost

**Check**: `useAuth()` hook might return undefined during navigation

**Verify**: Add logging:
```typescript
console.log("👤 User state:", { user, userId: user?.id });
```

### Issue D: hasBeenAnalyzed Reset

**Check**: `hasBeenAnalyzed` state might be reset during navigation

**Verify**: Look at `use-analysis-steps.ts` restoration logic

---

## Next Steps

1. **Run the test scenario** with new debug logging
2. **Check console output** to see `willRestore` value
3. **Identify which condition is false** from debug object
4. **Fix the specific condition** that's failing
5. **Verify files restore correctly**

---

## Alternative Solution (If Above Doesn't Work)

If the useEffect still doesn't trigger correctly, we can add a manual restoration call in the step change handler:

**File**: `src/hooks/use-analysis-steps.ts` (In `goToStep` function)

```typescript
const goToStep = useCallback((step: number) => {
  setCurrentStep(step);
  
  // If going to Step 2 and files are empty, trigger restoration
  if (step === 2 && uploadedFiles.length === 0 && hasBeenAnalyzed) {
    console.log("📥 Manually triggering file restoration for Step 2");
    // Emit custom event or use callback
    window.dispatchEvent(new CustomEvent('restoreFiles'));
  }
}, [uploadedFiles, hasBeenAnalyzed]);
```

Then listen for this event in `page.tsx`.

---

## Status

**Current**: 🟡 **Testing Required**  
**Next**: Run test scenario with debug logging to identify failing condition  
**Priority**: HIGH (Core navigation feature broken)

---

*This issue is a continuation of the empty file restoration saga. The restoration logic exists but isn't triggering on Step 3 → Step 2 navigation.*
