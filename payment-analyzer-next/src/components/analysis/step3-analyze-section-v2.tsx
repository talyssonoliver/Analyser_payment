/**
 * Step 3 Analyze Section V2 - Hybrid React-JavaScript Approach
 * Uses dangerouslySetInnerHTML with pure JavaScript functions from original HTML
 */

'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  populateStep3Content,
  displayAnalysisResults,
  type GlobalState as ContentGeneratorState
} from './step3-content-generator';
import { ManualEntry } from '@/types/core';

// Type definitions for component
interface AnalysisData {
  id: string;
  results?: AnalysisResult[];
  totals?: AnalysisTotals;
  metadata?: AnalysisMetadata;
}

interface AnalysisResult {
  date: string;
  expectedTotal: number;
  paidAmount: number;
  consignments?: number;
  basePayment?: number;
  pickupTotal?: number;
  unloadingBonus?: number;
  attendanceBonus?: number;
  earlyBonus?: number;
}

interface AnalysisTotals {
  paidTotal: number;
  expectedTotal: number;
  workingDays: number;
  totalConsignments: number;
  differenceTotal: number;
}

interface AnalysisMetadata {
  overallStatus: string;
  periodRange: string;
  analysisDate: string;
}


interface WeekGroup {
  weekStart: Date;
  days: AnalysisResult[];
  totalExpected: number;
  totalActual: number;
  workingDays: number;
  totalConsignments: number;
  totalDifference: number;
}
import {
  attachStep3EventListeners,
  cleanupStep3EventListeners,
  updateAnalysisResultsDOM,
  type EventHandlerCallbacks
} from './step3-event-handlers';
import { weekNavigationService, type WeekInfo } from '@/lib/services/week-navigation-service';

// Interface matching the original global state
interface Step3Props {
  // Data from analysis workflow
  lastAnalysisData: AnalysisData | null;
  manualEntries: ManualEntry[];
  currentInputMethod: 'upload' | 'manual';
  hasBeenAnalyzed: boolean;
  uploadedFiles: File[];
  
  // Callbacks
  onSetStep: (step: number) => void;
  onViewDetailedReport: () => void;
  onStartNewAnalysis: () => void;
  
  // Optional
  className?: string;
}

