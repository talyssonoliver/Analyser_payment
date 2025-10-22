/**
 * Bottom Navigation Component
 * Mobile navigation matching the original app design
 */

"use client";

import { motion } from "framer-motion";
import { FileSearch, FileText, History, Home, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SessionRecoveryService } from "@/lib/services/session-recovery-service";
import { cn } from "@/lib/utils";

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  matchPaths?: string[];
}

const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
    href: "/dashboard",
    matchPaths: ["/dashboard"],
  },
  {
    id: "analysis",
    label: "Analyse",
    icon: FileSearch,
    href: "/analysis",
    matchPaths: ["/analysis"],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    href: "/reports",
    matchPaths: ["/reports"],
  },
  {
    id: "history",
    label: "History",
    icon: History,
    href: "/history",
    matchPaths: ["/history"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/settings",
    matchPaths: ["/settings"],
  },
];

export interface BottomNavigationProps {
  readonly currentPage?: string;
  readonly visible?: boolean;
  readonly badges?: Record<string, number>;
  readonly className?: string;
}

export function BottomNavigation({
  currentPage,
  visible = true,
  badges = {},
  className,
}: BottomNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigation = async (href: string) => {
    // Prevent navigation if already navigating or on current page
    if (isNavigating || pathname === href) {
      return;
    }

    setIsNavigating(true);

    try {
      // For reports page, preserve the current analysis ID from session
      let finalHref = href;
      if (href === "/reports") {
        const session = SessionRecoveryService.loadSession();
        if (session?.dbAnalysisId) {
          finalHref = `/reports?analysisId=${session.dbAnalysisId}`;
          console.log(
            "📍 Bottom Nav: Navigating to reports with analysisId:",
            session.dbAnalysisId
          );
        }
      }

      // Use router.push - it returns void in App Router but may throw
      router.push(finalHref);

      // Reset navigating state after a short delay
      // This prevents the button from being disabled too long
      setTimeout(() => {
        setIsNavigating(false);
      }, 1000);
    } catch (error) {
      console.error("Navigation error:", error);
      setIsNavigating(false);

      // Fallback to window.location if router fails
      // This can happen if there's a network error fetching the route
      if (typeof window !== "undefined") {
        try {
          window.location.href = href;
        } catch (fallbackError) {
          console.error("Fallback navigation also failed:", fallbackError);
        }
      }
    }
  };

  const isActive = (item: NavigationItem) => {
    if (currentPage) {
      return currentPage === item.id;
    }

    // Fallback to pathname matching
    return item.matchPaths?.some((path) => pathname.startsWith(path)) || pathname === item.href;
  };

  if (!visible) return null;

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{ willChange: "transform" }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-white/80 backdrop-blur-md",
        "border-t border-slate-200",
        "safe-area-inset-bottom", // Handle device safe areas
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-4">
        {navigationItems.map((item) => {
          const active = isActive(item);
          const badge = badges[item.id] || item.badge;
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => void handleNavigation(item.href)}
              disabled={isNavigating}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "min-w-0 flex-1 py-2 px-1",
                "transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                "rounded-lg",
                isNavigating && "opacity-50 cursor-not-allowed"
              )}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              aria-busy={isNavigating}
            >
              {/* Active top indicator (prototype-style) */}
              {active && (
                <div
                  className="absolute top-0 left-1/2 h-0.5 w-8 bg-blue-600 rounded-b"
                  style={{ transform: "translateX(-50%)" }}
                  aria-hidden="true"
                />
              )}
              {/* Icon with background */}
              <div
                className={cn(
                  "relative flex items-center justify-center",
                  "w-8 h-8 rounded-lg transition-all duration-200",
                  active
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />

                {/* Badge with animation */}
                {badge && badge > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute -top-1 -right-1"
                  >
                    <Badge
                      variant="error"
                      size="sm"
                      rounded
                      className="min-w-[18px] h-4.5 text-xs"
                      aria-label={`${badge} ${badge === 1 ? "notification" : "notifications"} for ${item.label}`}
                    >
                      {badge > 99 ? "99+" : badge}
                    </Badge>
                  </motion.div>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-xs font-medium mt-1 leading-tight",
                  "max-w-full truncate",
                  active ? "text-blue-600" : "text-slate-500"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}

// Hook exported from hooks directory
// See: src/hooks/useNavigationBadges.ts

// Custom navigation for specific contexts
export function AnalysisNavigation({
  currentStep,
  totalSteps,
  onStepClick,
  className,
}: {
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly onStepClick?: (step: number) => void;
  readonly className?: string;
}) {
  const steps = ["Upload", "Validate", "Results"];

  return (
    <nav
      className={cn(
        "flex items-center justify-center space-x-4 py-4",
        "bg-white/80 backdrop-blur-md border-t border-slate-200",
        className
      )}
    >
      {steps.slice(0, totalSteps).map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <button
            type="button"
            key={stepNumber}
            onClick={() => onStepClick?.(stepNumber)}
            disabled={!onStepClick}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-lg",
              "transition-all duration-200",
              isActive && "bg-blue-100 text-blue-700",
              isCompleted && "text-green-600",
              !isActive && !isCompleted && "text-slate-500",
              onStepClick && "hover:bg-slate-100 cursor-pointer",
              !onStepClick && "cursor-default"
            )}
          >
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold",
                isActive && "bg-blue-600 text-white",
                isCompleted && "bg-green-600 text-white",
                !isActive && !isCompleted && "bg-slate-300 text-slate-600"
              )}
            >
              {stepNumber}
            </div>
            <span className="text-sm font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
