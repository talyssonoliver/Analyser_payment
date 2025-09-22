/**
 * Step 3 Analyze Section - Minimal Implementation
 * Focuses purely on working button functionality without complex dependencies
 */

'use client';

import { useEffect, useRef } from 'react';

interface AnalysisData {
  summary?: {
    totalExpected?: number;
    totalPaid?: number;
    totalDifference?: number;
    workingDays?: number;
  };
  totals?: {
    expected_total?: number;
    paid_total?: number;
    difference_total?: number;
    total_consignments?: number;
    working_days?: number;
  };
  period?: string;
  createdAt?: string;
}

interface Step3MinimalProps {
  lastAnalysisData: AnalysisData | null;
  onViewDetailedReport: () => void;
  onStartNewAnalysis: () => void;
  className?: string;
}

export function Step3AnalyzeSectionMinimal({
  lastAnalysisData,
  onViewDetailedReport,
  onStartNewAnalysis,
  className = ''
}: Step3MinimalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !lastAnalysisData) return;

    console.log('Step3Minimal: Rendering with data:', !!lastAnalysisData);

    // Create minimal HTML with working buttons
    const htmlContent = `
      <div class="step3-minimal-container" style="padding: 20px; text-align: center;">
        <div class="analysis-summary" style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h2 style="margin: 0 0 15px 0; color: #333;">Analysis Complete</h2>
          <div class="summary-stats" style="display: flex; justify-content: center; gap: 20px; margin: 15px 0;">
            <div style="padding: 10px; background: white; border-radius: 4px; min-width: 100px;">
              <div style="font-size: 24px; font-weight: bold; color: #28a745;">
                ${lastAnalysisData.totals?.total_consignments || 0}
              </div>
              <div style="font-size: 12px; color: #666;">Consignments</div>
            </div>
            <div style="padding: 10px; background: white; border-radius: 4px; min-width: 100px;">
              <div style="font-size: 24px; font-weight: bold; color: #007bff;">
                £${lastAnalysisData.totals?.expected_total?.toFixed(2) || '0.00'}
              </div>
              <div style="font-size: 12px; color: #666;">Expected</div>
            </div>
            <div style="padding: 10px; background: white; border-radius: 4px; min-width: 100px;">
              <div style="font-size: 24px; font-weight: bold; color: #17a2b8;">
                £${lastAnalysisData.totals?.paid_total?.toFixed(2) || '0.00'}
              </div>
              <div style="font-size: 12px; color: #666;">Paid</div>
            </div>
          </div>
        </div>
        
        <div class="action-buttons" style="margin: 30px 0;">
          <button 
            id="viewDetailedReportBtnMinimal" 
            style="
              background: #007bff; 
              color: white; 
              border: none; 
              padding: 12px 24px; 
              margin: 0 10px; 
              border-radius: 6px; 
              font-size: 16px; 
              cursor: pointer;
              transition: background 0.2s;
            "
            onmouseover="this.style.background='#0056b3'"
            onmouseout="this.style.background='#007bff'"
          >
            📊 View Detailed Report
          </button>
          <button 
            id="startNewAnalysisBtnMinimal" 
            style="
              background: #6c757d; 
              color: white; 
              border: none; 
              padding: 12px 24px; 
              margin: 0 10px; 
              border-radius: 6px; 
              font-size: 16px; 
              cursor: pointer;
              transition: background 0.2s;
            "
            onmouseover="this.style.background='#5a6268'"
            onmouseout="this.style.background='#6c757d'"
          >
            🔄 Start New Analysis
          </button>
        </div>
        
        <div class="results-summary" style="margin-top: 20px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
          <h3 style="margin-bottom: 15px;">Quick Summary</h3>
          <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #007bff;">
            <p style="margin: 5px 0;"><strong>Working Days:</strong> ${lastAnalysisData.totals?.working_days || 0}</p>
            <p style="margin: 5px 0;"><strong>Total Consignments:</strong> ${lastAnalysisData.totals?.total_consignments || 0}</p>
            <p style="margin: 5px 0;"><strong>Expected Total:</strong> £${lastAnalysisData.totals?.expected_total?.toFixed(2) || '0.00'}</p>
            <p style="margin: 5px 0;"><strong>Paid Total:</strong> £${lastAnalysisData.totals?.paid_total?.toFixed(2) || '0.00'}</p>
            <p style="margin: 5px 0; color: ${(lastAnalysisData.totals?.difference_total || 0) >= 0 ? '#28a745' : '#dc3545'};"><strong>Difference:</strong> £${lastAnalysisData.totals?.difference_total?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>
    `;

    containerRef.current.innerHTML = htmlContent;

    // Attach event listeners with immediate DOM access
    const attachEventListeners = () => {
      console.log('Step3Minimal: Attaching event listeners');
      
      const viewBtn = document.getElementById('viewDetailedReportBtnMinimal');
      const newBtn = document.getElementById('startNewAnalysisBtnMinimal');

      if (viewBtn) {
        console.log('Step3Minimal: View Report button found');
        viewBtn.onclick = (e) => {
          e.preventDefault();
          console.log('Step3Minimal: View Report clicked');
          onViewDetailedReport();
        };
      }

      if (newBtn) {
        console.log('Step3Minimal: New Analysis button found');
        newBtn.onclick = (e) => {
          e.preventDefault();
          console.log('Step3Minimal: New Analysis clicked');
          onStartNewAnalysis();
        };
      }

      if (viewBtn && newBtn) {
        console.log('Step3Minimal: Both buttons successfully attached');
      } else {
        console.error('Step3Minimal: Failed to find buttons', { viewBtn: !!viewBtn, newBtn: !!newBtn });
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(attachEventListeners);

  }, [lastAnalysisData, onViewDetailedReport, onStartNewAnalysis]);

  return (
    <div className={`analyze-section active ${className}`} ref={containerRef}>
      {/* Content will be populated by useEffect */}
    </div>
  );
}