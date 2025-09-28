'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DailyBonusTooltip } from '@/components/ui/bonus-tooltip';
import { ChevronDown, ChevronRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

interface DayEntry {
  date: string;
  day: string;
  consignments: number;
  rate: number;
  basePayment: number;
  unloadingBonus: number;
  attendanceBonus: number;
  earlyBonus: number;
  totalBonus: number;
  pickupCount: number;
  pickupTotal: number;
  expectedTotal: number;
  paidAmount: number;
  difference: number;
}

interface WeekData {
  weekStart: Date;
  days: DayEntry[];
  totalExpected: number;
  totalActual: number;
  workingDays: number;
  totalConsignments: number;
  totalDifference: number;
}

interface WeeklyBreakdownProps {
  weeklyData: WeekData[];
  className?: string;
  onWeekReportClick?: (weekData: WeekData) => void;
  defaultExpanded?: boolean;
}

// Helper function to get ISO week number
function getISOWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return {
    week: Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7),
    year: d.getUTCFullYear()
  };
}

export function WeeklyBreakdown({ 
  weeklyData, 
  className = '', 
  onWeekReportClick,
  defaultExpanded = true 
}: WeeklyBreakdownProps) {
  // Track which weeks are expanded
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(
    new Set(defaultExpanded ? weeklyData.map((_, index) => index) : [])
  );

  const toggleWeekExpansion = (weekIndex: number) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekIndex)) {
      newExpanded.delete(weekIndex);
    } else {
      newExpanded.add(weekIndex);
    }
    setExpandedWeeks(newExpanded);
  };
  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
  };

  const getStatusBadge = (difference: number) => {
    if (difference >= 0) {
      return <Badge variant="success" className="text-xs">✓ OK</Badge>;
    } else if (Math.abs(difference) <= 5) {
      return <Badge variant="warning" className="text-xs">⚠ Minor</Badge>;
    } else {
      return <Badge variant="error" className="text-xs">✗ Review</Badge>;
    }
  };

  const getDifferenceClass = (difference: number) => {
    if (difference >= 0) return 'text-green-600 font-medium';
    return 'text-red-600 font-medium';
  };

  if (!weeklyData || weeklyData.length === 0) {
    return (
      <div className={`week-data-summary ${className}`}>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Week Data Available</h3>
            <p className="text-slate-500">Run analysis to see weekly breakdown</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`week-data-summary ${className}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xl">📈</span>
          <h3 className="text-lg font-semibold text-slate-900">Breakdown by Week</h3>
        </div>

        {weeklyData.map((week, weekIndex) => {
          const weekEndDate = new Date(week.weekStart);
          weekEndDate.setDate(weekEndDate.getDate() + 6);
          
          const { week: isoWeek, year: isoYear } = getISOWeekNumber(week.weekStart);
          const isExpanded = expandedWeeks.has(weekIndex);
          
          const weekTitle = `Week of ${week.weekStart.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short' 
          })} - ${weekEndDate.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          })}`;

          return (
            <Card key={weekIndex} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <CardHeader 
                className="bg-gradient-to-r from-slate-50 to-white border-b cursor-pointer hover:from-slate-100 hover:to-slate-50 transition-colors"
                onClick={() => toggleWeekExpansion(weekIndex)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-slate-200 transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                    
                    <div>
                      <CardTitle className="text-base font-medium text-slate-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {weekTitle}
                      </CardTitle>
                      <div className="text-sm text-slate-500 mt-1">
                        Week {isoWeek}, {isoYear} • {week.workingDays} working days • {week.totalConsignments} consignments
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Week Summary Stats */}
                    <div className="hidden sm:flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-slate-900">{formatCurrency(week.totalExpected)}</div>
                        <div className="text-xs text-slate-500">Expected</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-slate-900">{formatCurrency(week.totalActual)}</div>
                        <div className="text-xs text-slate-500">Actual</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-medium flex items-center gap-1 ${
                          week.totalDifference >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {week.totalDifference >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {week.totalDifference >= 0 ? '+' : ''}{formatCurrency(week.totalDifference)}
                        </div>
                        <div className="text-xs text-slate-500">Difference</div>
                      </div>
                    </div>
                    
                    {/* Week Report Button */}
                    {onWeekReportClick && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onWeekReportClick(week);
                        }}
                        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        View Report
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="p-0">
                  {/* Week Summary Cards - Mobile responsive */}
                  <div className="p-4 bg-slate-50/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-xs font-medium text-slate-600 mb-1">Expected</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {formatCurrency(week.totalExpected)}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-xs font-medium text-slate-600 mb-1">Actual</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {formatCurrency(week.totalActual)}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-xs font-medium text-slate-600 mb-1">Difference</div>
                        <div className={`text-sm font-semibold ${getDifferenceClass(week.totalDifference)}`}>
                          {week.totalDifference >= 0 ? '+' : ''}{formatCurrency(week.totalDifference)}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-xs font-medium text-slate-600 mb-1">Status</div>
                        <div>{getStatusBadge(week.totalDifference)}</div>
                      </div>
                    </div>
                  </div>

                {/* Daily Breakdown Table - Responsive */}
                <div className="overflow-x-auto">
                  {/* Mobile View */}
                  <div className="md:hidden">
                    {week.days.map((day, dayIndex) => (
                      <div key={dayIndex} className="border-b border-slate-200 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-slate-900">
                              {formatDate(day.date)} - {day.day}
                            </div>
                            <div className="text-sm text-slate-600">
                              {day.consignments} consignments @ {formatCurrency(day.rate)}
                            </div>
                          </div>
                          {getStatusBadge(day.difference)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-slate-600">Base Payment</div>
                            <div className="font-medium">{formatCurrency(day.basePayment)}</div>
                          </div>
                          <div>
                            <div className="text-slate-600">Total Bonus</div>
                            <div className="font-medium">{formatCurrency(day.totalBonus)}</div>
                          </div>
                          <div>
                            <div className="text-slate-600">Expected</div>
                            <div className="font-medium">{formatCurrency(day.expectedTotal)}</div>
                          </div>
                          <div>
                            <div className="text-slate-600">Actual</div>
                            <div className="font-medium">{formatCurrency(day.paidAmount)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-sm font-medium text-slate-600">Difference</span>
                          <span className={`text-sm font-semibold ${getDifferenceClass(day.difference)}`}>
                            {day.difference >= 0 ? '+' : ''}{formatCurrency(day.difference)}
                          </span>
                        </div>

                        {/* Bonus Breakdown - Expandable on mobile */}
                        {day.totalBonus > 0 && (
                          <details className="text-xs text-slate-600">
                            <summary className="cursor-pointer hover:text-slate-800 select-none">
                              Bonus Details
                            </summary>
                            <div className="mt-2 pl-4 space-y-1">
                              {day.unloadingBonus > 0 && (
                                <div>Unloading: {formatCurrency(day.unloadingBonus)}</div>
                              )}
                              {day.attendanceBonus > 0 && (
                                <div>Attendance: {formatCurrency(day.attendanceBonus)}</div>
                              )}
                              {day.earlyBonus > 0 && (
                                <div>Early: {formatCurrency(day.earlyBonus)}</div>
                              )}
                              {day.pickupTotal > 0 && (
                                <div>Pickups: {formatCurrency(day.pickupTotal)} ({day.pickupCount})</div>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-t">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-700">Day</th>
                          <th className="text-right py-3 px-4 font-medium text-slate-700">Consignments</th>
                          <th className="text-right py-3 px-4 font-medium text-slate-700">Base Pay</th>
                          <th className="text-right py-3 px-4 font-medium text-slate-700">Bonuses</th>
                          <th className="text-right py-3 px-4 font-medium text-slate-700">Pickups</th>
                          <th className="text-right py-3 px-4 font-medium text-slate-700">Expected</th>
                          <th className="text-right py-3 px-4 font-medium text-slate-700">Paid</th>
                          <th className="text-right py-3 px-4 font-medium text-slate-700">Difference</th>
                          <th className="text-center py-3 px-4 font-medium text-slate-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {week.days.map((day, dayIndex) => (
                          <tr key={dayIndex} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 font-medium">{formatDate(day.date)}</td>
                            <td className="py-3 px-4 text-slate-600">{day.day}</td>
                            <td className="py-3 px-4 text-right">{day.consignments || '-'}</td>
                            <td className="py-3 px-4 text-right font-medium">
                              {formatCurrency(day.basePayment)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {day.totalBonus > 0 ? (
                                <DailyBonusTooltip 
                                  day={{
                                    day: day.day,
                                    unloadingBonus: day.unloadingBonus,
                                    attendanceBonus: day.attendanceBonus,
                                    earlyBonus: day.earlyBonus,
                                    pickupTotal: day.pickupTotal,
                                    pickupCount: day.pickupCount
                                  }}
                                >
                                  <span className="cursor-help border-b border-dotted border-slate-400">
                                    {formatCurrency(day.totalBonus)}
                                  </span>
                                </DailyBonusTooltip>
                              ) : '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {day.pickupTotal > 0 ? (
                                `${formatCurrency(day.pickupTotal)} (${day.pickupCount})`
                              ) : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {formatCurrency(day.expectedTotal)}
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {formatCurrency(day.paidAmount)}
                            </td>
                            <td className={`py-3 px-4 text-right font-medium ${getDifferenceClass(day.difference)}`}>
                              {day.difference >= 0 ? '+' : ''}{formatCurrency(day.difference)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {getStatusBadge(day.difference)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}