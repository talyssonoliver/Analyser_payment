/**
 * Themed Button Component
 * Matches original Payment Analyzer button styles exactly
 */

'use client';

import React from 'react';
import { useOriginalColors } from '@/lib/contexts/theme-context';
import { cn } from '@/lib/utils';

export interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function ThemedButton({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  disabled,
  ...props 
}: ThemedButtonProps) {
  const colors = useOriginalColors();

  const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";

  const variants = {
    primary: `text-white border-none shadow-md hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg focus:ring-blue-500/30`,
    secondary: `bg-white text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow-md focus:ring-slate-500/20`,
    danger: `text-white border-none shadow-md hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg focus:ring-red-500/30`,
    success: `text-white border-none shadow-md hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg focus:ring-green-500/30`,
    warning: `text-white border-none shadow-md hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg focus:ring-yellow-500/30`,
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  // Apply gradient backgrounds using inline styles to match original exactly
  const getVariantStyle = (variant: string): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return { background: colors.gradients.accent };
      case 'danger':
        return { background: colors.gradients.danger };
      case 'success':
        return { background: colors.gradients.success };
      case 'warning':
        return { background: colors.gradients.warning };
      default:
        return {};
    }
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      style={getVariantStyle(variant)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}