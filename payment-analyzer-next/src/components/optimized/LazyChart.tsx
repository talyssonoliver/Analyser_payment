/**
 * Lazy-loaded Chart Component
 * Demonstrates how to lazy load heavy charting libraries like Recharts
 */

'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Lazy load the chart component only when needed (placeholder implementation)
const RechartsChart = dynamic(
  () => import('../charts/revenue-chart').then((mod) => ({ default: mod.RevenueChart })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-gray-600">Loading chart...</span>
      </div>
    ),
    ssr: false, // Disable SSR for client-only components
  }
);

// Lazy load PDF viewer only when needed (placeholder implementation)  
const PDFViewer = dynamic(
  () => Promise.resolve({ default: ({ url }: { url: string }) => <div>PDF Viewer Placeholder: {url}</div> }),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading PDF viewer...</p>
        </div>
      </div>
    ),
    ssr: false, // PDF processing should only happen client-side
  }
);

interface ChartDataPoint {
  date?: string;
  value?: number;
  name?: string;
  [key: string]: unknown;
}

export interface LazyChartProps {
  data?: ChartDataPoint[];
  showPDF?: boolean;
  pdfUrl?: string;
}

export function LazyChart({ data, showPDF, pdfUrl }: LazyChartProps) {
  return (
    <div className="space-y-6">
      {data && data.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Analytics Chart</h3>
          <RechartsChart data={data.map(item => ({
            period: item.date || item.name || 'Unknown',
            expected: item.value || 0,
            actual: item.value || 0,
            difference: 0,
            consignments: 0,
            id: item.date || item.name || Math.random().toString()
          }))} />
        </div>
      )}
      
      {showPDF && pdfUrl && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">PDF Preview</h3>
          <PDFViewer url={pdfUrl} />
        </div>
      )}
    </div>
  );
}

// Example of conditional dynamic imports
export function ConditionalLazyLoading({ showAdvanced }: { showAdvanced: boolean }) {
  return (
    <div>
      <h2>Basic Content</h2>
      
      {showAdvanced && (
        <AdvancedFeatures />
      )}
    </div>
  );
}

// This component will only load when showAdvanced is true (placeholder implementation)
const AdvancedFeatures = dynamic(
  () => Promise.resolve({ default: () => <div>Advanced Analytics Placeholder</div> }),
  {
    loading: () => <div>Loading advanced features...</div>,
  }
);

export default LazyChart;