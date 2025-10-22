/**
 * Empty state for reports page
 */

import type React from "react";
import { Card } from "@/components/ui";

interface ReportEmptyStateProps {
  requestedAnalysisId: string | null;
}

export const ReportEmptyState: React.FC<ReportEmptyStateProps> = ({ requestedAnalysisId }) => {
  const isSpecificAnalysisRequested = requestedAnalysisId !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-600 mt-1">
            {isSpecificAnalysisRequested
              ? "Requested analysis not found"
              : "No report data available"}
          </p>
        </div>
      </div>
      <Card className="theme-card p-16 text-center relative overflow-hidden">
        <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          {isSpecificAnalysisRequested ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="32"
              height="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-red-500"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M16 16l-4-4-4 4M8 8l4 4 4-4" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="32"
              height="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-blue-500"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 13v4M11 10v7M15 7v10" />
            </svg>
          )}
          <div
            className={`absolute inset-0 rounded-full animate-pulse ${
              isSpecificAnalysisRequested
                ? "bg-gradient-to-br from-red-500/10 to-orange-500/10"
                : "bg-gradient-to-br from-blue-500/10 to-purple-500/10"
            }`}
            style={{ isolation: "isolate", contain: "layout style" }}
          ></div>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">
          {isSpecificAnalysisRequested ? "Analysis Not Found" : "No Report Available"}
        </h3>
        <div className="text-slate-600 text-base mb-6">
          {isSpecificAnalysisRequested ? (
            <div className="space-y-2">
              <p>The requested analysis could not be found.</p>
              <p className="text-sm">
                ID: <code className="bg-slate-100 px-2 py-1 rounded">{requestedAnalysisId}</code>
              </p>
              <p className="text-sm text-slate-500">
                This may have been deleted, or you may not have access to it.
              </p>
            </div>
          ) : (
            <p>Complete an analysis to view your financial reports and insights</p>
          )}
        </div>
        <div
          className={`w-24 h-1 rounded-full mx-auto opacity-60 ${
            isSpecificAnalysisRequested
              ? "bg-gradient-to-r from-red-500 to-orange-500"
              : "bg-gradient-to-r from-blue-500 to-purple-500"
          }`}
        ></div>
        {isSpecificAnalysisRequested && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                // Use href assignment to be compatible with jsdom tests
                window.location.href = "/history";
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Your Latest Reports
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};
