/**
 * Analysis Results Page
 * Display detailed results for a specific analysis
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { analysisService } from '@/lib/services/analysis-service';
import { Analysis } from '@/lib/domain/entities/analysis';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonAnalysisPage } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { UpdateAnalysisDialog } from '@/components/analysis/update-analysis-dialog';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Calculator,
  AlertCircle,
  CheckCircle,
  Upload,
} from 'lucide-react';

export default function AnalysisResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const analysisId = params.id as string;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  useEffect(() => {
    const loadAnalysis = async () => {
      if (!analysisId || !user) {
        return;
      }

      try {
        setLoading(true);
        const { analysis: analysisData, error } = await analysisService.getAnalysisById(analysisId);
        
        if (error) {
          setError(error);
        } else if (analysisData) {
          setAnalysis(analysisData);
        } else {
          setError('Analysis not found');
        }
      } catch {
        setError('Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [analysisId, user]);

  const handleExport = () => {
    toast({
      title: 'Feature Coming Soon',
      description: 'Export functionality will be available soon.',
      type: 'info',
    });
  };

  const handleShare = () => {
    toast({
      title: 'Feature Coming Soon',
      description: 'Share functionality will be available soon.',
      type: 'info',
    });
  };

  if (loading) {
    return <SkeletonAnalysisPage />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Analysis Not Found</h2>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return (
      <EmptyState
        icon={Calculator}
        title="No Analysis Data"
        description="This analysis doesn't have any data yet or is still being processed."
        actions={[
          {
            label: 'Back to Dashboard',
            onClick: () => router.push('/dashboard'),
            variant: 'primary',
            icon: ArrowLeft,
          },
          {
            label: 'Refresh Page',
            onClick: () => window.location.reload(),
            variant: 'outline',
          },
        ]}
      />
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'error': return 'error';
      default: return 'secondary';
    }
  };

  const getDifferenceIcon = (difference: number) => {
    if (difference > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (difference < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getDifferenceColor = (difference: number) => {
    if (difference > 0) return 'text-green-600';
    if (difference < 0) return 'text-red-600';
    return 'text-slate-600';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">
              Analysis Results
            </h1>
            <Badge variant={getStatusColor(analysis.status)}>
              {analysis.status}
            </Badge>
          </div>
          <p className="text-slate-600">
            {analysis.period.start.toISOString().split('T')[0]} to {analysis.period.end.toISOString().split('T')[0]} • Created {analysis.createdAt.toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => setShowUpdateDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Update
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Working Days</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-slate-900">{analysis.workingDaysCount}</p>
                  <p className="text-sm text-slate-500 ml-1">/ {analysis.period.getDayCount()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Consignments</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-slate-900">{analysis.totalConsignments.count}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Expected</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-slate-900">£{analysis.expectedTotal.amount}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              {getDifferenceIcon(analysis.differenceTotal.amount)}
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Difference</p>
                <div className="flex items-center">
                  <p className={`text-2xl font-bold ${getDifferenceColor(analysis.differenceTotal.amount)}`}>
                    £{Math.abs(analysis.differenceTotal.amount)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Base Payment</span>
                <span className="font-medium">£{analysis.baseTotal.amount}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Pickups</span>
                <span className="font-medium">£{analysis.pickupTotal.amount}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Bonuses</span>
                <span className="font-medium">£{analysis.bonusTotal.amount}</span>
              </div>
              <hr />
              <div className="flex justify-between py-2 font-semibold">
                <span>Expected Total</span>
                <span>£{analysis.expectedTotal.amount}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Amount Paid</span>
                <span className="font-medium">£{analysis.paidTotal.amount}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Difference</span>
                <span className={`font-medium ${getDifferenceColor(analysis.differenceTotal.amount)}`}>
                  £{analysis.differenceTotal.amount}
                </span>
              </div>
              
              {Math.abs(analysis.differenceTotal.amount) > 0 && (
                <div className={`p-3 rounded-lg flex items-start space-x-2 ${
                  analysis.differenceTotal.amount < 0 ? 'bg-red-50' : 'bg-green-50'
                }`}>
                  {analysis.differenceTotal.amount < 0 ? (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  )}
                  <div className="text-sm">
                    <p className={`font-medium ${
                      analysis.differenceTotal.amount < 0 ? 'text-red-800' : 'text-green-800'
                    }`}>
                      {analysis.differenceTotal.amount < 0 ? 'Underpaid' : 'Overpaid'}
                    </p>
                    <p className={`${
                      analysis.differenceTotal.amount < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {analysis.differenceTotal.amount < 0 
                        ? 'You are owed additional payment'
                        : 'You received more than expected'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Daily Data Coming Soon</h3>
            <p className="text-slate-500">
              Detailed daily breakdown will be displayed here once the analysis entity is fully integrated.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Files Used */}
      {analysis.metadata.originalFilenames && analysis.metadata.originalFilenames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Files Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.metadata.originalFilenames.map((filename, index) => (
                <div key={`file-${filename}-${index}`} className="flex items-center p-3 bg-slate-50 rounded-lg">
                  <FileText className="w-8 h-8 text-slate-600 mr-3" />
                  <div>
                    <p className="font-medium">{filename}</p>
                    <p className="text-sm text-slate-500">
                      PDF File
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Analysis Dialog */}
      <UpdateAnalysisDialog
        analysisId={analysisId}
        isOpen={showUpdateDialog}
        onClose={() => setShowUpdateDialog(false)}
        onSuccess={() => {
          setShowUpdateDialog(false);
          // Reload the analysis to show updated data
          window.location.reload();
        }}
      />
    </div>
  );
}