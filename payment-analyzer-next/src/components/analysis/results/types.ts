/**
 * Type definitions for Step 3 Results Components
 * These match the interfaces from legacy step3-content-generator.ts
 */

import type { ManualEntry } from "@/types/core";

export interface AnalysisResult {
  date: string;
  expectedTotal: number;
  paidAmount: number;
  consignments?: number;
  basePayment?: number;
  pickupTotal?: number;
  unloadingBonus?: number;
  attendanceBonus?: number;
  earlyBonus?: number;
}

export interface AnalysisTotals {
  paidTotal: number;
  expectedTotal: number;
  workingDays: number;
  totalConsignments: number;
  differenceTotal: number;
  pickupTotal?: number;
  bonusTotal?: number;
  unloadingTotal?: number;
  attendanceTotal?: number;
  earlyTotal?: number;
  pickupCount?: number;
  baseTotal?: number;
  averageDaily?: number;
}

export interface AnalysisMetadata {
  overallStatus: string;
  periodRange: string;
  analysisDate: string;
}

export interface AnalysisData {
  id?: string;
  results?: AnalysisResult[];
  totals?: AnalysisTotals;
  metadata?: AnalysisMetadata;
}

export interface WeekGroup {
  weekStart: Date;
  days: AnalysisResult[];
  totalExpected: number;
  totalActual: number;
  workingDays: number;
}

export interface GlobalState {
  lastAnalysisData: AnalysisData | null;
  manualEntries: ManualEntry[];
  currentInputMethod: "upload" | "manual";
  hasBeenAnalyzed: boolean;
  uploadedFiles: File[];
}
