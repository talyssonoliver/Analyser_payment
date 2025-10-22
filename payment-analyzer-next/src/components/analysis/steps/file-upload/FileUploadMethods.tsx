/**
 * File Upload Methods Component
 * Uses semantic CSS classes: file-upload-method-selector, file-upload-method-btn, file-upload-method-btn__label
 */

"use client";

import { cn } from "@/lib/utils";

type InputMethod = "upload" | "manual";

export interface FileUploadMethodsProps {
  readonly activeMethod: InputMethod;
  readonly onMethodChange: (method: InputMethod) => void;
  readonly disabled?: boolean;
}

export function FileUploadMethods({
  activeMethod,
  onMethodChange,
  disabled = false,
}: FileUploadMethodsProps) {
  return (
    <div className="file-upload-method-selector bg-white rounded-xl p-1 flex gap-1 border border-slate-200 shadow-sm">
      {/* Upload Files Button */}
      <button
        className={cn(
          "file-upload-method-btn flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200",
          "flex-1 text-sm font-medium",
          activeMethod === "upload"
            ? "active bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        )}
        onClick={() => onMethodChange("upload")}
        disabled={disabled}
        data-method="upload"
        type="button"
      >
        <span className="method-icon">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </span>
        <span className="file-upload-method-btn__label">Upload Files</span>
      </button>

      {/* Manual Entry Button */}
      <button
        className={cn(
          "file-upload-method-btn flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200",
          "flex-1 text-sm font-medium",
          activeMethod === "manual"
            ? "active bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        )}
        onClick={() => onMethodChange("manual")}
        disabled={disabled}
        data-method="manual"
        type="button"
      >
        <span className="method-icon">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </span>
        <span className="file-upload-method-btn__label">Manual Entry</span>
      </button>
    </div>
  );
}
