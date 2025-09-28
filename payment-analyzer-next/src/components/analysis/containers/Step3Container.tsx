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
import { SessionRecoveryService } from '@/lib/services/session-recovery-service';
import { toast } from '@/lib/utils/toast';

// Type definitions for component state and processing


interface ManualEntry {
  id: number;
  date: string;
  day: string;
  consignments: number;
  baseAmount: number;
  totalPay: number;
  pickups: number;
  earlyArrive: number;
  attendanceBonus: number;
  unloadingBonus: number;
}

interface Step3ContainerProps {
  files: File[];
  entries: ManualEntry[];
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
  showAnalyzeSection
}: Step3ContainerProps) {
  const router = useRouter();

  // Progress overlay
  const {
    isVisible: progressVisible,
    hideProgress,
  } = useProgressOverlay();

  // Step 3 analysis state
  const [step3AnalysisData, setStep3AnalysisData] = useState<Step3AnalysisData | null>(null);

  // Inline report modal state
  const [showInlineReport, setShowInlineReport] = useState(false);








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
    } catch (error) {
      console.error('Failed to update Step 3 analysis:', error);
      setStep3AnalysisData(null);
    }
  }, [inputMethod, files, entries]);

  // Handle Step 3 new analysis request
  const handleStep3NewAnalysis = () => {
    console.log('🔄 handleStep3NewAnalysis: Starting new analysis workflow');
    onNewAnalysis();
    onSetStep(1);
    setStep3AnalysisData(null);

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