# Future-Proofing Analysis ID Management

## Problem Analysis

### Root Causes
1. **Dual Storage System**: Analysis data stored in both localStorage AND database
2. **No ID Synchronization**: localStorage keys don't match database IDs
3. **Stale Data Restoration**: Old localStorage data takes precedence over new database data
4. **Unclear Data Ownership**: No single source of truth for which analysis is "current"

## Proposed Solutions (Multiple Layers)

### 🎯 Solution 1: Enhanced Session-Database Synchronization (IMPLEMENTED)

**What we did:**
- Step3Container now validates localStorage analysis ID against session's `dbAnalysisId`
- Rejects mismatched data and triggers fresh analysis

**Status:** ✅ Implemented

---

### 🎯 Solution 2: Clear Old Data When Starting New Analysis

**Goal:** Automatically clean up localStorage when new files are uploaded

**Implementation:**

#### A. In Step1Container - Clear on New Upload
```typescript
// In handleFilesValidatedAndHashed, after creating new analysis:
console.log("✅ Created pending analysis:", analysis.id);

// Clear old localStorage analyses that don't match this new ID
AnalysisStorageService.clearOldAnalyses(analysis.id);
```

#### B. Add to AnalysisStorageService
```typescript
/**
 * Clear old analyses except the specified one
 */
static clearOldAnalyses(keepAnalysisId: string): void {
  try {
    const analyses = AnalysisStorageService.loadAnalyses();
    const analysisIds = Object.keys(analyses);
    
    // Remove all analyses except the one we want to keep
    const filtered: Record<string, StringKeyObject> = {};
    if (analyses[keepAnalysisId]) {
      filtered[keepAnalysisId] = analyses[keepAnalysisId];
      console.log("🧹 Cleared old analyses, kept:", keepAnalysisId);
    } else {
      console.log("🧹 Cleared all old analyses");
    }
    
    AnalysisStorageService.saveAnalyses(filtered);
  } catch (error) {
    console.error("Failed to clear old analyses:", error);
  }
}
```

---

### 🎯 Solution 3: Database as Single Source of Truth

**Goal:** Always load from database first, use localStorage only as cache

**Implementation:**

#### Modify useAnalysisLoader
```typescript
const loadAnalysisData = useCallback(
  async (userId: string, analysisId: string | null) => {
    if (!analysisId) {
      return await loadLatestAnalysis(userId);
    }

    // ALWAYS try database first
    const dbAnalysis = await loadAnalysisByUuid(userId, analysisId);
    
    if (dbAnalysis && dbAnalysis.daily_entries && dbAnalysis.daily_entries.length > 0) {
      // Database has complete data - use it
      console.log("✅ Using database as source of truth:", analysisId);
      return dbAnalysis;
    }
    
    // Only fall back to localStorage if database has no daily entries
    if (dbAnalysis && dbAnalysis.daily_entries?.length === 0) {
      console.log("⚠️ Database analysis incomplete, checking localStorage");
      const localStorage = await loadAnalysisBySessionId(userId, analysisId);
      
      // But validate this localStorage data is recent
      if (localStorage && isRecentAnalysis(localStorage)) {
        return localStorage;
      }
    }
    
    return dbAnalysis;
  },
  [loadAnalysisByUuid, loadAnalysisBySessionId, loadLatestAnalysis]
);

function isRecentAnalysis(analysis: AnalysisWithDetails): boolean {
  const createdAt = new Date(analysis.created_at).getTime();
  const now = Date.now();
  const ageInHours = (now - createdAt) / (1000 * 60 * 60);
  return ageInHours < 24; // Only use if less than 24 hours old
}
```

---

### 🎯 Solution 4: Add Database Status Flag

**Goal:** Track analysis processing state in database

**Implementation:**

#### A. Update Database Schema
```sql
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'pending';
-- Values: 'pending', 'processing', 'completed', 'error'
```

#### B. Update Status Throughout Workflow
```typescript
// In Step1Container - when creating analysis
await analysisRepository.createAnalysis({
  // ... other fields
  status: 'pending', // Waiting for Step 3 analysis
});

// In Step3Container - when starting analysis
await analysisRepository.updateAnalysis(analysisId, {
  status: 'processing'
});

// In Step3Container - when analysis completes
await analysisRepository.updateAnalysis(analysisId, {
  status: 'completed',
  working_days: analysisData.days.length,
  total_consignments: totalConsignments,
});
```

#### C. Check Status Before Showing Report
```typescript
// In handleStep3ViewDetailedReport
const analysis = await analysisRepository.getAnalysisById(savedDbAnalysisId);

if (analysis.data?.status !== 'completed') {
  toast.warning("Analysis is still processing. Please wait...");
  return;
}

router.push(`/reports?analysisId=${savedDbAnalysisId}`);
```

---

### 🎯 Solution 5: Analysis State Machine

**Goal:** Enforce proper state transitions

**Implementation:**

