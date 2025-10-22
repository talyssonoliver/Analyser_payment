/**
 * Performance Monitoring Utility
 *
 * Tracks and reports performance metrics including:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Custom performance marks
 * - Component render times
 * - API response times
 *
 * Phase 3: Service Layer Improvements
 */

"use client";

// ============================================================================
// Types
// ============================================================================

export type PerformanceRating = "good" | "needs-improvement" | "poor";

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: PerformanceRating;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface WebVitals {
  LCP?: PerformanceMetric; // Largest Contentful Paint
  FID?: PerformanceMetric; // First Input Delay
  CLS?: PerformanceMetric; // Cumulative Layout Shift
  FCP?: PerformanceMetric; // First Contentful Paint
  TTFB?: PerformanceMetric; // Time to First Byte
  INP?: PerformanceMetric; // Interaction to Next Paint
}

export interface CustomMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export type PerformanceCallback = (metric: PerformanceMetric) => void;

// ============================================================================
// Performance Monitor Class
// ============================================================================

// biome-ignore lint/complexity/noStaticOnlyClass: Intentional class-as-namespace for stable API surface
export class PerformanceMonitor {
  private static readonly metrics: Map<string, PerformanceMetric> = new Map();
  private static readonly customMarks: Map<string, CustomMetric> = new Map();
  private static readonly callbacks: PerformanceCallback[] = [];
  private static initialized = false;

  /**
   * Initialize performance monitoring
   */
  public static init(): void {
    if (PerformanceMonitor.initialized || typeof window === "undefined") {
      return;
    }

    PerformanceMonitor.initialized = true;

    // Initialize Web Vitals monitoring
    PerformanceMonitor.initWebVitals();

    // Initialize Performance Observer
    PerformanceMonitor.initPerformanceObserver();

    console.log("✅ Performance monitoring initialized");
  }

  /**
   * Register callback for performance metrics
   */
  public static onMetric(callback: PerformanceCallback): void {
    PerformanceMonitor.callbacks.push(callback);
  }

