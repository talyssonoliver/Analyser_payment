/**
 * Dashboard Page
 * Main analytics dashboard with KPIs, charts, and recent analysis
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { AnalysisStorageService } from '@/lib/services/analysis-storage-service';
import { 
  FileText,
  Plus,
  TrendingUp,
  BarChart3,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { analyticsService } from '@/lib/services/analytics-service';
import { analysisRepository } from '@/lib/repositories/analysis-repository';
import type { AnalysisWithDetails } from '@/lib/repositories/analysis-repository';
import type { KPIData } from '@/components/charts/kpi-cards';
import type { RevenueDataPoint } from '@/components/charts/revenue-chart';

interface DashboardData {
  kpis: KPIData[];
  revenueData: RevenueDataPoint[];
  recentAnalyses: AnalysisWithDetails[];
  forecast?: number;
  totalRevenue: number;
  avgDaily: number;
  deliveries: number;
  performance: number;
  revenueChange: number;
  deliveriesChange: number;
  periodLabel: string;
}

// Type alias for payment status
type PaymentStatus = 'pending' | 'received' | 'shortfall';

// Type for daily entry data
interface DailyEntryData {
  date: string;
  consignments: number;
  paid_amount: number;
  expected_total: number;
}

function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData>({
    kpis: [],
    revenueData: [],
    recentAnalyses: [],
    totalRevenue: 0,
    avgDaily: 0,
    deliveries: 0,
    performance: 0,
    revenueChange: 0,
    deliveriesChange: 0,
    periodLabel: 'September Week'
  });
  const [selectedPeriod] = useState('30d');
  

  const getPerformanceLabel = (performance: number): string => {
    if (performance >= 95) return 'Excellent';
    if (performance >= 85) return 'Good';
    return 'Needs Review';
  };

  // Helper function to format date consistently without timezone issues
  const formatDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Helper function for status tooltips
  const getStatusTooltip = (status: PaymentStatus, paymentInfo: { totalExpected: number; totalPaid: number }) => {
    switch (status) {
      case 'pending': {
        const expectedText = paymentInfo.totalExpected > 0
          ? `£${paymentInfo.totalExpected.toFixed(2)} expected`
          : 'payment pending';
        return `Work completed - ${expectedText}`;
      }
      case 'received':
        return `Payment received: £${paymentInfo.totalPaid.toFixed(2)}`;
      case 'shortfall':
        return `Payment shortfall: £${(paymentInfo.totalExpected - paymentInfo.totalPaid).toFixed(2)} missing`;
      default:
        return '';
    }
  };

  // Get detailed payment info for a specific date with multiple statuses
  const getPaymentInfoForDate = (date: Date | null) => {
    if (!date) return {
      hasData: false,
      totalExpected: 0,
      totalPaid: 0,
      statuses: [] as Array<'pending' | 'received' | 'shortfall'>
    };

    const dateKey = formatDateKey(date);
    let totalExpected = 0;
    let totalPaid = 0;
    let hasData = false;

    // Check database analyses FIRST (more reliable for payment data)
    if (data.recentAnalyses.length > 0) {
      data.recentAnalyses.forEach(analysis => {
        if (analysis.daily_entries) {
          const dayEntry = analysis.daily_entries.find(entry => {
            const entryDate = new Date(entry.date);
            return formatDateKey(entryDate) === dateKey && (entry.consignments || 0) > 0;
          });
          if (dayEntry) {
            hasData = true;
            totalExpected += dayEntry.expected_total || 0;
            totalPaid += dayEntry.paid_amount || 0;

          }
        }
      });
    }

    // Check localStorage analyses as fallback if no database data
    if (!hasData) {
      const localAnalyses = AnalysisStorageService.loadAnalyses();
      if (localAnalyses && Object.keys(localAnalyses).length > 0) {
        Object.values(localAnalyses).forEach((analysis: unknown) => {
          const typedAnalysis = analysis as { dailyData?: Record<string, unknown> };
          if (typedAnalysis.dailyData) {
            const dayEntry = typedAnalysis.dailyData[dateKey];
            if (dayEntry && typeof dayEntry === 'object') {
              const typedDayEntry = dayEntry as { consignments?: number; expectedTotal?: number; paidAmount?: number };
              if ((typedDayEntry.consignments || 0) > 0) {
                hasData = true;
                totalExpected += typedDayEntry.expectedTotal || 0;
                totalPaid += typedDayEntry.paidAmount || 0;
              }
            }
          }
        });
      }
    }

    // Determine status indicators to show - can show multiple
    const statuses: Array<'pending' | 'received' | 'shortfall'> = [];
    if (hasData) {
      // Blue dot: Always show for data (work was done)
      statuses.push('pending');

      // Green dot: Show if any payment received
      if (totalPaid > 0) {
        statuses.push('received');
      }

      // Red dot: Show if there's a shortfall (paid < expected)
      if (totalExpected > 0 && totalPaid < totalExpected) {
        statuses.push('shortfall');
      }
    }

    return { hasData, totalExpected, totalPaid, statuses };
  };

  // Helper function to calculate period dates
  const calculatePeriodDates = (viewMode: 'monthly' | 'weekly', now: Date) => {
    let periodStart: Date;
    let periodEnd: Date;
    let periodLabel: string;

    if (viewMode === 'monthly') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Include year if not current year
      const currentYear = new Date().getFullYear();
      const isCurrentYear = now.getFullYear() === currentYear;
      periodLabel = now.toLocaleDateString('en-US', {
        month: 'long',
        ...(isCurrentYear ? {} : { year: 'numeric' })
      });
    } else {
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - daysToMonday);
      periodStart.setHours(0, 0, 0, 0);

      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);

      // Include year if not current year
      const currentYear = new Date().getFullYear();
      const isCurrentYear = now.getFullYear() === currentYear;
      const monthYear = now.toLocaleDateString('en-US', {
        month: 'long',
        ...(isCurrentYear ? {} : { year: 'numeric' })
      });
      periodLabel = `${monthYear} Week`;
    }

    return { periodStart, periodEnd, periodLabel };
  };

  // Helper function to calculate previous period dates
  const calculatePreviousPeriodDates = (viewMode: 'monthly' | 'weekly', now: Date, periodStart: Date, periodEnd: Date) => {
    let prevPeriodStart: Date;
    let prevPeriodEnd: Date;

    if (viewMode === 'monthly') {
      prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      prevPeriodStart = new Date(periodStart);
      prevPeriodStart.setDate(periodStart.getDate() - 7);
      prevPeriodEnd = new Date(periodEnd);
      prevPeriodEnd.setDate(periodEnd.getDate() - 7);
    }

    return { prevPeriodStart, prevPeriodEnd };
  };


  // Chart type state for interactive chart controls - only supporting line and bar for now


  // Executive summary view mode
  const [execViewMode, setExecViewMode] = useState<'monthly' | 'weekly'>('monthly');
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Day data modal state
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<{
    date: Date;
    dayData: Array<{
      date: string;
      analysisId: string;
      analysisName: string;
      data: {
        consignments: number;
        expectedTotal: number;
        paidAmount: number;
        difference: number;
        status: string;
      };
    }>;
  } | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [analyses, setAnalyses] = useState<AnalysisWithDetails[]>([]);

  const loadDashboardData = useCallback(async () => {
    // Don't load data if auth is still loading or user is not available
    if (authLoading || !user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);

      // Get analytics data
      const analyticsResult = await analyticsService.getAnalyticsData({
        userId: user.id,
        period: selectedPeriod
      });

      if (!analyticsResult.isSuccess) {
        throw new Error(analyticsResult.error.message);
      }

      // Get all analyses with details in a single optimized query
      const { data: analyses, error: analysesError } = await analysisRepository.getUserAnalyses(user.id, {
        limit: 1000,
        orderBy: 'created_at',
        order: 'desc'
      });

      if (analysesError) {
        console.warn('Failed to load recent analyses:', analysesError);
        // Continue with empty array rather than failing completely
      }

      // Store analyses in state for chart generation
      setAnalyses(analyses || []);
      // Only generate forecast if user has actual data
      const hasAnalyses = (analyses || []).length > 0;
      let forecastValue = null;
      
      if (hasAnalyses) {
        // Get forecast for users with existing data
        try {
          const forecastResult = await analyticsService.forecastEarnings(user.id, 30);
          forecastValue = forecastResult.forecast;
        } catch (error) {
          console.warn('Failed to generate forecast:', error);
        }
      }

      // Calculate executive summary data using the analyses we already loaded
      const localAnalyses = AnalysisStorageService.loadAnalyses();
      
      // Calculate metrics based on current view mode and selected calendar month
      const { periodStart, periodEnd, periodLabel } = calculatePeriodDates(execViewMode, currentMonth);

      // Calculate current period metrics
      let totalRevenue = 0;
      let totalDeliveries = 0;
      let totalExpected = 0;
      let totalPaid = 0;
      let daysWithData = 0;

      // Process database analyses
      analyses.forEach(analysis => {
        if (analysis.daily_entries) {
          analysis.daily_entries.forEach((entry: DailyEntryData) => {
            const entryDate = new Date(entry.date);
            if (entryDate >= periodStart && entryDate <= periodEnd) {
              totalRevenue += entry.paid_amount || 0;
              totalDeliveries += entry.consignments || 0;
              totalExpected += entry.expected_total || 0;
              totalPaid += entry.paid_amount || 0;
              if (entry.consignments > 0) daysWithData++;
            }
          });
        }
      });

      // Process localStorage analyses
      if (localAnalyses && Object.keys(localAnalyses).length > 0) {
        Object.values(localAnalyses).forEach((analysis: unknown) => {
          const typedAnalysis = analysis as { dailyData?: Record<string, unknown> };
          if (typedAnalysis.dailyData) {
            Object.entries(typedAnalysis.dailyData).forEach(([dateStr, dayData]: [string, unknown]) => {
              const typedDayData = dayData as { paidAmount?: number; consignments?: number; expectedTotal?: number };
              const entryDate = new Date(dateStr);
              if (entryDate >= periodStart && entryDate <= periodEnd) {
                totalRevenue += typedDayData.paidAmount || 0;
                totalDeliveries += typedDayData.consignments || 0;
                totalExpected += typedDayData.expectedTotal || 0;
                totalPaid += typedDayData.paidAmount || 0;
                if ((typedDayData.consignments || 0) > 0) daysWithData++;
              }
            });
          }
        });
      }

      // Calculate previous period for comparison
      const { prevPeriodStart, prevPeriodEnd } = calculatePreviousPeriodDates(execViewMode, currentMonth, periodStart, periodEnd);

      // Calculate previous period metrics
      let prevRevenue = 0;
      let prevDeliveries = 0;

      analyses.forEach(analysis => {
        if (analysis.daily_entries) {
          analysis.daily_entries.forEach((entry: DailyEntryData) => {
            const entryDate = new Date(entry.date);
            if (entryDate >= prevPeriodStart && entryDate <= prevPeriodEnd) {
              prevRevenue += entry.paid_amount || 0;
              prevDeliveries += entry.consignments || 0;
            }
          });
        }
      });

      // Calculate changes
      const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;
      const deliveriesChange = prevDeliveries > 0 ? ((totalDeliveries - prevDeliveries) / prevDeliveries * 100) : 0;

      // Calculate other metrics
      const avgDaily = daysWithData > 0 ? totalRevenue / daysWithData : 0;
      const performance = totalExpected > 0 ? (totalPaid / totalExpected * 100) : 0;

      setData({
        kpis: analyticsResult.data.kpis,
        revenueData: analyticsResult.data.revenueChart || [],
        recentAnalyses: analyses || [],
        forecast: forecastValue ?? undefined,
        totalRevenue,
        avgDaily,
        deliveries: totalDeliveries,
        performance,
        revenueChange,
        deliveriesChange,
        periodLabel
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, user, authLoading, execViewMode, currentMonth]);

  // Call loadDashboardData when dependencies change
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Generate weekly chart data from analyses
  const generateWeeklyChartData = (analyses: AnalysisWithDetails[], currentMonth: Date) => {
    // Get the month's weeks
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);

    // Calculate weeks in the month
    const weeks = [];
    let weekStart = new Date(firstDay);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Start from Monday

    for (let weekNum = 1; weekNum <= 4; weekNum++) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      let weekExpected = 0;
      let weekActual = 0;

      // Aggregate data for this week
      analyses.forEach(analysis => {
        if (analysis.daily_entries) {
          analysis.daily_entries.forEach((entry: any) => {
            // Handle both string and Date formats, and avoid timezone issues
            const entryDate = new Date(entry.date + 'T00:00:00');

            // Use date comparison without time components
            const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
            const weekStartOnly = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
            const weekEndOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());

            if (entryDateOnly >= weekStartOnly && entryDateOnly <= weekEndOnly) {
              weekExpected += entry.expected_total || 0;
              weekActual += entry.paid_amount || 0;
            }
          });
        }
      });

      weeks.push({
        label: `W${weekNum}`,
        expected: weekExpected,
        actual: weekActual
      });

      weekStart.setDate(weekStart.getDate() + 7);
    }

    return weeks;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowManualEntry(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
    // Provide user feedback that data is being updated
    setLoading(true);
    // Data will automatically reload due to dependency on currentMonth
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add empty cells for days before month starts
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const formatCalendarDate = (date: Date | null) => {
    if (!date) return '';
    return date.getDate().toString();
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  // Calendar event handlers - separate methods for better code organization
  const handleDayWithData = (date: Date) => {
    // Load data for this specific day
    loadDayData(date);
  };

  const handleDayWithoutData = (date: Date) => {
    // Show no data, prepare for manual entry
    handleDateSelect(date);
  };

  const handleCalendarAddData = (date: Date) => {
    // Navigate to analysis page with pre-filled date
    router.push(`/analysis?date=${formatDateKey(date)}`);
  };





  // Helper to search in-memory database data for day entry
  const searchInMemoryDatabaseData = (dateKey: string) => {
    for (const analysis of data.recentAnalyses) {
      if (!analysis.daily_entries) continue;

      const dayEntry = analysis.daily_entries.find(entry => {
        const entryDate = new Date(entry.date);
        return formatDateKey(entryDate) === dateKey && (entry.consignments || 0) > 0;
      });

      if (dayEntry) {
        return {
          analysisId: analysis.id,
          analysisName: analysis.period_start
            ? `Week of ${new Date(analysis.period_start).toLocaleDateString()}`
            : `Analysis ${analysis.id}`,
          data: {
            consignments: dayEntry.consignments || 0,
            expectedTotal: dayEntry.expected_total || 0,
            paidAmount: dayEntry.paid_amount || 0,
            difference: (dayEntry.paid_amount || 0) - (dayEntry.expected_total || 0),
            status: 'complete'
          }
        };
      }
    }
    return null;
  };

  // Helper to search localStorage data for day entry
  const searchLocalStorageData = (dateKey: string) => {
    const localAnalyses = AnalysisStorageService.loadAnalyses();
    if (!localAnalyses || Object.keys(localAnalyses).length === 0) return null;

    for (const [id, analysis] of Object.entries(localAnalyses)) {
      const typedAnalysis = analysis as Record<string, unknown>;
      if (!typedAnalysis.dailyData || typeof typedAnalysis.dailyData !== 'object') continue;

      const dailyData = typedAnalysis.dailyData as Record<string, Record<string, unknown>>;
      const dayEntry = dailyData[dateKey];

      if (dayEntry && typeof dayEntry === 'object' && (dayEntry.consignments as number) > 0) {
        return {
          analysisId: id,
          analysisName: typedAnalysis.period as string || `Analysis ${id}`,
          data: {
            consignments: (dayEntry.consignments as number) || 0,
            expectedTotal: (dayEntry.expectedTotal as number) || 0,
            paidAmount: (dayEntry.paidAmount as number) || 0,
            difference: ((dayEntry.paidAmount as number) || 0) - ((dayEntry.expectedTotal as number) || 0),
            status: (dayEntry.status as string) || 'complete'
          }
        };
      }
    }
    return null;
  };

  const loadDayData = (date: Date) => {
    try {
      const dateKey = formatDateKey(date);

      // First try in-memory database data (no DB calls), then localStorage fallback
      const bestMatch = searchInMemoryDatabaseData(dateKey) || searchLocalStorageData(dateKey);

      if (bestMatch) {
        setSelectedDayData({
          date,
          dayData: [{
            date: dateKey,
            analysisId: bestMatch.analysisId,
            analysisName: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
            data: bestMatch.data
          }]
        });
        setDayModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading day data:', error);
    }
  };

  const handleEditDayData = (analysisId: string, date: string) => {
    // Navigate to reports page for this analysis
    router.push(`/reports?analysis=${analysisId}&day=${date}`);
    setDayModalOpen(false);
  };
  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="space-y-6 animate-pulse" style={{ isolation: 'isolate', contain: 'layout' }}>
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={`auth-skeleton-${i}`} className="h-20 md:h-32 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-200 rounded-lg"></div>
      </div>
    );
  }

  // Show loading while loading data (only after auth is confirmed)
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" style={{ isolation: 'isolate', contain: 'layout' }}>
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={`loading-skeleton-${i}`} className="h-20 md:h-32 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-200 rounded-lg"></div>
      </div>
    );
  }

  // Check if user has any data
  const hasAnalysisData = data.recentAnalyses.length > 0;
  
  const showWelcomeScreen = () => {
    return isAuthenticated && !hasAnalysisData;
  };

  const showDashboardContent = () => {
    return isAuthenticated && hasAnalysisData;
  };

  // Helper function to render enhanced onboarding when no data
  const renderWelcomeScreen = () => (
    <div className="onboarding-container">
      {/* Welcome Hero Section */}
      <div className="welcome-hero">
        <h1 className="welcome-title">Welcome to Payment Analyzer!</h1>
        <p className="welcome-subtitle">Your intelligent companion for tracking delivery payments and financial insights</p>
      </div>
      
      {/* Call to Action */}
      <div className="cta-section">
        <div className="cta-buttons">
          <button 
            className="primary-cta-btn" 
            onClick={() => router.push('/analysis')}
          >
            <span className="btn-icon">
              <TrendingUp className="w-5 h-5" />
            </span>
            <span>Upload & Analyze</span>
          </button>
          <button 
            className="secondary-cta-btn"
            onClick={() => router.push('/analysis')}
          >
            <span className="btn-icon">
              <Plus className="w-5 h-5" />
            </span>
            <span>Manual Entry</span>
          </button>
        </div>
        <p className="cta-subtitle">Ready to go? Upload your documents or enter data to start analysis.</p>
      </div>

      {/* Enhanced Onboarding Styles */}
      <style>{`
        .onboarding-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;   
          text-align: center;
          animation: fadeInUp 0.8s ease-out;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .welcome-hero {
          margin-top: 120px;
          margin-bottom: 60px;
        }
        
        .welcome-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #0f172a 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: slideInFromTop 0.8s ease-out;
        }
        
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .welcome-subtitle {
          font-size: 1.125rem;
          color: #64748b;
          line-height: 1.5;
        }
        
        .cta-section {
          margin-bottom: 50px;
        }
        
        .cta-buttons {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 16px;
        }
        
        .primary-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 32px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        
        .primary-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }
        
        .secondary-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 32px;
          background: white;
          color: #3b82f6;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .secondary-cta-btn:hover {
          background: #3b82f6;
          color: white;
          transform: translateY(-2px);
        }
        
        .btn-icon {
          display: flex;
          align-items: center;
        }
        
        .cta-subtitle {
          font-size: 0.875rem;
          color: #64748b;
        }
        
        @media (max-width: 640px) {
          .onboarding-container {
            padding: 20px 16px;
          }
          
          .welcome-title {
            font-size: 2rem;
          }
          
          .welcome-subtitle {
            font-size: 1rem;
          }
          
          .cta-buttons {
            flex-direction: column;
            align-items: center;
          }
          
          .primary-cta-btn,
          .secondary-cta-btn {
            width: 100%;
            max-width: 280px;
          }
        }
      `}</style>
    </div>
  );

  // Helper function to render executive summary view
  const renderExecutiveSummary = () => (
    <div className="executive-summary">
      <div className="summary-header">
        <div className="summary-title">
          Executive Summary
        </div>
        <div className="summary-period">
          {data.periodLabel}
        </div>
      </div>
      <div className="summary-stats">
        <div className="summary-stat">
          <div className="summary-stat-label">Total Revenue</div>
          <div className="summary-stat-value">£{data.totalRevenue.toFixed(2)}</div>
          <div className={`summary-stat-change ${data.revenueChange >= 0 ? 'positive' : 'negative'}`}>
            {data.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(data.revenueChange).toFixed(0)}%
          </div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-label">Avg Daily</div>
          <div className="summary-stat-value">£{data.avgDaily.toFixed(2)}</div>
          <div className="summary-stat-change">→ 0%</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-label">Deliveries</div>
          <div className="summary-stat-value">{data.deliveries}</div>
          <div className={`summary-stat-change ${data.deliveriesChange >= 0 ? 'positive' : 'negative'}`}>
            {data.deliveriesChange >= 0 ? '↑' : '↓'} {Math.abs(data.deliveriesChange).toFixed(0)}%
          </div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-label">Performance</div>
          <div className="summary-stat-value">{data.performance.toFixed(0)}%</div>
          <div className="summary-stat-change">
            → {getPerformanceLabel(data.performance)}
          </div>
        </div>
      </div>
    </div>
  );

  // Extract calendar widget to reduce complexity
  const renderCalendarWidget = () => (
    <div className="calendar-widget">
      <div className="calendar-header">
        <div className="calendar-title">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <div className="calendar-nav">
          <button
            className="calendar-nav-btn"
            onClick={() => navigateMonth('prev')}
          >
            ‹
          </button>
          <button
            className="calendar-nav-btn"
            onClick={() => navigateMonth('next')}
          >
            ›
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {/* Weekday headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}

        {/* Calendar days */}
        {getDaysInMonth().map((date, index) => {
          if (!date) {
            return <div key={`empty-${currentMonth.getMonth()}-${index}`} className="calendar-day disabled" />;
          }

          const paymentInfo = getPaymentInfoForDate(date);
          const hasData = paymentInfo.hasData;
          const isSelectedDate = selectedDate?.toDateString() === date.toDateString();
          const isTodayDate = isToday(date);
          const isFuture = date > new Date();

          return (
            <button
              key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
              onClick={() => {
                if (!isFuture) {
                  if (hasData) {
                    handleDayWithData(date);
                  } else {
                    handleDayWithoutData(date);
                  }
                }
              }}
              disabled={isFuture}
              className={`calendar-day ${
                isTodayDate ? 'today' : ''
              } ${
                hasData ? 'has-data' : 'no-data'
              } ${
                isSelectedDate ? 'selected' : ''
              } ${
                isFuture ? 'future' : 'clickable'
              } ${
                paymentInfo.statuses.length > 0 ? `status-${paymentInfo.statuses[0]}` : ''
              }`}
              aria-label={`${formatCalendarDate(date)} ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}${hasData ? ' - has data' : ''}`}
            >
              {formatCalendarDate(date)}

              {/* Payment Status Indicators - Multiple dots side by side */}
              {paymentInfo.statuses.length > 0 && (
                <div className="status-indicators-container">
                  {paymentInfo.statuses.map((status, index) => (
                    <div
                      key={`${formatDateKey(date)}-${status}-${index}`}
                      className={`status-indicator status-${status}`}
                      title={getStatusTooltip(status, paymentInfo)}
                    />
                  ))}
                </div>
              )}

              {!hasData && !isFuture && <div className="add-indicator">+</div>}
            </button>
          );
        })}
      </div>
    </div>
  );

  // View toggle 
  const renderViewToggle = () => (
    <div className="flex justify-center">
      <div className="bg-white rounded-xl p-1 flex gap-1 shadow-sm border border-slate-100 w-full max-w-md">
        <button
          onClick={() => setExecViewMode('monthly')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
            execViewMode === 'monthly'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'text-slate-600 hover:text-slate-900 bg-transparent'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Monthly</span>
        </button>
        <button
          onClick={() => setExecViewMode('weekly')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
            execViewMode === 'weekly'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'text-slate-600 hover:text-slate-900 bg-transparent'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Weekly</span>
        </button>
      </div>
    </div>
  );

  const renderMainDashboard = () => {
    // Show welcome screen when user has no analysis data
    if (showWelcomeScreen()) {
      return renderWelcomeScreen();
    }

    // Show executive summary and full dashboard when user has analysis data
    if (showDashboardContent()) {
      return (
        <div className="dashboard-content">
          {/* View Toggle */}
          {renderViewToggle()}

          {/* Executive Summary */}
          {renderExecutiveSummary()}

            {/* Calendar Widget */}
            {renderCalendarWidget()}

            {/* KPI Grid - Legacy Layout: Expected|Received top, Pending|Efficiency bottom */}
            <div className="kpi-grid">
              {/* Top Row - Expected (left) */}
              <div className="kpi-card success">
                <div className="kpi-header">
                  <div className="kpi-label">Expected</div>
                  <div className="kpi-icon">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="kpi-value">£{data.totalRevenue.toFixed(2)}</div>
                <div className="kpi-trend">
                  <span className={data.revenueChange >= 0 ? 'trend-up' : 'trend-down'}>
                    {data.revenueChange >= 0 ? '↑' : '↓'}
                  </span>
                  <span>{Math.abs(data.revenueChange).toFixed(0)}% vs last</span>
                </div>
              </div>

              {/* Top Row - Received (right) */}
              <div className="kpi-card info">
                <div className="kpi-header">
                  <div className="kpi-label">Received</div>
                  <div className="kpi-icon">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="kpi-value">£{data.totalRevenue.toFixed(2)}</div>
                <div className="kpi-trend">
                  <span className="trend-neutral">→</span>
                  <span>0% vs last</span>
                </div>
              </div>

              {/* Bottom Row - Pending (left) */}
              <div className="kpi-card warning">
                <div className="kpi-header">
                  <div className="kpi-label">Pending</div>
                  <div className="kpi-icon">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>
                <div className="kpi-value">{data.deliveries}</div>
                <div className="kpi-trend">
                  <span className={data.deliveriesChange >= 0 ? 'trend-up' : 'trend-down'}>
                    {data.deliveriesChange >= 0 ? '↑' : '↓'}
                  </span>
                  <span>{Math.abs(data.deliveriesChange).toFixed(0)}% deliveries</span>
                </div>
              </div>

              {/* Bottom Row - Efficiency (right) */}
              <div className="kpi-card primary">
                <div className="kpi-header">
                  <div className="kpi-label">Efficiency</div>
                  <div className="kpi-icon">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>
                <div className="kpi-value">{Math.min(100, data.performance).toFixed(0)}%</div>
                <div className="kpi-trend">
                  <span className="trend-up">↑</span>
                  <span>{getPerformanceLabel(data.performance)}</span>
                </div>
              </div>
            </div>

            {/* Revenue Trend - Legacy Style Simple Chart */}
            <div className="chart-container">
              <div className="chart-header">
                <div className="chart-title">Revenue Trend</div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-dot" style={{background: '#3b82f6'}}></div>
                    <span>Expected</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot" style={{background: '#10b981'}}></div>
                    <span>Actual</span>
                  </div>
                </div>
              </div>
              <div className="legacy-bar-chart">
                {/* Dynamic bar chart matching legacy design */}
                <div className="chart-bars">
                  {(() => {
                    const weeklyData = generateWeeklyChartData(analyses, currentMonth);
                    const maxValue = Math.max(...weeklyData.map(w => Math.max(w.expected, w.actual)), 1);

                    return weeklyData.map((week) => {
                      const expectedHeight = Math.max(8, (week.expected / maxValue) * 85);
                      const actualHeight = Math.max(8, (week.actual / maxValue) * 85);

                      return (
                      <div key={week.label} className="chart-week">
                        <div className="bars-wrapper">
                          <div
                            className="bar bar-expected"
                            style={{
                              height: `${expectedHeight}px`,
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                            }}
                          >
                            {week.expected > 0 && <div className="bar-value">£{Math.round(week.expected)}</div>}
                          </div>
                          <div
                            className="bar bar-actual"
                            style={{
                              height: `${actualHeight}px`,
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            }}
                          >
                            {week.actual > 0 && <div className="bar-value">£{Math.round(week.actual)}</div>}
                          </div>
                        </div>
                        <div className="week-label">{week.label}</div>
                      </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Forecast Card */}
            <div className="forecast-card">
              <div className="forecast-header">
                <div className="forecast-title">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', marginRight: '8px'}}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M7 13v4M11 10v7M15 7v10"/>
                  </svg>
                  Forecast
                </div>
                <div className="forecast-badge">AI Predicted</div>
              </div>
              <div className="forecast-items">
                <div className="forecast-item">
                  <div className="forecast-label">Next Week Expected</div>
                  <div className="forecast-value">£{(data.totalRevenue * 1.1).toFixed(2)}</div>
                </div>
                <div className="forecast-item">
                  <div className="forecast-label">Month End Projection</div>
                  <div className="forecast-value">£{(data.totalRevenue * 4.2).toFixed(2)}</div>
                </div>
                <div className="forecast-item">
                  <div className="forecast-label">Suggested Daily Target</div>
                  <div className="forecast-value">£{(data.avgDaily * 1.05).toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <button
                className="action-btn"
                onClick={() => router.push('/analysis')}
              >
                <span>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M7 13v4M11 10v7M15 7v10"/>
                  </svg>
                </span>
                <span>Upload & Analyze</span>
              </button>
              <button
                className="action-btn secondary"
                onClick={() => router.push('/reports')}
              >
                <span>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </span>
                <span>View All Reports</span>
              </button>
            </div>

            {/* Dashboard Component Styles */}
            <style>{`
              .dashboard-content {
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 20px;
              }

              .executive-summary {
                background: linear-gradient(135deg, #1e3a8a 0%, #6d28d9 100%);
                color: white;
                padding: 20px;
                border-radius: 16px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                position: relative;
                overflow: hidden;
              }

              .executive-summary::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
                pointer-events: none;
              }

              .summary-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                position: relative;
                z-index: 1;
              }

              .summary-title {
                font-size: 18px;
                font-weight: 700;
              }

              .summary-period {
                font-size: 12px;
                opacity: 0.9;
                background: rgba(255, 255, 255, 0.2);
                padding: 4px 12px;
                border-radius: 20px;
              }

              .summary-stats {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                position: relative;
                z-index: 1;
              }

              .summary-stat {
                background: rgba(255, 255, 255, 0.1);
                padding: 12px;
                border-radius: 8px;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
              }

              .summary-stat-label {
                font-size: 11px;
                opacity: 0.8;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
              }

              .summary-stat-value {
                font-size: 20px;
                font-weight: 800;
              }

              .summary-stat-change {
                font-size: 11px;
                margin-top: 2px;
                opacity: 0.9;
              }

              .summary-stat-change.positive {
                color: #4ade80;
              }

              .summary-stat-change.negative {
                color: #f87171;
              }

              @media (min-width: 768px) {
                .summary-stats {
                  grid-template-columns: repeat(4, 1fr);
                }
              }

              .calendar-widget {
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
              }

              .calendar-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
              }

              .calendar-title {
                font-size: 1.125rem;
                font-weight: 600;
                color: #1f2937;
              }

              .calendar-nav {
                display: flex;
                gap: 8px;
              }

              .calendar-nav-btn {
                width: 32px;
                height: 32px;
                border: 1px solid #e5e7eb;
                background: white;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 1.25rem;
                color: #6b7280;
              }

              .calendar-nav-btn:hover:not(:disabled) {
                background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                color: white;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
              }

              .calendar-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 4px;
              }

              .calendar-day-header {
                font-size: 10px;
                font-weight: 600;
                color: #64748b;
                text-align: center;
                padding: 4px;
              }

              .calendar-day {
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                border-radius: 6px;
                position: relative;
                cursor: pointer;
                transition: all 0.2s;
                color: #374151;
                border: none;
                background: transparent;
                padding: 0;
                font-family: inherit;
              }

              .calendar-day:disabled {
                cursor: not-allowed;
                opacity: 0.6;
              }

              .calendar-day.has-data {
                background: #f8fafc;
                font-weight: 600;
              }\n\n              .calendar-day.today {
                background: #3b82f6;
                color: white;
              }

              .calendar-day.selected {
                background: #1d4ed8;
                color: white;
                font-weight: 700;
                box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
              }

              .calendar-day.clickable:hover {
                background: #3b82f6;
                color: white;
                transform: scale(1.05);
              }

              .calendar-day.disabled {
                color: #e2e8f0;
                cursor: not-allowed;
                visibility: hidden;
              }

              .calendar-day.future {
                background: #f8fafc;
                color: #cbd5e1;
                cursor: not-allowed;
                opacity: 0.6;
              }

              .calendar-day.no-data {
                position: relative;
                cursor: pointer;
              }

              .calendar-day.no-data:hover {
                background: #f1f5f9;
                transform: scale(1.05);
              }

              .add-indicator {
                position: absolute;
                top: 2px;
                right: 2px;
                width: 12px;
                height: 12px;
                background: #3b82f6;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                opacity: 0;
                transition: opacity 0.2s;
              }

              .calendar-day.no-data:hover .add-indicator {
                opacity: 1;
              }

              /* Status Indicators Container - Centered */
              .status-indicators-container {
                position: absolute;
                bottom: 5px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 4px;
                align-items: center;
                justify-content: center;
              }

              /* Individual Status Indicators */
              .status-indicator {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                border: 1px solid white;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                flex-shrink: 0;
                display: inline-block;
                vertical-align: middle;
              }

              .status-indicator.status-pending {
                background: #3b82f6;
              }

              .status-indicator.status-received {
                background: #10b981;
              }

              .status-indicator.status-shortfall {
                background: #dc2626;
                border: 1px solid #ffffff;
              }

              /* Enhanced day styling - light gray for all data days */
              .calendar-day.status-pending,
              .calendar-day.status-received,
              .calendar-day.status-shortfall {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
              }

              
              .kpi-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 24px;
              }
              
              .kpi-card {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                padding: 16px;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                position: relative;
                overflow: hidden;
              }
              
              .kpi-card::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                width: 4px;
                height: 100%;
                background: #e2e8f0;
                transition: all 0.3s ease;
              }
              
              .kpi-card.success::before {
                background: #22c55e;
              }
              
              .kpi-card.warning::before {
                background: #f59e0b;
              }
              
              .kpi-card.info::before {
                background: #3b82f6;
              }
              
              .kpi-card.primary::before {
                background: #8b5cf6;
              }
              
              .kpi-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
              }
              
              .kpi-label {
                font-size: 0.875rem;
                color: #6b7280;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.025em;
              }
              
              .kpi-icon {
                color: #9ca3af;
              }
              
              .kpi-value {
                font-size: 1.5rem;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 4px;
                font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
              }
              
              .kpi-trend {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 0.75rem;
                color: #6b7280;
              }
              
              .trend-up {
                color: #22c55e;
              }
              
              .trend-down {
                color: #ef4444;
              }
              
              .trend-neutral {
                color: #6b7280;
              }
              
              .chart-container {
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                margin-bottom: 8px;
              }
              
              .chart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
              }
              
              .chart-title {
                font-size: 1.125rem;
                font-weight: 600;
                color: #1f2937;
              }
              
              .chart-legend {
                display: flex;
                gap: 16px;
              }
              
              .legend-item {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.875rem;
                color: #6b7280;
              }
              
              .legend-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
              }
              
              .bar-chart {
                min-height: 200px;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              /* Legacy Bar Chart Styles */
              .legacy-bar-chart {
                min-height: 150px;
                display: flex;
                align-items: flex-end;
                position: relative;
              }

              .chart-bars {
                display: flex;
                align-items: flex-end;
                gap: 8px;
                width: 100%;
                height: 120px;
                padding: 0 4px;
              }

              .chart-week {
                display: flex;
                flex-direction: column;
                align-items: center;
                flex: 1;
              }

              .bars-wrapper {
                display: flex;
                align-items: flex-end;
                justify-content: center;
                height: 100px;
                width: 100%;
                padding: 0 4px;
                margin-bottom: 8px;
              }

              .bar {
                border-radius: 6px 6px 0 0;
                min-height: 8px;
                transition: all 0.3s ease;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
                position: relative;
              }

              .bar-expected {
                width: 45%;
                margin-right: 4px;
              }

              .bar-actual {
                width: 45%;
              }

              .bar-value {
                position: absolute;
                top: -18px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 10px;
                font-weight: 600;
                white-space: nowrap;
                pointer-events: none;
                background: rgba(255, 255, 255, 0.9);
                padding: 1px 4px;
                border-radius: 3px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              }
              .bar-expected .bar-value {
                color: #3b82f6;
              }
              .bar-actual .bar-value {
                color: #10b981;
              }

              .bar:hover {
                opacity: 0.8;
              }

              .week-label {
                font-size: 0.75rem;
                color: #6b7280;
                font-weight: 500;
              }

              .chart-y-axis {
                position: absolute;
                left: 0;
                top: 20px;
                height: 100px;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
              }

              .y-label {
                font-size: 0.75rem;
                color: #6b7280;
                font-weight: 500;
              }

              .chart-loading {
                color: #6b7280;
                font-size: 0.875rem;
              }
              
              .forecast-card {
                background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                padding: 16px;
              }

              .forecast-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
              }

              .forecast-title {
                font-size: 14px;
                font-weight: 700;
                color: #3b82f6;
              }

              .forecast-badge {
                background: #3b82f6;
                color: white;
                font-size: 10px;
                padding: 2px 8px;
                border-radius: 10px;
                font-weight: 600;
              }

              .forecast-items {
                display: flex;
                flex-direction: column;
                gap: 6px;
              }

              .forecast-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 8px;
                background: white;
                border-radius: 4px;
                border: 1px solid #e2e8f0;
              }

              .forecast-label {
                font-size: 0.75rem;
                color: #64748b;
              }
              
              .forecast-value {
                font-size: 1rem;
                font-weight: 600;
                color: #1f2937;
                font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
              }
              
              .quick-actions {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
              }

              .action-btn {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
                color: white;
                border: none;
                border-radius: 12px;
                padding: 12px 16px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                gap: 8px;
              }

              .action-btn:active {
                transform: translateY(2px);
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
              }

              .action-btn.secondary {
                background: white;
                color: #3b82f6;
                border: 2px solid #cbd5e1;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
              }
              
              .btn-icon {
                display: flex;
                align-items: center;
              }

              @media (min-width: 768px) {
                .kpi-grid {
                  grid-template-columns: repeat(2, 1fr);
                }

                .forecast-items {
                  grid-template-columns: repeat(3, 1fr);
                }
              }

              @media (min-width: 1024px) {
                .kpi-grid {
                  grid-template-columns: repeat(4, 1fr);
                }
              }
            `}</style>

          {/* Enhanced Manual Entry Modal */}
          {showManualEntry && selectedDate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Add Analysis Data</h3>
                  <button
                    onClick={() => setShowManualEntry(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Selected Date: <strong>{selectedDate.toLocaleDateString()}</strong>
                  </p>
                </div>
                
                <p className="text-slate-600 mb-6">
                  Ready to add analysis data for this date? You&apos;ll be taken to the analysis page where you can upload documents or enter data manually.
                </p>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      handleCalendarAddData(selectedDate);
                      setShowManualEntry(false);
                    }}
                    className="flex-1 gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Go to Analysis
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowManualEntry(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Clean Day Data Modal */}
          {dayModalOpen && selectedDayData && selectedDayData.dayData.length > 0 && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl">

                {/* Header */}
                <div className="relative p-6 pb-4 text-center border-b border-slate-100">
                  <button
                    onClick={() => setDayModalOpen(false)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedDayData.dayData[0].analysisName}
                  </h3>

                  <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {selectedDayData.dayData[0].data.status}
                  </div>
                </div>

                {/* Data Display */}
                <div className="p-6 space-y-6">

                  {/* Main Metrics */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-slate-500">Consignments</div>
                          <div className="text-xl font-bold text-slate-900">{selectedDayData.dayData[0].data.consignments}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-blue-50 rounded-xl text-center">
                        <div className="text-sm text-blue-600 mb-1">Expected</div>
                        <div className="text-lg font-bold text-blue-700">
                          £{selectedDayData.dayData[0].data.expectedTotal.toFixed(2)}
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 rounded-xl text-center">
                        <div className="text-sm text-green-600 mb-1">Received</div>
                        <div className="text-lg font-bold text-green-700">
                          £{selectedDayData.dayData[0].data.paidAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Difference Card */}
                    <div className={`p-4 rounded-xl text-center ${
                      selectedDayData.dayData[0].data.difference >= 0
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      <div className="text-sm mb-1">
                        {selectedDayData.dayData[0].data.difference >= 0 ? 'Surplus' : 'Shortfall'}
                      </div>
                      <div className="text-xl font-bold">
                        £{Math.abs(selectedDayData.dayData[0].data.difference).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                    onClick={() => handleEditDayData(selectedDayData.dayData[0].analysisId, selectedDayData.dayData[0].date)}
                  >
                    <FileText className="w-4 h-4" />
                    View Complete Analysis
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // Return main dashboard content or welcome screen based on user state
  return (
    <>
      {renderMainDashboard()}
      
    </>
  );
}

export default DashboardPage;




