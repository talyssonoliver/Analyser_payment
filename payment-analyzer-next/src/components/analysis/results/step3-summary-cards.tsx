/**
 * Step 3 Summary Cards Component
 * Pure React component replacing HTML string generation from step3-content-generator.ts lines 63-158
 */

import React from 'react';
import { AnalysisData, GlobalState } from './types';
import { ManualEntry } from '@/types/core';

interface Step3SummaryCardsProps {
  analysisData: AnalysisData | null;
  manualEntries: ManualEntry[];
  currentInputMethod: 'upload' | 'manual';
}

export function Step3SummaryCards({
  analysisData,
  manualEntries,
  currentInputMethod
}: Step3SummaryCardsProps) {
  // If we have analysis results from file upload, use those
  if (analysisData && analysisData.totals) {
    const totals = analysisData.totals;
    const difference = (totals.paidTotal || 0) - (totals.expectedTotal || 0);
    const differenceClass = difference >= 0 ? 'positive' : 'negative';
    const differenceIcon = difference >= 0 ? '↗️' : '↘️';
    const dailyAverage = totals.workingDays > 0 ? totals.expectedTotal / totals.workingDays : 0;

    return (
      <>
        <div className="preview-card enhanced">
          <div className="preview-card-icon">💰</div>
          <div className="preview-card-content">
            <div className="preview-card-label">Total Actual</div>
            <div className="preview-card-value">£{(totals.paidTotal || 0).toFixed(2)}</div>
          </div>
        </div>
        <div className="preview-card enhanced">
          <div className="preview-card-icon">📋</div>
          <div className="preview-card-content">
            <div className="preview-card-label">Total Expected</div>
            <div className="preview-card-value">£{(totals.expectedTotal || 0).toFixed(2)}</div>
          </div>
        </div>
        <div className={`preview-card enhanced ${differenceClass}`}>
          <div className="preview-card-icon">{differenceIcon}</div>
          <div className="preview-card-content">
            <div className="preview-card-label">Difference</div>
            <div className={`preview-card-value ${differenceClass}`}>£{Math.abs(difference).toFixed(2)}</div>
          </div>
        </div>
        <div className="preview-card enhanced">
          <div className="preview-card-icon">📅</div>
          <div className="preview-card-content">
            <div className="preview-card-label">Working Days</div>
            <div className="preview-card-value">{totals.workingDays || 0}</div>
          </div>
        </div>
        <div className="preview-card enhanced">
          <div className="preview-card-icon">📊</div>
          <div className="preview-card-content">
            <div className="preview-card-label">Daily Average</div>
            <div className="preview-card-value">£{dailyAverage.toFixed(2)}</div>
          </div>
        </div>
      </>
    );
  }

  // Fall back to manual entries if no analysis data
  if (currentInputMethod === 'manual' && manualEntries.length > 0) {
    const totalConsignments = manualEntries.reduce((sum, entry) => sum + entry.consignments, 0);
    const totalExpected = manualEntries.reduce((sum, entry) => sum + (entry.expectedTotal || 0), 0);
    const workingDays = manualEntries.length;
    const avgDaily = workingDays > 0 ? totalExpected / workingDays : 0;

    return (
      <>
        <div className="preview-card enhanced">
          <div className="preview-card-icon">💰</div>
          <div className="preview-card-content">
            <div className="preview-card-label">Total Expected</div>
            <div className="preview-card-value">£{totalExpected.toFixed(2)}</div>
          </div>
        </div>
        <div className="preview-card enhanced">
          <div className="preview-card-icon">📦</div>
          <div className="preview-card-content">
            <div className="preview-card-label">Consignments</div>
            <div className="preview-card-value">{totalConsignments}</div>
          </div>
        </div>
        <div className="preview-card enhanced">
          <div className="preview-card-icon">📅</div>
          <div className="preview-card-content">
            <div className="preview-card-label">Working Days</div>
            <div className="preview-card-value">{workingDays}</div>
          </div>
        </div>
        <div className="preview-card enhanced">
          <div className="preview-card-icon">📊</div>
          <div className="preview-card-content">
            <div className="preview-card-label">Daily Average</div>
            <div className="preview-card-value">£{avgDaily.toFixed(2)}</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="summary-card-simple">
      <div className="card-value">-</div>
      <div className="card-label">No Data</div>
    </div>
  );
}