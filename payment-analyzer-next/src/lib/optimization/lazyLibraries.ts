/**
 * Lazy Library Loading Utilities
 * Demonstrates how to load heavy libraries only when needed
 * 
 * NOTE: Most functionality has been moved to more specific files:
 * - dynamic-motion.ts for Framer Motion
 * - dynamic-charts.ts for Recharts
 * - pdf-parser-base.ts for PDF.js
 */

import * as React from 'react';

// Lazy load date-fns functions only when needed
export const loadDateFormatter = async () => {
  const { format, parseISO, isValid } = await import('date-fns');
  return { format, parseISO, isValid };
};

// Lazy load PDF.js worker only when needed
export const loadPDFWorker = async () => {
  const pdfjs = await import('pdfjs-dist');
  
  // Only load worker if not already loaded
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    // Use CDN worker instead of bundled worker to avoid module resolution issues
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }
  
  return pdfjs;
};

// Generic lazy component wrapper
export const createLazyComponent = <T extends React.ComponentType>(
  importFn: () => Promise<{ default: T } | T>,
  fallback?: React.ComponentType
) => {
  const Component = React.lazy(async () => {
    const moduleResult = await importFn();
    return 'default' in moduleResult ? moduleResult : { default: moduleResult };
  });

  const LazyWrapper = (props: Record<string, unknown>) =>
    React.createElement(
      React.Suspense,
      {
        fallback: fallback
          ? React.createElement(fallback)
          : React.createElement('div', null, 'Loading...')
      },
      React.createElement(Component as unknown as React.ComponentType, props)
    );

  LazyWrapper.displayName = 'LazyWrapper';
  return LazyWrapper;
};

// Cache for loaded libraries to avoid re-importing
const libraryCache = new Map<string, unknown>();

export const getCachedLibrary = async <T>(key: string, loader: () => Promise<T>): Promise<T> => {
  if (libraryCache.has(key)) {
    return libraryCache.get(key) as T;
  }

  const library = await loader();
  libraryCache.set(key, library);
  return library;
};

// Clear cache if needed (useful for testing or memory management)
export const clearLibraryCache = () => {
  libraryCache.clear();
};