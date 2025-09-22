/**
 * Chart Container Component
 * Reusable wrapper for all chart components with consistent styling and loading states
 */

'use client';

import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Loader2 } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string;
  actions?: ReactNode;
  className?: string;
  height?: number;
}

export function ChartContainer({
  title,
  subtitle,
  children,
  loading = false,
  error,
  actions,
  className = '',
  height = 300,
}: ChartContainerProps) {
  return (
    <Card className={`${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div style={{ height: `${height}px` }} className="w-full">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Loading chart data...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-500 mb-2">⚠️</div>
                <p className="text-sm text-slate-500">{error}</p>
              </div>
            </div>
          ) : (
            <div className="h-full w-full">
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}