/**
 * Step2Container Component
 *
 * Handles all Step 2 validation logic extracted from the main analysis page.
 * This component is responsible for:
 * - File validation display and management
 * - Entry cards rendering for manual entries
 * - Workflow cards and actions
 * - File list display with status indicators
 * - All Step 2 event handlers and validation logic
 */

'use client';

import { useState } from 'react';
import { BarChart, FileText, File } from 'lucide-react';
import {
  ValidationSystem,
  EntryCards,
  WorkflowCards
} from '@/components/analysis';

// Type definitions for the component
interface DailyEntry {
  id: number;
  date: string;
  day: string;
  consignments: number;
  baseAmount: number;
  totalPay: number;
  pickups?: number;
  earlyArrive?: number;
  attendanceBonus?: number;
  unloadingBonus?: number;
}

interface Step2ContainerProps {
  files: File[];
  entries: DailyEntry[];
  onStepComplete: () => void;
  onEditEntry?: (entryId: number) => void;
  onAddMoreDays?: () => void;
  onError: (error: string) => void;
  className?: string;
}

export function Step2Container({
  files,
  entries,
  onStepComplete,
  onEditEntry,
  onAddMoreDays,
  onError,
  className = ''
}: Step2ContainerProps) {
  // Helper function to get file type icon based on filename
  const getFileTypeIcon = (filename: string) => {
    if (filename.toLowerCase().includes('runsheet')) {
      return <BarChart className="w-5 h-5 text-blue-600" />;
    }
    if (filename.toLowerCase().includes('invoice')) {
      return <FileText className="w-5 h-5 text-green-600" />;
    }
    return <File className="w-5 h-5 text-gray-600" />;
  };

  // Helper function to get file type label based on filename
  const getFileTypeLabel = (filename: string) => {
    if (filename.toLowerCase().includes('runsheet')) return 'Runsheet';
    if (filename.toLowerCase().includes('invoice')) return 'Invoice';
    return 'Document';
  };

  // Handle edit entry with error handling
  const handleEditEntry = (entryId: number) => {
    try {
      if (onEditEntry) {
        onEditEntry(entryId);
      }
    } catch (error) {
      console.error('Error editing entry:', error);
      onError('Failed to edit entry');
    }
  };

  // Handle add more days with error handling
  const handleAddMoreDays = () => {
    try {
      if (onAddMoreDays) {
        onAddMoreDays();
      }
    } catch (error) {
      console.error('Error adding more days:', error);
      onError('Failed to open add more days dialog');
    }
  };

  // Handle analyze week action
  const handleAnalyzeWeek = () => {
    try {
      onStepComplete();
    } catch (error) {
      console.error('Error starting analysis:', error);
      onError('Failed to start analysis');
    }
  };

  // Render Step 2 content based on workflow type
  const renderStep2Content = () => {
    // Show rich entry cards if we have manual entries
    if (entries.length > 0) {
      return (
        // Manual Entry Workflow - Rich Cards
        <div className="validate-content">
          {/* Validation System */}
          <div className="validation-section mb-6">
            <ValidationSystem
              files={files}
              manualEntries={entries}
              showDetails={true}
            />
          </div>

          {/* Rich Entry Display */}
          <EntryCards
            entries={entries}
            onEditEntry={handleEditEntry}
          />

          {/* Workflow Cards */}
          <div className="mt-8">
            <WorkflowCards
              onAddMoreDays={handleAddMoreDays}
              onAnalyzeWeek={handleAnalyzeWeek}
            />
          </div>
        </div>
      );
    }

    // Show file validation if we have uploaded files - Match original HTML structure
    if (files.length > 0) {
      return (
        <div className="validate-content">
          <div className="validate-header text-center mb-6">
            <h2 className="validate-title text-xl sm:text-2xl font-bold text-slate-900 mb-2">File Upload Validation</h2>
            <p className="validate-subtitle text-sm sm:text-base text-slate-600">Review your uploaded documents and proceed to analysis</p>
          </div>

          {/* Validation System */}
          <div className="validation-section mb-6">
            <ValidationSystem
              files={files}
              manualEntries={entries}
              showDetails={true}
            />
          </div>

          {/* File List Section - Mobile responsive structure */}
          <div className="files-section mt-4 sm:mt-6">
            <div className="files-header flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="files-title text-base sm:text-lg font-semibold text-slate-900">Uploaded Files</h3>
              <div className="files-count text-xs sm:text-sm text-slate-500">{files.length} files</div>
            </div>
            <div className="file-list enhanced-file-list space-y-3">
              {files.map((file) => {
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
              onAddMoreDays={handleAddMoreDays}
              onAnalyzeWeek={handleAnalyzeWeek}
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
          onClick={() => onError('Please go back to upload section to add data')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Go Back to Upload
        </button>
      </div>
    );
  };

  return (
    <div className={`step2-container ${className}`}>
      <div className="validate-section">
        <div className="validate-header text-center mb-8">
          <h2 className="validate-title text-2xl font-bold text-slate-900 mb-2">Review Daily Data</h2>
          <p className="validate-subtitle text-slate-600">Choose to add more days or analyze your current week</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          {renderStep2Content()}
        </div>
      </div>
    </div>
  );
}

export default Step2Container;