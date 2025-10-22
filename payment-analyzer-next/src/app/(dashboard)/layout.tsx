/**
 * Dashboard Layout
 * Protected layout for authenticated users
 */

"use client";

import { ArrowLeft, Download, LogOut, Printer, Settings, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { Component, type ReactNode, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/hooks/useAuth";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import { SessionRecoveryService } from "@/lib/services/session-recovery-service";

class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Dashboard Error</h2>
              <p className="text-red-700 text-sm mb-4">
                {this.state.error?.message || "An unexpected error occurred in the dashboard."}
              </p>
              <div className="space-x-3">
                <Button
                  onClick={() => this.setState({ hasError: false })}
                  variant="outline"
                  size="sm"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => {
                    window.location.assign("/");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isLoading } = useAuth();
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [navBadges, setNavBadges] = useState<Record<string, number>>({});

  // Initialize cleanup service on mount (once per session)
  useEffect(() => {
    import("@/lib/services/analysis-cleanup-service").then(({ AnalysisCleanupService }) => {
      AnalysisCleanupService.initializeCleanup();
    });
  }, []);

  // Show slow loading warning after 2 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => setShowSlowWarning(true), 2000);
    } else {
      setShowSlowWarning(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // No early return; render loading conditionally below to keep hooks order stable

  // Handle print functionality
  const handlePrint = () => {
    // Add print-mode class to body for print section isolation
    // Print styles are centralized in src/styles/base/print.css
    document.body.classList.add("print-mode");
    window.print();

    // Remove class after print dialog closes
    setTimeout(() => {
      document.body.classList.remove("print-mode");
    }, 1000);
  };

  // Handle export functionality
  const handleExport = () => {
    // Trigger export functionality
    if (pathname.includes("/reports")) {
      window.dispatchEvent(new CustomEvent("exportReport"));
    } else if (pathname.includes("/history")) {
      window.dispatchEvent(new CustomEvent("exportHistory"));
    }
  };

  // Handle clear all functionality for history page
  const handleClearAll = () => {
    if (pathname.includes("/history")) {
      window.dispatchEvent(new CustomEvent("clearHistory"));
    }
  };

  const userMenuActions = (
    <div className="flex items-center space-x-2">
      <div className="hidden sm:block">
        <span className="text-sm text-slate-600 mr-3">
          Welcome, {user?.displayName || user?.email}
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/settings")}
        className="hidden sm:flex"
        aria-label="Settings"
      >
        <Settings className="w-4 h-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={signOut}>
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:ml-2 sm:inline">Sign Out</span>
      </Button>
    </div>
  );

  // Compute navigation badges from session + local storage
  useEffect(() => {
    try {
      const stats = SessionRecoveryService.getSessionStats();
      const analyses = AnalysisStorageService.loadAnalyses();

      const hasNewReport = stats.sessionData?.hasBeenAnalyzed ? 1 : 0;
      const pendingUploads =
        (stats.sessionData?.uploadedFilesCount || 0) + (stats.sessionData?.manualEntriesCount || 0);
      const historyCount = Object.keys(analyses || {}).length;

      const badges: Record<string, number> = {
        dashboard: 0,
        analysis: pendingUploads,
        reports: hasNewReport,
        history: historyCount > 0 ? Math.min(historyCount, 99) : 0,
        settings: 0,
      };

      // Hide certain badges on their active pages to reduce noise
      if (pathname.includes("/reports")) badges.reports = 0;
      if (pathname.includes("/history")) badges.history = 0;

      setNavBadges(badges);
    } catch {
      setNavBadges({});
    }
  }, [pathname]);

  // Compute analysis validation status pill from session
  const session = SessionRecoveryService.loadSession();
  const uploaded = session?.uploadedFiles || [];
  const manualCount = session?.manualEntries?.length || 0;

  const detectType = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("runsheet") || lower.includes("run_sheet") || lower.includes("run-sheet"))
      return "runsheet";
    if (lower.includes("invoice") || lower.includes("bill") || lower.includes("dv_"))
      return "invoice";
    return "unknown";
  };

  const runsheets = uploaded.filter((f) => detectType(f.name) === "runsheet").length;
  const invoices = uploaded.filter((f) => detectType(f.name) === "invoice").length;

  // Determine validation status based on uploaded files and manual entries
  let validationStatus: "pending" | "ready" | "incomplete";
  if (uploaded.length === 0 && manualCount === 0) {
    validationStatus = "pending";
  } else if (manualCount > 0) {
    validationStatus = "ready";
  } else if (runsheets > 0 && invoices > 0) {
    validationStatus = "ready";
  } else {
    validationStatus = "incomplete";
  }

  // Extract label determination into a separate statement
  const getValidationLabel = (status: typeof validationStatus): string => {
    if (status === "ready") return "READY";
    if (status === "incomplete") return "INCOMPLETE";
    return "PENDING";
  };

  // Extract classes determination into a separate statement
  const getValidationClasses = (status: typeof validationStatus): string => {
    if (status === "ready") {
      return "bg-gradient-to-r from-green-600 to-emerald-600 text-white";
    }
    if (status === "incomplete") {
      return "bg-gradient-to-r from-red-600 to-rose-600 text-white";
    }
    return "bg-slate-200 text-slate-700";
  };

  const analysisValidation = {
    status: validationStatus,
    label: getValidationLabel(validationStatus),
    classes: getValidationClasses(validationStatus),
  };

  // Reports page actions
  const reportsPageActions = (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          console.log("📍 Back button clicked from reports page");
          // Preserve the analysis context when navigating back
          const session = SessionRecoveryService.loadSession();
          if (session?.dbAnalysisId) {
            console.log("💾 Preserving dbAnalysisId for back navigation:", session.dbAnalysisId);
            // Keep the session intact - don't reload the app state
            // Just navigate back to step 3 with the existing analysis
            router.push("/analysis?returnFromReports=true");
          } else {
            router.push("/analysis");
          }
        }}
        className="flex items-center"
        aria-label="Back to analysis"
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrint}
        className="flex items-center"
        aria-label="Print report"
      >
        <Printer className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleExport}
        className="flex items-center"
        aria-label="Export report"
      >
        <Download className="w-4 h-4" />
      </Button>

      {userMenuActions}
    </div>
  );

  // History page actions
  const historyPageActions = (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExport}
        className="justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transform hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 focus:ring-slate-500 h-8 px-3 text-xs flex items-center"
        aria-label="Export analysis history"
      >
        <Download className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleClearAll}
        className="justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transform hover:bg-slate-100 dark:hover:bg-slate-700 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus:ring-red-500 h-8 px-3 text-xs flex items-center"
        aria-label="Clear all analysis history"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      {userMenuActions}
    </div>
  );

  // Determine page title based on current route
  const getPageTitle = () => {
    if (pathname.includes("/reports")) return "Reports";
    if (pathname.includes("/analysis")) return "Document Analysis";
    if (pathname.includes("/history")) return "Analysis History";
    if (pathname.includes("/dashboard")) return "Dashboard";
    if (pathname.includes("/settings")) return "Settings";
    return "";
  };

  // Determine current page ID for navigation
  const getCurrentPageId = () => {
    if (pathname.includes("/reports")) return "reports";
    if (pathname.includes("/analysis")) return "analysis";
    if (pathname.includes("/history")) return "history";
    if (pathname.includes("/dashboard")) return "dashboard";
    if (pathname.includes("/settings")) return "settings";
    return "dashboard";
  };

  // Determine page actions based on current route
  const getPageActions = () => {
    if (pathname.includes("/reports")) return reportsPageActions;
    if (pathname.includes("/history")) return historyPageActions;
    if (pathname.includes("/analysis")) {
      return (
        <div className="flex items-center space-x-2">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${analysisValidation.classes}`}
            aria-live="polite"
            title={`Validation status: ${analysisValidation.label}`}
          >
            {analysisValidation.label}
          </span>
          {userMenuActions}
        </div>
      );
    }
    return userMenuActions;
  };

  return isLoading ? (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading...</p>
        {showSlowWarning && (
          <div className="mt-4 text-sm text-slate-500">
            <p>Taking longer than usual...</p>
            <p className="mt-1">Please check your internet connection</p>
          </div>
        )}
      </div>
    </div>
  ) : (
    <AppLayout
      currentPage={getCurrentPageId()}
      pageTitle={getPageTitle()}
      pageActions={getPageActions()}
      navBadges={navBadges}
    >
      <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
    </AppLayout>
  );
}
