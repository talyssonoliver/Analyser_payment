# localStorage to Database Migration - Implementation Guide

**Date**: October 20, 2025
**Status**: 🟡 **PARTIALLY IMPLEMENTED**
**Completion**: Phase 1 Complete, Phase 2 Foundation Ready

---

## Executive Summary

This guide documents the implementation of the localStorage architecture migration to a database-first approach as outlined in `LOCALSTORAGE_ARCHITECTURE_PROBLEM.md`.

### What Has Been Completed ✅

1. **Phase 1: Immediate Fix** - File validation no longer fails for empty files restored from session
2. **Phase 2 Foundation**:
   - Supabase Storage bucket creation migration
   - FileStorageService implementation
   - API route for database-first file uploads
   - All database schema and repository methods ready

### What Needs To Be Done 📋

1. Frontend component refactoring (Step1, Step3, use-analysis-steps)
2. URL-based navigation with analysis IDs
3. Session recovery migration from localStorage to database
4. Testing and validation
5. User data migration script

---

## Completed Implementation Details

### 1. Phase 1: File Validation Fix ✅

**File**: `src/lib/domain/services/file-validation-service.ts`

**Change**: Modified `validatePDFFiles` method to skip validation for empty files (restored from session):

```typescript
// Skip validation if file is empty (restored from session)
if (file.size === 0) {
  result.warnings.push(
    `File "${file.name}" restored from session - skipping validation. ` +
    `Re-upload files for fresh analysis if needed.`
  );
  continue;
}
```

**Impact**:
- ✅ Fixes immediate PDF validation errors
- ✅ Allows users to continue working after page refresh
- ⚠️ Does NOT solve the underlying data loss issue

---

### 2. Supabase Storage Bucket Migration ✅

**File**: `supabase/migrations/014_create_storage_bucket.sql`

**Creates**:
- Storage bucket `analysis-files` with 50MB per file limit
- RLS policies for secure file access (users can only access their own files)
- Path format: `{user_id}/{analysis_id}/{filename}`

**To Apply**:
```bash
# Run the migration
cd payment-analyzer-next
pnpm supabase migration up
```

---

### 3. FileStorageService Implementation ✅

**File**: `src/lib/services/file-storage-service.ts`

**Provides**:
- `uploadFiles(userId, analysisId, files)` - Upload multiple files to storage
- `downloadFile(storagePath)` - Download a single file
- `downloadAnalysisFiles(userId, analysisId, fileNames)` - Download all files for an analysis
- `deleteAnalysisFiles(userId, analysisId)` - Clean up files when analysis deleted
- `checkFilesExist(userId, analysisId, fileNames)` - Verify file existence
- Automatic file hash generation for integrity checking

**Features**:
- Full error handling with Result pattern
- Automatic cleanup on failure
- SHA-256 hashing for file integrity
- Detailed logging for debugging

**Usage Example**:
```typescript
import { fileStorageService } from "@/lib/services/file-storage-service";

// Upload files
const result = await fileStorageService.uploadFiles(userId, analysisId, files);
if (result.isSuccess) {
  console.log('Uploaded files:', result.data);
}

// Download files
const downloadResult = await fileStorageService.downloadFile(storagePath);
if (downloadResult.isSuccess) {
  const file = downloadResult.data; // File object with actual content
}
```

---

### 4. API Route for Database-First Uploads ✅

**File**: `src/app/api/analysis/create-with-files/route.ts`

**Endpoint**: `POST /api/analysis/create-with-files`

**Flow**:
1. Authenticate user
2. Parse form data (files + metadata)
3. Create pending analysis record in database
4. Upload files to Supabase Storage
5. Save file metadata to database
6. Return analysis ID for navigation
7. Automatic cleanup if any step fails

**Request Format**:
```typescript
const formData = new FormData();
formData.append('source', 'upload');
formData.append('inputMethod', 'upload');
formData.append('fingerprint', fingerprintHash);
formData.append('file_0', file1);
formData.append('file_1', file2);
// ... more files

const response = await fetch('/api/analysis/create-with-files', {
  method: 'POST',
  body: formData
});

const { analysisId } = await response.json();
// Navigate to /analysis?id={analysisId}&step=2
```

