/**
 * Preferences Service
 * Handles API communication for user preferences management
 */

import type { UserPreferences, DisplayPreferences, NotificationPreferences, AnalysisPreferences, PrivacyPreferences } from '@/lib/stores/preferences-store';
import { StringKeyObject } from '@/types/core';

export interface PreferencesApiResponse {
  success: boolean;
  data?: {
    preferences: UserPreferences;
    userId: string;
    updatedAt?: string;
  };
  error?: string;
  details?: StringKeyObject;
}

export interface PartialPreferencesUpdate {
  display?: Partial<DisplayPreferences>;
  notifications?: Partial<NotificationPreferences>;
  analysis?: Partial<AnalysisPreferences>;
  privacy?: Partial<PrivacyPreferences>;
}

export class PreferencesService {
  private readonly baseUrl = '/api/preferences';

  /**
   * Fetch user preferences from the database
   */
  async getPreferences(): Promise<PreferencesApiResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      }).catch((fetchError) => {
        console.error('Fetch error:', fetchError);
        throw new Error(`Network error: ${fetchError.message || 'Failed to connect'}`);
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to fetch preferences',
          details: data.details,
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('PreferencesService.getPreferences error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  /**
   * Update user preferences in the database
   */
  async updatePreferences(updates: PartialPreferencesUpdate): Promise<PreferencesApiResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to update preferences',
          details: data.details,
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('PreferencesService.updatePreferences error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  /**
   * Update display preferences specifically
   */
  async updateDisplayPreferences(preferences: Partial<DisplayPreferences>): Promise<PreferencesApiResponse> {
    return this.updatePreferences({ display: preferences });
  }

  /**
   * Update notification preferences specifically
   */
  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<PreferencesApiResponse> {
    return this.updatePreferences({ notifications: preferences });
  }

  /**
   * Update analysis preferences specifically
   */
  async updateAnalysisPreferences(preferences: Partial<AnalysisPreferences>): Promise<PreferencesApiResponse> {
    return this.updatePreferences({ analysis: preferences });
  }

  /**
   * Update privacy preferences specifically
   */
  async updatePrivacyPreferences(preferences: Partial<PrivacyPreferences>): Promise<PreferencesApiResponse> {
    return this.updatePreferences({ privacy: preferences });
  }

  /**
   * Reset preferences to defaults by sending empty object
   * (API will merge with empty object, effectively removing custom preferences)
   */
  async resetToDefaults(): Promise<PreferencesApiResponse> {
    return this.updatePreferences({
      display: {},
      notifications: {},
      analysis: {},
      privacy: {},
    });
  }

  /**
   * Validate network connectivity by making a simple request
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'HEAD',
        credentials: 'same-origin',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const preferencesService = new PreferencesService();