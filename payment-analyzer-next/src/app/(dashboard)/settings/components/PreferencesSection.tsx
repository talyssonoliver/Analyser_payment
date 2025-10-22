/**
 * Preferences Section Component
 * Handles all user preferences (Display, Notifications, Analysis, Privacy)
 */

"use client";

import { BarChart, Bell, RefreshCw, Save, Settings, Shield, User } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, type SelectOption } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type {
  AnalysisPreferences,
  CurrencyFormat,
  DateFormat,
  DisplayPreferences,
  NotificationPreferences,
  NumberFormat,
  PrivacyPreferences,
  Theme,
  UserPreferences,
} from "@/lib/stores/preferences-store";

interface PreferencesSectionProps {
  preferences: UserPreferences | null;
  updateDisplay: (data: Partial<DisplayPreferences>) => void;
  updateNotifications: (data: Partial<NotificationPreferences>) => void;
  updateAnalysis: (data: Partial<AnalysisPreferences>) => void;
  updatePrivacy: (data: Partial<PrivacyPreferences>) => void;
  save: () => Promise<void>;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  resetToDefaults: () => void;
}

// Select options
const themeOptions: SelectOption[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const dateFormatOptions: SelectOption[] = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

const currencyFormatOptions: SelectOption[] = [
  { value: "symbol", label: "Symbol (£)" },
  { value: "code", label: "Code (GBP)" },
  { value: "name", label: "Name (British Pound)" },
];

const numberFormatOptions: SelectOption[] = [
  { value: "standard", label: "Standard (1,234.56)" },
  { value: "compact", label: "Compact (1.2K)" },
];

const exportFormatOptions: SelectOption[] = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
  { value: "csv", label: "CSV" },
];

const historyRetentionOptions: SelectOption[] = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "6 months" },
  { value: "365", label: "1 year" },
];

const dataRetentionOptions: SelectOption[] = [
  { value: "90", label: "90 days" },
  { value: "180", label: "6 months" },
  { value: "365", label: "1 year" },
  { value: "730", label: "2 years" },
];

