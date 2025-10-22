"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { FileUpload, ManualEntry } from "@/components/analysis";
import type { AnalysisTotals } from "@/components/analysis/results/types";
import { FileUpdateDialog } from "@/components/analysis/shared/file-update-dialog";
import { RecoveryBanner } from "@/components/ui/recovery-banner";
import type { InputMethod } from "@/hooks/use-analysis-steps";
import { useFileValidationAndHashing } from "@/hooks/useFileValidationAndHashing";
import { useSessionRecovery } from "@/hooks/useSessionRecovery";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import { QuickDateExtractor } from "@/lib/services/quick-date-extractor";
import { SessionRecoveryService } from "@/lib/services/session-recovery-service";
import { toast } from "@/lib/utils/toast";
import type { ManualEntry as ManualEntryType } from "@/types/core";

export interface Step1ContainerProps {
  // Core data and state
  readonly inputMethod: InputMethod;
  readonly uploadedFiles: File[];
  readonly manualEntries: ManualEntryType[];
  readonly currentStep: number;

  // Handlers from main page
  readonly onInputMethodChange: (method: InputMethod) => void;
  readonly onFilesUploaded: (files: File[]) => void;
  readonly onManualEntriesChanged: (entries: ManualEntryType[]) => void;
  readonly onStepComplete: (data: { files?: File[]; entries?: ManualEntryType[] }) => void;
  readonly onError: (error: string) => void;

  // Additional handlers
  readonly disabled?: boolean;
  readonly onStepChange?: (step: number) => void;
  readonly onNewAnalysis?: () => void;
}

