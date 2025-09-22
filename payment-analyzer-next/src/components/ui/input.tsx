/**
 * Input Component
 * Modern input fields with validation states
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'filled' | 'outlined';
  inputSize?: 'sm' | 'md' | 'lg';
  state?: 'default' | 'error' | 'success';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  variant = 'default',
  inputSize = 'md',
  state = 'default',
  leftIcon,
  rightIcon,
  label,
  error,
  helperText,
  type = 'text',
  ...props
}, ref) => {
  const baseStyles = [
    'w-full rounded-lg border transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'placeholder:text-slate-400',
  ];

  const variants = {
    default: 'border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500/20',
    filled: 'border-0 bg-slate-100 focus:bg-white focus:ring-blue-500/20',
    outlined: 'border-2 border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500/20',
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-4 text-lg',
  };

  const states = {
    default: '',
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
    success: 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
  };

  const inputClasses = cn(
    baseStyles,
    variants[variant],
    sizes[inputSize],
    states[state],
    leftIcon && 'pl-10',
    rightIcon && 'pr-10',
    className
  );

  const actualError = error || (state === 'error' ? 'Invalid input' : undefined);
  const displayHelperText = actualError || helperText;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          className={inputClasses}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4">
            {rightIcon}
          </div>
        )}
      </div>
      
      {displayHelperText && (
        <p className={cn(
          'mt-1 text-xs',
          actualError ? 'text-red-600' : 'text-slate-500'
        )}>
          {displayHelperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };