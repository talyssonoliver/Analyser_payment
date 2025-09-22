/**
 * Revenue Chart Component
 * Interactive bar/line chart showing expected vs actual revenue over time
 */

'use client';

import { useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { ChartContainer } from './chart-container';

// Format tick values for currency
const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(1)}k`;
  }
  return `£${value}`;
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: { expected: number; actual: number; [key: string]: unknown } }>; label?: string }) => {
  if (active && payload?.length && payload[0]?.payload) {
    const data = payload[0].payload;
    const tooltipLabel = typeof data.tooltipLabel === 'string' ? data.tooltipLabel : label;
    // Add safe defaults for missing data
    const expected = typeof data.expected === 'number' ? data.expected : 0;
    const actual = typeof data.actual === 'number' ? data.actual : 0;
    const difference = actual - expected;
    const differenceClass = difference >= 0 ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium mb-2">{tooltipLabel}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-600">Expected:</span>
            <span className="font-medium">£{expected.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600">Actual:</span>
            <span className="font-medium">£{actual.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-1">
            <span className={differenceClass}>Difference:</span>
            <span className={`font-medium ${differenceClass}`}>
              £{difference.toFixed(2)}
              {difference >= 0 ? ' ✓' : ' ⚠'}
            </span>
          </div>
          {data.consignments && typeof data.consignments === 'number' ? (
            <div className="flex justify-between text-slate-600">
              <span>Consignments:</span>
              <span>{data.consignments}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
  return null;
};

export interface RevenueDataPoint {
  period: string; // Date string or period label
  expected: number;
  actual: number;
  difference: number;
  consignments?: number;
  id?: string; // Unique identifier for React keys
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  title?: string;
  subtitle?: string;
  chartType?: 'bar' | 'line';
  viewMode?: 'week' | 'month';
  loading?: boolean;
  error?: string;
  height?: number;
  showReference?: boolean;
  referenceValue?: number;
  referenceLabel?: string;
}

export function RevenueChart({
  data,
  title = 'Revenue Analysis',
  subtitle,
  chartType = 'bar',
  viewMode = 'week',
  loading = false,
  error,
  height = 300,
  showReference = false,
  referenceValue,
  referenceLabel = 'Target',
}: Readonly<RevenueChartProps>) {
  // Group data by week or month based on viewMode
  const groupDataByPeriod = useCallback((inputData: RevenueDataPoint[], mode: 'week' | 'month') => {
    if (!inputData || inputData.length === 0) return [];

    const grouped: Record<string, RevenueDataPoint[]> = {};

    inputData.forEach(item => {
      const date = new Date(item.period);
      if (isNaN(date.getTime())) return;

      let groupKey: string;
      if (mode === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        groupKey = startOfWeek.toISOString().split('T')[0];
      } else {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        groupKey = monthKey;
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(item);
    });

    const aggregated = Object.entries(grouped).map(([groupKey, items]) => {
      const totalExpected = items.reduce((sum, entry) => sum + entry.expected, 0);
      const totalActual = items.reduce((sum, entry) => sum + entry.actual, 0);
      const totalConsignments = items.reduce((sum, entry) => sum + (entry.consignments || 0), 0);

      const startDate = mode === 'week'
        ? new Date(`${groupKey}T00:00:00`)
        : new Date(`${groupKey}-01T00:00:00`);

      let displayPeriod: string;
      if (mode === 'week') {
        const endOfWeek = new Date(startDate);
        endOfWeek.setDate(startDate.getDate() + 6);
        displayPeriod = `${startDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`;
      } else {
        displayPeriod = startDate.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
      }

      return {
        period: displayPeriod,
        periodStart: startDate,
        expected: totalExpected,
        actual: totalActual,
        difference: totalActual - totalExpected,
        consignments: totalConsignments,
        id: `${mode}-${groupKey}`,
      };
    }).sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());

    return aggregated.map((item, index) => ({
      ...item,
      shortLabel: mode === 'week'
        ? `W${index + 1}`
        : item.periodStart.toLocaleDateString('en-GB', { month: 'short' }),
    }));
  }, []);

  // Process data based on view mode
  const processedData = groupDataByPeriod(data, viewMode);
  
  // Clean and validate data to prevent key collisions
  const cleanData = processedData
    .filter(item => {
      if (!item?.period || typeof item.period !== 'string' || item.period.trim().length <= 1) {
        console.warn('Filtering out invalid chart data item:', item);
        return false;
      }
      return true;
    })
            .map((item, index) => {
      const labelSource = item.shortLabel || item.period || '';
      const label = labelSource.toString().trim();
      const safeLabel = label.length > 0 ? label : `W${index + 1}`;
      return {
        ...item,
        label: safeLabel,
        tooltipLabel: item.period,
        period: safeLabel,
        key: item.id || `chart-item-${index}-${safeLabel.replace(/\s+/g, '-').toLowerCase()}`,
      };
    });

  // Debug log to check for duplicate periods
  if (process.env.NODE_ENV === 'development') {
    const periods = cleanData.map(item => item.period);
    const duplicatePeriods = periods.filter((period, index) => periods.indexOf(period) !== index);
    if (duplicatePeriods.length > 0) {
      console.warn('Duplicate periods found in chart data:', duplicatePeriods);
    }
  }

    const barChart = (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={cleanData} margin={{ top: 12, right: 16, left: 16, bottom: 8 }} barCategoryGap="32%">
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          stroke="#64748b"
          fontSize={12}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => `£${Math.round(value)}`}
          stroke="#64748b"
          fontSize={12}
        />
        <Tooltip content={<CustomTooltip />} />
        {showReference && referenceValue && (
          <ReferenceLine
            y={referenceValue}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{ value: referenceLabel, position: 'top', fill: '#f59e0b', fontSize: 12 }}
          />
        )}
        <Bar dataKey="expected" name="Expected" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={36}>
          <LabelList
            dataKey="expected"
            position="top"
            formatter={(value) => (typeof value === 'number' && value > 0 ? `£${Math.round(value)}` : '')}
            fill="#1d4ed8"
            fontSize={12}
          />
        </Bar>
        <Bar dataKey="actual" name="Actual" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );

  const lineChart = (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={cleanData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          stroke="#64748b"
          fontSize={12}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickFormatter={formatCurrency}
          stroke="#64748b"
          fontSize={12}
        />
        <Tooltip content={<CustomTooltip />} />
        {showReference && referenceValue && (
          <ReferenceLine
            y={referenceValue}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{ value: referenceLabel, position: 'top', fill: '#f59e0b', fontSize: 12 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="expected"
          name="Expected"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const chartContent = chartType === 'bar' ? barChart : lineChart;

  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      loading={loading}
      error={error}
      height={height}
    >
      {chartContent}
    </ChartContainer>
  );
}












