/**
 * Dashboard Page
 * Main analytics dashboard with KPIs, charts, and recent analysis
 * REFACTORED: Modular component-based architecture
 */

"use client";

import { BarChart3, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
// Dashboard Components
import {
  CalendarWidget,
  DayDataModal,
  ExecutiveSummary,
  ForecastCard,
  ManualEntryModal,
  QuickActions,
  ViewToggle,
  WeeklyRevenueChart,
  WelcomeScreen,
} from "@/components/dashboard";
import { KPICard } from "@/components/ui/kpi-card";
import { SyncStatusBanner } from "@/components/ui/sync-status-banner";
import { useCalendarData } from "@/hooks/useCalendarData";
import { useDashboardCalendar } from "@/hooks/useDashboardCalendar";
// Custom Hooks
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/lib/hooks/useAuth";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

const getTrendDirection = (value?: number | null) => {
  if (value === undefined || value === null) return "flat" as const;
  if (value > 0) return "up" as const;
  if (value < 0) return "down" as const;
  return "flat" as const;
};

const getPerformanceTrendLabel = (performance: number): string => {
  if (performance >= 95) return "Excellent";
  if (performance >= 85) return "Good";
  return "Needs Review";
};

function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [selectedPeriod] = useState("30d");
  const [execViewMode, setExecViewMode] = useState<"monthly" | "weekly">("monthly");

  // Use custom hooks
  const { data, analyses, loading, loadDashboardData } = useDashboardData();

  const {
    currentMonth,
    currentWeek,
    selectedDate,
    dayModalOpen,
    selectedDayData,
    showManualEntry,
    setDayModalOpen,
    setShowManualEntry,
    navigateMonth,
    handleDayWithData,
    handleDayWithoutData,
    getWeekStart,
    getWeekEnd,
  } = useDashboardCalendar({
    recentAnalyses: data.recentAnalyses,
    viewMode: execViewMode,
  });

  const {
    daysInMonth,
    getPaymentInfoForDate,
    formatCalendarDate,
    isToday,
    getStatusTooltip,
    formatDateKey,
  } = useCalendarData({
    recentAnalyses: data.recentAnalyses,
    currentMonth,
    viewMode: execViewMode,
    currentWeek,
  });

  // Load dashboard data when dependencies change
  const handleLoadData = useCallback(() => {
    if (authLoading || !user?.id) return;

    loadDashboardData({
      userId: user.id,
      period: selectedPeriod,
      viewMode: execViewMode,
      currentMonth,
      currentWeek,
    });
  }, [
    user?.id,
    authLoading,
    selectedPeriod,
    execViewMode,
    currentMonth,
    currentWeek,
    loadDashboardData,
  ]);

  useEffect(() => {
    handleLoadData();
  }, [handleLoadData]);

  // Calendar day click handlers - delegates to hook handlers
  const handleCalendarDayWithData = (date: Date) => {
    handleDayWithData(date);
  };

  const handleCalendarDayWithoutData = (date: Date) => {
    handleDayWithoutData(date);
  };

  // Navigate to analysis page with date
  const handleCalendarAddData = (date: Date) => {
    router.push(`/analysis?date=${formatDateKey(date)}`);
  };

  // Edit day data handler
  const handleEditDayData = (analysisId: string, date: string) => {
    router.push(`/reports?analysis=${analysisId}&day=${date}`);
    setDayModalOpen(false);
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="space-y-6 animate-pulse" style={{ isolation: "isolate", contain: "layout" }}>
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {["a", "b", "c", "d"].map((id) => (
            <div key={`auth-skeleton-${id}`} className="h-20 md:h-32 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-200 rounded-lg"></div>
      </div>
    );
  }

  // Show loading while loading data
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" style={{ isolation: "isolate", contain: "layout" }}>
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {["a", "b", "c", "d"].map((id) => (
            <div
              key={`loading-skeleton-${id}`}
              className="h-20 md:h-32 bg-slate-200 rounded-lg"
            ></div>
          ))}
        </div>
        <div className="h-96 bg-slate-200 rounded-lg"></div>
      </div>
    );
  }

  // Check if user has any data
  const hasAnalysisData = data.recentAnalyses.length > 0;
  const showWelcomeScreen = isAuthenticated && !hasAnalysisData;
  const showDashboardContent = isAuthenticated && hasAnalysisData;

  // Welcome screen for new users
  if (showWelcomeScreen) {
    return <WelcomeScreen onNavigate={(path) => router.push(path)} />;
  }

  // Main dashboard content
  if (showDashboardContent) {
    const summaryCards = [
      {
        key: "expected",
        label: "Expected",
        value: formatCurrency(data.totalRevenue),
        trend: `${Math.abs(data.revenueChange).toFixed(0)}% vs last`,
        trendDirection: getTrendDirection(data.revenueChange),
        tone: "success" as const,
        icon: DollarSign,
      },
      {
        key: "received",
        label: "Received",
        value: formatCurrency(data.totalRevenue),
        trend: "0% vs last",
        trendDirection: "flat" as const,
        tone: "info" as const,
        icon: TrendingUp,
      },
      {
        key: "pending",
        label: "Pending",
        value: data.deliveries.toLocaleString("en-GB"),
        trend: `${Math.abs(data.deliveriesChange).toFixed(0)}% deliveries`,
        trendDirection: getTrendDirection(data.deliveriesChange),
        tone: "warning" as const,
        icon: Calendar,
      },
      {
        key: "efficiency",
        label: "Efficiency",
        value: `${Math.min(100, data.performance).toFixed(0)}%`,
        trend: getPerformanceTrendLabel(data.performance),
        trendDirection: "up" as const,
        tone: "primary" as const,
        icon: BarChart3,
      },
    ];

    return (
      <div className="p-2 sm:p-3 lg:p-4 w-full max-w-7xl mx-auto">
        {/* Sync Status Banner - Shows if unsynced data exists */}
        <SyncStatusBanner onSyncComplete={() => handleLoadData()} />

        {/* Desktop: 12-col grid; Mobile: stacked */}
        <div className="grid gap-3 sm:gap-4 lg:gap-5 lg:grid-cols-12">
          {/* View Toggle (Mobile only - keep legacy placement) */}
          <div className="lg:hidden">
            <ViewToggle value={execViewMode} onChange={setExecViewMode} />
          </div>

          {/* Executive Summary */}
          <div className="lg:col-span-12">
            <ExecutiveSummary
              totalRevenue={data.totalRevenue}
              avgDaily={data.avgDaily}
              deliveries={data.deliveries}
              performance={data.performance}
              revenueChange={data.revenueChange}
              deliveriesChange={data.deliveriesChange}
              periodLabel={data.periodLabel}
            />
          </div>

          {/* Calendar (Left on desktop) */}
          <div className="lg:col-span-7 h-full flex flex-col">
            {/* Desktop controls inline with calendar - fill left column width */}
            <div className="hidden lg:grid grid-cols-7 items-stretch gap-2 mb-2 w-full">
              <div className="col-span-3">
                <ViewToggle
                  variant="compact"
                  value={execViewMode}
                  onChange={setExecViewMode}
                  className="w-full"
                />
              </div>
              <div className="col-span-4">
                <QuickActions variant="compact" onNavigate={(path) => router.push(path)} />
              </div>
            </div>
            <div className="flex-1">
              <CalendarWidget
                currentMonth={currentMonth}
                daysInMonth={daysInMonth}
                selectedDate={selectedDate}
                onNavigate={navigateMonth}
                onDayWithDataClick={handleCalendarDayWithData}
                onDayWithoutDataClick={handleCalendarDayWithoutData}
                getPaymentInfoForDate={getPaymentInfoForDate}
                getStatusTooltip={getStatusTooltip}
                formatCalendarDate={formatCalendarDate}
                isToday={isToday}
                viewMode={execViewMode}
                currentWeek={currentWeek}
                getWeekStart={getWeekStart}
                getWeekEnd={getWeekEnd}
              />
            </div>
          </div>

          {/* Right rail: KPIs, Forecast, Quick Actions */}
          {/* Right rail pinned to calendar height on desktop */}
          <div className="lg:col-span-5 h-full min-h-0 grid grid-rows-[auto_1fr_auto] gap-2">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {summaryCards.map((card) => (
                <KPICard
                  key={card.key}
                  label={card.label}
                  value={card.value}
                  trend={card.trend}
                  trendDirection={card.trendDirection}
                  tone={card.tone}
                  icon={card.icon}
                />
              ))}
            </div>

            {/* Revenue Trend Chart (fills available space) */}
            <div className="min-h-[220px] lg:min-h-[260px] overflow-hidden">
              <WeeklyRevenueChart analyses={analyses} currentMonth={currentMonth} />
            </div>

            {/* Forecast Card */}
            <ForecastCard
              totalRevenue={data.totalRevenue}
              avgDaily={data.avgDaily}
              viewMode={execViewMode}
              currentMonth={currentMonth}
              currentWeek={currentWeek}
            />

            {/* Quick Actions (Mobile/Tablet only) */}
            <div className="lg:hidden">
              <QuickActions onNavigate={(path) => router.push(path)} />
            </div>
          </div>
        </div>

        {/* Portals/Modals */}
        <ManualEntryModal
          open={showManualEntry}
          onClose={() => setShowManualEntry(false)}
          selectedDate={selectedDate}
          onNavigate={handleCalendarAddData}
        />

        <DayDataModal
          open={dayModalOpen}
          onClose={() => setDayModalOpen(false)}
          dayData={selectedDayData?.dayData ?? null}
          onEdit={handleEditDayData}
        />
      </div>
    );
  }

  return null;
}

export default DashboardPage;
