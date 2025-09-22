'use client';

import { KPISection } from './kpi-section';
import { WeeklyBreakdown } from './weekly-breakdown';
import { PaymentTotals, WeekCalculation, DayCalculation } from '@/lib/services/payment-calculation-service';
import { 
  exportToCSV, 
  exportToJSON, 
  exportToHTML, 
  downloadFile, 
  printHTML, 
  generateExportFilename,
  type ExportData 
} from '@/lib/utils/export-utils';
import { WeekReportGenerator } from '@/lib/utils/week-report-generator';
import { toast } from '@/lib/utils/toast';

interface AnalysisSummaryData {
  totalActual: number;
  totalExpected: number;
  workingDays: number;
  totalConsignments: number;
  averageDaily: number;
  difference: number;
  // Enhanced data structure
  totals?: PaymentTotals;
  weeks?: WeekCalculation[];
  days?: DayCalculation[];
  overallStatus?: string;
}

interface AnalysisSummaryProps {
  data: AnalysisSummaryData;
  onViewReport: () => void;
  onNewAnalysis: () => void;
  showDetailedBreakdown?: boolean;
}

export function AnalysisSummary({ 
  data, 
  onViewReport, 
  onNewAnalysis, 
  showDetailedBreakdown = true 
}: AnalysisSummaryProps) {
  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;
  
  // Use enhanced data structure if available, fallback to legacy format
  const kpiData = data.totals ? {
    workingDays: data.totals.workingDays,
    totalConsignments: data.totals.totalConsignments,
    expectedTotal: data.totals.expectedTotal,
    paidTotal: data.totals.paidTotal,
    differenceTotal: data.totals.differenceTotal,
    baseTotal: data.totals.baseTotal,
    bonusTotal: data.totals.bonusTotal,
    pickupTotal: data.totals.pickupTotal,
    averageDaily: data.averageDaily,
    overallStatus: data.overallStatus
  } : {
    workingDays: data.workingDays,
    totalConsignments: data.totalConsignments,
    expectedTotal: data.totalExpected,
    paidTotal: data.totalActual,
    differenceTotal: data.difference,
    baseTotal: data.totalExpected * 0.6, // Rough estimate for legacy data
    bonusTotal: data.totalExpected * 0.4, // Rough estimate for legacy data
    pickupTotal: 0,
    averageDaily: data.averageDaily,
    overallStatus: data.difference >= 0 ? 'Payment Complete - Favorable' : 'Payment Incomplete - Review Required'
  };

  const isDifferencePositive = data.difference >= 0;
  const differenceIcon = isDifferencePositive ? '📈' : '📉';
  const differenceColor = isDifferencePositive ? 'text-green-600' : 'text-red-600';
  const differenceBgColor = isDifferencePositive ? 'bg-green-50' : 'bg-red-50';

  // Week report handler
  const handleWeekReportClick = async (weekData: WeekCalculation) => {
    try {
      const { generateUUID } = await import('@/lib/utils');
      WeekReportGenerator.viewWeekReport(weekData, generateUUID());
      toast.success('Week report opened in new tab');
    } catch (error) {
      console.error('Failed to generate week report:', error);
      toast.error('Failed to generate week report');
    }
  };

  // Export handler function
  const handleExport = async (format: 'csv' | 'json' | 'print') => {
    if (!data.days || !data.totals) {
      console.warn('Export attempted without complete data');
      return;
    }

    const exportData: ExportData = {
      totals: data.totals,
      weeks: data.weeks || [],
      days: data.days,
      metadata: {
        exportDate: new Date().toISOString(),
        analysisId: await import('@/lib/utils').then(m => m.generateUUID()),
        period: 'Current Analysis Period',
        rulesVersion: '9.0.0'
      }
    };

    switch (format) {
      case 'csv':
        const csvContent = exportToCSV(exportData);
        const csvFilename = generateExportFilename(exportData.metadata, 'csv');
        downloadFile(csvContent, csvFilename, 'text/csv');
        break;
        
      case 'json':
        const jsonContent = exportToJSON(exportData);
        const jsonFilename = generateExportFilename(exportData.metadata, 'json');
        downloadFile(jsonContent, jsonFilename, 'application/json');
        break;
        
      case 'print':
        const htmlContent = exportToHTML(exportData);
        printHTML(htmlContent);
        break;
    }
  };

  return (
    <div className="analysis-summary space-y-8">
      {/* Analysis Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysis Complete</h2>
        <p className="text-slate-600">Your payment data has been processed successfully</p>
      </div>

      {/* KPI Section */}
      <KPISection data={kpiData} />
      
      {/* Weekly Breakdown - only show if detailed data available */}
      {showDetailedBreakdown && data.weeks && data.weeks.length > 0 && (
        <div className="weekly-breakdown-section">
          <WeeklyBreakdown 
            weeklyData={data.weeks} 
            onWeekReportClick={handleWeekReportClick}
            defaultExpanded={true}
          />
        </div>
      )}

      {/* Legacy Summary Cards - fallback when detailed data not available */}
      {(!showDetailedBreakdown || !data.weeks || data.weeks.length === 0) && (
        <div className="legacy-summary">
          <h3 className="summary-title text-lg font-semibold text-slate-900 mb-6">Quick Summary</h3>
          
          <div className="summary-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Total Actual */}
            <div className="summary-card bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-600">Total Actual</h4>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(data.totalActual)}</div>
              <p className="text-xs text-slate-500 mt-1">Amount earned this period</p>
            </div>

            {/* Total Expected */}
            <div className="summary-card bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-600">Total Expected</h4>
                <span className="text-2xl">🎯</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(data.totalExpected)}</div>
              <p className="text-xs text-slate-500 mt-1">Projected earnings</p>
            </div>

            {/* Difference */}
            <div className={`summary-card ${differenceBgColor} rounded-xl p-6 border border-slate-200 shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-600">Difference</h4>
                <span className="text-2xl">{differenceIcon}</span>
              </div>
              <div className={`text-2xl font-bold ${differenceColor}`}>
                {isDifferencePositive ? '+' : ''}{formatCurrency(data.difference)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isDifferencePositive ? 'Above expected' : 'Below expected'}
              </p>
            </div>

            {/* Working Days */}
            <div className="summary-card bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-600">Working Days</h4>
                <span className="text-2xl">📅</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{data.workingDays}</div>
              <p className="text-xs text-slate-500 mt-1">Days with earnings</p>
            </div>

            {/* Total Consignments */}
            <div className="summary-card bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-600">Total Deliveries</h4>
                <span className="text-2xl">📦</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{data.totalConsignments}</div>
              <p className="text-xs text-slate-500 mt-1">Consignments delivered</p>
            </div>

            {/* Daily Average */}
            <div className="summary-card bg-blue-50 rounded-xl p-6 border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-600">Daily Average</h4>
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(data.averageDaily)}</div>
              <p className="text-xs text-slate-500 mt-1">Average per working day</p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Actions */}
      <div className="analysis-actions">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="text-center">
            <div className="space-y-4">
              {/* Main Action Buttons */}
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={onViewReport}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  View Detailed Report
                </button>
                <button 
                  onClick={onNewAnalysis}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Start New Analysis
                </button>
              </div>
              
              {/* Export Options */}
              {(data.days || data.weeks) && (
                <div className="border-t pt-4">
                  <div className="text-center mb-3">
                    <span className="text-sm font-medium text-slate-600">Export Options</span>
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <button 
                      onClick={() => handleExport('csv')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                      CSV
                    </button>
                    <button 
                      onClick={() => handleExport('json')}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      JSON
                    </button>
                    <button 
                      onClick={() => handleExport('print')}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 6 2 18 2 18 9"/>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                      </svg>
                      Print
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}