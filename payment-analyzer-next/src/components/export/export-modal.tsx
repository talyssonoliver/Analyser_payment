/**
 * Export Modal Component
 * Provides a user-friendly interface for exporting analysis data
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  FileText, 
  FileText as FileData, 
  FileText as PrintIcon, 
  Globe,
  X,
  Settings,
  CheckCircle
} from 'lucide-react';
import { exportService, type LocalStorageExportData, type ExportOptions } from '@/lib/services/export-service';
import { toast } from '@/lib/utils/toast';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisData: LocalStorageExportData;
  title?: string;
}

interface ExportFormat {
  id: ExportOptions['format'];
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const exportFormats: ExportFormat[] = [
  {
    id: 'csv',
    name: 'CSV Spreadsheet',
    description: 'Excel-compatible format for data analysis',
    icon: <FileText className="w-5 h-5" />,
    color: 'text-green-600'
  },
  {
    id: 'json',
    name: 'JSON Data',
    description: 'Structured data format for developers',
    icon: <FileData className="w-5 h-5" />,
    color: 'text-blue-600'
  },
  {
    id: 'pdf',
    name: 'PDF Report',
    description: 'Print-ready professional report',
    icon: <PrintIcon className="w-5 h-5" />,
    color: 'text-red-600'
  },
  {
    id: 'html',
    name: 'HTML Page',
    description: 'Web page format for sharing',
    icon: <Globe className="w-5 h-5" />,
    color: 'text-purple-600'
  }
];

export function ExportModal({ isOpen, onClose, analysisData, title }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportOptions['format']>('csv');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!includeMetadata && !includeSummary && !includeDetails) {
      toast.error('Please select at least one section to include');
      return;
    }

    setIsExporting(true);
    
    try {
      const options: ExportOptions = {
        format: selectedFormat,
        includeMetadata,
        includeSummary,
        includeDetails,
        filename: customFilename.trim() || undefined
      };

      await exportService.exportLocalStorageAnalysis(analysisData, options);
      
      toast.success(`Analysis exported as ${selectedFormat.toUpperCase()}`);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFormatData = exportFormats.find(f => f.id === selectedFormat);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Export Analysis</h2>
            <p className="text-sm text-slate-600 mt-1">
              {title || `Export data for analysis ${analysisData.analysisId.slice(0, 8)}`}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Format
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {exportFormats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    selectedFormat === format.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={format.color}>
                      {format.icon}
                    </div>
                    <span className="font-semibold text-slate-900">{format.name}</span>
                  </div>
                  <p className="text-sm text-slate-600">{format.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Content Options */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Include Sections
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">Analysis Metadata</div>
                  <div className="text-sm text-slate-600">ID, period, creation date</div>
                </div>
                <CheckCircle className={`w-5 h-5 ${includeMetadata ? 'text-blue-600' : 'text-slate-300'}`} />
              </label>

              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">Summary Statistics</div>
                  <div className="text-sm text-slate-600">Totals, averages, differences</div>
                </div>
                <CheckCircle className={`w-5 h-5 ${includeSummary ? 'text-blue-600' : 'text-slate-300'}`} />
              </label>

              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDetails}
                  onChange={(e) => setIncludeDetails(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">Daily Breakdown</div>
                  <div className="text-sm text-slate-600">Day-by-day payment details</div>
                </div>
                <CheckCircle className={`w-5 h-5 ${includeDetails ? 'text-blue-600' : 'text-slate-300'}`} />
              </label>
            </div>
          </div>

          {/* Custom Filename */}
          <div>
            <label htmlFor="filename" className="block text-sm font-medium text-slate-700 mb-2">
              Custom Filename (optional)
            </label>
            <input
              id="filename"
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder={`payment-analysis-${analysisData.analysisId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}`}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              File extension will be added automatically
            </p>
          </div>

          {/* Preview */}
          {selectedFormatData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {selectedFormatData.icon}
                  Export Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Format:</span>
                    <span className="font-medium">{selectedFormatData.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Analysis:</span>
                    <span className="font-medium">{analysisData.analysisId.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Period:</span>
                    <span className="font-medium">{analysisData.period}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Sections:</span>
                    <span className="font-medium">
                      {[includeMetadata && 'Metadata', includeSummary && 'Summary', includeDetails && 'Details']
                        .filter(Boolean).length} selected
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || (!includeMetadata && !includeSummary && !includeDetails)}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {selectedFormatData?.name}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;