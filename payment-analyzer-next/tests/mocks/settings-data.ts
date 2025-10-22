/**
 * Settings Page Mock Data
 * Fixture data for testing settings page functionality
 */

import type { UserPreferences } from "@/lib/stores/preferences-store";

export const mockPreferences: UserPreferences = {
  display: {
    theme: "light",
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "symbol",
    numberFormat: "standard",
    compactMode: false,
    showAdvancedFeatures: false,
  },
  notifications: {
    analysisComplete: true,
    errorAlerts: true,
    dailyDigest: false,
    weeklyReport: false,
  },
  analysis: {
    autoSave: true,
    autoExport: false,
    defaultExportFormat: "pdf",
    includeCharts: true,
    includeSummary: true,
    maxHistoryDays: 90,
  },
  privacy: {
    analyticsEnabled: true,
    errorReportingEnabled: true,
    dataRetentionDays: 365,
  },
};

export const mockPaymentRules = {
  weekdayRate: 2.0,
  saturdayRate: 3.0,
  unloadingBonus: 30.0,
  attendanceBonus: 25.0,
  earlyBonus: 50.0,
};

export const mockUser = {
  id: "test-user-123",
  email: "test@example.com",
  displayName: "Test User",
  user_metadata: {
    name: "Test User",
  },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00.000Z",
};

export const mockAuthHook = {
  user: mockUser,
  isLoading: false,
  isAuthenticated: true,
  updateProfile: () => Promise.resolve({ error: null }),
  updatePassword: () => Promise.resolve({ error: null }),
  signIn: () => Promise.resolve({ error: null }),
  signOut: () => Promise.resolve({ error: null }),
  signUp: () => Promise.resolve({ error: null }),
};

export const mockPreferencesStore = {
  preferences: mockPreferences,
  isLoading: false,
  hasUnsavedChanges: false,
  isOnline: true,
  lastSyncedAt: null,
  updateDisplay: () => {},
  updateNotifications: () => {},
  updateAnalysis: () => {},
  updatePrivacy: () => {},
  save: () => Promise.resolve(),
  resetToDefaults: () => {},
};
