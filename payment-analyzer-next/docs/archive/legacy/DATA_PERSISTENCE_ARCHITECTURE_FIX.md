# Data Persistence Architecture Fix

**Created:** 2025-10-22
**Issue:** Data inconsistency between localStorage and database causing Week 30 showing £0 revenue but 99 deliveries
**Status:** 🔴 **CRITICAL - Architecture Problem**

---

## 🎯 Executive Summary

**Root Cause:** The application uses **dual storage** (localStorage + database) without proper synchronization, leading to:
- Data existing in localStorage but not in database
- Dashboard showing different data than Reports/History
- No user visibility into sync failures
- Data loss when accessing from different devices

**Impact:**
- ❌ Users lose data when switching devices
- ❌ Inconsistent metrics across pages
- ❌ Silent failures with no user notification
- ❌ No way to recover from sync failures

**Solution:** Make database the **single source of truth** with localStorage as cache only.

---

## 🔍 Current Architecture Problems

### Problem 1: Dual Storage Without Sync

**Current Flow in Step3Container.tsx:**

```typescript
// Line 747: Save to localStorage FIRST
AnalysisStorageService.saveAnalysis(storageKey, storageData);
console.log("💾 Analysis saved to localStorage:", storageKey);

// Line 757: THEN try to save to database
if (user?.id) {
  await handleDatabaseSave(analysisData, storageData, user.id);
} else {
  saveUnauthenticatedSession(analysisData.id);
}

// Line 682: If DB save fails, just show toast
catch (dbError) {
  console.warn("⚠️ Database save failed, but localStorage save succeeded:", dbError);
  toast.warning("Analysis saved locally only. Database save failed.");
  // ❌ Data remains in localStorage only!
}
```

**Problems:**
1. localStorage save happens BEFORE DB save
2. If DB save fails, data stays in localStorage only
3. User sees a warning toast but can't retry
4. No automatic retry mechanism
5. No way to force sync later

### Problem 2: Inconsistent Data Loading

**Dashboard (useDashboardData.ts):**
```typescript
// Lines 213-227: Process database FIRST
analyses?.forEach((analysis) => {
  analysis.daily_entries.forEach((entry) => {
    totalRevenue += entry.paid_amount || 0;
    totalDeliveries += entry.consignments || 0;
  });
});

// Lines 231-275: THEN add localStorage data
if (localAnalyses && !processedAnalysisIds.has(analysisId)) {
  totalRevenue += dayData.paidAmount || 0;
  totalDeliveries += dayData.consignments || 0;
}
```

**Problems:**
1. Merges data from TWO sources
2. Can double-count if sync is partial
3. Creates inconsistency with other pages

**Reports & History:**
```typescript
// useReportData.ts Line 76:
const analysisData = await loadAnalysisData(userId, finalParams.finalAnalysisId);

// useAnalysisLoader.ts: Loads from DB only
const result = await analysisRepository.getAnalysisById(analysisId);

// History page Line 573:
const result = await analysisRepository.getUserAnalyses(userId, {...});
```

**Result:**
- Dashboard shows localStorage data → £0.00 revenue, 99 deliveries
- Reports shows nothing → analysis not in database
- **INCONSISTENT USER EXPERIENCE**

### Problem 3: No Sync Status Visibility

**Current State:**
- ✅ Analysis saved to localStorage → User sees progress complete
- ❌ DB save fails → User sees small toast for 3 seconds
- ❌ User navigates away → Toast disappears
- ❌ User doesn't know data is not synced
- ❌ User switches devices → Data doesn't exist

**No indicators for:**
- Sync in progress
- Sync failed
- Sync pending retry
- Data only in localStorage

### Problem 4: No Recovery Mechanism

**If DB save fails:**
1. ❌ No automatic retry
2. ❌ No manual retry button
3. ❌ No sync queue
4. ❌ No way to trigger sync later
5. ❌ Data stays orphaned in localStorage forever

---

## ✅ Proposed Architecture

### Core Principles

1. **Database is the Single Source of Truth**
   - All data MUST be in database to be considered "saved"
   - localStorage is ONLY a cache for performance
   - If data is not in DB, it's considered "pending"