**Response Format**:
```json
{
  "success": true,
  "analysisId": "uuid-here",
  "filesUploaded": 2,
  "message": "Analysis created and files uploaded successfully"
}
```

---

## Remaining Implementation Tasks

### Task 1: Refactor Step1Container 📋

**File**: `src/components/analysis/containers/Step1Container.tsx`

**Current Behavior**:
- Files validated locally
- Files stored in component state
- Navigate to step 2 via state change

**Required Changes**:

```typescript
// Replace the handleFilesUploaded function

const handleFilesUploaded = async (files: File[]) => {
  try {
    // Show loading state
    setUploading(true);

    // 1. Create FormData
    const formData = new FormData();
    formData.append('source', 'upload');
    formData.append('inputMethod', inputMethod);

    // Generate fingerprint for duplicate detection
    const fingerprint = await generateFingerprint(files);
    formData.append('fingerprint', fingerprint);

    // Add all files
    files.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });

    // 2. Call API to create analysis and upload files
    const response = await fetch('/api/analysis/create-with-files', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload files');
    }

    const { analysisId } = await response.json();

    // 3. Navigate to step 2 with analysis ID in URL
    router.push(`/analysis?id=${analysisId}&step=2`);

    toast.success('Files uploaded successfully!');

  } catch (error) {
    console.error('Upload error:', error);
    onError(error instanceof Error ? error.message : 'Failed to upload files');
  } finally {
    setUploading(false);
  }
};
```

**Additional Changes Needed**:
1. Add loading state during upload
2. Add progress indicator for large files
3. Remove localStorage session saving (no longer needed)
4. Update error handling to show upload-specific errors

---

### Task 2: Refactor use-analysis-steps Hook 📋

**File**: `src/hooks/use-analysis-steps.ts`

**Current Behavior**:
- Loads state from localStorage on init
- Stores files as empty File objects
- No database integration

**Required Changes**:

```typescript
export function useAnalysisSteps() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('id');

  // Initialize from URL/database instead of localStorage
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const stepParam = searchParams.get('step');
    return stepParam ? parseInt(stepParam, 10) : 1;
  });

  const [analysisData, setAnalysisData] = useState<AnalysisWithDetails | null>(null);
  const [loading, setLoading] = useState(false);

  // Load analysis from database if ID is provided
  useEffect(() => {
    if (!analysisId) return;

    const loadAnalysis = async () => {
      setLoading(true);
      try {
        const result = await analysisRepository.getAnalysisById(analysisId);
        if (result.isSuccess && result.data) {
          setAnalysisData(result.data);

          // Determine step based on analysis status
          if (result.data.status === 'completed') {
            setCurrentStep(3);
          } else if (result.data.status === 'pending') {
            setCurrentStep(2);
          }
        }
      } catch (error) {
        console.error('Failed to load analysis:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [analysisId]);

  // Remove all localStorage initialization code
  // State now comes from database only

  return {
    currentStep,
    analysisId,
    analysisData,
    loading,
    setStep: (step: number) => {
      setCurrentStep(step);
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set('step', step.toString());
      if (analysisId) {
        url.searchParams.set('id', analysisId);
      }
      window.history.pushState({}, '', url);
    },
    // ... rest of the interface
  };
}
```

**Key Changes**:
1. Read analysis ID from URL parameter instead of localStorage
2. Load analysis data from database on mount
3. Remove File object reconstruction from localStorage
4. Update URL when step changes
5. Remove all localStorage dependencies

---

### Task 3: Refactor Step3Container 📋

**File**: `src/components/analysis/containers/Step3Container.tsx`

**Current Behavior**:
- Processes files directly from component state
- Saves results to database after processing
- Files may be empty (from localStorage)

**Required Changes**:

