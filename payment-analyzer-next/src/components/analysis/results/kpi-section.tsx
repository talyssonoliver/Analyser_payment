'use client';

import { Card, CardContent } from '@/components/ui/card';
import { KPICard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';

interface KPIData {
  workingDays: number;
  totalConsignments: number;
  expectedTotal: number;
  paidTotal: number;
  differenceTotal: number;
  baseTotal: number;
  bonusTotal: number;
  pickupTotal: number;
  averageDaily?: number;
  overallStatus?: string;
}

interface KPISectionProps {
  data: KPIData;
  className?: string;
}

export function KPISection({ data, className = '' }: KPISectionProps) {
  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;
  
  const getDifferenceStatus = () => {
    const diff = data.differenceTotal;
    if (diff >= 0) {
      return {
        variant: 'success' as const,
        icon: '✅',
        text: 'Favorable',
        bgColor: 'bg-green-50',
        textColor: 'text-green-600',
        borderColor: 'border-green-200'
      };
    } else {
      return {
        variant: 'error' as const,
        icon: '❌',
        text: 'Unfavorable',
        bgColor: 'bg-red-50',
        textColor: 'text-red-600',
        borderColor: 'border-red-200'
      };
    }
  };

  const differenceStatus = getDifferenceStatus();
  const averageDaily = data.averageDaily || (data.workingDays > 0 ? data.expectedTotal / data.workingDays : 0);
  const avgConsignments = data.workingDays > 0 ? Math.round(data.totalConsignments / data.workingDays) : 0;

  return (
    <div className={`kpi-section ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
          1
        </div>
        <h3 className="text-lg font-bold text-slate-900">Key Performance Indicators</h3>
      </div>

      {/* KPI Cards Grid - Responsive */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <KPICard
          label="Working Days"
          value={data.workingDays}
          description="Days worked"
          icon={<span className="text-2xl leading-none">📅</span>}
        />
        <KPICard
          label="Consignments"
          value={data.totalConsignments}
          description={'Avg: ' + avgConsignments + '/day'}
          icon={<span className="text-2xl leading-none">📦</span>}
        />
        <KPICard
          label="Expected Total"
          value={formatCurrency(data.expectedTotal)}
          description="Calculated earnings"
          tone="info"
          icon={<span className="text-2xl leading-none">💰</span>}
        />
        <KPICard
          label="Paid Total"
          value={formatCurrency(data.paidTotal)}
          description="Amount received"
          tone="success"
          icon={<span className="text-2xl leading-none">💵</span>}
        />
        <KPICard
          label="Difference"
          value={(data.differenceTotal >= 0 ? '+' : '') + formatCurrency(data.differenceTotal)}
          description={differenceStatus.text}
          tone={data.differenceTotal >= 0 ? 'success' : 'danger'}
          icon={<span className="text-2xl leading-none">{differenceStatus.icon}</span>}
        />
      </div>

      {/* Payment Breakdown */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h4 className="text-base font-semibold text-slate-900 mb-4">Payment Breakdown</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-xs font-medium text-slate-600 mb-1">Base Payment</div>
              <div className="text-lg font-bold text-slate-900">{formatCurrency(data.baseTotal)}</div>
              <div className="text-xs text-slate-500">Consignment rates</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-xs font-medium text-slate-600 mb-1">Bonuses</div>
              <div className="text-lg font-bold text-slate-900">{formatCurrency(data.bonusTotal)}</div>
              <div className="text-xs text-slate-500">Daily bonuses</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-xs font-medium text-slate-600 mb-1">Pickups</div>
              <div className="text-lg font-bold text-slate-900">{formatCurrency(data.pickupTotal)}</div>
              <div className="text-xs text-slate-500">Service fees</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs font-medium text-slate-600 mb-1">Daily Average</div>
              <div className="text-lg font-bold text-blue-600">{formatCurrency(averageDaily)}</div>
              <div className="text-xs text-slate-500">Per working day</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Status Badge */}
      <div className="text-center">
        <Badge 
          variant={differenceStatus.variant} 
          className="px-6 py-2 text-sm font-semibold"
        >
          {data.overallStatus || differenceStatus.text}
        </Badge>
      </div>
    </div>
  );
}

