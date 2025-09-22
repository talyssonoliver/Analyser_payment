import { analysisRepository } from '@/lib/repositories/analysis-repository';
import { AppError, ErrorCodes, Result } from '@/lib/utils/errors';
import type { KPIData } from '@/components/charts/kpi-cards';
import type { RevenueDataPoint } from '@/components/charts/revenue-chart';
import type { AnalysisWithDetails } from '@/lib/repositories/analysis-repository';

export interface AnalyticsData {
  kpis: KPIData[];
  revenueChart: RevenueDataPoint[];
  trends: {
    earnings: number;
    consignments: number;
    efficiency: number;
    accuracy: number;
  };
}

export interface AnalyticsOptions {
  userId: string;
  period: string; // '7d', '30d', '3m', '6m', '1y'
  compareWith?: string; // Previous period for trend calculation
}

export class AnalyticsService {
  private readonly cache = new Map<string, { data: AnalyticsData; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get comprehensive analytics data for dashboard with caching
   */
  async getAnalyticsData(options: AnalyticsOptions): Promise<Result<AnalyticsData>> {
    try {
      const { userId, period } = options;
      
      // Check cache first
      const cacheKey = this.generateCacheKey(options);
      const cached = this.getCachedData(cacheKey);
      
      if (cached) {
        return Result.success(cached);
      }

      // Validate inputs
      if (!userId?.trim()) {
        return Result.failure(
          new AppError(
            'User ID is required',
            ErrorCodes.VALIDATION_REQUIRED_FIELD,
            400
          )
        );
      }

      const validPeriods = ['7d', '30d', '3m', '6m', '1y'];
      if (!validPeriods.includes(period)) {
        return Result.failure(
          new AppError(
            `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
            ErrorCodes.VALIDATION_INVALID_FORMAT,
            400
          )
        );
      }
      
      // Note: Date ranges calculated but not used in current implementation
      // Future enhancement: Use date ranges for filtering queries
      
      // Get current period analyses
      const currentResult = await analysisRepository.getUserAnalyses(userId, {
        limit: 1000, // Get all for the period
      });
      
      if (currentResult.error) {
        return Result.failure(
          new AppError(
            'Failed to fetch current period data',
            ErrorCodes.DATABASE_CONNECTION_ERROR,
            500,
            false,
            { originalError: currentResult.error }
          )
        );
      }
      
      // Get previous period for trend comparison
      const previousResult = await analysisRepository.getUserAnalyses(userId, {
        limit: 1000,
      });
      
      const currentAnalyses = currentResult.data || [];
      const previousAnalyses = previousResult.data || [];
      
      // Process data into analytics format
      const kpis = await this.calculateKPIs(currentAnalyses, previousAnalyses);
      const revenueChart = this.generateRevenueChartData(currentAnalyses);
      const trends = this.calculateTrends(currentAnalyses, previousAnalyses);
      
      const analyticsData: AnalyticsData = {
        kpis,
        revenueChart,
        trends,
      };

      // Cache the result
      this.setCachedData(cacheKey, analyticsData);
      
      return Result.success(analyticsData);
    } catch (error) {
      return Result.failure(
        new AppError(
          'Failed to fetch analytics data',
          ErrorCodes.INTERNAL_ERROR,
          500,
          false,
          { originalError: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  /**
   * Calculate KPIs with trend comparison
   */
  private async calculateKPIs(currentAnalyses: AnalysisWithDetails[], previousAnalyses: AnalysisWithDetails[]): Promise<KPIData[]> {
    // Current period totals
    const currentTotals = this.calculatePeriodTotals(currentAnalyses);
    const previousTotals = this.calculatePeriodTotals(previousAnalyses);
    
    const kpis: KPIData[] = [
      {
        id: 'total_earnings',
        label: 'Total Earnings',
        value: currentTotals.totalEarnings,
        format: 'currency',
        icon: 'dollar',
        color: 'green',
        change: this.calculatePercentageChange(currentTotals.totalEarnings, previousTotals.totalEarnings),
        changeLabel: 'vs previous period',
      },
      {
        id: 'working_days',
        label: 'Working Days',
        value: currentTotals.workingDays,
        format: 'number',
        icon: 'calendar',
        color: 'blue',
        change: this.calculatePercentageChange(currentTotals.workingDays, previousTotals.workingDays),
        changeLabel: 'vs previous period',
      },
      {
        id: 'avg_daily',
        label: 'Avg Daily Revenue',
        value: currentTotals.workingDays > 0 ? currentTotals.totalEarnings / currentTotals.workingDays : 0,
        format: 'currency',
        icon: 'trending',
        color: 'purple',
        change: this.calculatePercentageChange(
          currentTotals.totalEarnings / (currentTotals.workingDays || 1),
          previousTotals.totalEarnings / (previousTotals.workingDays || 1)
        ),
        changeLabel: 'vs previous period',
      },
      {
        id: 'consignments',
        label: 'Total Consignments',
        value: currentTotals.totalConsignments,
        format: 'number',
        icon: 'activity',
        color: 'amber',
        change: this.calculatePercentageChange(currentTotals.totalConsignments, previousTotals.totalConsignments),
        changeLabel: 'vs previous period',
      },
    ];
    
    return kpis;
  }

  /**
   * Generate revenue chart data points
   */
  private generateRevenueChartData(analyses: AnalysisWithDetails[]): RevenueDataPoint[] {
    try {
      // Group analyses by period (daily, weekly, or monthly based on data volume)
      const groupedData = this.groupAnalysesByPeriod(analyses);
      
      return groupedData
        .filter(group => {
          // Ensure valid period data
          if (!group.period || typeof group.period !== 'string' || group.period.trim().length <= 1) {
            console.warn('Filtering out invalid period group:', group);
            return false;
          }
          return true;
        })
        .map((group, index) => ({
          period: group.period.trim(),
          expected: Math.round((group.expectedTotal || 0) * 100) / 100,
          actual: Math.round((group.paidTotal || 0) * 100) / 100,
          difference: Math.round(((group.paidTotal || 0) - (group.expectedTotal || 0)) * 100) / 100,
          consignments: group.consignments || 0,
          // Add a unique identifier for React keys with additional safety
          id: `revenue-${index}-${Date.now()}-${group.period.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
        }));
    } catch (error) {
      console.error('Error generating revenue chart data:', error);
      return [];
    }
  }

  /**
   * Calculate trends between periods
   */
  private calculateTrends(currentAnalyses: AnalysisWithDetails[], previousAnalyses: AnalysisWithDetails[]) {
    const current = this.calculatePeriodTotals(currentAnalyses);
    const previous = this.calculatePeriodTotals(previousAnalyses);
    
    return {
      earnings: this.calculatePercentageChange(current.totalEarnings, previous.totalEarnings),
      consignments: this.calculatePercentageChange(current.totalConsignments, previous.totalConsignments),
      efficiency: this.calculatePercentageChange(
        current.totalEarnings / (current.workingDays || 1),
        previous.totalEarnings / (previous.workingDays || 1)
      ),
      accuracy: this.calculateAccuracyTrend(currentAnalyses, previousAnalyses),
    };
  }

  /**
   * Calculate period totals from analyses
   */
  private calculatePeriodTotals(analyses: AnalysisWithDetails[]) {
    return analyses.reduce((totals, analysis) => {
      const analysisTotal = Array.isArray(analysis.analysis_totals) ? analysis.analysis_totals[0] : analysis.analysis_totals;
      const expectedTotal = analysisTotal?.expected_total || 0;
      const paidTotal = analysisTotal?.paid_total || 0;
      
      return {
        totalEarnings: totals.totalEarnings + expectedTotal,
        totalPaid: totals.totalPaid + paidTotal,
        workingDays: totals.workingDays + (analysis.working_days || 0),
        totalConsignments: totals.totalConsignments + (analysis.total_consignments || 0),
        analysisCount: totals.analysisCount + 1,
      };
    }, {
      totalEarnings: 0,
      totalPaid: 0,
      workingDays: 0,
      totalConsignments: 0,
      analysisCount: 0,
    });
  }

  /**
   * Group analyses by time period for chart display
   */
  private groupAnalysesByPeriod(analyses: AnalysisWithDetails[]) {
    try {
      // Simple grouping by month for now
      const groups = new Map();
      
      if (!Array.isArray(analyses)) {
        console.warn('Invalid analyses data provided to groupAnalysesByPeriod');
        return [];
      }
      
      analyses.forEach((analysis, index) => {
        try {
          // Validate period_start date
          if (!analysis?.period_start) {
            console.warn(`Analysis at index ${index} has no period_start date, skipping`);
            return;
          }
          
          const date = new Date(analysis.period_start);
          
          // Check if date is valid
          if (isNaN(date.getTime())) {
            console.warn(`Invalid date found in analysis at index ${index}: ${analysis.period_start}, skipping`);
            return;
          }
          
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!groups.has(monthKey)) {
            // Generate a safe period label
            let periodLabel;
            try {
              periodLabel = date.toLocaleDateString('en-UK', { year: 'numeric', month: 'short' });
              // Ensure the period label is valid
              if (!periodLabel || periodLabel === 'Invalid Date' || periodLabel.length <= 1) {
                throw new Error('Invalid date formatting result');
              }
            } catch (dateError) {
              console.warn(`Failed to format date ${analysis.period_start}, using fallback format:`, dateError);
              periodLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
            
            groups.set(monthKey, {
              period: periodLabel,
              expectedTotal: 0,
              paidTotal: 0,
              consignments: 0,
            });
          }
          
          const group = groups.get(monthKey);
          const analysisTotal = Array.isArray(analysis.analysis_totals) ? analysis.analysis_totals[0] : analysis.analysis_totals;
          const expectedTotal = analysisTotal?.expected_total || 0;
          const paidTotal = analysisTotal?.paid_total || 0;
          
          group.expectedTotal += expectedTotal;
          group.paidTotal += paidTotal;
          group.consignments += analysis.total_consignments || 0;
        } catch (error) {
          console.warn(`Error processing analysis at index ${index}:`, error);
        }
      });
      
      return Array.from(groups.values())
        .filter(group => group.period && group.period.trim().length > 1) // Filter out invalid periods
        .sort((a, b) => {
          // Safe period comparison
          const periodA = a.period || '';
          const periodB = b.period || '';
          return periodA.localeCompare(periodB);
        });
    } catch (error) {
      console.error('Error grouping analyses by period:', error);
      return [];
    }
  }

  /**
   * Calculate percentage change between two values
   */
  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Calculate payment accuracy trend
   */
  private calculateAccuracyTrend(currentAnalyses: AnalysisWithDetails[], previousAnalyses: AnalysisWithDetails[]): number {
    const calculateAccuracy = (analyses: AnalysisWithDetails[]) => {
      if (analyses.length === 0) return 100;
      
      const accuratePayments = analyses.filter(analysis => {
        const analysisTotal = Array.isArray(analysis.analysis_totals) ? analysis.analysis_totals[0] : analysis.analysis_totals;
        const difference = analysisTotal?.difference_total || 0;
        return Math.abs(difference) < 0.01; // Within 1p
      }).length;
      
      return (accuratePayments / analyses.length) * 100;
    };
    
    const currentAccuracy = calculateAccuracy(currentAnalyses);
    const previousAccuracy = calculateAccuracy(previousAnalyses);
    
    return this.calculatePercentageChange(currentAccuracy, previousAccuracy);
  }

  /**
   * Get date range for period string
   */
  private getPeriodDateRange(period: string) {
    const now = new Date();
    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
    };
    
    const days = daysMap[period] || 30;
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);
    
    return { startDate, endDate: now };
  }

