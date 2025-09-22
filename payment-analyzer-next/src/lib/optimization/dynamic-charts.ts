/**
 * Dynamic Recharts Loader
 * Lazy loads recharts only when charts are actually needed
 */

import * as React from 'react';
import { ComponentType, ReactNode } from 'react';

// Common chart data types
export interface ChartDataPoint {
  [key: string]: string | number | Date | null | undefined;
}

// Dynamic component types
export interface ResponsiveContainerProps {
  width?: string | number;
  height?: string | number;
  children: ReactNode;
}

export interface PieChartProps {
  width?: number;
  height?: number;
  children: ReactNode;
}

export interface BarChartProps {
  width?: number;
  height?: number;
  data?: ChartDataPoint[];
  children: ReactNode;
}

export interface LineChartProps {
  width?: number;
  height?: number;
  data?: ChartDataPoint[];
  children: ReactNode;
}

// Chart component props
export interface PieProps {
  data?: ChartDataPoint[];
  dataKey: string;
  cx?: string | number;
  cy?: string | number;
  innerRadius?: number;
  outerRadius?: number;
  fill?: string;
  children?: ReactNode;
}

export interface BarProps {
  dataKey: string;
  fill?: string;
  name?: string;
}

export interface LineProps {
  type?: 'monotone' | 'linear' | 'step';
  dataKey: string;
  stroke?: string;
  strokeWidth?: number;
  name?: string;
}

export interface CellProps {
  fill?: string;
}

export interface TooltipProps {
  formatter?: (value: string | number, name: string) => [string, string];
  labelFormatter?: (label: string) => string;
}

export interface LegendProps {
  wrapperStyle?: React.CSSProperties;
}

export interface XAxisProps {
  dataKey?: string;
  tick?: boolean;
  axisLine?: boolean;
}

export interface YAxisProps {
  tick?: boolean;
  axisLine?: boolean;
}

// Lazy chart loaders
export const loadPieChart = async () => {
  const { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } = await import('recharts');
  return {
    PieChart: PieChart as ComponentType<PieChartProps>,
    Pie: Pie as ComponentType<PieProps>,
    Cell: Cell as ComponentType<CellProps>,
    Tooltip: Tooltip as ComponentType<TooltipProps>,
    Legend: Legend as ComponentType<LegendProps>,
    ResponsiveContainer: ResponsiveContainer as ComponentType<ResponsiveContainerProps>,
  };
};

export const loadBarChart = async () => {
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = await import('recharts');
  return {
    BarChart: BarChart as ComponentType<BarChartProps>,
    Bar: Bar as ComponentType<BarProps>,
    XAxis: XAxis as ComponentType<XAxisProps>,
    YAxis: YAxis as ComponentType<YAxisProps>,
    CartesianGrid: CartesianGrid as ComponentType<Record<string, unknown>>,
    Tooltip: Tooltip as ComponentType<TooltipProps>,
    Legend: Legend as ComponentType<LegendProps>,
    ResponsiveContainer: ResponsiveContainer as ComponentType<ResponsiveContainerProps>,
  };
};

export const loadLineChart = async () => {
  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = await import('recharts');
  return {
    LineChart: LineChart as ComponentType<LineChartProps>,
    Line: Line as ComponentType<LineProps>,
    XAxis: XAxis as ComponentType<XAxisProps>,
    YAxis: YAxis as ComponentType<YAxisProps>,
    CartesianGrid: CartesianGrid as ComponentType<Record<string, unknown>>,
    Tooltip: Tooltip as ComponentType<TooltipProps>,
    Legend: Legend as ComponentType<LegendProps>,
    ResponsiveContainer: ResponsiveContainer as ComponentType<ResponsiveContainerProps>,
  };
};

// Fallback loading component
export const ChartSkeleton = ({ height = 300 }: { height?: number }) => {
  return React.createElement(
    'div',
    {
      style: { height: `${height}px`, isolation: 'isolate', contain: 'layout style' },
      className: 'flex items-center justify-center bg-slate-50 rounded-lg animate-pulse'
    },
    React.createElement(
      'div',
      { className: 'text-slate-400 text-sm' },
      'Loading chart...'
    )
  );
};