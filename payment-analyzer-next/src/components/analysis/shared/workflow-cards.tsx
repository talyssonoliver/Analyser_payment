'use client';

import { Calendar, BarChart3, Edit2, ArrowRight, FileText, File } from 'lucide-react';

interface WorkflowCardsProps {
  readonly onAddMoreDays: () => void;
  readonly onAnalyzeWeek: () => void;
  readonly onTestWithSampleData?: () => void; // Add sample data option for testing
}

export function WorkflowCards({ onAddMoreDays, onAnalyzeWeek, onTestWithSampleData }: WorkflowCardsProps) {
  return (
    <div className="manual-workflow-options">
      <div className="workflow-cards flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* Add More Days Card */}
        <div className="workflow-card add-more-card flex-1 bg-white rounded-lg sm:rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all duration-200 cursor-pointer group">
          <div className="p-4 sm:p-6 text-center">
            <div className="workflow-icon w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-slate-600" />
            </div>
            <div className="workflow-content">
              <h3 className="workflow-title text-base sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2">Add More Days</h3>
              <p className="workflow-description text-slate-600 mb-3 sm:mb-4 text-xs sm:text-sm">Continue adding daily data for this week</p>
              <button 
                onClick={onAddMoreDays}
                className="btn btn-secondary workflow-btn bg-slate-600 hover:bg-slate-700 text-white px-4 sm:px-6 py-2 rounded-lg font-medium text-xs sm:text-sm inline-flex items-center gap-2 transition-colors group-hover:bg-slate-700"
              >
                <Edit2 className="w-4 h-4" />
                <span className="btn-text">Add Another Day</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Analyze Week Card */}
        <div className="workflow-card analyze-card flex-1 bg-white rounded-lg sm:rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-all duration-200 cursor-pointer group">
          <div className="p-4 sm:p-6 text-center">
            <div className="workflow-icon w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <div className="workflow-content">
              <h3 className="workflow-title text-base sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2">Analyze Current Week</h3>
              <p className="workflow-description text-slate-600 mb-3 sm:mb-4 text-xs sm:text-sm">Process the data you&apos;ve entered so far</p>
              <button 
                onClick={onAnalyzeWeek}
                className="btn btn-primary workflow-btn bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-lg font-medium text-xs sm:text-sm inline-flex items-center gap-2 transition-colors group-hover:bg-blue-700"
              >
                <ArrowRight className="w-4 h-4" />
                <span className="btn-text">Analyze Week</span>
              </button>
            </div>
          </div>
        </div>

        {/* Test with Sample Data Card - only show if handler provided */}
        {onTestWithSampleData && (
          <div className="workflow-card test-card flex-1 bg-white rounded-lg sm:rounded-xl border-2 border-green-200 hover:border-green-300 transition-all duration-200 cursor-pointer group">
            <div className="p-4 sm:p-6 text-center">
              <div className="workflow-icon w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <div className="workflow-content">
                <h3 className="workflow-title text-base sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2">Test Analysis</h3>
                <p className="workflow-description text-slate-600 mb-3 sm:mb-4 text-xs sm:text-sm">Test with sample data while PDF issues are resolved</p>
                <button 
                  onClick={onTestWithSampleData}
                  className="btn btn-success workflow-btn bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 rounded-lg font-medium text-xs sm:text-sm inline-flex items-center gap-2 transition-colors group-hover:bg-green-700"
                >
                  <File className="w-4 h-4" />
                  <span className="btn-text">Test Analysis</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}