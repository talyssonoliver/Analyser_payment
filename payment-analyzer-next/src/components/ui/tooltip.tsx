"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/styles/tooltips.module.css";

export interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
  className = "",
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    // Use RAF to batch layout reads and prevent forced reflows
    requestAnimationFrame(() => {
      if (!triggerRef.current || !tooltipRef.current) return;

      // Batch all layout reads together
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = 0;
      let left = 0;

      // Calculate position based on preferred direction
      switch (position) {
        case "top":
          top = triggerRect.top + scrollY - tooltipRect.height - 8;
          left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case "bottom":
          top = triggerRect.bottom + scrollY + 8;
          left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case "left":
          top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left + scrollX - tooltipRect.width - 8;
          break;
        case "right":
          top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + scrollX + 8;
          break;
      }

      // Keep tooltip within viewport bounds
      if (left < scrollX + 8) {
        left = scrollX + 8;
      } else if (left + tooltipRect.width > scrollX + viewportWidth - 8) {
        left = scrollX + viewportWidth - tooltipRect.width - 8;
      }

      if (top < scrollY + 8) {
        top = scrollY + 8;
      } else if (top + tooltipRect.height > scrollY + viewportHeight - 8) {
        top = scrollY + viewportHeight - tooltipRect.height - 8;
      }

      // Single state update after all calculations
      setTooltipPosition({ top, left });
    });
  }, [position]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tooltipPositionClass = `tooltip-${position}`;
  const arrowPositionClass = `arrow-${position}`;

  return (
    <>
      {}
      <button
        ref={triggerRef}
        className={styles.tooltipTrigger}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        aria-describedby={isVisible ? "tooltip" : undefined}
        type="button"
      >
        {children}
      </button>
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`${styles.tooltip} ${styles[tooltipPositionClass]} ${className}`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            willChange: "transform",
            contain: "layout style",
          }}
          role="tooltip"
          aria-live="polite"
        >
          <div className={styles.tooltipContent}>{content}</div>
          <div className={`${styles.arrow} ${styles[arrowPositionClass]}`} />
        </div>
      )}
    </>
  );
};
