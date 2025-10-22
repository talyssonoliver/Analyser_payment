/**
 * Skeleton Component
 * Reusable skeleton loading components for various UI elements
 */

import { Card, CardContent, CardHeader } from "./card";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: Readonly<SkeletonProps>) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded ${className}`}
      style={{ isolation: "isolate", contain: "layout style" }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  lines = 1,
  className = "",
}: Readonly<{
  lines?: number;
  className?: string;
}>) {
  return (
    <div className={`space-y-2 ${className}`} style={{ isolation: "isolate", contain: "layout" }}>
      {Array.from({ length: lines }, (_, i) => `line-${i}`).map((id, index) => (
        <Skeleton
          key={`skeleton-text-${id}`}
          className={`h-4 ${index === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = "",
}: Readonly<{
  rows?: number;
  columns?: number;
  className?: string;
}>) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-6 w-1/4" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }, (_, i) => `row-${i}`).map((rowId, _rowIndex) => (
            <div key={`skeleton-table-row-${rowId}`} className="flex space-x-4">
              {Array.from({ length: columns }, (_, j) => `col-${j}`).map((colId, colIndex) => (
                <Skeleton
                  key={`skeleton-table-col-${rowId}-${colId}`}
                  className={`h-4 ${
                    colIndex === 0 ? "w-1/4" : colIndex === columns - 1 ? "w-1/6" : "w-1/3"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonAnalysisPage() {
  return (
    <div
      className="max-w-6xl mx-auto space-y-6"
      style={{ isolation: "isolate", contain: "layout" }}
    >
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {["a", "b", "c", "d"].map((id) => (
          <SkeletonCard key={`summary-card-${id}`} />
        ))}
      </div>

      {/* Payment Breakdown Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {["a", "b", "c", "d"].map((id) => (
                <div key={`breakdown-left-${id}`} className="flex justify-between py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {["a", "b", "c"].map((id) => (
                <div key={`breakdown-right-${id}`} className="flex justify-between py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown Skeleton */}
      <SkeletonTable rows={7} columns={6} />
    </div>
  );
}
