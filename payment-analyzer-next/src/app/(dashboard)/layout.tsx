/**
 * Dashboard Layout
 * Protected layout for authenticated users
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui';
import { LogOut, Settings, Download, Trash2, Printer } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, signOut, isLoading } = useAuth();
  const [showSlowWarning, setShowSlowWarning] = useState(false);

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

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
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
    );
  }

  // Handle print functionality
  const handlePrint = () => {
    const printStyles = document.createElement('style');
    printStyles.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        .print-section, .print-section * { visibility: visible; }
        .print-section { 
          position: absolute; 
          left: 0; 
          top: 0; 
          width: 100%;
        }
        .no-print { display: none !important; }
        table { break-inside: auto; }
        tr { break-inside: avoid; break-after: auto; }
      }
    `;
    document.head.appendChild(printStyles);
    window.print();
    setTimeout(() => {
      document.head.removeChild(printStyles);
    }, 1000);
  };

  // Handle export functionality
  const handleExport = () => {
    // Trigger export functionality
    if (pathname.includes('/reports')) {
      window.dispatchEvent(new CustomEvent('exportReport'));
    } else if (pathname.includes('/history')) {
      window.dispatchEvent(new CustomEvent('exportHistory'));
    }
  };

  // Handle clear all functionality for history page
  const handleClearAll = () => {
    if (pathname.includes('/history')) {
      window.dispatchEvent(new CustomEvent('clearHistory'));
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
        onClick={() => window.location.href = '/settings'}
        className="hidden sm:flex"
      >
        <Settings className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:ml-2 sm:inline">Sign Out</span>
      </Button>
    </div>
  );

  // Reports page actions
  const reportsPageActions = (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrint}
        className="flex items-center"
      >
        <Printer className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExport}
        className="flex items-center"
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
      >
        <Download className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClearAll}
        className="justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transform hover:bg-slate-100 dark:hover:bg-slate-700 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus:ring-red-500 h-8 px-3 text-xs flex items-center"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      
      {userMenuActions}
    </div>
  );

  // Determine page title based on current route
  const getPageTitle = () => {
    if (pathname.includes('/reports')) return 'Reports';
    if (pathname.includes('/analysis')) return 'Document Analysis';
    if (pathname.includes('/history')) return 'Analysis History';
    if (pathname.includes('/dashboard')) return 'Dashboard';
    if (pathname.includes('/settings')) return 'Settings';
    return '';
  };

  // Determine current page ID for navigation
  const getCurrentPageId = () => {
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/analysis')) return 'analysis';
    if (pathname.includes('/history')) return 'history';
    if (pathname.includes('/dashboard')) return 'dashboard';
    if (pathname.includes('/settings')) return 'settings';
    return 'dashboard';
  };

  return (
    <AppLayout
      currentPage={getCurrentPageId()}
      pageTitle={getPageTitle()}
      pageActions={
        pathname.includes('/reports') ? reportsPageActions :
        pathname.includes('/history') ? historyPageActions :
        userMenuActions
      }
    >
      {children}
    </AppLayout>
  );
}