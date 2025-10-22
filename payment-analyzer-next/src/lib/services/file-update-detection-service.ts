/**
 * File Update Detection Service
 * Detects when uploaded files should update existing analysis vs create new one
 */

import type { DailyEntryRecord } from "@/lib/repositories/analysis-repository";

export interface FileUpdateStrategy {
  type: "create_new" | "update_existing" | "merge_data";
  reason: string;
  affectedDates: string[];
  existingAnalysisId?: string;
  mergeStrategy?: "add_invoice" | "replace_runsheet" | "full_replace";
}

export interface ExistingAnalysisData {
  id: string;
  created_at: string;
  fingerprint: string;
  dailyEntries: DailyEntryRecord[];
}

export class FileUpdateDetectionService {
  /**
   * Detect if new data should update existing analysis or create new one
   */
  detectUpdateStrategy(
    newEntries: DailyEntryRecord[],
    existingAnalyses: ExistingAnalysisData[]
  ): FileUpdateStrategy {
    // Extract dates from new entries
    const newDates = new Set(newEntries.map((e) => e.date));

    // Find analyses with overlapping dates
    const overlappingAnalyses = existingAnalyses.filter((analysis) =>
      analysis.dailyEntries.some((entry) => newDates.has(entry.date))
    );

    // No overlap - create new analysis
    if (overlappingAnalyses.length === 0) {
      return {
        type: "create_new",
        reason: "No existing data for these dates",
        affectedDates: Array.from(newDates),
      };
    }

    // Single overlap - determine merge strategy
    if (overlappingAnalyses.length === 1) {
      const existing = overlappingAnalyses[0];
      const strategy = this.determineMergeStrategy(newEntries, existing.dailyEntries);

      return {
        type: "merge_data",
        reason: strategy.reason,
        affectedDates: strategy.affectedDates,
        existingAnalysisId: existing.id,
        mergeStrategy: strategy.type,
      };
    }

    // Multiple overlaps - suggest creating new
    return {
      type: "create_new",
      reason: `Data overlaps with ${overlappingAnalyses.length} existing analyses. Creating separate analysis.`,
      affectedDates: Array.from(newDates),
    };
  }

  /**
   * Determine how to merge new data with existing data
   */
  private determineMergeStrategy(
    newEntries: DailyEntryRecord[],
    existingEntries: DailyEntryRecord[]
  ): {
    type: "add_invoice" | "replace_runsheet" | "full_replace";
    reason: string;
    affectedDates: string[];
  } {
    const affectedDates: string[] = [];
    const hasNewInvoices = newEntries.some((e) => e.paid_amount && e.paid_amount > 0);
    const hasNewConsignments = newEntries.some((e) => e.consignments && e.consignments > 0);

    // Check each overlapping date
    for (const newEntry of newEntries) {
      const existing = existingEntries.find((e) => e.date === newEntry.date);
      if (existing) {
        affectedDates.push(newEntry.date);
      }
    }

    // Scenario 1: Adding invoice to existing runsheet data
    if (hasNewInvoices && !hasNewConsignments) {
      const existingHasConsignments = existingEntries.some(
        (e) => affectedDates.includes(e.date) && e.consignments > 0
      );

      if (existingHasConsignments) {
        return {
          type: "add_invoice",
          reason: "Adding invoice payment data to existing runsheet consignment data",
          affectedDates,
        };
      }
    }

    // Scenario 2: Replacing runsheet with updated version
    if (hasNewConsignments && !hasNewInvoices) {
      return {
        type: "replace_runsheet",
        reason: "Replacing existing runsheet data with updated version",
        affectedDates,
      };
    }

    // Scenario 3: Full replacement (both consignments and payments)
    return {
      type: "full_replace",
      reason: "Replacing all data for these dates",
      affectedDates,
    };
  }

  /**
   * Merge new entries with existing entries based on strategy
   */
  mergeEntries(
    newEntries: DailyEntryRecord[],
    existingEntries: DailyEntryRecord[],
    strategy: "add_invoice" | "replace_runsheet" | "full_replace"
  ): DailyEntryRecord[] {
    const result: DailyEntryRecord[] = [];
    const newDateMap = new Map(newEntries.map((e) => [e.date, e]));
    const existingDateMap = new Map(existingEntries.map((e) => [e.date, e]));

    // Collect all unique dates
    const allDates = new Set([
      ...newEntries.map((e) => e.date),
      ...existingEntries.map((e) => e.date),
    ]);

    for (const date of allDates) {
      const newEntry = newDateMap.get(date);
      const existingEntry = existingDateMap.get(date);

      if (!existingEntry) {
        // New date - just add it
        if (newEntry) {
          result.push(newEntry);
        }
        continue;
      }

      if (!newEntry) {
        // Only in existing - keep it
        result.push(existingEntry);
        continue;
      }

      // Both exist - apply merge strategy
      switch (strategy) {
        case "add_invoice":
          // Keep consignments from existing, add paid_amount from new
          result.push({
            ...existingEntry,
            paid_amount: newEntry.paid_amount || existingEntry.paid_amount,
            // Keep all bonus data from recalculation
            expected_total: newEntry.expected_total || existingEntry.expected_total,
            difference: newEntry.difference || existingEntry.difference,
          });
          break;

        case "replace_runsheet":
          // Keep paid_amount from existing, replace consignments from new
          result.push({
            ...newEntry,
            paid_amount: existingEntry.paid_amount || newEntry.paid_amount,
          });
          break;

        case "full_replace":
          // Use new data completely
          result.push(newEntry);
          break;
      }
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Check if two sets of entries are duplicates (identical dates and values)
   */
  areDuplicates(entries1: DailyEntryRecord[], entries2: DailyEntryRecord[]): boolean {
    if (entries1.length !== entries2.length) return false;

    const sorted1 = [...entries1].sort((a, b) => a.date.localeCompare(b.date));
    const sorted2 = [...entries2].sort((a, b) => a.date.localeCompare(b.date));

    return sorted1.every((entry1, index) => {
      const entry2 = sorted2[index];
      return (
        entry1.date === entry2.date &&
        entry1.consignments === entry2.consignments &&
        Math.abs((entry1.paid_amount || 0) - (entry2.paid_amount || 0)) < 0.01
      );
    });
  }

  /**
   * Generate user-friendly description of what will happen
   */
  describeStrategy(strategy: FileUpdateStrategy): {
    title: string;
    description: string;
    warning?: string;
  } {
    switch (strategy.type) {
      case "create_new":
        return {
          title: "Create New Analysis",
          description: `Creating a new analysis for ${strategy.affectedDates.length} dates`,
          warning: strategy.reason.includes("overlaps") ? strategy.reason : undefined,
        };

      case "merge_data": {
        const action =
          strategy.mergeStrategy === "add_invoice"
            ? "Adding invoice payments"
            : strategy.mergeStrategy === "replace_runsheet"
              ? "Updating runsheet data"
              : "Replacing all data";

        return {
          title: "Update Existing Analysis",
          description: `${action} for ${strategy.affectedDates.length} dates`,
          warning: "This will modify your existing analysis",
        };
      }

      case "update_existing":
        return {
          title: "Update Existing Analysis",
          description: `Updating data for ${strategy.affectedDates.length} dates`,
          warning: "This will replace existing data for these dates",
        };
    }
  }
}
