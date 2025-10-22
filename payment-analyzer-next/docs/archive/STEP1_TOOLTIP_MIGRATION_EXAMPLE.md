# Step1Container Tooltip Migration Example

## How to Replace DOM Manipulation with React Tooltips

This guide shows specific examples of how to replace DOM manipulation patterns in Step1Container with the new Tooltip components.

## Example 1: File Upload Section Info

### Before (DOM Manipulation)
```tsx
// ❌ Don't do this - DOM manipulation
const createFileUploadTooltip = () => {
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = 'Upload PDF files or manually enter data';
  document.body.appendChild(tooltip);
  // ... positioning logic
};

return (
  <div
    className="section-header"
    onMouseEnter={createFileUploadTooltip}
    onMouseLeave={removeTooltip}
  >
    <h3>File Upload</h3>
  </div>
);
```

### After (React Component)
```tsx
// ✅ Do this - React component
import { InfoIcon } from '@/components/ui';

return (
  <div className="flex items-center gap-2 mb-4">
    <h3 className="text-lg font-semibold">File Upload</h3>
    <InfoIcon
      content="Upload your runsheet and invoice PDFs. The system will automatically extract payment data."
      position="right"
      size={18}
    />
  </div>
);
```

## Example 2: Manual Entry Section

### Before (DOM Manipulation)
```tsx
// ❌ Don't do this
<div
  className="section-header"
  onMouseEnter={(e) => {
    const tooltip = document.createElement('div');
    tooltip.textContent = 'Enter payment data manually';
    // ... more DOM manipulation
  }}
>
  <h3>Manual Entry</h3>
</div>
```

### After (React Component)
```tsx
// ✅ Do this
import { InfoIconWithLabel } from '@/components/ui';

<InfoIconWithLabel
  label="Manual Entry"
  content="Use this section to manually enter payment data if you don't have digital files"
  position="top"
/>
```

## Example 3: Form Field Tooltips

### Before (DOM Manipulation)
```tsx
// ❌ Don't do this
<input
  type="number"
  placeholder="Enter consignments"
  onFocus={(e) => {
    const tooltip = document.createElement('div');
    tooltip.textContent = 'Number of consignments delivered';
    // ... positioning
  }}
  onBlur={removeTooltip}
/>
```

### After (React Component)
```tsx
// ✅ Do this
import { InfoIcon } from '@/components/ui';

<div className="space-y-2">
  <div className="flex items-center gap-2">
    <label htmlFor="consignments" className="font-medium">
      Consignments
    </label>
    <InfoIcon
      content="Enter the number of consignments you delivered on this day"
      ariaLabel="Consignment count information"
    />
  </div>
  <input
    id="consignments"
    type="number"
    placeholder="Enter consignments"
    className="w-full px-3 py-2 border rounded"
  />
</div>
```

## Example 4: Action Button with Help

### Before (DOM Manipulation)
```tsx
// ❌ Don't do this
<button
  onClick={handleAction}
  onMouseEnter={(e) => {
    const tooltip = document.createElement('div');
    tooltip.textContent = 'Process uploaded files';
    // ... DOM manipulation
  }}
>
  Process Files
</button>
```

### After (React Component)
```tsx
// ✅ Do this
import { Tooltip } from '@/components/ui';

<Tooltip content="Process uploaded files and extract payment data">
  <button
    onClick={handleAction}
    className="px-4 py-2 bg-blue-600 text-white rounded"
  >
    Process Files
  </button>
</Tooltip>
```

## Example 5: File Type Information

### Before (DOM Manipulation)
```tsx
// ❌ Don't do this
<div className="file-types">
  <span
    onMouseEnter={() => {
      const tooltip = document.createElement('div');
      tooltip.textContent = 'Runsheet files contain consignment data';
      // ... DOM manipulation
    }}
  >
    Runsheets
  </span>
</div>
```

