# PDF Processing Fix Summary

## Problem Analysis

The PDF processing was failing with `ReferenceError: window is not defined` errors. The root cause was:

1. **Web Worker context incompatibility**: The code was trying to access `window.pdfjsLib` inside a Web Worker, where `window` doesn't exist
2. **Missing PDF.js in Worker**: PDF.js wasn't properly loaded in the Web Worker context via `importScripts()`
3. **Cached JavaScript**: Browser was running old cached code even after changes

## Fixes Applied

### 1. pdf-processor.ts - getFileContentPreview() (Lines 231-265)
**Before**: Only checked `window.pdfjsLib`
```typescript
if (typeof window !== 'undefined' && window.pdfjsLib) {
  // Use window.pdfjsLib
}
```

**After**: Checks both `window` and `self` contexts
```typescript
const globalScope = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null);
if (globalScope && (globalScope as any).pdfjsLib) {
  // Works in both main thread and Web Worker
}
```

**Why**: This method runs inside the Web Worker when processing files, so it needs to access `self.pdfjsLib` instead of `window.pdfjsLib`.

---

### 2. pdf-parser-base.ts - getPDFJS() (Lines 13-32)
**Before**: Only supported main thread
```typescript
if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
  return (window as any).pdfjsLib;
}
throw new Error('PDF.js not loaded...');
```

**After**: Supports both main thread and Web Worker
```typescript
if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
  console.log('✅ Using PDF.js from window context (main thread)');
  return (window as any).pdfjsLib;
}

if (typeof self !== 'undefined' && (self as any).pdfjsLib) {
  console.log('✅ Using PDF.js from self context (Web Worker)');
  return (self as any).pdfjsLib;
}

throw new Error('PDF.js not loaded...');
```

**Why**: The PDF parsers (runsheet-parser.ts, invoice-parser.ts) call `getPDFJS()` to get the PDF.js library. When running in a Web Worker, they need to get it from `self` instead of `window`.

---

### 3. pdf-worker.ts - PDF.js loading (Lines 6-31)
**Before**: Silent error handling
```typescript
try {
  importScripts('https://...');
} catch (error) {
  console.error('Failed to load PDF.js in Web Worker:', error);
}
```

**After**: Comprehensive logging and verification
```typescript
try {
  console.log('🔄 Web Worker: Loading PDF.js from CDN...');
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');

  if (typeof self !== 'undefined' && (self as any).pdfjsLib) {
    console.log('✅ Web Worker: PDF.js loaded successfully');
    (self as any).pdfjsLib.GlobalWorkerOptions.workerSrc = '...';
    console.log('✅ Web Worker: PDF.js worker configured');
  } else {
    console.error('❌ Web Worker: PDF.js loaded but pdfjsLib not available on self');
  }
} catch (error) {
  console.error('❌ Web Worker: Failed to load PDF.js:', error);
}
```

**Why**: Better visibility into whether PDF.js is loading correctly in the Web Worker. The logs will immediately show if `importScripts()` fails or if `pdfjsLib` isn't available after loading.

---

### 4. layout.tsx - PDF.js loading (Lines 31-54)
**Already Fixed**: Loading PDF.js synchronously with polyfill
```typescript
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script dangerouslySetInnerHTML={{
  __html: `
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '...';
    }
    // Polyfill for File.arrayBuffer()
    if (typeof File !== 'undefined' && typeof File.prototype.arrayBuffer === 'undefined') {
      File.prototype.arrayBuffer = function() { ... };
    }
  `
}} />
```

**Why**: Ensures PDF.js is loaded in the main thread before any components try to use it.

---

## How the System Works Now

### Main Thread Flow:
1. User uploads PDFs
2. `step3-analysis-service.ts` receives files
3. Creates `PDFWorkerClient` and checks if Web Workers available
4. If available, sends files to Web Worker for processing

### Web Worker Flow:
1. `pdf-worker.ts` loads via `importScripts()`
2. **FIRST**: Loads PDF.js via `importScripts('https://cdnjs.../pdf.min.js')`
3. **THEN**: Imports `PDFProcessor` and other modules
4. `PDFProcessor.processFile()` is called for each file
5. Calls `getFileContentPreview()` → uses `self.pdfjsLib` ✅
6. Calls parser (`RunsheetParser` or `InvoiceParser`)
7. Parser calls `getPDFJS()` → returns `self.pdfjsLib` ✅
8. Parsing succeeds, returns results to main thread

