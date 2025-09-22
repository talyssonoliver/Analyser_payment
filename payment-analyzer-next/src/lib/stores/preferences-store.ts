/**
 * Preferences Store
 * Manages user application preferences and settings
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';
import { preferencesService, type PartialPreferencesUpdate } from '@/lib/services/preferences-service';

// Theme options
export type Theme = 'light' | 'dark' | 'system';

// Date format options
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

// Currency display options
export type CurrencyFormat = 'symbol' | 'code' | 'name';

// Number format options
export type NumberFormat = 'standard' | 'compact';

// Notification preferences
export interface NotificationPreferences {
  analysisComplete: boolean;
  errorAlerts: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
}

// Display preferences
export interface DisplayPreferences {
  theme: Theme;
  dateFormat: DateFormat;
  currencyFormat: CurrencyFormat;
  numberFormat: NumberFormat;
  compactMode: boolean;
  showAdvancedFeatures: boolean;
}

// Analysis preferences
export interface AnalysisPreferences {
  autoSave: boolean;
  autoExport: boolean;
  defaultExportFormat: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  includeSummary: boolean;
  maxHistoryDays: number;
}

// Privacy preferences
export interface PrivacyPreferences {
  analyticsEnabled: boolean;
  errorReportingEnabled: boolean;
  dataRetentionDays: number;
}

// Combined preferences interface
export interface UserPreferences {
  display: DisplayPreferences;
  notifications: NotificationPreferences;
  analysis: AnalysisPreferences;
  privacy: PrivacyPreferences;
}

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  display: {
    theme: 'system',
    dateFormat: 'DD/MM/YYYY',
    currencyFormat: 'symbol',
    numberFormat: 'standard',
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
    defaultExportFormat: 'pdf',
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

// Store interface
export interface PreferencesState {
  // State
  preferences: UserPreferences;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  isOnline: boolean;
  lastSyncedAt: string | null;

  // Actions
  updateDisplayPreferences: (preferences: Partial<DisplayPreferences>) => Promise<void>;
  updateNotificationPreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  updateAnalysisPreferences: (preferences: Partial<AnalysisPreferences>) => Promise<void>;
  updatePrivacyPreferences: (preferences: Partial<PrivacyPreferences>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  savePreferences: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
  migrateFromLocalStorage: () => Promise<void>;
  setOnlineStatus: (online: boolean) => void;

  // Internal helper
  updatePreferenceCategory: <K extends keyof UserPreferences>(category: K, newPreferences: Partial<UserPreferences[K]>) => Promise<void>;

  // Computed getters
  getPreference: <K extends keyof UserPreferences>(category: K) => UserPreferences[K];
  getAllPreferences: () => UserPreferences;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // Initial state
      preferences: DEFAULT_PREFERENCES,
      isLoading: false,
      hasUnsavedChanges: false,
      isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
      lastSyncedAt: null,

      // Helper function to update preferences with backend sync
      updatePreferenceCategory: async <K extends keyof UserPreferences>(category: K, newPreferences: Partial<UserPreferences[K]>) => {
        const state = get();
        
        // Optimistically update local state
        const updatedPreferences = {
          ...state.preferences,
          [category]: {
            ...state.preferences[category],
            ...newPreferences,
          },
        };

        set({
          preferences: updatedPreferences,
          hasUnsavedChanges: true,
        });

        // Attempt backend sync if online
        if (state.isOnline) {
          set({ isLoading: true });
          try {
            const update: PartialPreferencesUpdate = {
              [category]: newPreferences,
            };
            
            const result = await preferencesService.updatePreferences(update);
            
            if (result.success && 'data' in result && result.data) {
              set({
                preferences: result.data.preferences,
                hasUnsavedChanges: false,
                lastSyncedAt: result.data.updatedAt || new Date().toISOString(),
                isLoading: false,
              });
            } else {
              console.error('Failed to sync preferences:', result.error);
              set({ 
                isLoading: false,
                hasUnsavedChanges: true, // Keep unsaved flag since sync failed
              });
            }
          } catch (error) {
            console.error('Preferences sync error:', error);
            set({ 
              isLoading: false,
              hasUnsavedChanges: true,
            });
          }
        }
      },

      // Actions
      updateDisplayPreferences: async (newPreferences) => {
        await get().updatePreferenceCategory('display', newPreferences);
      },

      updateNotificationPreferences: async (newPreferences) => {
        await get().updatePreferenceCategory('notifications', newPreferences);
      },

      updateAnalysisPreferences: async (newPreferences) => {
        await get().updatePreferenceCategory('analysis', newPreferences);
      },

      updatePrivacyPreferences: async (newPreferences) => {
        await get().updatePreferenceCategory('privacy', newPreferences);
      },

      resetToDefaults: async () => {
        const state = get();
        
        set({
          preferences: DEFAULT_PREFERENCES,
          hasUnsavedChanges: true,
        });

        // Sync with backend if online
        if (state.isOnline) {
          set({ isLoading: true });
          try {
            const result = await preferencesService.resetToDefaults();
            
            if (result.success && 'data' in result && result.data) {
              set({
                preferences: result.data.preferences,
                hasUnsavedChanges: false,
                lastSyncedAt: result.data.updatedAt || new Date().toISOString(),
                isLoading: false,
              });
            } else {
              console.error('Failed to reset preferences:', result.error);
              set({ isLoading: false });
            }
          } catch (error) {
            console.error('Reset preferences error:', error);
            set({ isLoading: false });
          }
        }
      },

      savePreferences: async () => {
        const state = get();
        
        if (!state.hasUnsavedChanges) {
          return; // Nothing to save
        }

        set({ isLoading: true });
        
        try {
          if (state.isOnline) {
            // Try to sync with backend
            await get().syncWithBackend();
          } else {
            // When offline, just mark as saved locally
            set({ 
              hasUnsavedChanges: false,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Failed to save preferences:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      loadPreferences: async () => {
        const state = get();
        
        set({ isLoading: true });
        
        try {
          if (state.isOnline) {
            const result = await preferencesService.getPreferences().catch((error) => {
              console.warn('Failed to fetch preferences from server:', error);
              // Return a failure result instead of throwing
              return { success: false, error: error.message };
            });
            
            if (result.success && 'data' in result && result.data) {
              set({
                preferences: result.data.preferences,
                hasUnsavedChanges: false,
                lastSyncedAt: new Date().toISOString(),
                isLoading: false,
              });
            } else {
              console.warn('Failed to load preferences from server, using defaults:', result.error);
              // Use default preferences as fallback
              set({ 
                preferences: DEFAULT_PREFERENCES,
                isLoading: false 
              });
            }
          } else {
            // When offline, use persisted preferences
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Load preferences error:', error);
          // Use default preferences as fallback
          set({ 
            preferences: DEFAULT_PREFERENCES,
            isLoading: false 
          });
        }
      },

      syncWithBackend: async () => {
        try {
          const result = await preferencesService.getPreferences().catch((error) => {
            console.warn('Sync with backend failed:', error);
            return { success: false, error: error.message };
          });
          
          if (result.success && 'data' in result && result.data) {
            set({
              preferences: result.data.preferences,
              hasUnsavedChanges: false,
              lastSyncedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('Backend sync error:', error);
        }
      },

      migrateFromLocalStorage: async () => {
        const state = get();
        
        try {
          // Check if we have local preferences that haven't been synced
          const localPrefs = localStorage.getItem(STORAGE_KEYS.settings);
          if (localPrefs && state.isOnline && !state.lastSyncedAt) {
            const parsedPrefs = JSON.parse(localPrefs);
            if (parsedPrefs.state?.preferences) {
              const result = await preferencesService.updatePreferences({
                display: parsedPrefs.state.preferences.display,
                notifications: parsedPrefs.state.preferences.notifications,
                analysis: parsedPrefs.state.preferences.analysis,
                privacy: parsedPrefs.state.preferences.privacy,
              });
              
              if (result.success && 'data' in result && result.data) {
                set({
                  preferences: result.data.preferences,
                  lastSyncedAt: result.data.updatedAt || new Date().toISOString(),
                });
              }
            }
          }
        } catch (error) {
          console.error('Migration error:', error);
        }
      },

      setOnlineStatus: (online) => {
        set({ isOnline: online });
        
        if (online) {
          // When coming online, try to sync
          const state = get();
          if (state.hasUnsavedChanges) {
            state.savePreferences().catch(console.error);
          } else {
            state.syncWithBackend().catch(console.error);
          }
        }
      },

      // Computed getters
      getPreference: (category) => {
        return get().preferences[category];
      },

      getAllPreferences: () => {
        return get().preferences;
      },
    }),
    {
      name: STORAGE_KEYS.settings,
      partialize: (state) => ({ 
        preferences: state.preferences,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);

// Hook for easy access to preferences
export const usePreferences = () => {
  const store = usePreferencesStore();
  
  return {
    // State
    preferences: store.preferences,
    isLoading: store.isLoading,
    hasUnsavedChanges: store.hasUnsavedChanges,
    isOnline: store.isOnline,
    lastSyncedAt: store.lastSyncedAt,
    
    // Actions
    updateDisplay: store.updateDisplayPreferences,
    updateNotifications: store.updateNotificationPreferences,
    updateAnalysis: store.updateAnalysisPreferences,
    updatePrivacy: store.updatePrivacyPreferences,
    resetToDefaults: store.resetToDefaults,
    save: store.savePreferences,
    load: store.loadPreferences,
    sync: store.syncWithBackend,
    migrate: store.migrateFromLocalStorage,
    setOnlineStatus: store.setOnlineStatus,
    
    // Getters
    getPreference: store.getPreference,
    getAllPreferences: store.getAllPreferences,
  };
};