### After (React Component)
```tsx
// ✅ Do this
import { InfoIcon } from '@/components/ui';

<div className="flex flex-col gap-3">
  <div className="flex items-center gap-2">
    <span className="font-medium">Runsheet Files</span>
    <InfoIcon
      content="Upload daily runsheet PDFs to automatically extract consignment counts"
      size={16}
    />
  </div>

  <div className="flex items-center gap-2">
    <span className="font-medium">Invoice Files</span>
    <InfoIcon
      content="Upload invoice PDFs to verify payment amounts and dates"
      size={16}
    />
  </div>
</div>
```

## Complete Step1Container Example

### Full Migration Pattern

```tsx
import React from 'react';
import { InfoIcon, InfoIconWithLabel, Tooltip } from '@/components/ui';
import { FileUploadMethods } from '../steps/file-upload';
import { ManualEntry } from '../steps/manual-entry';

interface Step1ContainerProps {
  uploadedFiles: File[];
  onFilesUploaded: (files: File[]) => void;
  manualEntries: DailyEntry[];
  onManualEntriesChange: (entries: DailyEntry[]) => void;
}

export const Step1Container: React.FC<Step1ContainerProps> = ({
  uploadedFiles,
  onFilesUploaded,
  manualEntries,
  onManualEntriesChange,
}) => {
  const hasData = uploadedFiles.length > 0 || manualEntries.length > 0;

  return (
    <div className="space-y-6">
      {/* Section Header with Tooltip */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Step 1: Data Input</h2>
        <InfoIcon
          content="Upload files or manually enter your payment data to begin the analysis"
          position="left"
          size={20}
        />
      </div>

      {/* File Upload Section */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">File Upload</h3>
          <InfoIcon
            content="Drag and drop PDF files, click to browse, or paste from clipboard"
            position="top"
          />
        </div>

        {/* File Type Information */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <InfoIconWithLabel
            label="Runsheet Files"
            content="Upload daily runsheet PDFs to automatically extract consignment counts using pattern recognition"
            position="right"
          />

          <InfoIconWithLabel
            label="Invoice Files"
            content="Upload invoice PDFs to verify payment amounts, dates, and ensure accuracy"
            position="right"
          />
        </div>

        {/* File Upload Component */}
        <FileUploadMethods
          files={uploadedFiles}
          onFilesChange={onFilesUploaded}
        />

        {/* File Count Display */}
        {uploadedFiles.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <span>✓ {uploadedFiles.length} file(s) uploaded</span>
            <InfoIcon
              content="Files will be processed automatically when you proceed to the next step"
              size={14}
            />
          </div>
        )}
      </div>

      {/* Manual Entry Section */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Manual Entry</h3>
          <InfoIcon
            content="Manually enter payment data for days when you don't have digital files"
            position="top"
          />
        </div>

        {/* Entry Fields with Tooltips */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="font-medium">Date</label>
                <InfoIcon
                  content="Select the date of the payment entry"
                  size={14}
                />
              </div>
              {/* Date input */}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="font-medium">Consignments</label>
                <InfoIcon
                  content="Enter the number of consignments delivered on this day"
                  size={14}
                />
              </div>
              {/* Number input */}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="font-medium">Payment</label>
                <InfoIcon
                  content="Enter the payment amount received for this day"
                  size={14}
                />
              </div>
              {/* Number input */}
            </div>
          </div>
        </div>

        <ManualEntry
          entries={manualEntries}
          onEntriesChange={onManualEntriesChange}
        />

        {/* Entry Count Display */}
        {manualEntries.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <span>✓ {manualEntries.length} manual entry(ies)</span>
            <InfoIcon
              content="Manual entries will be combined with uploaded file data"
              size={14}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Tooltip content="Clear all uploaded files and manual entries">
          <button
            onClick={handleReset}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={!hasData}
          >
            Reset
          </button>
        </Tooltip>

        <Tooltip
          content={
            hasData
              ? "Proceed to validation and processing"
              : "Please upload files or add manual entries first"
          }
        >
          <button
            onClick={handleProceed}
            disabled={!hasData}
            className="px-6 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300"
          >
            Continue to Next Step
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

// Helper functions
const handleReset = () => {
  // Reset logic
};

const handleProceed = () => {
  // Proceed logic
};
```

