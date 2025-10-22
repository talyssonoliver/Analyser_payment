/**
 * ViewToggle Component
 * Toggle between monthly and weekly dashboard views
 */

"use client";

import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  readonly value: "monthly" | "weekly";
  readonly onChange: (value: "monthly" | "weekly") => void;
  readonly variant?: "default" | "compact";
  readonly className?: string;
}

export function ViewToggle({ value, onChange, variant = "default", className }: ViewToggleProps) {
  return (
    <div className={cn(variant === "compact" ? "flex w-full" : "flex justify-center", className)}>
      <div
        className={cn(
          "bg-white rounded-xl p-1 flex gap-1 shadow-sm border border-slate-100",
          variant === "compact" ? "w-auto" : "w-full max-w-md"
        )}
      >
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 ${
            variant === "compact" ? "h-[44px]" : "py-2.5"
          } rounded-lg text-sm font-semibold transition-all duration-300 ${
            value === "monthly"
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
              : "text-slate-600 hover:text-slate-900 bg-transparent"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Monthly</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("weekly")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 ${
            variant === "compact" ? "h-[44px]" : "py-2.5"
          } rounded-lg text-sm font-semibold transition-all duration-300 ${
            value === "weekly"
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
              : "text-slate-600 hover:text-slate-900 bg-transparent"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Weekly</span>
        </button>
      </div>
    </div>
  );
}
