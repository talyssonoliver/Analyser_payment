import { describe, expect, it } from "vitest";
import { PerformanceMonitor } from "@/lib/utils/performance-monitor";

describe("utils/performance-monitor", () => {
  it("measures custom marks and returns duration", () => {
    PerformanceMonitor.markStart("op");
    const duration = PerformanceMonitor.markEnd("op");
    expect(typeof duration === "number" || duration === null).toBe(true);
  });

  it("measure wraps sync functions", () => {
    const result = PerformanceMonitor.measure("calc", () => 42);
    expect(result).toBe(42);
  });
});
