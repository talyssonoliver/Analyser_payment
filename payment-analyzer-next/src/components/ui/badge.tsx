/**
 * Badge Component
 * Status indicators and labels
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({
  className,
  variant = 'default',
  size = 'md',
  rounded = false,
  ...props
}, ref) => {
  const baseStyles = [
    'inline-flex items-center justify-center font-medium',
    'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  ];

  const variants = {
    default: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    success: 'bg-green-100 text-green-800 hover:bg-green-200',
    warning: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    error: 'bg-red-100 text-red-800 hover:bg-red-200',
    info: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    secondary: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs h-5',
    md: 'px-2.5 py-1.5 text-sm h-6',
    lg: 'px-3 py-2 text-base h-8',
  };

  return (
    <span
      ref={ref}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        rounded ? 'rounded-full' : 'rounded-md',
        className
      )}
      {...props}
    />
  );
});

Badge.displayName = 'Badge';

export { Badge };