/**
 * App Layout Component
 * Main layout structure matching the original mobile-first design
 */

"use client";

import { useIsDesktop } from "@/lib/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { BottomNavigation } from "./bottom-navigation";
import { PageHeader } from "./page-header";

import { Sidebar } from "./sidebar";

export interface AppLayoutProps {
  readonly children: React.ReactNode;
  readonly pageTitle?: string;
  readonly pageActions?: React.ReactNode;
  readonly showBackButton?: boolean;
  readonly onBack?: () => void;
  readonly currentPage?: string;
  // Used in BottomNavigation for mobile view
  readonly navBadges?: Record<string, number>; // NOSONAR
  readonly className?: string;
}

export function AppLayout({
  children,
  pageTitle,
  pageActions,
  showBackButton = false,
  onBack,
  currentPage,
  navBadges, // NOSONAR - used in BottomNavigation (mobile only)
  className,
}: Readonly<AppLayoutProps>) {
  const isDesktop = useIsDesktop();

  // Explicitly reference currentPage to satisfy linting
  const navigationCurrentPage = currentPage;

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
        isDesktop ? "grid grid-cols-[256px_1fr]" : "flex flex-col", // Dynamic layout
        className
      )}
    >
      {/* Desktop Sidebar - only render on desktop */}
      {isDesktop && <Sidebar />}

      {/* Main Content Wrapper */}
      <div className="flex flex-col min-h-screen">
        {/* Page Header */}
        <PageHeader
          title={pageTitle}
          actions={pageActions}
          showBackButton={showBackButton}
          onBack={onBack}
        />

        {/* Main Content */}
        {/* biome-ignore lint/correctness/useUniqueElementIds: persistent skip link target */}
        <main
          id="main-content"
          className={cn(
            "flex-1 overflow-x-hidden",
            !isDesktop && "pb-[calc(var(--bottom-nav-height)+var(--safe-area-bottom)+1.5rem)]" // mobile bottom nav clearance
          )}
        >
          <div className="page-shell w-full">{children}</div>
        </main>
      </div>

      {/* Bottom Navigation (Mobile Only) */}
      {!isDesktop && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomNavigation currentPage={navigationCurrentPage} badges={navBadges} visible={true} />
        </div>
      )}
    </div>
  );
}

// Layout for pages that need full width (like dashboard with charts)
export function FullWidthLayout({
  children,
  pageTitle,
  pageActions,
  showBackButton = false,
  onBack,
  currentPage,
  className,
}: AppLayoutProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
        "flex flex-col",
        className
      )}
    >
      {/* Page Header */}
      <PageHeader
        title={pageTitle}
        actions={pageActions}
        showBackButton={showBackButton}
        onBack={onBack}
      />

      {/* Main Content - Full Width */}
      {/* biome-ignore lint/correctness/useUniqueElementIds: persistent skip link target */}
      <main
        id="main-content"
        className={cn(
          "flex-1 overflow-x-hidden",
          "pb-[calc(var(--bottom-nav-height)+var(--safe-area-bottom)+1.5rem)] md:pb-10"
        )}
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10">{children}</div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <div className="md:hidden">
        <BottomNavigation currentPage={currentPage} visible={true} />
      </div>
    </div>
  );
}

// Centered layout for forms and focused content
export function CenteredLayout({
  children,
  pageTitle,
  pageActions,
  showBackButton = false,
  onBack,
  maxWidth = "md",
  className,
}: Omit<AppLayoutProps, "currentPage"> & {
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}) {
  const maxWidths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
        "flex flex-col",
        className
      )}
    >
      {/* Page Header */}
      <PageHeader
        title={pageTitle}
        actions={pageActions}
        showBackButton={showBackButton}
        onBack={onBack}
      />

      {/* Main Content - Centered */}
      {/* biome-ignore lint/correctness/useUniqueElementIds: persistent skip link target */}
      <main
        id="main-content"
        className={cn(
          "flex-1 flex items-center justify-center",
          "px-4 py-8 sm:px-6 sm:py-10 lg:py-12",
          "pb-[calc(var(--bottom-nav-height)+var(--safe-area-bottom)+2rem)] md:pb-12"
        )}
      >
        <div className={cn("w-full", maxWidths[maxWidth])}>{children}</div>
      </main>
    </div>
  );
}
