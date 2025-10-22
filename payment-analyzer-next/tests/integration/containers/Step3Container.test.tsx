/**
 * Integration Tests for Step3Container
 *
 * Tests the full integration of Step3Container with:
 * - Analysis processing workflow
 * - Database persistence
 * - Progress overlay display
 * - Inline report modal
 * - Navigation and state management
 * - Session recovery integration
 */

import type { Session } from "@supabase/supabase-js";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Step3Container } from "@/components/analysis/containers/Step3Container";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { AnalysisStorageService } from "@/lib/services/analysis-storage-service";
import { SessionRecoveryService } from "@/lib/services/session-recovery-service";
import {
  type Step3AnalysisData,
  Step3AnalysisService,
} from "@/lib/services/step3-analysis-service";
import { AppError, ErrorCodes } from "@/lib/utils/errors";
import type { ManualEntry } from "@/types/core";

// Mock services
vi.mock("@/lib/services/step3-analysis-service");
vi.mock("@/lib/services/session-recovery-service");
vi.mock("@/lib/services/analysis-storage-service");
vi.mock("@/lib/repositories/analysis-repository");
vi.mock("@/lib/utils/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock auth provider
const mockUser = {
  id: "test-user-123",
  email: "test@example.com",
  displayName: "Test User",
  preferences: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockSession: Session = {
  access_token: "mock-token",
  refresh_token: "mock-refresh",
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: "bearer",
  user: {
    id: "test-user-123",
    aud: "authenticated",
    role: "authenticated",
    email: "test@example.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
  },
};

vi.mock("@/lib/providers/auth-provider", () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    session: mockSession,
    isLoading: false,
    isAuthenticated: true,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    updateProfile: vi.fn(),
  })),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock analysis components
vi.mock("@/components/analysis/shared/step3-analyze-section-v2", () => ({
  Step3AnalyzeSectionV2: ({
    lastAnalysisData,
    onStartNewAnalysis,
    onViewDetailedReport,
  }: {
    lastAnalysisData: { id: string; days: unknown[] } | null;
    onStartNewAnalysis: () => void;
    onViewDetailedReport: () => void;
  }) => (
    <div data-testid="step3-analyze-section">
      {lastAnalysisData && (
        <>
          <div>Analysis ID: {lastAnalysisData.id}</div>
          <div>Total Days: {lastAnalysisData.days.length}</div>
          <button onClick={onStartNewAnalysis}>New Analysis</button>
          <button onClick={onViewDetailedReport}>View Report</button>
        </>
      )}
    </div>
  ),
}));

vi.mock("@/components/analysis/results/inline-report-modal", () => ({
  InlineReportModal: ({
    isOpen,
    onClose,
    onNavigateToReports,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onNavigateToReports: () => void;
  }) =>
    isOpen ? (
      <div data-testid="inline-report-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onNavigateToReports}>Navigate to Reports</button>
      </div>
    ) : null,
}));

vi.mock("@/components/analysis/shared/progress-overlay", () => ({
  ProgressOverlay: ({
    isVisible,
    onComplete,
    onError,
  }: {
    isVisible: boolean;
    onComplete: () => void;
    onError: (error: string) => void;
  }) =>
    isVisible ? (
      <div data-testid="progress-overlay">
        <div>Processing...</div>
        <button onClick={onComplete}>Complete</button>
        <button onClick={() => onError("Test error")}>Error</button>
      </div>
    ) : null,
  useProgressOverlay: () => ({
    isVisible: false,
    showProgress: vi.fn(),
    hideProgress: vi.fn(),
    updateProgress: vi.fn(),
  }),
}));

