/**
 * Week Navigation Service
 * Manages selected week state for week-specific reports navigation
 * Replicates legacy State.setSelectedWeek() functionality
 */

import type { AnalysisWithDetails } from '@/lib/repositories/analysis-repository';
import type { InlineReportData } from './inline-report-generator';

export interface WeekInfo {
  week: number;
  year: number;
}

export interface WeekNavigationState {
  selectedWeek: WeekInfo | null;
  analysisId: string | null;
  returnUrl: string | null;
}

class WeekNavigationService {
  private state: WeekNavigationState = {
    selectedWeek: null,
    analysisId: null,
    returnUrl: null
  };

  private listeners: Set<(state: WeekNavigationState) => void> = new Set();

  /**
   * Set the selected week for navigation (equivalent to legacy State.setSelectedWeek)
   */
  setSelectedWeek(weekInfo: WeekInfo, analysisId?: string): void {
    console.log('📅 Selected week set:', weekInfo);

    this.state = {
      ...this.state,
      selectedWeek: weekInfo,
      analysisId: analysisId || this.state.analysisId
    };

    // Store in sessionStorage for browser navigation persistence
    sessionStorage.setItem('selectedWeek', JSON.stringify(weekInfo));
    if (analysisId) {
      sessionStorage.setItem('weekAnalysisId', analysisId);
    }

    this.notifyListeners();
  }

  /**
   * Get the currently selected week (equivalent to legacy State.getSelectedWeek)
   */
  getSelectedWeek(): WeekInfo | null {
    // Try to get from current state first
    if (this.state.selectedWeek) {
      return this.state.selectedWeek;
    }

    // Fallback to sessionStorage for persistence
    const stored = sessionStorage.getItem('selectedWeek');
    if (stored) {
      try {
        const weekInfo = JSON.parse(stored);
        this.state.selectedWeek = weekInfo;
        return weekInfo;
      } catch (error) {
        console.warn('Failed to parse stored selectedWeek:', error);
      }
    }

    return null;
  }

  /**
   * Get the analysis ID associated with the selected week
   */
  getAnalysisId(): string | null {
    if (this.state.analysisId) {
      return this.state.analysisId;
    }

    // Fallback to sessionStorage
    const stored = sessionStorage.getItem('weekAnalysisId');
    if (stored) {
      this.state.analysisId = stored;
      return stored;
    }

    return null;
  }

  /**
   * Clear the selected week (equivalent to legacy State.clearSelectedWeek)
   */
  clearSelectedWeek(): void {
    console.log('📅 Selected week cleared');

    this.state = {
      ...this.state,
      selectedWeek: null,
      analysisId: null
    };

    sessionStorage.removeItem('selectedWeek');
    sessionStorage.removeItem('weekAnalysisId');

    this.notifyListeners();
  }

  /**
   * Set return URL for navigation back to analysis
   */
  setReturnUrl(url: string): void {
    this.state = {
      ...this.state,
      returnUrl: url
    };
    sessionStorage.setItem('weekReturnUrl', url);
  }

  /**
   * Get return URL for navigation back to analysis
   */
  getReturnUrl(): string | null {
    if (this.state.returnUrl) {
      return this.state.returnUrl;
    }

    const stored = sessionStorage.getItem('weekReturnUrl');
    if (stored) {
      this.state.returnUrl = stored;
      return stored;
    }

    return null;
  }

  /**
   * Get full navigation state
   */
  getState(): WeekNavigationState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: WeekNavigationState) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Navigate to week-specific report page
   * Replicates legacy behavior: State.setSelectedWeek() + navigate('reports')
   */
  navigateToWeekReport(weekInfo: WeekInfo, analysisId?: string, router?: { push: (url: string) => void }): void {
    console.log(`📅 Week title clicked: Week ${weekInfo.week}, ${weekInfo.year}`);

    // Set the selected week state
    this.setSelectedWeek(weekInfo, analysisId);

    // Calculate week date range for URL parameters
    const weekStartDate = this.getWeekStartDate(weekInfo.year, weekInfo.week);
    const weekEndDate = this.getWeekEndDate(weekInfo.year, weekInfo.week);

    const startDateStr = weekStartDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDateStr = weekEndDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Build reports URL with week parameters
    const params = new URLSearchParams();
    if (analysisId) {
      params.set('analysis', analysisId);
    }
    params.set('week', `${weekInfo.week}`);
    params.set('start', startDateStr);
    params.set('end', endDateStr);

    const reportsUrl = `/reports?${params.toString()}`;

    // Navigate to reports page (legacy: requireModule('routerModule').navigate('reports'))
    if (router && typeof router.push === 'function') {
      router.push(reportsUrl);
    } else if (typeof window !== 'undefined') {
      window.location.href = reportsUrl;
    }

    console.log(`📅 Navigating to week report: ${reportsUrl}`);
  }

  /**
   * Generate week-specific inline report data
   * Uses InlineReportGenerator for immediate display without navigation
   */
  async generateInlineWeekReport(
    weekInfo: WeekInfo,
    analysisData: AnalysisWithDetails
  ): Promise<InlineReportData> {
    try {
      const { InlineReportGenerator } = await import('./inline-report-generator');

      if (!analysisData) {
        console.warn('No analysis data available for week report generation');
        return InlineReportGenerator.generateEmptyReport();
      }

      // Use the existing week report generation from InlineReportGenerator
      const weekReport = InlineReportGenerator.generateWeekReportFromDatabaseAnalysis(
        analysisData,
        weekInfo.week,
        weekInfo.year
      );

      console.log(`📊 Generated inline week report for Week ${weekInfo.week}, ${weekInfo.year}:`, {
        entries: weekReport.results.length,
        totalExpected: weekReport.totals.expectedTotal,
        period: weekReport.metadata.period
      });

      return weekReport;
    } catch (error) {
      console.error('Failed to generate inline week report:', error);
      const { InlineReportGenerator } = await import('./inline-report-generator');
      return InlineReportGenerator.generateEmptyReport();
    }
  }

  /**
   * Get the start date of a week (Monday) - matches InlineReportGenerator logic
   */
  private getWeekStartDate(year: number, weekNumber: number): Date {
    const januaryFirst = new Date(year, 0, 1);
    const daysToFirstMonday = (8 - januaryFirst.getDay()) % 7;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);

    return new Date(firstMonday.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Get the end date of a week (Sunday) - matches InlineReportGenerator logic
   */
  private getWeekEndDate(year: number, weekNumber: number): Date {
    const weekStart = this.getWeekStartDate(year, weekNumber);
    return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.state });
      } catch (error) {
        console.error('Error in week navigation listener:', error);
      }
    });
  }

  /**
   * Check if we're currently viewing a week-specific report
   */
  isWeekReportActive(): boolean {
    return this.state.selectedWeek !== null;
  }

  /**
   * Get week display name
   */
  getWeekDisplayName(weekInfo?: WeekInfo | null): string {
    const week = weekInfo || this.state.selectedWeek;
    if (!week) return '';
    return `Week ${week.week}, ${week.year}`;
  }
}

// Export singleton instance
export const weekNavigationService = new WeekNavigationService();

// Export service class for testing
export { WeekNavigationService };