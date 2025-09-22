/**
 * Storage Administration Component
 * Manage compressed storage, view statistics, and perform maintenance
 */

'use client';

import React, { useState } from 'react';
import { useStorageStats } from '@/hooks/use-compressed-storage';
import { AnalysisStorageService } from '@/lib/services/analysis-storage-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  FileText, 
  Download, 
  Upload,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { toast } from '@/lib/utils/toast';

export function StorageAdmin() {
  const { stats, health, loading, refresh, migrateLegacyData } = useStorageStats();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const exportData = AnalysisStorageService.exportAllData();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment-analyzer-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const result = AnalysisStorageService.importData(data);
        
        if (result.success) {
          toast.success(`Import successful: ${result.imported.length} items imported`);
        } else {
          toast.error(`Import failed: ${result.errors.length} errors`);
          console.error('Import errors:', result.errors);
        }
        
        refresh();
      } catch (error) {
        toast.error('Failed to import data - invalid file format');
        console.error('Import error:', error);
      } finally {
        setIsImporting(false);
      }
    };
    
    input.click();
  };

  const handleMigrateLegacyData = async () => {
    setIsMigrating(true);
    try {
      const result = migrateLegacyData();
      
      if (result.migrated.length > 0) {
        toast.success(`Migrated ${result.migrated.length} items to compressed storage`);
      } else {
        toast.info('No legacy data found to migrate');
      }
      
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} items failed to migrate`);
        console.error('Migration errors:', result.errors);
      }
      
      refresh();
    } catch (error) {
      toast.error('Migration failed');
      console.error('Migration error:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearAnalysisData = () => {
    if (window.confirm('Are you sure you want to clear all analysis data? This cannot be undone.')) {
      AnalysisStorageService.clearAnalysisData();
      toast.success('Analysis data cleared');
      refresh();
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear ALL data including preferences? This cannot be undone.')) {
      AnalysisStorageService.clearAllData();
      toast.success('All data cleared');
      refresh();
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading storage information...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Health Status */}
      {health && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {health.isHealthy ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            )}
            <h3 className="text-lg font-semibold">
              Storage Health: {health.isHealthy ? 'Healthy' : 'Issues Detected'}
            </h3>
          </div>
          
          {health.issues.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-red-800 mb-2">Issues:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {health.issues.map((issue: string) => (
                  <li key={`issue-${issue.replace(/\s/g, '-').toLowerCase()}`} className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-red-500 rounded-full" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {health.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium text-amber-800 mb-2">Recommendations:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {health.recommendations.map((rec: string) => (
                  <li key={`rec-${rec.replace(/\s/g, '-').toLowerCase()}`} className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-amber-500 rounded-full" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Storage Usage */}
      {stats && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold">Storage Usage</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Used Space</span>
                <span className="text-sm text-gray-600">
                  {stats.usage.used} / {stats.usage.used.replace(/[\d.]+/, (match: string) => (parseFloat(match) + parseFloat(stats.usage.available.replace(/[^\d.]/g, ''))).toString())}
                </span>
              </div>
              <Progress 
                value={parseFloat(stats.usage.percentage)} 
                className="h-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {stats.usage.percentage} of browser storage used
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Compression Efficiency</span>
                <Badge variant="secondary">
                  {stats.compression.savedPercentage} saved
                </Badge>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Original: {stats.compression.originalSize}</div>
                <div>Compressed: {stats.compression.compressedSize}</div>
                <div>Saved: {stats.compression.savedBytes}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Data Breakdown */}
      {stats?.breakdown && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold">Data Breakdown</h3>
          </div>
          
          <div className="space-y-3">
            {Object.entries(stats.breakdown).map(([key, data]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{key.replace('pa:', '').replace(':v9', '')}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {data.size} ({data.items} items)
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Management Actions */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-6 h-6 text-indigo-600" />
          <h3 className="text-lg font-semibold">Data Management</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export/Import */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Backup & Restore</h4>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Data'}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleImportData}
                disabled={isImporting}
                className="w-full justify-start"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import Data'}
              </Button>
            </div>
          </div>

          {/* Maintenance */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Maintenance</h4>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMigrateLegacyData}
                disabled={isMigrating}
                className="w-full justify-start"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {isMigrating ? 'Migrating...' : 'Migrate Legacy Data'}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refresh}
                className="w-full justify-start"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Stats
              </Button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-sm text-red-800 mb-3">Danger Zone</h4>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearAnalysisData}
              className="w-full justify-start border-red-200 text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Analysis Data
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearAllData}
              className="w-full justify-start border-red-300 text-red-800 hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default StorageAdmin;