export function Step1Container({
  inputMethod,
  uploadedFiles,
  manualEntries,
  currentStep,
  onInputMethodChange,
  onFilesUploaded,
  onManualEntriesChanged,
  onStepComplete,
  onError,
  disabled = false,
  onStepChange,
  onNewAnalysis,
}: Step1ContainerProps) {
  const analyzeBtnId = useId();
  // Session recovery using custom hook
  const {
    recoveryData,
    showBanner: showRecoveryBanner,
    handleRestore: handleSessionRestore,
    handleDismiss: handleSessionDismiss,
  } = useSessionRecovery({
    onRestore: (session) => {
      console.log("🔄 Restoring session - navigating to last active step:", session.currentStep);

      // Navigate to the restored step to show user something happened
      // Prefer step 3 if analyzed, otherwise step 2 if has data, otherwise step 1
      let targetStep = 1;

      if (session.hasBeenAnalyzed || session.lastAnalysisData) {
        targetStep = 3;
        console.log("� Has analysis data - navigating to Step 3");
      } else if (
        session.currentStep === 2 ||
        session.uploadedFiles?.length > 0 ||
        session.manualEntries?.length > 0
      ) {
        targetStep = 2;
        console.log("📝 Has uploaded data - navigating to Step 2");
      } else {
        targetStep = session.currentStep || 1;
        console.log("📍 No special data - navigating to step", targetStep);
      }

      // Navigate to the target step
      if (onStepChange && targetStep !== currentStep) {
        onStepChange(targetStep);
      }
    },
    onInputMethodChange,
    onManualEntriesChange: onManualEntriesChanged,
  });

  // Wrap handleSessionDismiss to also trigger "Start New Analysis" behavior
  const handleStartFresh = useCallback(() => {
    console.log("🔄 Start Fresh clicked - clearing session and starting new analysis");

    // First dismiss the session (clears localStorage)
    handleSessionDismiss();

    // Then trigger the same handler as "Start New Analysis" button
    if (onNewAnalysis) {
      onNewAnalysis();
    }
  }, [handleSessionDismiss, onNewAnalysis]);

  // Local state for modals
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);

  // FileUpdateDialog state
  const [showFileUpdateDialog, setShowFileUpdateDialog] = useState(false);
  const [fileUpdateDialogData, setFileUpdateDialogData] = useState<{
    existingAnalysis: {
      id: string;
      dateRange: { start: string; end: string };
      files: string[];
      totals?: AnalysisTotals;
    };
    newFiles: File[];
    newFileDateRange: { start: string; end: string };
  } | null>(null);

  // Input method handlers
  const handleManualMethodClick = () => {
    onInputMethodChange("manual");
    setShowManualEntryModal(true);
  };

  const handleUploadMethodClick = () => {
    onInputMethodChange("upload");
  };

  const handleCloseModal = useCallback(() => {
    setShowManualEntryModal(false);
    onInputMethodChange("upload"); // Switch back to upload method when closing
  }, [onInputMethodChange]);

  // Manual entry handler
  const handleAddManualEntry = () => {
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      day: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
        new Date().getDay()
      ],
      consignments: 25,
      baseAmount: 50.0,
      totalPay: 105.0,
      pickups: 3,
      earlyArrive: 50.0,
      attendanceBonus: 25.0,
      unloadingBonus: 30.0,
    };
    const updatedEntries = [...manualEntries, newEntry];
    onManualEntriesChanged(updatedEntries);
    setShowManualEntryModal(false);
    toast.success("Manual entry added!");
  };

  // Get button text based on current state
  const getButtonText = () => {
    if (uploadedFiles.length > 0) return "Analyze Documents";
    if (manualEntries.length > 0) return "Analyze Entries";
    return "Add Data First";
  };

  // File validation and hashing using custom hook
  const { validateAndHash } = useFileValidationAndHashing({
    onSuccess: (files) => {
      // Files passed validation
      onFilesUploaded(files);

      // Save session data - PRESERVE dbAnalysisId if it exists
      const existingSession = SessionRecoveryService.loadSession();
      SessionRecoveryService.saveSession({
        currentStep,
        inputMethod,
        uploadedFiles: files.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
          lastModified: f.lastModified,
        })),
        manualEntries: manualEntries,
        dbAnalysisId: existingSession?.dbAnalysisId, // ✅ Preserve the database ID
      });

      toast.success("Files uploaded! Ready to validate");

      // Automatically proceed to step 2 like legacy version
      onStepComplete({
        files: files,
        entries: manualEntries.length > 0 ? manualEntries : undefined,
      });
    },
    onError: (error) => {
      onError(error);
    },
  });

  // Handle file upload with fingerprinting and validation
  const handleFilesUploaded = async (files: File[]) => {
    try {
      // 1. Extract date range from new files (quick, no full processing)
      const newFileDateRange = await QuickDateExtractor.extractDateRange(files);

      // Early exit if we can't extract dates
      if (!newFileDateRange) {
        console.warn("Could not extract date range from files, proceeding without overlap check");
        await validateAndHash(files);
        return;
      }

      // 2. Import required dependencies for overlap detection
      const { analysisRepository } = await import("@/lib/repositories/analysis-repository");

      // 3. Get userId from auth context
      // Note: We're using a dynamic import approach to avoid hook rules
      // The actual auth check happens via the repository which uses the Supabase client
      const { data: session } = await (await import("@/lib/supabase/client"))
        .createClient()
        .auth.getSession();

      if (!session?.session?.user?.id) {
        console.warn("No authenticated user, skipping overlap check");
        await validateAndHash(files);
        return;
      }

      const userId = session.session.user.id;

      // 4. Query existing analyses for this user
      const analysesResult = await analysisRepository.getUserAnalyses(userId, {
        status: "completed",
        limit: 100, // Check recent analyses only
        orderBy: "created_at",
        order: "desc",
      });

      if (analysesResult.isFailure || !analysesResult.data) {
        console.warn("Could not fetch existing analyses, proceeding without overlap check");
        await validateAndHash(files);
        return;
      }

      const existingAnalyses = analysesResult.data.data;

      // 5. Check for overlapping analyses
      const overlappingAnalysis = existingAnalyses.find((analysis) => {
        const analysisRange = {
          start: analysis.period_start,
          end: analysis.period_end,
        };
        return QuickDateExtractor.dateRangesOverlap(analysisRange, newFileDateRange);
      });

      // 6. If overlap detected, show FileUpdateDialog
      if (overlappingAnalysis) {
        // Show toast notification to inform user
        toast.info("Files for this date range already exist. Please choose how to proceed.");

        setFileUpdateDialogData({
          existingAnalysis: {
            id: overlappingAnalysis.id,
            dateRange: {
              start: overlappingAnalysis.period_start,
              end: overlappingAnalysis.period_end,
            },
            files: overlappingAnalysis.analysis_files?.map((f) => f.original_name) || [],
            totals: overlappingAnalysis.analysis_totals
              ? {
                  workingDays: overlappingAnalysis.working_days,
                  totalConsignments: overlappingAnalysis.total_consignments,
                  baseTotal: overlappingAnalysis.analysis_totals.base_total,
                  pickupTotal: overlappingAnalysis.analysis_totals.pickup_total,
                  bonusTotal: overlappingAnalysis.analysis_totals.bonus_total,
                  expectedTotal: overlappingAnalysis.analysis_totals.expected_total,
                  paidTotal: overlappingAnalysis.analysis_totals.paid_total,
                  differenceTotal: overlappingAnalysis.analysis_totals.difference_total,
                }
              : undefined,
          },
          newFiles: files,
          newFileDateRange,
        });
        setShowFileUpdateDialog(true);
        return; // Wait for user choice
      }

      // 7. No overlap: Save files to database immediately
      console.log("📤 Saving files to database (Step 1)...");

      // Import services
      const { FileStorageService } = await import("@/lib/services/file-storage-service");

      // Convert dates from DD/MM/YYYY to ISO format YYYY-MM-DD
      const convertToISODate = (ddmmyyyy: string): string => {
        const [day, month, year] = ddmmyyyy.split("/");
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      };

      const periodStart = convertToISODate(newFileDateRange.start);
      const periodEnd = convertToISODate(newFileDateRange.end);

      console.log("📅 Date conversion:", {
        original: `${newFileDateRange.start} - ${newFileDateRange.end}`,
        converted: `${periodStart} - ${periodEnd}`,
      });

      // Create analysis record with "pending" status
      const createResult = await analysisRepository.createAnalysis({
        userId,
        source: "upload",
        periodStart,
        periodEnd,
        rulesVersion: 1, // Default rules version
        workingDays: 0, // Will be updated in Step 3
        totalConsignments: 0, // Will be updated in Step 3
        metadata: {
          createdInStep: "step1",
          filesCount: files.length,
        },
      });

      if (createResult.isFailure) {
        console.error("Failed to create analysis:", createResult.error);
        toast.error("Failed to save analysis. Please try again.");
        return;
      }

      const analysis = createResult.data;
      console.log("✅ Created pending analysis:", analysis.id);

      // Clear old localStorage analyses to prevent stale data issues
      AnalysisStorageService.clearOldAnalyses(analysis.id);

      // Upload files to Supabase Storage
      const fileStorage = new FileStorageService();
      const uploadResult = await fileStorage.uploadFiles(userId, analysis.id, files);

      if (uploadResult.isFailure) {
        console.error("Failed to upload files:", uploadResult.error);
        toast.error("Failed to upload files. Please try again.");
        return;
      }

      console.log("✅ Uploaded files to storage:", uploadResult.data.length);

      // Create analysis_files records
      const fileRecords = uploadResult.data.map((uploadedFile) => ({
        storage_path: uploadedFile.storagePath,
        original_name: uploadedFile.fileName,
        file_size: uploadedFile.size,
        file_hash: uploadedFile.hash,
        mime_type: uploadedFile.type,
        file_type: uploadedFile.fileName.toLowerCase().includes("runsheet")
          ? ("runsheet" as const)
          : ("invoice" as const),
      }));

      const filesResult = await analysisRepository.createAnalysisFiles(analysis.id, fileRecords);

      if (filesResult.isFailure) {
        console.error("Failed to create file records:", filesResult.error);
        toast.error("Failed to save file records. Please try again.");
        return;
      }

      console.log("✅ Created file records:", fileRecords.length);

      // Save dbAnalysisId to session for Step 2 and Step 3
      SessionRecoveryService.saveSession({
        dbAnalysisId: analysis.id,
        currentStep,
        inputMethod,
        uploadedFiles: files.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
          lastModified: f.lastModified,
        })),
      });

      console.log("💾 Saved dbAnalysisId to session:", analysis.id);
      toast.success("Files saved successfully!");

      // 8. Proceed with normal validation workflow
      await validateAndHash(files);
    } catch (error) {
      console.error("Error during file upload processing:", error);
      onError(error instanceof Error ? error.message : "Failed to process files");
    }
  };

  // FileUpdateDialog handlers
  const handleMerge = async () => {
    if (!fileUpdateDialogData) return;

    try {
      // Show loading state
      toast.info("Merging files with existing analysis...");

      // 1. Convert File objects to base64 for API request
      const filesWithContent = await Promise.all(
        fileUpdateDialogData.newFiles.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
          const base64 = btoa(binary);

          return {
            name: file.name,
            type: file.name.toLowerCase().includes("runsheet")
              ? ("runsheet" as const)
              : ("invoice" as const),
            content: base64,
            size: file.size,
          };
        })
      );

      // 2. Call merge API
      const response = await fetch(
        `/api/analysis/${fileUpdateDialogData.existingAnalysis.id}/merge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: filesWithContent,
            mergeStrategy: "smart",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Merge failed");
      }

      const result = await response.json();

      // 3. Close dialog and show success
      setShowFileUpdateDialog(false);
      setFileUpdateDialogData(null);

      toast.success(result.message || "Files merged successfully!");

      // 4. Optionally redirect to the merged analysis
      // For now, we'll just complete the step to show the success state
      onStepComplete({
        files: fileUpdateDialogData.newFiles,
      });
    } catch (error) {
      console.error("Merge error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to merge files");
      // Keep dialog open so user can try again or choose Create New
    }
  };

  const handleCreateNew = async () => {
    if (!fileUpdateDialogData) return;

    try {
      // Close dialog
      setShowFileUpdateDialog(false);
      setFileUpdateDialogData(null);

      // Proceed with normal workflow (create new analysis)
      await validateAndHash(fileUpdateDialogData.newFiles);
    } catch (error) {
      console.error("Create new error:", error);
      onError(error instanceof Error ? error.message : "Failed to create new analysis");
    }
  };

  const handleCancelFileUpdate = () => {
    // Close dialog and clear data
    setShowFileUpdateDialog(false);
    setFileUpdateDialogData(null);

    toast.info("Upload cancelled");
  };

  // Handle step completion
  const handleCompleteStep = () => {
    if (uploadedFiles.length > 0 || manualEntries.length > 0) {
      onStepComplete({
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        entries: manualEntries.length > 0 ? manualEntries : undefined,
      });
      toast.success("Files uploaded! Ready to validate");
    } else {
      toast.warning("Please upload files or add manual entries first");
    }
  };

  // Removed legacy DOM tooltip injection. Tooltips now handled by InfoTooltip

  // Handle modal accessibility
  useEffect(() => {
    if (showManualEntryModal) {
      // Focus the dialog when it opens
      const dialog = document.querySelector("dialog[open]") as HTMLDialogElement;
      if (dialog) {
        dialog.focus();

        // Handle click outside
        const handleDialogClick = (e: MouseEvent) => {
          const rect = dialog.getBoundingClientRect();
          const isInDialog =
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom &&
            e.clientX >= rect.left &&
            e.clientX <= rect.right;

          // Check if click is on the backdrop (outside the modal content)
          if (e.target === dialog && !isInDialog) {
            handleCloseModal();
          }
        };

        dialog.addEventListener("click", handleDialogClick);

        // Handle escape key
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === "Escape") {
            handleCloseModal();
          }
        };

        document.addEventListener("keydown", handleEscape);

        // Prevent body scroll when modal is open
        document.body.style.overflow = "hidden";

        return () => {
          dialog.removeEventListener("click", handleDialogClick);
          document.removeEventListener("keydown", handleEscape);
          document.body.style.overflow = "unset";
        };
      }
    }
  }, [showManualEntryModal, handleCloseModal]);

  return (
    <div className="step1-container-wrapper">
      {/* Session Recovery Banner */}
      {showRecoveryBanner && recoveryData && (
        <div className="mb-6">
          <RecoveryBanner
            recovery={recoveryData}
            onRestore={handleSessionRestore}
            onDismiss={handleStartFresh}
          />
        </div>
      )}

      {/* Section Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Add Your Data</h2>
        <p className="text-slate-600">
          Upload your documents or enter data manually to get started with payment analysis
        </p>
      </div>

      {/* Data Input Method Toggle - Dashboard Style */}
      <div className="flex justify-center mb-4">
        <div className="step1-data-input-selector bg-white rounded-xl p-1 flex gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-w-xs w-full">
          <button
            type="button"
            onClick={handleUploadMethodClick}
            disabled={disabled}
            className={`step1-data-input-btn flex-1 px-2.5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 ${
              inputMethod === "upload"
                ? "step1-data-input-btn--active bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
                : "step1-data-input-btn--inactive text-slate-600 hover:bg-slate-100"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            data-method="upload"
          >
            <span className="method-icon w-4 h-4 flex items-center justify-center flex-shrink-0">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            <span className="method-label leading-none">Upload Files</span>
          </button>

          <button
            type="button"
            onClick={handleManualMethodClick}
            disabled={disabled}
            className={`step1-data-input-btn flex-1 px-2.5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 ${
              inputMethod === "manual"
                ? "step1-data-input-btn--active bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
                : "step1-data-input-btn--inactive text-slate-600 hover:bg-slate-100"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            data-method="manual"
          >
            <span className="step1-data-input-btn__icon w-4 h-4 flex items-center justify-center flex-shrink-0">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </span>
            <span className="method-label leading-none">Manual Entry</span>
          </button>
        </div>
      </div>

      {/* File Upload Area */}
      <FileUpload
        onFilesSelected={handleFilesUploaded}
        maxFiles={50}
        maxSizePerFile={50 * 1024 * 1024} // 50MB
        acceptedTypes={[".pdf"]}
        showProgressSimulation={true}
        hideMethodToggle={true}
        hideFileList={true}
        disabled={disabled}
      />

      {/* Manual Entry Modal */}
      {showManualEntryModal && (
        <dialog
          open
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[99999] p-4 overflow-y-auto border-0 max-w-none max-h-none w-full h-full"
          style={{ zIndex: 99999 }}
          aria-labelledby="modal-title"
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl relative"
            style={{ zIndex: 100000 }}
          >
            <ManualEntry onClose={handleCloseModal} onAddEntry={handleAddManualEntry} />
          </div>
        </dialog>
      )}

      {/* FileUpdateDialog */}
      {showFileUpdateDialog && fileUpdateDialogData && (
        <FileUpdateDialog
          open={showFileUpdateDialog}
          onClose={handleCancelFileUpdate}
          existingAnalysis={fileUpdateDialogData.existingAnalysis}
          newFiles={fileUpdateDialogData.newFiles}
          newFileDateRange={fileUpdateDialogData.newFileDateRange}
          onMerge={handleMerge}
          onCreateNew={handleCreateNew}
        />
      )}

      {/* Action Buttons */}
      <div className="mt-8">
        <div className="text-center">
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-full font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center gap-3"
            id={analyzeBtnId}
            disabled={disabled || (uploadedFiles.length === 0 && manualEntries.length === 0)}
            onClick={(e) => {
              e.preventDefault();
              handleCompleteStep();
            }}
          >
            <span className="step1-proceed-btn__content flex items-center gap-3">
              <span className="w-5 h-5">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M2 22l16-4 4-16-16 4-4 16zm7-7l5-5" />
                </svg>
              </span>
              <span>{getButtonText()}</span>
            </span>
          </button>
        </div>
        <p className="text-center text-sm text-slate-500 mt-3">
          Analysis typically takes 2-5 seconds per document
        </p>
      </div>
    </div>
  );
}
