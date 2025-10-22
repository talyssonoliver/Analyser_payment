/**
 * Trend Indicator Component
 * Shows trend direction with percentage change and color coding
 */

"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui";

interface TrendIndicatorProps {
  value: number; // Percentage change
  label?: string;
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
  className?: string;
}

export function TrendIndicator({
  value,
  label,
  size = "md",
  showBadge = true,
  className = "",
}: Readonly<TrendIndicatorProps>) {
  const getTrendColor = () => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-slate-400";
  };

  const getTextSize = () => {
    if (size === "sm") return "text-xs";
    if (size === "lg") return "text-base";
    return "text-sm";
  };

  const getLabelTextSize = () => {
    if (size === "sm") return "text-xs";
    if (size === "lg") return "text-sm";
    return "text-xs";
  };

  const getBadgeVariant = () => {
    if (value > 0) return "success" as const;
    if (value < 0) return "error" as const;
    return "secondary" as const;
  };

  const getTrendIcon = () => {
    const iconSize = {
      sm: "w-3 h-3",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    }[size];

    if (value > 0) {
      return <TrendingUp className={iconSize} />;
    } else if (value < 0) {
      return <TrendingDown className={iconSize} />;
    } else {
      return <Minus className={iconSize} />;
    }
  };

  const formatValue = () => {
    if (value === 0) return "0%";
    const absValue = Math.abs(value);
    return `${absValue.toFixed(1)}%`;
  };

  if (showBadge) {
    return (
      <Badge
        variant={getBadgeVariant()}
        className={`inline-flex items-center space-x-1 ${className}`}
      >
        {getTrendIcon()}
        <span className="text-xs">
          {formatValue()}
          {label && ` ${label}`}
        </span>
      </Badge>
    );
  }

  return (
    <div className={`inline-flex items-center space-x-1 ${getTrendColor()} ${className}`}>
      {getTrendIcon()}
      <span className={`${getTextSize()} font-medium`}>{formatValue()}</span>
      {label && <span className={`${getLabelTextSize()} opacity-75`}>{label}</span>}
    </div>
  );
}
