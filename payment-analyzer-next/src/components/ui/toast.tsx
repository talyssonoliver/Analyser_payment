/**
 * Toast Component
 * Notification system matching the original app's toast style
 */

'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
// Removed framer-motion to avoid Next.js 15 export * issues
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: React.ReactNode;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (toastId: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (toastData: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = {
      id,
      duration: 5000,
      ...toastData,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, newToast.duration);
    }
  };

  const dismiss = (toastId: string) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  };

  const dismissAll = () => {
    setToasts([]);
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  );
}

function ToastComponent({ toast }: { toast: Toast }) {
  const { dismiss } = useToast();

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success: 'border-green-200 bg-green-50 text-green-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  const iconStyles = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
  };

  const Icon = icons[toast.type || 'info'];

  return (
    <div
      className={cn(
        'relative rounded-xl border p-4 shadow-lg backdrop-blur-sm',
        'pointer-events-auto w-full animate-in slide-in-from-top-2 fade-in duration-200',
        styles[toast.type || 'info']
      )}
    >
      <div className="flex items-start space-x-3">
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconStyles[toast.type || 'info'])} />
        
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="font-semibold text-sm leading-tight">
              {toast.title}
            </p>
          )}
          
          {toast.description && (
            <p className={cn(
              'text-sm',
              toast.title ? 'mt-1' : ''
            )}>
              {toast.description}
            </p>
          )}
          
          {toast.action && (
            <div className="mt-3">
              {toast.action}
            </div>
          )}
        </div>
        
        <button
          onClick={() => dismiss(toast.id)}
          className={cn(
            'flex-shrink-0 rounded-lg p-1 transition-colors',
            'hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Helper functions for common toast types
export const toastHelpers = {
  success: (description: string, title?: string) => ({
    type: 'success' as const,
    title,
    description,
  }),
  
  error: (description: string, title?: string) => ({
    type: 'error' as const,
    title: title || 'Error',
    description,
  }),
  
  warning: (description: string, title?: string) => ({
    type: 'warning' as const,
    title: title || 'Warning',
    description,
  }),
  
  info: (description: string, title?: string) => ({
    type: 'info' as const,
    title,
    description,
  }),
};