/**
 * Select Component
 * A dropdown select component
 */

"use client";

import { Check, ChevronDown } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      onChange,
      options,
      placeholder = "Select...",
      disabled = false,
      className = "",
      id,
      ...ariaProps
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((option) => option.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case "Enter":
        case " ":
          event.preventDefault();
          setIsOpen(!isOpen);
          break;
        case "ArrowDown":
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            // Focus next option
            const currentIndex = options.findIndex((option) => option.value === value);
            const nextIndex = Math.min(currentIndex + 1, options.length - 1);
            const nextOption = options[nextIndex];
            if (nextOption && !nextOption.disabled) {
              onChange(nextOption.value);
            }
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          if (isOpen) {
            const currentIndex = options.findIndex((option) => option.value === value);
            const prevIndex = Math.max(currentIndex - 1, 0);
            const prevOption = options[prevIndex];
            if (prevOption && !prevOption.disabled) {
              onChange(prevOption.value);
            }
          }
          break;
        case "Escape":
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
          className={cn(
            "w-full px-4 py-2 text-left rounded-lg border border-slate-200 bg-white shadow-sm transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
            disabled
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "hover:border-blue-400 hover:shadow-md cursor-pointer",
            className
          )}
          {...ariaProps}
        >
          <div className="flex items-center justify-between">
            <span className={selectedOption ? "text-slate-900 font-medium" : "text-slate-500"}>
              {selectedOption?.label || placeholder}
            </span>
            <ChevronDown
              className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")}
            />
          </div>
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => handleOptionClick(option.value)}
                className={cn(
                  "w-full px-4 py-2 text-left focus:bg-blue-50 focus:outline-none transition-colors duration-150",
                  option.disabled
                    ? "text-slate-400 cursor-not-allowed"
                    : "text-slate-700 hover:bg-blue-50 cursor-pointer",
                  option.value === value && "bg-blue-50 text-blue-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{option.label}</span>
                  {option.value === value && <Check className="w-4 h-4 text-blue-600" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
