# File Update Markers - Visual Example

## Step 2 File List with Update Markers

### Before Implementation
```
┌─────────────────────────────────────────────────────┐
│ Uploaded Files                          2 files     │
├─────────────────────────────────────────────────────┤
│ 📦 runsheet_week1.pdf                              │
│    1.2KB    Runsheet                       [X]     │
├─────────────────────────────────────────────────────┤
│ 💰 invoice_week1.pdf                               │
│    2.5KB    Invoice                        [X]     │
└─────────────────────────────────────────────────────┘
```

### After Implementation (with updated file)
```
┌─────────────────────────────────────────────────────────┐
│ Uploaded Files                            2 files       │
├─────────────────────────────────────────────────────────┤
│ 📦 runsheet_week1.pdf  [⚠ Updated]                    │
│    1.2KB    Runsheet                         [X]       │
│                                                          │
│    Tooltip on hover:                                    │
│    ┌────────────────────────────────────┐              │
│    │ File Updated                       │              │
│    │ Change: Content                    │              │
│    │ Last analyzed: Jan 15, 2025        │              │
│    │ ───────────────────────────────    │              │
│    │ This file has been modified since  │              │
│    │ your last analysis.                │              │
│    └────────────────────────────────────┘              │
├─────────────────────────────────────────────────────────┤
│ 💰 invoice_week1.pdf                                   │
│    2.5KB    Invoice                          [X]       │
└─────────────────────────────────────────────────────────┘
```

## Update Marker Appearance

### Badge Styling
```
[⚠ Updated]
│  │    │
│  │    └─ Text label
│  └────── Warning triangle icon
└───────── Amber color scheme (#f59e0b, #fef3c7)
```

### Color Scheme
- **Background**: `bg-amber-50` (#fef3c7)
- **Text**: `text-amber-700` (#b45309)
- **Border**: `border-amber-200` (#fde68a)
- **Hover**: `hover:bg-amber-100` (#fef3c7 → #fde047)

### Size & Spacing
- **Padding**: `px-2 py-0.5` (8px horizontal, 2px vertical)
- **Font**: `text-xs` (12px)
- **Gap**: `gap-2` (8px) between filename and badge
- **Rounded**: `rounded-md` (6px border radius)

## Different Change Types

### Content Change
```
📦 runsheet_week1.pdf  [⚠ Updated]
   Tooltip: "Change: Content"
   Meaning: File content (hash) has changed
```

### Size Change
```
💰 invoice_week1.pdf  [⚠ Updated]
   Tooltip: "Change: Size"
   Meaning: File size is different
```

### Timestamp Change
```
📦 runsheet_week2.pdf  [⚠ Updated]
   Tooltip: "Change: Timestamp"
   Meaning: Last modified date changed
```

### New File (No Marker)
```
💰 invoice_week2.pdf
   No marker shown - this is a completely new file
```

### Identical Duplicate (No Marker)
```
📦 runsheet_week1.pdf
   No marker shown - exact same file uploaded before
```

## Usage Scenarios

### Scenario 1: Re-uploading with one updated file
**User Action**: Upload runsheet (updated) + invoice (same as before)

**Result**:
```
📦 runsheet_week1.pdf  [⚠ Updated]  ← Shows marker
💰 invoice_week1.pdf                ← No marker (duplicate)
```

### Scenario 2: All new files
**User Action**: First time uploading these specific files

**Result**:
```
📦 runsheet_week3.pdf   ← No marker (new)
💰 invoice_week3.pdf    ← No marker (new)
```

### Scenario 3: Corrected runsheet after initial upload
**User Action**: Upload corrected version of previously uploaded runsheet

**Result**:
```
📦 runsheet_week1_corrected.pdf  [⚠ Updated]
   Tooltip shows: "Last analyzed: Jan 15, 2025 at 2:30 PM"
```

### Scenario 4: Mixed set
**User Action**: Upload 3 files - one new, one updated, one duplicate

**Result**:
```
📦 runsheet_week1.pdf  [⚠ Updated]  ← Modified
💰 invoice_week1.pdf                ← Duplicate (no marker)
📦 runsheet_week2.pdf               ← New (no marker)
```

## Accessibility Features

### Screen Reader Announcement
```html
<div role="status" aria-label="File updated - Content change detected since Jan 15, 2025">
  <span class="badge">
    <svg aria-hidden="true">...</svg>
    <span>Updated</span>
  </span>
</div>
```

### Keyboard Navigation
1. Tab to file list
2. Arrow keys to navigate files
3. Tab to update marker (if present)
4. Enter/Space to trigger tooltip
5. Esc to close tooltip

### ARIA Labels
- **Marker**: `role="status"` for live region
- **Tooltip**: Descriptive text with change details
- **Icon**: `aria-hidden="true"` (decorative only)

## Responsive Design

### Desktop
```
runsheet_week1.pdf  [⚠ Updated]
```

### Mobile
```
runsheet_week1.pdf
[⚠ Updated]
```
(Badge wraps to next line if needed)

## Performance Characteristics

### Loading State
```
During detection:
📦 runsheet_week1.pdf      ← No marker shown yet
💰 invoice_week1.pdf       ← Markers appear after detection

After detection (200-500ms):
📦 runsheet_week1.pdf  [⚠ Updated]
💰 invoice_week1.pdf
```

### Large File Sets
- Parallel processing: All files analyzed simultaneously
- Efficient key generation: O(1) lookup by `${name}-${size}`
- Graceful degradation: Individual file errors don't break UI

## Error Handling Display

### Individual File Error
```
📦 runsheet_week1.pdf      ← No marker (error treated as new file)
💰 invoice_week1.pdf  [⚠ Updated]  ← Other files still processed
```

### Service Unavailable
```
📦 runsheet_week1.pdf      ← No markers shown
💰 invoice_week1.pdf       ← File list still functional
```

---

## Developer Integration Example

```tsx
// Component usage
import { LegacyStep2Validation } from '@/components/analysis/validation/legacy-step2-validation';

<LegacyStep2Validation
  uploadedFiles={files}
  validationResult={validation}
  onAnalyzeWeek={handleAnalyze}
  onFileRemove={handleRemove}
/>
// Update markers automatically appear for modified files
```

```tsx
// Direct marker usage (if needed elsewhere)
import { FileUpdateMarker } from '@/components/analysis/validation/file-update-marker';

<FileUpdateMarker
  isUpdated={true}
  changeType="content"
  lastProcessed={new Date('2025-01-15')}
/>
```

```tsx
// Hook usage (standalone)
import { useFileUpdateDetection } from '@/hooks/use-file-update-detection';

const { fileUpdateFlags, isLoading, error } = useFileUpdateDetection(files);

// Check specific file
const fileKey = `${file.name}-${file.size}`;
const isUpdated = fileUpdateFlags[fileKey]?.isUpdated;
```

---

**Visual Reference Created**: October 19, 2025
**Feature**: File List 'Updated' Markers
