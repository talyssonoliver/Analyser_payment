/**
 * Button Component
 * Matches the original system's button styles with modern implementation
 */

import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 relative overflow-hidden',
    'rounded-xl font-semibold transition-all duration-300',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-95 transform hover:scale-105',
    'backdrop-blur-sm will-change-transform',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600',
          'hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700',
          'text-white shadow-lg hover:shadow-2xl hover:shadow-blue-500/40',
          'focus:ring-blue-500',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
          'before:-skew-x-12 before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700',
        ],
        secondary: [
          'bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300',
          'dark:from-slate-700 dark:to-slate-600 dark:hover:from-slate-600 dark:hover:to-slate-500',
          'text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-slate-100',
          'border border-slate-300 dark:border-slate-600 hover:border-slate-400',
          'focus:ring-slate-500 hover:shadow-lg',
        ],
        success: [
          'bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600',
          'hover:from-green-700 hover:via-emerald-700 hover:to-teal-700',
          'text-white shadow-lg hover:shadow-2xl hover:shadow-green-500/40',
          'focus:ring-green-500',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
          'before:-skew-x-12 before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700',
        ],
        warning: [
          'bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600',
          'hover:from-amber-700 hover:via-orange-700 hover:to-yellow-700',
          'text-white shadow-lg hover:shadow-2xl hover:shadow-amber-500/40',
          'focus:ring-amber-500',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
          'before:-skew-x-12 before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700',
        ],
        danger: [
          'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600',
          'hover:from-red-700 hover:via-rose-700 hover:to-pink-700',
          'text-white shadow-lg hover:shadow-2xl hover:shadow-red-500/40',
          'focus:ring-red-500',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
          'before:-skew-x-12 before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700',
        ],
        ghost: [
          'hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50',
          'dark:hover:from-slate-700 dark:hover:to-slate-600',
          'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
          'focus:ring-slate-500 hover:shadow-md',
        ],
        outline: [
          'border-2 border-slate-300 dark:border-slate-600 bg-transparent hover:bg-gradient-to-r',
          'hover:from-slate-50 hover:to-white hover:border-slate-400',
          'dark:hover:from-slate-700 dark:hover:to-slate-600',
          'text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-slate-100',
          'focus:ring-slate-500 hover:shadow-lg',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant,
  size,
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Enhanced loading spinner with multiple layers */}
      {isLoading && (
        <div className="relative flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <div className="absolute w-3 h-3 border border-current border-t-transparent rounded-full animate-spin animate-ping opacity-30" style={{ animationDelay: '0.5s' }} />
        </div>
      )}

      {!isLoading && leftIcon && (
        <span className="w-4 h-4 flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
          {leftIcon}
        </span>
      )}

      <span className="relative z-10 font-bold tracking-wide">
        {children}
      </span>

      {!isLoading && rightIcon && (
        <span className="w-4 h-4 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:translate-x-1">
          {rightIcon}
        </span>
      )}

      {/* Success ripple effect for completed actions */}
      {!isLoading && !disabled && variant === 'success' && (
        <div className="absolute inset-0 rounded-xl bg-white opacity-0 pointer-events-none active:opacity-20 active:animate-ping transition-opacity duration-150" />
      )}

      {/* Button press effect */}
      <div className="absolute inset-0 rounded-xl bg-black opacity-0 pointer-events-none active:opacity-10 transition-opacity duration-75" />
    </button>
  );
});

Button.displayName = 'Button';

export { Button, buttonVariants };