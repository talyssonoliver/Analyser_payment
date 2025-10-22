/**
 * Step3Container Component
 *
 * Extracts all Step 3 analysis logic from the main analysis page.
 * Handles analysis processing, payment calculations, PDF processing workflow,
 * progress tracking, and inline report modal management.
 */

"use client";

import "@/styles/step3-enhanced-v2.css";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProgressOverlay, Step3AnalyzeSectionV2, useProgressOverlay } from "@/components/analysis";
import { FileFingerprintService as DomainFingerprintService } from "@/lib/domain/services/file-fingerprint-service";
import { useAuth } from "@/lib/providers/auth-provider";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import { CompressedStorageService } from "@/lib/services/compressed-storage-service";
import { SessionRecoveryService } from "@/lib/services/session-recovery-service";
import {
  type Step3AnalysisData,
  Step3AnalysisService,
} from "@/lib/services/step3-analysis-service";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/utils/toast";
import { pdfWorkerClient } from "@/lib/workers/pdf-worker-client";
import type { ManualEntry } from "@/types/core";

interface Step3ContainerProps {
  readonly files: File[];
  readonly entries: ManualEntry[];
  readonly inputMethod: "upload" | "manual";
  readonly onNewAnalysis: () => void;
  readonly onViewReport: () => void;
  readonly onError: (error: string) => void;
  readonly onSetStep: (step: number) => void;
  readonly onAnalysisStarted: () => void;
  readonly showAnalyzeSection: boolean;
  readonly returnFromReports?: boolean; // ✨ NEW: Flag to prevent clearing analysis when returning from reports
}

