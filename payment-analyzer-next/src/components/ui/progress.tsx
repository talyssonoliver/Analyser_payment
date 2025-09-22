/**
 * Progress Component
 * Loading indicators and progress bars
 */

'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(({
  className,
  value,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = true,
  ...props
}, ref) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  const variants = {
    default: 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600',
    success: 'bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600',
    warning: 'bg-gradient-to-r from-amber-500 via-orange-600 to-yellow-600',
    error: 'bg-gradient-to-r from-red-500 via-rose-600 to-pink-600',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div ref={ref} className={cn('w-full', className)} {...props}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">
            {label || 'Progress'}
          </span>
          <span className="text-sm text-slate-500">
            {clampedValue}%
          </span>
        </div>
      )}
      
      <div className={cn(
        'w-full bg-gradient-to-r from-slate-200 to-slate-300 rounded-full overflow-hidden relative shadow-inner',
        sizes[size]
      )}>
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer pointer-events-none" />

        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden shadow-sm',
            variants[variant]
          )}
          style={{
            width: `${clampedValue}%`,
            minWidth: clampedValue > 0 ? '8px' : '0px' // Minimum visible width
          }}
        >
          {/* Progress bar shimmer effect */}
          {animated && clampedValue > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 animate-shimmer" />
          )}

          {/* Progress bar completion pulse */}
          {clampedValue >= 100 && (
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
          )}
        </div>

        {/* Animated progress glow */}
        {clampedValue > 0 && (
          <div
            className={cn(
              'absolute top-0 h-full rounded-full opacity-60 blur-sm transition-all duration-700 ease-out',
              variants[variant]
            )}
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>
    </div>
  );
});

Progress.displayName = 'Progress';

// Circular progress indicator
export interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
}

const CircularProgress = forwardRef<HTMLDivElement, CircularProgressProps>(({
  className,
  value,
  size = 64,
  strokeWidth = 6,
  variant = 'default',
  showLabel = false,
  ...props
}, ref) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  const variants = {
    default: 'stroke-blue-600',
    success: 'stroke-green-600',
    warning: 'stroke-amber-600',
    error: 'stroke-red-600',
  };

  const glowVariants = {
    default: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]',
    success: 'drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    warning: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    error: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]',
  };

  return (
    <div
      ref={ref}
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      {...props}
    >
      {/* Background glow */}
      <div className={cn(
        'absolute inset-0 rounded-full transition-all duration-500',
        clampedValue > 0 ? glowVariants[variant] : ''
      )} />

      <svg
        className="transform -rotate-90 relative z-10"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-200"
        />

        {/* Progress circle with enhanced styling */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={cn(
            variants[variant],
            'transition-all duration-700 ease-out',
            clampedValue >= 100 ? 'animate-pulse' : ''
          )}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            filter: clampedValue > 0 ? 'drop-shadow(0 0 4px currentColor)' : 'none'
          }}
        />

        {/* Completion celebration effect */}
        {clampedValue >= 100 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 2}
            stroke="currentColor"
            strokeWidth={2}
            fill="none"
            className={cn(variants[variant], 'opacity-50 animate-ping')}
          />
        )}
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-slate-700">
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}
    </div>
  );
});

CircularProgress.displayName = 'CircularProgress';

export { Progress, CircularProgress };