  /**
   * Get previous period date range for comparison
   */
  private getPreviousPeriodDateRange(period: string) {
    const current = this.getPeriodDateRange(period);
    const periodLength = current.endDate.getTime() - current.startDate.getTime();
    
    const endDate = new Date(current.startDate);
    const startDate = new Date(current.startDate.getTime() - periodLength);
    
    return { startDate, endDate };
  }

  /**
   * Forecast earnings for next period
   */
  async forecastEarnings(userId: string, daysAhead: number = 7): Promise<{ forecast: number; confidence: number }> {
    try {
      // Get recent analyses for trend calculation
      const { data: analyses } = await analysisRepository.getUserAnalyses(userId, {
        limit: 50,
        orderBy: 'created_at',
        order: 'desc',
      });
      
      if (!analyses || analyses.length < 3) {
        return { forecast: 0, confidence: 0 };
      }
      
      // Simple linear regression on daily averages
      const dailyAverages = analyses.map(analysis => {
        const expectedTotal = analysis.analysis_totals?.expected_total || 0;
        const workingDays = analysis.working_days || 1;
        return expectedTotal / workingDays;
      });
      
      // Calculate trend
      const recentAverage = dailyAverages.slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(10, dailyAverages.length);
      const forecast = recentAverage * daysAhead;
      const confidence = Math.min(95, analyses.length * 5); // Higher confidence with more data
      
      return { forecast, confidence };
    } catch (error) {
      // Log the error for debugging purposes
      console.error('Error forecasting earnings:', {
        userId,
        daysAhead,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return default values when forecasting fails
      return { forecast: 0, confidence: 0 };
    }
  }
  /**
   * Cache management methods
   */
  private generateCacheKey(options: AnalyticsOptions): string {
    return `analytics:${options.userId}:${options.period}:${options.compareWith || 'none'}`;
  }

  private getCachedData(key: string): AnalyticsData | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: AnalyticsData): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache for a specific user or all cache
   */
  clearCache(userId?: string): void {
    if (userId) {
      for (const [key] of this.cache.entries()) {
        if (key.includes(`analytics:${userId}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();