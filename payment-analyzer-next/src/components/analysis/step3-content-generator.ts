/**
 * Step 3 Content Generator
 * Pure JavaScript functions ported directly from original HTML
 * These functions generate HTML via template strings exactly like the original
 */

import { ManualEntry } from '@/types/core';

// Type definitions for better IDE support
interface AnalysisData {
  results?: AnalysisResult[];
  totals?: AnalysisTotals;
  metadata?: AnalysisMetadata;
}

interface AnalysisResult {
  date: string;
  expectedTotal: number;
  paidAmount: number;
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
}


// Global state interfaces
export interface GlobalState {
  lastAnalysisData: AnalysisData | null;
  manualEntries: ManualEntry[];
  currentInputMethod: 'upload' | 'manual';
  hasBeenAnalyzed: boolean;
  uploadedFiles: File[];
}

/**
 * Generate Step 3 Summary Cards
 * Exact port from original HTML generateStep3SummaryCards() function
 */
export function generateStep3SummaryCards(state: GlobalState): string {
  const { lastAnalysisData, manualEntries, currentInputMethod } = state;
  
  // If we have analysis results from file upload, use those
  if (lastAnalysisData && lastAnalysisData.totals) {
    const totals = lastAnalysisData.totals;
    const difference = (totals.paidTotal || 0) - (totals.expectedTotal || 0);
    const differenceClass = difference >= 0 ? 'positive' : 'negative';
    const differenceIcon = difference >= 0 ? '↗️' : '↘️';
    const dailyAverage = totals.workingDays > 0 ? totals.expectedTotal / totals.workingDays : 0;
    
    return `
      <div class="preview-card enhanced">
        <div class="preview-card-icon">💰</div>
        <div class="preview-card-content">
          <div class="preview-card-label">Total Actual</div>
          <div class="preview-card-value">£${(totals.paidTotal || 0).toFixed(2)}</div>
        </div>
      </div>
      <div class="preview-card enhanced">
        <div class="preview-card-icon">📋</div>
        <div class="preview-card-content">
          <div class="preview-card-label">Total Expected</div>
          <div class="preview-card-value">£${(totals.expectedTotal || 0).toFixed(2)}</div>
        </div>
      </div>
      <div class="preview-card enhanced ${differenceClass}">
        <div class="preview-card-icon">${differenceIcon}</div>
        <div class="preview-card-content">
          <div class="preview-card-label">Difference</div>
          <div class="preview-card-value ${differenceClass}">£${Math.abs(difference).toFixed(2)}</div>
        </div>
      </div>
      <div class="preview-card enhanced">
        <div class="preview-card-icon">📅</div>
        <div class="preview-card-content">
          <div class="preview-card-label">Working Days</div>
          <div class="preview-card-value">${totals.workingDays || 0}</div>
        </div>
      </div>
      <div class="preview-card enhanced">
        <div class="preview-card-icon">📊</div>
        <div class="preview-card-content">
          <div class="preview-card-label">Daily Average</div>
          <div class="preview-card-value">£${dailyAverage.toFixed(2)}</div>
        </div>
      </div>
    `;
  }
  
  // Fall back to manual entries if no analysis data
  if (currentInputMethod === 'manual' && manualEntries.length > 0) {
    const totalConsignments = manualEntries.reduce((sum, entry) => sum + entry.consignments, 0);
    const totalExpected = manualEntries.reduce((sum, entry) => sum + (entry.expectedTotal || 0), 0);
    const workingDays = manualEntries.length;
    const avgDaily = workingDays > 0 ? totalExpected / workingDays : 0;
    
    return `
      <div class="preview-card enhanced">
        <div class="preview-card-icon">💰</div>
        <div class="preview-card-content">
          <div class="preview-card-label">Total Expected</div>
          <div class="preview-card-value">£${totalExpected.toFixed(2)}</div>
        </div>
      </div>
      <div class="preview-card enhanced">
        <div class="preview-card-icon">📦</div>
        <div class="preview-card-content">
          <div class="preview-card-label">Consignments</div>
          <div class="preview-card-value">${totalConsignments}</div>
        </div>
      </div>
      <div class="preview-card enhanced">
        <div class="preview-card-icon">📅</div>
        <div class="preview-card-content">
          <div class="preview-card-label">Working Days</div>
          <div class="preview-card-value">${workingDays}</div>
        </div>
      </div>
      <div class="preview-card enhanced">
        <div class="preview-card-icon">📊</div>
        <div class="preview-card-content">
          <div class="preview-card-label">Daily Average</div>
          <div class="preview-card-value">£${avgDaily.toFixed(2)}</div>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="summary-card-simple">
      <div class="card-value">-</div>
      <div class="card-label">No Data</div>
    </div>
  `;
}

/**
 * Get week number of year
 * Helper function for week calculation
 */
function getWeekOfYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Generate Week Summary
 * Exact port from original HTML generateWeekSummary() function
 */
export function generateWeekSummary(state: GlobalState, expandedWeeks?: Set<string>): string {
  const { lastAnalysisData, manualEntries } = state;
  
  console.log('🔍 generateWeekSummary called with:', {
    hasAnalysisData: !!lastAnalysisData,
    hasResults: !!(lastAnalysisData?.results),
    resultsLength: lastAnalysisData?.results?.length || 0,
    manualEntriesLength: manualEntries?.length || 0,
    analysisDataKeys: lastAnalysisData ? Object.keys(lastAnalysisData) : [],
    resultsPreview: lastAnalysisData?.results?.slice(0, 2)
  });
  
  // If we have analysis results from file upload, use those
  if (lastAnalysisData && lastAnalysisData.results) {
    const results = lastAnalysisData.results;
    if (!results || results.length === 0) {
      return `
        <div class="week-empty-state">
          <div class="week-empty-icon">📅</div>
          <p class="week-empty-message">No analysis results available</p>
          <p class="week-empty-subtitle">Run analysis to see daily breakdown</p>
        </div>
      `;
    }
    
    // Group results by week
    const weekGroups: Record<string, WeekGroup> = {};
    results.forEach((result: AnalysisResult) => {
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
          workingDays: 0
        };
      }
      
      weekGroups[weekKey].days.push(result);
      weekGroups[weekKey].totalExpected += result.expectedTotal || 0;
      weekGroups[weekKey].totalActual += result.paidAmount || 0;
      weekGroups[weekKey].workingDays++;
    });
    
    // Sort weeks by date (most recent first)
    const sortedWeeks = Object.values(weekGroups).sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
    const hasMultipleWeeks = sortedWeeks.length > 1;
    
    // Generate HTML for each week
    const weekSections = sortedWeeks.map((week: WeekGroup, index: number) => {
      const weekEndDate = new Date(week.weekStart);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      
      // Calculate week number and year
      const weekNumber = getWeekOfYear(week.weekStart);
      const weekYear = week.weekStart.getFullYear();
      
      const weekDifference = week.totalActual - week.totalExpected;
      const weekDifferenceClass = weekDifference >= 0 ? 'positive' : 'negative';
      
      // Sort days within week
      const sortedDays = week.days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log(`📅 Generating week ${index}:`, {
        weekNumber,
        weekYear,
        totalDays: week.days.length,
        sortedDaysLength: sortedDays.length,
        weekDays: sortedDays.map((d: AnalysisResult) => ({ date: d.date, expectedTotal: d.expectedTotal, paidAmount: d.paidAmount }))
      });
      
      const dayCards = sortedDays.map((result: AnalysisResult, dayIndex: number) => {
        const difference = (result.paidAmount || 0) - (result.expectedTotal || 0);
        const differenceClass = difference >= 0 ? 'positive' : 'negative';
        const differenceIcon = difference >= 0 ? '↗️' : '↘️';
        const dayName = new Date(result.date).toLocaleDateString('en-GB', { weekday: 'short' });
        
        console.log(`  📊 Day ${dayIndex} card generation:`, {
          date: result.date,
          dayName,
          expectedTotal: result.expectedTotal,
          paidAmount: result.paidAmount,
          difference
        });
        
        return `
          <div class="step2-entry-card enhanced-daily-card">
            <div class="card-header">
              <div class="date-info">
                <h3 class="day-name">${dayName}</h3>
                <p class="day-date">${result.date}</p>
              </div>
              ${Math.abs(difference) > 0 ? `
              <div class="status-badge ${differenceClass}">
                <span class="status-icon">${differenceIcon}</span>
                <span class="status-amount">£${Math.abs(difference).toFixed(2)}</span>
              </div>` : ''}
            </div>
            
            <div class="card-body">
              <div class="main-amounts">
                <div class="amount-row">
                  <span class="amount-label">Expected</span>
                  <span class="amount-value">£${(result.expectedTotal || 0).toFixed(2)}</span>
                </div>
                <div class="amount-row">
                  <span class="amount-label">Actual</span>
                  <span class="amount-value">£${(result.paidAmount || 0).toFixed(2)}</span>
                </div>
              </div>
              
              ${(result.expectedTotal || 0) > 0 ? `
              <div class="breakdown-section">
                <h4 class="breakdown-title">Breakdown</h4>
                <div class="breakdown-grid">
                  <div class="breakdown-item">
                    <span class="item-label">Base</span>
                    <span class="item-value">£${(result.basePayment || 0).toFixed(2)}</span>
                  </div>
                  ${(result.pickupTotal || 0) > 0 ? `
                  <div class="breakdown-item">
                    <span class="item-label">Pickup</span>
                    <span class="item-value">£${(result.pickupTotal || 0).toFixed(2)}</span>
                  </div>` : ''}
                  ${(result.unloadingBonus || 0) > 0 ? `
                  <div class="breakdown-item">
                    <span class="item-label">Unload</span>
                    <span class="item-value">£${(result.unloadingBonus || 0).toFixed(2)}</span>
                  </div>` : ''}
                  ${(result.attendanceBonus || 0) > 0 ? `
                  <div class="breakdown-item">
                    <span class="item-label">Attend</span>
                    <span class="item-value">£${(result.attendanceBonus || 0).toFixed(2)}</span>
                  </div>` : ''}
                  ${(result.earlyBonus || 0) > 0 ? `
                  <div class="breakdown-item">
                    <span class="item-label">Early</span>
                    <span class="item-value">£${(result.earlyBonus || 0).toFixed(2)}</span>
                  </div>` : ''}
                </div>
              </div>` : ''}
            </div>
          </div>
        `;
      }).join('');
      
      console.log(`🏗️ Week ${index} dayCards generated:`, {
        dayCardsCount: sortedDays.length,
        dayCardsLength: dayCards.length,
        contentPreview: dayCards.substring(0, 200) + '...'
      });
      
      return `
        <div class="week-group">
          <div class="week-header" data-week-id="week-${index}">
            <div class="week-info">
              <h3 class="week-title">Week ${weekNumber}, ${weekYear}</h3>
              <div class="week-dates">${week.weekStart.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short'
              })} - ${weekEndDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}</div>
            </div>
            <div class="week-summary">
              <div class="week-badge ${weekDifferenceClass}">
                ${weekDifference >= 0 ? '↗️' : '↘️'} £${Math.abs(weekDifference).toFixed(2)}
              </div>
              <div class="week-toggle">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
          </div>
          <div class="week-content" id="week-${index}-content" style="display: ${expandedWeeks?.has(`week-${index}`) ? 'block' : 'none'};">
            <div class="week-days-list">
              ${dayCards}
            </div>
            <div class="week-summary-totals">
              <div class="preview-card enhanced compact">
                <div class="preview-card-icon">📋</div>
                <div class="preview-card-content">
                  <div class="preview-card-label">Week Expected</div>
                  <div class="preview-card-value">£${week.totalExpected.toFixed(2)}</div>
                </div>
              </div>
              <div class="preview-card enhanced compact">
                <div class="preview-card-icon">💰</div>
                <div class="preview-card-content">
                  <div class="preview-card-label">Week Actual</div>
                  <div class="preview-card-value">£${week.totalActual.toFixed(2)}</div>
                </div>
              </div>
              <div class="preview-card enhanced compact">
                <div class="preview-card-icon">📅</div>
                <div class="preview-card-content">
                  <div class="preview-card-label">Working Days</div>
                  <div class="preview-card-value">${week.workingDays}</div>
                </div>
              </div>
            </div>
            ${hasMultipleWeeks ? `
            <div class="week-actions">
              <button class="btn btn-primary view-week-report-btn" data-week-number="${weekNumber}" data-week-year="${weekYear}" data-week-index="${index}">
                <span class="btn-icon">📊</span>
                <span class="btn-text">View Week ${weekNumber} Report</span>
              </button>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="weeks-container">
        ${weekSections}
      </div>
    `;
  }
  
  // Fall back to manual entries
  if (manualEntries.length === 0) {
    return `
      <div class="week-empty-state">
        <div class="week-empty-icon">📅</div>
        <p class="week-empty-message">No entries added yet</p>
        <p class="week-empty-subtitle">Add your daily data to see weekly progress</p>
      </div>
    `;
  }
  
  // Sort entries by date for chronological display
  const sortedEntries = [...manualEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate totals and statistics
  let totalExpected = 0;

  const enhancedItems = sortedEntries.map((entry) => {
    const expectedTotal = entry.expectedTotal || 0;
    const consignments = entry.consignments || 0;
    const bonuses = (entry.earlyArrive || 0) + (entry.loadingBonus || 0);

    totalExpected += expectedTotal;
    
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
    
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
    
    return `
      <div class="step2-entry-card enhanced-daily-card">
        <div class="card-header">
          <div class="date-info">
            <h3 class="day-name">${dayName}</h3>
            <p class="day-date">${formattedDate}</p>
          </div>
          <div class="total-badge">
            <span class="total-amount">£${expectedTotal.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="card-body">
          <div class="main-amounts">
            <div class="amount-row">
              <span class="amount-label">📦 Consignments</span>
              <span class="amount-value">${consignments}</span>
            </div>
            <div class="amount-row">
              <span class="amount-label">💰 Base Rate</span>
              <span class="amount-value">£${(entry.baseAmount || 0).toFixed(2)}</span>
            </div>
            ${bonuses > 0 ? `
            <div class="amount-row bonus-row">
              <span class="amount-label">⭐ Bonuses</span>
              <span class="amount-value">£${bonuses.toFixed(2)}</span>
            </div>` : ''}
          </div>
          
          ${expectedTotal > 0 ? `
          <div class="breakdown-section">
            <h4 class="breakdown-title">Payment Breakdown</h4>
            <div class="breakdown-grid">
              <div class="breakdown-item">
                <span class="item-label">Base</span>
                <span class="item-value">£${(entry.baseAmount || 0).toFixed(2)}</span>
              </div>
              ${(entry.pickupBonus || 0) > 0 ? `
              <div class="breakdown-item">
                <span class="item-label">Pickup</span>
                <span class="item-value">£${(entry.pickupBonus || 0).toFixed(2)}</span>
              </div>` : ''}
              ${(entry.loadingBonus || 0) > 0 ? `
              <div class="breakdown-item">
                <span class="item-label">Loading</span>
                <span class="item-value">£${(entry.loadingBonus || 0).toFixed(2)}</span>
              </div>` : ''}
              ${(entry.attendanceBonus || 0) > 0 ? `
              <div class="breakdown-item">
                <span class="item-label">Attend</span>
                <span class="item-value">£${(entry.attendanceBonus || 0).toFixed(2)}</span>
              </div>` : ''}
              ${(entry.earlyArrive || 0) > 0 ? `
              <div class="breakdown-item">
                <span class="item-label">Early</span>
                <span class="item-value">£${(entry.earlyArrive || 0).toFixed(2)}</span>
              </div>` : ''}
            </div>
          </div>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  // Calculate averages
  const avgDaily = sortedEntries.length > 0 ? totalExpected / sortedEntries.length : 0;
  
  return `
    <div class="week-summary-list">
      ${enhancedItems}
    </div>
    <div class="week-summary-totals">
      <div class="preview-card enhanced compact">
        <div class="preview-card-icon">📅</div>
        <div class="preview-card-content">
          <div class="preview-card-label">Days Entered</div>
          <div class="preview-card-value">${sortedEntries.length}</div>
        </div>
      </div>
      <div class="preview-card enhanced compact">
        <div class="preview-card-icon">💰</div>
        <div class="preview-card-content">
          <div class="preview-card-label">Total Expected</div>
          <div class="preview-card-value">£${totalExpected.toFixed(2)}</div>
        </div>
      </div>
      <div class="preview-card enhanced compact">
        <div class="preview-card-icon">📊</div>
        <div class="preview-card-content">
          <div class="preview-card-label">Daily Average</div>
          <div class="preview-card-value">£${avgDaily.toFixed(2)}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate Analysis Actions
 * Exact port from original HTML generateAnalysisActions() function
 */
export function generateAnalysisActions(state: GlobalState): string {
  const { lastAnalysisData } = state;
  
  // Determine if we have multiple weeks
  let hasMultipleWeeks = false;
  
  if (lastAnalysisData && lastAnalysisData.results && lastAnalysisData.results.length > 0) {
    const weeks = new Set();
    
    lastAnalysisData.results.forEach((result: AnalysisResult) => {
      const date = new Date(result.date);
      const weekNumber = getWeekOfYear(date);
      const year = date.getFullYear();
      weeks.add(`${year}-W${weekNumber}`);
    });
    
    hasMultipleWeeks = weeks.size > 1;
  }
  
  if (hasMultipleWeeks) {
    // Multiple weeks - only show "Start New Analysis" button
    // Individual week report buttons will be shown in each week section
    return `
      <button class="btn btn-secondary" id="startNewAnalysisStep3Btn">
        <span class="btn-icon">🔄</span>
        <span class="btn-text">Start New Analysis</span>
      </button>
    `;
  } else {
    // Single week - show both global report button and start new analysis
    return `
      <button class="btn btn-primary" id="viewDetailedReportBtn">
        <span class="btn-icon">📊</span>
        <span class="btn-text">View Detailed Report</span>
      </button>
      <div class="action-separator"></div>
      <button class="btn btn-secondary" id="startNewAnalysisStep3Btn">
        <span class="btn-icon">🔄</span>
        <span class="btn-text">Start New Analysis</span>
      </button>
    `;
  }
}

/**
 * Populate Step 3 Content
 * Exact port from original HTML populateStep3Content() function
 */
export function populateStep3Content(state: GlobalState, expandedWeeks?: Set<string>): string {
  const { currentInputMethod, manualEntries, uploadedFiles, hasBeenAnalyzed, lastAnalysisData } = state;
  
  // Check if we have current data to analyze or previous analysis results
  const hasCurrentData = (currentInputMethod === 'manual' && manualEntries.length > 0) || 
                         (currentInputMethod === 'upload' && uploadedFiles.length > 0);
  const hasPreviousAnalysis = hasBeenAnalyzed || lastAnalysisData;
  
  if (!hasCurrentData && !hasPreviousAnalysis) {
    return `
      <div class="analyze-content">
        <div class="analyze-header">
          <h2 class="analyze-title">Ready to Analyze</h2>
          <p class="analyze-subtitle">Complete your data entry to see analysis results</p>
        </div>
        <div class="empty-analysis-state">
          <div class="empty-analysis-icon">📊</div>
          <p class="empty-analysis-message">No data available for analysis</p>
          <button class="btn btn-primary" onclick="setStep(1)">
            <span class="btn-icon">📝</span>
            <span class="btn-text">Add Data</span>
          </button>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="analyze-content">
      <div class="analyze-header">
        <h2 class="analyze-title">Analysis Complete</h2>
        <p class="analyze-subtitle">Your payment data has been processed successfully</p>
      </div>
      <!-- Basic Analysis Summary -->
      <div class="analysis-summary">
        <h3 class="summary-title">Quick Summary</h3>
        <div class="summary-cards" id="step3SummaryCards">
          ${generateStep3SummaryCards(state)}
        </div>
      </div>
      <!-- Week Data Summary after user press button proceedToAnalysisBtn on Step 2 -->
      <div class="week-data-summary">
        <h3 class="week-summary-title">Breakdown by Week</h3>
        <div class="week-summary-content" id="weekSummaryStep3">
          ${generateWeekSummary(state, expandedWeeks)}
        </div>
      </div>
                
      <div class="analysis-actions" id="analysisActions">
        ${generateAnalysisActions(state)}
      </div>
    </div>
  `;
}

/**
 * Display Analysis Results
 * Exact port from original HTML displayAnalysisResults() function
 * This expects DOM elements with specific IDs
 */
export function displayAnalysisResults(analysisData: AnalysisData): string {
  // Generate results summary
  const { results, totals, metadata } = analysisData;
  
  if (!results || !totals || !metadata) {
    return '';
  }
  
  return `
    <div class="results-summary">
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon">📅</div>
          <div class="card-content">
            <div class="card-label">Working Days</div>
            <div class="card-value">${totals.workingDays}</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon">📦</div>
          <div class="card-content">
            <div class="card-label">Total Consignments</div>
            <div class="card-value">${totals.totalConsignments}</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <div class="card-label">Expected Total</div>
            <div class="card-value">£${totals.expectedTotal.toFixed(2)}</div>
          </div>
        </div>
        <div class="summary-card ${totals.differenceTotal >= 0 ? 'positive' : 'negative'}">
          <div class="card-icon">${totals.differenceTotal >= 0 ? '✅' : '❌'}</div>
          <div class="card-content">
            <div class="card-label">Difference</div>
            <div class="card-value">${totals.differenceTotal >= 0 ? '+' : ''}£${totals.differenceTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>
      
      <div class="status-badge-container">
        <div class="status-badge ${totals.differenceTotal >= 0 ? 'favorable' : 'unfavorable'}">
          ${metadata.overallStatus}
        </div>
      </div>
      
      <div class="period-info">
        <strong>Analysis Period:</strong> ${metadata.periodRange} 
        <span class="analysis-date">(Analyzed on ${metadata.analysisDate})</span>
      </div>
    </div>
  `;
}