## Benefits of This Approach

### 1. **Testability**
```tsx
// Easy to test with React Testing Library
import { render, fireEvent, waitFor } from '@testing-library/react';

test('shows tooltip on hover', async () => {
  const { getByText } = render(<Step1Container {...props} />);

  const fileUploadLabel = getByText('File Upload');
  fireEvent.mouseEnter(fileUploadLabel.nextSibling); // Info icon

  await waitFor(() => {
    expect(getByText(/drag and drop/i)).toBeInTheDocument();
  });
});
```

### 2. **Maintainability**
- Single source of truth for tooltip logic
- Easy to update styles globally
- Consistent behavior across the app

### 3. **Accessibility**
- Built-in ARIA attributes
- Keyboard navigation support
- Screen reader friendly

### 4. **Type Safety**
```tsx
// TypeScript ensures correct props
<InfoIcon
  content="Help text"
  position="top" // Only accepts: 'top' | 'bottom' | 'left' | 'right'
  size={16}      // Number type enforced
/>
```

### 5. **Performance**
- No DOM manipulation overhead
- Proper cleanup on unmount
- Efficient re-rendering

## Migration Checklist

- [ ] Identify all DOM manipulation for tooltips
- [ ] Replace with `<Tooltip>` or `<InfoIcon>` components
- [ ] Remove manual tooltip creation/cleanup code
- [ ] Remove tooltip-related event handlers
- [ ] Update imports to include new components
- [ ] Test tooltip interactions (hover, focus, keyboard)
- [ ] Verify accessibility with screen reader
- [ ] Update tests to use React Testing Library patterns

## Common Patterns

### Pattern 1: Label + Info Icon
```tsx
<div className="flex items-center gap-2">
  <label>Field Name</label>
  <InfoIcon content="Field description" />
</div>
```

### Pattern 2: Section Header + Info Icon
```tsx
<div className="flex items-center justify-between">
  <h3>Section Title</h3>
  <InfoIcon content="Section explanation" position="left" />
</div>
```

### Pattern 3: Button with Tooltip
```tsx
<Tooltip content="Button action description">
  <button>Action</button>
</Tooltip>
```

### Pattern 4: Conditional Tooltip Content
```tsx
<Tooltip
  content={
    hasFiles
      ? "Files ready for processing"
      : "Please upload files first"
  }
>
  <button disabled={!hasFiles}>Process</button>
</Tooltip>
```

### Pattern 5: Rich Content Tooltip
```tsx
<Tooltip
  content={
    <div>
      <strong>Payment Rules:</strong>
      <ul className="ml-4 mt-2 space-y-1">
        <li>Weekday: £2.00 per consignment</li>
        <li>Saturday: £3.00 per consignment</li>
        <li>Bonuses apply based on attendance</li>
      </ul>
    </div>
  }
>
  <button>View Rules</button>
</Tooltip>
```

## Quick Reference

| Old Pattern | New Component | Usage |
|-------------|---------------|-------|
| `document.createElement('div')` | `<Tooltip>` | Wrap element |
| `tooltip.textContent = '...'` | `content` prop | Pass as prop |
| `document.body.appendChild()` | Automatic | Handled by React |
| `onMouseEnter` handler | Built-in | No need to add |
| `onMouseLeave` handler | Built-in | No need to add |
| Manual positioning | `position` prop | `'top' \| 'bottom' \| 'left' \| 'right'` |
| Cleanup function | Automatic | React lifecycle |

## Next Steps

1. Review Step1Container code for DOM manipulation
2. Replace each instance with appropriate Tooltip component
3. Test all tooltip interactions
4. Verify accessibility
5. Update component tests
6. Document any custom patterns used
7. Roll out to other components in the app

---

**Ready to use**: Yes
**Documentation**: Complete
**Examples**: Provided
**Status**: Production-ready
