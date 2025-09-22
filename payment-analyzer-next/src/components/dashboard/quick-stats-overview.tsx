/**
 * Quick Stats Overview Component
 * Displays key performance indicators and recent activity summary
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Clock,
  Target
} from 'lucide-react';

type TrendDirection = 'up' | 'down' | 'neutral';
type StatColor = 'green' | 'blue' | 'purple' | 'orange' | 'red';

interface QuickStat {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend: TrendDirection;
  icon: React.ReactNode;
  color: StatColor;
}

interface QuickStatsOverviewProps {
  readonly stats?: QuickStat[];
  readonly isLoading?: boolean;
  readonly className?: string;
}

const defaultStats: QuickStat[] = [
  {
    id: 'total-revenue',
    label: 'Total Revenue',
    value: '$2,847.50',
    change: 12.5,
    changeLabel: 'vs last month',
    trend: 'up',
    icon: <DollarSign className="w-4 h-4" />,
    color: 'green'
  },
  {
    id: 'deliveries',
    label: 'Total Deliveries',
    value: 342,
    change: -3.2,
    changeLabel: 'vs last month',
    trend: 'down',
    icon: <Target className="w-4 h-4" />,
    color: 'blue'
  },
  {
    id: 'avg-daily',
    label: 'Daily Average',
    value: '$94.92',
    change: 8.7,
    changeLabel: 'vs last month',
    trend: 'up',
    icon: <Target className="w-4 h-4" />,
    color: 'purple'
  },
  {
    id: 'efficiency',
    label: 'Efficiency Rate',
    value: '94.2%',
    change: 1.8,
    changeLabel: 'vs last month',
    trend: 'up',
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'orange'
  }
];


const colorClasses = {
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    icon: 'text-green-600',
    border: 'border-green-200'
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: 'text-blue-600',
    border: 'border-blue-200'
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    icon: 'text-purple-600',
    border: 'border-purple-200'
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    icon: 'text-orange-600',
    border: 'border-orange-200'
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: 'text-red-600',
    border: 'border-red-200'
  }
};


export function QuickStatsOverview({ 
  stats = defaultStats, 
  isLoading = false,
  className = ""
}: QuickStatsOverviewProps) {
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`} style={{ isolation: 'isolate', contain: 'layout' }}>
        {/* Loading skeleton for stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={`stat-skeleton-${i}`}>
              <CardHeader className="pb-3">
                <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse" style={{ isolation: 'isolate', contain: 'layout style' }}></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-8 bg-slate-200 rounded w-1/2 animate-pulse" style={{ isolation: 'isolate', contain: 'layout style' }}></div>
                  <div className="h-3 bg-slate-200 rounded w-3/4 animate-pulse" style={{ isolation: 'isolate', contain: 'layout style' }}></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const colors = colorClasses[stat.color];
          
          // Extract TrendIcon assignment to avoid nested ternary
          const getTrendIcon = (trend: TrendDirection) => {
            switch (trend) {
              case 'up': return TrendingUp;
              case 'down': return TrendingDown;
              default: return Clock;
            }
          };
          
          const TrendIcon = getTrendIcon(stat.trend);
          
          // Extract trend color class to avoid nested ternary
          const getTrendColorClass = (trend: TrendDirection) => {
            switch (trend) {
              case 'up': return 'text-green-600';
              case 'down': return 'text-red-600';
              default: return 'text-slate-400';
            }
          };
          
          const trendColorClass = getTrendColorClass(stat.trend);
          
          return (
            <Card key={stat.id} className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center justify-between">
                  {stat.label}
                  <div className={`p-2 rounded-lg ${colors.bg} opacity-80`}>
                    <div className={colors.icon}>
                      {stat.icon}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  {stat.change !== undefined && (
                    <div className="flex items-center gap-1 text-xs">
                      <TrendIcon className={`w-3 h-3 ${trendColorClass}`} />
                      <span className={`font-medium ${trendColorClass}`}>
                        {stat.change > 0 ? '+' : ''}{stat.change}%
                      </span>
                      <span className="text-slate-400">{stat.changeLabel}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}

export default QuickStatsOverview;