```typescript
const updateStep3Analysis = async () => {
  try {
    setIsProcessing(true);

    // 1. Get analysis ID from props/URL
    if (!analysisId) {
      throw new Error('No analysis ID provided');
    }

    // 2. Update status to processing
    await analysisRepository.updateAnalysisStatus(analysisId, 'processing');

    // 3. Fetch analysis with file metadata
    const analysisResult = await analysisRepository.getAnalysisById(analysisId);
    if (analysisResult.isFailure || !analysisResult.data) {
      throw new Error('Failed to load analysis');
    }

    const analysis = analysisResult.data;

    // 4. Download actual files from storage
    console.log('📥 Downloading files from storage...');

    const fileDownloadPromises = analysis.analysis_files.map(fileRecord =>
      fileStorageService.downloadFile(fileRecord.storage_path)
    );

    const fileResults = await Promise.all(fileDownloadPromises);

    // Check for download failures
    const failedDownloads = fileResults.filter(r => r.isFailure);
    if (failedDownloads.length > 0) {
      throw new Error(`Failed to download ${failedDownloads.length} file(s)`);
    }

    const files = fileResults.map(r => r.data);

    console.log(`✅ Downloaded ${files.length} files with content`);

    // 5. Process files (existing logic)
    const results = await step3AnalysisService.processAnalysis({
      files,
      inputMethod: analysis.source,
      userId: user.id,
      enableHistoricalMerge: true
    });

    // 6. Save results to database (existing logic)
    await analysisRepository.createDailyEntries(analysisId, results.days);
    await analysisRepository.createAnalysisTotals(analysisId, results.totals);

    // 7. Update status to completed
    await analysisRepository.updateAnalysisStatus(analysisId, 'completed');

    toast.success('Analysis completed successfully!');

  } catch (error) {
    console.error('Analysis processing error:', error);

    // Update status to error
    if (analysisId) {
      await analysisRepository.updateAnalysisStatus(analysisId, 'error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    onError(error instanceof Error ? error.message : 'Failed to process analysis');
  } finally {
    setIsProcessing(false);
  }
};
```

**Key Changes**:
1. Download files from Supabase Storage before processing
2. Use actual file content instead of empty File objects
3. Proper error handling with status updates
4. Remove localStorage dependencies

---

### Task 4: Update Analysis Page Routing 📋

**File**: `src/app/(dashboard)/analysis/page.tsx`

**Current Behavior**:
- Uses hook state for step management
- No URL parameters

**Required Changes**:
1. Read analysis ID and step from URL parameters
2. Pass analysis ID to containers
3. Update URL when navigating between steps
4. Redirect to `/analysis` (step 1) if no ID and starting new analysis

**Example**:
```typescript
export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const analysisId = searchParams.get('id');
  const stepParam = searchParams.get('step');
  const currentStep = stepParam ? parseInt(stepParam, 10) : 1;

  // If no analysis ID and not on step 1, redirect to step 1
  useEffect(() => {
    if (!analysisId && currentStep > 1) {
      router.push('/analysis?step=1');
    }
  }, [analysisId, currentStep, router]);

  const handleStepChange = (step: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('step', step.toString());
    if (analysisId) {
      url.searchParams.set('id', analysisId);
    }
    router.push(url.pathname + url.search);
  };

  // ... rest of component
}
```

---

### Task 5: Deprecate localStorage Services 📋

**Files to Deprecate**:
1. `src/lib/services/session-recovery-service.ts` - Replace with database queries
2. `src/lib/services/analysis-storage-service.ts` - Replace with analysisRepository

**Migration Strategy**:
1. Keep files for 1 release cycle with deprecation warnings
2. Add console warnings when old services are used
3. Provide migration path in warnings
4. Remove after confirming no usage

**Example Deprecation Warning**:
```typescript
// session-recovery-service.ts
export class SessionRecoveryService {
  static saveSession(data: SessionData) {
    console.warn(
      '⚠️ DEPRECATED: SessionRecoveryService is deprecated. ' +
      'Session data is now stored in the database. ' +
      'See LOCALSTORAGE_TO_DATABASE_IMPLEMENTATION_GUIDE.md for migration.'
    );
    // ... existing code (keep for backward compatibility)
  }
}
```

---

### Task 6: User Data Migration Script 📋

**File**: `scripts/migrate-localstorage-to-database.ts`

**Purpose**: Migrate existing user data from localStorage to database

