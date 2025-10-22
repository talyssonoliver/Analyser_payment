# Architecture Change: Save Files on Step 1

**Date**: October 20, 2025  
**Issue**: Files should be saved to database in Step 1, not Step 3  
**Status**: 🟡 **IMPLEMENTATION IN PROGRESS**

---

## Problem Statement

**Current Flow (Wrong)**:
```
Step 1: Upload → Store in memory
Step 2: Validate → Files in memory  
Step 3: Analyze → Save files to DB + Create analysis
```

**Issues**:
- Files lost on page refresh before Step 3
- Can't view uploaded files on Step 2 after navigation
- Files only saved after analysis completes
- No way to manage files before analysis

---

## Desired Flow (Correct)

**New Flow**:
```
Step 1: Upload → Save files to Supabase Storage → Create "pending" analysis
Step 2: Validate → Load files from DB → Allow removal
Step 3: Analyze → Load files from DB → Update analysis to "completed"
```

**Benefits**:
- ✅ Files persisted immediately after upload
- ✅ Can navigate freely between steps
- ✅ Files survive page refresh
- ✅ Can remove files before analysis
- ✅ Analysis record tracks file lifecycle

---

## Implementation Plan

### Phase 1: Modify Step 1 to Save Files

**File**: `src/components/analysis/containers/Step1Container.tsx`

Add after file upload:
```typescript
const handleFilesUploaded = async (files: File[]) => {
  // ... existing validation ...
  
  // NEW: Save files to database immediately
  const fileStorage = new FileStorageService();
  const analysisRepo = new AnalysisRepository();
  
  // Create pending analysis record
  const analysisId = generateId();
  const userId = await getUserId();
  
  // Upload files to storage
  const uploadResults = await fileStorage.uploadFiles(files, userId, analysisId);
  
  // Create analysis record with status="pending"
  const analysis = await analysisRepo.createAnalysis({
    id: analysisId,
    user_id: userId,
    status: 'pending',
    input_method: 'upload',
    created_at: new Date().toISOString(),
  });
  
  // Create analysis_files records
  for (const uploadResult of uploadResults) {
    await analysisRepo.createAnalysisFile({
      analysis_id: analysisId,
      storage_path: uploadResult.storage_path,
      original_name: uploadResult.original_name,
      file_size: uploadResult.file_size,
      file_hash: uploadResult.file_hash,
      file_type: uploadResult.file_type,
    });
  }
  
  // Save dbAnalysisId to session
  SessionRecoveryService.saveSession({
    dbAnalysisId: analysisId,
    uploadedFiles: files.map(f => ({ 
      name: f.name, 
      size: f.size, 
      type: f.type 
    })),
  });
  
  // Call existing callback
  onFilesUploaded(files);
}
```

### Phase 2: Modify Step 2 to Load from Database

**File**: `src/components/analysis/containers/Step2Container.tsx`

Add on mount:
```typescript
useEffect(() => {
  const loadFilesFromDatabase = async () => {
    const session = SessionRecoveryService.loadSession();
    
    if (!session?.dbAnalysisId || uploadedFiles.length > 0) {
      return; // Already have files or no DB ID
    }
    
    const analysisRepo = new AnalysisRepository();
    const fileStorage = new FileStorageService();
    
    // Get analysis with files
    const analysisResult = await analysisRepo.getAnalysisById(session.dbAnalysisId);
    
    if (analysisResult.isSuccess && analysisResult.data?.analysis_files) {
      // Download files from storage
      const files = await fileStorage.downloadAnalysisFiles(
        userId,
        session.dbAnalysisId,
        analysisResult.data.analysis_files.map(f => f.original_name)
      );
      
      setUploadedFiles(files);
    }
  };
  
  loadFilesFromDatabase();
}, []);
```

Add file removal:
```typescript
const handleRemoveFile = async (fileName: string) => {
  const session = SessionRecoveryService.loadSession();
  
  if (session?.dbAnalysisId) {
    const fileStorage = new FileStorageService();
    const analysisRepo = new AnalysisRepository();
    
    // Delete from storage
    await fileStorage.deleteFile(userId, session.dbAnalysisId, fileName);
    
    // Delete from analysis_files table
    await analysisRepo.deleteAnalysisFile(session.dbAnalysisId, fileName);
  }
  
  // Update local state
  setUploadedFiles(files => files.filter(f => f.name !== fileName));
};
```

### Phase 3: Modify Step 3 to Update (Not Create)

**File**: `src/components/analysis/containers/Step3Container.tsx`

