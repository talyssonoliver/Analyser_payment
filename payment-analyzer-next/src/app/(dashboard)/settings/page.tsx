/**
 * Settings Page
 * User profile and application settings management
 */

"use client";

import { DollarSign, Settings, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ExportModal } from "@/components/export/export-modal";
import { useAuth } from "@/lib/hooks/useAuth";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import type { LocalStorageExportData } from "@/lib/services/export-service";
import { usePreferences } from "@/lib/stores/preferences-store";
import { PasswordSection } from "./components/PasswordSection";
import { PaymentRulesSection } from "./components/PaymentRulesSection";
import { PreferencesSection } from "./components/PreferencesSection";
import { ProfileSection } from "./components/ProfileSection";

interface StoredDay {
  date: string;
  consignments: number;
  basePayment: number;
  expectedTotal: number;
  paidAmount: number;
  unloadingBonus: number;
  attendanceBonus: number;
  earlyBonus: number;
  pickupCount: number;
  pickupTotal: number;
  rate: number;
  difference: number;
}

interface StoredAnalysis {
  id?: string;
  createdAt?: string;
  days?: StoredDay[];
}

export default function SettingsPage() {
  const { user, updateProfile, updatePassword, isLoading } = useAuth();
  const {
    preferences,
    updateDisplay,
    updateNotifications,
    updateAnalysis,
    updatePrivacy,
    save,
    hasUnsavedChanges,
    isLoading: preferencesLoading,
    resetToDefaults,
  } = usePreferences();

  const [activeTab, setActiveTab] = useState<"account" | "preferences" | "payment-rules">(
    "account"
  );
  const [stats, setStats] = useState<{
    totalAnalyses: number;
    used: string;
    compression: string;
    version: string;
  }>({ totalAnalyses: 0, used: "0", compression: "Enabled", version: "v9" });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<LocalStorageExportData | null>(null);

  // Compute storage stats
  useEffect(() => {
    try {
      const all = AnalysisStorageService.loadAnalyses();
      const storage = AnalysisStorageService.getStorageStats();
      setStats({
        totalAnalyses: Object.keys(all).length,
        used: storage.usage.used,
        compression: "Enabled",
        version: "v9",
      });
    } catch {}
  }, []);

  // Build export payload (all data or latest only)
  const buildExportData = useCallback((scope: "all" | "latest") => {
    const all = AnalysisStorageService.loadAnalyses() as Record<string, StoredAnalysis>;
    const entries = Object.entries(all || {});
    if (entries.length === 0) return null;

    const sortByDateDesc = (a: StoredAnalysis, b: StoredAnalysis) =>
      new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
    const analysesList = entries.map(([id, data]) => ({ id, ...data }));
    analysesList.sort((a, b) => sortByDateDesc(a, b));

    const selected = scope === "latest" ? [analysesList[0]] : analysesList;

    // Aggregate to LocalStorageExportData format
    let totalConsignments = 0;
    let totalAmount = 0;
    let totalDays = 0;
    const dailyData: Record<
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
    > = {};

    selected.forEach((a) => {
      const days = a.days || [];
      days.forEach((d) => {
        const key = d.date;
        let status: string;
        if (d.difference === 0) {
          status = "balanced";
        } else if (d.difference > 0) {
          status = "overpaid";
        } else {
          status = "underpaid";
        }

        dailyData[key] = {
          consignments: d.consignments || 0,
          basePayment: d.basePayment || 0,
          expectedTotal: d.expectedTotal || 0,
          paidAmount: d.paidAmount || 0,
          unloadingBonus: d.unloadingBonus || 0,
          attendanceBonus: d.attendanceBonus || 0,
          earlyBonus: d.earlyBonus || 0,
          pickups: d.pickupCount || 0,
          pickupTotal: d.pickupTotal || 0,
          rate: d.rate || 0,
          status,
        };
        totalConsignments += d.consignments || 0;
        totalAmount += d.paidAmount || 0;
        totalDays += 1;
      });
    });

    const payload: LocalStorageExportData = {
      analysisId: scope === "latest" ? `latest-${Date.now()}` : `all-${Date.now()}`,
      period: scope === "latest" ? "Latest analysis" : `${selected.length} analyses`,
      createdAt: new Date().toISOString(),
      totalDays,
      summary: {
        totalActual: totalAmount,
        totalExpected: totalAmount, // no expected available in storage; use paid as proxy
        workingDays: totalDays,
        totalConsignments,
        averageDaily: totalDays > 0 ? totalAmount / totalDays : 0,
        difference: 0,
      },
      dailyData,
    };
    return payload;
  }, []);

  const handleExportAll = () => {
    const data = buildExportData("all");
    if (!data) return;
    setExportData(data);
    setShowExportModal(true);
  };

  const handleExportLatest = () => {
    const data = buildExportData("latest");
    if (!data) return;
    setExportData(data);
    setShowExportModal(true);
  };

  const handleClearAll = useCallback(async () => {
    if (!user?.id) return;
    const confirmClear = window.confirm(
      "This will delete all analyses (local and cloud). Continue?"
    );
    if (!confirmClear) return;

    try {
      // Delete remote
      const result = await analysisRepository.getUserAnalyses(user.id, {
        limit: 1000,
        orderBy: "created_at",
        order: "desc",
      });
      if (result.isSuccess && result.data?.data?.length) {
        const deletePromises = result.data.data.map((a) => analysisRepository.deleteAnalysis(a.id));
        await Promise.allSettled(deletePromises);
      }
    } catch (e) {
      console.warn("Remote clear failed:", e instanceof Error ? e.message : String(e));
    }

    try {
      // Clear local
      AnalysisStorageService.saveAnalyses({});
      setStats((s) => ({ ...s, totalAnalyses: 0 }));
      alert("All data cleared");
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      alert(`Failed to clear local data: ${errorMessage}`);
    }
  }, [user?.id]);

  const tabs = [
    { id: "account", label: "Account", icon: User },
    { id: "payment-rules", label: "Payment Rules", icon: DollarSign },
    { id: "preferences", label: "Preferences", icon: Settings },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-1.5">
        <p className="text-slate-600 mt-1">Manage your account settings and preferences.</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <ProfileSection user={user} updateProfile={updateProfile} isLoading={isLoading} />
          <PasswordSection
            userEmail={user?.email || ""}
            updatePassword={updatePassword}
            isLoading={isLoading}
          />
        </div>
      )}

      {activeTab === "payment-rules" && <PaymentRulesSection />}

      {activeTab === "preferences" && (
        <PreferencesSection
          preferences={preferences}
          updateDisplay={updateDisplay}
          updateNotifications={updateNotifications}
          updateAnalysis={updateAnalysis}
          updatePrivacy={updatePrivacy}
          save={save}
          hasUnsavedChanges={hasUnsavedChanges}
          isLoading={preferencesLoading}
          resetToDefaults={resetToDefaults}
        />
      )}

      {/* Storage & Data Section */}
      <div className="space-y-4">
        <div className="border border-slate-200 rounded-xl p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-slate-900">Storage & Data</h3>
            <div className="text-xs text-slate-500">Version {stats.version}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Analyses</div>
              <div className="text-lg font-semibold text-slate-900">{stats.totalAnalyses}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Storage Used</div>
              <div className="text-lg font-semibold text-slate-900">{stats.used}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Compression</div>
              <div className="text-lg font-semibold text-slate-900">{stats.compression}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Export</div>
              <div className="text-sm text-slate-600">JSON</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleExportLatest}
              className="action-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Export Current Analysis
            </button>
            <button
              type="button"
              onClick={handleExportAll}
              className="action-btn bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Export All Data
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="action-btn bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && exportData && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          analysisData={exportData}
          title={`Export ${exportData.period}`}
        />
      )}
    </div>
  );
}
