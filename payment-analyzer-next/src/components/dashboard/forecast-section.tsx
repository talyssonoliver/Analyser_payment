/**
 * Forecast Section Component
 * Dashboard forecast card with predictions and actions
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText } from 'lucide-react';

export interface ForecastSectionProps {
  nextWeekExpected: number;
  monthEndProjection: number;
  suggestedDailyTarget: number;
  onUploadClick: () => void;
  onReportsClick: () => void;
}

export function ForecastSection({
  nextWeekExpected,
  monthEndProjection,
  suggestedDailyTarget,
  onUploadClick,
  onReportsClick
}: ForecastSectionProps) {
  return (
    <div className="bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <BarChart3 size={18} className="text-blue-500 mr-2" />
          <h3 className="text-sm font-bold text-blue-500">Forecast</h3>
        </div>
        <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
          AI Predicted
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center py-1.5 px-2 bg-white rounded">
          <span className="text-xs text-slate-600">Next Week Expected</span>
          <span className="text-sm font-semibold text-slate-900">£{nextWeekExpected.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 px-2 bg-white rounded">
          <span className="text-xs text-slate-600">Month End Projection</span>
          <span className="text-sm font-semibold text-slate-900">£{monthEndProjection.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 px-2 bg-white rounded">
          <span className="text-xs text-slate-600">Suggested Daily Target</span>
          <span className="text-sm font-semibold text-slate-900">£{suggestedDailyTarget.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          onClick={onUploadClick}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white h-9 text-sm font-medium"
        >
          <BarChart3 size={16} className="mr-2" />
          Upload & Analyze
        </Button>
        <Button
          onClick={onReportsClick}
          variant="outline"
          className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 h-9 text-sm font-medium"
        >
          <FileText size={16} className="mr-2" />
          View All Reports
        </Button>
      </div>
    </div>
  );
}