2. **Fail-Safe Persistence**
   - DB save happens FIRST, before localStorage
   - If DB save fails, show clear error UI
   - Automatic retry with exponential backoff
   - Manual retry button always available

3. **Data Consistency**
   - ALL pages load from database only
   - localStorage used for caching, not as fallback
   - Clear cache invalidation strategy

4. **User Visibility**
   - Clear sync status indicators
   - Prominent error messages for failures
   - Progress indicators during save
   - Badge showing "Local Only" for unsynced data

---

## 🔧 Implementation Plan

### Phase 1: Fix Step3 Save Flow (CRITICAL)

**File:** `src/components/analysis/containers/Step3Container.tsx`

**Current (Line 747-760):**
```typescript
// ❌ BAD: localStorage first, DB second
AnalysisStorageService.saveAnalysis(storageKey, storageData);
if (user?.id) {
  await handleDatabaseSave(analysisData, storageData, user.id);
}
```

**New:**
```typescript
// ✅ GOOD: DB first, localStorage second
if (user?.id) {
  try {
    const dbAnalysisId = await handleDatabaseSave(analysisData, storageData, user.id);

    // Only save to localStorage AFTER DB save succeeds
    AnalysisStorageService.saveAnalysis(dbAnalysisId, storageData);
    console.log("✅ Analysis saved to database and cached locally");

  } catch (dbError) {
    // Show BLOCKING error UI, not just toast
    setDbSaveError({
      message: "Failed to save analysis to database",
      error: dbError,
      canRetry: true
    });

    // DO NOT save to localStorage if DB fails
    // Show retry UI instead
    throw dbError;
  }
} else {
  // User must be authenticated to save
  throw new Error("You must be logged in to save analyses");
}
```

**Changes:**
1. ✅ Save to DB FIRST
2. ✅ Only save to localStorage if DB succeeds
3. ✅ Show blocking error UI if DB fails
4. ✅ Provide retry mechanism
5. ✅ Don't create orphaned localStorage data

### Phase 2: Add Retry Mechanism

**New file:** `src/lib/services/database-sync-service.ts`

```typescript
export class DatabaseSyncService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 3000, 10000]; // 1s, 3s, 10s

  /**
   * Save analysis with automatic retry
   */
  static async saveWithRetry(
    saveFunction: () => Promise<string>,
    onProgress?: (attempt: number, maxAttempts: number) => void
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        onProgress?.(attempt + 1, this.MAX_RETRIES);
        const result = await saveFunction();
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Save attempt ${attempt + 1} failed:`, error);

        if (attempt < this.MAX_RETRIES - 1) {
          const delay = this.RETRY_DELAYS[attempt];
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to save after ${this.MAX_RETRIES} attempts: ${lastError?.message}`
    );
  }

  /**
   * Check if there are pending saves in localStorage
   */
  static getPendingSaves(): string[] {
    const analyses = AnalysisStorageService.loadAnalyses();
    const pending: string[] = [];

    for (const [id, analysis] of Object.entries(analyses)) {
      const metadata = (analysis as any).metadata;
      if (!metadata?.dbAnalysisId) {
        pending.push(id);
      }
    }

    return pending;
  }

  /**
   * Sync pending localStorage data to database
   */
  static async syncPendingData(userId: string): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const pending = this.getPendingSaves();
    const results = { synced: 0, failed: 0, errors: [] as string[] };

    for (const analysisId of pending) {
      try {
        const analysis = AnalysisStorageService.loadAnalysis(analysisId);
        if (!analysis) continue;

        // Convert and save to database
        const dbId = await this.saveAnalysisToDatabase(analysis, userId);

        // Update localStorage with DB ID
        const updated = { ...analysis, metadata: { ...analysis.metadata, dbAnalysisId: dbId } };
        AnalysisStorageService.saveAnalysis(dbId, updated);

        // Remove old entry if different
        if (analysisId !== dbId) {
          AnalysisStorageService.deleteAnalysis(analysisId);
        }

        results.synced++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${analysisId}: ${error.message}`);
      }
    }

    return results;
  }
}
```

### Phase 3: Fix Dashboard Data Loading

**File:** `src/hooks/useDashboardData.ts`

**Current (Lines 193-275):**
```typescript
// ❌ BAD: Merges DB + localStorage
const localAnalyses = AnalysisStorageService.loadAnalyses();
analyses?.forEach(/* process DB */);
if (localAnalyses && !processedAnalysisIds.has(analysisId)) {
  /* process localStorage */
}
```

**New:**
```typescript
// ✅ GOOD: DB only, check for pending syncs
const analyses = analysesResult.isSuccess ? analysesResult.data.data : [];

