/**
 * File Update Marker Component
 *
 * Displays a visual indicator when a file has been modified since the last analysis.
 * Shows a badge with an icon and tooltip explaining the change.
 *
 * Usage:
 * ```tsx
 * <FileUpdateMarker
 *   isUpdated={true}
 *   changeType="content"
 *   lastProcessed={new Date('2025-01-15')}
 * />
 * ```
 */

"use client";

import { InfoTooltip } from "@/components/ui/info-tooltip";

export interface FileUpdateMarkerProps {
  /**
   * Whether the file has been updated since last analysis
   */
  readonly isUpdated: boolean;

  /**
   * Type of change detected
   */
  readonly changeType?: "name" | "size" | "content" | "timestamp";

  /**
   * When the file was last processed
   */
  readonly lastProcessed?: Date | number;

  /**
   * Custom class name for styling
   */
  readonly className?: string;

  /**
   * Custom aria label for accessibility
   */
  readonly ariaLabel?: string;
}

/**
 * FileUpdateMarker Component
 *
 * Shows a subtle visual indicator when a file has been modified.
 * Provides contextual information via tooltip.
 */
export function FileUpdateMarker({
  isUpdated,
  changeType,
  lastProcessed,
  className = "",
  ariaLabel,
}: FileUpdateMarkerProps) {
  // Don't render if file is not updated
  if (!isUpdated) {
    return null;
  }

  // Format the change type for display
  const changeTypeLabel = changeType
    ? changeType.charAt(0).toUpperCase() + changeType.slice(1)
    : "Modified";

  // Format last processed date
  const lastProcessedDate = lastProcessed
    ? new Date(lastProcessed).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Unknown";

  // Tooltip content explaining the change
  const tooltipContent = (
    <div className="text-xs">
      <div className="font-semibold mb-1">File Updated</div>
      <div className="text-slate-200 space-y-1">
        <div>Change: {changeTypeLabel}</div>
        {lastProcessed && <div>Last analyzed: {lastProcessedDate}</div>}
        <div className="text-amber-200 mt-2 italic">
          This file has been modified since your last analysis.
        </div>
      </div>
    </div>
  );

  // Default ARIA label
  const defaultAriaLabel = `File updated - ${changeTypeLabel} change detected since ${lastProcessedDate}`;

  return (
    <output
      className={`file-update-marker inline-flex items-center ${className || ""}`}
      aria-label={ariaLabel || defaultAriaLabel}
    >
      <InfoTooltip content={tooltipContent}>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium hover:bg-amber-100 transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>{" "}
          Updated
        </span>
      </InfoTooltip>
    </output>
  );
}

/**
 * Helper function to determine if a file has been updated
 * based on FileFingerprintService comparison results
 */
export function shouldShowUpdateMarker(comparison: {
  isIdentical: boolean;
  isDuplicate: boolean;
  hasChanged: boolean;
  previousFingerprint?: {
    processedAt: number;
    hash: string;
  };
  changeType?: "name" | "size" | "content" | "timestamp";
}): boolean {
  // Show marker if file has changed but is not an identical duplicate
  return comparison.hasChanged && !comparison.isDuplicate && !!comparison.previousFingerprint;
}
