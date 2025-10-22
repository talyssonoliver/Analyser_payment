/**
 * Loading state for reports page
 */

import type React from "react";

export const ReportLoadingState: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-600 mt-1">Loading report data...</p>
        </div>
      </div>
      <div className="animate-pulse space-y-4" style={{ isolation: "isolate", contain: "layout" }}>
        <div className="h-48 bg-slate-200 rounded-lg"></div>
        <div className="grid grid-cols-4 gap-4">
          <div className="h-24 bg-slate-200 rounded-lg"></div>
          <div className="h-24 bg-slate-200 rounded-lg"></div>
          <div className="h-24 bg-slate-200 rounded-lg"></div>
          <div className="h-24 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="h-96 bg-slate-200 rounded-lg"></div>
      </div>
    </div>
  );
};
