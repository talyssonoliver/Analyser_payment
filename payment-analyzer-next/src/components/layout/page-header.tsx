/**
 * Page Header Component
 * Top navigation bar with title and actions
 */

'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  readonly title?: string;
  readonly actions?: React.ReactNode;
  readonly showBackButton?: boolean;
  readonly onBack?: () => void;
  readonly className?: string;
  readonly transparent?: boolean;
}

export function PageHeader({
  title,
  actions,
  showBackButton = false,
  onBack,
  className,
  transparent = false,
}: PageHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <header className={cn(
      'sticky top-0 z-40 w-full border-b',
      transparent 
        ? 'bg-transparent border-transparent'
        : 'bg-white/80 backdrop-blur-md border-slate-200',
      'transition-all duration-200',
      className
    )}>
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left side - Back button and title */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex-shrink-0 -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          
          {title && (
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              {title}
            </h1>
          )}
        </div>

        {/* Right side - Actions */}
        {actions && (
          <div className="flex items-center space-x-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

// Specialized headers for different contexts
export function DashboardHeader({
  greeting,
  subtitle,
  actions,
  className,
}: {
  readonly greeting?: string;
  readonly subtitle?: string;
  readonly actions?: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <header className={cn(
      'bg-white/80 backdrop-blur-md border-b border-slate-200',
      'px-4 py-6',
      className
    )}>
      <div className="flex items-center justify-between">
        <div>
          {greeting && (
            <h1 className="text-2xl font-bold text-slate-900">
              {greeting}
            </h1>
          )}
          {subtitle && (
            <p className="text-slate-600 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export function AnalysisHeader({
  step,
  totalSteps,
  title,
  onCancel,
  className,
}: {
  readonly step?: number;
  readonly totalSteps?: number;
  readonly title?: string;
  readonly onCancel?: () => void;
  readonly className?: string;
}) {
  return (
    <header className={cn(
      'bg-white/80 backdrop-blur-md border-b border-slate-200',
      'px-4 py-4',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="-ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          
          <div>
            {step && totalSteps && (
              <div className="text-sm text-slate-500 mb-1">
                Step {step} of {totalSteps}
              </div>
            )}
            {title && (
              <h1 className="text-lg font-semibold text-slate-900">
                {title}
              </h1>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        {step && totalSteps && (
          <div className="flex space-x-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  i + 1 <= step ? 'bg-blue-600' : 'bg-slate-300'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </header>
  );
}