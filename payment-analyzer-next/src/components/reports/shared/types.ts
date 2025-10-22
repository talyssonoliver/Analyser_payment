/**
 * Shared types for report components
 * Ensures type safety across all report views
 */

export interface ReportKPIData {
  expected: number;
  paid: number;
  difference: number;
  consignments: number;
}

export interface ReportKPIGridProps {
  readonly data: ReportKPIData;
  readonly variant?: "full" | "compact";
  readonly columns?: 2 | 4;
  readonly className?: string;
}

export type ReportDisplayMode = "table" | "cards" | "auto";
export type ReportViewMode = "week" | "month";

export interface ReportDailyEntry {
  date: string;
  day: string;
  consignments: number;
  rate: number;
  basePay: number;
  pickups: number;
  pickupTotal: number;
  bonuses: {
    unloading: number;
    attendance: number;
    early: number;
  };
  expected: number;
  paid: number;
  difference: number;
  status: "balanced" | "overpaid" | "underpaid" | "complete" | "pending";
}

export interface ReportTotals {
  consignments: number;
  basePay: number;
  pickups: number;
  bonuses: number;
  expected: number;
  paid: number;
  difference: number;
}

export interface ReportDataDisplayProps {
  readonly dailyEntries: ReportDailyEntry[];
  readonly totals: ReportTotals;
  readonly mode?: ReportDisplayMode;
  readonly viewMode?: ReportViewMode;
  readonly compactView?: boolean;
  readonly showEditButton?: boolean;
  readonly onToggleCompactView?: () => void;
  readonly onEditDayData?: (entry: ReportDailyEntry) => void;
  readonly className?: string;
}

export interface ReportSettlementData {
  consignments: number;
  pickups: number;
  unloading: number;
  attendance: number;
  early: number;
  total: number;
}

export interface ReportSettlementProps {
  breakdown: ReportSettlementData;
  totals: {
    expected: number;
  };
  variant?: "full" | "compact";
  className?: string;
}

export interface ReportHeaderData {
  reportType: string;
  period: string;
  generatedDate: string;
  totalDays: number;
  status: string;
}

export interface ReportHeaderBarProps {
  data: ReportHeaderData;
  context?: "page" | "modal" | "inline";
  className?: string;
}