export function Step3Container({
  files,
  entries,
  inputMethod,
  onNewAnalysis,
  onViewReport,
  returnFromReports = false,
  onError,
  onSetStep,
  onAnalysisStarted,
  showAnalyzeSection,
}: Step3ContainerProps) {
  const router = useRouter();
  const { user } = useAuth(); // Get current authenticated user

  // Progress overlay
  const {
    isVisible: progressVisible,
    hideProgress,
    startProgress,
    completeProgress,
    progressService,
  } = useProgressOverlay();

  // Track if analysis is currently running to prevent duplicate executions
  const isAnalysisRunningRef = useRef(false);

  // Track the last analyzed inputs to prevent re-analyzing the same data
  const lastAnalyzedInputsRef = useRef<string>("");

  // Track previous inputs to detect genuine changes (not just navigation)
  const previousInputsRef = useRef<string>("");
  const hasInitializedRef = useRef(false);

  // Track if we restored analysis from localStorage (for smart initialization)
  const restoredAnalysisRef = useRef<{
    fingerprint: string;
    analysisId: string;
  } | null>(null);

  // Store database analysis ID after saving - Initialize from session if available
  const [savedDbAnalysisId, setSavedDbAnalysisId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const session = SessionRecoveryService.loadSession();
      return session?.dbAnalysisId || null;
    }
    return null;
  });

  // Step 3 analysis state - Initialize from localStorage if available
  const [step3AnalysisData, setStep3AnalysisData] = useState<Step3AnalysisData | null>(() => {
    // Try to load the most recent analysis from localStorage on mount
    if (typeof window !== "undefined") {
      try {
        // Check if we have a current database analysis ID from session
        const session = SessionRecoveryService.loadSession();
        const currentDbAnalysisId = session?.dbAnalysisId;

        const analyses = AnalysisStorageService.loadAnalyses();
        const analysisIds = Object.keys(analyses);

        if (analysisIds.length > 0) {
          // If we have a current database analysis ID, try to load that specific one
          if (currentDbAnalysisId && analyses[currentDbAnalysisId]) {
            const matchingAnalysis = analyses[currentDbAnalysisId] as unknown as Step3AnalysisData;
            console.log(
              "🔄 Step3Container: Restored analysis from localStorage matching dbAnalysisId:",
              currentDbAnalysisId
            );

            restoredAnalysisRef.current = {
              fingerprint: "",
              analysisId: matchingAnalysis.id,
            };

            return matchingAnalysis;
          }

          // Otherwise, get the most recent analysis (they should be ordered by timestamp)
          const mostRecentId = analysisIds[0];
          const mostRecent = analyses[mostRecentId] as unknown as Step3AnalysisData;

          // But warn if it doesn't match the current database ID
          if (currentDbAnalysisId && mostRecentId !== currentDbAnalysisId) {
            console.warn("⚠️ Step3Container: localStorage analysis ID mismatch!", {
              localStorageId: mostRecentId,
              dbAnalysisId: currentDbAnalysisId,
              action: "Will run new analysis for current database ID",
            });
            // Don't restore mismatched analysis - return null to trigger new analysis
            return null;
          }

          console.log(
            "🔄 Step3Container: Restored most recent analysis from localStorage:",
            mostRecent.id
          );

          restoredAnalysisRef.current = {
            fingerprint: "",
            analysisId: mostRecent.id,
          };

          console.log("🔄 Restored analysis from localStorage - will prevent duplicate analysis");

          return mostRecent;
        }
      } catch (error) {
        console.error("Failed to load analysis from localStorage:", error);
      }
    }
    return null;
  });

  /**
   * Calculate analysis metrics (period, working days, consignments)
   */
  const calculateAnalysisMetrics = useCallback((analysisData: Step3AnalysisData) => {
    const dates = analysisData.days.map((d) => new Date(d.date));
    const periodStart = new Date(Math.min(...dates.map((d) => d.getTime())));
    const periodEnd = new Date(Math.max(...dates.map((d) => d.getTime())));

    const workingDays = analysisData.days.filter((d) => {
      const dayOfWeek = new Date(d.date).getDay();
      return dayOfWeek !== 0;
    }).length;

    const totalConsignments = analysisData.days.reduce((sum, d) => sum + d.consignments, 0);

    return { periodStart, periodEnd, workingDays, totalConsignments };
  }, []);

  /**
   * Generate fingerprint for analysis based on input method
   */
  const generateAnalysisFingerprint = useCallback(
    async (
      analysisData: Step3AnalysisData,
      userId: string,
      periodStart: Date,
      periodEnd: Date
    ): Promise<string> => {
      if (analysisData.metadata.inputMethod === "upload" && files.length > 0) {
        try {
          const fingerprintService = new DomainFingerprintService();
          const fileInfos = files.map((file) => ({
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
          }));
          const fingerprintResult = await fingerprintService.createFingerprint(fileInfos);
          console.log(
            "🔑 Generated file fingerprint:",
            `${fingerprintResult.fingerprint.substring(0, 16)}...`
          );
          return fingerprintResult.fingerprint;
        } catch (error) {
          console.error("⚠️ Failed to generate file fingerprint:", error);
          return analysisData.id;
        }
      }

      if (analysisData.metadata.inputMethod === "manual") {
        try {
          const fingerprintService = new DomainFingerprintService();
          const fingerprint = await fingerprintService.createManualFingerprint({
            userId,
            startDate: periodStart,
            endDate: periodEnd,
            entries: analysisData.days.map((d) => ({
              date: new Date(d.date),
              consignments: d.consignments,
              paidAmount: d.paidAmount,
            })),
          });
          console.log("🔑 Generated manual fingerprint:", `${fingerprint.substring(0, 16)}...`);
          return fingerprint;
        } catch (error) {
          console.error("⚠️ Failed to generate manual fingerprint:", error);
          return analysisData.id;
        }
      }

      return analysisData.id;
    },
    [files]
  );

  /**
   * Update or create analysis record
   */
  const updateOrCreateAnalysisRecord = useCallback(
    async (
      analysisData: Step3AnalysisData,
      userId: string,
      fingerprint: string,
      periodStart: Date,
      periodEnd: Date,
      workingDays: number,
      totalConsignments: number
    ): Promise<string> => {
      const session = SessionRecoveryService.loadSession();

      if (session?.dbAnalysisId) {
        console.log("💾 Updating existing analysis:", session.dbAnalysisId);
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from("analyses")
          .update({
            working_days: workingDays,
            total_consignments: totalConsignments,
            period_start: periodStart.toISOString().split("T")[0],
            period_end: periodEnd.toISOString().split("T")[0],
            fingerprint,
            metadata: {
              ...analysisData.metadata,
              originalId: analysisData.id,
            },
          })
          .eq("id", session.dbAnalysisId);

        if (updateError) {
          throw new Error(`Failed to update analysis: ${updateError.message}`);
        }

        console.log("✅ Analysis record updated:", session.dbAnalysisId);
        return session.dbAnalysisId;
      }

      console.warn("⚠️ No dbAnalysisId in session, creating new analysis");
      const result = await analysisRepository.createAnalysis({
        userId,
        fingerprint,
        source: analysisData.metadata.inputMethod === "upload" ? "upload" : "manual",
        periodStart: periodStart.toISOString().split("T")[0],
        periodEnd: periodEnd.toISOString().split("T")[0],
        rulesVersion: 1,
        workingDays,
        totalConsignments,
        metadata: {
          ...analysisData.metadata,
          originalId: analysisData.id,
        },
      });

      if (result.isFailure) {
        if (
          result.error.code === "ANALYSIS_DUPLICATE" &&
          result.error.context?.existingAnalysisId
        ) {
          const existingId = result.error.context.existingAnalysisId as string;
          console.log("💡 Duplicate detected - using existing:", existingId);
          return existingId;
        }
        throw new Error(result.error.message || "Failed to create analysis record");
      }

      if (!result.data) {
        throw new Error("Analysis record created but no data returned");
      }

      console.log("✅ Analysis record created:", result.data.id);
      return result.data.id;
    },
    []
  );

  /**
   * Save daily entries and totals
   */
  const saveDailyEntriesAndTotals = useCallback(
    async (dbAnalysisId: string, analysisData: Step3AnalysisData): Promise<void> => {
      const determineStatus = (difference: number): "balanced" | "overpaid" | "underpaid" => {
        if (Math.abs(difference) < 0.01) return "balanced";
        return difference > 0 ? "overpaid" : "underpaid";
      };

      console.log(`💾 Creating daily entries (${analysisData.days.length} entries)...`);
      const dailyEntries = analysisData.days.map((day) => ({
        date: day.date,
        day_of_week: new Date(day.date).getDay(),
        consignments: day.consignments,
        rate: day.rate,
        base_payment: day.basePayment,
        pickups: day.pickupCount || 0,
        pickup_total: day.pickupTotal || 0,
        unloading_bonus: day.unloadingBonus,
        attendance_bonus: day.attendanceBonus,
        early_bonus: day.earlyBonus,
        expected_total: day.expectedTotal,
        paid_amount: day.paidAmount,
        difference: day.difference,
        status: determineStatus(day.difference),
      }));

      const entriesResult = await analysisRepository.createDailyEntries(dbAnalysisId, dailyEntries);
      if (entriesResult.isFailure) {
        throw new Error(entriesResult.error.message || "Failed to save daily entries");
      }
      console.log("✅ Daily entries created");

      console.log("💾 Creating analysis totals...");
      const totalsResult = await analysisRepository.createAnalysisTotals(dbAnalysisId, {
        base_total: analysisData.totals.baseTotal,
        pickup_total: analysisData.totals.pickupTotal,
        bonus_total: analysisData.totals.bonusTotal,
        expected_total: analysisData.totals.expectedTotal,
        paid_total: analysisData.totals.paidTotal,
        difference_total: analysisData.totals.differenceTotal,
      });
      if (totalsResult.isFailure) {
        throw new Error(totalsResult.error.message || "Failed to create analysis totals");
      }
      console.log("✅ Analysis totals created");

      console.log("💾 Updating analysis status to completed...");
      await analysisRepository.updateAnalysisStatus(dbAnalysisId, "completed");
      console.log("✅ Analysis status updated");
    },
    []
  );

  /**
   * Save analysis to Supabase database
   * Converts Step3AnalysisData to database format and saves all related records
   */
  const saveAnalysisToDatabase = useCallback(
    async (analysisData: Step3AnalysisData, userId: string): Promise<string | null> => {
      try {
        console.log("💾 Starting database save for analysis:", analysisData.id);

        const { periodStart, periodEnd, workingDays, totalConsignments } =
          calculateAnalysisMetrics(analysisData);

        const fingerprint = await generateAnalysisFingerprint(
          analysisData,
          userId,
          periodStart,
          periodEnd
        );

        const dbAnalysisId = await updateOrCreateAnalysisRecord(
          analysisData,
          userId,
          fingerprint,
          periodStart,
          periodEnd,
          workingDays,
          totalConsignments
        );

        await saveDailyEntriesAndTotals(dbAnalysisId, analysisData);

        console.log("💾 Analysis saved to database:", dbAnalysisId);
        return dbAnalysisId;
      } catch (error) {
        console.error("❌ Failed to save analysis to database:", error);
        throw error;
      }
    },
    [
      calculateAnalysisMetrics,
      generateAnalysisFingerprint,
      updateOrCreateAnalysisRecord,
      saveDailyEntriesAndTotals,
    ]
  );

  // Helper: Create fingerprint of inputs for duplicate detection
  // IMPORTANT: Always creates fingerprint from INPUTS (files/entries), not analysis results
  // This ensures we're comparing "what user wants to analyze" consistently
  const createInputFingerprint = useCallback(() => {
    // For upload mode, use file names
    if (inputMethod === "upload") {
      return JSON.stringify({
        inputMethod,
        fileNames: files.map((f) => f.name).sort((a, b) => a.localeCompare(b)),
        filesCount: files.length,
      });
    }

    // For manual entry mode, use entries data
    return JSON.stringify({
      inputMethod,
      entriesCount: entries.length,
      entriesFingerprint: entries.map((e) => `${e.date}-${e.consignments}`).join(","),
    });
  }, [inputMethod, files, entries]);

  // Helper: Initialize fingerprint on first mount
  const handleFirstMount = useCallback(
    (fingerprint: string) => {
      hasInitializedRef.current = true;

      if (restoredAnalysisRef.current && step3AnalysisData) {
        previousInputsRef.current = fingerprint;
        lastAnalyzedInputsRef.current = fingerprint;
        console.log("📍 Initial mount with restored analysis - using current inputs as baseline");
        console.log("   Input fingerprint:", fingerprint);
        console.log("   Analysis ID:", step3AnalysisData.id);
        restoredAnalysisRef.current = null;
      } else {
        previousInputsRef.current = fingerprint;
        console.log("📍 Initial mount - storing input fingerprint:", fingerprint);
      }
    },
    [step3AnalysisData]
  );

  // Helper: Handle returning from reports page
  const handleReturningFromReports = useCallback(
    (fingerprint: string): boolean => {
      const session = SessionRecoveryService.loadSession();
      const isReturningFromReports =
        returnFromReports || session?.navigationIntent === "viewing-report";

      if (isReturningFromReports && step3AnalysisData) {
        console.log("📍 Returning from reports page - preserving existing analysis");
        console.log("   Analysis ID:", step3AnalysisData.id);
        console.log("   DB Analysis ID:", savedDbAnalysisId);
        previousInputsRef.current = fingerprint;
        SessionRecoveryService.clearNavigationIntent();
        return true;
      }
      return false;
    },
    [returnFromReports, step3AnalysisData, savedDbAnalysisId]
  );

  // Helper: Handle navigation scenario with empty inputs
  const handleEmptyInputsNavigation = useCallback(
    (fingerprint: string): boolean => {
      const hasNoInputs = files.length === 0 && entries.length === 0;
      if (hasNoInputs && step3AnalysisData) {
        console.log(
          "📍 Navigation scenario detected - keeping existing analysis (no inputs to compare)"
        );
        previousInputsRef.current = fingerprint;
        return true;
      }
      return false;
    },
    [files.length, entries.length, step3AnalysisData]
  );

  // Helper: Clear analysis data when inputs change
  const clearAnalysisData = useCallback((prevFingerprint: string, currentFingerprint: string) => {
    console.log("🔄 Inputs genuinely changed - clearing old analysis data");
    console.log("   Previous fingerprint:", prevFingerprint);
    console.log("   Current fingerprint:", currentFingerprint);

    setStep3AnalysisData(null);
    console.log("🗑️ Clearing localStorage analyses to prevent stale data merge");
    AnalysisStorageService.clearAnalysisData();
    SessionRecoveryService.clearSession();
    lastAnalyzedInputsRef.current = "";
    console.log("✅ Old analysis data cleared - ready for fresh analysis");
  }, []);

  // Clear old analysis data ONLY when inputs genuinely change (not on mount/navigation)
  useEffect(() => {
    const currentInputsFingerprint = createInputFingerprint();

    // First mount initialization
    if (!hasInitializedRef.current) {
      handleFirstMount(currentInputsFingerprint);
      return;
    }

    // No analysis data - just update fingerprint
    if (!step3AnalysisData) {
      previousInputsRef.current = currentInputsFingerprint;
      return;
    }

    // Returning from reports - preserve analysis
    if (handleReturningFromReports(currentInputsFingerprint)) {
      return;
    }

    // Empty inputs navigation - keep analysis
    if (handleEmptyInputsNavigation(currentInputsFingerprint)) {
      return;
    }

    // Check for actual input changes
    const inputsChanged = previousInputsRef.current !== currentInputsFingerprint;
    if (inputsChanged) {
      // Check for session restoration scenario
      const hasEmptyFiles = files.some((file) => file.size === 0 || !file.size);
      const hasDbAnalysisId = SessionRecoveryService.loadSession()?.dbAnalysisId;

      if (hasEmptyFiles && hasDbAnalysisId) {
        console.log(
          "📍 Empty files detected with database ID - skipping analysis until files restored"
        );
        return;
      }

      clearAnalysisData(previousInputsRef.current, currentInputsFingerprint);
    } else {
      console.log("📍 Inputs unchanged - keeping existing analysis");
    }

    previousInputsRef.current = currentInputsFingerprint;
  }, [
    createInputFingerprint,
    handleFirstMount,
    handleReturningFromReports,
    handleEmptyInputsNavigation,
    clearAnalysisData,
    step3AnalysisData,
    files,
  ]);

  // Helper: Calculate status from difference
  const calculateDayStatus = (difference: number): string => {
    if (difference >= 0) return "balanced";
    if (difference >= -5) return "minor";
    return "review";
  };

  // Helper: Transform days to dailyData format
  const transformDaysToDailyData = useCallback((days: Step3AnalysisData["days"]) => {
    const dailyData: Record<string, unknown> = {};
    days.forEach((day) => {
      dailyData[day.date] = {
        consignments: day.consignments,
        rate: day.rate,
        basePayment: day.basePayment,
        expectedTotal: day.expectedTotal,
        paidAmount: day.paidAmount,
        unloadingBonus: day.unloadingBonus,
        attendanceBonus: day.attendanceBonus,
        earlyBonus: day.earlyBonus,
        pickups: day.pickupCount,
        pickupCount: day.pickupCount,
        pickupTotal: day.pickupTotal,
        status: calculateDayStatus(day.difference),
      };
    });
    return dailyData;
  }, []);

  // Helper: Create storage data object
  const createStorageData = useCallback((
    analysisData: Step3AnalysisData,
    dailyData: Record<string, unknown>
  ) => {
    return {
      id: analysisData.id,
      totals: analysisData.totals,
      weeks: analysisData.weeks,
      days: analysisData.days,
      dailyData,
      metadata: analysisData.metadata,
      summary: {
        totalExpected: analysisData.totals.expectedTotal,
        totalActual: analysisData.totals.paidTotal,
        totalConsignments: analysisData.totals.totalConsignments,
        workingDays: analysisData.totals.workingDays,
        difference: analysisData.totals.differenceTotal,
      },
      createdAt: new Date().toISOString(),
    };
  }, []);

  /**
   * Clean up old localStorage entry after successful DB save
   */
  const cleanupOldLocalStorageEntry = useCallback((oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;

    try {
      const analyses = AnalysisStorageService.loadAnalyses();
      if (analyses[oldKey]) {
        delete analyses[oldKey];
        CompressedStorageService.setItem(AnalysisStorageService.KEYS.ANALYSES, analyses);
        console.log("🗑️ Removed old localStorage entry:", oldKey);
      }
    } catch (cleanupError) {
      console.warn("⚠️ Could not remove old localStorage entry:", cleanupError);
    }
  }, []);

  /**
   * Update session after successful save
   */
  const updateSessionAfterSave = useCallback((dbAnalysisId: string, localAnalysisId: string) => {
    const existingSession = SessionRecoveryService.loadSession();
    SessionRecoveryService.saveSession({
      ...existingSession,
      hasBeenAnalyzed: true,
      lastAnalysisData: { id: dbAnalysisId, localStorageId: localAnalysisId },
      dbAnalysisId,
    });
  }, []);

  /**
   * Handle successful database save
   */
  const handleDatabaseSaveSuccess = useCallback(
    (
      dbAnalysisId: string,
      storageData: ReturnType<typeof createStorageData>,
      localAnalysisId: string
    ) => {
      console.log("✅ Analysis saved to database:", dbAnalysisId);

      // Update metadata with database ID
      storageData.metadata = {
        ...storageData.metadata,
        dbAnalysisId,
      } as typeof storageData.metadata;

      // Cache in localStorage AFTER database save succeeds
      AnalysisStorageService.saveAnalysis(dbAnalysisId, storageData);
      console.log("💾 Analysis cached in localStorage:", dbAnalysisId);

      // Store dbAnalysisId in component state
      setSavedDbAnalysisId(dbAnalysisId);

      // Clean up old localStorage entry if different
      cleanupOldLocalStorageEntry(localAnalysisId, dbAnalysisId);

      // Update session with database ID
      updateSessionAfterSave(dbAnalysisId, localAnalysisId);

      toast.success("Analysis saved successfully");
    },
    [cleanupOldLocalStorageEntry, updateSessionAfterSave]
  );

  /**
   * Save analysis to database and cache in localStorage
   */
  const saveAnalysisToDatabaseAndCache = useCallback(
    async (
      analysisData: Step3AnalysisData,
      storageData: ReturnType<typeof createStorageData>,
      userId: string
    ) => {
      if (!userId) {
        throw new Error("You must be logged in to save analyses");
      }

      try {
        // Save to database with retry mechanism
        const dbAnalysisId = await saveAnalysisToDatabase(analysisData, userId);

        if (dbAnalysisId) {
          handleDatabaseSaveSuccess(dbAnalysisId, storageData, analysisData.id);
        }
      } catch (dbError) {
        // Database save failed - DO NOT save to localStorage
        console.error("❌ Database save failed:", dbError);
        toast.error("Failed to save analysis to database. Please try again.");
        throw new Error(
          `Database save failed: ${dbError instanceof Error ? dbError.message : "Unknown error"}`
        );
      }
    },
    [saveAnalysisToDatabase, handleDatabaseSaveSuccess]
  );

  // Process and update Step 3 analysis data
  const updateStep3Analysis = useCallback(async () => {
    // Prevent duplicate analysis runs
    if (isAnalysisRunningRef.current) {
      console.log("⏭️ Analysis already running, skipping duplicate execution");
      return;
    }

    // Create fingerprint from current inputs
    const currentInputsFingerprint = createInputFingerprint();

    if (lastAnalyzedInputsRef.current === currentInputsFingerprint) {
      console.log("⏭️ Same inputs already analyzed, skipping duplicate analysis");
      return;
    }

    isAnalysisRunningRef.current = true;
    lastAnalyzedInputsRef.current = currentInputsFingerprint;

    try {
      onAnalysisStarted();
      startProgress();
      progressService.advanceToStage(1, "Loading rules");

      const analysisInput = {
        inputMethod,
        files,
        manualEntries: entries,
        userId: user?.id,
        enableHistoricalMerge: true,
      };

      const analysisData = await Step3AnalysisService.processAnalysis(analysisInput);
      setStep3AnalysisData(analysisData);

      if (analysisData?.id) {
        const dailyData = transformDaysToDailyData(analysisData.days);
        const storageData = createStorageData(analysisData, dailyData);

        progressService.advanceToStage(7, "Saving to database");

        // ✅ CRITICAL FIX: Save to DATABASE FIRST, localStorage SECOND
        await saveAnalysisToDatabaseAndCache(analysisData, storageData, user?.id || "");

        console.log("💾 Analysis save complete");
      }
    } catch (error) {
      console.error("Failed to update Step 3 analysis:", error);
      setStep3AnalysisData(null);
      progressService.failStage(2, error instanceof Error ? error.message : "Analysis failed");
    } finally {
      isAnalysisRunningRef.current = false;
    }
  }, [
    createInputFingerprint,
    inputMethod,
    files,
    entries,
    onAnalysisStarted,
    startProgress,
    progressService,
    user,
    saveAnalysisToDatabaseAndCache,
    createStorageData,
    transformDaysToDailyData,
  ]);

  // Handle Step 3 new analysis request
  const handleStep3NewAnalysis = () => {
    console.log("🔄 handleStep3NewAnalysis: Starting new analysis workflow");
    onNewAnalysis();
    onSetStep(1);
    setStep3AnalysisData(null);

    SessionRecoveryService.clearSession();
    toast.success("Ready for new analysis");
    console.log("🔄 handleStep3NewAnalysis: New analysis started, step set to 1");
  };

  // Handle Step 3 view detailed report - Navigate directly to reports page
  const handleStep3ViewDetailedReport = async () => {
    console.log("📊 handleStep3ViewDetailedReport: Navigating to reports page");
    console.log("📊 Current analysis data state:", {
      hasAnalysisData: !!step3AnalysisData,
      analysisId: step3AnalysisData?.id,
      dbAnalysisId: savedDbAnalysisId,
      daysCount: step3AnalysisData?.days?.length,
      inputMethod,
    });

    // ✅ Use database analysis ID (not localStorage ID) for reports
    const analysisIdToUse = savedDbAnalysisId || step3AnalysisData?.id;

    if (!analysisIdToUse) {
      toast.error("No analysis available to view");
      return;
    }

    // Validate analysis is ready before navigating
    const { AnalysisValidationService } = await import(
      "@/lib/services/analysis-validation-service"
    );
    const isValid = await AnalysisValidationService.validateAndNotify(analysisIdToUse, toast);

    if (!isValid) {
      console.warn("📊 Analysis validation failed, not navigating to reports");
      return;
    }

    // Mark navigation intent so we can restore directly when user returns
    SessionRecoveryService.markNavigationToReport(3);

    // Navigate directly to reports page with analysis context
    onViewReport();

    const reportUrl = `/reports?analysisId=${analysisIdToUse}`;

    router.push(reportUrl);
    console.log("📊 Navigating to:", reportUrl, "with dbAnalysisId:", savedDbAnalysisId);
  };

  // Update Step 3 analysis when data changes
  useEffect(() => {
    // Check if files are empty blobs (restored from session metadata only)
    // The session restoration creates File objects with empty content but preserved size metadata
    // We need to detect if the actual blob content is empty, not just check the size property
    const checkFilesHaveContent = async () => {
      if (files.length === 0) return true; // No files means manual entry mode - OK to proceed

      // Check if ANY file has empty content (size 0 blob despite size property)
      for (const file of files) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          if (arrayBuffer.byteLength === 0) {
            console.log(
              `⏭️ File "${file.name}" has empty content (${arrayBuffer.byteLength} bytes in blob, size property: ${file.size})`
            );
            return false; // Empty blob detected
          }
        } catch (error) {
          console.error(`❌ Failed to read file "${file.name}":`, error);
          return false; // Error reading file - don't proceed
        }
      }
      return true; // All files have content
    };

    // Only run analysis if:
    // 1. We're in the analyze section
    // 2. We have data to analyze (entries or files)
    // 3. We don't already have analysis data loaded
    // 4. Files have actual content (not empty blobs from session restoration)
    if (showAnalyzeSection && (entries.length > 0 || files.length > 0) && !step3AnalysisData) {
      // Check if files have content before analyzing
      checkFilesHaveContent().then((hasContent) => {
        if (!hasContent) {
          console.log(
            "⏭️ Skipping analysis - files have no content (waiting for restoration from Storage)"
          );
          return;
        }

        console.log("🔄 Step3Container: Running analysis (files loaded with content)");
        updateStep3Analysis();
      });
    } else if (showAnalyzeSection && step3AnalysisData) {
      console.log("✅ Step3Container: Using existing analysis data:", step3AnalysisData.id);
    }
    return () => {
      // Ensure overlay hides when section unmounts
      hideProgress();
      try {
        pdfWorkerClient.terminate();
      } catch {}
    };
  }, [
    showAnalyzeSection,
    entries.length,
    files.length,
    step3AnalysisData,
    updateStep3Analysis,
    hideProgress,
    files,
  ]);

  return (
    <>
      {/* Progress Overlay */}
      <ProgressOverlay
        isVisible={progressVisible}
        onComplete={() => {
          completeProgress();
          hideProgress();
        }}
        onError={(error) => {
          onError(error);
          hideProgress();
        }}
      />

      {/* Step 3: Analyze Section */}
      {showAnalyzeSection && (
        <Step3AnalyzeSectionV2
          lastAnalysisData={step3AnalysisData}
          manualEntries={entries}
          currentInputMethod={inputMethod}
          onSetStep={onSetStep}
          onStartNewAnalysis={handleStep3NewAnalysis}
          onViewDetailedReport={handleStep3ViewDetailedReport}
          className="active"
        />
      )}
    </>
  );
}