export function PreferencesSection({
  preferences,
  updateDisplay,
  updateNotifications,
  updateAnalysis,
  updatePrivacy,
  save,
  hasUnsavedChanges,
  isLoading,
  resetToDefaults,
}: PreferencesSectionProps) {
  const { toast } = useToast();
  const baseId = useId();

  const handlePreferencesSave = async () => {
    try {
      await save();
      toast({
        title: "Preferences Saved",
        description: "Your preferences have been successfully updated.",
        type: "success",
      });
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast({
        title: "Save Failed",
        description:
          error instanceof Error ? error.message : "Failed to save preferences. Please try again.",
        type: "error",
      });
    }
  };

  const handleResetPreferences = () => {
    resetToDefaults();
    toast({
      title: "Preferences Reset",
      description: "All preferences have been reset to default values.",
      type: "success",
    });
  };

  if (isLoading) {
    return (
      <Card variant="secondary">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-slate-600">
            <div className="animate-pulse">Loading preferences...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Display Preferences */}
      <Card variant="secondary">
        <CardHeader>
          <CardTitle className="!text-blue-600 font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Display Preferences</span>
          </CardTitle>
          <p className="text-sm text-slate-600">
            Customize how information is displayed in the application.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor={`${baseId}-theme`} className="text-sm font-medium text-slate-700">
                Theme
              </label>
              <Select
                id={`${baseId}-theme`}
                value={preferences?.display?.theme ?? "system"}
                onChange={(value) => updateDisplay({ theme: value as Theme })}
                options={themeOptions}
              />
              <p className="text-xs text-slate-500">Choose your preferred color theme</p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`${baseId}-dateFormat`}
                className="text-sm font-medium text-slate-700"
              >
                Date Format
              </label>
              <Select
                id={`${baseId}-dateFormat`}
                value={preferences?.display?.dateFormat ?? "DD/MM/YYYY"}
                onChange={(value) => updateDisplay({ dateFormat: value as DateFormat })}
                options={dateFormatOptions}
              />
              <p className="text-xs text-slate-500">Format for displaying dates</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label
                htmlFor={`${baseId}-currencyFormat`}
                className="text-sm font-medium text-slate-700"
              >
                Currency Format
              </label>
              <Select
                id={`${baseId}-currencyFormat`}
                value={preferences?.display?.currencyFormat ?? "symbol"}
                onChange={(value) => updateDisplay({ currencyFormat: value as CurrencyFormat })}
                options={currencyFormatOptions}
              />
              <p className="text-xs text-slate-500">How currency values are displayed</p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`${baseId}-numberFormat`}
                className="text-sm font-medium text-slate-700"
              >
                Number Format
              </label>
              <Select
                id={`${baseId}-numberFormat`}
                value={preferences?.display?.numberFormat ?? "standard"}
                onChange={(value) => updateDisplay({ numberFormat: value as NumberFormat })}
                options={numberFormatOptions}
              />
              <p className="text-xs text-slate-500">Format for displaying numbers</p>
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-slate-700">Display Options</h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label
                    htmlFor={`${baseId}-compactMode`}
                    className="text-sm font-medium text-slate-700"
                  >
                    Compact Mode
                  </label>
                  <p className="text-xs text-slate-500">Reduce spacing and use smaller elements</p>
                </div>
                <Switch
                  id={`${baseId}-compactMode`}
                  checked={preferences?.display?.compactMode ?? false}
                  onChange={(checked) => updateDisplay({ compactMode: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label
                    htmlFor={`${baseId}-advancedFeatures`}
                    className="text-sm font-medium text-slate-700"
                  >
                    Show Advanced Features
                  </label>
                  <p className="text-xs text-slate-500">
                    Display advanced analysis tools and options
                  </p>
                </div>
                <Switch
                  id={`${baseId}-advancedFeatures`}
                  checked={preferences?.display?.showAdvancedFeatures ?? false}
                  onChange={(checked) => updateDisplay({ showAdvancedFeatures: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card variant="secondary">
        <CardHeader>
          <CardTitle className="!text-blue-600 font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <span>Notifications</span>
          </CardTitle>
          <p className="text-sm text-slate-600">
            Configure when and how you receive notifications.
          </p>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label
                  htmlFor={`${baseId}-analysisComplete`}
                  className="text-sm font-medium text-slate-700"
                >
                  Analysis Complete
                </label>
                <p className="text-xs text-slate-500">Notify when file analysis is finished</p>
              </div>
              <Switch
                id={`${baseId}-analysisComplete`}
                checked={preferences?.notifications?.analysisComplete ?? true}
                onChange={(checked) => updateNotifications({ analysisComplete: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label
                  htmlFor={`${baseId}-errorAlerts`}
                  className="text-sm font-medium text-slate-700"
                >
                  Error Alerts
                </label>
                <p className="text-xs text-slate-500">Notify about errors and issues</p>
              </div>
              <Switch
                id={`${baseId}-errorAlerts`}
                checked={preferences?.notifications?.errorAlerts ?? true}
                onChange={(checked) => updateNotifications({ errorAlerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label
                  htmlFor={`${baseId}-dailyDigest`}
                  className="text-sm font-medium text-slate-700"
                >
                  Daily Digest
                </label>
                <p className="text-xs text-slate-500">Daily summary of your analysis activity</p>
              </div>
              <Switch
                id={`${baseId}-dailyDigest`}
                checked={preferences?.notifications?.dailyDigest ?? false}
                onChange={(checked) => updateNotifications({ dailyDigest: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label
                  htmlFor={`${baseId}-weeklyReport`}
                  className="text-sm font-medium text-slate-700"
                >
                  Weekly Report
                </label>
                <p className="text-xs text-slate-500">Weekly insights and trends report</p>
              </div>
              <Switch
                id={`${baseId}-weeklyReport`}
                checked={preferences?.notifications?.weeklyReport ?? false}
                onChange={(checked) => updateNotifications({ weeklyReport: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Preferences */}
      <Card variant="secondary">
        <CardHeader>
          <CardTitle className="!text-blue-600 font-bold flex items-center gap-2">
            <BarChart className="w-5 h-5 text-blue-600" />
            <span>Analysis & Export</span>
          </CardTitle>
          <p className="text-sm text-slate-600">Configure analysis behavior and export settings.</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Auto Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label
                  htmlFor={`${baseId}-autoSave`}
                  className="text-sm font-medium text-slate-700"
                >
                  Auto Save
                </label>
                <p className="text-xs text-slate-500">Automatically save analysis results</p>
              </div>
              <Switch
                id={`${baseId}-autoSave`}
                checked={preferences?.analysis?.autoSave ?? true}
                onChange={(checked) => updateAnalysis({ autoSave: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label
                  htmlFor={`${baseId}-autoExport`}
                  className="text-sm font-medium text-slate-700"
                >
                  Auto Export
                </label>
                <p className="text-xs text-slate-500">Automatically export completed analyses</p>
              </div>
              <Switch
                id={`${baseId}-autoExport`}
                checked={preferences?.analysis?.autoExport ?? false}
                onChange={(checked) => updateAnalysis({ autoExport: checked })}
              />
            </div>
          </div>

          {/* Export Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-2">
              <label
                htmlFor={`${baseId}-exportFormat`}
                className="text-sm font-medium text-slate-700"
              >
                Default Export Format
              </label>
              <Select
                id={`${baseId}-exportFormat`}
                value={preferences?.analysis?.defaultExportFormat ?? "pdf"}
                onChange={(value) =>
                  updateAnalysis({ defaultExportFormat: value as "pdf" | "excel" | "csv" })
                }
                options={exportFormatOptions}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`${baseId}-historyRetention`}
                className="text-sm font-medium text-slate-700"
              >
                History Retention
              </label>
              <Select
                id={`${baseId}-historyRetention`}
                value={(preferences?.analysis?.maxHistoryDays ?? 90).toString()}
                onChange={(value) => updateAnalysis({ maxHistoryDays: parseInt(value, 10) })}
                options={historyRetentionOptions}
              />
              <p className="text-xs text-slate-500">How long to keep analysis history</p>
            </div>
          </div>

          {/* Include Options */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-slate-700">Export Content</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label
                    htmlFor={`${baseId}-includeCharts`}
                    className="text-sm font-medium text-slate-700"
                  >
                    Include Charts
                  </label>
                  <p className="text-xs text-slate-500">Add charts to exports</p>
                </div>
                <Switch
                  id={`${baseId}-includeCharts`}
                  checked={preferences?.analysis?.includeCharts ?? true}
                  onChange={(checked) => updateAnalysis({ includeCharts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label
                    htmlFor={`${baseId}-includeSummary`}
                    className="text-sm font-medium text-slate-700"
                  >
                    Include Summary
                  </label>
                  <p className="text-xs text-slate-500">Add summary section to exports</p>
                </div>
                <Switch
                  id={`${baseId}-includeSummary`}
                  checked={preferences?.analysis?.includeSummary ?? true}
                  onChange={(checked) => updateAnalysis({ includeSummary: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Preferences */}
      <Card variant="secondary">
        <CardHeader>
          <CardTitle className="!text-blue-600 font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>Privacy & Data</span>
          </CardTitle>
          <p className="text-sm text-slate-600">Control data collection and retention settings.</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label
                  htmlFor={`${baseId}-analytics`}
                  className="text-sm font-medium text-slate-700"
                >
                  Analytics
                </label>
                <p className="text-xs text-slate-500">
                  Help improve the app by sharing usage analytics
                </p>
              </div>
              <Switch
                id={`${baseId}-analytics`}
                checked={preferences?.privacy?.analyticsEnabled ?? true}
                onChange={(checked) => updatePrivacy({ analyticsEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label
                  htmlFor={`${baseId}-errorReporting`}
                  className="text-sm font-medium text-slate-700"
                >
                  Error Reporting
                </label>
                <p className="text-xs text-slate-500">
                  Automatically send error reports to help fix bugs
                </p>
              </div>
              <Switch
                id={`${baseId}-errorReporting`}
                checked={preferences?.privacy?.errorReportingEnabled ?? true}
                onChange={(checked) => updatePrivacy({ errorReportingEnabled: checked })}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="space-y-2">
              <label
                htmlFor={`${baseId}-dataRetention`}
                className="text-sm font-medium text-slate-700"
              >
                Data Retention Period
              </label>
              <Select
                id={`${baseId}-dataRetention`}
                value={(preferences?.privacy?.dataRetentionDays ?? 365).toString()}
                onChange={(value) => updatePrivacy({ dataRetentionDays: parseInt(value, 10) })}
                options={dataRetentionOptions}
              />
              <p className="text-xs text-slate-500">
                How long your personal data is stored before automatic deletion
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card variant="secondary">
        <CardHeader>
          <CardTitle className="!text-blue-600 font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>Preference Actions</span>
          </CardTitle>
          <p className="text-sm text-slate-600">
            Save your updates or revert to the recommended defaults.
          </p>
        </CardHeader>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-between">
          <Button
            variant="secondary"
            onClick={handleResetPreferences}
            disabled={isLoading}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Reset to Defaults
          </Button>

          <div className="flex gap-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-amber-600 self-center">You have unsaved changes</span>
            )}
            <Button
              onClick={handlePreferencesSave}
              disabled={isLoading || !hasUnsavedChanges}
              isLoading={isLoading}
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Preferences
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
