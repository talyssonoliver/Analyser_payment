/**
 * Header Validation Badge Component
 * Displays validation status in the analysis page header
 * Mirrors Step 2 validation state with compact design
 */

"use client";

import { Badge } from "@/components/ui/badge";

export type ValidationStatus = "READY" | "INCOMPLETE" | "INVALID" | "PENDING";

export interface HeaderValidationBadgeProps {
  readonly status: ValidationStatus;
  readonly runsheets?: number;
  readonly invoices?: number;
  readonly totalFiles?: number;
  readonly manualEntries?: number;
  readonly className?: string;
}

/**
 * Get badge variant based on validation status
 */
const getBadgeVariant = (status: ValidationStatus): "success" | "warning" | "error" | "default" => {
  switch (status) {
    case "READY":
      return "success";
    case "INCOMPLETE":
      return "warning";
    case "INVALID":
      return "error";
    default:
      return "default";
  }
};

/**
 * Get badge text based on validation status
 */
const getBadgeText = (status: ValidationStatus): string => {
  switch (status) {
    case "READY":
      return "Ready";
    case "INCOMPLETE":
      return "Incomplete";
    case "INVALID":
      return "Invalid";
    default:
      return "Pending";
  }
};

/**
 * Get badge icon based on validation status
 */
const getBadgeIcon = (status: ValidationStatus): string => {
  switch (status) {
    case "READY":
      return "✓";
    case "INCOMPLETE":
      return "⚠";
    case "INVALID":
      return "✗";
    default:
      return "○";
  }
};

/**
 * Get detailed status message for tooltip
 */
const getStatusMessage = (
  status: ValidationStatus,
  runsheets: number,
  invoices: number,
  _totalFiles: number,
  manualEntries: number
): string => {
  if (status === "READY") {
    if (manualEntries > 0) {
      return `${manualEntries} manual entries ready for analysis`;
    }
    return `${runsheets} runsheet(s) and ${invoices} invoice(s) ready`;
  }

  if (status === "INCOMPLETE") {
    const missing: string[] = [];
    if (runsheets === 0) missing.push("runsheets");
    if (invoices === 0) missing.push("invoices");
    return `Missing: ${missing.join(", ")}`;
  }

  if (status === "INVALID") {
    return "Invalid data - please review";
  }

  return "No data uploaded";
};

/**
 * Header Validation Badge Component
 * Compact badge for analysis page header
 */
export function HeaderValidationBadge(props: Readonly<HeaderValidationBadgeProps>) {
  const {
    status,
    runsheets = 0,
    invoices = 0,
    totalFiles = 0,
    manualEntries = 0,
    className = "",
  } = props;

  const variant = getBadgeVariant(status);
  const text = getBadgeText(status);
  const icon = getBadgeIcon(status);
  const message = getStatusMessage(status, runsheets, invoices, totalFiles, manualEntries);

  return (
    <Badge
      variant={variant}
      size="sm"
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={message}
      aria-label={`Validation status: ${text}. ${message}`}
      role="status"
    >
      <span className="text-xs font-bold" aria-hidden="true">
        {icon}
      </span>
      <span className="font-semibold">{text}</span>
    </Badge>
  );
}

export default HeaderValidationBadge;
