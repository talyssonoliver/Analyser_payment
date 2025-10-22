"use client";

/**
 * FileUpdateDialog Component
 * Allows users to choose how to handle overlapping file uploads
 *
 * Phase 2.1 Implementation
 * - Uses shadcn/ui Dialog and RadioGroup components
 * - Provides clear UI for merge vs create new options
 * - Accessible with keyboard navigation and ARIA labels
 */

import { AlertCircle, Calendar, FileText, RefreshCw } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { AnalysisTotals } from "@/components/analysis/results/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

type UpdateAction = "merge" | "create-new";

export function FileUpdateDialog({
  open,
  onClose,
  existingAnalysis,
  newFiles,
  newFileDateRange,
  onMerge,
  onCreateNew,
}: FileUpdateDialogProps) {
  const [selectedAction, setSelectedAction] = useState<UpdateAction>("merge");
  const descriptionId = useId();
  const mergeOptionId = useId();
  const createNewOptionId = useId();

  // Reset to default when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedAction("merge");
    }
  }, [open]);

  const handleContinue = () => {
    if (selectedAction === "merge") {
      onMerge();
    } else {
      onCreateNew();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleContinue();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-[600px]"
        onKeyDown={handleKeyDown}
        aria-describedby={descriptionId}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            File Update Detected
          </DialogTitle>
          <DialogDescription id={descriptionId}>
            Your new files overlap with an existing analysis. Choose how to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Existing Analysis Summary */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h3 className="font-semibold text-sm text-slate-900">Existing Analysis</h3>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700">Date Range:</span>{" "}
                  <span className="text-slate-600">
                    {formatDate(existingAnalysis.dateRange.start)} -{" "}
                    {formatDate(existingAnalysis.dateRange.end)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-slate-700">Files:</span>{" "}
                  <span className="text-slate-600">
                    {existingAnalysis.files.length} file
                    {existingAnalysis.files.length !== 1 ? "s" : ""}
                  </span>
                  {existingAnalysis.files.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {existingAnalysis.files.slice(0, 3).map((file) => (
                        <div key={file} className="text-xs text-slate-500 truncate">
                          {file}
                        </div>
                      ))}
                      {existingAnalysis.files.length > 3 && (
                        <div className="text-xs text-slate-500">
                          +{existingAnalysis.files.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {existingAnalysis.totals && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Working Days:</span>{" "}
                      <span className="font-medium text-slate-700">
                        {existingAnalysis.totals.workingDays}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Consignments:</span>{" "}
                      <span className="font-medium text-slate-700">
                        {existingAnalysis.totals.totalConsignments}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* New Files Summary */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
            <h3 className="font-semibold text-sm text-blue-900">New Files Being Uploaded</h3>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-blue-800">Date Range:</span>{" "}
                  <span className="text-blue-700">
                    {formatDate(newFileDateRange.start)} - {formatDate(newFileDateRange.end)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-blue-800">Files:</span>{" "}
                  <span className="text-blue-700">
                    {newFiles.length} file{newFiles.length !== 1 ? "s" : ""}
                  </span>
                  <div className="mt-1 space-y-1">
                    {newFiles.slice(0, 3).map((file) => (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="text-xs text-blue-600 truncate"
                      >
                        {file.name}
                      </div>
                    ))}
                    {newFiles.length > 3 && (
                      <div className="text-xs text-blue-600">+{newFiles.length - 3} more</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-slate-900">How would you like to proceed?</h3>

            <RadioGroup
              value={selectedAction}
              onValueChange={(value) => setSelectedAction(value as UpdateAction)}
              className="space-y-3"
              aria-label="Choose how to handle file update"
            >
              {/* Merge Option (Recommended) */}
              <div className="relative">
                <label
                  htmlFor={mergeOptionId}
                  className={`
                    flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all
                    ${
                      selectedAction === "merge"
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }
                  `}
                  aria-label="Merge with existing analysis (recommended)"
                >
                  <RadioGroupItem value="merge" id={mergeOptionId} className="mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <span className="flex items-center gap-2 text-base font-semibold">
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      Merge with existing analysis
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Recommended
                      </span>
                    </span>
                    <p className="text-sm text-slate-600">
                      Add these files to your existing analysis. Data from overlapping dates will be
                      intelligently merged, preserving your existing work.
                    </p>
                  </div>
                </label>
              </div>

              {/* Create New Option */}
              <div className="relative">
                <label
                  htmlFor={createNewOptionId}
                  className={`
                    flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all
                    ${
                      selectedAction === "create-new"
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }
                  `}
                  aria-label="Create new analysis"
                >
                  <RadioGroupItem value="create-new" id={createNewOptionId} className="mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <span className="flex items-center gap-2 text-base font-semibold">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      Create new analysis
                    </span>
                    <p className="text-sm text-slate-600">
                      Start a completely separate analysis. Your existing analysis will remain
                      unchanged.
                    </p>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} className="sm:mr-2">
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleContinue} autoFocus>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
