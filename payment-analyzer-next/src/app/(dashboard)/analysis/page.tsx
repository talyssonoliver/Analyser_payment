/**
 * Analysis Page
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysisSteps } from '@/hooks/use-analysis-steps';
import { StepNavigation } from '@/components/analysis/step-navigation';
import { ManualEntry } from '@/components/analysis/manual-entry';
import { WorkflowCards } from '@/components/analysis/workflow-cards';
import { EntryCards } from '@/components/analysis/entry-cards';
import { Step3AnalyzeSectionV2 } from '@/components/analysis/step3-analyze-section-v2';
import { LegacyUploadArea } from '@/components/analysis/legacy-upload-area';
import { ValidationSystem } from '@/components/analysis/validation-badge-system';
import { ProgressOverlay, useProgressOverlay } from '@/components/analysis/progress-overlay';
import { RecoveryBanner } from '@/components/ui/recovery-banner';
import { FileValidationPanel } from '@/components/analysis/file-validation-panel';
import { FileUpdateDetector, FileUpdateInfo } from '@/components/analysis/file-update-detector';
import { InlineReportModal } from '@/components/analysis/inline-report-modal';
import { SessionRecoveryService, RecoveryBanner as RecoveryBannerType } from '@/lib/services/session-recovery-service';
import { FileFingerprintService } from '@/lib/services/file-fingerprint-service';
import { Step3AnalysisService, Step3AnalysisData } from '@/lib/services/step3-analysis-service';
import { fileValidationService, ValidationResult } from '@/lib/domain/services/file-validation-service';
import { AnalysisStorageService } from '@/lib/services/analysis-storage-service';
import { toast } from '@/lib/utils/toast';
import { BarChart, FileText, File } from 'lucide-react';
import { ProcessingResult } from '@/lib/infrastructure/pdf/pdf-processor';
import { DayCalculation } from '@/lib/services/payment-calculation-service';
import { RunsheetData } from '@/lib/infrastructure/pdf/runsheet-parser';
import '@/styles/analysis-enhanced.css';
import '@/styles/step3-enhanced-v2.css';

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



// Use actual PaymentCalculationService from services
// Import will be done dynamically when needed
export default function AnalysisPage() {
  const router = useRouter();
  
  // Session recovery state
  const [recoveryData, setRecoveryData] = useState<RecoveryBannerType | null>(null);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  
  // Progress overlay
  const {
    isVisible: progressVisible,
    startProgress,
    completeProgress,
    hideProgress,
    progressService
  } = useProgressOverlay();
  
  // File fingerprinting state - commented out unused variable
  
  // File validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [fileUpdates, setFileUpdates] = useState<FileUpdateInfo[]>([]);
  
  // Step management
  const {
    currentStep,
    totalSteps,
    inputMethod,
    uploadedFiles: hookUploadedFiles,
    manualEntries: hookManualEntries,
    setStep,
    setInputMethod,
    setUploadedFiles: setHookUploadedFiles,
    setManualEntries: setHookManualEntries,
    canProgressToStep,
    handleAnalysisStarted,
    showUploadSection,
    showValidateSection,
    showAnalyzeSection,
  } = useAnalysisSteps();

  // Local state for modals
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  
  // Step 3 analysis state
  const [step3AnalysisData, setStep3AnalysisData] = useState<Step3AnalysisData | null>(null);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  // Inline report modal state
  const [showInlineReport, setShowInlineReport] = useState(false);
  
  // Use hook's state - remove duplicate local state with useMemo to avoid dependency warnings
  const mockEntries = useMemo(() => hookManualEntries || [], [hookManualEntries]);
  const uploadedFiles = useMemo(() => hookUploadedFiles || [], [hookUploadedFiles]);
  
  // Session recovery initialization
  useEffect(() => {
    const initializeSessionRecovery = () => {
      try {
        const recovery = SessionRecoveryService.checkForRecovery();
        if (recovery) {
          setRecoveryData(recovery);
          setShowRecoveryBanner(true);
        }
      } catch (error) {
        console.error('Session recovery initialization failed:', error);
      }
    };
    
    initializeSessionRecovery();
  }, []);
  
  // Handle session recovery
  const handleSessionRestore = () => {
    if (recoveryData) {
      try {
        const restoredSession = SessionRecoveryService.restoreSession();
        
        // Restore state
        if (restoredSession?.inputMethod) {
          setInputMethod(restoredSession.inputMethod);
        }
        if (restoredSession?.currentStep) {
          setStep(restoredSession.currentStep);
        }
        if (restoredSession?.manualEntries && restoredSession.manualEntries.length > 0) {
          setHookManualEntries(restoredSession.manualEntries);
        }
        
        toast.success('Session restored successfully');
        setShowRecoveryBanner(false);
      } catch (error) {
        console.error('Session restore failed:', error);
        toast.error('Failed to restore session');
      }
    }
  };
  
  const handleSessionDismiss = () => {
    SessionRecoveryService.clearSession();
    setShowRecoveryBanner(false);
  };

  const handleManualMethodClick = () => {
    setInputMethod('manual');
    setShowManualEntryModal(true);
  };

  const handleCloseModal = useCallback(() => {
    setShowManualEntryModal(false);
    setInputMethod('upload'); // Switch back to upload method when closing
  }, [setInputMethod]);

  const handleUploadMethodClick = () => {
    setInputMethod('upload');
  };

  // Handle step navigation clicks
  const handleStepClick = (stepNumber: number) => {
    if (canProgressToStep(stepNumber)) {
      setStep(stepNumber);
      toast.success(`Switched to step ${stepNumber}`);
    } else {
      toast.warning('Complete previous steps first');
    }
  };


  // Manual entry handler
  const handleAddManualEntry = () => {
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()],
      consignments: 25,
      baseAmount: 50.00,
      totalPay: 105.00,
      pickups: 3,
      earlyArrive: 50.00,
      attendanceBonus: 25.00,
      unloadingBonus: 30.00
    };
    const updatedEntries = [...mockEntries, newEntry];
    setHookManualEntries(updatedEntries);
    setShowManualEntryModal(false);
    toast.success('Manual entry added!');
  };

  // Handle editing an entry
  const handleEditEntry = (entryId: number) => {
    const entryToEdit = mockEntries.find(entry => entry.id === entryId);
    if (entryToEdit) {
      // For now, show modal with entry data - full edit implementation would require form state management
      setShowManualEntryModal(true);
      toast.info(`Editing entry for ${entryToEdit.date}`);
    }
  };

  // Get button text based on current state
  const getButtonText = () => {
    if (uploadedFiles.length > 0) return 'Analyze Documents';
    if (mockEntries.length > 0) return 'Analyze Entries';
    return 'Add Data First';
  };

  // Get file type icon based on filename
  const getFileTypeIcon = (filename: string) => {
    if (filename.toLowerCase().includes('runsheet')) {
      return <BarChart className="w-5 h-5 text-blue-600" />;
    }
    if (filename.toLowerCase().includes('invoice')) {
      return <FileText className="w-5 h-5 text-green-600" />;
    }
    return <File className="w-5 h-5 text-gray-600" />;
  };

  // Get file type label based on filename
  const getFileTypeLabel = (filename: string) => {
    if (filename.toLowerCase().includes('runsheet')) return 'Runsheet';
    if (filename.toLowerCase().includes('invoice')) return 'Invoice';
    return 'Document';
  };

  // Handle file upload with fingerprinting
  const handleFilesUploaded = async (files: File[]) => {
    try {
      // Generate fingerprints for duplicate detection
      const newHashes: Record<string, string> = {};
      for (const file of files) {
        const hash = await FileFingerprintService.generateHash(file);
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        newHashes[key] = hash;
      }
      
      // Check for duplicates
      const validation = await FileFingerprintService.validateFileSet(files);
      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
        return;
      }
      
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => toast.warning(warning));
      }
      
      // File hashes tracking removed - keeping for future use
      // Store file hashes for future validation
      console.debug('Generated file hashes:', newHashes);
      setHookUploadedFiles(files);
      
      // File validation will be handled automatically when files change
      
      // Save session data
      SessionRecoveryService.saveSession({
        currentStep,
        inputMethod,
        uploadedFiles: files.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          lastModified: f.lastModified
        })),
        manualEntries: mockEntries
      });
      
      toast.success(`${files.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to process uploaded files');
    }
  };

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


  // Render Step 2 content based on workflow type
  const renderStep2Content = () => {
    // Show rich entry cards if we have manual entries
    if (mockEntries.length > 0) {
      return (
        // Manual Entry Workflow - Rich Cards
        <div className="validate-content">
          {/* Validation System */}
          <div className="validation-section mb-6">
            <ValidationSystem
              files={uploadedFiles}
              manualEntries={mockEntries}
              showDetails={true}
            />
          </div>
          
          {/* Rich Entry Display */}
          <EntryCards 
            entries={mockEntries}
            onEditEntry={handleEditEntry}
          />
          
          {/* Workflow Cards */}
          <div className="mt-8">
            <WorkflowCards
              onAddMoreDays={() => setShowManualEntryModal(true)}
              onAnalyzeWeek={handleStartAnalysis}
            />
          </div>
        </div>
      );
    }
    
    // Show file validation if we have uploaded files - Match original HTML structure
    if (uploadedFiles.length > 0) {
      return (
        <div className="validate-content">
          <div className="validate-header text-center mb-6">
            <h2 className="validate-title text-xl sm:text-2xl font-bold text-slate-900 mb-2">File Upload Validation</h2>
            <p className="validate-subtitle text-sm sm:text-base text-slate-600">Review your uploaded documents and proceed to analysis</p>
          </div>
          
          {/* Validation System */}
          <div className="validation-section mb-6">
            <ValidationSystem
              files={uploadedFiles}
              manualEntries={mockEntries}
              showDetails={true}
            />
          </div>

          {/* File List Section - Mobile responsive structure */}
          <div className="files-section mt-4 sm:mt-6">
            <div className="files-header flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="files-title text-base sm:text-lg font-semibold text-slate-900">Uploaded Files</h3>
              <div className="files-count text-xs sm:text-sm text-slate-500">{uploadedFiles.length} files</div>
            </div>
            <div className="file-list enhanced-file-list space-y-3">
              {uploadedFiles.map((file) => {
                const fileSize = (file.size / 1024).toFixed(1);
                const fileTypeIcon = getFileTypeIcon(file.name);
                const fileTypeLabel = getFileTypeLabel(file.name);
                
                return (
                  <div key={`${file.name}-${file.size}-${file.lastModified}`} className="validation-file-item flex items-center gap-3 p-3 sm:gap-4 sm:p-4 bg-white border border-slate-200 rounded-lg">
                    <div className="file-icon-wrapper flex-shrink-0 w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                      {fileTypeIcon}
                    </div>
                    <div className="file-details flex-1 min-w-0">
                      <div className="file-name font-medium text-slate-900 truncate text-sm sm:text-base">{file.name}</div>
                      <div className="file-meta flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-slate-500">
                        <span className="file-type">{fileTypeLabel}</span>
                        <span>•</span>
                        <span className="file-size">{fileSize} KB</span>
                      </div>
                    </div>
                    <div className="file-status flex-shrink-0">
                      <span className="status-badge status-ready text-green-600 font-medium text-xs sm:text-sm">✓ Ready</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Workflow Actions - Mobile responsive */}
          <div className="validation-actions mt-6 sm:mt-8">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 text-center">Choose Your Next Step</h3>
            <WorkflowCards
              onAddMoreDays={() => setShowManualEntryModal(true)}
              onAnalyzeWeek={handleStartAnalysis}
            />
          </div>
        </div>
      );
    }
    
    // Empty state
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Data to Validate</h3>
        <p className="text-slate-600">Upload PDF files or add manual entries to proceed with validation</p>
        <button 
          onClick={() => setStep(1)}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Go Back to Upload
        </button>
      </div>
    );
  };

  // File validation handler
  const handleFileValidation = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsValidating(true);
    try {
      const validation = await fileValidationService.validateFiles(uploadedFiles, {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['application/pdf'],
        checkForUpdates: true,
        checkForDuplicates: true,
      });
      
      setValidationResult(validation);
      
      // Check for file updates and create update objects
      if (validation.isUpdated) {
        // This would be populated with actual update information
        // For now, create a basic structure
        const updates = uploadedFiles.map(file => ({
          fileName: file.name,
          lastModified: file.lastModified - (24 * 60 * 60 * 1000), // Mock previous date
          currentModified: file.lastModified,
          analysisId: 'mock-analysis-id',
          analysisName: 'Previous Analysis'
        }));
        setFileUpdates(updates);
      }
      
    } catch (error) {
      console.error('File validation failed:', error);
      toast.error('File validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  // File validation handler for specific files
  async function handleFileValidationForFiles(filesToValidate: File[]) {
    setIsValidating(true);
    try {
      const validation = await fileValidationService.validateFiles(filesToValidate, {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['application/pdf'],
        checkForUpdates: true,
        checkForDuplicates: true,
      });
      
      setValidationResult(validation);
      
      // Check for file updates and create update objects
      if (validation.isUpdated) {
        // This would be populated with actual update information
        // For now, create a basic structure
        const updates = filesToValidate.map(file => ({
          fileName: file.name,
          lastModified: file.lastModified - (24 * 60 * 60 * 1000), // Mock previous date
          currentModified: file.lastModified,
          analysisId: 'mock-analysis-id',
          analysisName: 'Previous Analysis'
        }));
        setFileUpdates(updates);
      }
      
    } catch (error) {
      console.error('File validation failed:', error);
      toast.error('File validation failed');
    } finally {
      setIsValidating(false);
    }
  }

  // Enhanced analysis handler - processes both files and manual entries with proper payment calculations
  const handleStartAnalysis = async () => {
    // Run file validation first if we have uploaded files
    if (uploadedFiles.length > 0 && !validationResult) {
      await handleFileValidation();
    }
    
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
      handleAnalysisStarted();
    
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
      if (uploadedFiles.length > 0) {
        const fileResults = await processUploadedFilesInternal(paymentService);
        dailyData = { ...dailyData, ...fileResults.dailyData };
        dayCalculations = [...dayCalculations, ...fileResults.dayCalculations];
      }
      
      // Process manual entries if any
      if (mockEntries.length > 0) {
        const manualResults = processManualEntriesInternal(paymentService);
        dailyData = { ...dailyData, ...manualResults.dailyData };
        dayCalculations = [...dayCalculations, ...manualResults.dayCalculations];
      }

      // Generate and save analysis
      await finalizeAnalysis(analysisId, weekStart, dailyData, dayCalculations, paymentService);
      
    } catch (error) {
      console.error('Analysis error:', error);
      progressService.abort(error instanceof Error ? error.message : 'Unknown error occurred');
      toast.error('Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setTimeout(() => hideProgress(), 3000);
    }
  };

  // Process uploaded PDF files (internal helper)
  const processUploadedFilesInternal = async (paymentService: { processDailyData: (data: Record<string, DailyEntry>) => DayCalculation[] }) => {
    // Stage 3: Reading PDFs
    progressService.advanceToStage(2, `Reading ${uploadedFiles.length} PDF file(s)...`);
    
    toast.info(`Processing ${uploadedFiles.length} PDF file(s)...`);
    console.log('Starting PDF processing for files:', uploadedFiles.map(f => f.name));
    
    // Import PDF processor
    const { PDFProcessor } = await import('@/lib/infrastructure/pdf/pdf-processor');
    const processor = new PDFProcessor();
    
    // Stage 4: Extracting Data
    progressService.advanceToStage(3, 'Extracting consignment and payment data...');
    
    console.log('Processing files with PDF processor...');
    const processingResult = await processor.processFiles(uploadedFiles);
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
    const dayCalculations = mockEntries.map(entry => 
      paymentService.calculateDayPayment(
        entry.date,
        entry.consignments,
        entry.totalPay,
        entry.pickups || 0,
        (entry.pickups || 0) * 5
      )
    );
    
    const dailyData: Record<string, DailyEntry> = {};
    mockEntries.forEach(entry => {
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

  // Process and update Step 3 analysis data
  const updateStep3Analysis = useCallback(async () => {
    try {
      const analysisInput = {
        inputMethod,
        files: uploadedFiles,
        manualEntries: mockEntries
      };

      const analysisData = await Step3AnalysisService.processAnalysis(analysisInput);
      setStep3AnalysisData(analysisData);
      setIsAnalysisComplete(!!analysisData);
    } catch (error) {
      console.error('Failed to update Step 3 analysis:', error);
      setStep3AnalysisData(null);
      setIsAnalysisComplete(false);
    }
  }, [inputMethod, uploadedFiles, mockEntries]);

  // Handle Step 3 new analysis request
  const handleStep3NewAnalysis = () => {
    console.log('🔄 handleStep3NewAnalysis: Starting new analysis workflow');
    setStep(1);
    setStep3AnalysisData(null);
    setIsAnalysisComplete(false);
    
    if (inputMethod === 'upload') {
      setHookUploadedFiles([]);
    } else {
      setHookManualEntries([]);
    }
    
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
    router.push('/reports');
  };

  // Update Step 3 analysis when data changes
  useEffect(() => {
    if (showAnalyzeSection && (mockEntries.length > 0 || uploadedFiles.length > 0)) {
      updateStep3Analysis();
    }
  }, [showAnalyzeSection, mockEntries, uploadedFiles, inputMethod, updateStep3Analysis]);

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
      source: uploadedFiles.length > 0 ? 'upload' : 'manual',
      summary,
      files: uploadedFiles.map(file => ({
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

  // Initialize tooltip functionality
  useEffect(() => {
    // Payment rules (should match the original)
    const rules = {
      weekdayRate: 2.00,
      saturdayRate: 3.00,
      unloadingBonus: 30.00,
      attendanceBonus: 25.00,
      earlyBonus: 50.00
    };

    const getTooltipTexts = (dayType: string) => {
      const isSaturday = dayType === 'saturday';
      const isMonday = dayType === 'monday';
      const isSunday = dayType === 'sunday';
      
      // Calculate current rate for the selected day
      let rateText = 'Rest day - no work';
      if (!isSunday) {
        const currentRate = isSaturday ? rules.saturdayRate : rules.weekdayRate;
        rateText = `You earn £${currentRate} per delivery`;
      }
      
      // Calculate current bonuses for the selected day
      let earlyText = 'No bonus today';
      let attendanceText = 'No bonus today';
      let unloadingText = 'No bonus today';
      
      if (!isSunday) {
        const unloadingAmount = isMonday ? 0 : rules.unloadingBonus;
        unloadingText = isMonday ? 'No unloading bonus on Monday' : `£${unloadingAmount} bonus today`;
        
        if (!isSaturday) {
          earlyText = `£${rules.earlyBonus} bonus today`;
          attendanceText = `£${rules.attendanceBonus} bonus today`;
        } else {
          earlyText = 'No early bonus on Saturday';
          attendanceText = 'No attendance bonus on Saturday';
        }
      }
      
      return { rateText, earlyText, attendanceText, unloadingText };
    };

    const updateFormTooltips = (dayType?: string) => {
      // Get current day from form if not provided
      if (!dayType) {
        const entryDayField = document.getElementById('entryDay') as HTMLInputElement;
        dayType = entryDayField?.value?.toLowerCase() || 'monday';
      }
      
      const tooltips = getTooltipTexts(dayType);
      
      // Update tooltip data attributes
      const baseAmountIcon = document.querySelector('[data-tooltip="Calculated for you"]');
      const earlyArriveIcon = document.querySelector('#earlyArrive')?.parentElement?.querySelector('.info-icon');
      const attendanceIcon = document.querySelector('#onTimePercentage')?.parentElement?.querySelector('.info-icon');
      const unloadingIcon = document.querySelector('#loadingBonus')?.parentElement?.querySelector('.info-icon');
      
      if (baseAmountIcon) baseAmountIcon.setAttribute('data-tooltip', tooltips.rateText);
      if (earlyArriveIcon) earlyArriveIcon.setAttribute('data-tooltip', tooltips.earlyText);
      if (attendanceIcon) attendanceIcon.setAttribute('data-tooltip', tooltips.attendanceText);
      if (unloadingIcon) unloadingIcon.setAttribute('data-tooltip', tooltips.unloadingText);
    };

    const showInfoTooltip = (iconElement: HTMLElement) => {
      // Remove any existing tooltips
      hideAllInfoTooltips();
      
      const tooltipText = iconElement.getAttribute('data-tooltip');
      if (!tooltipText) return;
      
      // Create tooltip element
      const tooltip = document.createElement('div');
      tooltip.className = 'info-tooltip';
      tooltip.textContent = tooltipText;
      
      // Add tooltip to the icon
      iconElement.appendChild(tooltip);
      
      // Show tooltip after a brief delay
      setTimeout(() => {
        tooltip.classList.add('show');
      }, 50);
    };
    
    const hideInfoTooltip = (iconElement: HTMLElement) => {
      const tooltip = iconElement.querySelector('.info-tooltip');
      if (tooltip) {
        tooltip.classList.remove('show');
        setTimeout(() => {
          if (tooltip.parentNode) {
            tooltip.remove();
          }
        }, 150);
      }
    };
    
    const hideAllInfoTooltips = () => {
      const allTooltips = document.querySelectorAll('.info-tooltip');
      allTooltips.forEach((tooltip) => {
        if (tooltip.parentNode) {
          tooltip.remove();
        }
      });
    };
    
    // Handle info icon hover events
    const handleMouseEnter = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target?.classList?.contains('info-icon')) {
        showInfoTooltip(target);
      }
    };
    
    const handleMouseLeave = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target?.classList?.contains('info-icon')) {
        hideInfoTooltip(target);
      }
    };
    
    // Listen for date changes to update tooltips
    const handleDateChange = () => {
      setTimeout(() => {
        const dateInput = document.getElementById('entryDate') as HTMLInputElement;
        const dayInput = document.getElementById('entryDay') as HTMLInputElement;
        
        if (dateInput?.value && dayInput) {
          const date = new Date(dateInput.value);
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = dayNames[date.getDay()];
          dayInput.value = dayName;
          
          // Update tooltips with new day
          updateFormTooltips(dayName.toLowerCase());
        }
      }, 10);
    };
    
    document.addEventListener('mouseenter', handleMouseEnter, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);
    document.addEventListener('change', handleDateChange, true);
    
    // Initialize tooltips when modal opens
    if (showManualEntryModal) {
      setTimeout(() => {
        updateFormTooltips();
      }, 100);
    }
    
    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
      document.removeEventListener('change', handleDateChange, true);
    };
  }, [showManualEntryModal]);

  // Add global styles using useEffect and CSS injection
  useEffect(() => {
    const styleId = 'info-icon-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .info-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        cursor: help;
        user-select: none;
        position: relative;
      }
      .info-icon::after {
        content: '';
        width: 16px;
        height: 16px;
        background: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%233b82f6' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'/%3E%3C/svg%3E") no-repeat center/contain;
      }
      .info-icon:hover {
        transform: scale(1.1);
        transition: all 0.2s ease;
      }
      .info-tooltip {
        position: absolute;
        background: #1e293b;
        color: white;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        z-index: 10001;
        pointer-events: none;
        transition: all 0.15s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        top: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(4px);
        margin-top: 4px;
        letter-spacing: 0.02em;
      }
      .info-tooltip::before {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 4px solid #1e293b;
      }
      .info-tooltip.show {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) translateY(0);
      }
      
      /* Override default focus styles for consistent blue borders */
      .modal-input:focus {
        outline: none !important;
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
      }
      .modal-input:focus-visible {
        outline: none !important;
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  // Handle modal accessibility
  useEffect(() => {
    if (showManualEntryModal) {
      // Focus the dialog when it opens
      const dialog = document.querySelector('dialog[open]') as HTMLDialogElement;
      if (dialog) {
        dialog.focus();

        // Handle click outside
        const handleDialogClick = (e: MouseEvent) => {
          const rect = dialog.getBoundingClientRect();
          const isInDialog = (
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom &&
            e.clientX >= rect.left &&
            e.clientX <= rect.right
          );

          // Check if click is on the backdrop (outside the modal content)
          if (e.target === dialog && !isInDialog) {
            handleCloseModal();
          }
        };

        dialog.addEventListener('click', handleDialogClick);

        // Handle escape key
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            handleCloseModal();
          }
        };

        document.addEventListener('keydown', handleEscape);

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        return () => {
          dialog.removeEventListener('click', handleDialogClick);
          document.removeEventListener('keydown', handleEscape);
          document.body.style.overflow = 'unset';
        };
      }
    }
  }, [showManualEntryModal, handleCloseModal]);

  return (
    <div className="min-h-screen bg-gray-50" style={{ background: '#f8fafc' }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Session Recovery Banner */}
        {showRecoveryBanner && recoveryData && (
          <div className="mb-6">
            <RecoveryBanner
              recovery={recoveryData}
              onRestore={handleSessionRestore}
              onDismiss={handleSessionDismiss}
            />
          </div>
        )}

        {/* File Update Detector */}
        {fileUpdates.length > 0 && (
          <FileUpdateDetector
            updates={fileUpdates}
            onUpdateFile={(fileName, analysisId) => {
              toast.info(`Updating ${fileName} from analysis ${analysisId}`);
              // Implement actual update logic here
            }}
            onIgnoreUpdates={() => {
              setFileUpdates([]);
              toast.info('File updates ignored');
            }}
            onDismiss={() => setFileUpdates([])}
            className="mb-6"
          />
        )}

        {/* File Validation Panel */}
        {(uploadedFiles.length > 0 && validationResult) && (
          <FileValidationPanel
            validationResult={validationResult}
            isValidating={isValidating}
            onRetryValidation={() => handleFileValidationForFiles(uploadedFiles)}
            onFixIssue={(issueType, data) => {
              switch (issueType) {
                case 'update':
                  toast.info('Refreshing file data...');
                  break;
                case 'duplicate':
                  if (data && typeof data === 'object' && 'name' in data && typeof data.name === 'string') {
                    toast.info(`Removing duplicate: ${data.name}`);
                  } else {
                    toast.info('Removing duplicate file');
                  }
                  break;
                case 'existing':
                  if (data && typeof data === 'object' && 'analysisId' in data && typeof data.analysisId === 'string') {
                    router.push(`/reports?analysis=${data.analysisId}`);
                  } else {
                    router.push('/reports');
                  }
                  break;
                default:
                  toast.info('Attempting to fix validation issue...');
              }
            }}
            className="mb-6"
          />
        )}
        
        {/* Step Navigation Component */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200">
          <StepNavigation 
            currentStep={currentStep}
            totalSteps={totalSteps}
            onStepClick={handleStepClick}
            canProgressToStep={canProgressToStep}
          />
        </div>
        
        {/* Progress Overlay */}
        <ProgressOverlay
          isVisible={progressVisible}
          onComplete={hideProgress}
          onError={(error) => {
            toast.error(error);
            hideProgress();
          }}
        />

        {/* Step 1: Upload Section */}
        {showUploadSection && (
        <div className="upload-section-enhanced">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Add Your Data</h2>
            <p className="text-slate-600">Upload your documents or enter data manually to get started with payment analysis</p>
          </div>

          {/* Data Input Method Toggle - Dashboard Style */}
          <div className="flex justify-center mb-4">
            <div className="input-method-toggle bg-white rounded-xl p-1 flex gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-w-xs w-full">
              <button 
                onClick={handleUploadMethodClick}
                className={`method-btn flex-1 px-2.5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  inputMethod === 'upload' 
                    ? 'method-btn-active bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]' 
                    : 'method-btn-inactive text-slate-600 hover:bg-slate-100'
                }`}
                data-method="upload"
              >
                <span className="method-icon w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </span>
                <span className="method-label leading-none">Upload Files</span>
              </button>

              <button 
                onClick={handleManualMethodClick}
                className={`method-btn flex-1 px-2.5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  inputMethod === 'manual' 
                    ? 'method-btn-active bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]' 
                    : 'method-btn-inactive text-slate-600 hover:bg-slate-100'
                }`}
                data-method="manual"
              >
                <span className="method-icon w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                </span>
                <span className="method-label leading-none">Manual Entry</span>
              </button>
            </div>
          </div>

          {/* Legacy Upload Area */}
          <LegacyUploadArea
            onFilesSelected={handleFilesUploaded}
            maxFiles={50}
            maxSizePerFile={50 * 1024 * 1024} // 50MB
            acceptedTypes={['.pdf']}
          />

          {/* Manual Entry Modal */}
          {showManualEntryModal && (
            <dialog 
              open
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[99999] p-4 overflow-y-auto border-0 max-w-none max-h-none w-full h-full" 
              style={{ zIndex: 99999 }}
              aria-labelledby="modal-title"
            >
              <div 
                className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl relative" 
                style={{ zIndex: 100000 }}
              >
                <ManualEntry 
                  onClose={handleCloseModal}
                  onAddEntry={handleAddManualEntry}
                />
              </div>
            </dialog>
          )}

          {/* Action Buttons */}
          <div className="mt-8">
            <div className="text-center">
              <button 
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-full font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center gap-3" 
                id="analyzeBtn" 
                disabled={uploadedFiles.length === 0 && mockEntries.length === 0}
                onClick={(e) => {
                  e.preventDefault();
                  if (uploadedFiles.length > 0 || mockEntries.length > 0) {
                    setStep(2);
                    toast.success('Ready to validate your data');
                  } else {
                    toast.warning('Please upload files or add manual entries first');
                  }
                }}
              >
                <span className="btn-content flex items-center gap-3">
                  <span className="w-5 h-5">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 22l16-4 4-16-16 4-4 16zm7-7l5-5"/>
                    </svg>
                  </span>
                  <span>
                    {getButtonText()}
                  </span>
                </span>
                <span className="btn-loader hidden">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </span>
              </button>
              <button 
                className="bg-slate-600 hover:bg-slate-700 text-white px-8 py-3 rounded-full font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300 items-center gap-3 ml-4 hidden" 
                id="startNewAnalysisBtn"
              >
                <span className="btn-content flex items-center gap-3">
                  <span className="w-5 h-5">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </span>
                  <span>Start New Analysis</span>
                </span>
              </button>
            </div>
            <p className="text-center text-sm text-slate-500 mt-3">Analysis typically takes 2-5 seconds per document</p>
          </div>
        </div>
        )}
        
        {/* Step 2: Validate Section */}
        {showValidateSection && (
        <div className="validate-section mt-8">
          <div className="validate-header text-center mb-8">
            <h2 className="validate-title text-2xl font-bold text-slate-900 mb-2">Review Daily Data</h2>
            <p className="validate-subtitle text-slate-600">Choose to add more days or analyze your current week</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            {renderStep2Content()}
          </div>
        </div>
        )}
        
        {/* Step 3: Analyze Section */}
        {showAnalyzeSection && (
          <Step3AnalyzeSectionV2
            lastAnalysisData={step3AnalysisData}
            manualEntries={hookManualEntries}
            currentInputMethod={inputMethod}
            hasBeenAnalyzed={isAnalysisComplete}
            uploadedFiles={hookUploadedFiles}
            onSetStep={setStep}
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
          manualEntries={mockEntries.map(entry => ({
            date: entry.date,
            consignments: entry.consignments,
            expectedTotal: entry.totalPay,
            paidAmount: entry.totalPay
          }))}
          inputMethod={inputMethod}
        />

      </div>
    </div>
  );
}
