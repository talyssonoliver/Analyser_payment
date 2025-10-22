/**
 * Reports Page
 * Simplified with extracted components and hooks
 */

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import type { ManualEntryData } from "@/components/analysis";
import { ManualEntry } from "@/components/analysis";
import { ExportModal } from "@/components/export/export-modal";
import { ReportEmptyState } from "@/components/reports/ReportEmptyState";
import { ReportLoadingState } from "@/components/reports/ReportLoadingState";
// Import shared report components
import {
  type ReportDailyEntry,
  ReportDataDisplay,
  ReportHeaderBar,
  ReportKPIGrid,
  ReportSettlementBreakdown,
} from "@/components/reports/shared";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
// Import custom hooks and components
import { useReportData } from "@/hooks/useReportData";
import { useAuth } from "@/lib/providers/auth-provider";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import type { LocalStorageExportData } from "@/lib/services/export-service";

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const compactToggleId = useId();

  // Use custom hooks for data loading
  const { reportData, loading, isDailyReport, currentAnalysisId, requestedAnalysisId } =
    useReportData(user?.id);

  // Local state for UI
  const [compactView, setCompactView] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<LocalStorageExportData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ReportDailyEntry | null>(null);
  const viewMode: "week" | "month" = "week";

  const handleExport = useCallback(() => {
    if (!reportData) return;

    // Convert report data to export format
    const exportAnalysisData: LocalStorageExportData = {
      analysisId: `report-${Date.now()}`,
      period: reportData.period,
      createdAt: reportData.generatedDate,
      totalDays: reportData.totalDays,
      summary: {
        totalActual: reportData.totals.paid,
        totalExpected: reportData.totals.expected,
        workingDays: reportData.totalDays,
        totalConsignments: reportData.totals.consignments,
        averageDaily: reportData.totals.paid / reportData.totalDays,
        difference: reportData.totals.difference,
      },
      dailyData: reportData.dailyEntries.reduce(
        (acc, entry) => {
          acc[entry.date] = {
            consignments: entry.consignments,
            basePayment: entry.basePay,
            expectedTotal: entry.expected,
            paidAmount: entry.paid,
            unloadingBonus: entry.bonuses.unloading,
            attendanceBonus: entry.bonuses.attendance,
            earlyBonus: entry.bonuses.early,
            pickups: entry.pickups,
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
  }, [reportData]);

  // Listen for export events from the header button
  useEffect(() => {
    const handleExportEvent = () => {
      handleExport();
    };

    window.addEventListener("exportReport", handleExportEvent);

    return () => {
      window.removeEventListener("exportReport", handleExportEvent);
    };
  }, [handleExport]);

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showEditModal) {
        setShowEditModal(false);
        setEditingEntry(null);
      }
    };

    if (showEditModal) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showEditModal]);

  // Focus trap for edit modal for consistent accessibility
  useEffect(() => {
    if (!showEditModal) return;

    const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");
    if (!dialog) return;

    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      );

    // Try focus first focusable element
    const focusables = getFocusable();
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      dialog.tabIndex = -1;
      dialog.focus();
    }

    const handleTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = getFocusable();
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          last.focus();
          e.preventDefault();
        }
      } else if (active === last || !dialog.contains(active)) {
        first.focus();
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleTrap);
    return () => document.removeEventListener("keydown", handleTrap);
  }, [showEditModal]);

  // Handle edit day data - Open manual entry modal
  const handleEditDayData = useCallback((entry: ReportDailyEntry) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  }, []);

  // Handle save from manual entry modal
  const handleSaveEntry = useCallback(
    async (entryData: ManualEntryData) => {
      if (!editingEntry || !currentAnalysisId || !user) return;

      try {
        // Update the daily entry in the database
        const updatedEntry = {
          date: entryData.date.toISOString().split("T")[0],
          consignments: entryData.consignments,
          paid_amount: entryData.paidAmount,
          expected_total: entryData.expectedAmount,
          difference: entryData.paidAmount - entryData.expectedAmount,
          base_payment: entryData.baseAmount || 0,
          pickups: entryData.pickups || 0,
          early_bonus: entryData.bonuses?.early || 0,
          attendance_bonus: entryData.bonuses?.attendance || 0,
          unloading_bonus: entryData.bonuses?.unloading || 0,
        };

        const result = await analysisRepository.updateDailyEntry(
          user.id,
          currentAnalysisId,
          editingEntry.date,
          updatedEntry
        );

        if (result.isSuccess) {
          console.log(`✅ Successfully updated entry for ${editingEntry.date}`);
          setShowEditModal(false);
          setEditingEntry(null);

          // Reload the report data to show updates
          router.refresh();
        } else {
          console.error("❌ Failed to update entry:", result.error.message);
          toast({
            title: "Update Failed",
            description:
              result.error?.message ?? "We could not update this entry. Please try again.",
            type: "error",
          });
        }
      } catch (error) {
        console.error("❌ Failed to update entry:", error);
        toast({
          title: "Update Failed",
          description:
            error instanceof Error
              ? error.message
              : "We could not update this entry. Please try again.",
          type: "error",
        });
      }
    },
    [editingEntry, currentAnalysisId, router, toast, user]
  );

  // Removed: groupDailyEntries and getStatusBadge - now in ReportTable component

  if (loading) {
    return <ReportLoadingState />;
  }

  if (!reportData || reportData.totalDays === 0) {
    return <ReportEmptyState requestedAnalysisId={requestedAnalysisId} />;
  }

  const totals = reportData.totals;

  return (
    <div className="min-h-screen theme-background">
      <div className="container mx-auto px-2 py-0 space-y-2">
        {/* Report Header */}
        <ReportHeaderBar
          data={{
            reportType: reportData.reportType,
            period: reportData.period,
            generatedDate: reportData.generatedDate,
            totalDays: reportData.totalDays,
            status: reportData.status,
          }}
          context="page"
        />

        {/* View Options - Only show for multi-day reports */}
        {!isDailyReport && reportData.totalDays > 1 && (
          <div className="flex items-center justify-end py-2">
            <label htmlFor={compactToggleId} className="mr-2 text-sm text-slate-600 select-none">
              Compact view
            </label>
            <Switch
              id={compactToggleId}
              checked={compactView}
              onChange={setCompactView}
              aria-label="Toggle compact view"
              size="md"
            />
          </div>
        )}

        {/* Enhanced KPI Dashboard */}
        <ReportKPIGrid
          data={{
            expected: totals.expected ?? 0,
            paid: totals.paid ?? 0,
            difference: totals.difference ?? 0,
            consignments: totals.consignments ?? 0,
          }}
          variant="full"
          columns={4}
        />

        {/* Analysis Breakdown - Show table only for multi-day reports */}
        {!isDailyReport && (
          <ReportDataDisplay
            dailyEntries={reportData.dailyEntries}
            totals={reportData.totals}
            mode="auto"
            viewMode={viewMode}
            compactView={compactView}
            showEditButton={true}
            onToggleCompactView={() => setCompactView(!compactView)}
            onEditDayData={handleEditDayData}
          />
        )}

        {/* Settlement Summary */}
        <ReportSettlementBreakdown
          breakdown={reportData.breakdown}
          totals={reportData.totals}
          variant="full"
        />

        {/* Export Modal */}
        {showExportModal && exportData && (
          <ExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            analysisData={exportData}
            title={`Export ${reportData.period} Report`}
          />
        )}

        {/* Edit Day Data Modal - Using existing ManualEntry component */}
        {showEditModal && editingEntry && (
          <dialog
            open
            aria-labelledby="edit-modal-title"
            className="fixed inset-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm z-[99999] p-0 m-0 border-0 max-w-none max-h-none w-full h-full flex items-start justify-center overflow-y-auto"
          >
            <form method="dialog" className="contents">
              <button
                type="submit"
                aria-label="Close modal"
                className="fixed inset-0 cursor-default"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEntry(null);
                }}
              />
              <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl relative">
                <ManualEntry
                  onClose={() => {
                    setShowEditModal(false);
                    setEditingEntry(null);
                  }}
                  onAddEntry={handleSaveEntry}
                  editMode={true}
                  editData={{
                    date: new Date(editingEntry.date),
                    consignments: editingEntry.consignments,
                    paidAmount: editingEntry.paid,
                    bonuses: {
                      unloading: editingEntry.bonuses.unloading || 0,
                      attendance: editingEntry.bonuses.attendance || 0,
                      early: editingEntry.bonuses.early || 0,
                    },
                    pickups: editingEntry.pickups,
                  }}
                />
              </div>
            </form>
          </dialog>
        )}
      </div>
    </div>
  );
}
