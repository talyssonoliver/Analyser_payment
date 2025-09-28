/**
 * KPI Card Component
 * Reusable dashboard metric card with consistent styling
 */

import React from 'react';
import { DollarSign, TrendingUp, BarChart3, FileText } from 'lucide-react';

export interface KPICardProps {
  label: string;
  value: string;
  trend: string;
  variant: 'success' | 'info' | 'warning' | 'primary';
  icon: 'dollar' | 'trending' | 'chart' | 'file';
}

const iconMap = {
  dollar: DollarSign,
  trending: TrendingUp,
  chart: BarChart3,
  file: FileText
};

const variantStyles = {
  success: 'border-l-green-500',
  info: 'border-l-blue-500',
  warning: 'border-l-amber-500',
  primary: 'border-l-purple-500'
};

export function KPICard({ label, value, trend, variant, icon }: KPICardProps) {
  const Icon = iconMap[icon];

  return (
    <div className={`
      bg-gradient-to-br from-white to-slate-50
      p-4 rounded-xl border border-slate-200
      shadow-sm relative overflow-hidden
      border-l-4 ${variantStyles[variant]}
    `}>
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
          {label}
        </div>
        <div className="text-slate-400">
          <Icon size={18} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">
        {value}
      </div>
      <div className="text-xs text-slate-500">
        {trend}
      </div>
    </div>
  );
}