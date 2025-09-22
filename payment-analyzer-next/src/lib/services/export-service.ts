import type { AnalysisWithDetails } from '@/lib/repositories/analysis-repository';

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'html';
  includeCharts?: boolean;
  includeMetadata?: boolean;
  includeSummary?: boolean;
  includeDetails?: boolean;
  filename?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ExportResult {
  success: boolean;
  data?: string | Blob;
  filename?: string;
  error?: string;
}

export interface LocalStorageExportData {
  analysisId: string;
  period: string;
  createdAt: string;
  totalDays: number;
  summary: {
    totalActual: number;
    totalExpected: number;
    workingDays: number;
    totalConsignments: number;
    averageDaily: number;
    difference: number;
  };
  dailyData: Record<string, {
    consignments: number;
    basePayment: number;
    expectedTotal: number;
    paidAmount: number;
    unloadingBonus: number;
    attendanceBonus: number;
    earlyBonus: number;
    pickups: number;
    pickupTotal: number;
    rate: number;
    status: string;
  }>;
}

export class ExportService {
  
  /**
   * Export analysis data in specified format (for database analyses)
   */
  async exportAnalyses(analyses: AnalysisWithDetails[], options: ExportOptions): Promise<ExportResult> {
    try {
      switch (options.format) {
        case 'csv':
          return this.exportToCSV(analyses);
        case 'json':
          return this.exportToJSON(analyses);
        case 'pdf':
          return await this.exportToPDF(analyses);
        case 'html':
          return this.exportToHTML(analyses);
        default:
          return { success: false, error: 'Unsupported export format' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export single analysis from localStorage format
   */
  async exportLocalStorageAnalysis(data: LocalStorageExportData, options: ExportOptions): Promise<void> {
    const {
      format,
      includeMetadata = true,
      includeSummary = true,
      includeDetails = true,
      filename
    } = options;

    const baseFilename = filename || `payment-analysis-${data.analysisId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}`;

    try {
      switch (format) {
        case 'csv':
          this.exportLocalStorageToCSV(data, { includeMetadata, includeSummary, includeDetails }, baseFilename);
          break;
        case 'json':
          this.exportLocalStorageToJSON(data, { includeMetadata, includeSummary, includeDetails }, baseFilename);
          break;
        case 'pdf':
          this.exportLocalStorageToPDF(data, { includeMetadata, includeSummary, includeDetails });
          break;
        case 'html':
          this.exportLocalStorageToHTML(data, { includeMetadata, includeSummary, includeDetails }, baseFilename);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(analyses: AnalysisWithDetails[]): ExportResult {
    const headers = [
      'Analysis ID',
      'Period Start',
      'Period End',
      'Working Days',
      'Total Consignments',
      'Expected Total',
      'Paid Total',
      'Difference',
      'Status',
      'Created At'
    ];

    const rows = analyses.map(analysis => [
      analysis.id,
      analysis.period_start,
      analysis.period_end,
      analysis.working_days.toString(),
      analysis.total_consignments.toString(),
      analysis.analysis_totals?.expected_total?.toString() || '0',
      analysis.analysis_totals?.paid_total?.toString() || '0',
      analysis.analysis_totals?.difference_total?.toString() || '0',
      analysis.status,
      analysis.created_at
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    return {
      success: true,
      data: csvContent,
      filename: `payment-analyses-${new Date().toISOString().split('T')[0]}.csv`
    };
  }

  /**
   * Export to JSON format
   */
  private exportToJSON(analyses: AnalysisWithDetails[]): ExportResult {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalAnalyses: analyses.length,
      analyses: analyses.map(analysis => ({
        id: analysis.id,
        periodStart: analysis.period_start,
        periodEnd: analysis.period_end,
        workingDays: analysis.working_days,
        totalConsignments: analysis.total_consignments,
        status: analysis.status,
        source: analysis.source,
        totals: {
          expected: analysis.analysis_totals?.expected_total || 0,
          paid: analysis.analysis_totals?.paid_total || 0,
          difference: analysis.analysis_totals?.difference_total || 0,
        },
        dailyEntries: analysis.daily_entries?.map(entry => ({
          date: entry.date,
          consignments: entry.consignments,
          expectedTotal: entry.expected_total,
          paidAmount: entry.paid_amount,
          difference: entry.difference,
          status: entry.status,
        })) || [],
        createdAt: analysis.created_at,
        updatedAt: analysis.updated_at,
      }))
    };

    return {
      success: true,
      data: JSON.stringify(exportData, null, 2),
      filename: `payment-analyses-${new Date().toISOString().split('T')[0]}.json`
    };
  }

  /**
   * Export to HTML format (for database analyses)
   */
  private exportToHTML(analyses: AnalysisWithDetails[]): ExportResult {
    let htmlContent = this.generateHTMLTemplate();
    
    htmlContent += `
    <h1>Payment Analyses Report</h1>
    <div class="metadata">
        <p><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Total Analyses:</strong> ${analyses.length}</p>
    </div>
    
    <div class="analyses-list">
`;

    analyses.forEach((analysis, index) => {
      htmlContent += `
        <div class="analysis-item">
            <h3>Analysis ${index + 1}</h3>
            <div class="analysis-meta">
                <p><strong>ID:</strong> ${analysis.id}</p>
                <p><strong>Period:</strong> ${analysis.period_start} to ${analysis.period_end}</p>
                <p><strong>Working Days:</strong> ${analysis.working_days}</p>
                <p><strong>Status:</strong> ${analysis.status}</p>
            </div>
            
            <div class="analysis-totals">
                <div class="total-item">
                    <span class="label">Expected:</span>
                    <span class="value">£${(analysis.analysis_totals?.expected_total || 0).toFixed(2)}</span>
                </div>
                <div class="total-item">
                    <span class="label">Paid:</span>
                    <span class="value">£${(analysis.analysis_totals?.paid_total || 0).toFixed(2)}</span>
                </div>
                <div class="total-item">
                    <span class="label">Difference:</span>
                    <span class="value ${(analysis.analysis_totals?.difference_total || 0) >= 0 ? 'positive' : 'negative'}">
                        £${(analysis.analysis_totals?.difference_total || 0).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
`;
    });

    htmlContent += `
    </div>
    <div class="footer">
        <p>Generated by Payment Analyzer • ${new Date().toLocaleDateString('en-GB')}</p>
    </div>
</body>
</html>
`;

    return {
      success: true,
      data: htmlContent,
      filename: `payment-analyses-${new Date().toISOString().split('T')[0]}.html`
    };
  }

  /**
   * Export to PDF format - creates print-ready HTML
   */
  private async exportToPDF(analyses: AnalysisWithDetails[]): Promise<ExportResult> {
    const htmlResult = this.exportToHTML(analyses);
    if (!htmlResult.success || !htmlResult.data) {
      return { success: false, error: 'Failed to generate HTML for PDF' };
    }

    // Create a new window with the HTML content for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlResult.data as string);
      printWindow.document.close();
      
      printWindow.onload = () => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
      };
    }

    return {
      success: true,
      filename: htmlResult.filename?.replace('.html', '.pdf')
    };
  }

  /**
   * LocalStorage CSV Export
   */
  private exportLocalStorageToCSV(
    data: LocalStorageExportData,
    options: { includeMetadata: boolean; includeSummary: boolean; includeDetails: boolean },
    filename: string
  ): void {
    const csvRows: string[][] = [];

    if (options.includeMetadata) {
      csvRows.push(['Payment Analysis Report']);
      csvRows.push(['Analysis ID', data.analysisId]);
      csvRows.push(['Period', data.period]);
      csvRows.push(['Created', new Date(data.createdAt).toLocaleString()]);
      csvRows.push([]);
    }

    if (options.includeSummary) {
      csvRows.push(['Summary']);
      csvRows.push(['Working Days', data.summary.workingDays.toString()]);
      csvRows.push(['Total Consignments', data.summary.totalConsignments.toString()]);
      csvRows.push(['Total Expected', `£${data.summary.totalExpected.toFixed(2)}`]);
      csvRows.push(['Total Paid', `£${data.summary.totalActual.toFixed(2)}`]);
      csvRows.push(['Difference', `£${data.summary.difference.toFixed(2)}`]);
      csvRows.push(['Average Daily', `£${data.summary.averageDaily.toFixed(2)}`]);
      csvRows.push([]);
    }

    if (options.includeDetails) {
      csvRows.push([
        'Date', 'Day', 'Consignments', 'Rate', 'Base Payment',
        'Unloading Bonus', 'Attendance Bonus', 'Early Bonus',
        'Pickups', 'Pickup Total', 'Expected Total', 'Paid Amount', 'Difference', 'Status'
      ]);

      Object.entries(data.dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, day]) => {
          const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
          const difference = day.paidAmount - day.expectedTotal;
          
          csvRows.push([
            date, dayName, day.consignments.toString(), `£${day.rate.toFixed(2)}`,
            `£${day.basePayment.toFixed(2)}`, `£${day.unloadingBonus.toFixed(2)}`,
            `£${day.attendanceBonus.toFixed(2)}`, `£${day.earlyBonus.toFixed(2)}`,
            (day.pickups || 0).toString(), `£${(day.pickupTotal || 0).toFixed(2)}`,
            `£${day.expectedTotal.toFixed(2)}`, `£${day.paidAmount.toFixed(2)}`,
            `£${difference.toFixed(2)}`, day.status
          ]);
        });
    }

    const csvContent = csvRows.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * LocalStorage JSON Export
   */
  private exportLocalStorageToJSON(
    data: LocalStorageExportData,
    options: { includeMetadata: boolean; includeSummary: boolean; includeDetails: boolean },
    filename: string
  ): void {
    const exportData: Record<string, unknown> = {};

    if (options.includeMetadata) {
      exportData.metadata = {
        analysisId: data.analysisId,
        period: data.period,
        createdAt: data.createdAt,
        exportedAt: new Date().toISOString()
      };
    }

    if (options.includeSummary) {
      exportData.summary = data.summary;
    }

    if (options.includeDetails) {
      exportData.dailyData = Object.entries(data.dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, day]) => ({
          date,
          dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
          ...day,
          difference: day.paidAmount - day.expectedTotal
        }));
    }

    const jsonContent = JSON.stringify(exportData, null, 2);
    this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
  }

  /**
   * LocalStorage PDF Export (print-ready HTML)
   */
  private exportLocalStorageToPDF(
    data: LocalStorageExportData,
    options: { includeMetadata: boolean; includeSummary: boolean; includeDetails: boolean }
  ): void {
    const htmlContent = this.generateLocalStoragePrintHTML(data, options);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
      };
    }
  }

  /**
   * LocalStorage HTML Export
   */
  private exportLocalStorageToHTML(
    data: LocalStorageExportData,
    options: { includeMetadata: boolean; includeSummary: boolean; includeDetails: boolean },
    filename: string
  ): void {
    const htmlContent = this.generateLocalStoragePrintHTML(data, options);
    this.downloadFile(htmlContent, `${filename}.html`, 'text/html');
  }

  /**
   * Download file in browser
   */
  downloadFile(data: string | Blob, filename: string, mimeType?: string) {
    const blob = typeof data === 'string' ? new Blob([data], { type: mimeType || 'text/plain' }) : data;
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Generate HTML template for exports
   */
  private generateHTMLTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Analysis Report</title>
    <style>
        @page { size: A4; margin: 20mm; }
        @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;
        }
        h1, h2 { color: #1e293b; }
        h1 { text-align: center; margin-bottom: 30px; }
        .metadata { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .analyses-list { space-y: 20px; }
        .analysis-item { border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .analysis-meta p { margin: 5px 0; }
        .analysis-totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px; }
        .total-item { background: #f8fafc; padding: 10px; border-radius: 4px; text-align: center; }
        .label { display: block; font-size: 0.875rem; color: #64748b; }
        .value { font-size: 1.25rem; font-weight: bold; color: #0f172a; }
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
        .footer { margin-top: 40px; text-align: center; color: #64748b; font-size: 0.875rem; }
        @media screen {
            .print-button { position: fixed; top: 20px; right: 20px; padding: 10px 20px; 
                           background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; }
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
`;
  }

  /**
   * Generate print-optimized HTML for localStorage data
   */
  private generateLocalStoragePrintHTML(
    data: LocalStorageExportData,
    options: { includeMetadata: boolean; includeSummary: boolean; includeDetails: boolean }
  ): string {
    let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Analysis Report - ${data.analysisId}</title>
    <style>
        @page { size: A4; margin: 20mm; }
        @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
            .avoid-break { page-break-inside: avoid; }
        }
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.5; color: #000; font-size: 11pt;
        }
        h1 { text-align: center; font-size: 18pt; margin-bottom: 20px; color: #1e293b; }
        h2 { font-size: 14pt; margin-top: 20px; margin-bottom: 10px; color: #334155; }
        .metadata { margin-bottom: 20px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
        .metadata p { margin: 5px 0; font-size: 10pt; }
        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
        .summary-item { padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; text-align: center; }
        .summary-label { font-size: 9pt; color: #64748b; margin-bottom: 5px; }
        .summary-value { font-size: 12pt; font-weight: bold; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
        th, td { padding: 8px 6px; text-align: left; border: 1px solid #e2e8f0; }
        th { background: #f1f5f9; font-weight: 600; color: #334155; }
        td { background: white; }
        tr:nth-child(even) td { background: #f8fafc; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .positive { color: #059669; }
        .negative { color: #dc2626; }
        .footer { margin-top: 30px; text-align: center; font-size: 9pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        @media screen {
            body { max-width: 210mm; margin: 0 auto; padding: 20px; background: white; }
            .print-button { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .print-button:hover { background: #2563eb; }
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
    <h1>Payment Analysis Report</h1>
`;

    if (options.includeMetadata) {
      htmlContent += `
    <div class="metadata avoid-break">
        <p><strong>Analysis ID:</strong> ${data.analysisId}</p>
        <p><strong>Period:</strong> ${data.period}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>
`;
    }

    if (options.includeSummary) {
      htmlContent += `
    <h2>Summary</h2>
    <div class="summary avoid-break">
        <div class="summary-item">
            <div class="summary-label">Working Days</div>
            <div class="summary-value">${data.summary.workingDays}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Total Consignments</div>
            <div class="summary-value">${data.summary.totalConsignments}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Total Expected</div>
            <div class="summary-value">£${data.summary.totalExpected.toFixed(2)}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Total Paid</div>
            <div class="summary-value">£${data.summary.totalActual.toFixed(2)}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Difference</div>
            <div class="summary-value ${data.summary.difference >= 0 ? 'positive' : 'negative'}">
                £${data.summary.difference.toFixed(2)}
            </div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Average Daily</div>
            <div class="summary-value">£${data.summary.averageDaily.toFixed(2)}</div>
        </div>
    </div>
`;
    }

    if (options.includeDetails) {
      htmlContent += `
    <h2>Daily Breakdown</h2>
    <table class="avoid-break">
        <thead>
            <tr>
                <th>Date</th>
                <th>Day</th>
                <th class="text-center">Consign.</th>
                <th class="text-right">Base</th>
                <th class="text-right">Bonuses</th>
                <th class="text-right">Expected</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Diff</th>
            </tr>
        </thead>
        <tbody>
`;

      Object.entries(data.dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, day]) => {
          const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
          const bonuses = day.unloadingBonus + day.attendanceBonus + day.earlyBonus;
          const difference = day.paidAmount - day.expectedTotal;
          
          htmlContent += `
            <tr>
                <td>${new Date(date).toLocaleDateString('en-GB')}</td>
                <td>${dayName}</td>
                <td class="text-center">${day.consignments}</td>
                <td class="text-right">£${day.basePayment.toFixed(2)}</td>
                <td class="text-right">£${bonuses.toFixed(2)}</td>
                <td class="text-right">£${day.expectedTotal.toFixed(2)}</td>
                <td class="text-right">£${day.paidAmount.toFixed(2)}</td>
                <td class="text-right ${difference >= 0 ? 'positive' : 'negative'}">
                    £${difference.toFixed(2)}
                </td>
            </tr>
`;
        });

      htmlContent += `
        </tbody>
    </table>
`;
    }

    htmlContent += `
    <div class="footer">
        <p>Generated by Payment Analyzer • ${new Date().toLocaleDateString('en-GB')}</p>
    </div>
</body>
</html>
`;

    return htmlContent;
  }

  /**
   * Export batch of analyses from localStorage
   */
  async exportBatch(
    analyses: LocalStorageExportData[],
    format: 'csv' | 'json',
    filename: string
  ): Promise<void> {
    if (format === 'csv') {
      const csvRows: string[][] = [];
      
      csvRows.push(['Batch Export - Payment Analyses']);
      csvRows.push(['Export Date', new Date().toLocaleString()]);
      csvRows.push(['Total Analyses', analyses.length.toString()]);
      csvRows.push([]);
      
      analyses.forEach((analysis, index) => {
        if (index > 0) csvRows.push([]);
        
        csvRows.push([`Analysis ${index + 1}`]);
        csvRows.push(['ID', analysis.analysisId]);
        csvRows.push(['Period', analysis.period]);
        csvRows.push(['Working Days', analysis.summary.workingDays.toString()]);
        csvRows.push(['Total Expected', `£${analysis.summary.totalExpected.toFixed(2)}`]);
        csvRows.push(['Total Paid', `£${analysis.summary.totalActual.toFixed(2)}`]);
        csvRows.push(['Difference', `£${analysis.summary.difference.toFixed(2)}`]);
      });
      
      const csvContent = csvRows
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
    } else {
      const jsonContent = JSON.stringify(analyses, null, 2);
      this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
    }
  }

  /**
   * Export chart as image (placeholder)
   */
  async exportChartAsImage(): Promise<ExportResult> {
    // Would use html2canvas or similar library
    return {
      success: false,
      error: 'Chart image export not yet implemented'
    };
  }
}

// Export singleton instance
export const exportService = new ExportService();