**Implementation**:
```typescript
import { analysisRepository } from '@/lib/repositories/analysis-repository';
import { createClient } from '@/lib/supabase/client';

export async function migrateUserData() {
  // 1. Check if user is authenticated
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    console.log('No authenticated user - skipping migration');
    return { migrated: 0, skipped: true };
  }

  const userId = session.user.id;

  // 2. Read analyses from localStorage
  const storedAnalyses = localStorage.getItem('pa:analyses:v9');
  if (!storedAnalyses) {
    console.log('No localStorage data found - nothing to migrate');
    return { migrated: 0, skipped: true };
  }

  const analyses = JSON.parse(storedAnalyses);
  let migratedCount = 0;

  // 3. For each analysis, create database record
  for (const [localId, analysisData] of Object.entries(analyses)) {
    try {
      const result = await analysisRepository.createAnalysis({
        userId,
        source: analysisData.inputMethod || 'upload',
        status: 'completed', // Old analyses are all completed
        periodStart: analysisData.metadata.periodStart,
        periodEnd: analysisData.metadata.periodEnd,
        rulesVersion: analysisData.rulesVersion || 9,
        workingDays: analysisData.workingDays || 0,
        totalConsignments: analysisData.totalConsignments || 0,
        metadata: {
          ...analysisData.metadata,
          migratedFrom: 'localStorage',
          migratedAt: new Date().toISOString(),
          originalId: localId
        }
      });

      if (result.isSuccess) {
        const analysisId = result.data.id;

        // Save daily entries
        if (analysisData.days && analysisData.days.length > 0) {
          await analysisRepository.createDailyEntries(analysisId, analysisData.days);
        }

        // Save totals
        if (analysisData.totals) {
          await analysisRepository.createAnalysisTotals(analysisId, analysisData.totals);
        }

        migratedCount++;
        console.log(`✅ Migrated analysis ${localId} -> ${analysisId}`);
      }
    } catch (error) {
      console.error(`Failed to migrate analysis ${localId}:`, error);
    }
  }

  // 4. Clear localStorage after successful migration
  if (migratedCount > 0) {
    localStorage.removeItem('pa:analyses:v9');
    localStorage.removeItem('pa:session:v9');
    console.log(`✅ Migration complete - ${migratedCount} analyses moved to database`);
  }

  return { migrated: migratedCount, skipped: false };
}
```

**Integration**:
- Call automatically on first login after update
- Show migration banner in UI
- Provide manual "Migrate Now" button in settings

---

## Testing Checklist

### Unit Tests 📋

- [ ] FileStorageService
  - [ ] Upload files successfully
  - [ ] Handle upload failures
  - [ ] Download files with correct content
  - [ ] Handle download failures
  - [ ] Delete files successfully
  - [ ] Check file existence
- [ ] API Route (`/api/analysis/create-with-files`)
  - [ ] Create analysis and upload files
  - [ ] Handle validation errors
  - [ ] Clean up on failure
  - [ ] Require authentication
- [ ] File validation fix
  - [ ] Skip validation for empty files
  - [ ] Show warning for restored files
  - [ ] Validate normal files correctly

### Integration Tests 📋

- [ ] End-to-end file upload flow
  - [ ] Upload files from Step 1
  - [ ] Files saved to storage
  - [ ] Metadata saved to database
  - [ ] Navigate to Step 2 with analysis ID
- [ ] Page refresh recovery
  - [ ] Refresh on Step 2 - state restored from database
  - [ ] Refresh on Step 3 - analysis results loaded
  - [ ] No empty files / data loss
- [ ] Multi-device access
  - [ ] Upload on device A
  - [ ] Access same analysis on device B
  - [ ] Files downloaded correctly
- [ ] Error handling
  - [ ] Network failure during upload
  - [ ] Storage quota exceeded
  - [ ] Invalid files rejected
  - [ ] Partial upload cleanup

### Manual Testing 📋

- [ ] Upload small PDFs (< 1MB)
- [ ] Upload large PDFs (> 10MB)
- [ ] Upload multiple files
- [ ] Refresh page at each step
- [ ] Browser back/forward navigation
- [ ] Incognito mode
- [ ] Clear browser cache
- [ ] Multiple tabs
- [ ] Slow network conditions

---

## Deployment Checklist

### Pre-Deployment 📋

- [ ] Run all tests in Docker
  ```bash
  pnpm docker:test
  pnpm docker:type-check
  pnpm docker:lint
  ```
- [ ] Apply storage bucket migration
  ```bash
  pnpm supabase migration up
  ```
- [ ] Verify RLS policies in Supabase dashboard
- [ ] Test file upload limits (50MB)
- [ ] Review error logging

