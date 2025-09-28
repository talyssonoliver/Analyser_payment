/**
 * Inline Report Modal Component
 * Renders detailed analysis reports immediately without navigation
 * Matches legacy generateAnalysisDataForReports() + renderReport() behavior
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui';
import { ExportModal } from '@/components/export/export-modal';
import { InlineReportGenerator, type InlineReportData } from '@/lib/services/inline-report-generator';
import type { AnalysisWithDetails, AnalysisTotalRecord } from '@/lib/repositories/analysis-repository';
import type { LocalStorageExportData } from '@/lib/services/export-service';
import { AnalysisStorageService } from '@/lib/services/analysis-storage-service';
import { analysisRepository } from '@/lib/repositories/analysis-repository';
import { useAuth } from '@/lib/providers/auth-provider';
import { toast } from '@/lib/utils/toast';
import { X, ExternalLink, Download, Printer } from 'lucide-react';
import { AnalysisStatus } from '@/lib/constants';
import { StringKeyObject, AnalysisSource, AnalysisMetadata } from '@/types/core';

type DailyEntryStatus = 'balanced' | 'overpaid' | 'underpaid';

interface LocalAnalysisData extends StringKeyObject {
  id: string;
  createdAt: string;
  status?: string;
  period?: string;
  totalFiles?: number;
  totalDays?: number;
  dailyData?: Record<string, {
    consignments?: number;
    rate?: number;
    basePayment?: number;
    pickups?: number;
    pickupTotal?: number;
    unloadingBonus?: number;
    attendanceBonus?: number;
    earlyBonus?: number;
    expectedTotal?: number;
    paidAmount?: number;
    status?: string;
  }>;
  summary?: {
    workingDays?: number;
    totalConsignments?: number;
    totalExpected?: number;
    totalActual?: number;
    difference?: number;
  };
  totals?: {
    base_total?: number;
    pickup_total?: number;
    bonus_total?: number;
    expected_total?: number;
    paid_total?: number;
    difference_total?: number;
  };
}

interface InlineReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToReports?: () => void;
  // Optional analysis data - if not provided, will load latest
  analysisData?: AnalysisWithDetails | null;
  // Optional manual entries for direct generation
  manualEntries?: Array<{
    date: string;
    consignments: number;
    expectedTotal: number;
    paidAmount?: number;
  }>;
  // Input method context
  inputMethod?: 'manual' | 'upload';
}

export function InlineReportModal({
  isOpen,
  onClose,
  onNavigateToReports,
  analysisData,
  manualEntries,
  inputMethod = 'upload'
}: InlineReportModalProps) {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<InlineReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<LocalStorageExportData | null>(null);
  const [compactView, setCompactView] = useState(false);

  const loadLatestAnalysis = useCallback(async (): Promise<AnalysisWithDetails | null> => {
    // First try to load from local storage (session-based analysis)
    const localAnalysesRecord = AnalysisStorageService.loadAnalyses();
    const localAnalyses = Object.values(localAnalysesRecord)
      .filter((item): item is LocalAnalysisData =>
        item && typeof item === 'object' && 'id' in item && 'createdAt' in item
      )
      .sort((a, b) =>
        new Date(b.createdAt || '1970-01-01').getTime() - new Date(a.createdAt || '1970-01-01').getTime()
      );

    if (localAnalyses.length > 0) {
      const latestLocal = localAnalyses[0]; // Already sorted by date
      console.log('📊 Inline Report: Found local analysis');
      return transformLocalStorageAnalysis(latestLocal);
    }

    // Then try database if user is authenticated
    if (user?.id) {
      const { data: analyses, error } = await analysisRepository.getUserAnalyses(user.id, {
        limit: 1,
        orderBy: 'created_at',
        order: 'desc'
      });

      if (!error && analyses && analyses.length > 0) {
        const { data, error: detailError } = await analysisRepository.getAnalysisById(analyses[0].id);
        if (!detailError && data) {
          console.log('📊 Inline Report: Found database analysis');
          return data;
        }
      }
    }

    return null;
  }, [user?.id]);

  const transformLocalStorageAnalysis = (localAnalysis: LocalAnalysisData): AnalysisWithDetails | null => {
    if (!localAnalysis) return null;

    const dailyEntries = localAnalysis.dailyData ? Object.entries(localAnalysis.dailyData).map(([date, data]) => ({
      id: '',
      analysis_id: localAnalysis.id,
      date,
      day_of_week: new Date(date).getDay(),
      consignments: data.consignments || 0,
      rate: data.rate || 0,
      base_payment: data.basePayment || 0,
      pickups: data.pickups || 0,
      pickup_total: data.pickupTotal || 0,
      unloading_bonus: data.unloadingBonus || 0,
      attendance_bonus: data.attendanceBonus || 0,
      early_bonus: data.earlyBonus || 0,
      expected_total: data.expectedTotal || 0,
      paid_amount: data.paidAmount || 0,
      difference: (data.paidAmount || 0) - (data.expectedTotal || 0),
      status: 'completed' as DailyEntryStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: ''
    })) : [];

    return {
      id: localAnalysis.id,
      user_id: '',
      fingerprint: '',
      source: 'upload' as AnalysisSource,
      status: 'completed' as AnalysisStatus,
      period_start: localAnalysis.createdAt || new Date().toISOString(),
      period_end: localAnalysis.createdAt || new Date().toISOString(),
      rules_version: 1,
      working_days: localAnalysis.summary?.workingDays || 0,
      total_consignments: localAnalysis.summary?.totalConsignments || 0,
      metadata: {} as AnalysisMetadata,
      created_at: localAnalysis.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      daily_entries: dailyEntries,
      analysis_totals: localAnalysis.summary ? {
        id: '',
        analysis_id: localAnalysis.id,
        base_total: localAnalysis.summary.totalExpected || 0,
        pickup_total: 0,
        bonus_total: 0,
        expected_total: localAnalysis.summary.totalExpected || 0,
        paid_total: localAnalysis.summary.totalActual || 0,
        difference_total: localAnalysis.summary.difference || 0,
        created_at: new Date().toISOString()
      } as AnalysisTotalRecord : undefined
    };
  };

  // Load and generate report data when modal opens
  const generateReportDataCallback = useCallback(async () => {
    setLoading(true);
    try {
      let generatedReportData: InlineReportData;

      // Priority 1: Use provided manual entries for immediate generation
      if (manualEntries && manualEntries.length > 0 && inputMethod === 'manual') {
        console.log('📊 Inline Report: Generating from manual entries');
        generatedReportData = InlineReportGenerator.generateFromManualEntries(manualEntries);
      }
      // Priority 2: Use provided analysis data
      else if (analysisData) {
        console.log('📊 Inline Report: Generating from provided analysis data');
        generatedReportData = InlineReportGenerator.generateFromDatabaseAnalysis(analysisData);
      }
      // Priority 3: Load latest analysis from storage
      else {
        console.log('📊 Inline Report: Loading latest analysis');
        const latestAnalysis = await loadLatestAnalysis();
        if (latestAnalysis) {
          generatedReportData = InlineReportGenerator.generateFromDatabaseAnalysis(latestAnalysis);
        } else {
          // Fallback to empty report
          generatedReportData = InlineReportGenerator.generateEmptyReport();
        }
      }

      setReportData(generatedReportData);
      console.log('📊 Inline Report: Report data generated successfully');
    } catch (error) {
      console.error('📊 Inline Report: Error generating report data:', error);
      toast.error('Failed to generate report');
      setReportData(InlineReportGenerator.generateEmptyReport());
    } finally {
      setLoading(false);
    }
  }, [manualEntries, inputMethod, analysisData, loadLatestAnalysis]);

  useEffect(() => {
    if (isOpen) {
      generateReportDataCallback();
    }
  }, [isOpen, generateReportDataCallback]);



  const handleExport = () => {
    if (!reportData) return;

    const exportAnalysisData: LocalStorageExportData = {
      analysisId: `inline-report-${new Date().getTime()}`,
      period: reportData.metadata.period || 'Unknown Period',
      createdAt: reportData.metadata.createdAt,
      totalDays: reportData.totals.workingDays,
      summary: {
        totalActual: reportData.totals.paidTotal,
        totalExpected: reportData.totals.expectedTotal,
        workingDays: reportData.totals.workingDays,
        totalConsignments: reportData.totals.totalConsignments,
        averageDaily: reportData.totals.averageDaily,
        difference: reportData.totals.totalDifference
      },
      dailyData: reportData.results.reduce((acc, entry) => {
        acc[entry.date] = {
          consignments: entry.consignments,
          basePayment: entry.basePayment,
          expectedTotal: entry.expectedTotal,
          paidAmount: entry.paidAmount,
          unloadingBonus: entry.unloadingBonus,
          attendanceBonus: entry.attendanceBonus,
          earlyBonus: entry.earlyBonus,
          pickups: entry.pickupCount,
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
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      complete: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overpaid: 'bg-blue-100 text-blue-800',
      underpaid: 'bg-red-100 text-red-800',
      balanced: 'bg-green-100 text-green-800'
    };

    const labels = {
      complete: 'Complete',
      completed: 'Complete',
      pending: 'Pending',
      overpaid: 'Overpaid',
      underpaid: 'Underpaid',
      balanced: 'Balanced'
    };

    const style = styles[status as keyof typeof styles] || styles.pending;
    const label = labels[status as keyof typeof labels] || status;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
        {label}
      </span>
    );
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60000]"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-[60001] overflow-hidden">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Payment Analysis Report</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {loading ? 'Generating report...' : (reportData?.metadata.period || 'No data available')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Action Buttons */}
                  <button
                    onClick={handleExport}
                    disabled={loading || !reportData}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Export Report"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={loading || !reportData}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Print Report"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  {onNavigateToReports && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToReports();
                      }}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Open in Reports Page"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Close Report"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Generating your report...</p>
                  </div>
                </div>
              ) : !reportData || reportData.totals.workingDays === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M7 13v4M11 10v7M15 7v10"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Report Data Available</h3>
                    <p className="text-slate-600 mb-4">Complete an analysis to view your financial report</p>
                    <button
                      onClick={onClose}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Report Header */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs opacity-70 uppercase tracking-wide">Period</div>
                        <div className="font-semibold">{reportData.metadata.periodRange || reportData.metadata.period}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-70 uppercase tracking-wide">Generated</div>
                        <div className="font-semibold">{new Date(reportData.metadata.createdAt).toLocaleDateString('en-GB')}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-70 uppercase tracking-wide">Total Days</div>
                        <div className="font-semibold">{reportData.totals.workingDays}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-70 uppercase tracking-wide">Status</div>
                        <div className="font-semibold">{reportData.metadata.overallStatus || 'BALANCED'}</div>
                      </div>
                    </div>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="text-sm font-medium text-slate-600 mb-1">Expected Total</div>
                      <div className="text-2xl font-bold text-slate-900">£{reportData.totals.expectedTotal.toFixed(2)}</div>
                      <div className="text-xs text-slate-500">Total earnings</div>
                    </Card>

                    <Card className="p-4">
                      <div className="text-sm font-medium text-slate-600 mb-1">Paid Amount</div>
                      <div className="text-2xl font-bold text-slate-900">£{reportData.totals.paidTotal.toFixed(2)}</div>
                      <div className="text-xs text-slate-500">Amount received</div>
                    </Card>

                    <Card className="p-4">
                      <div className="text-sm font-medium text-slate-600 mb-1">Difference</div>
                      <div className={`text-2xl font-bold ${reportData.totals.totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        £{Math.abs(reportData.totals.totalDifference).toFixed(2)}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ${reportData.totals.totalDifference >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {reportData.totals.totalDifference >= 0 ? 'Overpaid' : 'Underpaid'}
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="text-sm font-medium text-slate-600 mb-1">Consignments</div>
                      <div className="text-2xl font-bold text-slate-900">{reportData.totals.totalConsignments}</div>
                      <div className="text-xs text-slate-500">Total deliveries</div>
                    </Card>
                  </div>

                  {/* Daily Breakdown Table */}
                  {reportData.results.length > 1 && (
                    <Card className="overflow-hidden">
                      <div className="p-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-slate-900">Daily Analysis Breakdown</h3>
                          <button
                            onClick={() => setCompactView(!compactView)}
                            className="px-3 py-1 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            {compactView ? 'Detailed View' : 'Compact View'}
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Day</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Consignments</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Rate</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Base Pay</th>
                              {!compactView && <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Bonuses</th>}
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Expected</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Paid</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Difference</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {reportData.results.map((entry) => (
                              <tr key={entry.date} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-sm font-mono text-slate-900">{entry.date}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{entry.day}</td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{entry.consignments}</td>
                                <td className="px-4 py-3 text-sm font-mono text-slate-700">£{entry.rate.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm font-mono text-slate-900">£{entry.basePayment.toFixed(2)}</td>
                                {!compactView && (
                                  <td className="px-4 py-3 text-sm font-mono text-slate-700">
                                    £{(entry.unloadingBonus + entry.attendanceBonus + entry.earlyBonus).toFixed(2)}
                                  </td>
                                )}
                                <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-900">£{entry.expectedTotal.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm font-mono text-slate-900">£{entry.paidAmount.toFixed(2)}</td>
                                <td className={`px-4 py-3 text-sm font-mono font-medium ${entry.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  £{entry.difference.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm">{getStatusBadge(entry.status)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}

                  {/* Settlement Summary */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Settlement Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-sm text-slate-600 font-medium">Base Payment</div>
                        <div className="text-lg font-bold text-slate-900">£{reportData.totals.baseTotal.toFixed(2)}</div>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-sm text-slate-600 font-medium">Pickup Services</div>
                        <div className="text-lg font-bold text-slate-900">£{reportData.totals.pickupTotal.toFixed(2)}</div>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-sm text-slate-600 font-medium">Unloading Bonus</div>
                        <div className="text-lg font-bold text-slate-900">£{reportData.totals.unloadingTotal.toFixed(2)}</div>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-sm text-slate-600 font-medium">Attendance Bonus</div>
                        <div className="text-lg font-bold text-slate-900">£{reportData.totals.attendanceTotal.toFixed(2)}</div>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-sm text-slate-600 font-medium">Early Arrival Bonus</div>
                        <div className="text-lg font-bold text-slate-900">£{reportData.totals.earlyTotal.toFixed(2)}</div>
                      </div>
                      <div className="bg-slate-900 text-white rounded-lg p-4">
                        <div className="text-sm font-medium opacity-90">Total Expected</div>
                        <div className="text-lg font-bold">£{reportData.totals.expectedTotal.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && exportData && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          analysisData={exportData}
          title="Export Inline Report"
        />
      )}
    </>
  );
}