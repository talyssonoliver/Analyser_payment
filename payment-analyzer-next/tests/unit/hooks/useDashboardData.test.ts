/**
 * Unit Tests for useDashboardData Hook - CORRECTED VERSION
 * Tests data loading, period calculations, and metric aggregations
 *
 * TO USE: Rename this file to useDashboardData.test.ts (replacing the old one)
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardData } from "@/hooks/useDashboardData";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import { analyticsService } from "@/lib/services/analytics-service";
import { mockAnalyses, mockDashboardData } from "@/tests/mocks/dashboard-data";
import { createFailureResult, createSuccessResult } from "@/tests/mocks/result-helpers";

// Mock external dependencies
vi.mock("@/lib/services/analytics-service");
vi.mock("@/lib/repositories/analysis-repository");
vi.mock("@/lib/services/analysis-storage-service");

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with default empty state", () => {
      const { result } = renderHook(() => useDashboardData());

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual({
        kpis: [],
        revenueData: [],
        recentAnalyses: [],
        totalRevenue: 0,
        avgDaily: 0,
        deliveries: 0,
        performance: 0,
        revenueChange: 0,
        deliveriesChange: 0,
        periodLabel: "Weekly",
      });
      expect(result.current.analyses).toEqual([]);
    });

    it("should provide loadDashboardData function", () => {
      const { result } = renderHook(() => useDashboardData());

      expect(typeof result.current.loadDashboardData).toBe("function");
    });
  });

  describe("Data Loading", () => {
    it("should not load data when userId is not provided", async () => {
      const { result } = renderHook(() => useDashboardData());

      await result.current.loadDashboardData({});

      expect(result.current.loading).toBe(false);
      expect(analyticsService.getAnalyticsData).not.toHaveBeenCalled();
    });

    it("should successfully load analytics data", async () => {
      const mockAnalyticsData = createSuccessResult({
        kpis: mockDashboardData.kpis,
        revenueChart: mockDashboardData.revenueData,
        trends: mockDashboardData.trends,
      });

      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(mockAnalyticsData);
      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue(
        createSuccessResult({
          data: mockAnalyses,
          count: mockAnalyses.length,
        })
      );
      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});

      const { result } = renderHook(() => useDashboardData());

      await result.current.loadDashboardData({
        userId: "test-user-123",
        period: "30d",
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data.kpis).toEqual(mockDashboardData.kpis);
        expect(result.current.data.revenueData).toEqual(mockDashboardData.revenueData);
      });

      expect(analyticsService.getAnalyticsData).toHaveBeenCalledWith({
        userId: "test-user-123",
        period: "30d",
      });
    });

    it("should handle analytics service errors gracefully", async () => {
      const mockError = createFailureResult("Analytics service error");

      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(mockError);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useDashboardData());

      await result.current.loadDashboardData({
        userId: "test-user-123",
        period: "30d",
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load dashboard data:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Forecast Generation", () => {
    it("should generate forecast when analyses exist", async () => {
      const mockAnalyticsData = createSuccessResult({
        kpis: [],
        revenueChart: [],
        trends: { earnings: 0, consignments: 0, efficiency: 0, accuracy: 0 },
      });

      const mockForecast = { forecast: 1500, confidence: 0.85 };

      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(mockAnalyticsData);
      vi.mocked(analyticsService.forecastEarnings).mockResolvedValue(mockForecast);
      vi.mocked(analysisRepository.getUserAnalyses).mockResolvedValue(
        createSuccessResult({
          data: mockAnalyses,
          count: mockAnalyses.length,
        })
      );
      vi.mocked(AnalysisStorageService.loadAnalyses).mockReturnValue({});

      const { result } = renderHook(() => useDashboardData());

      await result.current.loadDashboardData({
        userId: "test-user-123",
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data.forecast).toBe(1500);
      });

      expect(analyticsService.forecastEarnings).toHaveBeenCalledWith("test-user-123", 30);
    });
  });
});