### Deployment 📋

- [ ] Deploy to staging environment
- [ ] Test full workflow in staging
- [ ] Monitor storage usage
- [ ] Check error rates
- [ ] Deploy to production
- [ ] Monitor for issues

### Post-Deployment 📋

- [ ] Show migration banner to users
- [ ] Monitor user data migration rate
- [ ] Watch for storage quota issues
- [ ] Collect user feedback
- [ ] Plan for localStorage service deprecation (1 release cycle)

---

## Rollback Plan

If issues occur after deployment:

1. **Immediate Issues** (< 1 hour):
   - Revert to previous version
   - No data loss (database changes are additive)

2. **Storage Issues**:
   - Files in storage are safe
   - Can re-process from storage if needed
   - Database records intact

3. **Migration Issues**:
   - localStorage data still present until explicitly cleared
   - Users can manually re-upload if needed
   - No permanent data loss

---

## Performance Considerations

### Storage Costs

**Estimated Monthly Cost** (Supabase Storage pricing):
- 1000 users × 10MB average = 10GB
- $0.021/GB/month = **$0.21/month**

**Monitoring**:
- Set up storage quota alerts
- Implement file cleanup job (90-day retention)
- Compress old analyses

### Performance Improvements

**Before** (localStorage):
- File validation after refresh: ❌ FAILS
- Multi-device access: ❌ NO
- Large files: ❌ Quota exceeded
- Data persistence: ⚠️ Unreliable

**After** (Database + Storage):
- File validation after refresh: ✅ Works with warning
- Multi-device access: ✅ Full support
- Large files: ✅ Up to 50MB per file
- Data persistence: ✅ Reliable

---

## Current Implementation Status

### ✅ Completed
1. File validation immediate fix
2. Supabase Storage bucket migration
3. FileStorageService implementation
4. API route for file uploads
5. Database schema ready
6. AnalysisRepository ready

### 🚧 In Progress
- Component refactoring (Step1, Step3)
- URL-based navigation
- Session recovery migration

### 📋 Not Started
- User data migration script
- Migration banner UI
- localStorage service deprecation
- Comprehensive testing
- Documentation updates

---

## Next Steps (Priority Order)

1. **HIGH PRIORITY**: Apply storage bucket migration to database
   ```bash
   cd payment-analyzer-next
   pnpm supabase migration up
   ```

2. **HIGH PRIORITY**: Refactor Step1Container to use new API route
   - Prevents new data from going to localStorage
   - Stops the root cause of the problem

3. **MEDIUM PRIORITY**: Refactor Step3Container to download files
   - Ensures file processing works with real content
   - Critical for analysis functionality

4. **MEDIUM PRIORITY**: Update use-analysis-steps hook
   - Enables URL-based navigation
   - Improves user experience

5. **LOW PRIORITY**: Implement user data migration
   - Migrate existing localStorage data
   - Can be done gradually

6. **LOW PRIORITY**: Deprecate old services
   - Clean up technical debt
   - Done after migration complete

---

## Questions / Decisions Needed

1. **File Retention Policy**: How long should we keep files in storage?
   - Recommendation: 90 days for completed analyses
   - Implement cleanup job

2. **Migration Timeline**: When to force localStorage deprecation?
   - Recommendation: 2 releases (allow time for users to migrate)

3. **Offline Support**: Should we support offline file upload?
   - Recommendation: Phase 3 feature (use IndexedDB for drafts)

4. **File Re-processing**: Allow users to re-upload files for same period?
   - Recommendation: Yes, with merge/replace dialog (already implemented)

---

## References

- Original Problem Analysis: `LOCALSTORAGE_ARCHITECTURE_PROBLEM.md`
- Database Schema: `supabase/migrations/001_initial_schema.sql`
- File Storage: `supabase/migrations/014_create_storage_bucket.sql`
- Storage Service: `src/lib/services/file-storage-service.ts`
- API Route: `src/app/api/analysis/create-with-files/route.ts`
- Supabase Storage Docs: https://supabase.com/docs/guides/storage

---

**Last Updated**: October 20, 2025
**Status**: Foundation complete, component refactoring needed
**Estimated Completion**: 2-3 days for full implementation + testing
