/**
 * Validation Badge System
 * Display validation status with badges and detailed information
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { FileFingerprintService } from "@/lib/services/file-fingerprint-service";
import type { ManualEntry } from "@/types/core";

// Type definitions for validation

type ValidationState = "pending" | "valid" | "error" | "warning" | "processing";

interface ValidationResult {
  state: ValidationState;
  message: string;
  details?: string[];
  icon: string;
  count?: number;
}

interface ValidationBadgeProps {
  readonly files: File[];
  readonly manualEntries: ManualEntry[];
  readonly className?: string;
  readonly onValidationChange?: (result: ValidationResult) => void;
}

export function ValidationBadge(props: Readonly<ValidationBadgeProps>) {
  const { files, manualEntries, className = "", onValidationChange } = props;
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    state: "pending",
    message: "Validation pending",
    icon: "⏳",
  });
  const [isValidating, setIsValidating] = useState(false);

  const hasData = files.length > 0 || manualEntries.length > 0;

  const validateData = useCallback(async () => {
    // Prevent multiple concurrent validations
    if (isValidating) {
      return;
    }

    setIsValidating(true);

    try {
      let result: ValidationResult;

      if (files.length > 0) {
        // Validate file set
        const fileValidation = await FileFingerprintService.validateFileSet(files);

        if (!fileValidation.isValid) {
          result = {
            state: "error",
            message: `${fileValidation.errors.length} error(s) found`,
            icon: "❌",
            details: fileValidation.errors,
            count: fileValidation.errors.length,
          };
        } else if (fileValidation.warnings.length > 0) {
          result = {
            state: "warning",
            message: `${fileValidation.warnings.length} warning(s)`,
            icon: "⚠️",
            details: fileValidation.warnings,
            count: fileValidation.warnings.length,
          };
        } else {
          result = {
            state: "valid",
            message: `${files.length} files ready`,
            icon: "✅",
            count: files.length,
          };
        }
      } else {
        // Validate manual entries
        const entryErrors: string[] = [];
        const entryWarnings: string[] = [];

        manualEntries.forEach((entry, index) => {
          if (!entry.date) {
            entryErrors.push(`Entry ${index + 1}: Missing date`);
          }
          if (!entry.consignments || entry.consignments < 0) {
            entryErrors.push(`Entry ${index + 1}: Invalid consignment count`);
          }
          if (entry.totalPay && entry.totalPay < 0) {
            entryErrors.push(`Entry ${index + 1}: Invalid payment amount`);
          }

          // Check for Sunday entries (warning)
          if (entry.day === "Sunday") {
            entryWarnings.push(`Entry ${index + 1}: Sunday work detected`);
          }

          // Check for unrealistic values (warning)
          if (entry.consignments > 200) {
            entryWarnings.push(
              `Entry ${index + 1}: High consignment count (${entry.consignments})`
            );
          }
        });

        if (entryErrors.length > 0) {
          result = {
            state: "error",
            message: `${entryErrors.length} error(s) in entries`,
            icon: "❌",
            details: entryErrors,
            count: entryErrors.length,
          };
        } else if (entryWarnings.length > 0) {
          result = {
            state: "warning",
            message: `${entryWarnings.length} warning(s)`,
            icon: "⚠️",
            details: entryWarnings,
            count: entryWarnings.length,
          };
        } else {
          result = {
            state: "valid",
            message: `${manualEntries.length} entries ready`,
            icon: "✅",
            count: manualEntries.length,
          };
        }
      }

      setValidationResult(result);
      onValidationChange?.(result);
    } catch (error) {
      console.error("Validation error:", error);
      const result: ValidationResult = {
        state: "error",
        message: "Validation failed",
        icon: "💥",
        details: [
          error instanceof Error ? error.message : "Unknown validation error",
          "Please try uploading your files again or contact support if the issue persists.",
        ],
      };
      setValidationResult(result);
      onValidationChange?.(result);
    } finally {
      // Ensure validation state is always reset, even on error
      setTimeout(() => setIsValidating(false), 100);
    }
  }, [files, manualEntries, isValidating, onValidationChange]);

  useEffect(() => {
    if (!hasData) {
      setValidationResult({
        state: "pending",
        message: "No data to validate",
        icon: "📝",
        details: ["Upload files or add manual entries to begin validation"],
      });
      setIsValidating(false);
      return;
    }

    // Debounce validation to prevent multiple concurrent calls
    const timeoutId = setTimeout(() => {
      validateData();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [hasData, validateData]);

  const getBadgeVariant = () => {
    // Always use default to avoid conflicts - we override all styling in getBadgeClass
    return "default" as const;
  };

  const getBadgeClass = () => {
    // Override all Badge component styles to prevent conflicts
    const baseClass =
      "!inline-flex !items-center !justify-center !px-4 !py-2 !text-sm !font-semibold !relative !group !transition-all !duration-500 !overflow-hidden !backdrop-blur-sm !rounded-md !focus:outline-none !focus:ring-2 !focus:ring-ring !focus:ring-offset-2";

    switch (validationResult.state) {
      case "valid":
        return `${baseClass} !bg-gradient-to-r !from-green-100 !to-emerald-100 !text-green-800 !border !border-green-300 hover:!from-green-200 hover:!to-emerald-200 hover:!shadow-lg hover:!shadow-green-500/20 hover:!scale-105 !animate-badge-pop !h-auto`;
      case "error":
        return `${baseClass} !bg-gradient-to-r !from-red-100 !to-rose-100 !text-red-800 !border !border-red-300 hover:!from-red-200 hover:!to-rose-200 hover:!shadow-lg hover:!shadow-red-500/20 hover:!scale-105 !animate-validation-pulse !h-auto`;
      case "warning":
        return `${baseClass} !bg-gradient-to-r !from-orange-100 !to-amber-100 !text-orange-800 !border !border-orange-300 hover:!from-orange-200 hover:!to-amber-200 hover:!shadow-lg hover:!shadow-orange-500/20 hover:!scale-105 !h-auto`;
      case "processing":
        return `${baseClass} !bg-gradient-to-r !from-blue-100 !to-cyan-100 !text-blue-800 !border !border-blue-300 !animate-validation-pulse !h-auto`;
      default:
        return `${baseClass} !bg-gradient-to-r !from-slate-100 !to-gray-100 !text-slate-800 !border !border-slate-300 hover:!from-slate-200 hover:!to-gray-200 !h-auto`;
    }
  };

  const getBadgeStyle = (): React.CSSProperties | undefined => {
    return validationResult.state === "processing"
      ? { isolation: "isolate" as const, contain: "layout style" as const }
      : undefined;
  };

  return (
    <div className={`validation-badge-container ${className}`}>
      <Badge
        variant={getBadgeVariant()}
        className={`${getBadgeClass()} cursor-help`}
        style={getBadgeStyle()}
        title={validationResult.details?.join(", ")}
      >
        {/* Background shimmer effect */}
        {(validationResult.state === "valid" || validationResult.state === "processing") && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer" />
        )}

        <span className="flex items-center gap-2 relative z-10">
          {isValidating ? (
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <span className="text-base transform group-hover:scale-110 transition-transform duration-300">
              {validationResult.icon}
            </span>
          )}

          <span className="hidden sm:inline font-bold">
            {isValidating ? "Validating..." : validationResult.message}
          </span>

          {validationResult.count !== undefined && (
            <span className="ml-1 px-2 py-1 bg-white bg-opacity-30 backdrop-blur-sm rounded-full text-xs font-black shadow-sm">
              {validationResult.count}
            </span>
          )}
        </span>

        {/* Success celebration effect */}
        {validationResult.state === "valid" && (
          <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 opacity-20 rounded-full blur-sm animate-pulse" />
        )}

        {/* Error warning effect */}
        {validationResult.state === "error" && (
          <div className="absolute -inset-1 bg-gradient-to-r from-red-400 via-rose-400 to-pink-400 opacity-20 rounded-full blur-sm animate-pulse" />
        )}
      </Badge>
    </div>
  );
}

