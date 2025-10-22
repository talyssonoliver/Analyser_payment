# FileUpdateDialog Implementation Requirements

**Status**: 📋 Requirements Documented (Future Implementation)
**Priority**: Phase 2
**Component Location**: `src/components/analysis/shared/file-update-dialog.tsx` (exists as placeholder)

---

## Executive Summary

The FileUpdateDialog is a critical UX enhancement that allows users to choose how to handle uploading files for dates that already have an existing analysis. Currently, the system creates a new analysis (Analysis #2) automatically. With FileUpdateDialog, users can choose to:

1. **Merge with existing analysis** (recommended for corrections/additions)
2. **Create new analysis** (for comparison or separate tracking)
3. **Cancel** (abort the upload)

---

## Current Behavior (Without FileUpdateDialog)

### Scenario: User Uploads Runsheet, Then Invoice for Same Week

**Step 1: Upload Runsheet**
```typescript
// User uploads: runsheetDV_2025-06-30.pdf (June 30 - July 4)
// Result: Analysis #1 created
{
  id: 'analysis-001',
  dateRange: '30/06/2025 - 04/07/2025',
  totals: {
    consignments: 250,
    bonusTotal: 455,
    paidTotal: 0, // No payment data yet
  }
}
```

**Step 2: Upload Invoice**
```typescript
// User uploads: SELF BILL_100136037.pdf (June 30 - July 4)
// Result: Analysis #2 created (separate from #1)
{
  id: 'analysis-002',
  dateRange: '30/06/2025 - 04/07/2025',
  totals: {
    consignments: 0, // No consignment data
    bonusTotal: 0,    // No bonuses
    paidTotal: 955,   // Only payment data
  }
}
```

**Problem**: User now has TWO incomplete analyses instead of ONE complete analysis.

---

## Future Behavior (With FileUpdateDialog)

### Scenario: User Uploads Runsheet, Then Invoice for Same Week

**Step 1: Upload Runsheet**
```typescript
// Same as current behavior
// Analysis #1 created with runsheet data
```

**Step 2: Upload Invoice → FileUpdateDialog Appears**

```
┌─────────────────────────────────────────────────────────┐
│  File Update Detected                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  You're uploading an invoice for dates that already     │
│  have an existing analysis:                             │
│                                                          │
│  📅 Existing Analysis: #001                             │
│     Date Range: 30/06/2025 - 04/07/2025                │
│     Files: runsheetDV_2025-06-30.pdf                    │
│                                                          │
│  📄 New File: SELF BILL_100136037.pdf                   │
│     Date Range: 30/06/2025 - 04/07/2025                │
│                                                          │
│  How would you like to proceed?                         │
│                                                          │
│  ○ Merge with existing analysis (recommended)           │
│    Combine data from both files into Analysis #001      │
│                                                          │
│  ○ Create new analysis                                  │
│    Keep analyses separate for comparison                │
│                                                          │
│  [Cancel]  [Continue]                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Option 1: User Selects "Merge with existing analysis"**
```typescript
// Result: Analysis #1 is updated with invoice data
{
  id: 'analysis-001', // Same ID
  dateRange: '30/06/2025 - 04/07/2025',
  files: [
    'runsheetDV_2025-06-30.pdf',
    'SELF BILL_100136037.pdf', // Added
  ],
  totals: {
    consignments: 250,  // From runsheet
    bonusTotal: 455,    // From runsheet
    paidTotal: 955,     // From invoice ✅
    difference: 0,      // Complete data ✅
  }
}
```

**Option 2: User Selects "Create new analysis"**
```typescript
// Same as current behavior: Creates Analysis #2
```

---

## Technical Requirements

### 1. Trigger Conditions

FileUpdateDialog should appear when:

```typescript
interface TriggerCondition {
  // User uploads file(s)
  newFiles: File[];

  // System detects:
  existingAnalyses: Analysis[];

  // Check:
  dateRangeOverlap: boolean; // New files overlap with existing analysis dates

  // Optional: Narrow trigger to same user
  userId: string;
}
```

**Implementation Location**: `src/components/analysis/containers/Step1Container.tsx`

```typescript
// Step1Container.tsx
const handleFileUpload = async (files: File[]) => {
  // 1. Parse file dates (quick scan without full processing)
  const newFileDateRange = await extractDateRangeFromFiles(files);

  // 2. Query existing analyses for this user
  const existingAnalyses = await analysisService.getUserAnalyses(userId);

  // 3. Check for overlaps
  const overlappingAnalysis = existingAnalyses.find(analysis =>
    dateRangesOverlap(analysis.dateRange, newFileDateRange)
  );

  // 4. Show dialog if overlap detected
  if (overlappingAnalysis) {
    setFileUpdateDialogData({
      existingAnalysis: overlappingAnalysis,
      newFiles: files,
      newFileDateRange,
    });
    setShowFileUpdateDialog(true);
    return; // Wait for user choice
  }

  // 5. No overlap: proceed with normal workflow
  await processFiles(files);
};
```

### 2. Date Range Extraction

**Requirement**: Quick date extraction WITHOUT full PDF processing

```typescript
// src/lib/services/quick-date-extractor.ts
export class QuickDateExtractor {
  /**
   * Extracts date range from files using lightweight parsing
   * Should complete in <500ms even for large PDFs
   */
  static async extractDateRange(files: File[]): Promise<DateRange> {
    // For runsheets: Check filename pattern or first page
    // For invoices: Check first page for date markers

    // Return earliest start date and latest end date
    return {
      start: '30/06/2025',
      end: '04/07/2025',
    };
  }
}
```

### 3. FileUpdateDialog Component

**Component Structure**:

```typescript
// src/components/analysis/shared/file-update-dialog.tsx
export interface FileUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  existingAnalysis: {
    id: string;
    dateRange: { start: string; end: string };
    files: string[];
    totals?: AnalysisTotals;
  };
  newFiles: File[];
  newFileDateRange: { start: string; end: string };
  onMerge: () => void;
  onCreateNew: () => void;
}

