# Implementation Summary: Save Files on Step 1

**Date**: 2025-01-20  
**Status**: 🟡 **PHASE 1 COMPLETE (Step 1 Upload)**  
**Next Phase**: Modify Step 2 and Step 3

---

## Overview

This document tracks the implementation of the architecture change where files are saved to the database immediately on upload in Step 1, instead of waiting until Step 3 analysis completion.

---

## ✅ Completed Tasks (Phase 1)

### 1. Database Migration ✅

**File**: `supabase/migrations/015_add_analysis_status.sql`

Added `status` column to `analyses` table with three possible values:
- `pending`: Files uploaded, analysis not yet run
- `completed`: Analysis finished successfully  
- `failed`: Analysis encountered an error

**Key changes**:
```sql
ALTER TABLE analyses 
ADD COLUMN status TEXT DEFAULT 'completed' 
CHECK (status IN ('pending', 'completed', 'failed'));

UPDATE analyses SET status = 'completed' WHERE status IS NULL;
ALTER TABLE analyses ALTER COLUMN status SET NOT NULL;

CREATE INDEX idx_analyses_status ON analyses(status);
```

**Migration status**: ⚠️ **NOT YET RUN** - User needs to apply this migration

---

### 2. FileStorageService Enhancement ✅

**File**: `src/lib/services/file-storage-service.ts`

Added new method to delete a single file from storage:

```typescript
async deleteFile(
  userId: string,
  analysisId: string,
  fileName: string
): Promise<Result<void>>
```

**Purpose**: Allow Step 2 to remove individual files before analysis

**Path format**: `userId/analysisId/fileName`

**Existing methods used**:
- `uploadFiles(userId, analysisId, files)` - Upload multiple files
- `downloadFile(storagePath)` - Download single file
- `downloadAnalysisFiles(userId, analysisId, fileNames)` - Download multiple files

---

### 3. AnalysisRepository Enhancement ✅

**File**: `src/lib/repositories/analysis-repository.ts`

Added new method to delete file metadata from database:

```typescript
async deleteAnalysisFile(
  analysisId: string,
  fileName: string
): Promise<Result<void>>
```

**Purpose**: Remove file record from `analysis_files` table when user deletes file in Step 2

**Database query**:
```sql
DELETE FROM analysis_files 
WHERE analysis_id = ? AND original_name = ?
```

**Existing methods used**:
- `createAnalysis(data)` - Create analysis record
- `createAnalysisFiles(analysisId, files)` - Create file records
- `getAnalysisById(analysisId)` - Fetch analysis with files

---

### 4. Step1Container Modified ✅

**File**: `src/components/analysis/containers/Step1Container.tsx`

**Function**: `handleFilesUploaded()` (line 191)

**New behavior after overlap check passes**:

```typescript
// 1. Create pending analysis record
const createResult = await analysisRepository.createAnalysis({
  userId,
  source: "upload",
  periodStart: newFileDateRange.start,
  periodEnd: newFileDateRange.end,
  rulesVersion: 1,
  workingDays: 0, // Will be updated in Step 3
  totalConsignments: 0, // Will be updated in Step 3
  metadata: {
    createdInStep: "step1",
    filesCount: files.length,
  },
});

// 2. Upload files to Supabase Storage
const fileStorage = new FileStorageService();
const uploadResult = await fileStorage.uploadFiles(userId, analysis.id, files);

// 3. Create analysis_files records
const fileRecords = uploadResult.data.map((uploadedFile) => ({
  storage_path: uploadedFile.storagePath,
  original_name: uploadedFile.fileName,
  file_size: uploadedFile.size,
  file_hash: uploadedFile.hash,
  mime_type: uploadedFile.type,
  file_type: uploadedFile.fileName.toLowerCase().includes("runsheet")
    ? ("runsheet" as const)
    : ("invoice" as const),
}));

await analysisRepository.createAnalysisFiles(analysis.id, fileRecords);

// 4. Save dbAnalysisId to session
SessionRecoveryService.saveSession({
  dbAnalysisId: analysis.id,
  currentStep,
  inputMethod,
  uploadedFiles: files.map((f) => ({
    name: f.name,
    size: f.size,
    type: f.type,
    lastModified: f.lastModified,
  })),
});

// 5. Proceed with validation
await validateAndHash(files);
```