Change saveAnalysisToDatabase:
```typescript
const saveAnalysisToDatabase = async (analysisData, userId) => {
  const session = SessionRecoveryService.loadSession();
  
  if (session?.dbAnalysisId) {
    // UPDATE existing analysis
    console.log("💾 Updating existing analysis:", session.dbAnalysisId);
    
    await analysisRepo.updateAnalysis(session.dbAnalysisId, {
      status: 'completed',
      working_days: analysisData.totals.workingDays,
      total_consignments: analysisData.totals.totalConsignments,
      period_start: analysisData.metadata.periodStart,
      period_end: analysisData.metadata.periodEnd,
      completed_at: new Date().toISOString(),
    });
    
    // Add daily entries and totals
    await analysisRepo.createDailyEntries(session.dbAnalysisId, analysisData.days);
    await analysisRepo.createAnalysisTotals(session.dbAnalysisId, analysisData.totals);
    
    return session.dbAnalysisId;
  } else {
    // FALLBACK: Create new (shouldn't happen in normal flow)
    console.warn("⚠️ No dbAnalysisId in session, creating new analysis");
    return await createNewAnalysis(analysisData, userId);
  }
};
```

---

## Database Schema Changes

### analyses table

Add `status` field:
```sql
ALTER TABLE analyses ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed'));
```

**Status values**:
- `pending`: Files uploaded, analysis not yet run
- `completed`: Analysis completed successfully
- `failed`: Analysis failed

### analysis_files table

No changes needed - already has all required fields:
- `storage_path`: Location in Supabase Storage
- `original_name`: Original filename
- `file_size`: Size in bytes
- `file_hash`: SHA-256 checksum
- `file_type`: 'runsheet' | 'invoice'

---

## Migration Path

### Step 1: Add Status Column
```sql
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
UPDATE analyses SET status = 'completed' WHERE status IS NULL;
ALTER TABLE analyses ALTER COLUMN status SET NOT NULL;
```

### Step 2: Update Existing Code
1. Update Step1Container to save files on upload
2. Update Step2Container to load files from database
3. Update Step3Container to update instead of create
4. Update session recovery to handle dbAnalysisId

### Step 3: Test Flow
1. Upload files → Verify saved to storage
2. Check database → Verify pending analysis created
3. Navigate to Step 2 → Verify files load from DB
4. Remove file → Verify deleted from storage and DB
5. Analyze → Verify analysis updated to completed

---

## Benefits

### Immediate
- Files never lost on refresh
- Can navigate freely between steps
- Files visible on Step 2 always

### Long-term
- Better data integrity
- Audit trail of file uploads
- Can implement "resume upload" feature
- Can show "incomplete analyses" in UI

---

## Risks and Mitigations

### Risk 1: Orphaned Files
**Problem**: User uploads files but never completes analysis

**Mitigation**: 
- Add cleanup job to delete pending analyses older than 24 hours
- Include storage cleanup in the job

### Risk 2: Storage Costs
**Problem**: Files uploaded but analysis not run = wasted storage

**Mitigation**:
- Pending analyses cleanup (above)
- Add file size limits
- Monitor storage usage

### Risk 3: Breaking Changes
**Problem**: Existing code expects files in memory

**Mitigation**:
- Keep file restoration in page.tsx as fallback
- Gradual rollout with feature flag
- Test thoroughly before deployment

---

## Implementation Checklist

- [ ] Add `status` column to analyses table
- [ ] Create FileStorageService methods:
  - [ ] `uploadFiles(files, userId, analysisId)`
  - [ ] `deleteFile(userId, analysisId, fileName)`
  - [ ] `downloadAnalysisFiles(userId, analysisId, fileNames)`
- [ ] Update AnalysisRepository:
  - [ ] `createAnalysis()` - Support status field
  - [ ] `updateAnalysis()` - Update existing analysis
  - [ ] `deleteAnalysisFile()` - Remove file record
- [ ] Modify Step1Container:
  - [ ] Save files on upload
  - [ ] Create pending analysis
  - [ ] Save dbAnalysisId to session
- [ ] Modify Step2Container:
  - [ ] Load files from database on mount
  - [ ] Add file removal functionality
- [ ] Modify Step3Container:
  - [ ] Update existing analysis instead of creating
  - [ ] Handle both update and create paths
- [ ] Update tests
- [ ] Add cleanup job for orphaned analyses

---

**Status**: 🟡 **READY FOR IMPLEMENTATION**  
**Priority**: HIGH (Core architecture change)  
**Estimated Time**: 4-6 hours  
**Risk Level**: MEDIUM (Breaking changes, needs careful testing)

---

*This architecture change will make the application much more robust and user-friendly, with files persisted from the moment they're uploaded.*
