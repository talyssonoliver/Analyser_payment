/**
 * Analysis History Page
 * Hierarchical view matching original HTML with week/month grouping
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui';
import { ExportModal } from '@/components/export/export-modal';
import { useAuth } from '@/lib/providers/auth-provider';
import { analysisRepository } from '@/lib/repositories/analysis-repository';
import type { AnalysisWithDetails } from '@/lib/repositories/analysis-repository';
import type { LocalStorageExportData } from '@/lib/services/export-service';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  DollarSign,
  Eye
} from 'lucide-react';

// Truck icon component since it's not available in lucide-react
const Truck = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/>
    <path d="M14 17h1a2 2 0 0 0 2-2v-5.5a2.5 2.5 0 0 0-.5-1.5L14 5h-3v13"/>
    <circle cx="7.5" cy="18" r="2.5"/>
    <circle cx="18.5" cy="18" r="2.5"/>
  </svg>
);

// Helper functions to reduce nesting complexity
const filterDaysBySearch = (days: DayEntry[], searchTerm: string) => {
  return days.filter(day => 
    day.date.includes(searchTerm) ||
    day.day.toLowerCase().includes(searchTerm.toLowerCase()) ||
    day.period.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

const filterDaysByDate = (days: DayEntry[], filterDate: Date) => {
  return days.filter(day => new Date(day.date) >= filterDate);
};

const filterDaysByAmount = (days: DayEntry[], amountFilter: string) => {
  return days.filter(day => {
    switch (amountFilter) {
      case 'high': return day.totalAmount >= 100;
      case 'medium': return day.totalAmount >= 50 && day.totalAmount < 100;
      case 'low': return day.totalAmount < 50;
      default: return true;
    }
  });
};

const filterMonthsByDays = (month: MonthData, dayFilter: (days: DayEntry[]) => DayEntry[]) => {
  const filteredWeeks = month.weeks
    .map(week => ({ ...week, days: dayFilter(week.days) }))
    .filter(week => week.days.length > 0);
  
  return { ...month, weeks: filteredWeeks };
};

// Helper functions for UI rendering
const renderExpandIcon = (isExpanded: boolean, size: 'sm' | 'md' = 'md') => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return isExpanded ? 
    <ChevronDown className={`${sizeClass} text-slate-600`} /> : 
    <ChevronRight className={`${sizeClass} text-slate-600`} />;
};

// Helper functions to reduce nesting complexity
const sumConsignments = (sum: number, day: DayEntry) => sum + day.consignments;
const sumTotalAmount = (sum: number, day: DayEntry) => sum + day.totalAmount;
const compareDaysByDate = (a: DayEntry, b: DayEntry) => new Date(b.date).getTime() - new Date(a.date).getTime();

// Props interface to solve the "too many parameters" issue
interface MainContentProps {
  historyData: MonthData[];
  filteredData: MonthData[];
  expandedMonths: Set<string>;
  expandedWeeks: Set<string>;
  toggleMonth: (key: string) => void;
  toggleWeek: (key: string) => void;
  handleWeekClick: (e: React.MouseEvent | React.KeyboardEvent, week: WeekData) => void;
  router: {
    push: (url: string) => void;
    refresh: () => void;
  };
}

const renderMainContent = (props: MainContentProps) => {
  const { historyData, filteredData, expandedMonths, expandedWeeks, toggleMonth, toggleWeek, handleWeekClick, router } = props;
  
  // Handler to reduce nesting in JSX
  const handleViewDay = (analysisId: string, date: string) => {
    router.push(`/reports?analysis=${analysisId}&day=${date}`);
  };
  
  if (historyData.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No History</h3>
        <p className="text-slate-600">Your analysis history will appear here</p>
      </Card>
    );
  }

  if (filteredData.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Results Found</h3>
        <p className="text-slate-600">Try adjusting your search criteria or filters</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {filteredData.map(month => (
        <div key={month.monthKey}>
          {/* Month Header */}
          <button
            onClick={() => toggleMonth(month.monthKey)}
            className="w-full flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              {renderExpandIcon(expandedMonths.has(month.monthKey))}
              <div>
                <h3 className="font-semibold text-slate-900">{month.monthName}</h3>
                <p className="text-sm text-slate-600">
                  {month.totalWeeks} weeks • {month.totalConsignments} consignments • £{month.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </button>

          {/* Expanded Month Content */}
          {expandedMonths.has(month.monthKey) && (
            <div className="ml-4 mt-2 space-y-2">
              {month.weeks.map(week => (
                <div key={week.weekKey}>
                  {/* Week Header */}
                  <div className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleWeek(week.weekKey)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Expand/collapse week"
                      >
                        {renderExpandIcon(expandedWeeks.has(week.weekKey), 'sm')}
                      </button>
                      <div>
                        <h4 className="font-medium text-slate-900">
                          <button
                            onClick={(e) => handleWeekClick(e, week)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleWeekClick(e, week);
                              }
                            }}
                            className="cursor-pointer hover:text-blue-600 hover:underline transition-colors select-none bg-transparent border-none p-0 text-left"
                            title="Click to view week report"
                            tabIndex={0}
                          >
                            Week {week.week}, {week.year}
                          </button>
                        </h4>
                        <p className="text-sm text-slate-600">
                          {week.startDate.toLocaleDateString('en-GB', { 
                            day: '2-digit', month: 'short' 
                          })} - {week.endDate.toLocaleDateString('en-GB', { 
                            day: '2-digit', month: 'short' 
                          })} • {week.days.length} days • {week.totalConsignments} consignments
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">£{week.totalAmount.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Expanded Week Content - Day Entries */}
                  {expandedWeeks.has(week.weekKey) && (
                    <div className="ml-6 mt-2 space-y-1">
                      {week.days.map(day => (
                        <div key={day.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div>
                              <div className="font-medium text-slate-900">
                                {new Date(day.date).toLocaleDateString('en-GB', { 
                                  weekday: 'long', day: 'numeric', month: 'short' 
                                })}
                              </div>
                              <div className="text-sm text-slate-600">{day.consignments} consignments</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-semibold text-slate-900">£{day.totalAmount.toFixed(2)}</div>
                            </div>
                            <button
                              onClick={handleViewDay.bind(null, day.analysisId, day.date)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              <Eye className="w-3 h-3 inline mr-1" />
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface DayEntry {
  id: string;
  date: string;
  day: string;
  consignments: number;
  totalAmount: number;
  analysisId: string;
  period: string;
}

interface WeekData {
  weekKey: string;
  year: number;
  week: number;
  startDate: Date;
  endDate: Date;
  days: DayEntry[];
  totalConsignments: number;
  totalAmount: number;
}

interface MonthData {
  monthKey: string;
  year: number;
  month: number;
  monthName: string;
  weeks: WeekData[];
  totalWeeks: number;
  totalConsignments: number;
  totalAmount: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<MonthData[]>([]);
  const [filteredData, setFilteredData] = useState<MonthData[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<LocalStorageExportData | null>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  // Helper function to get week number of year
  const getWeekOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  };

  const groupByHierarchy = useCallback((dayEntries: DayEntry[]): MonthData[] => {
    const months: { [key: string]: MonthData } = {};

    dayEntries.forEach(entry => {
      const date = new Date(entry.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const week = getWeekOfYear(date);

      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const weekKey = `${year}-W${String(week).padStart(2, '0')}`;

      // Create month if it doesn't exist
      if (!months[monthKey]) {
        months[monthKey] = {
          monthKey,
          year,
          month,
          monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          weeks: [],
          totalWeeks: 0,
          totalConsignments: 0,
          totalAmount: 0
        };
      }

      // Find or create week within month
      let weekData = months[monthKey].weeks.find(w => w.weekKey === weekKey);
      if (!weekData) {
        const weekStart = new Date(date);
        // Get Monday of the week (getDay(): Sunday=0, Monday=1, ..., Saturday=6)
        const dayOfWeek = weekStart.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday case
        weekStart.setDate(weekStart.getDate() + daysToMonday);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Sunday

        weekData = {
          weekKey,
          year,
          week,
          startDate: weekStart,
          endDate: weekEnd,
          days: [],
          totalConsignments: 0,
          totalAmount: 0
        };
        months[monthKey].weeks.push(weekData);
      }

      // Add day to week
      weekData.days.push(entry);
      weekData.totalConsignments += entry.consignments;
      weekData.totalAmount += entry.totalAmount;

      // Update month totals
      months[monthKey].totalConsignments += entry.consignments;
      months[monthKey].totalAmount += entry.totalAmount;
    });

    // Sort weeks within each month and calculate totals
    Object.values(months).forEach(month => {
      month.weeks.sort((a, b) => b.week - a.week);
      month.totalWeeks = month.weeks.length;
      
      // Sort days within each week
      month.weeks.forEach(week => {
        week.days.sort(compareDaysByDate);
      });
    });

    // Convert to array and sort by most recent first
    return Object.values(months).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, []);

  const handleClearHistory = useCallback(async () => {
    if (!user?.id) {
      alert('You must be logged in to clear history');
      return;
    }

    if (!confirm('Clear all analysis history? This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      // Get all user analyses
      const { data: analyses, error: fetchError } = await analysisRepository.getUserAnalyses(user.id, {
        limit: 1000
      });

      if (fetchError) {
        throw new Error(`Failed to fetch analyses: ${fetchError}`);
      }

      if (analyses && analyses.length > 0) {
        // Delete each analysis
        const deletePromises = analyses.map(analysis => 
          analysisRepository.deleteAnalysis(analysis.id)
        );

        const deleteResults = await Promise.all(deletePromises);
        
        // Check for any errors
        const failures = deleteResults.filter(result => result.error);
        if (failures.length > 0) {
          console.error('Some analyses failed to delete:', failures);
          alert(`Warning: ${failures.length} out of ${analyses.length} analyses could not be deleted.`);
        } else {
          console.log(`✅ Successfully deleted ${analyses.length} analyses`);
        }
      }

      // Clear local state
      setHistoryData([]);
      setFilteredData([]);
      setExpandedMonths(new Set());
      setExpandedWeeks(new Set());
      setError(null);
      
      alert('History cleared successfully');
    } catch (error) {
      console.error('Failed to clear history:', error);
      setError(error instanceof Error ? error.message : 'Failed to clear history');
      alert('Failed to clear history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleExportHistory = useCallback(() => {
    if (filteredData.length === 0) {
      return;
    }

    let totalConsignments = 0;
    let totalAmount = 0;
    let totalDays = 0;
    const dailyData: Record<string, { 
      consignments: number; 
      basePayment: number;
      expectedTotal: number;
      paidAmount: number; 
      unloadingBonus: number;
      attendanceBonus: number;
      earlyBonus: number;
      pickups: number;
      pickupTotal: number;
      rate: number;
      status: string;
    }> = {};

    // Helper function to process day data
    const processDayData = (day: DayEntry) => {
      dailyData[day.date] = {
        consignments: day.consignments,
        basePayment: day.totalAmount,
        expectedTotal: day.totalAmount,
        paidAmount: day.totalAmount,
        unloadingBonus: 0, // History doesn't track bonuses separately
        attendanceBonus: 0,
        earlyBonus: 0,
        pickups: 0,
        pickupTotal: 0,
        rate: day.consignments > 0 ? day.totalAmount / day.consignments : 0,
        status: 'completed'
      };
      
      totalConsignments += day.consignments;
      totalAmount += day.totalAmount;
      totalDays++;
    };

    // Convert hierarchical data to daily data format with reduced nesting
    filteredData.forEach(month => {
      month.weeks.forEach(week => {
        week.days.forEach(processDayData);
      });
    });

    // Convert filtered history data to export format
    const exportHistoryData: LocalStorageExportData = {
      analysisId: `history-export-${new Date().getTime()}`,
      period: `${filteredData.length} months of history`,
      createdAt: new Date().toISOString(),
      totalDays,
      summary: {
        totalActual: totalAmount,
        totalExpected: totalAmount,
        workingDays: totalDays,
        totalConsignments,
        averageDaily: totalDays > 0 ? totalAmount / totalDays : 0,
        difference: 0
      },
      dailyData
    };

    setExportData(exportHistoryData);
    setShowExportModal(true);
  }, [filteredData]);

  // Helper function to fetch user analyses with details from database
  const fetchUserAnalysesWithDetails = async (userId: string) => {
    const { data: analyses, error: dbError } = await analysisRepository.getUserAnalyses(userId, {
      limit: 1000,
      orderBy: 'created_at',
      order: 'desc'
    });

    if (dbError) {
      throw new Error(`Failed to load history: ${dbError}`);
    }

    return analyses || [];
  };

  // Helper function to process and set history data
  const processHistoryData = (dayEntries: DayEntry[]) => {
    if (dayEntries.length === 0) {
      setHistoryData([]);
      setFilteredData([]);
      return;
    }

    const groupedData = groupByHierarchy(dayEntries);
    setHistoryData(groupedData);
    setFilteredData(groupedData);

    // Expand the most recent month by default
    if (groupedData.length > 0) {
      setExpandedMonths(new Set([groupedData[0].monthKey]));
    }
  };

  // Load history data from Supabase database
  useEffect(() => {
    const loadHistoryData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const analyses = await fetchUserAnalysesWithDetails(user.id);

        if (analyses.length === 0) {
          setHistoryData([]);
          setFilteredData([]);
          return;
        }

        const dayEntries = convertDatabaseAnalysesToDayEntries(analyses);
        processHistoryData(dayEntries);

      } catch (error) {
        console.error('Error loading history data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load history data');
      } finally {
        setLoading(false);
      }
    };

    loadHistoryData();
  }, [user?.id, groupByHierarchy]);

  // Listen for export events from the header button
  useEffect(() => {
    const handleExportEvent = () => {
      handleExportHistory();
    };

    window.addEventListener('exportHistory', handleExportEvent);
    
    return () => {
      window.removeEventListener('exportHistory', handleExportEvent);
    };
  }, [filteredData, handleExportHistory]); // Depend on filteredData so handleExportHistory has access to current data

  // Listen for clear history events from the header button
  useEffect(() => {
    const handleClearEvent = () => {
      handleClearHistory();
    };

    window.addEventListener('clearHistory', handleClearEvent);
    
    return () => {
      window.removeEventListener('clearHistory', handleClearEvent);
    };
  }, [handleClearHistory]);

  // Handle click outside filters to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  // Filter data when search term or filters change
  useEffect(() => {
    if (!historyData.length) return;
    
    let filtered = [...historyData];
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered
        .map(month => filterMonthsByDays(month, days => filterDaysBySearch(days, searchTerm)))
        .filter(month => month.weeks.length > 0);
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case '7days':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          filterDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          filterDate.setDate(now.getDate() - 90);
          break;
      }
      
      if (dateFilter !== 'all') {
        filtered = filtered
          .map(month => filterMonthsByDays(month, days => filterDaysByDate(days, filterDate)))
          .filter(month => month.weeks.length > 0);
      }
    }
    
    // Apply amount filter
    if (amountFilter !== 'all') {
      filtered = filtered
        .map(month => filterMonthsByDays(month, days => filterDaysByAmount(days, amountFilter)))
        .filter(month => month.weeks.length > 0);
    }
    
    // Recalculate totals for filtered data
    filtered = filtered.map(month => {
      // Reduce nesting by extracting calculation functions
      const calculateWeekConsignments = (week: WeekData) => 
        week.days.reduce(sumConsignments, 0);
      const calculateWeekAmount = (week: WeekData) => 
        week.days.reduce(sumTotalAmount, 0);
      
      const totalConsignments = month.weeks.reduce((sum, week) => 
        sum + calculateWeekConsignments(week), 0);
      const totalAmount = month.weeks.reduce((sum, week) => 
        sum + calculateWeekAmount(week), 0);
      
      return {
        ...month,
        totalConsignments,
        totalAmount,
        weeks: month.weeks.map(week => ({
          ...week,
          totalConsignments: calculateWeekConsignments(week),
          totalAmount: calculateWeekAmount(week)
        }))
      };
    });
    
    setFilteredData(filtered);
  }, [historyData, searchTerm, dateFilter, amountFilter]);

  // Convert database analyses to day entries
  const convertDatabaseAnalysesToDayEntries = (analyses: AnalysisWithDetails[]): DayEntry[] => {
    const dayEntries: DayEntry[] = [];
    
    analyses.forEach((analysis) => {
      if (analysis.daily_entries && analysis.daily_entries.length > 0) {
        analysis.daily_entries.forEach((dayEntry) => {
          dayEntries.push({
            id: `${analysis.id}-${dayEntry.date}`,
            date: dayEntry.date,
            day: new Date(dayEntry.date).toLocaleDateString('en-US', { weekday: 'long' }),
            consignments: dayEntry.consignments,
            totalAmount: dayEntry.expected_total || dayEntry.paid_amount || 0,
            analysisId: analysis.id,
            period: `${new Date(analysis.period_start).toLocaleDateString('en-GB')} - ${new Date(analysis.period_end).toLocaleDateString('en-GB')}`
          });
        });
      }
    });

    return dayEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };



  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const toggleWeek = (weekKey: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekKey)) {
      newExpanded.delete(weekKey);
    } else {
      newExpanded.add(weekKey);
    }
    setExpandedWeeks(newExpanded);
  };


  const handleWeekClick = (e: React.MouseEvent | React.KeyboardEvent, week: WeekData) => {
    e.stopPropagation(); // Prevent week toggle when clicking view button
    // Get the first day's analysis ID as all days in a week should be from the same analysis
    if (week.days.length > 0) {
      const firstDay = week.days[0];
      const startDate = week.startDate.toISOString().split('T')[0];
      const endDate = week.endDate.toISOString().split('T')[0];
      console.log('🔗 History Debug - Navigating to week view:', firstDay.analysisId, startDate, endDate);
      router.push(`/reports?analysis=${firstDay.analysisId}&week=${week.weekKey}&start=${startDate}&end=${endDate}`);
    }
  };


  const getTotalStats = () => {
    const totalConsignments = filteredData.reduce((sum, month) => sum + month.totalConsignments, 0);
    const totalAmount = filteredData.reduce((sum, month) => sum + month.totalAmount, 0);
    const totalDays = filteredData.reduce((sum, month) => 
      sum + month.weeks.reduce((weekSum, week) => weekSum + week.days.length, 0), 0);
    const totalWeeks = filteredData.reduce((sum, month) => sum + month.weeks.length, 0);
    
    return { totalConsignments, totalAmount, totalDays, totalWeeks };
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Analysis History
            </h1>
            <p className="text-slate-600 mt-1">
              {user?.id ? 'Loading your analysis history...' : 'Please log in to view history'}
            </p>
          </div>
        </div>
        {user?.id && (
          <div className="animate-pulse space-y-4" style={{ isolation: 'isolate', contain: 'layout' }}>
            <div className="h-16 bg-slate-200 rounded-lg"></div>
            <div className="h-16 bg-slate-200 rounded-lg"></div>
            <div className="h-16 bg-slate-200 rounded-lg"></div>
          </div>
        )}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Analysis History
            </h1>
            <p className="text-slate-600 mt-1">Error loading history</p>
          </div>
        </div>
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading History</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </Card>
      </div>
    );
  }

  // Show unauthenticated state
  if (!user?.id) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Analysis History
            </h1>
            <p className="text-slate-600 mt-1">Please log in to view your history</p>
          </div>
        </div>
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Login Required</h3>
          <p className="text-slate-600 mb-4">Please log in to view your analysis history</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="mt-4 font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Your data history organized by time period
          </h1>
        </div>
      </div>

      {/* Stats Overview */}
      {filteredData.length > 0 && (() => {
        const stats = getTotalStats();
        return (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 rounded-lg border-0 shadow-sm hover:shadow-md transition-all duration-200" style={{ background: 'linear-gradient(135deg, rgb(248, 250, 252) 0%, rgb(226, 232, 240) 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">{stats.totalDays}</div>
                  <div className="text-sm font-medium text-slate-600">Total Days</div>
                </div>
              </div>
            </Card>
            <Card className="p-4 rounded-lg border-0 shadow-sm hover:shadow-md transition-all duration-200" style={{ background: 'linear-gradient(135deg, rgb(248, 250, 252) 0%, rgb(226, 232, 240) 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">{stats.totalWeeks}</div>
                  <div className="text-sm font-medium text-slate-600">Total Weeks</div>
                </div>
              </div>
            </Card>
            <Card className="p-4 rounded-lg border-0 shadow-sm hover:shadow-md transition-all duration-200" style={{ background: 'linear-gradient(135deg, rgb(248, 250, 252) 0%, rgb(226, 232, 240) 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Truck className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">{stats.totalConsignments}</div>
                  <div className="text-sm font-medium text-slate-600">Consignments</div>
                </div>
              </div>
            </Card>
            <Card className="p-4 rounded-lg border-0 shadow-sm hover:shadow-md transition-all duration-200" style={{ background: 'linear-gradient(135deg, rgb(248, 250, 252) 0%, rgb(226, 232, 240) 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">£{stats.totalAmount.toFixed(2)}</div>
                  <div className="text-sm font-medium text-slate-600">Total Revenue</div>
                </div>
              </div>
            </Card>
            </div>
          </div>
        );
      })()}

      {/* Search and Filters */}
      <div className="space-y-4" ref={filtersRef}>
        {/* Search Bar with Filters Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by date, day, or week name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center px-4 py-3 border rounded-lg transition-colors flex-shrink-0 ${
              showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="p-4 border border-slate-300" style={{ background: 'linear-gradient(135deg, rgb(248, 250, 252) 0%, rgb(226, 232, 240) 100%)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date-filter" className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
                <select 
                  id="date-filter"
                  value={dateFilter} 
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                </select>
              </div>
              <div>
                <label htmlFor="amount-filter" className="block text-sm font-medium text-slate-700 mb-2">Amount Range</label>
                <select 
                  id="amount-filter"
                  value={amountFilter} 
                  onChange={(e) => setAmountFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Amounts</option>
                  <option value="high">£100+ (High)</option>
                  <option value="medium">£50-£99 (Medium)</option>
                  <option value="low">Under £50 (Low)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDateFilter('all');
                    setAmountFilter('all');
                  }}
                  className="w-full px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* History Content */}
      {renderMainContent({
        historyData, 
        filteredData, 
        expandedMonths, 
        expandedWeeks, 
        toggleMonth, 
        toggleWeek, 
        handleWeekClick, 
        router
      })}

      {/* Export Modal */}
      {showExportModal && exportData && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          analysisData={exportData}
          title={`Export Payment History (${exportData.totalDays} days)`}
        />
      )}
    </div>
  );
}