/**
 * Status Mapping Utility
 * Provides consistent status mapping across all report components
 */

/**
 * Valid status types for daily entries in reports
 */
export type DailyEntryStatus = "balanced" | "overpaid" | "underpaid" | "complete" | "pending";

/**
 * Maps various status string values to standardized DailyEntryStatus
 *
 * Handles:
 * - Database status values ('balanced', 'overpaid', 'underpaid')
 * - Complete/completed status
 * - Pending status
 * - Fallback based on difference value
 *
 * @param status - The status string from database or calculation
 * @param difference - Optional difference value for fallback calculation
 * @returns Standardized DailyEntryStatus
 */
export function mapToDailyEntryStatus(
  status: string | undefined,
  difference?: number
): DailyEntryStatus {
  // Normalize status string
  const normalizedStatus = status?.toLowerCase().trim();

  // Map known status values
  switch (normalizedStatus) {
    case "balanced":
      return "balanced";
    case "overpaid":
      return "overpaid";
    case "underpaid":
      return "underpaid";
    case "complete":
    case "completed":
      return "complete";
    case "pending":
      return "pending";
    default:
      // Fallback to difference-based calculation if available
      if (typeof difference === "number") {
        return mapDifferenceToStatus(difference);
      }
      // Default to complete if no difference available
      return "complete";
  }
}

/**
 * Determines status based on payment difference
 * Uses a small tolerance (0.01) to handle floating point precision
 *
 * @param difference - The difference between paid and expected amounts
 * @returns DailyEntryStatus based on difference
 */
export function mapDifferenceToStatus(difference: number): DailyEntryStatus {
  const TOLERANCE = 0.01;

  if (Math.abs(difference) < TOLERANCE) {
    return "balanced";
  }

  if (difference > 0) {
    return "overpaid";
  }

  return "underpaid";
}

/**
 * Gets display label for a status
 *
 * @param status - The DailyEntryStatus
 * @returns Human-readable label
 */
export function getStatusLabel(status: DailyEntryStatus): string {
  const labels: Record<DailyEntryStatus, string> = {
    balanced: "Balanced",
    overpaid: "Overpaid",
    underpaid: "Underpaid",
    complete: "Complete",
    pending: "Pending",
  };

  return labels[status];
}

/**
 * Gets CSS class name for a status (for styling)
 *
 * @param status - The DailyEntryStatus
 * @returns CSS class name
 */
export function getStatusClassName(status: DailyEntryStatus): string {
  return `status-${status}`;
}
