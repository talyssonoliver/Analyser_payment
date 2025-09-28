/**
 * Step3Container Component
 *
 * Extracts all Step 3 analysis logic from the main analysis page.
 * Handles analysis processing, payment calculations, PDF processing workflow,
 * progress tracking, and inline report modal management.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Step3AnalyzeSectionV2,
  InlineReportModal,
  useProgressOverlay,
  ProgressOverlay
} from '@/components/analysis';
import { Step3AnalysisService, Step3AnalysisData } from '@/lib/services/step3-analysis-service';
import { AnalysisStorageService } from '@/lib/services/analysis-storage-service';
import { SessionRecoveryService } from '@/lib/services/session-recovery-service';
import { toast } from '@/lib/utils/toast';
import { ProcessingResult } from '@/lib/infrastructure/pdf/pdf-processor';
import { DayCalculation } from '@/lib/services/payment-calculation-service';
import { RunsheetData } from '@/lib/infrastructure/pdf/runsheet-parser';

// Type definitions for component state and processing
interface DailyEntry {
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
}

interface AnalysisSummary {
  totalActual: number;
  totalExpected: number;
  workingDays: number;
  totalConsignments: number;
  averageDaily: number;
  difference: number;
}

interface Step3ContainerProps {
  files: File[];
  entries: any[];
  inputMethod: 'upload' | 'manual';
  onNewAnalysis: () => void;
  onViewReport: () => void;
  onError: (error: string) => void;
  onSetStep: (step: number) => void;
  onAnalysisStarted: () => void;
  showAnalyzeSection: boolean;
}

export function Step3Container({
  files,
  entries,
  inputMethod,
  onNewAnalysis,
  onViewReport,
  onError,
  onSetStep,
  onAnalysisStarted,
  showAnalyzeSection
}: Step3ContainerProps) {
  const router = useRouter();

  // Progress overlay
  const {
    isVisible: progressVisible,
    startProgress,
    completeProgress,
    hideProgress,
    progressService
  } = useProgressOverlay();

  // Step 3 analysis state
  const [step3AnalysisData, setStep3AnalysisData] = useState<Step3AnalysisData | null>(null);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  // Inline report modal state
  const [showInlineReport, setShowInlineReport] = useState(false);

  // Helper function to process individual runsheet data
  const processRunsheetData = (runsheet: { parseResult: { success: boolean; data?: RunsheetData; error?: string } }, dailyData: Record<string, DailyEntry>) => {
    if (!runsheet.parseResult.success || !runsheet.parseResult.data) {
      console.error('❌ Runsheet parsing failed:', runsheet.parseResult?.error);
      return;
    }

    const data = runsheet.parseResult.data;
    console.log('✅ Runsheet data:', data);

    const createDailyEntry = (date: string): DailyEntry => ({
      consignments: 0,
      basePayment: 0,
      expectedTotal: 0,
      paidAmount: 0,
      unloadingBonus: 0,
      attendanceBonus: 0,
      earlyBonus: 0,
      pickups: 0,
      pickupTotal: 0,
      rate: new Date(date).getDay() === 6 ? 3.00 : 2.00,
      status: 'complete'
    });

    // Handle consignmentsByDate Map from runsheet parser
    if (data.consignmentsByDate instanceof Map) {
      data.consignmentsByDate.forEach((count, dateStr) => {
        console.log(`📅 Processing date ${dateStr} with ${count} consignments`);
        const date = dateStr;
        if (!dailyData[date]) {
          dailyData[date] = createDailyEntry(date);
        }
        dailyData[date].consignments += count;
      });
    } else if (data.details && Array.isArray(data.details)) {
      // Alternative format: data has details array
      data.details.forEach((detail) => {
        if (detail.date && detail.consignments > 0) {
          const date = detail.date instanceof Date ? detail.date.toISOString().split('T')[0] : detail.date;
          console.log(`📅 Processing date ${date} with ${detail.consignments} consignments from details`);

          if (!dailyData[date]) {
            dailyData[date] = createDailyEntry(date);
          }
          dailyData[date].consignments += detail.consignments;
        }
      });
    } else if (data.dates && data.dates.length > 0) {
      // Fallback: use first date from dates array with total consignments
      const firstDate = data.dates[0];
      const date = firstDate instanceof Date ? firstDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      console.log(`📅 Processing fallback format date ${date} with ${data.totalConsignments} total consignments`);

      if (!dailyData[date]) {
        dailyData[date] = createDailyEntry(date);
      }
      dailyData[date].consignments += data.totalConsignments || 0;
    }
  };

  // Convert processed PDF files to daily data format
  const convertProcessedFilesToDailyData = (processingResult: ProcessingResult): Record<string, DailyEntry> => {
    const dailyData: Record<string, DailyEntry> = {};

    console.log('🔍 Processing result structure:', {
      runsheets: processingResult.runsheets?.length || 0,
      invoices: processingResult.invoices?.length || 0,
      errors: processingResult.errors?.length || 0,
      runsheetDetails: processingResult.runsheets?.map((r) => ({
        success: r.parseResult?.success,
        error: r.parseResult?.error,
        hasData: !!r.parseResult?.data
      }))
    });

    // Process runsheets for consignment data
    if (processingResult.runsheets && Array.isArray(processingResult.runsheets)) {
      processingResult.runsheets.forEach((runsheet) => {
        console.log('📄 Processing runsheet:', {
          fileName: runsheet.file?.name,
          success: runsheet.parseResult?.success,
          error: runsheet.parseResult?.error,
          dataKeys: runsheet.parseResult?.data ? Object.keys(runsheet.parseResult.data) : 'No data'
        });

        processRunsheetData(runsheet, dailyData);
      });
    }

    // Process invoices for payment data
    if (processingResult.invoices && Array.isArray(processingResult.invoices)) {
      processingResult.invoices.forEach((invoice) => {
        if (invoice.parseResult.success && invoice.parseResult.data) {
          const data = invoice.parseResult.data;
          // Check if entries exist and is an array
          if (!data.entries || !Array.isArray(data.entries)) {
            console.warn('⚠️ Invoice data missing entries array:', data);
            return;
          }

          data.entries.forEach((entry: { date: string | Date; amount: number }) => {
            const date = entry.date instanceof Date
              ? entry.date.toISOString().split('T')[0]
              : (entry.date || new Date().toISOString().split('T')[0]);

            if (!dailyData[date]) {
              dailyData[date] = {
                consignments: 0,
                basePayment: 0,
                expectedTotal: 0,
                paidAmount: 0,
                unloadingBonus: 0,
                attendanceBonus: 0,
                earlyBonus: 0,
                pickups: 0,
                pickupTotal: 0,
                rate: new Date(date).getDay() === 6 ? 3.00 : 2.00,
                status: 'complete'
              };
            }

            dailyData[date].paidAmount += entry.amount || 0;
          });
        }
      });
    }

    // Calculate expected values based on consignments and rates
    Object.keys(dailyData).forEach(date => {
      const entry = dailyData[date];
      const dayOfWeek = new Date(date).getDay();

      // Calculate base payment
      entry.basePayment = entry.consignments * entry.rate;

      // Calculate bonuses based on day
      if (dayOfWeek !== 0) { // Not Sunday
        if (dayOfWeek !== 1) { // Not Monday
          entry.unloadingBonus = 30.00;
        }
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Weekdays
          entry.attendanceBonus = 25.00;
          entry.earlyBonus = 50.00;
        }
      }

      // Calculate expected total
      entry.expectedTotal = entry.basePayment + entry.unloadingBonus + entry.attendanceBonus + entry.earlyBonus + entry.pickupTotal;
    });

    console.log('📊 Final daily data generated:', dailyData);
    console.log('📊 Daily data keys count:', Object.keys(dailyData).length);

    return dailyData;
  };

  // Generate summary from daily data
  const generateAnalysisSummaryFromDailyData = (dailyData: Record<string, DailyEntry>): AnalysisSummary => {
    const entries = Object.values(dailyData);
    const totalActual = entries.reduce((sum: number, entry) => sum + (entry.paidAmount || 0), 0);
    const totalExpected = entries.reduce((sum: number, entry) => sum + (entry.expectedTotal || 0), 0);
    const totalConsignments = entries.reduce((sum: number, entry) => sum + (entry.consignments || 0), 0);
    const workingDays = entries.length;
    const averageDaily = workingDays > 0 ? totalActual / workingDays : 0;
    const difference = totalActual - totalExpected;

    return {
      totalActual,
      totalExpected,
      workingDays,
      totalConsignments,
      averageDaily,
      difference
    };
  };

  // Process uploaded PDF files (internal helper)
  const processUploadedFilesInternal = async (paymentService: { processDailyData: (data: Record<string, DailyEntry>) => DayCalculation[] }) => {
    // Stage 3: Reading PDFs
    progressService.advanceToStage(2, `Reading ${files.length} PDF file(s)...`);

    toast.info(`Processing ${files.length} PDF file(s)...`);
    console.log('Starting PDF processing for files:', files.map(f => f.name));

    // Import PDF processor
    const { PDFProcessor } = await import('@/lib/infrastructure/pdf/pdf-processor');
    const processor = new PDFProcessor();

    // Stage 4: Extracting Data
    progressService.advanceToStage(3, 'Extracting consignment and payment data...');

    console.log('Processing files with PDF processor...');
    const processingResult = await processor.processFiles(files);
    console.log('Processing result:', processingResult);

    // Validate results
    const validation = processor.validateFileSet(processingResult);
    if (!validation.isValid) {
      throw new Error(`Analysis failed: ${validation.errors.join(', ')}`);
    }

    validation.warnings.forEach(warning => toast.warning(warning));

    // Stage 5: Processing
    progressService.advanceToStage(4, 'Converting extracted data to daily format...');

    const dailyData = convertProcessedFilesToDailyData(processingResult);

    if (Object.keys(dailyData).length === 0) {
      throw new Error('No data could be extracted from the uploaded files. Please ensure you have valid runsheet and invoice PDFs.');
    }

    // Stage 6: Validating
    progressService.advanceToStage(5, 'Validating extracted data and calculations...');

    const dayCalculations = paymentService.processDailyData(dailyData);

    toast.success(`Successfully processed ${processingResult.summary.successfulFiles} files and extracted ${Object.keys(dailyData).length} days of data`);

    return { dailyData, dayCalculations };
  };

  // Process manual entries (internal helper)
  const processManualEntriesInternal = (paymentService: { calculateDayPayment: (date: string, consignments: number, totalPay: number, pickups: number, pickupTotal: number) => DayCalculation }) => {
    const dayCalculations = entries.map(entry =>
      paymentService.calculateDayPayment(
        entry.date,
        entry.consignments,
        entry.totalPay,
        entry.pickups || 0,
        (entry.pickups || 0) * 5
      )
    );

    const dailyData: Record<string, DailyEntry> = {};
    entries.forEach(entry => {
      dailyData[entry.date] = {
        consignments: entry.consignments,
        basePayment: entry.baseAmount,
        expectedTotal: entry.totalPay,
        paidAmount: entry.totalPay,
        unloadingBonus: entry.unloadingBonus || 0,
        attendanceBonus: entry.attendanceBonus || 0,
        earlyBonus: entry.earlyArrive || 0,
        pickups: entry.pickups || 0,
        pickupTotal: (entry.pickups || 0) * 5,
        rate: entry.day === 'Saturday' ? 3.00 : 2.00,
        status: 'complete'
      };
    });

    return { dailyData, dayCalculations };
  };

  // Finalize analysis and save results (internal helper)
  const finalizeAnalysis = async (analysisId: string, weekStart: Date, dailyData: Record<string, DailyEntry>, dayCalculations: DayCalculation[], paymentService: { generateAnalysisSummary: (calculations: DayCalculation[]) => unknown; validateCalculations: (calculations: DayCalculation[]) => { isValid: boolean; errors: string[]; warnings: string[] } }) => {
    // Stage 7: Calculating
    progressService.advanceToStage(6, 'Calculating payment totals and differences...');

    const analysisResult = paymentService.generateAnalysisSummary(dayCalculations);
    const validation = paymentService.validateCalculations(dayCalculations);

    if (!validation.isValid) {
      throw new Error(`Calculation errors: ${validation.errors.join(', ')}`);
    }

    validation.warnings.forEach((warning) => toast.warning(warning));

    const summary = generateAnalysisSummaryFromDailyData(dailyData);

    const analysisData = {
      id: analysisId,
      period: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      status: 'completed',
      createdAt: new Date().toISOString(),
      totalDays: Object.keys(dailyData).length,
      dailyData,
      source: files.length > 0 ? 'upload' : 'manual',
      summary,
      files: files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      })),
      enhanced: { dayCalculations, analysisResult, validation },
      // Add Step 3 UI compatible structure
      totals: {
        paidTotal: summary.totalActual,
        expectedTotal: summary.totalExpected,
        workingDays: summary.workingDays,
        differenceTotal: summary.difference,
        totalConsignments: summary.totalConsignments
      },
      results: dayCalculations
    };

    // Stage 8: Generating Report
    progressService.advanceToStage(7, 'Generating final analysis report...');

    AnalysisStorageService.saveAnalysis(analysisId, analysisData);

    // Update Step 3 display with the analysis results
    setStep3AnalysisData(analysisData as unknown as Step3AnalysisData);

    SessionRecoveryService.clearSession();
    progressService.complete();

    setTimeout(() => {
      completeProgress();
      toast.success('Analysis completed!');
      setTimeout(() => hideProgress(), 2000);
    }, 1000);
  };

  // Enhanced analysis handler - processes both files and manual entries with proper payment calculations
  const handleStartAnalysis = async () => {
    // Start progress tracking
    startProgress();

    try {
      // Stage 1: Initialization
      progressService.advanceToStage(0, 'Preparing analysis environment...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 2: Loading Rules
      progressService.advanceToStage(1, 'Loading payment calculation rules...');
      await new Promise(resolve => setTimeout(resolve, 300));

      toast.success('Starting analysis...');
      onAnalysisStarted();

      const analysisId = `analysis-${Date.now()}`;
      const currentDate = new Date();
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday

      // Import payment calculation service
      const { PaymentCalculationService } = await import('@/lib/services/payment-calculation-service');
      const paymentService = new PaymentCalculationService();

      let dailyData: Record<string, DailyEntry> = {};
      let dayCalculations: DayCalculation[] = [];

      // Process files if uploaded
      if (files.length > 0) {
        const fileResults = await processUploadedFilesInternal(paymentService);
        dailyData = { ...dailyData, ...fileResults.dailyData };
        dayCalculations = [...dayCalculations, ...fileResults.dayCalculations];
      }

      // Process manual entries if any
      if (entries.length > 0) {
        const manualResults = processManualEntriesInternal(paymentService);
        dailyData = { ...dailyData, ...manualResults.dailyData };
        dayCalculations = [...dayCalculations, ...manualResults.dayCalculations];
      }

      // Generate and save analysis
      await finalizeAnalysis(analysisId, weekStart, dailyData, dayCalculations, paymentService);

    } catch (error) {
      console.error('Analysis error:', error);
      progressService.abort(error instanceof Error ? error.message : 'Unknown error occurred');
      onError(error instanceof Error ? error.message : 'Unknown error');
      setTimeout(() => hideProgress(), 3000);
    }
  };

  // Process and update Step 3 analysis data
  const updateStep3Analysis = useCallback(async () => {
    try {
      const analysisInput = {
        inputMethod,
        files,
        manualEntries: entries
      };

      const analysisData = await Step3AnalysisService.processAnalysis(analysisInput);
      setStep3AnalysisData(analysisData);
      setIsAnalysisComplete(!!analysisData);
    } catch (error) {
      console.error('Failed to update Step 3 analysis:', error);
      setStep3AnalysisData(null);
      setIsAnalysisComplete(false);
    }
  }, [inputMethod, files, entries]);

  // Handle Step 3 new analysis request
  const handleStep3NewAnalysis = () => {
    console.log('🔄 handleStep3NewAnalysis: Starting new analysis workflow');
    onNewAnalysis();
    onSetStep(1);
    setStep3AnalysisData(null);
    setIsAnalysisComplete(false);

    SessionRecoveryService.clearSession();
    toast.success('Ready for new analysis');
    console.log('🔄 handleStep3NewAnalysis: New analysis started, step set to 1');
  };

  // Handle Step 3 view detailed report
  const handleStep3ViewDetailedReport = () => {
    console.log('📊 handleStep3ViewDetailedReport: Opening inline detailed report');

    // Show inline report modal instead of navigating to separate page
    // This matches the legacy behavior of immediate report rendering
    setShowInlineReport(true);
    console.log('📊 Inline report modal opened');
  };

  // Handle navigation to full reports page (fallback option)
  const handleNavigateToReports = () => {
    console.log('📊 handleNavigateToReports: Navigating to full reports page');
    onViewReport();
    router.push('/reports');
  };

  // Update Step 3 analysis when data changes
  useEffect(() => {
    if (showAnalyzeSection && (entries.length > 0 || files.length > 0)) {
      updateStep3Analysis();
    }
  }, [showAnalyzeSection, entries, files, inputMethod, updateStep3Analysis]);

  return (
    <>
      {/* Progress Overlay */}
      <ProgressOverlay
        isVisible={progressVisible}
        onComplete={hideProgress}
        onError={(error) => {
          onError(error);
          hideProgress();
        }}
      />

      {/* Step 3: Analyze Section */}
      {showAnalyzeSection && (
        <Step3AnalyzeSectionV2
          lastAnalysisData={step3AnalysisData}
          manualEntries={entries}
          currentInputMethod={inputMethod}
          onSetStep={onSetStep}
          onStartNewAnalysis={handleStep3NewAnalysis}
          onViewDetailedReport={handleStep3ViewDetailedReport}
          className="active"
        />
      )}

      {/* Inline Report Modal */}
      <InlineReportModal
        isOpen={showInlineReport}
        onClose={() => setShowInlineReport(false)}
        onNavigateToReports={handleNavigateToReports}
        manualEntries={entries.map(entry => ({
          date: entry.date,
          consignments: entry.consignments,
          expectedTotal: entry.totalPay,
          paidAmount: entry.totalPay
        }))}
        inputMethod={inputMethod}
      />
    </>
  );
}