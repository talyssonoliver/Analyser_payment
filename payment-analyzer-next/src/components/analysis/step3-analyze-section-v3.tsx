/**
 * Step 3 Analyze Section V3 - Full React Implementation
 * Uses React refs instead of DOM queries for reliable event handling
 */

'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ManualEntry } from '@/types/core';
import {
  populateStep3Content,
  type GlobalState as ContentGeneratorState
} from './step3-content-generator';

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

// Interface matching the original global state
interface Step3Props {
  // Data from analysis workflow
  lastAnalysisData: AnalysisData | null;
  manualEntries: ManualEntry[];
  currentInputMethod: 'upload' | 'manual';
  hasBeenAnalyzed: boolean;
  uploadedFiles: File[];
  
  // Callbacks
  onViewDetailedReport: () => void;
  onStartNewAnalysis: () => void;
  
  // Optional
  className?: string;
}

export function Step3AnalyzeSectionV3({
  lastAnalysisData,
  manualEntries,
  currentInputMethod,
  hasBeenAnalyzed,
  uploadedFiles,
  onViewDetailedReport,
  onStartNewAnalysis,
  className = ''
}: Step3Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  // Create state object matching original HTML global variables
  const globalState: ContentGeneratorState = useMemo(() => ({
    lastAnalysisData,
    manualEntries,
    currentInputMethod,
    hasBeenAnalyzed,
    uploadedFiles
  }), [lastAnalysisData, manualEntries, currentInputMethod, hasBeenAnalyzed, uploadedFiles]);

  // Handle week report generation
  const handleViewWeekReport = useCallback((weekNumber: number, weekYear: number, weekIndex: number) => {
    try {
      console.log(`Week ${weekNumber}, ${weekYear} report requested (index: ${weekIndex})`);
      // Find the week data from lastAnalysisData
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
          console.log('Week data found:', weekData);
        } else {
          console.error('Week data not found for index:', weekIndex);
        }
      }
    } catch (error) {
      console.error('Failed to generate week report:', error);
    }
  }, [lastAnalysisData]);

  // Handle week title navigation
  const handleWeekTitleClick = useCallback((weekNumber: number, weekYear: number) => {
    console.log(`Navigate to week ${weekNumber}, ${weekYear} report`);
  }, []);

  // Handle week header expand/collapse
  const handleWeekHeaderClick = useCallback((weekId: string) => {
    const header = document.querySelector(`[data-week-id="${weekId}"]`);
    if (!header) return;
    
    const content = document.getElementById(`${weekId}-content`);
    if (!content) return;
    
    const isExpanded = content.style.display !== 'none';
    
    if (isExpanded) {
      // Collapse
      content.style.display = 'none';
      header.classList.remove('expanded');
      
      // Rotate chevron back
      const toggle = header.querySelector('.week-toggle svg');
      if (toggle) {
        (toggle as HTMLElement).style.transform = 'rotate(0deg)';
      }
    } else {
      // Expand
      content.style.display = 'block';
      header.classList.add('expanded');
      
      // Rotate chevron
      const toggle = header.querySelector('.week-toggle svg');
      if (toggle) {
        (toggle as HTMLElement).style.transform = 'rotate(180deg)';
      }
    }
    
    // Update React state for consistency
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekId)) {
      newExpanded.delete(weekId);
    } else {
      newExpanded.add(weekId);
    }
    setExpandedWeeks(newExpanded);
  }, [expandedWeeks]);

  // Generate and display content
  useEffect(() => {
    if (!containerRef.current) return;

    console.log('Step3V3: Generating content with data:', {
      hasData: !!lastAnalysisData,
      hasResults: !!(lastAnalysisData?.results),
      resultsCount: lastAnalysisData?.results?.length || 0
    });

    // Generate the HTML content
    const htmlContent = populateStep3Content(globalState);
    
    // Create the main container HTML
    const mainHtml = `
      <div class="step3-container">
        ${htmlContent}
        
        ${lastAnalysisData && lastAnalysisData.results ? `
          <div class="analysis-actions" style="margin-top: 20px; text-align: center;">
            <button 
              id="viewDetailedReportBtnV3" 
              class="btn btn-primary" 
              style="margin: 10px; padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;"
            >
              📊 View Detailed Report
            </button>
            <button 
              id="startNewAnalysisBtnV3" 
              class="btn btn-secondary"
              style="margin: 10px; padding: 10px 20px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;"
            >
              🔄 Start New Analysis
            </button>
          </div>
        ` : ''}
      </div>
    `;
    
    containerRef.current.innerHTML = mainHtml;

    // Attach event listeners directly using getElementById
    const attachEventListeners = () => {
      console.log('Step3V3: Attaching event listeners');
      
      // View Detailed Report button
      const viewReportBtn = document.getElementById('viewDetailedReportBtnV3');
      if (viewReportBtn) {
        console.log('Step3V3: Found View Report button, attaching listener');
        viewReportBtn.onclick = (e) => {
          e.preventDefault();
          console.log('Step3V3: View Detailed Report button clicked');
          onViewDetailedReport();
        };
      } else {
        console.warn('Step3V3: View Report button not found');
      }
      
      // Start New Analysis button
      const newAnalysisBtn = document.getElementById('startNewAnalysisBtnV3');
      if (newAnalysisBtn) {
        console.log('Step3V3: Found New Analysis button, attaching listener');
        newAnalysisBtn.onclick = (e) => {
          e.preventDefault();
          console.log('Step3V3: Start New Analysis button clicked');
          onStartNewAnalysis();
        };
      } else {
        console.warn('Step3V3: New Analysis button not found');
      }

      // Week header event listeners
      const weekHeaders = document.querySelectorAll('.week-header');
      console.log(`Step3V3: Found ${weekHeaders.length} week headers`);
      weekHeaders.forEach(header => {
        header.addEventListener('click', (e) => {
          const weekId = header.getAttribute('data-week-id');
          if (!weekId) return;
          
          // Check if click was on week title (for navigation)
          const target = e.target as HTMLElement;
          if (target.closest('.week-title')) {
            const weekTitle = header.querySelector('.week-title');
            if (weekTitle && weekTitle.textContent) {
              const match = weekTitle.textContent.match(/Week (\d+), (\d+)/);
              if (match) {
                const [, weekNumber, weekYear] = match;
                handleWeekTitleClick(parseInt(weekNumber), parseInt(weekYear));
                return; // Don't toggle if clicking on title
              }
            }
          }
          
          // Otherwise toggle expand/collapse
          handleWeekHeaderClick(weekId);
        });
      });
      
      // Week report buttons
      const weekReportBtns = document.querySelectorAll('.view-week-report-btn');
      console.log(`Step3V3: Found ${weekReportBtns.length} week report buttons`);
      weekReportBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent week header click
          
          const weekNumber = parseInt(btn.getAttribute('data-week-number') || '0');
          const weekYear = parseInt(btn.getAttribute('data-week-year') || '0');
          const weekIndex = parseInt(btn.getAttribute('data-week-index') || '0');
          
          if (weekNumber && weekYear) {
            handleViewWeekReport(weekNumber, weekYear, weekIndex);
          }
        });
      });
    };

    // Attach listeners after DOM is ready
    setTimeout(attachEventListeners, 0);

  }, [globalState, lastAnalysisData, onViewDetailedReport, onStartNewAnalysis, handleViewWeekReport, handleWeekTitleClick, handleWeekHeaderClick, expandedWeeks]);

  return (
    <div className={`analyze-section active ${className}`} ref={containerRef}>
      {/* Content will be populated by useEffect */}
    </div>
  );
}