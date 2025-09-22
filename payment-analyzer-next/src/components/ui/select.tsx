/**
 * Select Component
 * A dropdown select component
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ 
    value, 
    onChange, 
    options, 
    placeholder = 'Select...', 
    disabled = false, 
    className = '', 
    id,
    ...ariaProps 
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(option => option.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          setIsOpen(!isOpen);
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            // Focus next option
            const currentIndex = options.findIndex(option => option.value === value);
            const nextIndex = Math.min(currentIndex + 1, options.length - 1);
            const nextOption = options[nextIndex];
            if (nextOption && !nextOption.disabled) {
              onChange(nextOption.value);
            }
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (isOpen) {
            const currentIndex = options.findIndex(option => option.value === value);
            const prevIndex = Math.max(currentIndex - 1, 0);
            const prevOption = options[prevIndex];
            if (prevOption && !prevOption.disabled) {
              onChange(prevOption.value);
            }
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    const handleOptionClick = (optionValue: string) => {
      if (disabled) return;
      onChange(optionValue);
      setIsOpen(false);
    };

    return (
      <div ref={containerRef} className="relative">
        <button
          ref={ref}
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={`
            w-full px-3 py-2 text-left bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${disabled 
              ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed' 
              : 'hover:border-slate-400 dark:hover:border-slate-500 cursor-pointer'
            }
            ${className}
          `}
          {...ariaProps}
        >
          <div className="flex items-center justify-between">
            <span className={selectedOption ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}>
              {selectedOption?.label || placeholder}
            </span>
            <ChevronDown 
              className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => handleOptionClick(option.value)}
                className={`
                  w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-600 focus:bg-slate-50 dark:focus:bg-slate-600 focus:outline-none
                  ${option.disabled 
                    ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                    : 'text-slate-900 dark:text-slate-100 cursor-pointer'
                  }
                  ${option.value === value ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
