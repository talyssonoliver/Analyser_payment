/**
 * QuickActions Component
 * Quick action buttons for common dashboard tasks
 */

"use client";

import { cn } from "@/lib/utils";
import styles from "@/styles/dashboard/actions.module.css";

interface QuickActionsProps {
  onNavigate: (path: string) => void;
  variant?: "default" | "compact" | "fill";
  className?: string;
}

export function QuickActions({
  onNavigate,
  variant = "default",
  className,
}: Readonly<QuickActionsProps>) {
  // Determine variant class based on variant prop
  let variantClass: string | undefined;
  if (variant === "compact") {
    variantClass = styles.compact;
  } else if (variant === "fill") {
    variantClass = styles.fill;
  }

  const containerClass = cn(styles.container, variantClass, className);

  return (
    <div className={containerClass}>
      <button
        type="button"
        className={styles.primary}
        onClick={() => onNavigate("/analysis?fresh=true")}
      >
        <span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 13v4M11 10v7M15 7v10" />
          </svg>
        </span>
        <span>Upload & Analyze</span>
      </button>
      <button type="button" className={styles.secondary} onClick={() => onNavigate("/history")}>
        <span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </span>
        <span>View All Reports</span>
      </button>
    </div>
  );
}
