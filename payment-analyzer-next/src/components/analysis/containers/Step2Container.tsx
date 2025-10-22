/**
 * Step2Container Component
 *
 * Handles all Step 2 validation logic extracted from the main analysis page.
 * This component is responsible for:
 * - File validation display and management
 * - Entry cards rendering for manual entries
 * - Workflow cards and actions
 * - File list display with status indicators
 * - All Step 2 event handlers and validation logic
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { EntryCards, WorkflowCards } from "@/components/analysis";
import { LegacyStep2Validation } from "@/components/analysis/validation/legacy-step2-validation";
import { AnalysisRepository } from "@/lib/repositories/analysis-repository";
import { FileStorageService } from "@/lib/services/file-storage-service";
import { SessionRecoveryService } from "@/lib/services/session-recovery-service";
import { toast } from "@/lib/utils/toast";

// Type definitions for the component
interface DailyEntry {
  id: number;
  date: string;
  day: string;
  consignments: number;
  baseAmount: number;
  totalPay: number;
  pickups?: number;
  earlyArrive?: number;
  attendanceBonus?: number;
  unloadingBonus?: number;
}

interface Step2ContainerProps {
  readonly files: File[];
  readonly entries: DailyEntry[];
  readonly validationResult?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null;
  readonly onStepComplete: () => void;
  readonly onEditEntry?: (entryId: number) => void;
  readonly onAddMoreDays?: () => void;
  readonly onError: (error: string) => void;
  readonly onFileRemove?: (fileName: string, fileSize: number) => void;
  readonly onGoToStep1?: () => void;
  readonly onFilesLoaded?: (files: File[]) => void; // New prop for loading files from DB
  readonly userId?: string; // User ID for file operations
  readonly className?: string;
}

export function Step2Container({
  files,
  entries,
  validationResult,
  onStepComplete,
  onEditEntry,
  onAddMoreDays,
  onError,
  onFileRemove,
  onGoToStep1,
  onFilesLoaded,
  userId,
  className = "",
}: Step2ContainerProps) {
  // State for file loading
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const hasLoadedFilesRef = useRef(false);

  // Load files from database if needed
  useEffect(() => {
    const loadFilesFromDatabase = async () => {
      // Don't load if:
      // - Already loaded files in this session
      // - Files already exist in memory
      // - No user ID
      // - Manual entry mode (has entries)
      if (hasLoadedFilesRef.current || files.length > 0 || !userId || entries.length > 0) {
        return;
      }

      const session = SessionRecoveryService.loadSession();
      const dbAnalysisId = session?.dbAnalysisId;

      // No dbAnalysisId means no files to load
      if (!dbAnalysisId) {
        console.log("📂 No dbAnalysisId in session - skipping file load");
        return;
      }

      console.log("📂 Step 2: Checking for files to load from database...");
      console.log("   - dbAnalysisId:", dbAnalysisId);
      console.log("   - files in memory:", files.length);
      console.log("   - userId:", userId);

      try {
        setIsLoadingFiles(true);

        // Get file metadata from database
        const analysisRepo = new AnalysisRepository();
        const analysisResult = await analysisRepo.getAnalysisById(dbAnalysisId);

        if (analysisResult.isFailure || !analysisResult.data) {
          console.log("📂 No analysis found for ID:", dbAnalysisId);
          return;
        }

        const analysis = analysisResult.data;
        const fileRecords = analysis.analysis_files || [];

        if (fileRecords.length === 0) {
          console.log("📂 No files associated with this analysis");
          return;
        }

        console.log(
          `📂 Found ${fileRecords.length} file(s) in database:`,
          fileRecords.map((f) => f.original_name)
        );

        // Download files from Storage
        const fileNames = fileRecords.map((f) => f.original_name);
        const fileStorage = new FileStorageService();
        const downloadResult = await fileStorage.downloadAnalysisFiles(
          userId,
          dbAnalysisId,
          fileNames
        );

        if (downloadResult.isFailure) {
          console.error("📂 Failed to download files:", downloadResult.error);
          toast.error("Failed to load files from storage");
          return;
        }

        const downloadedFiles = downloadResult.data;
        console.log(`✅ Successfully loaded ${downloadedFiles.length} file(s) from storage`);

        // Update parent component with loaded files
        if (onFilesLoaded) {
          onFilesLoaded(downloadedFiles);
          hasLoadedFilesRef.current = true;
          toast.success(`Loaded ${downloadedFiles.length} file(s) from database`);
        }
      } catch (error) {
        console.error("📂 Error loading files from database:", error);
        toast.error("Failed to load files from database");
      } finally {
        setIsLoadingFiles(false);
      }
    };

    loadFilesFromDatabase();
  }, [files.length, entries.length, userId, onFilesLoaded]);

  // Handle edit entry with error handling
  const handleEditEntry = (entryId: number) => {
    try {
      if (onEditEntry) {
        onEditEntry(entryId);
      }
    } catch (error) {
      console.error("Error editing entry:", error);
      onError("Failed to edit entry");
    }
  };

  // Handle add more days with error handling
  const handleAddMoreDays = () => {
    try {
      if (onAddMoreDays) {
        onAddMoreDays();
      }
    } catch (error) {
      console.error("Error adding more days:", error);
      onError("Failed to open add more days dialog");
    }
  };

  // Handle analyze week action
  const handleAnalyzeWeek = () => {
    try {
      onStepComplete();
    } catch (error) {
      console.error("Error starting analysis:", error);
      onError("Failed to start analysis");
    }
  };

  // Render Step 2 content based on workflow type
  const renderStep2Content = () => {
    // Show loading state while files are being loaded from database
    if (isLoadingFiles) {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-blue-600 animate-spin"
            >
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Files...</h3>
          <p className="text-slate-600">Retrieving your uploaded files from storage</p>
        </div>
      );
    }

    // Show rich entry cards if we have manual entries
    if (entries.length > 0) {
      return (
        <div className="validate-content">
          {/* Rich Entry Display */}
          <EntryCards entries={entries} onEditEntry={handleEditEntry} />

          {/* Workflow Cards */}
          <div className="mt-8">
            <WorkflowCards onAddMoreDays={handleAddMoreDays} onAnalyzeWeek={handleAnalyzeWeek} />
          </div>
        </div>
      );
    }

    // Show file validation if we have uploaded files - Use LegacyStep2Validation component
    if (files.length > 0) {
      return (
        <LegacyStep2Validation
          uploadedFiles={files}
          validationResult={validationResult}
          onAnalyzeWeek={handleAnalyzeWeek}
          onFileRemove={onFileRemove}
        />
      );
    }

    // Empty state
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-slate-400"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Data to Validate</h3>
        <p className="text-slate-600">
          Upload PDF files or add manual entries to proceed with validation
        </p>
        <button
          type="button"
          onClick={() => onGoToStep1?.()}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Go Back to Upload
        </button>
      </div>
    );
  };

  return (
    <div className={`step2-container w-full max-w-4xl mx-auto ${className || ""}`}>
      {renderStep2Content()}
    </div>
  );
}

export default Step2Container;
