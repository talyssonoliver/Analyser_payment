/**
 * Themed Card Component
 * Matches original Payment Analyzer card styles exactly
 */

'use client';

import React from 'react';
import { useOriginalColors } from '@/lib/contexts/theme-context';
import { cn } from '@/lib/utils';

export interface ThemedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'kpi' | 'summary' | 'analysis';
  accentColor?: 'primary' | 'accent' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}

export function ThemedCard({ 
  variant = 'default', 
  accentColor = 'accent',
  className, 
  children, 
  ...props 
}: ThemedCardProps) {
  const colors = useOriginalColors();

  const baseStyles = "bg-white border border-slate-200 rounded-xl transition-all duration-200";

  const variants = {
    default: "p-6 shadow-sm hover:shadow-md hover:border-slate-300",
    kpi: "p-6 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-slate-300 relative overflow-hidden",
    summary: "p-6 shadow-md border-2 relative",
    analysis: "p-4 shadow-sm hover:shadow-md hover:border-slate-300",
  };

  // Get accent color value
  const getAccentColor = (color: string): string => {
    switch (color) {
      case 'primary': return colors.primary;
      case 'accent': return colors.accent;
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      case 'danger': return colors.danger;
      default: return colors.accent;
    }
  };

  return (
    <div
      className={cn(
        baseStyles,
        variants[variant],
        className
      )}
      {...props}
    >
      {/* Accent line for KPI and summary cards */}
      {(variant === 'kpi' || variant === 'summary') && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: getAccentColor(accentColor) }}
        />
      )}
      {children}
    </div>
  );
}

export interface ThemedCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ThemedCardHeader({ className, children, ...props }: ThemedCardHeaderProps) {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export interface ThemedCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function ThemedCardTitle({ className, children, ...props }: ThemedCardTitleProps) {
  return (
    <h3 
      className={cn("text-lg font-bold text-slate-900 flex items-center gap-2", className)} 
      {...props}
    >
      {children}
    </h3>
  );
}

export interface ThemedCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ThemedCardContent({ className, children, ...props }: ThemedCardContentProps) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}