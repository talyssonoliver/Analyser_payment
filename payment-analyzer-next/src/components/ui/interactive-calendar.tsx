/**
 * Interactive Calendar Component
 * Matches the original HTML system's calendar exactly
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';


interface InteractiveCalendarProps {
  onDayClick?: (date: Date, hasData: boolean) => void;
  onAddDataClick?: (date: Date) => void;
  className?: string;
}

export function InteractiveCalendar({ onDayClick, onAddDataClick, className = '' }: InteractiveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [datesWithData, setDatesWithData] = useState<Set<number>>(new Set());
  const [showTooltip, setShowTooltip] = useState<{ day: number; show: boolean }>({ day: 0, show: false });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const loadMonthData = useCallback(() => {
    try {
      const savedAnalyses = localStorage.getItem('pa:analyses:v9');
      if (!savedAnalyses) {
        setDatesWithData(new Set());
        return;
      }

      const analyses = JSON.parse(savedAnalyses);
      const newDatesWithData = new Set<number>();

      Object.entries(analyses).forEach(([, analysis]: [string, unknown]) => {
        // Type guard for analysis
        if (analysis && typeof analysis === 'object' && 'dailyData' in analysis) {
          const typedAnalysis = analysis as { dailyData?: Record<string, unknown>; period?: string };

          if (typedAnalysis.dailyData) {
            Object.entries(typedAnalysis.dailyData).forEach(([dateKey]: [string, unknown]) => {
              const date = new Date(dateKey);

              if (date.getMonth() === currentMonth.getMonth() &&
                  date.getFullYear() === currentMonth.getFullYear()) {
                const day = date.getDate();
                newDatesWithData.add(day);
              }
            });
          }
        }
      });

      setDatesWithData(newDatesWithData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      setDatesWithData(new Set());
    }
  }, [currentMonth]);

  // Load data for current month
  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      // Only navigate to next month if it's not beyond current month
      const now = new Date();
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      if (nextMonth.getFullYear() < now.getFullYear() || 
          (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() <= now.getMonth())) {
        newMonth.setMonth(newMonth.getMonth() + 1);
      } else {
        return; // Don't navigate beyond current month
      }
    }
    setCurrentMonth(newMonth);
    setSelectedDay(null);
    setShowTooltip({ day: 0, show: false });
  };

  const isNextMonthDisabled = () => {
    const now = new Date();
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    return nextMonth.getFullYear() > now.getFullYear() || 
           (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() > now.getMonth());
  };

  const handleDayClick = (day: number, hasData: boolean) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    
    // Don't allow clicking on future dates
    if (clickedDate > today) {
      return;
    }

    setSelectedDay(day);

    if (hasData) {
      // Show day data or navigate to reports
      onDayClick?.(clickedDate, true);
    } else {
      // Handle no-data day click
      if (showTooltip.day === day && showTooltip.show) {
        // Second click - add data
        onAddDataClick?.(clickedDate);
        setShowTooltip({ day: 0, show: false });
      } else {
        // First click - show tooltip
        setShowTooltip({ day, show: true });
        
        // Auto-hide tooltip after 3 seconds
        setTimeout(() => {
          setShowTooltip(prev => prev.day === day ? { day: 0, show: false } : prev);
        }, 3000);
      }
    }
  };

  const renderCalendar = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const today = new Date();
    const todayDay = today.getDate();
    const isCurrentMonth = today.getMonth() === currentMonth.getMonth() && 
                          today.getFullYear() === currentMonth.getFullYear();

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day" />);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const hasData = datesWithData.has(day);
      const isToday = isCurrentMonth && day === todayDay;
      const isFuture = dayDate > today;
      const isSelected = selectedDay === day;
      
      let dayClasses = 'calendar-day';
      if (isToday) dayClasses += ' today';
      if (isFuture) dayClasses += ' future';
      if (hasData) dayClasses += ' has-data clickable';
      if (!hasData && !isFuture) dayClasses += ' no-data';
      if (isSelected) dayClasses += ' selected';

      days.push(
        <div
          key={day}
          className={dayClasses}
          onClick={() => handleDayClick(day, hasData)}
          data-day={day}
        >
          {day}
          {showTooltip.day === day && showTooltip.show && !hasData && (
            <div 
              ref={tooltipRef}
              className="calendar-tooltip show"
            >
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                No data for {dayDate.toLocaleDateString()}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                Click again to add data manually
              </div>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className={`calendar-widget ${className}`}>
      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="calendar-title">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <div className="calendar-nav">
          <button
            className="calendar-nav-btn"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            className={`calendar-nav-btn ${isNextMonthDisabled() ? 'disabled' : ''}`}
            onClick={() => navigateMonth('next')}
            disabled={isNextMonthDisabled()}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Day Headers */}
        {dayHeaders.map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {renderCalendar()}
      </div>

      <style jsx>{`
        .calendar-widget {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .calendar-title {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
        }

        .calendar-nav {
          display: flex;
          gap: 8px;
        }

        .calendar-nav-btn {
          width: 32px;
          height: 32px;
          border: 2px solid #3b82f6;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .calendar-nav-btn:hover:not(.disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        .calendar-nav-btn.disabled {
          background: #e2e8f0;
          border-color: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .calendar-day-header {
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          text-align: center;
          padding: 4px;
        }

        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          border-radius: 6px;
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .calendar-day.has-data {
          background: #f8fafc;
          font-weight: 600;
        }

        .calendar-day.has-data::after {
          content: '';
          position: absolute;
          bottom: 2px;
          width: 4px;
          height: 4px;
          background: #3b82f6;
          border-radius: 50%;
        }

        .calendar-day.today {
          background: #3b82f6;
          color: white;
        }

        .calendar-day.selected {
          background: #1d4ed8;
          color: white;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }

        .calendar-day.future {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .calendar-day.no-data {
          position: relative;
          cursor: pointer;
        }

        .calendar-day.no-data::before {
          content: '+';
          position: absolute;
          top: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: 700;
          opacity: 0;
          transition: all 0.2s ease;
        }

        .calendar-day.no-data:hover::before {
          opacity: 1;
        }

        .calendar-day:hover:not(.disabled):not(.future) {
          background: #f1f5f9;
          transform: scale(1.05);
        }

        .calendar-day.clickable:hover {
          background: #3b82f6;
          color: white;
          transform: scale(1.05);
        }

        .calendar-tooltip {
          position: absolute;
          background: #1e293b;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          z-index: 9999;
          opacity: 0;
          transform: translateY(-4px);
          transition: all 0.2s ease;
          pointer-events: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-width: 250px;
          top: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          margin-top: 4px;
          letter-spacing: 0.02em;
        }

        .calendar-tooltip::before {
          content: '';
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-bottom: 4px solid #1e293b;
        }

        .calendar-tooltip.show {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }
      `}</style>
    </div>
  );
}