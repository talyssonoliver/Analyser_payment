"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/utils/toast";
import type { ManualEntry } from "@/types/core";

export type InputMethod = "upload" | "manual";

// Type definitions for step data
interface AnalysisData {
  id: string;
  period: string;
  status: string;
  createdAt: string;
  totalDays: number;
  source: string;
  [key: string]: unknown;
}

export interface StepState {
  currentStep: number;
  totalSteps: number;
  inputMethod: InputMethod;
  uploadedFiles: File[];
  manualEntries: ManualEntry[];
  hasBeenAnalyzed: boolean;
  lastAnalysisData: AnalysisData | null;
}

export interface UseAnalysisStepsReturn {
  // State
  currentStep: number;
  totalSteps: number;
  inputMethod: InputMethod;
  uploadedFiles: File[];
  manualEntries: ManualEntry[];
  hasBeenAnalyzed: boolean;
  lastAnalysisData: AnalysisData | null;

  // Derived validation state
  validation: {
    status: "pending" | "ready" | "incomplete";
    runsheets: number;
    invoices: number;
    totalFiles: number;
    manualEntries: number;
  };

  // Actions
  setStep: (stepNumber: number) => void;
  setInputMethod: (method: InputMethod) => void;
  setUploadedFiles: (files: File[]) => void;
  setManualEntries: (entries: ManualEntry[]) => void;
  setHasBeenAnalyzed: (analyzed: boolean) => void;
  setLastAnalysisData: (data: AnalysisData | null) => void;

  // Validation
  canProgressToStep: (stepNumber: number) => boolean;

  // Auto-progression
  handleFilesUploaded: (files: File[]) => void;
  handleAnalysisStarted: () => void;
  handleNewAnalysis: () => void;

  // Step content visibility
  showUploadSection: boolean;
  showValidateSection: boolean;
  showAnalyzeSection: boolean;
}

const TOTAL_STEPS = 3;

