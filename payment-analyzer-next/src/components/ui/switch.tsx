/**
 * Switch Component
 * A toggle switch component for boolean values
 */

'use client';

import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ 
    checked, 
    onChange, 
    disabled = false, 
    size = 'md', 
    className = '', 
    id,
    ...ariaProps 
  }, ref) => {
    const sizeClasses = {
      sm: 'w-8 h-4',
      md: 'w-11 h-6',
      lg: 'w-14 h-8',
    };

    const thumbSizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-5 h-5',
      lg: 'w-7 h-7',
    };

    const translateClasses = {
      sm: checked ? 'translate-x-4' : 'translate-x-0.5',
      md: checked ? 'translate-x-5' : 'translate-x-0.5',
      lg: checked ? 'translate-x-6' : 'translate-x-0.5',
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        id={id}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${sizeClasses[size]}
          ${checked 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-slate-200 hover:bg-slate-300'
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer'
          }
          ${className}
        `}
        {...ariaProps}
      >
        <span
          className={`
            inline-block rounded-full bg-white shadow-sm transform transition-transform
            ${thumbSizeClasses[size]}
            ${translateClasses[size]}
          `}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';
