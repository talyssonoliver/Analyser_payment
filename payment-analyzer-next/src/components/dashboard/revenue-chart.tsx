/**
 * Revenue Chart Component
 * Legacy-style bar chart for weekly revenue data
 */

import React from 'react';
import type { AnalysisWithDetails } from '@/lib/repositories/analysis-repository';

interface WeekData {
  label: string;
  expected: number;
  actual: number;
}

export interface RevenueChartProps {
  analyses: AnalysisWithDetails[];
  currentMonth: Date;
}

function generateWeeklyChartData(analyses: AnalysisWithDetails[], currentMonth: Date): WeekData[] {
  const weeks = [];
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const weekStart = new Date(firstDay);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  for (let weekNum = 1; weekNum <= 4; weekNum++) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekAnalyses = analyses.filter(analysis => {
      if (!analysis.created_at) return false;
      const analysisDate = new Date(analysis.created_at);
      return analysisDate >= weekStart && analysisDate <= weekEnd;
    });

    const expected = weekAnalyses.reduce((sum, analysis) => sum + (analysis.analysis_totals?.expected_total || 0), 0);
    const actual = expected;

    weeks.push({
      label: `W${weekNum}`,
      expected,
      actual
    });

    weekStart.setDate(weekStart.getDate() + 7);
  }

  return weeks;
}

export function RevenueChart({ analyses, currentMonth }: RevenueChartProps) {
  const weeklyData = generateWeeklyChartData(analyses, currentMonth);
  const maxValue = Math.max(...weeklyData.flatMap(w => [w.expected, w.actual]));

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 mb-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Revenue Trend</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-slate-600">Expected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-slate-600">Actual</span>
          </div>
        </div>
      </div>

      <div className="min-h-[150px] flex items-end relative">
        <div className="flex items-end gap-2 w-full h-[120px] px-1">
          {weeklyData.map((week) => {
            const expectedHeight = maxValue > 0 ? Math.max(8, (week.expected / maxValue) * 100) : 8;
            const actualHeight = maxValue > 0 ? Math.max(8, (week.actual / maxValue) * 100) : 8;

            return (
              <div key={week.label} className="flex flex-col items-center flex-1">
                <div className="flex items-end justify-center h-[100px] w-full px-1 mb-2">
                  <div
                    className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md w-[45%] mr-1 relative"
                    style={{ height: `${expectedHeight}px` }}
                  >
                    {week.expected > 0 && (
                      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-semibold whitespace-nowrap bg-white bg-opacity-90 px-1 py-0.5 rounded text-blue-600 shadow-sm">
                        £{Math.round(week.expected)}
                      </div>
                    )}
                  </div>
                  <div
                    className="bg-gradient-to-t from-green-500 to-green-400 rounded-t-md w-[45%] relative"
                    style={{ height: `${actualHeight}px` }}
                  >
                    {week.actual > 0 && (
                      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-semibold whitespace-nowrap bg-white bg-opacity-90 px-1 py-0.5 rounded text-green-600 shadow-sm">
                        £{Math.round(week.actual)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-medium">{week.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}