export function Step3AnalyzeSectionV2({
  lastAnalysisData,
  manualEntries,
  currentInputMethod,
  hasBeenAnalyzed,
  uploadedFiles,
  onSetStep,
  onViewDetailedReport,
  onStartNewAnalysis,
  className = ''
}: Step3Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  // Helper function to get week start date (Monday)
  const getWeekStartDate = useCallback((year: number, weekNumber: number): Date => {
    const januaryFirst = new Date(year, 0, 1);
    const daysToFirstMonday = (8 - januaryFirst.getDay()) % 7;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
    return new Date(firstMonday.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
  }, []);

  // Helper function to get week end date (Sunday)
  const getWeekEndDate = useCallback((year: number, weekNumber: number): Date => {
    const weekStart = getWeekStartDate(year, weekNumber);
    return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  }, [getWeekStartDate]);

  // Create state object matching original HTML global variables
  const globalState: ContentGeneratorState = useMemo(() => ({
    lastAnalysisData,
    manualEntries,
    currentInputMethod,
    hasBeenAnalyzed,
    uploadedFiles
  }), [lastAnalysisData, manualEntries, currentInputMethod, hasBeenAnalyzed, uploadedFiles]);

  // Generate HTML content using exact original functions
  useEffect(() => {
    const content = populateStep3Content(globalState, expandedWeeks);
    setHtmlContent(content);
  }, [globalState, expandedWeeks]);

  // Handle week report generation (enhanced with inline report support)
  const handleViewWeekReport = useCallback((weekNumber: number, weekYear: number, weekIndex: number) => {
    try {
      console.log(`📊 Week report button clicked: Week ${weekNumber}, ${weekYear} (index: ${weekIndex})`);

      // Create week info object
      const weekInfo: WeekInfo = {
        week: weekNumber,
        year: weekYear
      };

      // Get analysis ID
      const analysisId = lastAnalysisData?.id || 'latest';

      // Option 1: Use enhanced week navigation with proper URL parameters
      if (lastAnalysisData && analysisId !== 'latest') {
        // Set selected week state
        weekNavigationService.setSelectedWeek(weekInfo, analysisId);

        // Calculate week date range for precise filtering
        const weekStartDate = getWeekStartDate(weekYear, weekNumber);
        const weekEndDate = getWeekEndDate(weekYear, weekNumber);
        const startDateStr = weekStartDate.toISOString().split('T')[0];
        const endDateStr = weekEndDate.toISOString().split('T')[0];

        // Navigate with week-specific parameters
        const params = new URLSearchParams();
        params.set('analysis', analysisId);
        params.set('week', weekNumber.toString());
        params.set('start', startDateStr);
        params.set('end', endDateStr);

        const reportUrl = `/reports?${params.toString()}`;
        console.log('🚀 NAVIGATING TO WEEK REPORT:', reportUrl);
        router.push(reportUrl);
        return;
      }

      // Option 2: Fallback to legacy week grouping logic
      if (lastAnalysisData && lastAnalysisData.results) {
        // Group results by week to find the specific week
        const weekGroups: Record<string, WeekGroup> = {};
        lastAnalysisData.results.forEach((result: AnalysisResult) => {
          const date = new Date(result.date);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!weekGroups[weekKey]) {
            weekGroups[weekKey] = {
              weekStart: weekStart,
              days: [],
              totalExpected: 0,
              totalActual: 0,
              workingDays: 0,
              totalConsignments: 0,
              totalDifference: 0
            };
          }

          weekGroups[weekKey].days.push(result);
          weekGroups[weekKey].totalExpected += result.expectedTotal || 0;
          weekGroups[weekKey].totalActual += result.paidAmount || 0;
          weekGroups[weekKey].workingDays++;
          weekGroups[weekKey].totalConsignments += result.consignments || 0;
        });

        // Sort weeks and find the one matching our index
        const sortedWeeks = Object.values(weekGroups).sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
        const targetWeek = sortedWeeks[weekIndex];

        if (targetWeek) {
          // Calculate difference
          const weekData = targetWeek as WeekGroup;
          weekData.totalDifference = weekData.totalActual - weekData.totalExpected;

          console.log('Week report requested (legacy):', weekData, `week-${weekNumber}-${weekYear}`);

          // Navigate to reports page with analysis data
          const reportUrl = `/reports?analysis=${analysisId}`;
          console.log('🚀 NAVIGATING TO (legacy):', reportUrl);
          router.push(reportUrl);
        } else {
          console.error('Week data not found');
        }
      }
    } catch (error) {
      console.error('Failed to generate week report:', error);
    }
  }, [lastAnalysisData, router, getWeekStartDate, getWeekEndDate]);

  // Handle week title navigation - RESTORED LEGACY FUNCTIONALITY
  const handleWeekTitleClick = useCallback((weekNumber: number, weekYear: number) => {
    console.log(`📅 Week title clicked: Week ${weekNumber}, ${weekYear}`);

    try {
      // Create week info object (matches legacy weekInfo structure)
      const weekInfo: WeekInfo = {
        week: weekNumber,
        year: weekYear
      };

      // Get analysis ID for navigation
      const analysisId = lastAnalysisData?.id || undefined;

      // Set return URL to current analysis page
      const currentUrl = window.location.pathname + window.location.search;
      weekNavigationService.setReturnUrl(currentUrl);

      // Navigate to week-specific report (replicates legacy: State.setSelectedWeek() + navigate('reports'))
      weekNavigationService.navigateToWeekReport(weekInfo, analysisId, router);

    } catch (error) {
      console.error('Failed to navigate to week report:', error);
      // Fallback: show inline week report
      handleViewWeekReport(weekNumber, weekYear, 0);
    }
  }, [lastAnalysisData, router, handleViewWeekReport]);

  // Handle week header expand/collapse
  const handleWeekHeaderClick = useCallback((weekId: string) => {
    console.log(`🔄 React state toggle for: ${weekId}`);
    
    // Update React state - this will trigger re-render with correct display state
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekId)) {
      newExpanded.delete(weekId);
      console.log(`🔼 React: Collapsing ${weekId}`);
    } else {
      newExpanded.add(weekId);
      console.log(`🔽 React: Expanding ${weekId}`);
    }
    setExpandedWeeks(newExpanded);
  }, [expandedWeeks]);

  // Event handler callbacks
  const eventCallbacks: EventHandlerCallbacks = useMemo(() => ({
    onSetStep,
    onViewDetailedReport,
    onStartNewAnalysis,
    onViewWeekReport: handleViewWeekReport,
    onWeekHeaderClick: handleWeekHeaderClick,
    onWeekTitleClick: handleWeekTitleClick
  }), [onSetStep, onViewDetailedReport, onStartNewAnalysis, handleViewWeekReport, handleWeekHeaderClick, handleWeekTitleClick]);

  // Attach event listeners after content updates using useLayoutEffect for synchronous DOM access
  useLayoutEffect(() => {
    if (htmlContent) {
      console.log('Step3V2: Content updated, setting up MutationObserver-based event listeners');
      
      // Clean up previous listeners
      cleanupStep3EventListeners();
      
      // Set up MutationObserver-based event attachment (no more setTimeout retries)
      attachStep3EventListeners(eventCallbacks);
      
      // Handle displayAnalysisResults if we have analysis data
      if (lastAnalysisData && lastAnalysisData.results) {
        const resultsHTML = displayAnalysisResults(lastAnalysisData);
        if (resultsHTML) {
          updateAnalysisResultsDOM(resultsHTML);
          console.log('Step3V2: Analysis results DOM updated');
        }
      }
    }
    
    // Cleanup on unmount
    return () => {
      cleanupStep3EventListeners();
    };
  }, [htmlContent, lastAnalysisData, eventCallbacks]);

  // Create DOM elements that displayAnalysisResults expects
  const createAnalysisResultsContainer = () => {    
    return (
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div id="analysisStatus" style={{ display: 'none' }}>Loading...</div>
        <div id="analysisResults" style={{ display: 'none' }}></div>
        <div id="analysisActions" style={{ display: 'none' }}></div>
      </div>
    );
  };

  return (
    <div className={`analyze-section active ${className}`} ref={containerRef}>
      {/* Hidden elements for displayAnalysisResults compatibility */}
      {createAnalysisResultsContainer()}
      
      {/* Main content generated by original HTML functions */}
      <div 
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        className="step3-dynamic-content"
      />
    </div>
  );
}