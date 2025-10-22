# Session Step Restoration Fix

## Problem Statement
When user navigates to different steps (e.g., Step 3) and refreshes the page or returns later, the session recovery banner restores them to Step 1 instead of their last active step.

### Log Evidence
```
Checking for session recovery...
✅ Session recovery available
🔄 Restoring session...
🔄 Restoring session: session-1760909666378
📝 Restoring input method: upload
🔄 Restoring session to step: 1  ← Should be step 3!
```

## Root Cause Analysis

The issue has two components:

1. **Duplicate Initialization**: Both `useAnalysisSteps` and `useSessionRecovery` are trying to restore the session:
   - `useAnalysisSteps` initializes `currentStep` from localStorage on mount ✅
   - Recovery banner then calls `onStepChange(session.currentStep)` ❌

2. **Session Data Accuracy**: The session in localStorage might have stale data showing `currentStep: 1`

## Solution

### Approach 1: Make Recovery Banner Informational Only
Since `useAnalysisSteps` already auto-loads the correct step from localStorage, the recovery banner doesn't need to change the step—it should just inform the user.

### Approach 2: Add Debug Logging
Add comprehensive logging to track when and why the step is being set to 1.

## Implementation

### Step 1: Add Debug Logging to Session Save
```typescript
SessionRecoveryService.saveSession({
  currentStep, // Log this value
  inputMethod,
  // ...
});
console.log("💾 Saved session with step:", currentStep);
```

### Step 2: Verify Hook Initialization
The `useAnalysisSteps` hook should correctly initialize from localStorage:
```typescript
const [currentStep, setCurrentStep] = useState<number>(() => {
  // Check navigation intent first
  const intentJson = sessionStorage?.getItem("pa:nav-intent:v9");
  if (intentJson) {
    const intent = JSON.parse(intentJson);
    if (intent.intent === "viewing-report") {
      return intent.fromStep; // ← Correct restoration
    }
  }
  
  // Load from session
  const session = JSON.parse(localStorage.getItem("pa:session:v9"));
  return session?.currentStep || 1; // ← Should return saved step
});
```

### Step 3: Remove Redundant Step Restoration
Update `Step1Container` to NOT restore step via recovery banner since the hook already did it:

```typescript
onRestore: (session) => {
  console.log("🔄 Session restored - Step already initialized by hook:", currentStep);
  // Don't call onStepChange - step is already correct from hook initialization
  // Just restore other data like input method and entries
},
```

## Testing

1. Navigate to Step 3
2. Refresh page
3. Check console: Should show "Initialized with step: 3"
4. Should NOT show "Restoring to step: 1"

## Files to Modify

- ✅ `src/app/(dashboard)/analysis/page.tsx` - Add logging
- ✅ `src/components/analysis/containers/Step1Container.tsx` - Remove step restoration from recovery
- ✅ `src/hooks/useSessionRecovery.ts` - Update callback documentation

## Status
🔄 In Progress - Adding debug logging first to identify exact issue
