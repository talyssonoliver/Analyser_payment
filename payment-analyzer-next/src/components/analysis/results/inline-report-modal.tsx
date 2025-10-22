/**
 * Inline Report Modal Component
 * Renders detailed analysis reports immediately without navigation
 * Matches legacy generateAnalysisDataForReports() + renderReport() behavior
 */

"use client";

import { Download, ExternalLink, Printer, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ExportModal } from "@/components/export/export-modal";
// Import shared report components
import {
  ReportDataDisplay,
  ReportHeaderBar,
  ReportKPIGrid,
  ReportSettlementBreakdown,
} from "@/components/reports/shared";
import type { AnalysisStatus } from "@/lib/constants";
import { useAuth } from "@/lib/providers/auth-provider";
import type {
  AnalysisTotalRecord,
  AnalysisWithDetails,
} from "@/lib/repositories/analysis-repository";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import type { LocalStorageExportData } from "@/lib/services/export-service";
import {
  type InlineReportData,
  InlineReportGenerator,
} from "@/lib/services/inline-report-generator";
import { mapToDailyEntryStatus } from "@/lib/utils/status-mapper";
import { toast } from "@/lib/utils/toast";
import type { AnalysisMetadata, AnalysisSource, StringKeyObject } from "@/types/core";

type DailyEntryStatus = "balanced" | "overpaid" | "underpaid";

interface LocalAnalysisData extends StringKeyObject {
  id: string;
  createdAt: string;
  status?: string;
  period?: string;
  totalFiles?: number;
  totalDays?: number;
  dailyData?: Record<
    string,
    {
      consignments?: number;
      rate?: number;
      basePayment?: number;
      pickups?: number;
      pickupTotal?: number;
      unloadingBonus?: number;
      attendanceBonus?: number;
      earlyBonus?: number;
      expectedTotal?: number;
      paidAmount?: number;
      status?: string;
    }
  >;
  summary?: {
    workingDays?: number;
    totalConsignments?: number;
    totalExpected?: number;
    totalActual?: number;
    difference?: number;
  };
  totals?: {
    base_total?: number;
    pickup_total?: number;
    bonus_total?: number;
    expected_total?: number;
    paid_total?: number;
    difference_total?: number;
  };
}

interface InlineReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToReports?: () => void;
  // Optional analysis data - if not provided, will load latest
  analysisData?: AnalysisWithDetails | null;
  // Optional manual entries for direct generation
  manualEntries?: Array<{
    date: string;
    consignments: number;
    expectedTotal: number;
    paidAmount?: number;
  }>;
  // Input method context
  inputMethod?: "manual" | "upload";
}

function transformLocalStorageAnalysis(
  localAnalysis: LocalAnalysisData
): AnalysisWithDetails | null {
  if (!localAnalysis) return null;

  const dailyEntries = localAnalysis.dailyData
    ? Object.entries(localAnalysis.dailyData).map(([date, data]) => ({
        id: "",
        analysis_id: localAnalysis.id,
        date,
        day_of_week: new Date(date).getDay(),
        consignments: data.consignments || 0,
        rate: data.rate || 0,
        base_payment: data.basePayment || 0,
        pickups: data.pickups || 0,
        pickup_total: data.pickupTotal || 0,
        unloading_bonus: data.unloadingBonus || 0,
        attendance_bonus: data.attendanceBonus || 0,
        early_bonus: data.earlyBonus || 0,
        expected_total: data.expectedTotal || 0,
        paid_amount: data.paidAmount || 0,
        difference: (data.paidAmount || 0) - (data.expectedTotal || 0),
        status: "completed" as DailyEntryStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: "",
      }))
    : [];

  return {
    id: localAnalysis.id,
    user_id: "",
    fingerprint: "",
    source: "upload" as AnalysisSource,
    status: "completed" as AnalysisStatus,
    period_start: localAnalysis.createdAt || new Date().toISOString(),
    period_end: localAnalysis.createdAt || new Date().toISOString(),
    rules_version: 1,
    working_days: localAnalysis.summary?.workingDays || 0,
    total_consignments: localAnalysis.summary?.totalConsignments || 0,
    metadata: {} as AnalysisMetadata,
    created_at: localAnalysis.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    daily_entries: dailyEntries,
    analysis_totals: localAnalysis.summary
      ? ({
          id: "",
          analysis_id: localAnalysis.id,
          base_total: localAnalysis.summary.totalExpected || 0,
          pickup_total: 0,
          bonus_total: 0,
          expected_total: localAnalysis.summary.totalExpected || 0,
          paid_total: localAnalysis.summary.totalActual || 0,
          difference_total: localAnalysis.summary.difference || 0,
          created_at: new Date().toISOString(),
        } as AnalysisTotalRecord)
      : undefined,
  };
}

