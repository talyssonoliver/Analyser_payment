/**
 * Export Utilities for Analysis Results
 * Matches the original HTML export functionality
 */

import { DayCalculation, WeekCalculation, PaymentTotals } from '@/lib/services/payment-calculation-service';

export interface ExportData {
  totals: PaymentTotals;
  weeks: WeekCalculation[];
  days: DayCalculation[];
  metadata: {
    exportDate: string;
    analysisId: string;
    period: string;
    rulesVersion: string;
  };
}

/**
 * Export analysis data as CSV format
 */
export function exportToCSV(data: ExportData): string {
  const { days, totals, metadata } = data;
  
  let csv = '';
  
  // Header information
  csv += `Payment Analysis Export\n`;
  csv += `Generated: ${new Date(metadata.exportDate).toLocaleDateString()}\n`;
  csv += `Period: ${metadata.period}\n`;
  csv += `Analysis ID: ${metadata.analysisId}\n`;
  csv += `\n`;
  
  // Summary totals
  csv += `SUMMARY TOTALS\n`;
  csv += `Working Days,${totals.workingDays}\n`;
  csv += `Total Consignments,${totals.totalConsignments}\n`;
  csv += `Expected Total,£${totals.expectedTotal.toFixed(2)}\n`;
  csv += `Paid Total,£${totals.paidTotal.toFixed(2)}\n`;
  csv += `Difference,£${totals.differenceTotal.toFixed(2)}\n`;
  csv += `Base Payment,£${totals.baseTotal.toFixed(2)}\n`;
  csv += `Total Bonuses,£${totals.bonusTotal.toFixed(2)}\n`;
  csv += `Pickup Total,£${totals.pickupTotal.toFixed(2)}\n`;
  csv += `\n`;
  
  // Daily breakdown header
  csv += `DAILY BREAKDOWN\n`;
  csv += `Date,Day,Consignments,Rate,Base Payment,Unloading Bonus,Attendance Bonus,Early Bonus,Pickup Count,Pickup Total,Expected Total,Paid Amount,Difference,Status\n`;
  
  // Daily data
  days.forEach(day => {
    const status = day.difference >= 0 ? 'OK' : (Math.abs(day.difference) <= 5 ? 'Minor' : 'Review');
    csv += `${day.date},${day.day},${day.consignments},£${day.rate.toFixed(2)},£${day.basePayment.toFixed(2)},£${day.unloadingBonus.toFixed(2)},£${day.attendanceBonus.toFixed(2)},£${day.earlyBonus.toFixed(2)},${day.pickupCount},£${day.pickupTotal.toFixed(2)},£${day.expectedTotal.toFixed(2)},£${day.paidAmount.toFixed(2)},£${day.difference.toFixed(2)},${status}\n`;
  });
  
  return csv;
}

/**
 * Export analysis data as JSON format
 */
export function exportToJSON(data: ExportData): string {
  return JSON.stringify({
    metadata: data.metadata,
    summary: data.totals,
    weeklyBreakdown: data.weeks.map(week => ({
      weekStart: week.weekStart.toISOString(),
      totalExpected: week.totalExpected,
      totalActual: week.totalActual,
      workingDays: week.workingDays,
      totalConsignments: week.totalConsignments,
      totalDifference: week.totalDifference,
      days: week.days.length
    })),
    dailyBreakdown: data.days.map(day => ({
      ...day,
      formattedDate: new Date(day.date).toLocaleDateString(),
      status: day.difference >= 0 ? 'OK' : (Math.abs(day.difference) <= 5 ? 'Minor' : 'Review')
    }))
  }, null, 2);
}

/**
 * Generate HTML report for printing
 */
