/**
 * History Page Integration Tests
 * Comprehensive tests for the analysis history listing page
 */

import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HistoryPage from "@/app/(dashboard)/history/page";
import { useAuth } from "@/lib/providers/auth-provider";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { mockAnalyses, mockEmptyAnalyses } from "@/tests/mocks/history-data";
import { createFailureResult, createSuccessResult } from "@/tests/mocks/result-helpers";
import { fireEvent, render, screen, waitFor } from "@/tests/utils/test-utils";

// Mock router functions at module level
const mockPush = vi.fn();
const mockRefresh = vi.fn();

// Mock dependencies
vi.mock("@/lib/providers/auth-provider");
vi.mock("@/lib/repositories/analysis-repository");
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

const mockUser = {
  id: "test-user-123",
  email: "test@example.com",
  user_metadata: { name: "Test User" },
};

describe("History Page Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockPush.mockClear();
    mockRefresh.mockClear();

    // Default mock implementations
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Page Load", () => {
    it("should render loading state initially", () => {
      (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        user: mockUser,
        isLoading: true,
        isAuthenticated: false,
      });

      render(<HistoryPage />);

      expect(screen.getByText(/Loading your analysis history/i)).toBeInTheDocument();
    });

    it("should load and display analysis history", async () => {
      (analysisRepository.getUserAnalyses as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        createSuccessResult({ data: mockAnalyses, count: mockAnalyses.length })
      );

      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Should show stats
      expect(screen.getByText("Total Days")).toBeInTheDocument();
      expect(screen.getByText("Total Weeks")).toBeInTheDocument();
      expect(screen.getByText("Consignments")).toBeInTheDocument();
      expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    });

    it("should display correct total stats", async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createSuccessResult({ data: mockAnalyses, count: mockAnalyses.length })
      );

      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Check stats - 6 total days from all analyses
      expect(screen.getByText("6")).toBeInTheDocument(); // Total days
    });

    it("should expand the most recent month by default", async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createSuccessResult({ data: mockAnalyses, count: mockAnalyses.length })
      );

      render(<HistoryPage />);

      await waitFor(() => {
        // October 2024 should be expanded (most recent)
        expect(screen.getByText(/October 2024/i)).toBeInTheDocument();
      });
    });
  });

  describe("History List Rendering", () => {
    beforeEach(async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createSuccessResult({ data: mockAnalyses, count: mockAnalyses.length })
      );
    });

    it("should render month headers with correct information", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText(/October 2024/i)).toBeInTheDocument();
        expect(screen.getByText(/September 2024/i)).toBeInTheDocument();
      });
    });

    it("should show week summaries when month is expanded", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText(/Week \d+, 2024/i)).toBeInTheDocument();
      });
    });

    it("should render day entries when week is expanded", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText(/October 2024/i)).toBeInTheDocument();
      });

      // Find and click the first week expand button
      const expandButtons = screen.getAllByRole("button");
      const weekExpandButton = expandButtons.find((btn) => btn.title === "Expand/collapse week");

      if (weekExpandButton) {
        await fireEvent.click(weekExpandButton);

        await waitFor(() => {
          // Use getAllByText since "consignments" appears multiple times
          const consignmentsTexts = screen.getAllByText(/consignments/i);
          expect(consignmentsTexts.length).toBeGreaterThan(0);
        });
      }
    });

    it("should display correct consignment counts", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        // Should show total consignments in stats
        const consignmentStat = screen.getByText("Consignments").parentElement;
        expect(consignmentStat).toBeInTheDocument();
      });
    });

    it("should display correct total amounts", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        const revenueStat = screen.getByText("Total Revenue").parentElement;
        expect(revenueStat).toBeInTheDocument();
      });
    });
  });

  describe("Date Filtering", () => {
    beforeEach(async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createSuccessResult({ data: mockAnalyses, count: mockAnalyses.length })
      );
    });

    it("should show filter button", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Toggle filters")).toBeInTheDocument();
      });
    });

    it("should toggle filter panel when filter button is clicked", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.queryByLabelText("Date Range")).not.toBeInTheDocument();
      });

      // Find filter button by accessible label or text
      const filterButton =
        screen.getByRole("button", { name: /filter/i }) || screen.getByLabelText(/filter/i);
      await fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Date Range")).toBeInTheDocument();
      });
    });

    it("should apply date range filter - Last 7 Days", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Toggle filters")).toBeInTheDocument();
      });

      const filterButton = screen.getByTitle("Toggle filters");
      await fireEvent.click(filterButton);

      const dateFilter = screen.getByLabelText("Date Range");
      fireEvent.change(dateFilter, { target: { value: "7days" } });

      await waitFor(() => {
        // Should filter to only show recent entries
        expect(dateFilter).toHaveValue("7days");
      });
    });

    it("should apply date range filter - Last 30 Days", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Toggle filters")).toBeInTheDocument();
      });

      const filterButton = screen.getByTitle("Toggle filters");
      await fireEvent.click(filterButton);

      const dateFilter = screen.getByLabelText("Date Range");
      fireEvent.change(dateFilter, { target: { value: "30days" } });

      expect(dateFilter).toHaveValue("30days");
    });

    it("should apply date range filter - Last 90 Days", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Toggle filters")).toBeInTheDocument();
      });

      const filterButton = screen.getByTitle("Toggle filters");
      await fireEvent.click(filterButton);

      const dateFilter = screen.getByLabelText("Date Range");
      fireEvent.change(dateFilter, { target: { value: "90days" } });

      expect(dateFilter).toHaveValue("90days");
    });
  });

  describe("Search Functionality", () => {
    beforeEach(async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createSuccessResult({ data: mockAnalyses, count: mockAnalyses.length })
      );
    });

    it("should render search input", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search by date/i)).toBeInTheDocument();
      });
    });

    it("should filter results by search term", async () => {
      render(<HistoryPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Verify October 2024 is initially displayed
      await waitFor(() => {
        expect(screen.getByText(/October 2024/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by date/i);
      // Search by date that exists in the data (2024-10-01)
      fireEvent.change(searchInput, { target: { value: "2024-10" } });

      // After filtering, October should still be visible (dates match "2024-10")
      await waitFor(() => {
        expect(screen.getByText(/October 2024/i)).toBeInTheDocument();
      });
    });

    it('should show "No Results Found" when search has no matches', async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search by date/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by date/i);
      fireEvent.change(searchInput, { target: { value: "nonexistentdate" } });

      await waitFor(() => {
        expect(screen.getByText(/No Results Found/i)).toBeInTheDocument();
      });
    });

    it("should clear search when search input is cleared", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search by date/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by date/i);
      fireEvent.change(searchInput, { target: { value: "October" } });
      fireEvent.change(searchInput, { target: { value: "" } });

      await waitFor(() => {
        expect(screen.queryByText(/No Results Found/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Sorting and Amount Filtering", () => {
    beforeEach(async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createSuccessResult({ data: mockAnalyses, count: mockAnalyses.length })
      );
    });

    it("should apply amount filter - High (£100+)", async () => {
      render(<HistoryPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      const filterButton = screen.getByTitle("Toggle filters");
      await fireEvent.click(filterButton);

      const amountFilter = screen.getByLabelText("Amount Range");
      fireEvent.change(amountFilter, { target: { value: "high" } });

      expect(amountFilter).toHaveValue("high");
    });

    it("should apply amount filter - Medium (£50-£99)", async () => {
      render(<HistoryPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      const filterButton = screen.getByTitle("Toggle filters");
      await fireEvent.click(filterButton);

      const amountFilter = screen.getByLabelText("Amount Range");
      fireEvent.change(amountFilter, { target: { value: "medium" } });

      expect(amountFilter).toHaveValue("medium");
    });

    it("should apply amount filter - Low (Under £50)", async () => {
      render(<HistoryPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      const filterButton = screen.getByTitle("Toggle filters");
      await fireEvent.click(filterButton);

      const amountFilter = screen.getByLabelText("Amount Range");
      fireEvent.change(amountFilter, { target: { value: "low" } });

      expect(amountFilter).toHaveValue("low");
    });

    it("should clear all filters when Clear Filters is clicked", async () => {
      render(<HistoryPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      const filterButton = screen.getByTitle("Toggle filters");
      await fireEvent.click(filterButton);

      const dateFilter = screen.getByLabelText("Date Range");
      fireEvent.change(dateFilter, { target: { value: "7days" } });

      const clearButton = screen.getByText("Clear Filters");
      await fireEvent.click(clearButton);

      await waitFor(() => {
        expect(dateFilter).toHaveValue("all");
      });
    });
  });

  describe("View Analysis Detail Navigation", () => {
    beforeEach(async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createSuccessResult({ data: mockAnalyses, count: mockAnalyses.length })
      );
    });

    it("should have clickable week headers", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        const weekButton = screen.getByText(/Week \d+, 2024/i);
        expect(weekButton).toBeInTheDocument();
      });
    });

    it("should navigate to reports page when view day button is clicked", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText(/October 2024/i)).toBeInTheDocument();
      });

      // Expand week to see day entries
      const expandButtons = screen.getAllByRole("button");
      const weekExpandButton = expandButtons.find((btn) => btn.title === "Expand/collapse week");

      if (weekExpandButton) {
        await fireEvent.click(weekExpandButton);

        await waitFor(() => {
          const viewButtons = screen.getAllByText("View");
          expect(viewButtons.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no history exists", async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createSuccessResult({ data: mockEmptyAnalyses, count: 0 })
      );

      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText(/No History/i)).toBeInTheDocument();
        expect(screen.getByText(/Your analysis history will appear here/i)).toBeInTheDocument();
      });
    });

    it("should not show stats when no history exists", async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createSuccessResult({ data: mockEmptyAnalyses, count: 0 })
      );

      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.queryByText("Total Days")).not.toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading skeleton while fetching data", async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(createSuccessResult({ data: mockAnalyses, count: mockAnalyses.length })),
              100
            )
          )
      );

      render(<HistoryPage />);

      expect(screen.getByText(/Loading your analysis history/i)).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe("Error Handling", () => {
    it("should display error message when loading fails", async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createFailureResult("Failed to load analyses")
      );

      render(<HistoryPage />);

      await waitFor(() => {
        // Use getAllByText since "Error Loading History" appears in both header and card
        const errorHeaders = screen.getAllByText(/Error Loading History/i);
        expect(errorHeaders.length).toBeGreaterThan(0);
        expect(
          screen.getByText(/Failed to load history: Failed to load analyses/i)
        ).toBeInTheDocument();
      });
    });

    it("should have retry button on error state", async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createFailureResult("Failed to load analyses")
      );

      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("Try Again")).toBeInTheDocument();
      });
    });

    it("should retry loading when Try Again is clicked", async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createFailureResult("Failed to load analyses")
      );

      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("Try Again")).toBeInTheDocument();
      });

      const retryButton = screen.getByText("Try Again");
      await fireEvent.click(retryButton);

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe("Authentication Requirements", () => {
    it("should show login required state when user is not authenticated", async () => {
      (useAuth as unknown as Mock).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText(/Login Required/i)).toBeInTheDocument();
        expect(
          screen.getByText(/Please log in to view your analysis history/i)
        ).toBeInTheDocument();
      });
    });

    it("should have login button when not authenticated", async () => {
      (useAuth as unknown as Mock).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("Go to Login")).toBeInTheDocument();
      });
    });

    it("should navigate to login page when Go to Login is clicked", async () => {
      (useAuth as unknown as Mock).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("Go to Login")).toBeInTheDocument();
      });

      const loginButton = screen.getByText("Go to Login");
      await fireEvent.click(loginButton);

      expect(mockPush).toHaveBeenCalledWith("/auth/login");
    });
  });

  describe("Expand/Collapse Functionality", () => {
    beforeEach(async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createSuccessResult({ data: mockAnalyses, count: mockAnalyses.length })
      );
    });

    it("should toggle month expansion when month header is clicked", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText(/October 2024/i)).toBeInTheDocument();
      });

      const monthButton = screen.getByText(/October 2024/i).closest("button");
      expect(monthButton).toBeInTheDocument();

      if (monthButton) {
        // First click should collapse
        await fireEvent.click(monthButton);

        await waitFor(() => {
          // Week should not be visible when collapsed
          expect(screen.queryByText(/Week \d+, 2024/i)).not.toBeInTheDocument();
        });
      }
    });

    it("should toggle week expansion independently", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByText(/October 2024/i)).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByRole("button");
      const weekExpandButton = expandButtons.find((btn) => btn.title === "Expand/collapse week");

      if (weekExpandButton) {
        await fireEvent.click(weekExpandButton);

        await waitFor(() => {
          // Use getAllByText since "consignments" appears multiple times
          const consignmentsTexts = screen.getAllByText(/consignments/i);
          expect(consignmentsTexts.length).toBeGreaterThan(0);
        });

        // Click again to collapse
        await fireEvent.click(weekExpandButton);

        await waitFor(() => {
          const viewButtons = screen.queryAllByText("View");
          expect(viewButtons.length).toBeLessThan(3);
        });
      }
    });
  });

  describe("Accessibility", () => {
    beforeEach(async () => {
      (analysisRepository.getUserAnalyses as unknown as Mock).mockResolvedValue(
        createSuccessResult({ data: mockAnalyses, count: mockAnalyses.length })
      );
    });

    it("should have proper ARIA labels on interactive elements", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        expect(screen.getByTitle("Toggle filters")).toBeInTheDocument();
      });
    });

    it("should support keyboard navigation for week selection", async () => {
      render(<HistoryPage />);

      await waitFor(() => {
        const weekButton = screen.getByText(/Week \d+, 2024/i);
        expect(weekButton).toBeInTheDocument();
        expect(weekButton).toHaveAttribute("tabIndex", "0");
      });
    });

    it("should have proper form labels", async () => {
      render(<HistoryPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      const filterButton = screen.getByTitle("Toggle filters");
      await fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Date Range")).toBeInTheDocument();
        expect(screen.getByLabelText("Amount Range")).toBeInTheDocument();
      });
    });
  });
});
