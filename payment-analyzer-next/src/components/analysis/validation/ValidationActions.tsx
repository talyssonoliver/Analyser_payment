/**
 * ValidationActions Component
 * Action buttons for validation panel operations
 * Extracted functionality from file-validation-panel.tsx for reusable actions
 */

'use client';

import React from 'react';
import { RefreshCw, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ValidationActionsProps } from './types';

/**
 * ValidationActions component for validation panel controls
 * Provides retry, dismiss, and custom action buttons
 */
export function ValidationActions({
  onRetryValidation,
  onDismiss,
  hasErrors = false,
  hasWarnings = false,
  isValidating = false,
  customActions,
  className = ''
}: ValidationActionsProps) {
  // Don't render if no actions are available
  if (!onRetryValidation && !onDismiss && !customActions) {
    return null;
  }

  return (
    <div className={`validation-actions ${className}`}>
      {/* Primary Actions */}
      <div className="flex items-center gap-2">
        {/* Retry Validation Button */}
        {onRetryValidation && (
          <Button
            variant={hasErrors ? "default" : "ghost"}
            size="sm"
            onClick={onRetryValidation}
            disabled={isValidating}
            className={`
              ${hasErrors
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : hasWarnings
                  ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-100'
                  : 'text-green-600 hover:text-green-700 hover:bg-green-100'
              }
              ${isValidating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isValidating ? 'animate-spin' : ''}`} />
            {isValidating ? 'Validating...' : 'Retry Validation'}
          </Button>
        )}

        {/* Fix Issues Button (shown when there are errors or warnings) */}
        {(hasErrors || hasWarnings) && (
          <Button
            variant="outline"
            size="sm"
            className={`
              ${hasErrors
                ? 'border-red-300 text-red-700 hover:bg-red-50'
                : 'border-amber-300 text-amber-700 hover:bg-amber-50'
              }
            `}
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            {hasErrors ? 'Fix Errors' : 'Review Warnings'}
          </Button>
        )}

        {/* Success Indicator (when validation passes) */}
        {!hasErrors && !hasWarnings && !isValidating && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded-md">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Validation Complete</span>
          </div>
        )}

        {/* Custom Actions Slot */}
        {customActions}
      </div>

      {/* Secondary Actions */}
      <div className="flex items-center gap-2">
        {/* Dismiss Button */}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4 mr-1" />
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * ActionButtonProps for individual action buttons
 */
export interface ActionButtonProps {
  /** Button text */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Icon component */
  icon?: React.ReactNode;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ActionButton component for custom actions
 */
export function ActionButton({
  label,
  onClick,
  variant = 'outline',
  size = 'sm',
  icon,
  disabled = false,
  className = ''
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </Button>
  );
}

/**
 * ValidationActionBar component for comprehensive action sets
 */
export interface ValidationActionBarProps {
  /** Primary actions (left side) */
  primaryActions?: React.ReactNode;
  /** Secondary actions (right side) */
  secondaryActions?: React.ReactNode;
  /** Whether the bar should be sticky */
  sticky?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function ValidationActionBar({
  primaryActions,
  secondaryActions,
  sticky = false,
  className = ''
}: ValidationActionBarProps) {
  return (
    <div
      className={`
        validation-actions flex items-center justify-between p-3
        border-t border-slate-200 bg-slate-50
        ${sticky ? 'sticky bottom-0 z-10' : ''}
        ${className}
      `}
    >
      <div className="flex items-center gap-2">
        {primaryActions}
      </div>

      <div className="flex items-center gap-2">
        {secondaryActions}
      </div>
    </div>
  );
}

export default ValidationActions;