// Calculate metrics from DB only
analyses?.forEach((analysis) => {
  if (analysis.daily_entries) {
    analysis.daily_entries.forEach((entry) => {
      totalRevenue += entry.paid_amount || 0;
      totalDeliveries += entry.consignments || 0;
      if (entry.consignments > 0) daysWithData++;
    });
  }
});

// Check for unsynced localStorage data (for warning only)
const pendingSaves = DatabaseSyncService.getPendingSaves();
if (pendingSaves.length > 0) {
  console.warn(`⚠️ ${pendingSaves.length} analyses pending sync`);
  // Show banner: "You have unsynced data. Click here to sync now."
}
```

**Changes:**
1. ✅ Load from DB only
2. ✅ Remove localStorage fallback
3. ✅ Check for pending syncs
4. ✅ Show warning banner if unsynced data exists

### Phase 4: Add Sync Status UI

**New component:** `src/components/ui/sync-status-banner.tsx`

```typescript
export function SyncStatusBanner() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const pending = DatabaseSyncService.getPendingSaves();
    setPendingCount(pending.length);
  }, []);

  const handleSync = async () => {
    if (!user?.id) return;

    setSyncing(true);
    try {
      const results = await DatabaseSyncService.syncPendingData(user.id);

      if (results.synced > 0) {
        toast.success(`Synced ${results.synced} analyses`);
        setPendingCount(0);
      }

      if (results.failed > 0) {
        toast.error(`Failed to sync ${results.failed} analyses`);
        console.error("Sync errors:", results.errors);
      }
    } catch (error) {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (pendingCount === 0) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {pendingCount} analysis{pendingCount > 1 ? 'es' : ''} not synced
            </p>
            <p className="text-sm text-yellow-700">
              Your data is saved locally but not backed up to the cloud.
            </p>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-primary"
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>
    </div>
  );
}
```

### Phase 5: Add Error UI to Step3

**Update:** `src/components/analysis/containers/Step3Container.tsx`

```typescript
// Add state for save errors
const [saveError, setSaveError] = useState<{
  message: string;
  error: unknown;
  canRetry: boolean;
} | null>(null);

// In updateStep3Analysis function:
try {
  // ... analysis logic ...

  if (user?.id) {
    try {
      // Save with retry
      const dbAnalysisId = await DatabaseSyncService.saveWithRetry(
        () => saveAnalysisToDatabase(analysisData, user.id!),
        (attempt, max) => {
          progressService.setStageProgress(7, `Saving (attempt ${attempt}/${max})...`);
        }
      );

      // Cache in localStorage AFTER DB save succeeds
      AnalysisStorageService.saveAnalysis(dbAnalysisId, storageData);

      toast.success("Analysis saved successfully");
      setSaveError(null);

    } catch (dbError) {
      setSaveError({
        message: "Failed to save analysis after multiple attempts",
        error: dbError,
        canRetry: true
      });

      // Don't cache in localStorage if DB save fails
      throw dbError;
    }
  } else {
    throw new Error("You must be logged in to save analyses");
  }
} catch (error) {
  // Show error UI
}