**Console logging added**:
```
📤 Saving files to database (Step 1)...
✅ Created pending analysis: <analysisId>
✅ Uploaded files to storage: <count>
✅ Created file records: <count>
💾 Saved dbAnalysisId to session: <analysisId>
```

**Toast notifications**:
- Success: "Files saved successfully!"
- Errors: "Failed to save analysis. Please try again."

**Key changes**:
- Files now saved **immediately** after upload
- Analysis created with `status: "pending"`
- `dbAnalysisId` stored in session for later steps
- Validation still happens (for UI feedback)
- All happens BEFORE user navigates to Step 2

---

## 🚧 Remaining Tasks (Phase 2)

### Task 5: Modify Step2Container ⏳

**File**: `src/components/analysis/containers/Step2Container.tsx`

**Required changes**:

1. Add useEffect to load files from database:
```typescript
useEffect(() => {
  const loadFilesFromDatabase = async () => {
    const session = SessionRecoveryService.loadSession();
    
    if (!session?.dbAnalysisId || uploadedFiles.length > 0) {
      return; // Already have files or no DB ID
    }
    
    const { analysisRepository } = await import("@/lib/repositories/analysis-repository");
    const { FileStorageService } = await import("@/lib/services/file-storage-service");
    
    const analysisResult = await analysisRepository.getAnalysisById(session.dbAnalysisId);
    
    if (analysisResult.isSuccess && analysisResult.data?.analysis_files) {
      const fileStorage = new FileStorageService();
      const fileNames = analysisResult.data.analysis_files.map(f => f.original_name);
      
      const filesResult = await fileStorage.downloadAnalysisFiles(
        userId,
        session.dbAnalysisId,
        fileNames
      );
      
      if (filesResult.isSuccess) {
        setUploadedFiles(filesResult.data);
      }
    }
  };
  
  loadFilesFromDatabase();
}, [uploadedFiles.length]);
```

2. Get `userId` from auth context (similar to Step1Container)

---

### Task 6: Add File Removal UI to Step2Container ⏳

**File**: `src/components/analysis/containers/Step2Container.tsx`

**Required changes**:

1. Add handler function:
```typescript
const handleRemoveFile = async (fileName: string) => {
  const session = SessionRecoveryService.loadSession();
  
  if (!session?.dbAnalysisId) {
    toast.error("Cannot remove file: No analysis ID found");
    return;
  }
  
  try {
    // Get user ID
    const { data: authSession } = await (await import("@/lib/supabase/client"))
      .createClient()
      .auth.getSession();
    
    if (!authSession?.session?.user?.id) {
      toast.error("Cannot remove file: Not authenticated");
      return;
    }
    
    const userId = authSession.session.user.id;
    
    // Delete from storage
    const { FileStorageService } = await import("@/lib/services/file-storage-service");
    const fileStorage = new FileStorageService();
    const deleteResult = await fileStorage.deleteFile(userId, session.dbAnalysisId, fileName);
    
    if (deleteResult.isFailure) {
      toast.error("Failed to delete file from storage");
      return;
    }
    
    // Delete from database
    const { analysisRepository } = await import("@/lib/repositories/analysis-repository");
    const dbResult = await analysisRepository.deleteAnalysisFile(session.dbAnalysisId, fileName);
    
    if (dbResult.isFailure) {
      toast.error("Failed to remove file record");
      return;
    }
    
    // Update local state
    setUploadedFiles(files => files.filter(f => f.name !== fileName));
    
    toast.success(`Removed ${fileName}`);
  } catch (error) {
    console.error("Error removing file:", error);
    toast.error("Failed to remove file");
  }
};
```