export function FileUpdateDialog({
  open,
  onClose,
  existingAnalysis,
  newFiles,
  newFileDateRange,
  onMerge,
  onCreateNew,
}: FileUpdateDialogProps) {
  const [choice, setChoice] = useState<'merge' | 'createNew'>('merge');

  const handleContinue = () => {
    if (choice === 'merge') {
      onMerge();
    } else {
      onCreateNew();
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      {/* UI implementation */}
    </Dialog>
  );
}
```

### 4. Merge Logic

**When user chooses "Merge"**:

```typescript
// src/lib/services/analysis-merge-service.ts
export class AnalysisMergeService {
  /**
   * Merges new files into existing analysis
   */
  static async mergeFilesIntoAnalysis(
    analysisId: string,
    newFiles: File[]
  ): Promise<MergeResult> {
    // 1. Retrieve existing analysis
    const existing = await analysisService.getAnalysisById(analysisId);

    // 2. Parse new files
    const newData = await PDFProcessor.processFiles(newFiles);

    // 3. Merge data using merge strategies
    const mergedData = await this.mergeDailyEntries(
      existing.dailyEntries,
      newData.dailyEntries
    );

    // 4. Re-calculate totals with Step3AnalysisService
    const updatedAnalysis = await Step3AnalysisService.processAnalysis(
      mergedData,
      existing.id
    );

    // 5. Update database
    await analysisService.updateAnalysis(analysisId, {
      dailyEntries: mergedData,
      totals: updatedAnalysis.totals,
      files: [...existing.files, ...newFiles.map(f => f.name)],
      fingerprints: [...existing.fingerprints, ...newFingerprints],
      updatedAt: new Date(),
    });

    return {
      success: true,
      analysisId,
      message: 'Files merged successfully',
    };
  }

  /**
   * Merges daily entries using appropriate merge strategies
   */
  private static async mergeDailyEntries(
    existing: DailyEntry[],
    newEntries: DailyEntry[]
  ): Promise<DailyEntry[]> {
    // Group entries by date
    const entriesByDate = new Map<string, DailyEntry[]>();

    [...existing, ...newEntries].forEach(entry => {
      const dateKey = formatDate(entry.date);
      if (!entriesByDate.has(dateKey)) {
        entriesByDate.set(dateKey, []);
      }
      entriesByDate.get(dateKey)!.push(entry);
    });

    // Merge entries for each date
    const merged: DailyEntry[] = [];

    for (const [date, entries] of entriesByDate) {
      if (entries.length === 1) {
        // No conflict: use as-is
        merged.push(entries[0]);
      } else {
        // Merge using strategy
        merged.push(await this.mergeEntries(entries));
      }
    }

    return merged.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Merges multiple entries for the same date
   */
  private static async mergeEntries(entries: DailyEntry[]): Promise<DailyEntry> {
    // Apply merge strategies based on source types

    // Strategy 1: Complementary data (runsheet + invoice)
    // Combine consignments from runsheet + payment from invoice

    // Strategy 4: Simple overwrite (runsheet + corrected runsheet)
    // Use latest data (most recent timestamp)

    // Implementation here...
    return mergedEntry;
  }
}
```

### 5. Database Schema Updates

**analyses table** (no changes needed - already supports multiple files)

**analysis_files table** (new table to track file associations)

```sql
CREATE TABLE IF NOT EXISTS analysis_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_fingerprint TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'runsheet' | 'invoice'
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_size BIGINT,

  CONSTRAINT fk_analysis
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_analysis_files_analysis_id ON analysis_files(analysis_id);
CREATE INDEX idx_analysis_files_fingerprint ON analysis_files(file_fingerprint);
```

### 6. API Endpoints

**New endpoint for merging files**:

```typescript
// src/app/api/analysis/[id]/merge/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  // Merge files into existing analysis
  const result = await AnalysisMergeService.mergeFilesIntoAnalysis(id, files);

  return NextResponse.json(result);
}
```

---

## Merge Strategies

### Strategy 1: Complementary Data (Runsheet + Invoice)

**Scenario**: Runsheet has consignment data, Invoice has payment data

```typescript
// Runsheet data
{
  date: '2025-06-30',
  consignments: 50,
  bonuses: { unloading: 30, attendance: 25, early: 50 },
  payment: null, // Missing
}

// Invoice data
{
  date: '2025-06-30',
  consignments: null, // Missing
  bonuses: null,      // Missing
  payment: 205,       // Has payment
}

// Merged result
{
  date: '2025-06-30',
  consignments: 50,    // From runsheet
  bonuses: { unloading: 30, attendance: 25, early: 50 }, // From runsheet
  payment: 205,        // From invoice ✅
}
```

### Strategy 4: Simple Overwrite (Runsheet + Corrected Runsheet)

**Scenario**: Original runsheet has error, corrected runsheet uploaded later

```typescript
// Original runsheet (uploaded first)
{
  date: '2025-06-30',
  consignments: 50, // Wrong
  timestamp: '2025-06-30T10:00:00Z',
}

// Corrected runsheet (uploaded later)
{
  date: '2025-06-30',
  consignments: 55, // Correct
  timestamp: '2025-06-30T14:00:00Z',
}

// Merged result (latest wins)
{
  date: '2025-06-30',
  consignments: 55, // Corrected value ✅
  timestamp: '2025-06-30T14:00:00Z',
}
```

---

## User Experience Flow

### Happy Path: Merge with Existing Analysis

```
1. User opens Payment Analyzer
2. User already created Analysis #1 with runsheet (June 30 - July 4)
3. User receives invoice PDF via email
4. User navigates to Analysis page (Step 1)
5. User drags invoice PDF into upload area
6. System detects date overlap (June 30 - July 4)
7. FileUpdateDialog appears with clear explanation
8. User selects "Merge with existing analysis" (default)
9. User clicks "Continue"
10. System merges invoice data into Analysis #1
11. Progress indicator shows: "Merging files..."
12. Success message: "Invoice merged successfully! Analysis updated."
13. User proceeds to Step 3 to view complete analysis
```

### Alternative Path: Create New Analysis

```
Steps 1-7: Same as above
8. User selects "Create new analysis"
9. User clicks "Continue"
10. System creates Analysis #2 (current behavior)
11. Success message: "New analysis created."
12. User can compare Analysis #1 vs #2
```

### Cancel Path

```
Steps 1-7: Same as above
8. User clicks "Cancel"
9. Upload is aborted
10. User remains on Step 1 (Upload Files)
11. No changes made to existing analyses
```

---

## Edge Cases and Error Handling

### Edge Case 1: Partial Date Overlap

```typescript
// Existing Analysis #1
dateRange: '30/06/2025 - 04/07/2025'

// New file
dateRange: '03/07/2025 - 10/07/2025'

// Overlap: July 3-4
// Question: Should FileUpdateDialog appear?
// Answer: YES - show overlap details in dialog
```

### Edge Case 2: Multiple Existing Analyses Overlap

```typescript
// User has:
// Analysis #1: June 30 - July 4
// Analysis #2: July 1 - July 7

// User uploads file: July 2 - July 5
// Overlaps with BOTH analyses

// Solution: Show list of all overlapping analyses
// Let user choose which one to merge with
```

### Edge Case 3: File Already Processed (Duplicate)

```typescript
// User uploads: runsheetDV_2025-06-30.pdf
// System detects: Same file already in Analysis #1 (via fingerprint)

// Show error (not FileUpdateDialog):
"This file has already been processed in Analysis #1.
The file is identical (same content) to the one already uploaded."

// Options:
[View Existing Analysis] [Cancel]
```

### Error Handling

```typescript
interface MergeError {
  code: 'MERGE_CONFLICT' | 'DATABASE_ERROR' | 'PROCESSING_ERROR';
  message: string;
  details?: any;
}

// Example errors:
{
  code: 'MERGE_CONFLICT',
  message: 'Cannot merge: Conflicting data for July 3',
  details: {
    field: 'consignments',
    existingValue: 50,
    newValue: 55,
    date: '2025-07-03',
  }
}

// User sees:
"⚠️ Merge Conflict Detected

We found conflicting data that needs your review:

Date: July 3, 2025
Field: Consignments
Existing: 50 parcels
New: 55 parcels

Which value is correct?
○ Keep existing (50)
○ Use new (55)
○ Enter manually: [____]

[Cancel] [Apply Changes]"
```

---

## Testing Requirements

### Unit Tests

```typescript
// tests/unit/services/analysis-merge-service.test.ts
describe('AnalysisMergeService', () => {
  it('should merge complementary data (runsheet + invoice)', async () => {
    // Test Strategy 1
  });

  it('should overwrite with latest data (corrected runsheet)', async () => {
    // Test Strategy 4
  });

  it('should handle partial date overlaps', async () => {
    // Test edge case 1
  });

  it('should detect merge conflicts', async () => {
    // Test error handling
  });
});
```

### Integration Tests

```typescript
// tests/integration/file-update-dialog.test.ts
describe('FileUpdateDialog Integration', () => {
  it('should trigger dialog when uploading file with overlapping dates', async () => {
    // Full workflow test
  });

  it('should merge files successfully when user chooses merge', async () => {
    // Test merge path
  });

  it('should create new analysis when user chooses create new', async () => {
    // Test create new path
  });
});
```

### E2E Tests (with real seed data)

**Location**: `tests/integration/phase2-real-data.test.ts` (already created)

---

## Implementation Checklist

### Phase 2.1: Core Functionality

- [ ] Create `QuickDateExtractor` service
- [ ] Create `AnalysisMergeService` with merge strategies
- [ ] Implement `FileUpdateDialog` component
- [ ] Add trigger logic to `Step1Container`
- [ ] Create API endpoint `/api/analysis/[id]/merge`
- [ ] Add `analysis_files` database table
- [ ] Write unit tests for merge logic
- [ ] Write integration tests for dialog workflow

### Phase 2.2: Enhanced UX

- [ ] Add progress indicators during merge
- [ ] Show diff preview before merge
- [ ] Handle merge conflicts with user input
- [ ] Support multiple file selection with smart grouping
- [ ] Add "Undo merge" functionality

### Phase 2.3: Edge Cases

- [ ] Handle partial date overlaps
- [ ] Handle multiple overlapping analyses
- [ ] Detect and prevent duplicate uploads
- [ ] Validate merged data integrity

---

## Performance Requirements

- **Date extraction**: <500ms per file
- **Overlap detection**: <100ms (indexed database query)
- **Merge operation**: <5s for typical week (5-7 days)
- **UI responsiveness**: Dialog opens within 200ms

---

## Success Metrics

### User Experience

- **Reduced confusion**: Users no longer create duplicate analyses accidentally
- **Faster workflow**: Merge instead of manual comparison
- **Data completeness**: Single analysis has all data

### Technical

- **Merge accuracy**: 100% data preservation
- **Performance**: Merge completes in <5s
- **Error rate**: <1% merge failures

---

## Future Enhancements (Phase 3+)

- **Smart merge suggestions**: AI-powered conflict resolution
- **Batch merge**: Merge multiple files at once
- **Analysis comparison view**: Side-by-side comparison of analyses
- **Auto-merge**: Automatically merge files with same fingerprint base

---

**Last Updated**: December 2025
**Status**: Requirements Complete - Ready for Implementation
**Estimated Effort**: 2-3 sprints
**Priority**: High (Phase 2)
