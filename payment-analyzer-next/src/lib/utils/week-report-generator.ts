/**
 * Week Report Generator
 * Generate individual week reports matching original HTML functionality
 */

import { WeekCalculation } from '@/lib/services/payment-calculation-service';

export interface WeekReportData {
  weekData: WeekCalculation;
  weekNumber: number;
  year: number;
  analysisId: string;
  generatedAt: string;
}

export class WeekReportGenerator {
  /**
   * Generate individual week report
   */
  static generateWeekReport(weekData: WeekCalculation, analysisId?: string): WeekReportData {
    const { week, year } = this.getISOWeekNumber(weekData.weekStart);
    
    return {
      weekData,
      weekNumber: week,
      year,
      analysisId: analysisId || `week-${week}-${year}`,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get ISO week number for a date
   */
  private static getISOWeekNumber(date: Date): { week: number; year: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return {
      week: Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7),
      year: d.getUTCFullYear()
    };
  }

  /**
   * Generate week report HTML
   */
  static generateWeekHTML(weekReport: WeekReportData): string {
    const { weekData, weekNumber, year } = weekReport;
    const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;
    const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB');
    
    const weekTitle = `Week ${weekNumber}, ${year} Report`;
    const dateRange = `${formatDate(weekData.days[0]?.date || '')} - ${formatDate(weekData.days[weekData.days.length - 1]?.date || '')}`;

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${weekTitle}</title>
    <style>
        @page { size: A4; margin: 15mm; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { 
            margin: 0; padding: 0; background: white; font-size: 11pt; 
            line-height: 1.4; color: black; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        }
        .header { 
            background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; 
            padding: 20pt; margin-bottom: 15pt; border-radius: 8pt;
        }
        .title { font-size: 24pt; font-weight: 900; margin-bottom: 8pt; }
        .subtitle { font-size: 14pt; opacity: 0.9; margin-bottom: 15pt; }
        .week-info {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 10pt;
            background: rgba(255,255,255,0.1); padding: 12pt; border-radius: 6pt;
        }
        .info-item { text-align: center; }
        .info-label { font-size: 9pt; opacity: 0.8; margin-bottom: 4pt; }
        .info-value { font-size: 16pt; font-weight: bold; }
        
        .section { margin-bottom: 20pt; }
        .section-title { 
            font-size: 16pt; font-weight: 700; margin-bottom: 10pt; 
            padding-bottom: 5pt; border-bottom: 2pt solid #e5e7eb;
            color: #1e40af;
        }
        
        table { 
            width: 100%; border-collapse: collapse; font-size: 9pt; 
            margin-bottom: 15pt;
        }
        th, td { border: 0.5pt solid #d1d5db; padding: 6pt; text-align: left; }
        th { 
            background: #f3f4f6; font-weight: bold; font-size: 8pt;
            text-transform: uppercase; letter-spacing: 0.5pt;
        }
        .amount { text-align: right; font-family: 'Courier New', monospace; }
        .positive { color: #059669; font-weight: bold; }
        .negative { color: #dc2626; font-weight: bold; }
        .center { text-align: center; }
        
        .summary-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 12pt;
            margin-bottom: 20pt;
        }
        .summary-card {
            background: #f8fafc; border: 1pt solid #e2e8f0; border-radius: 6pt;
            padding: 12pt; text-align: center;
        }
        .card-label { font-size: 8pt; color: #64748b; margin-bottom: 6pt; font-weight: 600; }
        .card-value { font-size: 18pt; font-weight: 900; color: #1e293b; }
        .card-change { font-size: 10pt; margin-top: 4pt; }
        
        .footer {
            margin-top: 30pt; padding-top: 15pt; border-top: 1pt solid #e5e7eb;
            text-align: center; font-size: 8pt; color: #6b7280;
        }
        
        .status-badge {
            display: inline-block; padding: 3pt 8pt; border-radius: 12pt;
            font-size: 7pt; font-weight: 600; text-transform: uppercase;
        }
        .badge-ok { background: #dcfce7; color: #166534; border: 1pt solid #bbf7d0; }
        .badge-warning { background: #fef3c7; color: #92400e; border: 1pt solid #fde68a; }
        .badge-error { background: #fee2e2; color: #991b1b; border: 1pt solid #fecaca; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">${weekTitle}</div>
        <div class="subtitle">${dateRange}</div>
        <div class="week-info">
            <div class="info-item">
                <div class="info-label">Working Days</div>
                <div class="info-value">${weekData.workingDays}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Consignments</div>
                <div class="info-value">${weekData.totalConsignments}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Expected</div>
                <div class="info-value">${formatCurrency(weekData.totalExpected)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Difference</div>
                <div class="info-value ${weekData.totalDifference >= 0 ? 'positive' : 'negative'}">
                    ${weekData.totalDifference >= 0 ? '+' : ''}${formatCurrency(weekData.totalDifference)}
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">📊 Week Summary</div>
        <div class="summary-grid">
            <div class="summary-card">
                <div class="card-label">Total Expected</div>
                <div class="card-value">${formatCurrency(weekData.totalExpected)}</div>
                <div class="card-change">Calculated earnings</div>
            </div>
            <div class="summary-card">
                <div class="card-label">Total Actual</div>
                <div class="card-value">${formatCurrency(weekData.totalActual)}</div>
                <div class="card-change">Amount received</div>
            </div>
            <div class="summary-card">
                <div class="card-label">Net Difference</div>
                <div class="card-value ${weekData.totalDifference >= 0 ? 'positive' : 'negative'}">
                    ${weekData.totalDifference >= 0 ? '+' : ''}${formatCurrency(weekData.totalDifference)}
                </div>
                <div class="card-change">
                    ${weekData.totalDifference >= 0 ? 'Favorable' : 'Unfavorable'}
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">📅 Daily Breakdown</div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th class="center">Consignments</th>
                    <th class="amount">Base Pay</th>
                    <th class="amount">Unloading</th>
                    <th class="amount">Attendance</th>
                    <th class="amount">Early</th>
                    <th class="amount">Pickups</th>
                    <th class="amount">Expected</th>
                    <th class="amount">Paid</th>
                    <th class="amount">Difference</th>
                    <th class="center">Status</th>
                </tr>
            </thead>
            <tbody>
`;

    // Add daily rows
    const getStatusInfo = (difference: number) => {
      if (difference >= 0) return { status: 'OK', statusClass: 'badge-ok' };
      if (Math.abs(difference) <= 5) return { status: 'Minor', statusClass: 'badge-warning' };
      return { status: 'Review', statusClass: 'badge-error' };
    };

    weekData.days.forEach(day => {
      const { status, statusClass } = getStatusInfo(day.difference);
      
      html += `
                <tr>
                    <td>${formatDate(day.date)}</td>
                    <td>${day.day}</td>
                    <td class="center">${day.consignments || '-'}</td>
                    <td class="amount">${formatCurrency(day.basePayment)}</td>
                    <td class="amount">${day.unloadingBonus > 0 ? formatCurrency(day.unloadingBonus) : '-'}</td>
                    <td class="amount">${day.attendanceBonus > 0 ? formatCurrency(day.attendanceBonus) : '-'}</td>
                    <td class="amount">${day.earlyBonus > 0 ? formatCurrency(day.earlyBonus) : '-'}</td>
                    <td class="amount">${day.pickupTotal > 0 ? `${formatCurrency(day.pickupTotal)} (${day.pickupCount})` : '-'}</td>
                    <td class="amount">${formatCurrency(day.expectedTotal)}</td>
                    <td class="amount">${formatCurrency(day.paidAmount)}</td>
                    <td class="amount ${day.difference >= 0 ? 'positive' : 'negative'}">
                        ${day.difference >= 0 ? '+' : ''}${formatCurrency(day.difference)}
                    </td>
                    <td class="center">
                        <span class="status-badge ${statusClass}">${status}</span>
                    </td>
                </tr>
      `;
    });

    // Calculate totals
    const totals = {
      consignments: weekData.days.reduce((sum, day) => sum + day.consignments, 0),
      basePayment: weekData.days.reduce((sum, day) => sum + day.basePayment, 0),
      unloadingBonus: weekData.days.reduce((sum, day) => sum + day.unloadingBonus, 0),
      attendanceBonus: weekData.days.reduce((sum, day) => sum + day.attendanceBonus, 0),
      earlyBonus: weekData.days.reduce((sum, day) => sum + day.earlyBonus, 0),
      pickupTotal: weekData.days.reduce((sum, day) => sum + day.pickupTotal, 0)
    };

    html += `
            </tbody>
            <tfoot style="background: #f9fafb; font-weight: bold;">
                <tr>
                    <td colspan="2">TOTALS</td>
                    <td class="center">${totals.consignments}</td>
                    <td class="amount">${formatCurrency(totals.basePayment)}</td>
                    <td class="amount">${formatCurrency(totals.unloadingBonus)}</td>
                    <td class="amount">${formatCurrency(totals.attendanceBonus)}</td>
                    <td class="amount">${formatCurrency(totals.earlyBonus)}</td>
                    <td class="amount">${formatCurrency(totals.pickupTotal)}</td>
                    <td class="amount">${formatCurrency(weekData.totalExpected)}</td>
                    <td class="amount">${formatCurrency(weekData.totalActual)}</td>
                    <td class="amount ${weekData.totalDifference >= 0 ? 'positive' : 'negative'}">
                        ${weekData.totalDifference >= 0 ? '+' : ''}${formatCurrency(weekData.totalDifference)}
                    </td>
                    <td class="center">-</td>
                </tr>
            </tfoot>
        </table>
    </div>

    <div class="footer">
        <p>
            Generated: ${new Date(weekReport.generatedAt).toLocaleString()} | 
            Analysis ID: ${weekReport.analysisId} | 
            Payment Analyzer v9.0.0
        </p>
    </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Generate and download week report
   */
  static downloadWeekReport(weekData: WeekCalculation, analysisId?: string): void {
    const weekReport = this.generateWeekReport(weekData, analysisId);
    const html = this.generateWeekHTML(weekReport);
    
    const filename = `week-${weekReport.weekNumber}-${weekReport.year}-report.html`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Print week report
   */
  static printWeekReport(weekData: WeekCalculation, analysisId?: string): void {
    const weekReport = this.generateWeekReport(weekData, analysisId);
    const html = this.generateWeekHTML(weekReport);
    
    // Create a blob and object URL for printing
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        // Clean up the URL after printing
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      };
    }
  }

  /**
   * Open week report in new tab
   */
  static viewWeekReport(weekData: WeekCalculation, analysisId?: string): void {
    const weekReport = this.generateWeekReport(weekData, analysisId);
    const html = this.generateWeekHTML(weekReport);
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    window.open(url, '_blank');
    
    // Clean up URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
}