2. Add UI button for each file:
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => handleRemoveFile(file.name)}
  aria-label={`Remove ${file.name}`}
>
  <TrashIcon className="h-4 w-4" />
</Button>
```

---

### Task 7: Modify Step3Container ⏳

**File**: `src/components/analysis/containers/Step3Container.tsx`

**Required changes**:

1. Modify `saveAnalysisToDatabase()` to UPDATE instead of CREATE:
```typescript
const saveAnalysisToDatabase = async (analysisData, userId) => {
  const session = SessionRecoveryService.loadSession();
  
  if (session?.dbAnalysisId) {
    // UPDATE existing analysis (normal flow)
    console.log("💾 Updating existing analysis:", session.dbAnalysisId);
    
    const { analysisRepository } = await import("@/lib/repositories/analysis-repository");
    
    // Update analysis status to completed
    await analysisRepository.updateAnalysisStatus(
      session.dbAnalysisId,
      "completed",
      {
        ...analysisData.metadata,
        completedAt: new Date().toISOString(),
      }
    );
    
    // Update analysis fields
    const { error } = await supabase
      .from("analyses")
      .update({
        working_days: analysisData.totals.workingDays,
        total_consignments: analysisData.totals.totalConsignments,
        period_start: analysisData.metadata.periodStart,
        period_end: analysisData.metadata.periodEnd,
      })
      .eq("id", session.dbAnalysisId);
    
    if (error) {
      throw new Error(`Failed to update analysis: ${error.message}`);
    }
    
    // Add daily entries
    await analysisRepository.createDailyEntries(
      session.dbAnalysisId,
      analysisData.days
    );
    
    // Add analysis totals
    await analysisRepository.createAnalysisTotals(
      session.dbAnalysisId,
      analysisData.totals
    );
    
    return session.dbAnalysisId;
  } else {
    // FALLBACK: Create new (shouldn't happen in normal flow)
    console.warn("⚠️ No dbAnalysisId in session, creating new analysis");
    return await createNewAnalysisWithFiles(analysisData, userId);
  }
};
```

2. **Important**: Do NOT upload files again (they're already in storage)

3. Keep existing file upload code as fallback for old analyses

---

### Task 8: Testing ⏳

**Test scenarios**:

1. **Happy path**:
   - Upload files in Step 1 → Verify saved to database
   - Navigate to Step 2 → Verify files load from database
   - Remove a file in Step 2 → Verify deleted from storage and DB
   - Analyze in Step 3 → Verify analysis updated (not created)
   - Check Reports → Verify analysis shows correctly

2. **Edge cases**:
   - Refresh page after Step 1 → Files should load in Step 2
   - Navigate back and forth → Files should persist
   - Upload, remove all files, upload new ones → Should work
   - Multiple browsers/tabs → Files should be consistent

3. **Error handling**:
   - Network error during upload → Should show error, allow retry
   - Storage quota exceeded → Should show clear error message
   - Missing authentication → Should redirect to login

---

## Architecture Summary

### Before (Old Flow):
```
Step 1: Upload → Store in memory
Step 2: Validate → Read from memory
Step 3: Analyze → Upload to Storage → Save to database
```

**Problems**:
- Files lost on page refresh before Step 3
- Can't view files in Step 2 after navigation
- No way to manage files before analysis

### After (New Flow):
```
Step 1: Upload → Upload to Storage → Save to database (status: pending)
Step 2: Validate → Load from database → Allow removal
Step 3: Analyze → Update analysis (status: completed)
```

**Benefits**:
- ✅ Files persisted immediately
- ✅ Can navigate freely between steps
- ✅ Files survive page refresh
- ✅ Can remove files before analysis
- ✅ Cleaner separation of concerns

---

## Database Schema Changes

### analyses table

**Added column**:
```sql
status TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'completed', 'failed'))
```

**Index added**:
```sql
CREATE INDEX idx_analyses_status ON analyses(status);
```

### Lifecycle states:
- `pending`: Files uploaded in Step 1, analysis not yet run
- `completed`: Analysis finished successfully in Step 3
- `failed`: Error occurred during analysis

---

## Session Storage Changes

### Before:
```typescript
{
  currentStep: number,
  inputMethod: string,
  uploadedFiles: FileMetadata[]
}
```

### After:
```typescript
{
  currentStep: number,
  inputMethod: string,
  uploadedFiles: FileMetadata[],
  dbAnalysisId: string  // ← NEW: Links to database record
}
```

**Purpose**: `dbAnalysisId` allows Steps 2 and 3 to query the database for file information and update the existing analysis instead of creating a new one.

---

## Implementation Checklist

- [x] Add `status` column to analyses table (migration created)
- [x] Add `deleteFile()` method to FileStorageService
- [x] Add `deleteAnalysisFile()` method to AnalysisRepository
- [x] Modify Step1Container to save files on upload
- [ ] **Run database migration** ← USER ACTION REQUIRED
- [ ] Modify Step2Container to load files from database
- [ ] Add file removal UI to Step2Container
- [ ] Modify Step3Container to update instead of create
- [ ] Test complete flow
- [ ] Test edge cases
- [ ] Test error handling

---

## Next Steps

**For User**:
1. **Apply database migration**: Run `015_add_analysis_status.sql` on Supabase
2. **Test Step 1**: Upload files and verify they're saved to database
3. **Check Supabase Storage**: Verify files appear in `analysis-files` bucket
4. **Check Database**: Verify records in `analyses` and `analysis_files` tables

**For Agent** (after user confirmation):
1. Implement Step 2 file loading
2. Implement Step 2 file removal UI
3. Implement Step 3 update logic
4. Comprehensive testing

---

## Console Output Reference

**Step 1 - Successful upload**:
```
📤 Saving files to database (Step 1)...
✅ Created pending analysis: abc-123-def
📤 Uploading 2 file(s) to storage for analysis abc-123-def
✅ Uploaded: RUNSHEET_001.pdf -> userId/abc-123-def/RUNSHEET_001.pdf
✅ Uploaded: INVOICE_001.pdf -> userId/abc-123-def/INVOICE_001.pdf
✅ Successfully uploaded 2 file(s)
✅ Uploaded files to storage: 2
✅ Created file records: 2
💾 Saved dbAnalysisId to session: abc-123-def
```

**Step 2 - File loading (to be implemented)**:
```
🔍 Loading files from database...
📥 Downloading 2 file(s) for analysis abc-123-def
✅ Downloaded: RUNSHEET_001.pdf (152348 bytes)
✅ Downloaded: INVOICE_001.pdf (98732 bytes)
✅ Loaded 2 files from database
```

**Step 2 - File removal (to be implemented)**:
```
🗑️ Deleting file: INVOICE_001.pdf
🗑️ Deleting file record: INVOICE_001.pdf from analysis abc-123-def
✅ Deleted file: INVOICE_001.pdf
✅ Deleted file record: INVOICE_001.pdf
```

**Step 3 - Analysis update (to be implemented)**:
```
💾 Updating existing analysis: abc-123-def
✅ Updated analysis status to completed
✅ Updated analysis fields
✅ Created 5 daily entries
✅ Created analysis totals
```

---

## Status: Phase 1 Complete ✅

**What's Done**:
- Database migration created
- FileStorageService enhanced with deleteFile()
- AnalysisRepository enhanced with deleteAnalysisFile()
- Step1Container modified to save files immediately

**What's Next**:
- User applies database migration
- User tests Step 1 file upload
- Agent implements Step 2 and Step 3 changes
- Comprehensive testing

---

**Last Updated**: 2025-01-20  
**Implementation Phase**: 1 of 3 Complete  
**Risk Level**: Medium (Breaking change, needs careful testing)  
**Priority**: HIGH (Core architecture change)