export function useAnalysisSteps(): UseAnalysisStepsReturn {
  // Core state - Initialize from session if available
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    try {
      // Check for navigation intent first (higher priority)
      const intentJson = sessionStorage?.getItem("pa:nav-intent:v9");
      if (intentJson) {
        const intent = JSON.parse(intentJson);
        const age = Date.now() - intent.timestamp;
        // If less than 5 minutes old and viewing report, restore to that step
        if (age < 5 * 60 * 1000 && intent.intent === "viewing-report" && intent.fromStep) {
          console.log("🔄 Hook: Restoring to step", intent.fromStep, "from navigation intent");
          return intent.fromStep;
        }
      }

      // Otherwise load from session
      const sessionJson = localStorage.getItem("pa:session:v9");
      if (sessionJson) {
        const session = JSON.parse(sessionJson);
        console.log("🔄 Hook: Loading step", session.currentStep, "from session");
        return session.currentStep || 1;
      }
    } catch (error) {
      console.error("Failed to load step from session:", error);
    }
    return 1;
  });

  const [inputMethod, setInputMethod] = useState<InputMethod>(() => {
    if (typeof window === "undefined") return "upload";
    try {
      const sessionJson = localStorage.getItem("pa:session:v9");
      if (sessionJson) {
        const session = JSON.parse(sessionJson);
        return session.inputMethod || "upload";
      }
    } catch (error) {
      console.error("Failed to load input method from session:", error);
    }
    return "upload";
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const sessionJson = localStorage.getItem("pa:session:v9");
      if (sessionJson) {
        const session = JSON.parse(sessionJson);
        // Restore File objects from session metadata
        if (session.uploadedFiles && Array.isArray(session.uploadedFiles)) {
          console.log(
            "📁 Restoring file metadata from session:",
            session.uploadedFiles.length,
            "files"
          );
          return session.uploadedFiles.map(
            (fileData: { name: string; size: number; type: string; lastModified: number }) => {
              // IMPORTANT: Create pseudo-File objects with empty content
              // The actual file content should be restored from Supabase Storage when needed
              // This allows Step 2 to display file names/metadata, and actual content
              // will be loaded when analysis runs or when user navigates to validation
              const blob = new Blob([], { type: fileData.type });
              const file = new File([blob], fileData.name, {
                type: fileData.type,
                lastModified: fileData.lastModified,
              });
              // Add size property to match original file
              Object.defineProperty(file, "size", { value: fileData.size, writable: false });
              return file;
            }
          );
        }
      }
    } catch (error) {
      console.error("Failed to restore uploaded files from session:", error);
    }
    return [];
  });

  const [manualEntries, setManualEntries] = useState<ManualEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const sessionJson = localStorage.getItem("pa:session:v9");
      if (sessionJson) {
        const session = JSON.parse(sessionJson);
        return session.manualEntries || [];
      }
    } catch (error) {
      console.error("Failed to load manual entries from session:", error);
    }
    return [];
  });

  const [hasBeenAnalyzed, setHasBeenAnalyzed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const sessionJson = localStorage.getItem("pa:session:v9");
      if (sessionJson) {
        const session = JSON.parse(sessionJson);
        return session.hasBeenAnalyzed || false;
      }
    } catch (error) {
      console.error("Failed to load analyzed status from session:", error);
    }
    return false;
  });

  const [lastAnalysisData, setLastAnalysisData] = useState<AnalysisData | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const sessionJson = localStorage.getItem("pa:session:v9");
      if (sessionJson) {
        const session = JSON.parse(sessionJson);
        return session.lastAnalysisData || null;
      }
    } catch (error) {
      console.error("Failed to load analysis data from session:", error);
    }
    return null;
  });

  // Derived validation: detect file types and compute status
  const validation = (() => {
    const detectType = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes("runsheet") || lower.includes("run_sheet") || lower.includes("run-sheet"))
        return "runsheet" as const;
      if (lower.includes("invoice") || lower.includes("bill") || lower.includes("dv_"))
        return "invoice" as const;
      return "unknown" as const;
    };

    const runsheets = uploadedFiles.filter((f) => detectType(f.name) === "runsheet").length;
    const invoices = uploadedFiles.filter((f) => detectType(f.name) === "invoice").length;
    const totalFiles = uploadedFiles.length;
    const manual = manualEntries.length;

    // Determine validation status based on data availability
    let status: "pending" | "ready" | "incomplete";
    if (totalFiles === 0 && manual === 0) {
      status = "pending";
    } else if (manual > 0 || (runsheets > 0 && invoices > 0)) {
      status = "ready";
    } else {
      status = "incomplete";
    }

    return { status, runsheets, invoices, totalFiles, manualEntries: manual };
  })();

  // Validation function - matches original logic
  const canProgressToStep = useCallback(
    (stepNumber: number): boolean => {
      switch (stepNumber) {
        case 1:
          return true; // Always can go to step 1
        case 2:
        case 3:
          // Allow steps 2 & 3 if we have data OR if we've previously analyzed data
          return (
            uploadedFiles.length > 0 ||
            manualEntries.length > 0 ||
            hasBeenAnalyzed ||
            !!lastAnalysisData
          );
        default:
          return false;
      }
    },
    [uploadedFiles.length, manualEntries.length, hasBeenAnalyzed, lastAnalysisData]
  );

  // Main setStep function - matches original logic
  const setStep = useCallback(
    (stepNumber: number) => {
      if (stepNumber >= 1 && stepNumber <= TOTAL_STEPS) {
        if (!canProgressToStep(stepNumber)) {
          toast.warning("Complete previous steps first");
          return;
        }

        setCurrentStep(stepNumber);
        console.log(`📍 Step changed to: ${stepNumber}`);

        // Step-specific initialization logic
        if (stepNumber === 2) {
          console.log("📊 Entering validation step");
        } else if (stepNumber === 3) {
          console.log("🚀 Entering analysis step");
          // Try to load previous analysis if we don't have current analysis data
          if (!lastAnalysisData && !hasBeenAnalyzed) {
            // In a real app, you might load from localStorage or API here
            console.log("📊 Checking for previous analysis data");
          }
        }
      }
    },
    [canProgressToStep, lastAnalysisData, hasBeenAnalyzed]
  );

  // Auto-progression handlers
  const handleFilesUploaded = useCallback(
    (files: File[]) => {
      setUploadedFiles(files);

      // Auto-progress to step 2 when files are uploaded (matches original logic)
      if (files.length > 0 && currentStep === 1) {
        setTimeout(() => {
          setStep(2);
          toast.success("Files uploaded! Ready to validate");
        }, 500);
      }

      // Go back to step 1 if no files remain and no analysis data exists
      if (files.length === 0 && currentStep > 1 && !lastAnalysisData) {
        setStep(1);
        toast.info("No files remaining. Upload files to continue");
      }
    },
    [currentStep, lastAnalysisData, setStep]
  );

  const handleAnalysisStarted = useCallback(() => {
    const hasFiles = uploadedFiles.length > 0;
    const hasManualData = manualEntries.length > 0;

    if (!hasFiles && !hasManualData) {
      toast.error("No data to analyze");
      return;
    }

    // Mark that analysis has been performed
    setHasBeenAnalyzed(true);
    console.log("✅ Analysis started - marked as analyzed");

    // Progress to step 3 when analysis starts (matches original logic)
    setStep(3);
  }, [uploadedFiles.length, manualEntries.length, setStep]);

  const handleNewAnalysis = useCallback(() => {
    // Clear all data and reset to step 1 (matches original logic)
    setCurrentStep(1);
    setUploadedFiles([]);
    setManualEntries([]);
    setHasBeenAnalyzed(false);
    setLastAnalysisData(null);
    toast.success("Ready for new analysis");
  }, []);

  // Section visibility based on current step
  const showUploadSection = currentStep === 1;
  const showValidateSection = currentStep === 2;
  const showAnalyzeSection = currentStep === 3;

  // Auto-progression for manual entries
  useEffect(() => {
    // Automatically progress to Step 2 after adding manual entry (matches original logic)
    if (inputMethod === "manual" && manualEntries.length > 0 && currentStep === 1) {
      setTimeout(() => {
        setStep(2);
        toast.success("Entry added! Review your data");
      }, 300);
    }
  }, [manualEntries.length, currentStep, inputMethod, setStep]);

  return {
    // State
    currentStep,
    totalSteps: TOTAL_STEPS,
    inputMethod,
    uploadedFiles,
    manualEntries,
    hasBeenAnalyzed,
    lastAnalysisData,
    validation,

    // Actions
    setStep,
    setInputMethod,
    setUploadedFiles,
    setManualEntries,
    setHasBeenAnalyzed,
    setLastAnalysisData,

    // Validation
    canProgressToStep,

    // Auto-progression
    handleFilesUploaded,
    handleAnalysisStarted,
    handleNewAnalysis,

    // Section visibility
    showUploadSection,
    showValidateSection,
    showAnalyzeSection,
  };
}
