/**
 * Analysis Page - Main orchestrator for the analysis workflow
 * Refactored to properly use step containers without duplication
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Step1Container,
  Step2Container,
  Step3Container,
  StepNavigation,
} from "@/components/analysis";
import { useAnalysisSteps } from "@/hooks/use-analysis-steps";
import { useAuth } from "@/lib/hooks/useAuth";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import { SessionRecoveryService } from "@/lib/services/session-recovery-service";
import { toast } from "@/lib/utils/toast";
import { analysisStyles } from "@/styles/analysis-styles";

export default function AnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.warn("🚫 Unauthorized access attempt - redirecting to login");
      router.push("/login?redirectTo=/analysis");
    }
  }, [user, authLoading, router]);

  // Handle calendar navigation with date parameter OR fresh start parameter
  // When user clicks "Go to Analysis" from calendar OR "Upload & Analyze" buttons, start fresh
  // CRITICAL: Clear localStorage BEFORE component initialization
  const [shouldResetForDate, setShouldResetForDate] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const dateParam = urlParams.get("date");
      const freshParam = urlParams.get("fresh");

      if (dateParam) {
        console.log(
          "📅 Calendar navigation detected (pre-render) - clearing old data for date:",
          dateParam
        );

        // Clear IMMEDIATELY before any components initialize
        SessionRecoveryService.clearSession();
        AnalysisStorageService.clearAnalysisData();

        return true; // Will trigger reset after step management loads
      }

      if (freshParam === "true") {
        console.log("🆕 Fresh start requested (pre-render) - clearing old analysis data");

        // Clear IMMEDIATELY before any components initialize
        SessionRecoveryService.clearSession();
        AnalysisStorageService.clearAnalysisData();

        return true; // Will trigger reset after step management loads
      }
    }
    return false;
  });

  // Clean up URL parameters after clearing
  useEffect(() => {
    const dateParam = searchParams.get("date");
    const freshParam = searchParams.get("fresh");

    if (dateParam || freshParam) {
      console.log("🧹 Removing URL parameters:", { dateParam, freshParam });

      // Remove the parameters from URL to avoid re-triggering
      const url = new URL(window.location.href);
      url.searchParams.delete("date");
      url.searchParams.delete("fresh");
      router.replace(url.pathname + url.search);

      if (dateParam) {
        toast.info(`Ready to add analysis data for ${dateParam}`);
      } else if (freshParam === "true") {
        toast.success("Starting fresh analysis");
      }
    }
  }, [searchParams, router]);

  // Step management
  const {
    currentStep,
    totalSteps,
    inputMethod,
    uploadedFiles: hookUploadedFiles,
    manualEntries: hookManualEntries,
    hasBeenAnalyzed,
    lastAnalysisData,
    validation,
    setStep,
    setInputMethod,
    setUploadedFiles: setHookUploadedFiles,
    setManualEntries: setHookManualEntries,
    canProgressToStep,
    handleAnalysisStarted,
    handleNewAnalysis,
    showUploadSection,
    showValidateSection,
    showAnalyzeSection,
  } = useAnalysisSteps();

  // ✨ NEW: Reset to Step 1 when navigating from calendar
  useEffect(() => {
    if (shouldResetForDate) {
      console.log("🔄 Resetting to Step 1 for fresh analysis");
      handleNewAnalysis();
      setShouldResetForDate(false);
    }
  }, [shouldResetForDate, handleNewAnalysis]);

  // Show restoration toast on mount if we restored from navigation intent
  useEffect(() => {
    // Check if we just restored from navigation
    if (currentStep === 3 && hasBeenAnalyzed) {
      console.log("✅ Step 3 restored with analysis data");
      // Only show toast if this looks like a restoration (we have analyzed data but just loaded)
      const session = SessionRecoveryService.loadSession();
      if (session && session.currentStep === 3) {
        toast.success(`Restored to Step ${currentStep}`);

        // ✨ NEW: Restore files from database if available
        if (session.dbAnalysisId && hookUploadedFiles.length === 0) {
          console.log(
            "📥 Detected empty files array with database analysis ID - will restore files when needed"
          );
          // Files will be restored on-demand when user navigates to Step 2
          // or when Step 3 needs them for re-analysis
        }
      }
    }
  }, [currentStep, hasBeenAnalyzed, hookUploadedFiles.length]); // Run once on mount to show restoration feedback

  // ✨ NEW: Restore files from database when navigating to Step 2 OR Step 3 with empty files
  useEffect(() => {
    /**
     * Check if file has actual content (not just metadata)
     */
    const checkFileHasContent = async (file: File): Promise<boolean> => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        return arrayBuffer.byteLength > 0;
      } catch (error) {
        console.error(`❌ Failed to check content for "${file.name}":`, error);
        return false;
      }
    };

    /**
     * Check if file restoration is needed
     * CRITICAL: Checks actual blob content, not just size property (which can be faked)
     */
    const shouldRestoreFiles = async (
      step: number,
      files: File[],
      analyzed: boolean,
      sessionId: string | undefined,
      userId: string | undefined
    ): Promise<boolean> => {
      // Check if files have actual content by reading their blobs
      const contentChecks = await Promise.all(files.map(checkFileHasContent));
      const hasEmptyFiles = files.length > 0 && contentChecks.some((hasContent) => !hasContent);

      const needsRestoration = files.length === 0 || hasEmptyFiles;
      const isValidStep = step === 2 || step === 3;

      const willRestore = isValidStep && needsRestoration && analyzed && !!sessionId && !!userId;

      // Debug logging
      console.log("🔍 File restoration check:", {
        currentStep: step,
        filesCount: files.length,
        hasEmptyFiles,
        needsRestoration,
        hasBeenAnalyzed: analyzed,
        dbAnalysisId: sessionId,
        hasUser: !!userId,
        willRestore,
      });

      return willRestore;
    };

    /**
     * Download files from storage
     */
    const downloadFilesFromStorage = async (
      analysisFiles: Array<{ storage_path: string; original_name: string; mime_type: string }>,
      fileStorage: {
        downloadFile: (path: string) => Promise<{ isSuccess: boolean; data: File | null }>;
      }
    ): Promise<File[]> => {
      console.log(`📥 Downloading ${analysisFiles.length} file(s) from storage...`);

      const downloadPromises = analysisFiles.map(async (fileRecord) => {
        const result = await fileStorage.downloadFile(fileRecord.storage_path);
        return result.isSuccess ? result.data : null;
      });

      const downloadedFiles = await Promise.all(downloadPromises);
      return downloadedFiles.filter((f): f is File => f !== null);
    };

    /**
     * Handle restoration result
     */
    const handleRestorationResult = (
      validFiles: File[],
      setFiles: (files: File[]) => void
    ): void => {
      if (validFiles.length > 0) {
        console.log(`✅ Restored ${validFiles.length} file(s) from database storage`);
        setFiles(validFiles);
        toast.success(`Restored ${validFiles.length} file(s) from previous analysis`);
      } else {
        console.warn("⚠️ No files could be downloaded from storage");
        toast.warning("Could not restore files from storage");
      }
    };

    /**
     * Main restoration logic
     */
    const restoreFilesFromDatabase = async () => {
      const session = SessionRecoveryService.loadSession();

      // Await the async check
      const needsRestore = await shouldRestoreFiles(
        currentStep,
        hookUploadedFiles,
        hasBeenAnalyzed,
        session?.dbAnalysisId,
        user?.id
      );

      if (!needsRestore) {
        return;
      }

      // Type guard: we know dbAnalysisId exists after shouldRestoreFiles check
      if (!session?.dbAnalysisId) {
        return;
      }

      console.log("📥 Restoring files from database for analysis:", session.dbAnalysisId);

      try {
        // Import services dynamically to avoid circular dependencies
        const { AnalysisRepository } = await import("@/lib/repositories/analysis-repository");
        const { FileStorageService } = await import("@/lib/services/file-storage-service");

        const analysisRepo = new AnalysisRepository();
        const fileStorage = new FileStorageService();

        // Get analysis with files
        const analysisResult = await analysisRepo.getAnalysisById(session.dbAnalysisId);

        if (analysisResult.isSuccess && analysisResult.data?.analysis_files) {
          const analysisFiles = analysisResult.data.analysis_files;
          console.log(`📥 Found ${analysisFiles.length} file(s) in database`);

          if (analysisFiles.length > 0) {
            const validFiles = await downloadFilesFromStorage(analysisFiles, fileStorage);
            handleRestorationResult(validFiles, setHookUploadedFiles);
          } else {
            console.log("ℹ️ No files found in database for this analysis");
          }
        } else {
          console.warn("⚠️ Could not load analysis from database:", analysisResult.error);
        }
      } catch (error) {
        console.error("❌ Error restoring files from database:", error);
        toast.error("Failed to restore files");
      }
    };

    restoreFilesFromDatabase();
  }, [currentStep, hookUploadedFiles, hasBeenAnalyzed, user, setHookUploadedFiles]); // Changed: use full array not just length

  // Auto-save session on state changes (with debounce to handle React's async state updates)
  useEffect(() => {
    // Debounce to allow state updates to settle (fixes race condition with handleNewAnalysis)
    const timer = setTimeout(() => {
      // Check if we have meaningful data worth saving
      const hasFiles = hookUploadedFiles.length > 0;
      const hasEntries = hookManualEntries.length > 0;
      const hasAnalysis = hasBeenAnalyzed && lastAnalysisData;

      // Only save session if we have actual data or completed analysis
      const hasMeaningfulData = hasFiles || hasEntries || hasAnalysis;

      if (hasMeaningfulData) {
        console.log(
          "💾 Auto-saving session - Step:",
          currentStep,
          "Files:",
          hasFiles,
          "Entries:",
          hasEntries,
          "Analyzed:",
          hasBeenAnalyzed
        );

        // ✅ Load existing session to preserve dbAnalysisId
        const existingSession = SessionRecoveryService.loadSession();

        SessionRecoveryService.saveSession({
          currentStep,
          inputMethod,
          uploadedFiles: hookUploadedFiles.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
            lastModified: f.lastModified,
          })),
          manualEntries: hookManualEntries,
          hasBeenAnalyzed,
          lastAnalysisData: lastAnalysisData || undefined,
          dbAnalysisId: existingSession?.dbAnalysisId, // ✅ PRESERVE dbAnalysisId
        });
      } else {
        console.log(
          "⏭️ Skipping auto-save - No data to save (step:",
          currentStep,
          "hasBeenAnalyzed:",
          hasBeenAnalyzed,
          "but no lastAnalysisData)"
        );
      }
    }, 150); // 150ms debounce - allows React state updates to complete

    return () => clearTimeout(timer);
  }, [
    currentStep,
    inputMethod,
    hookUploadedFiles,
    hookManualEntries,
    hasBeenAnalyzed,
    lastAnalysisData,
  ]);

  // Use hook's state directly
  const uploadedFiles = useMemo(() => hookUploadedFiles || [], [hookUploadedFiles]);

  // Handle step navigation clicks
  const handleStepClick = (stepNumber: number) => {
    if (canProgressToStep(stepNumber)) {
      setStep(stepNumber);
      toast.success(`Switched to step ${stepNumber}`);
    } else {
      toast.warning("Complete previous steps first");
    }
  };

  // Handle editing an entry (for Step 2)
  const handleEditEntry = (entryId: number) => {
    const entryToEdit = hookManualEntries.find((entry) => entry.id === entryId);
    if (entryToEdit) {
      toast.info(`Editing entry for ${entryToEdit.date}`);
    }
  };

  // Handle file removal (for Step 2)
  const handleFileRemove = (fileName: string, fileSize: number) => {
    const updatedFiles = uploadedFiles.filter(
      (file) => !(file.name === fileName && file.size === fileSize)
    );
    setHookUploadedFiles(updatedFiles);
    toast.success(`Removed ${fileName}`);
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect via useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className={analysisStyles.container.main} style={{ background: "#f8fafc" }}>
      <div className={analysisStyles.container.wrapper}>
        {/* Step Navigation Component */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200">
          <StepNavigation
            currentStep={currentStep}
            totalSteps={totalSteps}
            onStepClick={handleStepClick}
            canProgressToStep={canProgressToStep}
          />
        </div>

        {/* Step 1: Upload Section - Now using Step1Container */}
        {showUploadSection && (
          <Step1Container
            inputMethod={inputMethod}
            uploadedFiles={uploadedFiles}
            manualEntries={hookManualEntries}
            currentStep={currentStep}
            onInputMethodChange={setInputMethod}
            onFilesUploaded={setHookUploadedFiles}
            onManualEntriesChanged={setHookManualEntries}
            onStepComplete={() => {
              setStep(2);
              toast.success("Ready to validate your data");
            }}
            onError={(error) => toast.error(error)}
            onStepChange={setStep}
            onNewAnalysis={handleNewAnalysis}
          />
        )}

        {/* Step 2: Validate Section */}
        {showValidateSection && (
          <div className={`${analysisStyles.step2.container} w-full flex flex-col items-center`}>
            <div className={analysisStyles.step2.header}>
              <h2 className={analysisStyles.step2.title}>Review Daily Data</h2>
              <p className={analysisStyles.step2.subtitle}>
                Choose to add more days or analyze your current week
              </p>
            </div>

            <Step2Container
              files={uploadedFiles}
              entries={hookManualEntries}
              validationResult={{
                isValid: validation.status === "ready",
                errors: [],
                warnings:
                  validation.status === "incomplete"
                    ? [
                        ...(validation.runsheets === 0 ? ["No runsheet files detected"] : []),
                        ...(validation.invoices === 0 ? ["No invoice files detected"] : []),
                      ]
                    : [],
              }}
              onStepComplete={() => setStep(3)}
              onEditEntry={handleEditEntry}
              onError={(error) => toast.error(error)}
              onFileRemove={handleFileRemove}
              onGoToStep1={() => setStep(1)}
              onFilesLoaded={(loadedFiles) => {
                console.log("📂 Files loaded from database:", loadedFiles.length);
                setHookUploadedFiles(loadedFiles);
              }}
              userId={user?.id}
            />
          </div>
        )}

        {/* Step 3: Analyze Section */}
        {showAnalyzeSection && (
          <Step3Container
            files={uploadedFiles}
            entries={hookManualEntries}
            inputMethod={inputMethod}
            onNewAnalysis={() => {
              console.log("🔄 Starting fresh analysis - clearing all state");

              // Use hook's handleNewAnalysis to reset all state
              handleNewAnalysis();

              // Also clear session storage (hook doesn't do this)
              SessionRecoveryService.clearSession();

              console.log("✅ Fresh analysis ready - state and session cleared");
            }}
            onViewReport={() => router.push("/reports")}
            onError={(error) => toast.error(error)}
            onSetStep={setStep}
            onAnalysisStarted={handleAnalysisStarted}
            showAnalyzeSection={showAnalyzeSection}
            returnFromReports={searchParams.get("returnFromReports") === "true"}
          />
        )}
      </div>
    </div>
  );
}