// Add error UI in render:
{saveError && (
  <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-red-800 font-medium">{saveError.message}</h3>
        <p className="text-red-700 text-sm mt-1">
          Your analysis was processed but could not be saved. Please retry.
        </p>
      </div>
      {saveError.canRetry && (
        <button
          onClick={() => updateStep3Analysis()}
          className="btn-danger"
        >
          Retry Save
        </button>
      )}
    </div>
  </div>
)}
```

---

## 📋 Implementation Checklist

### Immediate (Critical)

- [ ] **Step3Container.tsx**: Save to DB FIRST, localStorage SECOND
- [ ] **Step3Container.tsx**: Add blocking error UI for save failures
- [ ] **Step3Container.tsx**: Add retry mechanism
- [ ] **useDashboardData.ts**: Remove localStorage fallback - use DB only

### Short Term (High Priority)

- [ ] **Create DatabaseSyncService**: Retry logic, pending checks, sync function
- [ ] **Create SyncStatusBanner component**: Show unsynced data warning
- [ ] **Add SyncStatusBanner** to Dashboard, Reports, History pages
- [ ] **Add manual sync button** in Settings page

### Medium Term (Important)

- [ ] **Add sync status indicators** to navigation (badge with count)
- [ ] **Auto-sync on app load** if pending data exists
- [ ] **Background sync worker** (service worker)
- [ ] **Conflict resolution** if data was modified in both places

### Testing

- [ ] Test DB save success path
- [ ] Test DB save failure with retry
- [ ] Test network offline scenario
- [ ] Test sync from localStorage to DB
- [ ] Test consistency across Dashboard/Reports/History
- [ ] Test switching devices (data persists)
- [ ] Test authentication expiry during save

---

## 🎯 Expected Outcomes

### Before Fix

❌ Data in localStorage but not DB
❌ Dashboard shows data, Reports doesn't
❌ Week 30: £0 revenue, 99 deliveries
❌ Data lost when switching devices
❌ No visibility into sync status
❌ No way to retry failed saves

### After Fix

✅ Database is single source of truth
✅ All pages show consistent data
✅ Clear error UI if save fails
✅ Automatic retry with backoff
✅ Manual retry button available
✅ Sync status banner shows pending data
✅ Data persists across devices
✅ localStorage used only as cache

---

## 🚨 Migration Strategy

### For Existing localStorage Data

**On first load after deployment:**

```typescript
// In app layout or dashboard
useEffect(() => {
  const migrateLocalStorageData = async () => {
    if (!user?.id) return;

    const pending = DatabaseSyncService.getPendingSaves();

    if (pending.length > 0) {
      // Show banner
      showMigrationBanner({
        count: pending.length,
        onMigrate: async () => {
          const results = await DatabaseSyncService.syncPendingData(user.id);
          // Show results
        }
      });
    }
  };

  migrateLocalStorageData();
}, [user]);
```

---

## 📊 Monitoring & Logging

### Key Metrics to Track

1. **Save Success Rate**: % of analyses saved to DB successfully
2. **Retry Rate**: % of saves requiring retries
3. **Pending Sync Count**: # of analyses in localStorage not in DB
4. **Sync Success Rate**: % of pending syncs that succeed
5. **Error Types**: Most common DB save errors

### Logging

```typescript
// On DB save attempt
console.log("💾 Attempting DB save:", { analysisId, userId, attempt: 1 });

// On retry
console.warn("⚠️ DB save failed, retrying:", { analysisId, attempt: 2, delay: 3000 });

// On success
console.log("✅ DB save successful:", { analysisId, dbId, attempts: 2 });

// On final failure
console.error("❌ DB save failed after all retries:", { analysisId, error, attempts: 3 });

// On localStorage cache
console.log("💾 Cached in localStorage:", { dbId });

// On pending sync detected
console.warn("⚠️ Pending syncs detected:", { count: 5, analysisIds: [...] });
```

---

## ✅ Summary

**Root Cause:** Dual storage (localStorage + DB) without proper sync
**Solution:** Make DB the single source of truth
**Key Changes:**
1. Save to DB FIRST, localStorage SECOND
2. Add retry mechanism with exponential backoff
3. Show blocking error UI for failures
4. Remove localStorage fallback from data loading
5. Add sync status UI and manual sync button

**Impact:**
- ✅ Consistent data across all pages
- ✅ No data loss when switching devices
- ✅ Clear visibility into sync status
- ✅ Automatic recovery from failures
- ✅ Better user experience

---

**Implementation Priority:** 🔴 **CRITICAL**
**Estimated Effort:** 2-3 days
**Risk Level:** Medium (requires careful testing)
**Rollback Plan:** Keep old code in git, feature flag the new behavior