```typescript
// analysis-state-machine.ts
export type AnalysisState = 
  | 'created'       // Database record created
  | 'files_uploaded' // Files uploaded to storage
  | 'processing'    // Step 3 analysis running
  | 'completed'     // Analysis finished with results
  | 'error';        // Something went wrong

export type AnalysisTransition = 
  | 'upload_files'
  | 'start_processing'
  | 'complete_processing'
  | 'handle_error';

const transitions: Record<AnalysisState, AnalysisTransition[]> = {
  created: ['upload_files', 'handle_error'],
  files_uploaded: ['start_processing', 'handle_error'],
  processing: ['complete_processing', 'handle_error'],
  completed: [], // Terminal state
  error: ['upload_files'], // Can retry from upload
};

export function canTransition(
  from: AnalysisState, 
  transition: AnalysisTransition
): boolean {
  return transitions[from]?.includes(transition) ?? false;
}

// Usage in workflow
if (!canTransition(currentState, 'complete_processing')) {
  throw new Error(`Cannot complete processing from state: ${currentState}`);
}
```

---

### 🎯 Solution 6: Better Error Messages

**Goal:** Help users understand what's happening

**Implementation:**

```typescript
// In ReportEmptyState or useReportData
if (!reportData || reportData.totalDays === 0) {
  const analysis = await analysisRepository.getAnalysisById(requestedAnalysisId);
  
  if (analysis.data && analysis.data.status === 'pending') {
    return (
      <div className="info-message">
        <h3>📊 Analysis Pending</h3>
        <p>This analysis hasn't been processed yet.</p>
        <p>Go back to Step 3 to run the analysis.</p>
        <button onClick={() => router.push('/analysis')}>
          Return to Analysis
        </button>
      </div>
    );
  }
  
  return <ReportEmptyState requestedAnalysisId={requestedAnalysisId} />;
}
```

---

## Recommended Implementation Priority

### Phase 1: Quick Wins (Do Now) ⚡
1. ✅ **Validate ID match in Step3Container** (Already done)
2. **Clear old localStorage on new upload** (Solution 2)
3. **Add status checks before navigation** (Solution 4B, 4C)

### Phase 2: Structural Improvements (Next Sprint) 🏗️
4. **Add processing_status to database** (Solution 4A)
5. **Update status throughout workflow** (Solution 4B)
6. **Better error messages** (Solution 6)

### Phase 3: Architecture Refactor (Future) 🔮
7. **Database as single source of truth** (Solution 3)
8. **Analysis state machine** (Solution 5)
9. **Remove localStorage dependency entirely**

---

## Code Files to Create

### 1. `analysis-cleanup-service.ts`
```typescript
/**
 * Service for cleaning up stale analysis data
 */
export class AnalysisCleanupService {
  static clearOldAnalyses(keepAnalysisId: string): void { /* ... */ }
  static pruneByAge(maxAgeHours: number): void { /* ... */ }
  static syncWithDatabase(userId: string): Promise<void> { /* ... */ }
}
```

### 2. `analysis-validation-service.ts`
```typescript
/**
 * Service for validating analysis state and completeness
 */
export class AnalysisValidationService {
  static validateForReports(analysisId: string): Promise<ValidationResult>
  static canViewReport(analysisId: string): Promise<boolean>
  static getAnalysisCompleteness(analysisId: string): Promise<number>
}
```

---

## Testing Strategy

### Unit Tests
- Test ID mismatch detection
- Test cleanup functions
- Test state validation

### Integration Tests
- Upload → Analyze → View Report flow
- Multiple uploads in sequence
- Browser refresh during analysis

### E2E Tests
```typescript
test('should not show old analysis for new upload', async () => {
  // Upload first file
  await uploadFile('file1.pdf');
  await analyze();
  const firstAnalysisId = await getAnalysisId();
  
  // Upload second file
  await uploadFile('file2.pdf');
  await analyze();
  const secondAnalysisId = await getAnalysisId();
  
  // Should not be the same
  expect(secondAnalysisId).not.toBe(firstAnalysisId);
  
  // Report should show second analysis
  await viewReport();
  expect(await getDisplayedAnalysisId()).toBe(secondAnalysisId);
});
```

---

## Monitoring & Alerts

### Log Analysis ID Transitions
```typescript
logger.info('Analysis ID changed', {
  from: oldId,
  to: newId,
  trigger: 'new_upload',
  userId,
  timestamp: new Date()
});
```

### Detect Stale Data Usage
```typescript
if (localStorage_age > database_age + 1_hour) {
  logger.warn('Using stale localStorage data', {
    localStorageAge,
    databaseAge,
    analysisId
  });
}
```

---

## Documentation Updates

1. **Architecture Decision Record (ADR)**
   - Document why database is source of truth
   - Explain localStorage role as cache only

2. **Developer Guide**
   - When to clear localStorage
   - How to create new analysis
   - Analysis lifecycle states

3. **Troubleshooting Guide**
   - "Analysis Not Found" → Check database status
   - Stale data → Clear localStorage
   - ID mismatch → Verify session state