  /**
   * Report metric to callbacks
   */
  private static reportMetric(metric: PerformanceMetric): void {
    PerformanceMonitor.metrics.set(metric.name, metric);

    PerformanceMonitor.callbacks.forEach((callback) => {
      try {
        callback(metric);
      } catch (error) {
        console.error("Error in performance callback:", error);
      }
    });
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private static initWebVitals(): void {
    // LCP - Largest Contentful Paint
    PerformanceMonitor.observeLCP();

    // FID - First Input Delay
    PerformanceMonitor.observeFID();

    // CLS - Cumulative Layout Shift
    PerformanceMonitor.observeCLS();

    // FCP - First Contentful Paint
    PerformanceMonitor.observeFCP();

    // TTFB - Time to First Byte
    PerformanceMonitor.observeTTFB();
  }

  /**
   * Observe LCP (Largest Contentful Paint)
   */
  private static observeLCP(): void {
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
            renderTime?: number;
            loadTime?: number;
          };

          const value = lastEntry.renderTime || lastEntry.loadTime || 0;

          PerformanceMonitor.reportMetric({
            name: "LCP",
            value,
            rating: PerformanceMonitor.getLCPRating(value),
            timestamp: Date.now(),
            metadata: {
              element: (lastEntry as unknown as { element?: Element }).element,
            },
          });
        });

        observer.observe({ type: "largest-contentful-paint", buffered: true });
      } catch (error) {
        console.warn("LCP observation failed:", error);
      }
    }
  }

  /**
   * Observe FID (First Input Delay)
   */
  private static observeFID(): void {
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const fidEntry = entry as PerformanceEntry & { processingStart?: number };
            const value = fidEntry.processingStart ? fidEntry.processingStart - entry.startTime : 0;

            PerformanceMonitor.reportMetric({
              name: "FID",
              value,
              rating: PerformanceMonitor.getFIDRating(value),
              timestamp: Date.now(),
            });
          });
        });

        observer.observe({ type: "first-input", buffered: true });
      } catch (error) {
        console.warn("FID observation failed:", error);
      }
    }
  }

  /**
   * Observe CLS (Cumulative Layout Shift)
   */
  private static observeCLS(): void {
    if ("PerformanceObserver" in window) {
      try {
        let clsValue = 0;

        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();

          entries.forEach((entry) => {
            const layoutShiftEntry = entry as PerformanceEntry & {
              value?: number;
              hadRecentInput?: boolean;
            };
            if (!layoutShiftEntry.hadRecentInput) {
              clsValue += layoutShiftEntry.value || 0;
            }
          });

          PerformanceMonitor.reportMetric({
            name: "CLS",
            value: clsValue,
            rating: PerformanceMonitor.getCLSRating(clsValue),
            timestamp: Date.now(),
          });
        });

        observer.observe({ type: "layout-shift", buffered: true });
      } catch (error) {
        console.warn("CLS observation failed:", error);
      }
    }
  }

  /**
   * Observe FCP (First Contentful Paint)
   */
  private static observeFCP(): void {
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === "first-contentful-paint") {
              PerformanceMonitor.reportMetric({
                name: "FCP",
                value: entry.startTime,
                rating: PerformanceMonitor.getFCPRating(entry.startTime),
                timestamp: Date.now(),
              });
            }
          });
        });

        observer.observe({ type: "paint", buffered: true });
      } catch (error) {
        console.warn("FCP observation failed:", error);
      }
    }
  }

  /**
   * Observe TTFB (Time to First Byte)
   */
  private static observeTTFB(): void {
    if ("performance" in window && "navigation" in window.performance) {
      try {
        const navigationEntry = performance.getEntriesByType(
          "navigation"
        )[0] as PerformanceNavigationTiming;

        if (navigationEntry) {
          const value = navigationEntry.responseStart - navigationEntry.requestStart;

          PerformanceMonitor.reportMetric({
            name: "TTFB",
            value,
            rating: PerformanceMonitor.getTTFBRating(value),
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.warn("TTFB observation failed:", error);
      }
    }
  }

  /**
   * Initialize Performance Observer for custom metrics
   */
  private static initPerformanceObserver(): void {
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === "measure") {
              PerformanceMonitor.reportMetric({
                name: entry.name,
                value: entry.duration,
                rating: "good",
                timestamp: Date.now(),
              });
            }
          });
        });

        observer.observe({ entryTypes: ["measure", "resource"] });
      } catch (error) {
        console.warn("Performance observer failed:", error);
      }
    }
  }

  /**
   * Mark start of a custom measurement
   */
  public static markStart(name: string, metadata?: Record<string, unknown>): void {
    const startTime = performance.now();

    PerformanceMonitor.customMarks.set(name, {
      name,
      startTime,
      metadata,
    });

    performance.mark(`${name}-start`);
  }

  /**
   * Mark end of a custom measurement
   */
  public static markEnd(name: string): number | null {
    const mark = PerformanceMonitor.customMarks.get(name);

    if (!mark) {
      console.warn(`No start mark found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - mark.startTime;

    mark.endTime = endTime;
    mark.duration = duration;

    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    PerformanceMonitor.reportMetric({
      name,
      value: duration,
      rating: PerformanceMonitor.getCustomRating(duration),
      timestamp: Date.now(),
      metadata: mark.metadata,
    });

    return duration;
  }

  /**
   * Measure a synchronous function
   */
  public static measure<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
    PerformanceMonitor.markStart(name, metadata);
    try {
      return fn();
    } finally {
      PerformanceMonitor.markEnd(name);
    }
  }

  /**
   * Measure an async function
   */
  public static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    PerformanceMonitor.markStart(name, metadata);
    try {
      return await fn();
    } finally {
      PerformanceMonitor.markEnd(name);
    }
  }

  /**
   * Get all collected metrics
   */
  public static getMetrics(): WebVitals & Record<string, PerformanceMetric> {
    const metrics: Record<string, PerformanceMetric> = {};
    PerformanceMonitor.metrics.forEach((value, key) => {
      metrics[key] = value;
    });
    return metrics as WebVitals & Record<string, PerformanceMetric>;
  }

  /**
   * Get performance summary
   */
  public static getSummary(): {
    webVitals: WebVitals;
    customMetrics: CustomMetric[];
    overallRating: PerformanceRating;
  } {
    const allMetrics = PerformanceMonitor.getMetrics();
    const webVitals: WebVitals = {
      LCP: allMetrics.LCP,
      FID: allMetrics.FID,
      CLS: allMetrics.CLS,
      FCP: allMetrics.FCP,
      TTFB: allMetrics.TTFB,
    };

    const customMetrics = Array.from(PerformanceMonitor.customMarks.values());

    // Calculate overall rating
    const ratings = Array.from(PerformanceMonitor.metrics.values()).map((m) => m.rating);
    const poorCount = ratings.filter((r) => r === "poor").length;
    const needsImprovementCount = ratings.filter((r) => r === "needs-improvement").length;

    let overallRating: PerformanceRating = "good";
    if (poorCount > 0) {
      overallRating = "poor";
    } else if (needsImprovementCount > 0) {
      overallRating = "needs-improvement";
    }

    return {
      webVitals,
      customMetrics,
      overallRating,
    };
  }

  /**
   * Clear all metrics
   */
  public static clear(): void {
    PerformanceMonitor.metrics.clear();
    PerformanceMonitor.customMarks.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }

  // ============================================================================
  // Rating Helpers
  // ============================================================================

  private static getLCPRating(value: number): PerformanceRating {
    if (value <= 2500) return "good";
    if (value <= 4000) return "needs-improvement";
    return "poor";
  }

  private static getFIDRating(value: number): PerformanceRating {
    if (value <= 100) return "good";
    if (value <= 300) return "needs-improvement";
    return "poor";
  }

  private static getCLSRating(value: number): PerformanceRating {
    if (value <= 0.1) return "good";
    if (value <= 0.25) return "needs-improvement";
    return "poor";
  }

  private static getFCPRating(value: number): PerformanceRating {
    if (value <= 1800) return "good";
    if (value <= 3000) return "needs-improvement";
    return "poor";
  }

  private static getTTFBRating(value: number): PerformanceRating {
    if (value <= 800) return "good";
    if (value <= 1800) return "needs-improvement";
    return "poor";
  }

  private static getCustomRating(value: number): PerformanceRating {
    // General threshold: < 100ms = good, < 500ms = needs improvement, >= 500ms = poor
    if (value < 100) return "good";
    if (value < 500) return "needs-improvement";
    return "poor";
  }
}

// ============================================================================
// React Hook for Performance Monitoring
// ============================================================================

export function usePerformanceMonitor(componentName: string) {
  if (typeof window !== "undefined") {
    PerformanceMonitor.markStart(`${componentName}-render`);
  }

  return {
    markStart: (name: string) => PerformanceMonitor.markStart(`${componentName}-${name}`),
    markEnd: (name: string) => PerformanceMonitor.markEnd(`${componentName}-${name}`),
    measure: <T>(name: string, fn: () => T) =>
      PerformanceMonitor.measure(`${componentName}-${name}`, fn),
  };
}

// ============================================================================
// Export singleton
// ============================================================================

export const performanceMonitor = PerformanceMonitor;