export function InlineReportModal({
  isOpen,
  onClose,
  onNavigateToReports,
  analysisData,
  manualEntries,
  inputMethod = "upload",
}: Readonly<InlineReportModalProps>) {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<InlineReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<LocalStorageExportData | null>(null);
  const [compactView, setCompactView] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const loadLatestAnalysis = useCallback(async (): Promise<AnalysisWithDetails | null> => {
    // First try to load from local storage (session-based analysis)
    console.log("📊 Inline Report: Attempting to load from localStorage");
    const localAnalysesRecord = AnalysisStorageService.loadAnalyses();
    console.log("📊 Inline Report: localStorage analyses found:", {
      count: Object.keys(localAnalysesRecord).length,
      ids: Object.keys(localAnalysesRecord),
    });

    const localAnalyses = Object.values(localAnalysesRecord)
      .filter(
        (item): item is LocalAnalysisData =>
          item && typeof item === "object" && "id" in item && "createdAt" in item
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt || "1970-01-01").getTime() -
          new Date(a.createdAt || "1970-01-01").getTime()
      );

    if (localAnalyses.length > 0) {
      const latestLocal = localAnalyses[0]; // Already sorted by date
      console.log("📊 Inline Report: Found local analysis", {
        id: latestLocal.id,
        createdAt: latestLocal.createdAt,
        hasDailyData: !!latestLocal.dailyData,
        dailyDataKeys: latestLocal.dailyData ? Object.keys(latestLocal.dailyData).length : 0,
      });
      return transformLocalStorageAnalysis(latestLocal);
    }

    console.log("📊 Inline Report: No localStorage analyses found");

    // Then try database if user is authenticated
    if (user?.id) {
      const analysesResult = await analysisRepository.getUserAnalyses(user.id, {
        limit: 1,
        orderBy: "created_at",
        order: "desc",
      });

      if (
        analysesResult.isSuccess &&
        analysesResult.data.data &&
        analysesResult.data.data.length > 0
      ) {
        const detailResult = await analysisRepository.getAnalysisById(
          analysesResult.data.data[0].id
        );
        if (detailResult.isSuccess && detailResult.data) {
          console.log("📊 Inline Report: Found database analysis");
          return detailResult.data;
        }
      }
    }

    return null;
  }, [user?.id]);

  // Load and generate report data when modal opens
  const generateReportDataCallback = useCallback(async () => {
    setLoading(true);
    try {
      let generatedReportData: InlineReportData;

      // Priority 1: Use provided analysis data
      if (analysisData) {
        console.log("📊 Inline Report: Generating from provided analysis data");
        generatedReportData = InlineReportGenerator.generateFromDatabaseAnalysis(analysisData);
      }
      // Priority 2: Use provided manual entries for immediate generation
      else if (manualEntries && manualEntries.length > 0) {
        console.log("📊 Inline Report: Generating from manual entries", {
          entriesCount: manualEntries.length,
          inputMethod,
        });
        generatedReportData = InlineReportGenerator.generateFromManualEntries(manualEntries);
      }
      // Priority 3: Load latest analysis from storage
      else {
        console.log("📊 Inline Report: Loading latest analysis from storage/database");
        const latestAnalysis = await loadLatestAnalysis();
        if (latestAnalysis) {
          console.log("📊 Inline Report: Found latest analysis, generating report");
          generatedReportData = InlineReportGenerator.generateFromDatabaseAnalysis(latestAnalysis);
        } else {
          console.warn("📊 Inline Report: No analysis data found anywhere - showing empty state");
          // Fallback to empty report
          generatedReportData = InlineReportGenerator.generateEmptyReport();
        }
      }

      setReportData(generatedReportData);
      console.log("📊 Inline Report: Report data generated successfully");
    } catch (error) {
      console.error("📊 Inline Report: Error generating report data:", error);
      toast.error("Failed to generate report");
      setReportData(InlineReportGenerator.generateEmptyReport());
    } finally {
      setLoading(false);
    }
  }, [manualEntries, inputMethod, analysisData, loadLatestAnalysis]);

  useEffect(() => {
    if (isOpen) {
      generateReportDataCallback();
    }
  }, [isOpen, generateReportDataCallback]);

  // Manage dialog open/close state
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Handle native dialog close event (e.g., ESC key) and backdrop clicks
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    const handleBackdropClick = (e: MouseEvent) => {
      // Close when clicking on the dialog backdrop (the dialog element itself, not its children)
      if (e.target === dialog) {
        onClose();
      }
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleBackdropClick);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleBackdropClick);
    };
  }, [onClose]);

  const handleExport = () => {
    if (!reportData) return;

    const exportAnalysisData: LocalStorageExportData = {
      analysisId: `inline-report-${Date.now()}`,
      period: reportData.metadata.period || "Unknown Period",
      createdAt: reportData.metadata.createdAt,
      totalDays: reportData.totals.workingDays,
      summary: {
        totalActual: reportData.totals.paidTotal,
        totalExpected: reportData.totals.expectedTotal,
        workingDays: reportData.totals.workingDays,
        totalConsignments: reportData.totals.totalConsignments,
        averageDaily: reportData.totals.averageDaily,
        difference: reportData.totals.totalDifference,
      },
      dailyData: reportData.results.reduce(
        (acc, entry) => {
          acc[entry.date] = {
            consignments: entry.consignments,
            basePayment: entry.basePayment,
            expectedTotal: entry.expectedTotal,
            paidAmount: entry.paidAmount,
            unloadingBonus: entry.unloadingBonus,
            attendanceBonus: entry.attendanceBonus,
            earlyBonus: entry.earlyBonus,
            pickups: entry.pickupCount,
            pickupTotal: entry.pickupTotal,
            rate: entry.rate,
            status: entry.status,
          };
          return acc;
        },
        {} as Record<
          string,
          {
            consignments: number;
            basePayment: number;
            expectedTotal: number;
            paidAmount: number;
            unloadingBonus: number;
            attendanceBonus: number;
            earlyBonus: number;
            pickups: number;
            pickupTotal: number;
            rate: number;
            status: string;
          }
        >
      ),
    };

    setExportData(exportAnalysisData);
    setShowExportModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Call hooks before conditional return
  const modalTitleId = useId();

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby={modalTitleId}
        className="backdrop:bg-black/50 backdrop:backdrop-blur-sm bg-transparent p-0 max-w-7xl w-full max-h-[90vh] rounded-2xl shadow-2xl"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 id={modalTitleId} className="text-xl font-bold text-slate-900">
                  Payment Analysis Report
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {loading
                    ? "Generating report..."
                    : reportData?.metadata.period || "No data available"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Action Buttons */}
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={loading || !reportData}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Export Report"
                >
                  <Download className="w-5 h-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={loading || !reportData}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Print Report"
                >
                  <Printer className="w-5 h-5" aria-hidden="true" />
                </button>
                {onNavigateToReports && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToReports();
                    }}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Open in Reports Page"
                  >
                    <ExternalLink className="w-5 h-5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Close Report"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 140px)" }}>
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600">Generating your report...</p>
                </div>
              </div>
            )}

            {!loading && (!reportData || reportData.totals.workingDays === 0) && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
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
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M7 13v4M11 10v7M15 7v10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No Report Data Available
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Complete an analysis to view your financial report
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {!loading && reportData && reportData.totals.workingDays > 0 && (
              <div className="p-6 space-y-6">
                {/* Report Header */}
                <ReportHeaderBar
                  data={{
                    reportType: reportData.metadata.period || "Payment Analysis Report",
                    period: reportData.metadata.periodRange || reportData.metadata.period,
                    generatedDate: new Date(reportData.metadata.createdAt).toLocaleDateString(
                      "en-GB"
                    ),
                    totalDays: reportData.totals.workingDays,
                    status: reportData.metadata.overallStatus || "BALANCED",
                  }}
                  context="modal"
                />

                {/* KPI Cards */}
                <ReportKPIGrid
                  data={{
                    expected: reportData.totals.expectedTotal,
                    paid: reportData.totals.paidTotal,
                    difference: reportData.totals.totalDifference,
                    consignments: reportData.totals.totalConsignments,
                  }}
                  variant="full"
                  columns={4}
                />

                {/* Daily Breakdown Table */}
                {reportData.results.length > 1 && (
                  <ReportDataDisplay
                    dailyEntries={reportData.results.map((entry) => {
                      // Map status string to valid ReportDailyEntry status using shared mapper
                      const validStatus = mapToDailyEntryStatus(entry.status, entry.difference);

                      return {
                        date: entry.date,
                        day: entry.day,
                        consignments: entry.consignments,
                        rate: entry.rate,
                        basePay: entry.basePayment,
                        pickups: entry.pickupCount,
                        pickupTotal: entry.pickupTotal,
                        bonuses: {
                          unloading: entry.unloadingBonus,
                          attendance: entry.attendanceBonus,
                          early: entry.earlyBonus,
                        },
                        expected: entry.expectedTotal,
                        paid: entry.paidAmount,
                        difference: entry.difference,
                        status: validStatus,
                      };
                    })}
                    totals={{
                      consignments: reportData.totals.totalConsignments,
                      basePay: reportData.totals.baseTotal,
                      pickups: reportData.totals.pickupTotal,
                      bonuses:
                        reportData.totals.unloadingTotal +
                        reportData.totals.attendanceTotal +
                        reportData.totals.earlyTotal,
                      expected: reportData.totals.expectedTotal,
                      paid: reportData.totals.paidTotal,
                      difference: reportData.totals.totalDifference,
                    }}
                    mode="auto"
                    viewMode="week"
                    compactView={compactView}
                    showEditButton={false}
                    onToggleCompactView={() => setCompactView(!compactView)}
                  />
                )}

                {/* Settlement Summary */}
                <ReportSettlementBreakdown
                  breakdown={{
                    consignments: reportData.totals.baseTotal,
                    pickups: reportData.totals.pickupTotal,
                    unloading: reportData.totals.unloadingTotal,
                    attendance: reportData.totals.attendanceTotal,
                    early: reportData.totals.earlyTotal,
                    total: reportData.totals.expectedTotal,
                  }}
                  totals={{
                    expected: reportData.totals.expectedTotal,
                  }}
                  variant="full"
                />
              </div>
            )}
          </div>
        </div>
      </dialog>

      {/* Export Modal */}
      {showExportModal && exportData && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          analysisData={exportData}
          title="Export Inline Report"
        />
      )}
    </>
  );
}
