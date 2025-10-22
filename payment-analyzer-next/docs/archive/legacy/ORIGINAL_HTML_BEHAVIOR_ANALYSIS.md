# Original HTML Behavior Analysis

## Recovery Banner Behavior

### Display Logic
- Shows when analysis data is < 24 hours old
- **Purely informational** - just tells user "Restored your last analysis from X ago"
- Auto-hides after 10 seconds
- No aggressive state restoration

### Banner Actions
```javascript
// "Start New" button - just navigates, doesn't clear
document.getElementById('startNewBtn').addEventListener('click', () => {
    UI.hideRecoveryBanner();
    Router.navigate('analysis');  // ← No state clearing!
});

// "Close" button - just hides banner
document.getElementById('closeBannerBtn').addEventListener('click', () => {
    UI.hideRecoveryBanner();
});
```

**Key Insight**: The banner is NOT a restoration mechanism - it's just a notification!

## Step Navigation Behavior

### Step 2 Navigation
```javascript
if (stepNumber === 2) {
    requireModule('analysisModule').populateStep2Content();
}
```
- Simply populates with current data
- No special recovery logic

### Step 3 Navigation
```javascript
if (stepNumber === 3) {
    // Try to load previous analysis if we don't have current analysis data
    if (!lastAnalysisData && !hasBeenAnalyzed) {
        const State = requireModule('stateModule');
        const savedState = State.load();
        if (savedState && savedState.lastAnalysis) {
            lastAnalysisData = savedState.lastAnalysis;
            hasBeenAnalyzed = true;
            console.log('📊 Loaded previous analysis data for step 3');
        }
    }
    analysisModule.populateStep3Content();
}
```

**Key Insight**: Analysis data is loaded **on-demand** when entering step 3, only if not already loaded!

### Can Progress Logic
```javascript
function canProgressToStep(stepNumber) {
    switch (stepNumber) {
        case 1: return true;
        case 2: 
        case 3: 
            // Allow if we have data OR if we've previously analyzed data
            return uploadedFiles.length > 0 || 
                   manualEntries.length > 0 || 
                   hasBeenAnalyzed || 
                   lastAnalysisData;
        default: return false;
    }
}
```

**Key Insight**: Steps 2 & 3 are accessible if there's ANY data (current or previous)

## State Management Philosophy

### The Original Approach
1. **Persistent by default** - state is kept until explicitly overridden
2. **No aggressive clearing** - "Start New" doesn't clear state
3. **Lazy loading** - analysis data loaded when needed
4. **Natural override** - uploading new files replaces old data

### Compared to Our Implementation
| Action | Original HTML | Our Next.js App |
|--------|---------------|-----------------|
| Click "Start Fresh" | Navigate to step 1, keep state | Clear ALL state immediately |
| Navigate to Step 2 | Show existing files/entries | Restore from localStorage |
| Navigate to Step 3 | Load analysis on-demand | Analysis pre-loaded in hook |
| Recovery banner | Info only, auto-hide | Interactive restore action |

## Problems with Our Current Approach

### Issue 1: Aggressive State Clearing
When user clicks "Start Fresh", we call:
```typescript
handleNewAnalysis(); // Clears everything
SessionRecoveryService.clearSession(); // Clears storage
```

But then immediately navigating to Step 2 creates a race condition where:
- State hasn't finished clearing yet
- Auto-save triggers with old state
- New session created with `hasBeenAnalyzed: true`

### Issue 2: Pre-loading vs On-demand
- Original: Loads analysis **when entering step 3**
- Ours: Loads analysis **on hook mount**

This means our approach has timing issues with state updates.

## Recommended Solutions

### Solution 1: Match Original Behavior (Simplest)
Make "Start Fresh" just navigate to Step 1 without clearing:
```typescript
onNewAnalysis={() => {
  setStep(1); // Just go to step 1
  // Don't clear state - let user naturally override by uploading new files
}}
```

### Solution 2: Debounce Auto-Save (Better)
Add a small delay to auto-save to let state updates settle:
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    // Auto-save logic
  }, 100); // Small delay to let state settle
  
  return () => clearTimeout(timer);
}, [dependencies]);
```

### Solution 3: Add State Version Counter (Most Robust)
Track state version to prevent saving stale data:
```typescript
const [stateVersion, setStateVersion] = useState(0);

// When clearing state
handleNewAnalysis();
setStateVersion(v => v + 1);

// In auto-save
if (hasMeaningfulData && currentStateVersion === stateVersion) {
  saveSession();
}
```

## Implementation Recommendation

**Use Solution 2 (Debounce)** because:
1. ✅ Fixes race condition
2. ✅ Preserves existing architecture
3. ✅ Minimal code changes
4. ✅ Aligns with React's async state model

The original HTML doesn't have this issue because it's synchronous - all state updates happen immediately. React's async setState requires debouncing.
