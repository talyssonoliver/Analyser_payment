/**
 * KPI Cards Component
 * Display key performance indicators with trend indicators
 */

'use client';

import { Card, CardContent } from '@/components/ui';
import { TrendIndicator } from './trend-indicator';
import { 
  DollarSign, 
  Calendar, 
  Activity, 
  TrendingUp,
  FileText,
  Target,
  Percent,
  Clock
} from 'lucide-react';

export interface KPIData {
  id: string;
  label: string;
  value: string | number;
  change?: number; // Percentage change
  changeLabel?: string;
  icon?: 'dollar' | 'calendar' | 'activity' | 'trending' | 'file' | 'target' | 'percent' | 'clock';
  format?: 'currency' | 'percentage' | 'number' | 'text';
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'slate';
}

interface KPICardsProps {
  data: KPIData[];
  loading?: boolean;
}

const iconMap = {
  dollar: DollarSign,
  calendar: Calendar,
  activity: Activity,
  trending: TrendingUp,
  file: FileText,
  target: Target,
  percent: Percent,
  clock: Clock,
};

const colorMap = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  slate: 'text-slate-600',
};

export function KPICards({ data, loading = false }: KPICardsProps) {
  const formatValue = (value: string | number, format?: string) => {
    if (loading) return '...';
    
    switch (format) {
      case 'currency':
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return `£${numValue.toLocaleString('en-UK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage':
        return `${value}%`;
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      default:
        return value;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-3 md:p-6">
              <div className="animate-pulse" style={{ isolation: 'isolate', contain: 'layout style' }}>
                <div className="flex items-center">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-slate-200 rounded"></div>
                  <div className="ml-2 md:ml-4 flex-1">
                    <div className="h-3 md:h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                    <div className="h-5 md:h-6 bg-slate-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {data.map((kpi) => {
        const Icon = iconMap[kpi.icon || 'activity'];
        const colorClass = colorMap[kpi.color || 'blue'];
        
        return (
          <Card key={kpi.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center">
                <Icon className={`w-6 h-6 md:w-8 md:h-8 ${colorClass}`} />
                <div className="ml-2 md:ml-4 flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-slate-600 truncate">{kpi.label}</p>
                  <div className="flex items-center">
                    <p className="text-lg md:text-2xl font-bold text-slate-900 truncate">
                      {formatValue(kpi.value, kpi.format)}
                    </p>
                    {kpi.change !== undefined && (
                      <div className="ml-1 md:ml-2 flex-shrink-0">
                        <TrendIndicator
                          value={kpi.change}
                          label={kpi.changeLabel}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}