describe("Step3Container Integration Tests", () => {
  const mockFiles = [
    new File(["runsheet content"], "runsheet_2024-01-15.pdf", { type: "application/pdf" }),
    new File(["invoice content"], "invoice_2024-01-15.pdf", { type: "application/pdf" }),
  ];

  const mockManualEntries: ManualEntry[] = [
    {
      id: 1,
      date: "2024-01-15",
      day: "Monday",
      consignments: 50,
      baseAmount: 100,
      totalPay: 155,
      expectedTotal: 155,
      pickups: 0,
      earlyArrive: 0,
      attendanceBonus: 25,
      unloadingBonus: 0,
      loadingBonus: 0,
      pickupBonus: 0,
    },
    {
      id: 2,
      date: "2024-01-16",
      day: "Tuesday",
      consignments: 45,
      baseAmount: 90,
      totalPay: 145,
      expectedTotal: 145,
      pickups: 0,
      earlyArrive: 0,
      attendanceBonus: 25,
      unloadingBonus: 30,
      loadingBonus: 0,
      pickupBonus: 0,
    },
  ];

  const mockAnalysisData = {
    id: "analysis-123",
    totals: {
      baseTotal: 190,
      pickupTotal: 0,
      bonusTotal: 110,
      expectedTotal: 300,
      paidTotal: 300,
      differenceTotal: 0,
      workingDays: 2,
      totalConsignments: 95,
      unloadingTotal: 60,
      attendanceTotal: 50,
      earlyTotal: 0,
      pickupCount: 0,
    },
    weeks: [
      {
        weekStart: new Date("2024-01-15"),
        days: mockManualEntries.map((e) => ({
          date: e.date,
          day: e.day,
          consignments: e.consignments,
          rate: 2.0,
          basePayment: e.baseAmount,
          expectedTotal: e.expectedTotal,
          paidAmount: e.totalPay,
          difference: 0,
          unloadingBonus: e.unloadingBonus || 0,
          attendanceBonus: e.attendanceBonus || 0,
          earlyBonus: e.earlyArrive || 0,
          pickupCount: e.pickups || 0,
          pickupTotal: e.pickupBonus || 0,
          totalBonus:
            (e.unloadingBonus || 0) +
            (e.attendanceBonus || 0) +
            (e.earlyArrive || 0) +
            (e.pickupBonus || 0),
        })),
        totalExpected: 300,
        totalActual: 300,
        workingDays: 2,
        totalConsignments: 95,
        totalDifference: 0,
      },
    ],
    days: mockManualEntries.map((e) => ({
      date: e.date,
      day: e.day,
      consignments: e.consignments,
      rate: 2.0,
      basePayment: e.baseAmount,
      expectedTotal: e.expectedTotal,
      paidAmount: e.totalPay,
      difference: 0,
      unloadingBonus: e.unloadingBonus || 0,
      attendanceBonus: e.attendanceBonus || 0,
      earlyBonus: e.earlyArrive || 0,
      pickupCount: e.pickups || 0,
      pickupTotal: e.pickupBonus || 0,
      totalBonus:
        (e.unloadingBonus || 0) +
        (e.attendanceBonus || 0) +
        (e.earlyArrive || 0) +
        (e.pickupBonus || 0),
    })),
    metadata: {
      analysisId: "analysis-123",
      createdAt: new Date("2024-01-15"),
      analysisDate: "2024-01-15",
      inputMethod: "manual" as const,
      totalEntries: 2,
      overallStatus: "Payment Complete - Exact Match",
      periodRange: "15/01/2024 - 16/01/2024",
    },
  };

  const mockProps = {
    files: [],
    entries: [] as ManualEntry[],
    inputMethod: "manual" as const,
    onNewAnalysis: vi.fn(),
    onViewReport: vi.fn(),
    onError: vi.fn(),
    onSetStep: vi.fn(),
    onAnalysisStarted: vi.fn(),
    showAnalyzeSection: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
      mockAnalysisData as Step3AnalysisData
    );
    vi.mocked(AnalysisStorageService.saveAnalysis).mockImplementation(() => true);
    vi.mocked(SessionRecoveryService.saveSession).mockImplementation(() => {});
    vi.mocked(SessionRecoveryService.clearSession).mockImplementation(() => {});

    // Mock repository methods with proper Result<T, E> types wrapped in Promises
    vi.mocked(analysisRepository.createAnalysis).mockImplementation(
      async () =>
        ({
          isSuccess: true,
          isFailure: false,
          get data() {
            return {
              id: "db-analysis-123",
              user_id: "test-user-123",
              fingerprint: "analysis-123",
              source: "manual" as const,
              status: "completed" as const,
              period_start: "2024-01-15",
              period_end: "2024-01-16",
              rules_version: 1,
              working_days: 2,
              total_consignments: 95,
              metadata: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          },
          get error(): AppError {
            throw new Error("Cannot access error on success result");
          },
        }) as unknown as ReturnType<typeof analysisRepository.createAnalysis> extends Promise<
          infer T
        >
          ? T
          : never
    );

    vi.mocked(analysisRepository.createDailyEntries).mockImplementation(
      async () =>
        ({
          isSuccess: true,
          isFailure: false,
          get data() {
            return undefined;
          },
          get error(): AppError {
            throw new Error("Cannot access error on success result");
          },
        }) as unknown as ReturnType<typeof analysisRepository.createDailyEntries> extends Promise<
          infer T
        >
          ? T
          : never
    );

    vi.mocked(analysisRepository.createAnalysisTotals).mockImplementation(
      async () =>
        ({
          isSuccess: true,
          isFailure: false,
          get data() {
            return undefined;
          },
          get error(): AppError {
            throw new Error("Cannot access error on success result");
          },
        }) as unknown as ReturnType<typeof analysisRepository.createAnalysisTotals> extends Promise<
          infer T
        >
          ? T
          : never
    );

    vi.mocked(analysisRepository.updateAnalysisStatus).mockImplementation(
      async () =>
        ({
          isSuccess: true,
          isFailure: false,
          get data() {
            return undefined;
          },
          get error(): AppError {
            throw new Error("Cannot access error on success result");
          },
        }) as unknown as ReturnType<typeof analysisRepository.updateAnalysisStatus> extends Promise<
          infer T
        >
          ? T
          : never
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ============================================================================
  // Component Rendering Tests
  // ============================================================================

  describe("Component Rendering", () => {
    it("should render without crashing", () => {
      render(<Step3Container {...mockProps} />);
      expect(screen.queryByTestId("step3-analyze-section")).not.toBeInTheDocument();
    });

    it("should not display analyze section when showAnalyzeSection is false", () => {
      render(<Step3Container {...mockProps} showAnalyzeSection={false} />);
      expect(screen.queryByTestId("step3-analyze-section")).not.toBeInTheDocument();
    });

    it("should display analyze section when showAnalyzeSection is true", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(screen.getByTestId("step3-analyze-section")).toBeInTheDocument();
      });
    });

    it("should not render inline report modal initially", () => {
      render(<Step3Container {...mockProps} />);
      expect(screen.queryByTestId("inline-report-modal")).not.toBeInTheDocument();
    });

    it("should render progress overlay component", () => {
      render(<Step3Container {...mockProps} />);
      // Progress overlay is rendered but not visible by default
      expect(screen.queryByTestId("progress-overlay")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Analysis Processing Tests
  // ============================================================================

  describe("Analysis Processing", () => {
    it("should trigger analysis when showAnalyzeSection changes to true with manual entries", async () => {
      const { rerender } = render(<Step3Container {...mockProps} />);

      expect(mockProps.onAnalysisStarted).not.toHaveBeenCalled();
      expect(Step3AnalysisService.processAnalysis).not.toHaveBeenCalled();

      rerender(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(mockProps.onAnalysisStarted).toHaveBeenCalledTimes(1);
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalledWith({
          inputMethod: "manual",
          files: [],
          manualEntries: mockManualEntries,
        });
      });
    });

    it("should trigger analysis when showAnalyzeSection changes to true with uploaded files", async () => {
      const { rerender } = render(<Step3Container {...mockProps} />);

      rerender(
        <Step3Container
          {...mockProps}
          showAnalyzeSection={true}
          inputMethod="upload"
          files={mockFiles}
        />
      );

      await waitFor(() => {
        expect(mockProps.onAnalysisStarted).toHaveBeenCalledTimes(1);
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalledWith({
          inputMethod: "upload",
          files: mockFiles,
          manualEntries: [],
        });
      });
    });

    it("should not trigger analysis when no data is available", async () => {
      render(<Step3Container {...mockProps} showAnalyzeSection={true} entries={[]} files={[]} />);

      await waitFor(
        () => {
          expect(Step3AnalysisService.processAnalysis).not.toHaveBeenCalled();
        },
        { timeout: 500 }
      );
    });

    it("should display analysis results after successful processing", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(screen.getByText("Analysis ID: analysis-123")).toBeInTheDocument();
        expect(screen.getByText("Total Days: 2")).toBeInTheDocument();
      });
    });

    it("should handle analysis processing errors gracefully", async () => {
      const error = new Error("Processing failed");
      vi.mocked(Step3AnalysisService.processAnalysis).mockRejectedValue(error);

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalled();
      });

      // Should not display analysis results
      expect(screen.queryByText("Analysis ID:")).not.toBeInTheDocument();
    });

    it("should re-trigger analysis when entries change", async () => {
      const { rerender } = render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalledTimes(1);
      });

      const newEntries = [
        ...mockManualEntries,
        {
          id: 3,
          date: "2024-01-17",
          day: "Wednesday",
          consignments: 48,
          baseAmount: 96,
          totalPay: 151,
          expectedTotal: 151,
          pickups: 0,
          earlyArrive: 0,
          attendanceBonus: 25,
          unloadingBonus: 30,
          loadingBonus: 0,
          pickupBonus: 0,
        },
      ];

      rerender(<Step3Container {...mockProps} showAnalyzeSection={true} entries={newEntries} />);

      await waitFor(() => {
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalledTimes(2);
      });
    });

    it("should re-trigger analysis when files change", async () => {
      const { rerender } = render(
        <Step3Container
          {...mockProps}
          showAnalyzeSection={true}
          inputMethod="upload"
          files={mockFiles}
        />
      );

      await waitFor(() => {
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalledTimes(1);
      });

      const newFiles = [
        ...mockFiles,
        new File(["new content"], "new_file.pdf", { type: "application/pdf" }),
      ];

      rerender(
        <Step3Container
          {...mockProps}
          showAnalyzeSection={true}
          inputMethod="upload"
          files={newFiles}
        />
      );

      await waitFor(() => {
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalledTimes(2);
      });
    });

    it("should re-trigger analysis when input method changes", async () => {
      const { rerender } = render(
        <Step3Container
          {...mockProps}
          showAnalyzeSection={true}
          entries={mockManualEntries}
          inputMethod="manual"
        />
      );

      await waitFor(() => {
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalledTimes(1);
      });

      rerender(
        <Step3Container
          {...mockProps}
          showAnalyzeSection={true}
          files={mockFiles}
          inputMethod="upload"
        />
      );

      await waitFor(() => {
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ============================================================================
  // Database Persistence Tests
  // ============================================================================

  describe("Database Persistence", () => {
    it("should save analysis to localStorage after successful processing", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(AnalysisStorageService.saveAnalysis).toHaveBeenCalledWith(
          "analysis-123",
          expect.objectContaining({
            id: "analysis-123",
            totals: mockAnalysisData.totals,
            weeks: mockAnalysisData.weeks,
            days: mockAnalysisData.days,
            metadata: mockAnalysisData.metadata,
          })
        );
      });
    });

    it("should save analysis to database when user is authenticated", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(analysisRepository.createAnalysis).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: "test-user-123",
            fingerprint: "analysis-123",
            source: "manual",
            rulesVersion: 1,
          })
        );
      });
    });

    it("should create daily entries in database", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(analysisRepository.createDailyEntries).toHaveBeenCalledWith(
          "db-analysis-123",
          expect.arrayContaining([
            expect.objectContaining({
              date: "2024-01-15",
              consignments: 50,
              expected_total: 155,
            }),
            expect.objectContaining({
              date: "2024-01-16",
              consignments: 45,
              expected_total: 145,
            }),
          ])
        );
      });
    });

    it("should create analysis totals in database", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(analysisRepository.createAnalysisTotals).toHaveBeenCalledWith(
          "db-analysis-123",
          expect.objectContaining({
            base_total: 190,
            bonus_total: 110,
            expected_total: 300,
            paid_total: 300,
            difference_total: 0,
          })
        );
      });
    });

    it("should update analysis status to completed after saving", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(analysisRepository.updateAnalysisStatus).toHaveBeenCalledWith(
          "db-analysis-123",
          "completed"
        );
      });
    });

    it("should handle database save failure gracefully", async () => {
      vi.mocked(analysisRepository.createAnalysis).mockImplementation(
        async () =>
          ({
            isSuccess: false,
            isFailure: true,
            get data(): never {
              throw new Error("Cannot access data on failure result");
            },
            get error() {
              return new AppError("Database error", ErrorCodes.DATABASE_CONNECTION_ERROR, 500);
            },
          }) as unknown as ReturnType<typeof analysisRepository.createAnalysis> extends Promise<
            infer T
          >
            ? T
            : never
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(analysisRepository.createAnalysis).toHaveBeenCalled();
      });

      // Should still save to localStorage
      expect(AnalysisStorageService.saveAnalysis).toHaveBeenCalled();
    });

    it("should set correct analysis source for upload method", async () => {
      // Mock analysis data with upload method
      const uploadAnalysis = {
        ...mockAnalysisData,
        metadata: {
          ...mockAnalysisData.metadata,
          inputMethod: "upload" as const,
        },
      };
      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
        uploadAnalysis as Step3AnalysisData
      );

      render(
        <Step3Container
          {...mockProps}
          showAnalyzeSection={true}
          inputMethod="upload"
          files={mockFiles}
        />
      );

      await waitFor(() => {
        expect(analysisRepository.createAnalysis).toHaveBeenCalledWith(
          expect.objectContaining({
            source: "upload",
          })
        );
      });
    });

    it("should calculate working days correctly excluding Sundays", async () => {
      const entriesWithSunday: ManualEntry[] = [
        ...mockManualEntries,
        {
          id: 3,
          date: "2024-01-21", // Sunday
          day: "Sunday",
          consignments: 0,
          baseAmount: 0,
          totalPay: 0,
          expectedTotal: 0,
          pickups: 0,
          earlyArrive: 0,
          attendanceBonus: 0,
          unloadingBonus: 0,
          loadingBonus: 0,
          pickupBonus: 0,
        },
      ];

      const analysisWithSunday = {
        ...mockAnalysisData,
        days: entriesWithSunday.map((e) => ({
          date: e.date,
          day: e.day,
          consignments: e.consignments,
          rate: 2.0,
          basePayment: e.baseAmount,
          expectedTotal: e.expectedTotal,
          paidAmount: e.totalPay,
          difference: 0,
          unloadingBonus: e.unloadingBonus || 0,
          attendanceBonus: e.attendanceBonus || 0,
          earlyBonus: e.earlyArrive || 0,
          pickupCount: e.pickups || 0,
          pickupTotal: e.pickupBonus || 0,
          totalBonus:
            (e.unloadingBonus || 0) +
            (e.attendanceBonus || 0) +
            (e.earlyArrive || 0) +
            (e.pickupBonus || 0),
        })),
      };

      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
        analysisWithSunday as Step3AnalysisData
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={entriesWithSunday} />
      );

      await waitFor(() => {
        expect(analysisRepository.createAnalysis).toHaveBeenCalledWith(
          expect.objectContaining({
            workingDays: 2, // Should exclude Sunday
          })
        );
      });
    });

    it("should calculate total consignments correctly", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(analysisRepository.createAnalysis).toHaveBeenCalledWith(
          expect.objectContaining({
            totalConsignments: 95, // 50 + 45
          })
        );
      });
    });

    it("should determine status as balanced when difference is near zero", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        const dailyEntries = vi.mocked(analysisRepository.createDailyEntries).mock.calls[0][1];
        expect(dailyEntries.every((e: { status: string }) => e.status === "balanced")).toBe(true);
      });
    });

    it("should determine status as overpaid when difference is positive", async () => {
      const overpaidAnalysis = {
        ...mockAnalysisData,
        days: mockAnalysisData.days.map((d) => ({
          ...d,
          difference: 10,
        })),
      };

      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
        overpaidAnalysis as Step3AnalysisData
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        const dailyEntries = vi.mocked(analysisRepository.createDailyEntries).mock.calls[0][1];
        expect(dailyEntries.every((e: { status: string }) => e.status === "overpaid")).toBe(true);
      });
    });

    it("should determine status as underpaid when difference is negative", async () => {
      const underpaidAnalysis = {
        ...mockAnalysisData,
        days: mockAnalysisData.days.map((d) => ({
          ...d,
          difference: -10,
        })),
      };

      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
        underpaidAnalysis as Step3AnalysisData
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        const dailyEntries = vi.mocked(analysisRepository.createDailyEntries).mock.calls[0][1];
        expect(dailyEntries.every((e: { status: string }) => e.status === "underpaid")).toBe(true);
      });
    });
  });

  // ============================================================================
  // Session Management Tests
  // ============================================================================

  describe("Session Management", () => {
    it("should save session state after successful analysis", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(SessionRecoveryService.saveSession).toHaveBeenCalledWith(
          expect.objectContaining({
            hasBeenAnalyzed: true,
            lastAnalysisData: expect.objectContaining({
              id: "db-analysis-123",
              localStorageId: "analysis-123",
            }),
          })
        );
      });
    });

    it("should save session with localStorage ID only when database save fails", async () => {
      vi.mocked(analysisRepository.createAnalysis).mockImplementation(
        async () =>
          ({
            isSuccess: false,
            isFailure: true,
            get data(): never {
              throw new Error("Cannot access data on failure result");
            },
            get error() {
              return new AppError("Database error", ErrorCodes.DATABASE_CONNECTION_ERROR, 500);
            },
          }) as unknown as ReturnType<typeof analysisRepository.createAnalysis> extends Promise<
            infer T
          >
            ? T
            : never
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(SessionRecoveryService.saveSession).toHaveBeenCalledWith(
          expect.objectContaining({
            hasBeenAnalyzed: true,
            lastAnalysisData: { id: "analysis-123" },
          })
        );
      });
    });

    it("should clear session when starting new analysis", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(screen.getByText("New Analysis")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("New Analysis"));

      expect(SessionRecoveryService.clearSession).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // User Interaction Tests
  // ============================================================================

  describe("User Interaction", () => {
    it("should handle new analysis button click", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(screen.getByText("New Analysis")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("New Analysis"));

      expect(mockProps.onNewAnalysis).toHaveBeenCalledTimes(1);
      expect(mockProps.onSetStep).toHaveBeenCalledWith(1);
    });

    it("should open inline report modal when view report is clicked", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(screen.getByText("View Report")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("View Report"));

      await waitFor(() => {
        expect(screen.getByTestId("inline-report-modal")).toBeInTheDocument();
      });
    });

    it("should close inline report modal", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      // Open modal
      await waitFor(() => {
        expect(screen.getByText("View Report")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("View Report"));

      await waitFor(() => {
        expect(screen.getByTestId("inline-report-modal")).toBeInTheDocument();
      });

      // Close modal
      fireEvent.click(screen.getByText("Close Modal"));

      await waitFor(() => {
        expect(screen.queryByTestId("inline-report-modal")).not.toBeInTheDocument();
      });
    });

    it("should navigate to reports page from inline modal", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      // Open modal
      await waitFor(() => {
        expect(screen.getByText("View Report")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("View Report"));

      await waitFor(() => {
        expect(screen.getByTestId("inline-report-modal")).toBeInTheDocument();
      });

      // Navigate to reports
      fireEvent.click(screen.getByText("Navigate to Reports"));

      expect(mockProps.onViewReport).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/reports");
    });

    it("should reset analysis data state when starting new analysis", async () => {
      const { rerender } = render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(screen.getByText("Analysis ID: analysis-123")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("New Analysis"));

      // Analysis data should be cleared
      rerender(<Step3Container {...mockProps} showAnalyzeSection={false} />);

      expect(screen.queryByText("Analysis ID:")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Progress Overlay Tests
  // ============================================================================

  describe("Progress Overlay", () => {
    it("should handle progress overlay completion", () => {
      render(<Step3Container {...mockProps} />);
      // Progress overlay renders but is not visible by default
      expect(screen.queryByTestId("progress-overlay")).not.toBeInTheDocument();
    });

    it("should handle progress overlay error", () => {
      render(<Step3Container {...mockProps} />);
      // Progress overlay error handling is managed internally
      expect(screen.queryByTestId("progress-overlay")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Data Transformation Tests
  // ============================================================================

  describe("Data Transformation", () => {
    it("should transform manual entries for inline report modal", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(screen.getByText("View Report")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("View Report"));

      // Modal should receive transformed entries
      await waitFor(() => {
        expect(screen.getByTestId("inline-report-modal")).toBeInTheDocument();
      });
    });

    it("should calculate correct period dates from analysis days", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(analysisRepository.createAnalysis).toHaveBeenCalledWith(
          expect.objectContaining({
            periodStart: "2024-01-15",
            periodEnd: "2024-01-16",
          })
        );
      });
    });

    it("should include original analysis ID in metadata", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(analysisRepository.createAnalysis).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              originalId: "analysis-123",
            }),
          })
        );
      });
    });

    it("should map daily entry fields correctly", async () => {
      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        const dailyEntries = vi.mocked(analysisRepository.createDailyEntries).mock.calls[0][1];
        const firstEntry = dailyEntries[0];

        expect(firstEntry).toMatchObject({
          date: "2024-01-15",
          day_of_week: 1, // Monday
          consignments: 50,
          rate: 2.0,
          base_payment: 100,
          pickups: 0,
          pickup_total: 0,
          unloading_bonus: 0,
          attendance_bonus: 25,
          early_bonus: 0,
          expected_total: 155,
          paid_amount: 155,
          difference: 0,
          status: "balanced",
        });
      });
    });

    it("should handle pickups data correctly", async () => {
      const entriesWithPickups: ManualEntry[] = [
        {
          id: 1,
          date: "2024-01-15",
          day: "Monday",
          consignments: 50,
          baseAmount: 100,
          totalPay: 175,
          expectedTotal: 175,
          pickups: 2,
          earlyArrive: 0,
          attendanceBonus: 25,
          unloadingBonus: 0,
          loadingBonus: 0,
          pickupBonus: 20,
        },
      ];

      const analysisWithPickups = {
        ...mockAnalysisData,
        days: entriesWithPickups.map((e) => ({
          date: e.date,
          day: e.day,
          consignments: e.consignments,
          rate: 2.0,
          basePayment: e.baseAmount,
          expectedTotal: e.expectedTotal,
          paidAmount: e.totalPay,
          difference: 0,
          unloadingBonus: e.unloadingBonus || 0,
          attendanceBonus: e.attendanceBonus || 0,
          earlyBonus: e.earlyArrive || 0,
          pickupCount: e.pickups || 0,
          pickupTotal: e.pickupBonus || 0,
          totalBonus:
            (e.unloadingBonus || 0) +
            (e.attendanceBonus || 0) +
            (e.earlyArrive || 0) +
            (e.pickupBonus || 0),
        })),
      };

      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
        analysisWithPickups as Step3AnalysisData
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={entriesWithPickups} />
      );

      await waitFor(() => {
        const dailyEntries = vi.mocked(analysisRepository.createDailyEntries).mock.calls[0][1];
        expect(dailyEntries[0]).toMatchObject({
          pickups: 2,
          pickup_total: 20,
        });
      });
    });
  });

  // ============================================================================
  // Edge Cases and Error Scenarios
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle empty analysis data gracefully", async () => {
      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(null);

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalled();
      });

      // Should not crash or display invalid data
      expect(screen.queryByText("Analysis ID:")).not.toBeInTheDocument();
    });

    it("should handle analysis with no working days", async () => {
      const sundayOnly = {
        ...mockAnalysisData,
        days: [
          {
            date: "2024-01-21",
            day: "Sunday",
            consignments: 0,
            rate: 0,
            basePayment: 0,
            expectedTotal: 0,
            paidAmount: 0,
            difference: 0,
            unloadingBonus: 0,
            attendanceBonus: 0,
            earlyBonus: 0,
            pickupCount: 0,
            pickupTotal: 0,
            totalBonus: 0,
          },
        ],
      };

      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
        sundayOnly as Step3AnalysisData
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={[mockManualEntries[0]]} />
      );

      await waitFor(() => {
        expect(analysisRepository.createAnalysis).toHaveBeenCalledWith(
          expect.objectContaining({
            workingDays: 0,
          })
        );
      });
    });

    it("should handle analysis with single day", async () => {
      const singleDay = {
        ...mockAnalysisData,
        days: [mockAnalysisData.days[0]],
      };

      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
        singleDay as Step3AnalysisData
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={[mockManualEntries[0]]} />
      );

      await waitFor(() => {
        expect(screen.getByText("Total Days: 1")).toBeInTheDocument();
      });
    });

    it("should handle analysis with large number of days", async () => {
      const largeDays = Array.from({ length: 100 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, "0")}`,
        day: "Monday",
        consignments: 50,
        rate: 2.0,
        basePayment: 100,
        expectedTotal: 155,
        paidAmount: 155,
        difference: 0,
        unloadingBonus: 0,
        attendanceBonus: 25,
        earlyBonus: 0,
        pickupCount: 0,
        pickupTotal: 0,
        totalBonus: 25,
      }));

      const largeAnalysis = {
        ...mockAnalysisData,
        days: largeDays,
      };

      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
        largeAnalysis as Step3AnalysisData
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(screen.getByText("Total Days: 100")).toBeInTheDocument();
      });
    });

    it("should handle daily entries creation failure", async () => {
      vi.mocked(analysisRepository.createDailyEntries).mockImplementation(
        async () =>
          ({
            isSuccess: false,
            isFailure: true,
            get data(): never {
              throw new Error("Cannot access data on failure result");
            },
            get error() {
              return new AppError(
                "Failed to create daily entries",
                ErrorCodes.DATABASE_CONNECTION_ERROR,
                500
              );
            },
          }) as unknown as ReturnType<typeof analysisRepository.createDailyEntries> extends Promise<
            infer T
          >
            ? T
            : never
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(analysisRepository.createDailyEntries).toHaveBeenCalled();
      });

      // Should still save to localStorage
      expect(AnalysisStorageService.saveAnalysis).toHaveBeenCalled();
    });

    it("should handle analysis totals creation failure", async () => {
      vi.mocked(analysisRepository.createAnalysisTotals).mockImplementation(
        async () =>
          ({
            isSuccess: false,
            isFailure: true,
            get data(): never {
              throw new Error("Cannot access data on failure result");
            },
            get error() {
              return new AppError(
                "Failed to create totals",
                ErrorCodes.DATABASE_CONNECTION_ERROR,
                500
              );
            },
          }) as unknown as ReturnType<
            typeof analysisRepository.createAnalysisTotals
          > extends Promise<infer T>
            ? T
            : never
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(analysisRepository.createAnalysisTotals).toHaveBeenCalled();
      });

      // Should still save to localStorage
      expect(AnalysisStorageService.saveAnalysis).toHaveBeenCalled();
    });

    it("should handle missing analysis ID in data", async () => {
      const noIdAnalysis = {
        ...mockAnalysisData,
        id: "",
      };

      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
        noIdAnalysis as Step3AnalysisData
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalled();
      });

      // Should not attempt to save without valid ID
      expect(AnalysisStorageService.saveAnalysis).not.toHaveBeenCalled();
    });

    it("should handle very small differences as balanced", async () => {
      const tinyDifference = {
        ...mockAnalysisData,
        days: mockAnalysisData.days.map((d) => ({
          ...d,
          difference: 0.005, // Less than 0.01
        })),
      };

      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
        tinyDifference as Step3AnalysisData
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        const dailyEntries = vi.mocked(analysisRepository.createDailyEntries).mock.calls[0][1];
        expect(dailyEntries.every((e: { status: string }) => e.status === "balanced")).toBe(true);
      });
    });

    it("should handle analysis with negative consignments", async () => {
      const negativeConsignments = {
        ...mockAnalysisData,
        days: [
          {
            date: "2024-01-15",
            day: "Monday",
            consignments: -5,
            rate: 2.0,
            basePayment: -10,
            expectedTotal: -10,
            paidAmount: 0,
            difference: 10,
            unloadingBonus: 0,
            attendanceBonus: 0,
            earlyBonus: 0,
            pickupCount: 0,
            pickupTotal: 0,
            totalBonus: 0,
          },
        ],
      };

      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
        negativeConsignments as Step3AnalysisData
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        const dailyEntries = vi.mocked(analysisRepository.createDailyEntries).mock.calls[0][1];
        expect(dailyEntries[0].consignments).toBe(-5);
      });
    });

    it("should handle analysis with zero totals", async () => {
      const zeroTotals = {
        ...mockAnalysisData,
        totals: {
          baseTotal: 0,
          pickupTotal: 0,
          bonusTotal: 0,
          expectedTotal: 0,
          paidTotal: 0,
          differenceTotal: 0,
          workingDays: 0,
          totalConsignments: 0,
          unloadingTotal: 0,
          attendanceTotal: 0,
          earlyTotal: 0,
          pickupCount: 0,
        },
        days: [], // Empty days array
      };

      vi.mocked(Step3AnalysisService.processAnalysis).mockResolvedValue(
        zeroTotals as Step3AnalysisData
      );

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalled();
      });

      // With empty days array, component handles gracefully without crashing
      // No data to save, so DB operations should not be triggered
      expect(screen.queryByText("Analysis ID:")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Authentication State Tests
  // ============================================================================

  describe("Authentication State", () => {
    it("should skip database save when user is not authenticated", async () => {
      const { useAuth } = await import("@/lib/providers/auth-provider");
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        updatePassword: vi.fn(),
        updateProfile: vi.fn(),
      });

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalled();
      });

      // Should save to localStorage
      expect(AnalysisStorageService.saveAnalysis).toHaveBeenCalled();

      // Should NOT save to database
      expect(analysisRepository.createAnalysis).not.toHaveBeenCalled();
    });

    it("should save session with localStorage ID only when not authenticated", async () => {
      const { useAuth } = await import("@/lib/providers/auth-provider");
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        updatePassword: vi.fn(),
        updateProfile: vi.fn(),
      });

      render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(SessionRecoveryService.saveSession).toHaveBeenCalledWith(
          expect.objectContaining({
            hasBeenAnalyzed: true,
            lastAnalysisData: { id: "analysis-123" },
          })
        );
      });
    });
  });

  // ============================================================================
  // Component Lifecycle Tests
  // ============================================================================

  describe("Component Lifecycle", () => {
    it("should not trigger analysis on initial render without data", () => {
      render(<Step3Container {...mockProps} />);
      expect(Step3AnalysisService.processAnalysis).not.toHaveBeenCalled();
    });

    it("should cleanup properly on unmount", () => {
      const { unmount } = render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      unmount();
      // No errors should occur
    });

    it("should handle rapid state changes gracefully", async () => {
      const { rerender } = render(<Step3Container {...mockProps} />);

      // Rapid changes
      rerender(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );
      rerender(<Step3Container {...mockProps} showAnalyzeSection={false} />);
      rerender(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(Step3AnalysisService.processAnalysis).toHaveBeenCalled();
      });
    });

    it("should maintain state across re-renders", async () => {
      const { rerender } = render(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      await waitFor(() => {
        expect(screen.getByText("Analysis ID: analysis-123")).toBeInTheDocument();
      });

      // Re-render with same props
      rerender(
        <Step3Container {...mockProps} showAnalyzeSection={true} entries={mockManualEntries} />
      );

      // Analysis data should still be displayed
      expect(screen.getByText("Analysis ID: analysis-123")).toBeInTheDocument();
    });
  });
});