// Helper function to get indicator color based on validation state
const getIndicatorColor = (state: ValidationState): string => {
  if (state === "error") return "bg-red-500";
  if (state === "warning") return "bg-orange-500";
  return "bg-slate-400";
};

// Comprehensive validation system component
interface ValidationSystemProps {
  readonly files: File[];
  readonly manualEntries: ManualEntry[];
  readonly className?: string;
  readonly showDetails?: boolean;
  readonly onValidationComplete?: (isValid: boolean) => void;
}

export function ValidationSystem(props: Readonly<ValidationSystemProps>) {
  const { files, manualEntries, className = "", showDetails = true, onValidationComplete } = props;
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const handleValidationChange = (result: ValidationResult) => {
    setValidationResult(result);
    onValidationComplete?.(result.state === "valid" || result.state === "warning");
  };

  const toggleDetails = () => {
    setShowDetailPanel(!showDetailPanel);
  };

  return (
    <div className={`validation-system ${className}`}>
      {/* Main validation badge */}
      <div className="flex items-center gap-3">
        <ValidationBadge
          files={files}
          manualEntries={manualEntries}
          onValidationChange={handleValidationChange}
        />

        {/* Details toggle button */}
        {validationResult?.details && showDetails && (
          <button
            onClick={toggleDetails}
            className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
            type="button"
          >
            {showDetailPanel ? "▼ Hide details" : "▶ Show details"}
          </button>
        )}
      </div>

      {/* Detail panel */}
      {showDetailPanel && validationResult?.details && (
        <div className="mt-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
          <div className="space-y-2">
            {validationResult.details.map((detail, index) => (
              <div
                key={`detail-${detail.slice(0, 20)}-${index}`}
                className="flex items-start gap-2 text-sm"
              >
                <span
                  className={`flex-shrink-0 mt-0.5 w-2 h-2 rounded-full ${getIndicatorColor(validationResult.state)}`}
                />
                <span className="text-slate-700">{detail}</span>
              </div>
            ))}
          </div>

          {validationResult.state === "error" && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              <strong>Action required:</strong> Please fix the errors above before proceeding with
              analysis.
            </div>
          )}

          {validationResult.state === "warning" && (
            <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
              <strong>Review recommended:</strong> Analysis can proceed, but please review the
              warnings.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ValidationSystem;
