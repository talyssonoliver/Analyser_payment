'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/utils/toast';
import { ManualEntry } from '@/types/core';

export type InputMethod = 'upload' | 'manual';

// Type definitions for step data
interface AnalysisData {
  id: string;
  period: string;
  status: string;
  createdAt: string;
  totalDays: number;
  source: string;
  [key: string]: unknown;
}

export interface StepState {
  currentStep: number;
  totalSteps: number;
  inputMethod: InputMethod;
  uploadedFiles: File[];
  manualEntries: ManualEntry[];
  hasBeenAnalyzed: boolean;
  lastAnalysisData: AnalysisData | null;
}

export interface UseAnalysisStepsReturn {
  // State
  currentStep: number;
  totalSteps: number;
  inputMethod: InputMethod;
  uploadedFiles: File[];
  manualEntries: ManualEntry[];
  hasBeenAnalyzed: boolean;
  lastAnalysisData: AnalysisData | null;
  
  // Actions
  setStep: (stepNumber: number) => void;
  setInputMethod: (method: InputMethod) => void;
  setUploadedFiles: (files: File[]) => void;
  setManualEntries: (entries: ManualEntry[]) => void;
  setHasBeenAnalyzed: (analyzed: boolean) => void;
  setLastAnalysisData: (data: AnalysisData | null) => void;
  
  // Validation
  canProgressToStep: (stepNumber: number) => boolean;
  
  // Auto-progression
  handleFilesUploaded: (files: File[]) => void;
  handleAnalysisStarted: () => void;
  handleNewAnalysis: () => void;
  
  // Step content visibility
  showUploadSection: boolean;
  showValidateSection: boolean;
  showAnalyzeSection: boolean;
}

const TOTAL_STEPS = 3;

export function useAnalysisSteps(): UseAnalysisStepsReturn {
  // Core state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [inputMethod, setInputMethod] = useState<InputMethod>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [hasBeenAnalyzed, setHasBeenAnalyzed] = useState<boolean>(false);
  const [lastAnalysisData, setLastAnalysisData] = useState<AnalysisData | null>(null);

  // Validation function - matches original logic
  const canProgressToStep = useCallback((stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1: 
        return true; // Always can go to step 1
      case 2:
        // Allow step 2 if we have data OR if we've previously analyzed data
        return uploadedFiles.length > 0 || manualEntries.length > 0 || hasBeenAnalyzed || !!lastAnalysisData;
      case 3:
        // Allow step 3 if we have data OR if we've previously analyzed data
        return uploadedFiles.length > 0 || manualEntries.length > 0 || hasBeenAnalyzed || !!lastAnalysisData;
      default: 
        return false;
    }
  }, [uploadedFiles.length, manualEntries.length, hasBeenAnalyzed, lastAnalysisData]);

  // Main setStep function - matches original logic
  const setStep = useCallback((stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= TOTAL_STEPS) {
      if (!canProgressToStep(stepNumber)) {
        toast.warning('Complete previous steps first');
        return;
      }
      
      setCurrentStep(stepNumber);
      console.log(`📍 Step changed to: ${stepNumber}`);
      
      // Step-specific initialization logic
      if (stepNumber === 2) {
        console.log('📊 Entering validation step');
      } else if (stepNumber === 3) {
        console.log('🚀 Entering analysis step');
        // Try to load previous analysis if we don't have current analysis data
        if (!lastAnalysisData && !hasBeenAnalyzed) {
          // In a real app, you might load from localStorage or API here
          console.log('📊 Checking for previous analysis data');
        }
      }
    }
  }, [canProgressToStep, lastAnalysisData, hasBeenAnalyzed]);

  // Auto-progression handlers
  const handleFilesUploaded = useCallback((files: File[]) => {
    setUploadedFiles(files);
    
    // Auto-progress to step 2 when files are uploaded (matches original logic)
    if (files.length > 0 && currentStep === 1) {
      setTimeout(() => {
        setStep(2);
        toast.success('Files uploaded! Ready to validate');
      }, 500);
    }
    
    // Go back to step 1 if no files remain and no analysis data exists
    if (files.length === 0 && currentStep > 1 && !lastAnalysisData) {
      setStep(1);
      toast.info('No files remaining. Upload files to continue');
    }
  }, [currentStep, lastAnalysisData, setStep]);

  const handleAnalysisStarted = useCallback(() => {
    const hasFiles = uploadedFiles.length > 0;
    const hasManualData = manualEntries.length > 0;
    
    if (!hasFiles && !hasManualData) {
      toast.error('No data to analyze');
      return;
    }
    
    // Progress to step 3 when analysis starts (matches original logic)
    setStep(3);
  }, [uploadedFiles.length, manualEntries.length, setStep]);

  const handleNewAnalysis = useCallback(() => {
    // Clear all data and reset to step 1 (matches original logic)
    setCurrentStep(1);
    setUploadedFiles([]);
    setManualEntries([]);
    setHasBeenAnalyzed(false);
    setLastAnalysisData(null);
    toast.success('Ready for new analysis');
  }, []);

  // Section visibility based on current step
  const showUploadSection = currentStep === 1;
  const showValidateSection = currentStep === 2;
  const showAnalyzeSection = currentStep === 3;

  // Auto-progression for manual entries
  useEffect(() => {
    // Automatically progress to Step 2 after adding manual entry (matches original logic)
    if (inputMethod === 'manual' && manualEntries.length > 0 && currentStep === 1) {
      setTimeout(() => {
        setStep(2);
        toast.success('Entry added! Review your data');
      }, 300);
    }
  }, [manualEntries.length, currentStep, inputMethod, setStep]);

  return {
    // State
    currentStep,
    totalSteps: TOTAL_STEPS,
    inputMethod,
    uploadedFiles,
    manualEntries,
    hasBeenAnalyzed,
    lastAnalysisData,
    
    // Actions
    setStep,
    setInputMethod,
    setUploadedFiles,
    setManualEntries,
    setHasBeenAnalyzed,
    setLastAnalysisData,
    
    // Validation
    canProgressToStep,
    
    // Auto-progression
    handleFilesUploaded,
    handleAnalysisStarted,
    handleNewAnalysis,
    
    // Section visibility
    showUploadSection,
    showValidateSection,
    showAnalyzeSection,
  };
}