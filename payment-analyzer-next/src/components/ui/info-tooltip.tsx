'use client';

import { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export function InfoTooltip({ content, className = '' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (iconRef.current && tooltipRef.current) {
      const iconRect = iconRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Calculate position (below icon, centered)
      let top = iconRect.bottom + 4;
      let left = iconRect.left + iconRect.width / 2 - tooltipRect.width / 2;
      
      // Adjust if tooltip would go off screen
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (left < 8) left = 8; // 8px margin from left edge
      if (left + tooltipRect.width > viewportWidth - 8) {
        left = viewportWidth - tooltipRect.width - 8;
      }
      
      // If tooltip would go below viewport, show above icon
      if (top + tooltipRect.height > viewportHeight - 8) {
        top = iconRect.top - tooltipRect.height - 4;
      }
      
      setPosition({ top, left });
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  // Update position when content changes
  useEffect(() => {
    if (isVisible && iconRef.current && tooltipRef.current) {
      showTooltip();
    }
  }, [content, isVisible]);

  return (
    <>
      <span 
        ref={iconRef}
        className={`info-icon inline-flex items-center justify-center w-4 h-4 cursor-help user-select-none relative ${className}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        tabIndex={0}
        aria-label="Information"
        role="button"
      >
        <svg 
          viewBox="0 0 24 24" 
          width="16" 
          height="16" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className="text-blue-500 hover:text-blue-600 transition-colors"
        >
          <path d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </span>
      
      {/* Tooltip Portal */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[10001] pointer-events-none"
          style={{ 
            top: `${position.top}px`, 
            left: `${position.left}px`,
            opacity: isVisible ? 1 : 0,
            visibility: isVisible ? 'visible' : 'hidden',
            transition: 'opacity 0.15s ease, visibility 0.15s ease'
          }}
        >
          <div className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg border border-slate-700 max-w-xs">
            {content}
            {/* Arrow pointing up to icon */}
            <div 
              className="absolute bottom-full left-1/2 transform -translate-x-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent', 
                borderBottom: '4px solid #1e293b'
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}