'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileUpload, ManualEntry } from '@/components/analysis';
import { RecoveryBanner } from '@/components/ui/recovery-banner';
import { SessionRecoveryService, RecoveryBanner as RecoveryBannerType } from '@/lib/services/session-recovery-service';
import { FileFingerprintService } from '@/lib/services/file-fingerprint-service';
import { toast } from '@/lib/utils/toast';
import { InputMethod } from '@/hooks/use-analysis-steps';

interface DailyEntry {
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

export interface Step1ContainerProps {
  // Core data and state
  inputMethod: InputMethod;
  uploadedFiles: File[];
  manualEntries: DailyEntry[];
  currentStep: number;

  // Handlers from main page
  onInputMethodChange: (method: InputMethod) => void;
  onFilesUploaded: (files: File[]) => void;
  onManualEntriesChanged: (entries: DailyEntry[]) => void;
  onStepComplete: (data: { files?: File[], entries?: DailyEntry[] }) => void;
  onError: (error: string) => void;

  // Additional handlers
  onEditEntry?: (entryId: number) => void;
  disabled?: boolean;
}

export function Step1Container({
  inputMethod,
  uploadedFiles,
  manualEntries,
  currentStep,
  onInputMethodChange,
  onFilesUploaded,
  onManualEntriesChanged,
  onStepComplete,
  onError,
  onEditEntry,
  disabled = false
}: Step1ContainerProps) {

  // Session recovery state
  const [recoveryData, setRecoveryData] = useState<RecoveryBannerType | null>(null);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);

  // Local state for modals
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);

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

        // Restore state via callbacks
        if (restoredSession?.inputMethod) {
          onInputMethodChange(restoredSession.inputMethod);
        }
        if (restoredSession?.manualEntries && restoredSession.manualEntries.length > 0) {
          onManualEntriesChanged(restoredSession.manualEntries);
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

  // Input method handlers
  const handleManualMethodClick = () => {
    onInputMethodChange('manual');
    setShowManualEntryModal(true);
  };

  const handleUploadMethodClick = () => {
    onInputMethodChange('upload');
  };

  const handleCloseModal = useCallback(() => {
    setShowManualEntryModal(false);
    onInputMethodChange('upload'); // Switch back to upload method when closing
  }, [onInputMethodChange]);

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
    const updatedEntries = [...manualEntries, newEntry];
    onManualEntriesChanged(updatedEntries);
    setShowManualEntryModal(false);
    toast.success('Manual entry added!');
  };


  // Get button text based on current state
  const getButtonText = () => {
    if (uploadedFiles.length > 0) return 'Analyze Documents';
    if (manualEntries.length > 0) return 'Analyze Entries';
    return 'Add Data First';
  };

  // Handle file upload with fingerprinting and validation
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
        onError(validation.errors.join(', '));
        return;
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => toast.warning(warning));
      }

      // File hashes tracking for future use
      console.debug('Generated file hashes:', newHashes);
      onFilesUploaded(files);

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
        manualEntries: manualEntries
      });

      toast.success(`${files.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('File upload error:', error);
      const errorMessage = 'Failed to process uploaded files';
      toast.error(errorMessage);
      onError(errorMessage);
    }
  };

  // Handle step completion
  const handleCompleteStep = () => {
    if (uploadedFiles.length > 0 || manualEntries.length > 0) {
      onStepComplete({
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        entries: manualEntries.length > 0 ? manualEntries : undefined
      });
      toast.success('Ready to validate your data');
    } else {
      toast.warning('Please upload files or add manual entries first');
    }
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
    <div className="upload-section-enhanced">
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

      {/* Section Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Add Your Data</h2>
        <p className="text-slate-600">Upload your documents or enter data manually to get started with payment analysis</p>
      </div>

      {/* Data Input Method Toggle - Dashboard Style */}
      <div className="flex justify-center mb-4">
        <div className="input-method-toggle bg-white rounded-xl p-1 flex gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-w-xs w-full">
          <button
            onClick={handleUploadMethodClick}
            disabled={disabled}
            className={`method-btn flex-1 px-2.5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 ${
              inputMethod === 'upload'
                ? 'method-btn-active bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]'
                : 'method-btn-inactive text-slate-600 hover:bg-slate-100'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            disabled={disabled}
            className={`method-btn flex-1 px-2.5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 ${
              inputMethod === 'manual'
                ? 'method-btn-active bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]'
                : 'method-btn-inactive text-slate-600 hover:bg-slate-100'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      {/* File Upload Area */}
      <FileUpload
        onFilesSelected={handleFilesUploaded}
        maxFiles={50}
        maxSizePerFile={50 * 1024 * 1024} // 50MB
        acceptedTypes={['.pdf']}
        showProgressSimulation={true}
        hideMethodToggle={true}
        disabled={disabled}
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
            disabled={disabled || (uploadedFiles.length === 0 && manualEntries.length === 0)}
            onClick={(e) => {
              e.preventDefault();
              handleCompleteStep();
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
          </button>
        </div>
        <p className="text-center text-sm text-slate-500 mt-3">Analysis typically takes 2-5 seconds per document</p>
      </div>
    </div>
  );
}