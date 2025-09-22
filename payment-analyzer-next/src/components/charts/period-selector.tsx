/**
 * Period Selector Component
 * Time period selection for charts and analytics
 */

'use client';

import { useState, useEffect } from 'react';
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface PeriodOption {
  id: string;
  label: string;
  value: string | DateRange;
}

interface PeriodSelectorProps {
  readonly selectedPeriod: string | DateRange;
  readonly onPeriodChange: (period: string | DateRange) => void;
  readonly options?: PeriodOption[];
  readonly className?: string;
  readonly align?: "start" | "center" | "end";
}

const DEFAULT_PERIODS: PeriodOption[] = [
  { id: '7d', label: 'Last 7 days', value: '7d' },
  { id: '30d', label: 'Last 30 days', value: '30d' },
  { id: '3m', label: 'Last 3 months', value: '3m' },
  { id: '1y', label: 'Last year', value: '1y' },
];

export function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
  options = DEFAULT_PERIODS,
  className,
  align = "end",
}: PeriodSelectorProps) {
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [displayLabel, setDisplayLabel] = useState('Select period');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (typeof selectedPeriod === 'string') {
      const option = options.find(opt => opt.value === selectedPeriod);
      setDisplayLabel(option?.label || 'Select period');
      setDate(undefined); // Clear date range when a predefined period is selected
    } else if (selectedPeriod?.from) {
        setDate(selectedPeriod);
        if (selectedPeriod.to) {
            setDisplayLabel(
                `${format(selectedPeriod.from, "LLL dd, y")} - ${format(selectedPeriod.to, "LLL dd, y")}`
            );
        } else {
            setDisplayLabel(format(selectedPeriod.from, "LLL dd, y"));
        }
    }
  }, [selectedPeriod, options]);

  const handleDateSelect = (newDate: DateRange | undefined) => {
    if (newDate?.from) {
        onPeriodChange(newDate);
    }
    setIsPopoverOpen(false);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !date && "text-slate-500"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>{displayLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
            <div className="py-1">
                {options.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => {
                            onPeriodChange(option.value);
                            setIsPopoverOpen(false);
                        }}
                        className={cn(
                            'w-full px-3 py-2 text-left text-sm hover:bg-slate-50',
                            selectedPeriod === option.value
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-slate-700'
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
            <hr className="my-1" />
            <Calendar
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={2}
            />
        </PopoverContent>
      </Popover>
    </div>
  );
}
