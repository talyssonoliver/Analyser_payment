/**
 * CalendarTooltip Component
 * Rich, accessible tooltip for calendar day cells
 * Displays payment information, statuses, and consignment details
 */

"use client";

import { cloneElement, isValidElement, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/dashboard/calendar-tooltip.module.css";

type PaymentStatus = "pending" | "received" | "shortfall";

interface PaymentInfo {
  hasData: boolean;
  totalExpected: number;
  totalPaid: number;
  statuses: PaymentStatus[];
}

interface CalendarTooltipProps {
  readonly date: Date;
  readonly paymentInfo: PaymentInfo;
  readonly children: React.ReactNode;
  readonly formatCurrency?: (value: number) => string;
}

const defaultFormatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(value);

const getStatusLabel = (status: PaymentStatus): string => {
  switch (status) {
    case "pending":
      return "Pending Payment";
    case "received":
      return "Payment Received";
    case "shortfall":
      return "Payment Shortfall";
    default:
      return "";
  }
};

const getStatusColor = (status: PaymentStatus): string => {
  switch (status) {
    case "pending":
      return styles.statusPending;
    case "received":
      return styles.statusReceived;
    case "shortfall":
      return styles.statusShortfall;
    default:
      return "";
  }
};

export function CalendarTooltip({
  date,
  paymentInfo,
  children,
  formatCurrency = defaultFormatCurrency,
}: CalendarTooltipProps) {
  const IS_TEST = process.env.NODE_ENV === "test";
  const SHOW_DELAY = IS_TEST ? 0 : 200;
  const HIDE_DELAY = IS_TEST ? 0 : 100;
  const TOUCH_SHOW_DELAY = IS_TEST ? 0 : 500;
  const TOUCH_HIDE_DELAY = IS_TEST ? 0 : 2000;
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    requestAnimationFrame(() => {
      if (!triggerRef.current || !tooltipRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // Default: show below the trigger, centered
      let top = triggerRect.bottom + scrollY + 8;
      let left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;

      // Adjust horizontal position to stay within viewport
      if (left < scrollX + 8) {
        left = scrollX + 8;
      } else if (left + tooltipRect.width > scrollX + viewportWidth - 8) {
        left = scrollX + viewportWidth - tooltipRect.width - 8;
      }

      // If tooltip would go below viewport, show above trigger
      if (top + tooltipRect.height > scrollY + viewportHeight - 8) {
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
      }

      // Ensure tooltip doesn't go above viewport
      if (top < scrollY + 8) {
        top = scrollY + 8;
      }

      setPosition({ top, left });
    });
  }, []);

  const showTooltip = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      calculatePosition();
    }, SHOW_DELAY);
  }, [calculatePosition, SHOW_DELAY]);

  const hideTooltip = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, HIDE_DELAY);
  }, [HIDE_DELAY]);

  const handleTouchStart = useCallback(() => {
    touchTimerRef.current = setTimeout(() => {
      setIsVisible(true);
      calculatePosition();
    }, TOUCH_SHOW_DELAY);
  }, [calculatePosition, TOUCH_SHOW_DELAY]);

  const handleTouchEnd = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
    setTimeout(() => {
      setIsVisible(false);
    }, TOUCH_HIDE_DELAY);
  }, [TOUCH_HIDE_DELAY]);

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  // Don't show tooltip if there's no data
  if (!paymentInfo.hasData) {
    return <>{children}</>;
  }

  const difference = paymentInfo.totalPaid - paymentInfo.totalExpected;
  const formattedDate = date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className={`${styles.tooltip} ${isVisible ? styles.visible : ""}`}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 10000,
      }}
      role="tooltip"
      aria-live="polite"
      onMouseEnter={() => {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      }}
      onMouseLeave={hideTooltip}
    >
      <div className={styles.content}>
        {/* Date Header */}
        <div className={styles.header}>
          <div className={styles.dateLabel}>{formattedDate}</div>
        </div>

        {/* Payment Summary */}
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span className={styles.label}>Expected:</span>
            <span className={styles.value}>{formatCurrency(paymentInfo.totalExpected)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.label}>Received:</span>
            <span className={styles.value}>{formatCurrency(paymentInfo.totalPaid)}</span>
          </div>
          <div
            className={`${styles.summaryRow} ${styles.difference} ${
              difference >= 0 ? styles.positive : styles.negative
            }`}
          >
            <span className={styles.label}>{difference >= 0 ? "Surplus:" : "Shortfall:"}</span>
            <span className={styles.value}>{formatCurrency(Math.abs(difference))}</span>
          </div>
        </div>

        {/* Status Badges */}
        {paymentInfo.statuses.length > 0 && (
          <div className={styles.statuses}>
            {paymentInfo.statuses.map((status) => (
              <div key={`${status}`} className={`${styles.statusBadge} ${getStatusColor(status)}`}>
                <div className={styles.statusDot} />
                <span className={styles.statusLabel}>{getStatusLabel(status)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arrow */}
      <div className={styles.arrow} />
    </div>
  );

  return (
    <>
      {isValidElement(children) ? null : null}
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onFocusCapture={showTooltip}
        onBlurCapture={hideTooltip}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={styles.trigger}
        role="none"
      >
        {isValidElement(children)
          ? cloneElement(
              children as React.ReactElement<{
                onFocus?: (e: React.FocusEvent) => void;
                onBlur?: (e: React.FocusEvent) => void;
                onKeyDown?: (e: React.KeyboardEvent) => void;
              }>,
              {
                onFocus: (e: React.FocusEvent) => {
                  const childProps = (
                    children as React.ReactElement<{
                      onFocus?: (e: React.FocusEvent) => void;
                    }>
                  ).props;
                  childProps?.onFocus?.(e);
                  showTooltip();
                },
                onBlur: (e: React.FocusEvent) => {
                  const childProps = (
                    children as React.ReactElement<{
                      onBlur?: (e: React.FocusEvent) => void;
                    }>
                  ).props;
                  childProps?.onBlur?.(e);
                  hideTooltip();
                },
                onKeyDown: (e: React.KeyboardEvent) => {
                  const childProps = (
                    children as React.ReactElement<{
                      onKeyDown?: (e: React.KeyboardEvent) => void;
                    }>
                  ).props;
                  childProps?.onKeyDown?.(e);
                  if (e.key === "Escape") {
                    setIsVisible(false);
                  }
                },
              }
            )
          : children}
      </span>
      {mounted && isVisible && createPortal(tooltipContent, document.body)}
    </>
  );
}
