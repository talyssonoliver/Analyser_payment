'use client';

import { useState, useRef, useEffect } from 'react';

interface BonusDetail {
  name: string;
  amount: number;
  description?: string;
  isApplied: boolean;
}

interface BonusTooltipProps {
  readonly bonusDetails: BonusDetail[];
  readonly totalAmount: number;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly position?: 'top' | 'bottom' | 'left' | 'right';
  readonly disabled?: boolean;
}

export function BonusTooltip({
  bonusDetails,
  totalAmount,
  children,
  className = '',
  position = 'top',
  disabled = false
}: BonusTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Only show on desktop (hover)
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window);

  const showTooltip = () => {
    if (disabled || isTouchDevice) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 300); // Small delay to prevent accidental triggers
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  const cancelHide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // Calculate optimal position based on viewport
  const calculateOptimalPosition = (
    position: 'top' | 'bottom' | 'left' | 'right',
    triggerRect: DOMRect,
    tooltipRect: DOMRect,
    viewportWidth: number,
    viewportHeight: number
  ) => {
    switch (position) {
      case 'top':
        return triggerRect.top - tooltipRect.height < 10 ? 'bottom' : 'top';
      case 'bottom':
        return triggerRect.bottom + tooltipRect.height > viewportHeight - 10 ? 'top' : 'bottom';
      case 'left':
        return triggerRect.left - tooltipRect.width < 10 ? 'right' : 'left';
      case 'right':
        return triggerRect.right + tooltipRect.width > viewportWidth - 10 ? 'left' : 'right';
      default:
        return position;
    }
  };

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const optimalPosition = calculateOptimalPosition(
        position,
        triggerRect,
        tooltipRect,
        viewportWidth,
        viewportHeight
      );

      setActualPosition(optimalPosition);
    }
  }, [isVisible, position]);

  const getPositionClasses = () => {
    const base = 'absolute z-50';
    
    switch (actualPosition) {
      case 'top':
        return `${base} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${base} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${base} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${base} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${base} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  const getArrowClasses = () => {
    const arrowSize = 'w-0 h-0 absolute';
    
    switch (actualPosition) {
      case 'top':
        return `${arrowSize} top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800`;
      case 'bottom':
        return `${arrowSize} bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-800`;
      case 'left':
        return `${arrowSize} left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-slate-800`;
      case 'right':
        return `${arrowSize} right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-slate-800`;
      default:
        return `${arrowSize} top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800`;
    }
  };

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  const appliedBonuses = bonusDetails.filter(bonus => bonus.isApplied && bonus.amount > 0);
  const unappliedBonuses = bonusDetails.filter(bonus => !bonus.isApplied || bonus.amount === 0);

  return (
    <button 
      ref={triggerRef}
      className={`bonus-tooltip-trigger relative inline-block bg-transparent border-none p-0 m-0 cursor-help ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      aria-label="Show payment breakdown details"
      type="button"
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      {isVisible && !disabled && (
        <div
          ref={tooltipRef}
          className={getPositionClasses()}
          onMouseEnter={cancelHide}
          onMouseLeave={hideTooltip}
          role="tooltip"
          aria-live="polite"
        >
          <div className="bonus-tooltip-content bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 overflow-hidden max-w-xs">
            {/* Header */}
            <div className="p-3 bg-slate-700 border-b border-slate-600">
              <div className="font-semibold text-sm">Payment Breakdown</div>
              <div className="text-xs text-slate-300 mt-1">
                Total: {formatCurrency(totalAmount)}
              </div>
            </div>
            
            {/* Applied bonuses */}
            {appliedBonuses.length > 0 && (
              <div className="p-3">
                <div className="text-xs font-medium text-green-300 mb-2 uppercase tracking-wide">
                  Applied ({appliedBonuses.length})
                </div>
                <div className="space-y-2">
                  {appliedBonuses.map((bonus) => (
                    <div key={`applied-${bonus.name}`} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="text-white">{bonus.name}</div>
                        {bonus.description && (
                          <div className="text-xs text-slate-300">{bonus.description}</div>
                        )}
                      </div>
                      <div className="font-mono text-green-300 font-medium ml-3">
                        {formatCurrency(bonus.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Unapplied bonuses */}
            {unappliedBonuses.length > 0 && (
              <div className="p-3 bg-slate-750 border-t border-slate-600">
                <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                  Not Applied ({unappliedBonuses.length})
                </div>
                <div className="space-y-2">
                  {unappliedBonuses.map((bonus) => (
                    <div key={`unapplied-${bonus.name}`} className="flex items-center justify-between text-sm opacity-60">
                      <div>
                        <div className="text-slate-300">{bonus.name}</div>
                        {bonus.description && (
                          <div className="text-xs text-slate-400">{bonus.description}</div>
                        )}
                      </div>
                      <div className="font-mono text-slate-400 font-medium ml-3">
                        {bonus.amount > 0 ? formatCurrency(bonus.amount) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Total */}
            {appliedBonuses.length > 0 && (
              <div className="p-3 bg-slate-700 border-t border-slate-600">
                <div className="flex items-center justify-between font-semibold">
                  <div className="text-white">Total Bonuses</div>
                  <div className="font-mono text-green-300">
                    {formatCurrency(appliedBonuses.reduce((sum, bonus) => sum + bonus.amount, 0))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Arrow */}
            <div className={getArrowClasses()} />
          </div>
        </div>
      )}
    </button>
  );
}

// Specialized component for daily bonus tooltips
interface DailyBonusTooltipProps {
  readonly day: {
    day: string;
    unloadingBonus: number;
    attendanceBonus: number;
    earlyBonus: number;
    pickupTotal: number;
    pickupCount: number;
  };
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function DailyBonusTooltip({ day, children, className = '' }: DailyBonusTooltipProps) {
  const getUnloadingBonusDescription = (dayName: string) => {
    if (dayName === 'Monday') return 'Not paid on Mondays';
    if (dayName === 'Sunday') return 'Not paid on Sundays';
    return 'Daily unloading bonus';
  };

  const getWeekdayBonusDescription = (dayName: string, bonusType: string) => {
    const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';
    return isWeekend ? 'Weekdays only' : `Daily ${bonusType.toLowerCase()} bonus`;
  };

  const bonusDetails: BonusDetail[] = [
    {
      name: 'Unloading Bonus',
      amount: day.unloadingBonus,
      description: getUnloadingBonusDescription(day.day),
      isApplied: day.unloadingBonus > 0
    },
    {
      name: 'Attendance Bonus',
      amount: 25.00, // Standard rate
      description: getWeekdayBonusDescription(day.day, 'attendance'),
      isApplied: day.attendanceBonus > 0
    },
    {
      name: 'Early Bonus',
      amount: 50.00, // Standard rate
      description: getWeekdayBonusDescription(day.day, 'early arrival'),
      isApplied: day.earlyBonus > 0
    },
    {
      name: 'Pickup Services',
      amount: day.pickupTotal,
      description: day.pickupCount > 0 ? `${day.pickupCount} pickup service(s)` : 'No pickup services',
      isApplied: day.pickupTotal > 0
    }
  ];

  const totalBonuses = day.unloadingBonus + day.attendanceBonus + day.earlyBonus + day.pickupTotal;

  return (
    <BonusTooltip
      bonusDetails={bonusDetails}
      totalAmount={totalBonuses}
      className={className}
      disabled={totalBonuses === 0}
    >
      {children}
    </BonusTooltip>
  );
}

// CSS for smooth animations (to be added to global styles)
export const BonusTooltipStyles = `
  .bonus-tooltip-trigger {
    cursor: help;
  }
  
  .bonus-tooltip-content {
    animation: tooltipFadeIn 0.2s ease-out;
    backdrop-filter: blur(8px);
  }
  
  @keyframes tooltipFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-2px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @media (max-width: 768px) {
    .bonus-tooltip-trigger {
      cursor: default;
    }
    
    .bonus-tooltip-content {
      display: none !important;
    }
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .bonus-tooltip-content {
      border-color: rgb(55, 65, 81);
    }
  }
`;