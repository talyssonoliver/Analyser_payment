/**
 * Reports Page
 * Complete implementation matching original HTML functionality
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui';
import { ExportModal } from '@/components/export/export-modal';
import { ManualEntry } from '@/components/analysis/manual-entry';
import type { ManualEntryData } from '@/components/analysis/manual-entry';
import { analysisRepository } from '@/lib/repositories/analysis-repository';
import type { AnalysisWithDetails, DailyEntryRecord } from '@/lib/repositories/analysis-repository';
import type { AnalysisStatus } from '@/types/core';
import type { LocalStorageExportData } from '@/lib/services/export-service';
import { useAuth } from '@/lib/providers/auth-provider';
import { AnalysisStorageService } from '@/lib/services/analysis-storage-service';
import { weekNavigationService } from '@/lib/services/week-navigation-service';
import { Edit2 } from 'lucide-react';

interface DailyEntry {
  date: string;
  day: string;
  consignments: number;
  rate: number;
  basePay: number;
  pickups: number;
  pickupTotal: number;
  bonuses: {
    unloading: number;
    attendance: number;
    early: number;
  };
  expected: number;
  paid: number;
  difference: number;
  status: 'complete' | 'pending' | 'overpaid' | 'underpaid';
}


interface ReportTotals {
  consignments: number;
  basePay: number;
  pickups: number;
  bonuses: number;
  expected: number;
  paid: number;
  difference: number;
}

interface ReportData {
  period: string;
  reportType: string;
  generatedDate: string;
  totalDays: number;
  status: string;
  dailyEntries: DailyEntry[];
  totals: {
    consignments: number;
    basePay: number;
    pickups: number;
    bonuses: number;
    expected: number;
    paid: number;
    difference: number;
  };
  breakdown: {
    consignments: number;
    pickups: number;
    unloading: number;
    attendance: number;
    early: number;
    total: number;
  };
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<LocalStorageExportData | null>(null);
  const [isDailyReport, setIsDailyReport] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);
  const viewMode: 'week' | 'month' = 'week'; // Fixed to week view after header removed

  // Mapper function to convert database records to report format
  const mapDailyEntryRecordToReportFormat = useCallback((record: DailyEntryRecord): DailyEntry => {
    return {
      date: record.date,
      day: new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' }),
      consignments: record.consignments,
      rate: record.rate,
      basePay: record.base_payment,
      pickups: record.pickups,
      pickupTotal: record.pickup_total,
      bonuses: {
        unloading: record.unloading_bonus,
        attendance: record.attendance_bonus,
        early: record.early_bonus
      },
      expected: record.expected_total,
      paid: record.paid_amount,
      difference: record.difference,
      status: record.status as 'pending' | 'overpaid' | 'underpaid' | 'complete'
    };
  }, []);

  // Helper function to get week start date (Monday) - matches WeekNavigationService
  const getWeekStartDate = useCallback((year: number, weekNumber: number): Date => {
    const januaryFirst = new Date(year, 0, 1);
    const daysToFirstMonday = (8 - januaryFirst.getDay()) % 7;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
    return new Date(firstMonday.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
  }, []);

  // Helper function to get week end date (Sunday) - matches WeekNavigationService
  const getWeekEndDate = useCallback((year: number, weekNumber: number): Date => {
    const weekStart = getWeekStartDate(year, weekNumber);
    return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  }, [getWeekStartDate]);

  // Helper function to validate analysis ID format
  const validateAnalysisId = (analysisId: string): 'uuid' | 'session' | 'invalid' => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const sessionIdRegex = /^analysis-\d+$/;
    
    if (uuidRegex.test(analysisId)) return 'uuid';
    if (sessionIdRegex.test(analysisId)) return 'session';
    return 'invalid';
  };

  const transformLocalStorageAnalysis = (localAnalysis: unknown): AnalysisWithDetails | null => {
    if (!localAnalysis) return null;
    
    const typedAnalysis = localAnalysis as { 
      id?: string; 
      dailyData?: Record<string, unknown>;
      createdAt?: string;
      period?: string;
      title?: string;
      description?: string;
      totalConsignments?: number;
      totalAmount?: number;
      status?: string;
      summary?: {
        workingDays?: number;
        totalConsignments?: number;
        [key: string]: unknown;
      };
      totals?: {
        base_total?: number;
        pickup_total?: number;
        bonus_total?: number;
        expected_total?: number;
        paid_total?: number;
        difference_total?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    if (!typedAnalysis) return null;
  
    const dailyEntries = typedAnalysis.dailyData
      ? Object.entries(typedAnalysis.dailyData).map(([date, data]: [string, unknown]) => {
        const typedData = data as {
          consignments?: number;
          paidAmount?: number;
          expectedTotal?: number;
          unloadingBonus?: number;
          attendanceBonus?: number;
          earlyBonus?: number;
          rate?: number;
          basePayment?: number;
          pickups?: number;
          pickupTotal?: number;
          status?: string;
        };
        return {
          id: '', // Not available in local storage
          analysis_id: typedAnalysis.id || '',
          date,
          day_of_week: new Date(date).getDay(),
          consignments: typedData.consignments || 0,
          rate: typedData.rate || 0,
          base_payment: typedData.basePayment || 0,
          pickups: typedData.pickups || 0,
          pickup_total: typedData.pickupTotal || 0,
          unloading_bonus: typedData.unloadingBonus || 0,
          attendance_bonus: typedData.attendanceBonus || 0,
          early_bonus: typedData.earlyBonus || 0,
          expected_total: typedData.expectedTotal || 0,
          paid_amount: typedData.paidAmount || 0,
          difference: (typedData.paidAmount || 0) - (typedData.expectedTotal || 0),
          status: (typedData.status as 'balanced' | 'overpaid' | 'underpaid') || 'balanced',
          created_at: typedAnalysis.createdAt || new Date().toISOString(),
          updated_at: typedAnalysis.createdAt || new Date().toISOString(),
          user_id: '', // Not available
        };
      })
      : [];
  
    const periodParts = typedAnalysis.period?.split(' - ');
    const period_start = periodParts?.[0] ? new Date(periodParts[0]).toISOString() : new Date().toISOString();
    const period_end = periodParts?.[1] ? new Date(periodParts[1]).toISOString() : new Date().toISOString();
  
    return {
      id: typedAnalysis.id || '',
      user_id: '', // Not available
      fingerprint: '', // Not available
      source: 'manual' as const,
      status: (typedAnalysis.status as AnalysisStatus) || 'completed',
      period_start,
      period_end,
      rules_version: 1,
      working_days: typedAnalysis.summary?.workingDays || 0,
      total_consignments: typedAnalysis.summary?.totalConsignments || 0,
      metadata: {},
      created_at: typedAnalysis.createdAt || new Date().toISOString(),
      updated_at: typedAnalysis.createdAt || new Date().toISOString(),
      daily_entries: dailyEntries,
      analysis_totals: typedAnalysis.totals ? {
        id: '',
        analysis_id: typedAnalysis.id || '',
        base_total: typedAnalysis.totals.base_total || 0,
        pickup_total: typedAnalysis.totals.pickup_total || 0,
        bonus_total: typedAnalysis.totals.bonus_total || 0,
        expected_total: typedAnalysis.totals.expected_total || 0,
        paid_total: typedAnalysis.totals.paid_total || 0,
        difference_total: typedAnalysis.totals.difference_total || 0,
        created_at: typedAnalysis.createdAt || new Date().toISOString(),
      } : undefined,
    };
  };

  // Helper function to load analysis by session-based ID
  const loadAnalysisBySessionId = useCallback(async (userId: string, analysisId: string): Promise<AnalysisWithDetails | null> => {
    console.log('🔍 Reports Debug - Session-based ID detected, attempting to load from localStorage...');

    const localAnalysis = AnalysisStorageService.loadAnalysis(analysisId);

    if (localAnalysis) {
      console.log('🔍 Reports Debug - Found analysis in localStorage:', localAnalysis.id);
      return transformLocalStorageAnalysis(localAnalysis);
    }

    console.error('🔍 Reports Debug - No analysis found for session-based ID in localStorage.');
    return null;
  }, []);

  // Helper function to load analysis by UUID
  const loadAnalysisByUuid = async (userId: string, analysisId: string): Promise<AnalysisWithDetails | null> => {
    // First try direct ID lookup
    const { data, error } = await analysisRepository.getAnalysisById(analysisId);
    if (!error && data) {
      console.log('🔍 Reports Debug - Loaded specific analysis by ID:', data.id);
      return data;
    }

    // If not found, try fingerprint search as fallback
    console.log('🔍 Reports Debug - Analysis not found by ID, trying fingerprint search...');
    const fingerprintResult = await analysisRepository.findAnalysisByFingerprint(userId, analysisId);
    
    if (fingerprintResult.isSuccess && fingerprintResult.data) {
      console.log('🔍 Reports Debug - Found analysis by fingerprint, loading full details...');
      const { data: fullData, error: fullError } = await analysisRepository.getAnalysisById(fingerprintResult.data.id);
      
      if (!fullError && fullData) {
        console.log('🔍 Reports Debug - Successfully loaded analysis by fingerprint');
        return fullData;
      } else {
        console.log('🔍 Reports Debug - Error loading full analysis details:', fullError);
      }
    } else {
      console.log('🔍 Reports Debug - Analysis not found by ID or fingerprint');
    }
    
    return null;
  };

  // Helper function to load the latest analysis for a user
  const loadLatestAnalysis = async (userId: string): Promise<AnalysisWithDetails | null> => {
    const { data: analyses, error } = await analysisRepository.getUserAnalyses(userId, {
      limit: 1,
      orderBy: 'created_at',
      order: 'desc'
    });
    
    if (error) {
      console.error('🔍 Reports Debug - Error loading user analyses:', error);
      return null;
    }

    if (analyses && analyses.length > 0) {
      // Get the full analysis with details
      const { data, error: detailError } = await analysisRepository.getAnalysisById(analyses[0].id);
      if (detailError) {
        console.error('🔍 Reports Debug - Error loading analysis details:', detailError);
        return null;
      }
      console.log('🔍 Reports Debug - Loaded latest analysis:', !!data);
      return data;
    }
    
    return null;
  };

  // Helper function to filter daily entries based on filters
  const filterDailyEntries = useCallback((
    entries: DailyEntryRecord[],
    dayFilter?: string | null,
    weekFilter?: string | null,
    startDate?: string | null,
    endDate?: string | null
  ) => {
    let entriesToProcess = entries;

    if (dayFilter) {
      // Single day filter
      entriesToProcess = entriesToProcess.filter(entry => entry.date === dayFilter);
    } else if (weekFilter && startDate && endDate) {
      // Week filter using date range
      console.log('🔍 Reports Debug - Week filtering details:', {
        startDate,
        endDate,
        weekFilter,
        totalEntries: entriesToProcess.length,
        sampleEntries: entriesToProcess.slice(0, 3).map(e => ({ date: e.date, withinRange: e.date >= startDate && e.date <= endDate }))
      });

      entriesToProcess = entriesToProcess.filter(entry => {
        const entryDate = entry.date; // Should be in YYYY-MM-DD format
        // Ensure dates are in same format for comparison (YYYY-MM-DD)
        const entryDateStr = String(entryDate);
        const startDateStr = startDate;
        const endDateStr = endDate;

        const isInRange = entryDateStr >= startDateStr && entryDateStr <= endDateStr;
        console.log(`🔍 Entry ${entryDateStr}: ${isInRange ? 'INCLUDED' : 'EXCLUDED'} (${startDateStr} <= ${entryDateStr} <= ${endDateStr})`);
        return isInRange;
      });
    }

    console.log('🔍 Reports Debug - Filtering entries:', {
      originalCount: entries.length,
      filteredCount: entriesToProcess.length,
      dayFilter,
      weekFilter,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : null
    });

    return entriesToProcess;
  }, []);

  // Convert database analysis data to our report format
  const convertDatabaseAnalysisToReportData = useCallback((
    analysis: AnalysisWithDetails,
    dayFilter?: string | null,
    weekFilter?: string | null,
    startDate?: string | null,
    endDate?: string | null
  ): ReportData => {
    const dailyEntries: DailyEntry[] = [];
    const totals: ReportTotals = {
      consignments: 0,
      basePay: 0,
      pickups: 0,
      bonuses: 0,
      expected: 0,
      paid: 0,
      difference: 0
    };

    // Convert daily entries from database format
    if (analysis.daily_entries) {
      // Filter entries by day, week, or date range
      const entriesToProcess = filterDailyEntries(analysis.daily_entries || [], dayFilter, weekFilter, startDate, endDate);

      entriesToProcess.forEach((entry) => {
        const dailyEntry: DailyEntry = mapDailyEntryRecordToReportFormat(entry);

        dailyEntries.push(dailyEntry);

        // Update totals
        totals.consignments += entry.consignments;
        totals.basePay += entry.base_payment;
        totals.pickups += entry.pickup_total;
        totals.bonuses += entry.unloading_bonus + entry.attendance_bonus + entry.early_bonus;
        totals.expected += entry.expected_total;
        totals.paid += entry.paid_amount;
        totals.difference += entry.difference;
      });
    }

    // Use analysis_totals if available and not filtering, otherwise use calculated totals
    const analysisTotals = Array.isArray(analysis.analysis_totals)
      ? analysis.analysis_totals[0]
      : analysis.analysis_totals;

    if (!dayFilter && !weekFilter && analysisTotals && typeof analysisTotals === 'object') {
      // Use full analysis totals only when showing all days
      totals.expected = analysisTotals.expected_total || 0;
      totals.paid = analysisTotals.paid_total || 0;
      totals.difference = analysisTotals.difference_total || 0;
      totals.basePay = analysisTotals.base_total || 0;
      totals.pickups = analysisTotals.pickup_total || 0;
      totals.bonuses = analysisTotals.bonus_total || 0;
    }
    // When filtering by day or week, use the calculated totals from filtered entries

    // Ensure all totals are numbers (safety net)
    Object.keys(totals).forEach(key => {
      const typedKey = key as keyof ReportTotals;
      if (typeof totals[typedKey] !== 'number' || isNaN(totals[typedKey])) {
        totals[typedKey] = 0;
      }
    });

    // Determine report type and period display based on filtering
    let reportType = 'Financial Analysis Report';
    let periodDisplay = '';
    let reportTotalDays = dailyEntries.length;

    // Check if this is actually a single-day analysis
    const isSingleDayAnalysis = dailyEntries.length === 1;

    if (dayFilter || isSingleDayAnalysis) {
      reportType = 'Daily Report';
      // Use dayFilter if available, otherwise use the single entry's date
      const dateToDisplay = dayFilter || (dailyEntries[0]?.date);
      periodDisplay = dateToDisplay ? new Date(dateToDisplay).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : '';
      reportTotalDays = 1;
    } else if (weekFilter && startDate && endDate && dailyEntries.length > 1) {
      // Only show as Weekly Report if there's more than 1 day
      reportType = 'Weekly Report';
      periodDisplay = `${new Date(startDate).toLocaleDateString('en-GB')} - ${new Date(endDate).toLocaleDateString('en-GB')}`;
      reportTotalDays = dailyEntries.length;
    } else if (!isSingleDayAnalysis) {
      // Only show Financial Analysis Report for multi-day analyses
      reportType = 'Financial Analysis Report';
      periodDisplay = `${new Date(analysis.period_start).toLocaleDateString('en-GB')} - ${new Date(analysis.period_end).toLocaleDateString('en-GB')}`;
      reportTotalDays = analysis.working_days || dailyEntries.length;
    } else {
      // Fallback for single day analysis
      reportType = 'Daily Report';
      periodDisplay = dailyEntries[0]?.date ? new Date(dailyEntries[0].date).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : '';
      reportTotalDays = 1;
    }

    return {
      period: periodDisplay,
      reportType: reportType,
      generatedDate: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      totalDays: reportTotalDays,
      status: analysis.status === 'completed' ? 'Complete' : analysis.status,
      dailyEntries: [...dailyEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      totals,
      breakdown: {
        consignments: totals.basePay,
        pickups: totals.pickups,
        unloading: dailyEntries.reduce((sum, entry) => sum + entry.bonuses.unloading, 0),
        attendance: dailyEntries.reduce((sum, entry) => sum + entry.bonuses.attendance, 0),
        early: dailyEntries.reduce((sum, entry) => sum + entry.bonuses.early, 0),
        total: totals.expected
      }
    };
  }, [filterDailyEntries, mapDailyEntryRecordToReportFormat]);

  // Load report data from Supabase database
  useEffect(() => {
    const loadReportData = async () => {
      if (!user?.id) {
        console.log('🔍 Reports Debug - No authenticated user, skipping data load');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Reports Debug - Loading from database...');
        console.log('🔍 Reports Debug - User ID:', user.id);

        // Check if there's a specific analysis ID and filters in URL
        const urlParams = new URLSearchParams(window.location.search);
        const analysisId = urlParams.get('analysis');
        const dayFilter = urlParams.get('day');
        const weekFilter = urlParams.get('week');
        const startDate = urlParams.get('start');
        const endDate = urlParams.get('end');
        console.log('🔍 Reports Debug - Analysis ID requested:', analysisId);
        console.log('🔍 Reports Debug - Day filter requested:', dayFilter);
        console.log('🔍 Reports Debug - Week filter requested:', weekFilter);
        console.log('🔍 Reports Debug - Date range requested:', startDate, 'to', endDate);

        // Check for week navigation state (legacy State.getSelectedWeek() behavior)
        const selectedWeek = weekNavigationService.getSelectedWeek();
        const weekAnalysisId = weekNavigationService.getAnalysisId();
        console.log('🔍 Reports Debug - Selected week from navigation service:', selectedWeek);
        console.log('🔍 Reports Debug - Week analysis ID from navigation service:', weekAnalysisId);

        // Priority 1: URL parameters override navigation state
        // Priority 2: Week navigation state if no URL parameters
        let finalAnalysisId = analysisId;
        let finalWeekFilter = weekFilter;
        let finalStartDate = startDate;
        let finalEndDate = endDate;

        if (!analysisId && !weekFilter && selectedWeek && weekAnalysisId) {
          // Use week navigation state as fallback
          console.log('🔍 Reports Debug - Using week navigation state as fallback');
          finalAnalysisId = weekAnalysisId;
          finalWeekFilter = selectedWeek.week.toString();

          // Calculate date range from week info
          const weekStartDate = getWeekStartDate(selectedWeek.year, selectedWeek.week);
          const weekEndDate = getWeekEndDate(selectedWeek.year, selectedWeek.week);
          finalStartDate = weekStartDate.toISOString().split('T')[0];
          finalEndDate = weekEndDate.toISOString().split('T')[0];

          console.log('🔍 Reports Debug - Calculated week date range:', finalStartDate, 'to', finalEndDate);
        }

        let analysisData: AnalysisWithDetails | null = null;

        if (finalAnalysisId) {
          // Validate analysis ID format
          const idType = validateAnalysisId(finalAnalysisId);

          if (idType === 'invalid') {
            console.error('🔍 Reports Debug - Invalid analysis ID format:', finalAnalysisId);
            setReportData(null);
            setLoading(false);
            return;
          }

          // Load analysis based on ID type
          if (idType === 'session') {
            analysisData = await loadAnalysisBySessionId(user.id, finalAnalysisId);
          } else {
            analysisData = await loadAnalysisByUuid(user.id, finalAnalysisId);
          }

          if (!analysisData) {
            setReportData(null);
            setLoading(false);
            return;
          }
        } else {
          // No specific ID provided, load most recent analysis
          analysisData = await loadLatestAnalysis(user.id);
        }

        if (analysisData) {
          console.log('🔍 Reports Debug - Analysis data structure:', {
            id: analysisData.id,
            hasDaily: !!analysisData.daily_entries?.length,
            hasTotals: !!analysisData.analysis_totals,
            dailyCount: analysisData.daily_entries?.length || 0,
            workingDays: analysisData.working_days,
            status: analysisData.status
          });

          // Convert database analysis to report format using final parameters
          const reportData = convertDatabaseAnalysisToReportData(analysisData, dayFilter, finalWeekFilter, finalStartDate, finalEndDate);
          console.log('🔍 Reports Debug - Converted report data:', {
            totalDays: reportData.totalDays,
            dailyEntriesCount: reportData.dailyEntries.length,
            hasValidData: reportData.totalDays > 0,
            filteredByDay: !!dayFilter,
            filteredByWeek: !!finalWeekFilter,
            usedWeekNavigation: !!(selectedWeek && weekAnalysisId && !analysisId)
          });
          setReportData(reportData);
          // Set isDailyReport for both explicit day filter and single-day analyses
          setIsDailyReport(!!dayFilter || (reportData.totalDays === 1 && reportData.reportType === 'Daily Report'));
          // Store the analysis ID for edit functionality
          setCurrentAnalysisId(analysisData.id);

          // Clear week navigation state after successful load to prevent stale state
          if (selectedWeek && weekAnalysisId && !analysisId) {
            console.log('🔍 Reports Debug - Clearing week navigation state after successful load');
            // Use a timeout to prevent immediate clearing during navigation
            setTimeout(() => weekNavigationService.clearSelectedWeek(), 1000);
          }
          console.log('✅ Reports Debug - Report data set successfully from database');
        } else {
          console.log('❌ Reports Debug - No analysis data found in database');
          setReportData(null);
        }
      } catch (error) {
        console.error('🔍 Reports Debug - Error loading analysis data:', error);
        setReportData(null);
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [user?.id, getWeekEndDate, getWeekStartDate, loadAnalysisBySessionId, convertDatabaseAnalysisToReportData]); // Add missing dependencies

  const handleExport = useCallback(() => {
    if (!reportData) return;

    // Convert report data to export format
    const exportAnalysisData: LocalStorageExportData = {
      analysisId: `report-${new Date().getTime()}`,
      period: reportData.period,
      createdAt: reportData.generatedDate,
      totalDays: reportData.totalDays,
      summary: {
        totalActual: reportData.totals.paid,
        totalExpected: reportData.totals.expected,
        workingDays: reportData.totalDays,
        totalConsignments: reportData.totals.consignments,
        averageDaily: reportData.totals.paid / reportData.totalDays,
        difference: reportData.totals.difference
      },
      dailyData: reportData.dailyEntries.reduce((acc, entry) => {
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
          status: entry.status
        };
        return acc;
      }, {} as Record<string, {
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
      }>)
    };

    setExportData(exportAnalysisData);
    setShowExportModal(true);
  }, [reportData]);

  // Listen for export events from the header button
  useEffect(() => {
    const handleExportEvent = () => {
      handleExport();
    };

    window.addEventListener('exportReport', handleExportEvent);

    return () => {
      window.removeEventListener('exportReport', handleExportEvent);
    };
  }, [handleExport]);

  // Handle edit day data - Open manual entry modal
  const handleEditDayData = useCallback((entry: DailyEntry) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  }, []);

  // Handle save from manual entry modal
  const handleSaveEntry = useCallback(async (entryData: ManualEntryData) => {
    if (!editingEntry || !currentAnalysisId || !user) return;

    try {
      // Update the daily entry in the database
      const updatedEntry = {
        date: entryData.date.toISOString().split('T')[0],
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

      const result = await analysisRepository.updateDailyEntry(user.id, currentAnalysisId, editingEntry.date, updatedEntry);

      if (result.isSuccess) {
        console.log(`✅ Successfully updated entry for ${editingEntry.date}`);
        setShowEditModal(false);
        setEditingEntry(null);

        // Reload the report data to show updates
        window.location.reload();
      } else {
        console.error('❌ Failed to update entry:', result.error.message);
        // TODO: Show user-friendly error message
      }
    } catch (error) {
      console.error('❌ Failed to update entry:', error);
      // TODO: Show user-friendly error message
    }
  }, [editingEntry, currentAnalysisId, user]);



  // Group daily entries by week or month
  const groupDailyEntries = (entries: DailyEntry[], mode: 'week' | 'month') => {
    if (mode === 'week') {
      return entries; // Return individual days for week view
    }
    
    // Group by month for month view
    const monthGroups: { [key: string]: DailyEntry[] } = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }
      monthGroups[monthKey].push(entry);
    });
    
    // Aggregate monthly data
    return Object.entries(monthGroups).map(([monthKey, monthEntries]) => {
      const totalConsignments = monthEntries.reduce((sum, entry) => sum + entry.consignments, 0);
      const totalBasePay = monthEntries.reduce((sum, entry) => sum + entry.basePay, 0);
      const totalPickupTotal = monthEntries.reduce((sum, entry) => sum + entry.pickupTotal, 0);
      const totalExpected = monthEntries.reduce((sum, entry) => sum + entry.expected, 0);
      const totalPaid = monthEntries.reduce((sum, entry) => sum + entry.paid, 0);
      const totalDifference = monthEntries.reduce((sum, entry) => sum + entry.difference, 0);
      
      const date = new Date(monthKey + '-01');
      const monthName = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
      
      return {
        date: monthKey,
        day: monthName,
        consignments: totalConsignments,
        rate: 0, // Not applicable for monthly view
        basePay: totalBasePay,
        pickups: monthEntries.reduce((sum, entry) => sum + entry.pickups, 0),
        pickupTotal: totalPickupTotal,
        bonuses: {
          unloading: monthEntries.reduce((sum, entry) => sum + entry.bonuses.unloading, 0),
          attendance: monthEntries.reduce((sum, entry) => sum + entry.bonuses.attendance, 0),
          early: monthEntries.reduce((sum, entry) => sum + entry.bonuses.early, 0),
        },
        expected: totalExpected,
        paid: totalPaid,
        difference: totalDifference,
        status: (totalDifference >= 0 ? 'complete' : 'underpaid') as DailyEntry['status']
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  };

  const getStatusBadge = (status: DailyEntry['status']) => {
    const styles = {
      complete: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overpaid: 'bg-blue-100 text-blue-800',
      underpaid: 'bg-red-100 text-red-800',
      balanced: 'bg-green-100 text-green-800'
    };
    
    const labels = {
      complete: 'Complete',
      pending: 'Pending',
      overpaid: 'Overpaid',
      underpaid: 'Underpaid',
      balanced: 'Balanced'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
            <p className="text-slate-600 mt-1">Loading report data...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4" style={{ isolation: 'isolate', contain: 'layout' }}>
          <div className="h-48 bg-slate-200 rounded-lg"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 bg-slate-200 rounded-lg"></div>
            <div className="h-24 bg-slate-200 rounded-lg"></div>
            <div className="h-24 bg-slate-200 rounded-lg"></div>
            <div className="h-24 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="h-96 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Layer 2: Safety net check in render (matches original HTML approach)
  if (!reportData || reportData.totalDays === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
            <p className="text-slate-600 mt-1">No report data available</p>
          </div>
        </div>
        <Card className="theme-card p-16 text-center relative overflow-hidden">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M7 13v4M11 10v7M15 7v10"/>
            </svg>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full animate-pulse" style={{ isolation: 'isolate', contain: 'layout style' }}></div>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">No Report Available</h3>
          <p className="text-slate-600 text-base mb-6">Complete an analysis to view your financial reports and insights</p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto opacity-60"></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-background">
      <div className="container mx-auto px-2 py-0 space-y-2">


        {/* Report Header */}
        <div className="report-header enhanced-header" style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '16px',
          marginBottom: '8px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div className="report-header-content" style={{ position: 'relative', zIndex: 1 }}>
            <div className="report-company" style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>FINANCIAL ANALYSIS</div>
            <div className="report-title" style={{
              fontSize: '1rem',
              fontWeight: '400',
              opacity: '0.9',
              marginBottom: '24px'
            }}>{reportData.reportType}</div>
            <div className="report-meta" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px'
            }}>
              <div className="report-meta-item">
                <div className="report-meta-label" style={{
                  fontSize: '0.75rem',
                  opacity: '0.7',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Period</div>
                <div className="report-meta-value" style={{
                  fontSize: '1rem',
                  fontWeight: '600'
                }}>{reportData.period}</div>
              </div>
              <div className="report-meta-item">
                <div className="report-meta-label" style={{
                  fontSize: '0.75rem',
                  opacity: '0.7',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Generated</div>
                <div className="report-meta-value" style={{
                  fontSize: '1rem',
                  fontWeight: '600'
                }}>{reportData.generatedDate}</div>
              </div>
              <div className="report-meta-item">
                <div className="report-meta-label" style={{
                  fontSize: '0.75rem',
                  opacity: '0.7',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Total Days</div>
                <div className="report-meta-value" style={{
                  fontSize: '1rem',
                  fontWeight: '600'
                }}>{reportData.totalDays}</div>
              </div>
              <div className="report-meta-item">
                <div className="report-meta-label" style={{
                  fontSize: '0.75rem',
                  opacity: '0.7',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Status</div>
                <div className="report-meta-value" style={{
                  fontSize: '1rem',
                  fontWeight: '600'
                }}>{reportData.status}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced KPI Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 relative overflow-hidden kpi-card bg-gradient-to-br from-white to-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-200">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-slate-600 uppercase tracking-wide kpi-label">Expected Total</div>
            </div>
            <div className="text-3xl font-bold text-slate-900 kpi-value">£{(reportData.totals.expected || 0).toFixed(2)}</div>
            <div className="text-sm text-slate-500 kpi-label">Total earnings</div>
          </Card>

          <Card className="p-6 relative overflow-hidden kpi-card bg-gradient-to-br from-white to-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-200">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-400"></div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-slate-600 uppercase tracking-wide kpi-label">Paid Amount</div>
            </div>
            <div className="text-3xl font-bold text-slate-900 kpi-value">£{(reportData.totals.paid || 0).toFixed(2)}</div>
            <div className="text-sm text-slate-500 kpi-label">Amount received</div>
          </Card>

          <Card className="p-6 relative overflow-hidden kpi-card bg-gradient-to-br from-white to-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-200">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${reportData.totals.difference >= 0 ? 'bg-green-600' : 'bg-red-600'}`}></div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-slate-600 uppercase tracking-wide kpi-label">Difference</div>
            </div>
            <div className={`text-3xl font-bold kpi-value ${reportData.totals.difference >= 0 ? 'text-green-600 positive' : 'text-red-600 negative'}`}>
              £{(reportData.totals.difference || 0).toFixed(2)}
            </div>
            <div className={`text-sm px-2 py-1 rounded-full inline-block badge ${reportData.totals.difference >= 0 ? 'bg-green-100 text-green-800 status-complete' : 'bg-red-100 text-red-800 status-error'}`}>
              {reportData.totals.difference >= 0 ? 'Overpaid' : 'Underpaid'}
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden kpi-card bg-gradient-to-br from-white to-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-200">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-slate-600 uppercase tracking-wide kpi-label">Consignments</div>
            </div>
            <div className="text-3xl font-bold text-slate-900 kpi-value">{reportData.totals.consignments}</div>
            <div className="text-sm text-slate-500 kpi-label">Total deliveries</div>
          </Card>
        </div>

        {/* Analysis Breakdown - Show table only for multi-day reports */}
        {!isDailyReport && (
          /* Multi-Day Report Table Layout */
          <Card variant="secondary" className="overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  {isDailyReport ? 'Daily Analysis Breakdown' : (viewMode === 'week' ? 'Daily Analysis Breakdown' : 'Monthly Analysis Summary')}
                </h3>
                <button 
                  onClick={() => setCompactView(!compactView)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {compactView ? 'Detailed View' : 'Compact View'}
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className={`w-full analysis-table ${compactView ? 'compact-view' : ''}`}>
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      {viewMode === 'week' ? 'Date' : 'Month'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      {viewMode === 'week' ? 'Day' : 'Period'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Consignments</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      {viewMode === 'week' ? 'Rate' : 'Avg Rate'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Base Pay</th>
                    {!compactView && <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Pickups</th>}
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Bonuses</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Expected</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Difference</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {groupDailyEntries(reportData.dailyEntries, viewMode).map((entry) => (
                    <tr key={entry.date} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-900">{entry.date}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{entry.day}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{entry.consignments}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-700">
                        {viewMode === 'week' ? `£${(entry.rate || 0).toFixed(2)}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-900 currency">£{(entry.basePay || 0).toFixed(2)}</td>
                      {!compactView && <td className="px-6 py-4 text-sm font-mono text-slate-700 currency">£{(entry.pickupTotal || 0).toFixed(2)}</td>}
                      <td className="px-6 py-4 text-sm font-mono text-slate-700 currency">£{((entry.bonuses.unloading || 0) + (entry.bonuses.attendance || 0) + (entry.bonuses.early || 0)).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-900 currency">£{(entry.expected || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-900 currency">£{(entry.paid || 0).toFixed(2)}</td>
                      <td className={`px-6 py-4 text-sm font-mono font-medium currency ${entry.difference >= 0 ? 'text-green-600 positive' : 'text-red-600 negative'}`}>
                        £{(entry.difference || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">{getStatusBadge(entry.status)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleEditDayData(entry)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit day data"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900" colSpan={2}>Totals</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{reportData.totals.consignments}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">-</td>
                    <td className="px-6 py-4 text-sm font-bold font-mono text-slate-900 currency">£{(reportData.totals.basePay || 0).toFixed(2)}</td>
                    {!compactView && <td className="px-6 py-4 text-sm font-bold font-mono text-slate-900 currency">£{(reportData.totals.pickups || 0).toFixed(2)}</td>}
                    <td className="px-6 py-4 text-sm font-bold font-mono text-slate-900 currency">£{(reportData.totals.bonuses || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-bold font-mono text-slate-900 currency">£{(reportData.totals.expected || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-bold font-mono text-slate-900 currency">£{(reportData.totals.paid || 0).toFixed(2)}</td>
                    <td className={`px-6 py-4 text-sm font-bold font-mono currency ${reportData.totals.difference >= 0 ? 'text-green-600 positive' : 'text-red-600 negative'}`}>
                      £{(reportData.totals.difference || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">-</td>
                    <td className="px-6 py-4 text-sm text-slate-500">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}

        {/* Settlement Summary - Show for both daily and multi-day reports */}
        {(
          <div className="settlement-breakdown" style={{background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', borderRadius: '12px', padding: '24px', marginTop: '16px', border: '1px solid #e2e8f0'}}>
            <h3 className="breakdown-title text-lg font-bold text-slate-900 mb-5">Settlement Summary</h3>
            <div className="breakdown-grid space-y-3">
              <div className="breakdown-item bg-white rounded-lg p-4 flex justify-between items-center hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                <span className="breakdown-label text-sm text-slate-600 font-medium">Consignment Payments</span>
                <span className="breakdown-value text-base font-bold font-mono text-slate-900">£{(reportData.breakdown?.consignments || 0).toFixed(2)}</span>
              </div>
              <div className="breakdown-item bg-white rounded-lg p-4 flex justify-between items-center hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                <span className="breakdown-label text-sm text-slate-600 font-medium">Pickup Services</span>
                <span className="breakdown-value text-base font-bold font-mono text-slate-900">£{(reportData.breakdown?.pickups || 0).toFixed(2)}</span>
              </div>
              <div className="breakdown-item bg-white rounded-lg p-4 flex justify-between items-center hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                <span className="breakdown-label text-sm text-slate-600 font-medium">Unloading Bonus</span>
                <span className="breakdown-value text-base font-bold font-mono text-slate-900">£{(reportData.breakdown.unloading || 0).toFixed(2)}</span>
              </div>
              <div className="breakdown-item bg-white rounded-lg p-4 flex justify-between items-center hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                <span className="breakdown-label text-sm text-slate-600 font-medium">Attendance Bonus</span>
                <span className="breakdown-value text-base font-bold font-mono text-slate-900">£{(reportData.breakdown.attendance || 0).toFixed(2)}</span>
              </div>
              <div className="breakdown-item bg-white rounded-lg p-4 flex justify-between items-center hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                <span className="breakdown-label text-sm text-slate-600 font-medium">Early Arrival Bonus</span>
                <span className="breakdown-value text-base font-bold font-mono text-slate-900">£{(reportData.breakdown.early || 0).toFixed(2)}</span>
              </div>
              <div className="breakdown-item breakdown-total bg-slate-900 text-white rounded-lg p-4 flex justify-between items-center hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                <span className="breakdown-label text-sm font-bold text-white">Total Expected</span>
                <span className="breakdown-value text-base font-bold font-mono text-white">£{(reportData.totals.expected || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[99999] p-4 overflow-y-auto border-0 max-w-none max-h-none w-full h-full"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowEditModal(false);
                setEditingEntry(null);
              }
            }}
          >
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
                    early: editingEntry.bonuses.early || 0
                  },
                  pickups: editingEntry.pickups
                }}
              />
            </div>
          </dialog>
        )}
      </div>
    </div>
  );
}