export function exportToHTML(data: ExportData): string {
  const { days, totals, metadata } = data;
  
  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB');
  
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Analysis Report - ${metadata.period}</title>
    <style>
        @page { size: A4; margin: 10mm; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { 
            margin: 0; padding: 0; background: white; font-size: 10pt; 
            line-height: 1.4; color: black; font-family: Georgia, 'Times New Roman', serif; 
        }
        .header { 
            background: #f5f5f5; color: black; padding: 12pt; 
            border: 1pt solid #333; margin-bottom: 10pt; text-align: center; 
        }
        .title { font-size: 16pt; font-weight: 900; margin-bottom: 6pt; }
        .subtitle { font-size: 11pt; color: #444; margin-bottom: 10pt; }
        .kpi-grid { 
            display: grid; grid-template-columns: repeat(5, 1fr); 
            gap: 6pt; margin-bottom: 10pt; 
        }
        .kpi-card { 
            background: white; border: 1pt solid #666; padding: 6pt; 
            text-align: center; page-break-inside: avoid; 
        }
        .kpi-label { 
            font-size: 6pt; color: #555; margin-bottom: 2pt; 
            text-transform: uppercase; font-weight: 700; 
            font-family: Verdana, Arial, sans-serif; 
        }
        .kpi-value { 
            font-size: 12pt; color: black; font-weight: 900; 
            font-family: Georgia, serif; 
        }
        table { 
            width: 100%; border-collapse: collapse; font-size: 8pt; 
            margin-bottom: 10pt; page-break-inside: auto; 
        }
        th, td { border: 0.5pt solid #666; padding: 3pt; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; font-size: 7pt; }
        .positive { color: green; font-weight: bold; }
        .negative { color: red; font-weight: bold; }
        .section-title { 
            font-size: 11pt; font-weight: 800; margin: 10pt 0 6pt 0; 
            padding-bottom: 3pt; border-bottom: 1pt solid #333; 
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Payment Analysis Report</div>
        <div class="subtitle">${metadata.period}</div>
        <div style="font-size: 9pt;">Generated: ${new Date(metadata.exportDate).toLocaleDateString()}</div>
    </div>

    <div class="section-title">Key Performance Indicators</div>
    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-label">Working Days</div>
            <div class="kpi-value">${totals.workingDays}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Consignments</div>
            <div class="kpi-value">${totals.totalConsignments}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Expected Total</div>
            <div class="kpi-value">${formatCurrency(totals.expectedTotal)}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Paid Total</div>
            <div class="kpi-value">${formatCurrency(totals.paidTotal)}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Difference</div>
            <div class="kpi-value ${totals.differenceTotal >= 0 ? 'positive' : 'negative'}">
                ${totals.differenceTotal >= 0 ? '+' : ''}${formatCurrency(totals.differenceTotal)}
            </div>
        </div>
    </div>

    <div class="section-title">Daily Breakdown</div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Consignments</th>
                <th>Base Pay</th>
                <th>Bonuses</th>
                <th>Pickups</th>
                <th>Expected</th>
                <th>Paid</th>
                <th>Difference</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
  `;
  
  days.forEach(day => {
    const status = day.difference >= 0 ? 'OK' : (Math.abs(day.difference) <= 5 ? 'Minor' : 'Review');
    const diffClass = day.difference >= 0 ? 'positive' : 'negative';
    
    html += `
            <tr>
                <td>${formatDate(day.date)}</td>
                <td>${day.day}</td>
                <td>${day.consignments || '-'}</td>
                <td>${formatCurrency(day.basePayment)}</td>
                <td>${formatCurrency(day.totalBonus)}</td>
                <td>${day.pickupTotal > 0 ? `${formatCurrency(day.pickupTotal)} (${day.pickupCount})` : '-'}</td>
                <td>${formatCurrency(day.expectedTotal)}</td>
                <td>${formatCurrency(day.paidAmount)}</td>
                <td class="${diffClass}">${day.difference >= 0 ? '+' : ''}${formatCurrency(day.difference)}</td>
                <td>${status}</td>
            </tr>
    `;
  });
  
  html += `
        </tbody>
        <tfoot>
            <tr style="font-weight: bold; background: #f9f9f9;">
                <td colspan="2">TOTALS</td>
                <td>${totals.totalConsignments}</td>
                <td>${formatCurrency(totals.baseTotal)}</td>
                <td>${formatCurrency(totals.bonusTotal)}</td>
                <td>${formatCurrency(totals.pickupTotal)}</td>
                <td>${formatCurrency(totals.expectedTotal)}</td>
                <td>${formatCurrency(totals.paidTotal)}</td>
                <td class="${totals.differenceTotal >= 0 ? 'positive' : 'negative'}">
                    ${totals.differenceTotal >= 0 ? '+' : ''}${formatCurrency(totals.differenceTotal)}
                </td>
                <td></td>
            </tr>
        </tfoot>
    </table>

    <div style="margin-top: 20pt; font-size: 8pt; color: #666; text-align: center;">
        Analysis ID: ${metadata.analysisId} | Rules Version: ${metadata.rulesVersion}
    </div>
</body>
</html>
  `;
  
  return html;
}

/**
 * Download file with given content and filename
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
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
 * Trigger print dialog for HTML content
 */
export function printHTML(htmlContent: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      // Optionally close the window after printing
      // printWindow.close();
    };
  }
}

/**
 * Generate filename for export based on analysis data
 */
export function generateExportFilename(
  metadata: ExportData['metadata'], 
  format: 'csv' | 'json' | 'html'
): string {
  const date = new Date().toISOString().split('T')[0];
  const period = metadata.period.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  return `payment-analysis-${period}-${date}.${format}`;
}