---

## Testing Instructions

### Step 1: Hard Refresh Browser
**CRITICAL**: The browser is caching the old JavaScript code!

**Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
**Mac**: `Cmd + Shift + R`

Or:
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Step 2: Check Console Logs
After hard refresh, upload PDFs and look for these logs:

**Expected Success Logs:**
```
🔄 Web Worker: Loading PDF.js from CDN...
✅ Web Worker: PDF.js loaded successfully
✅ Web Worker: PDF.js worker configured
✅ Using PDF.js from self context (Web Worker)
🔍 PDF.js is available, getting content preview
🔍 Got preview text (first 200 chars): ...
✅ Runsheet - Total deliveries: 23
💰 2025-06-30: +£46.50 (Standard)
```

**Error Logs to Watch For:**
```
❌ Web Worker: Failed to load PDF.js: [error details]
❌ Web Worker: PDF.js loaded but pdfjsLib not available on self
ReferenceError: window is not defined
```

### Step 3: Verify PDF Data Extraction
1. Upload runsheet PDFs → Check for consignment counts
2. Upload invoice PDFs → Check for payment amounts
3. Check the analysis results show correct data

---

## Expected Console Output (Success)

When everything works correctly, you should see:

```javascript
// Step 1: Worker initialization
🔄 Web Worker: Loading PDF.js from CDN...
✅ Web Worker: PDF.js loaded successfully
✅ Web Worker: PDF.js worker configured

// Step 2: File processing
🔍 DEBUG: Starting PDF processing for 4 files
📄 Using direct PDF processing (main thread) - matching legacy behavior
🔍 PDF.js is available, getting content preview
✅ Using PDF.js from self context (Web Worker)

// Step 3: Runsheet parsing
🔍 RUNSHEET DEBUG - Page text preview (first 500 chars): Date: 30/06/2025...
🔍 RUNSHEET DEBUG - Extracted date: 2025-06-30
🔍 RUNSHEET DEBUG - Extracted consignments count: 23

// Step 4: Invoice parsing
🔍 INVOICE DEBUG - Full text preview (first 500 chars): ...
🔍 INVOICE DEBUG - Extracted document total: 457.50
🔍 INVOICE DEBUG - Extracted entries count: 5
💰 2025-06-30: +£46.50 (Standard)

// Step 5: Success
📊 Extracted daily data: {daysCount: 5, dates: [...], data: {...}}
✅ Analysis complete
```

---

## What Changed from Legacy Code

### Legacy Code Approach:
- All PDF processing on **main thread**
- Direct access to `window.pdfjsLib`
- Simple token-based parsing

### Modern Code Approach:
- PDF processing in **Web Worker** (for performance)
- Supports both `window.pdfjsLib` (main thread) and `self.pdfjsLib` (worker)
- Same token-based parsing as legacy
- Better error handling and logging

### Key Compatibility:
✅ Uses exact same PDF.js version (3.11.174)
✅ Same parsing patterns (tokens, regex)
✅ Same validation logic
✅ Same data structure output

---

## Troubleshooting

### If you still see "window is not defined":
1. **Hard refresh** the browser (Ctrl+Shift+R)
2. Clear browser cache completely
3. Check DevTools → Application → Service Workers → Unregister all
4. Restart the dev server: `pnpm dev`

### If PDF.js fails to load in worker:
1. Check network tab for failed CDN requests
2. Verify internet connection
3. Try switching to a different CDN or local PDF.js

### If parsing still fails:
1. Check file format (must be valid PDFs)
2. Look at the debug logs for parser-specific errors
3. Compare with legacy code output using same files

---

## Files Modified

1. `/src/lib/infrastructure/pdf/pdf-processor.ts`
2. `/src/lib/infrastructure/pdf/pdf-parser-base.ts`
3. `/src/lib/workers/pdf-worker.ts`
4. `/src/app/layout.tsx` (already done previously)
5. `/src/lib/services/step3-analysis-service.ts` (already done previously)

---

## Next Steps

1. **Hard refresh browser** to clear cache
2. **Upload test PDFs** (runsheets and invoices)
3. **Check console logs** for success messages
4. **Verify data extraction** in the analysis results
5. **Report any remaining errors** with full console logs

If errors persist after hard refresh, the issue may be with:
- Browser service worker caching
- CDN accessibility
- PDF file format compatibility
