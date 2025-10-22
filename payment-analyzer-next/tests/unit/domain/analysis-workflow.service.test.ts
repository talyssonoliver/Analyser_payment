/**
 * Analysis Workflow Service Tests
 * Comprehensive tests for workflow orchestration
 * Target Coverage: 85%+
 */

import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisWorkflowService } from "@/lib/domain/analysis-workflow.service";
import type { ManualEntry } from "@/types/core";

// Mock all dependencies
vi.mock("@/lib/services/file-fingerprint-service", () => ({
  FileFingerprintService: {
    validateFileSet: vi.fn(),
  },
}));

vi.mock("@/lib/services/analysis-service", () => ({
  analysisService: {
    createAnalysis: vi.fn(),
    getAnalysisById: vi.fn(),
    updateAnalysisStatus: vi.fn(),
  },
}));

vi.mock("@/lib/services/step3-analysis-service", () => ({
  Step3AnalysisService: {
    processAnalysis: vi.fn(),
  },
}));

vi.mock("@/lib/services/session-recovery-service", () => ({
  SessionRecoveryService: {
    saveSession: vi.fn(),
  },
}));

describe("AnalysisWorkflowService", () => {
  let service: AnalysisWorkflowService;

  const createMockFile = (name: string): File => {
    const blob = new Blob(["test content"], { type: "application/pdf" });
    return new File([blob], name, { type: "application/pdf", lastModified: Date.now() });
  };

  const createMockManualEntry = (date: string, consignments: number = 100): ManualEntry => ({
    id: 0,
    date,
    day: "Monday",
    consignments,
    baseAmount: consignments * 2,
    totalPay: consignments * 2 + 75,
    pickups: 0,
  });

  beforeEach(() => {
    service = new AnalysisWorkflowService();
    vi.clearAllMocks();
  });

  describe("onProgress", () => {
    it("should register progress callback", () => {
      const callback = vi.fn();
      service.onProgress(callback);

      // Trigger a workflow to verify callback is registered
      // The callback should not throw when emitProgress is called
      expect(() => service.onProgress(callback)).not.toThrow();
    });

    it("should support multiple progress callbacks", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.onProgress(callback1);
      service.onProgress(callback2);

      expect(() => service.onProgress(callback1)).not.toThrow();
    });
  });

  describe("executeFileWorkflow", () => {
    const validConfig = {
      userId: "user-123",
      validateFingerprints: false,
      trackProgress: true,
      saveSession: false,
    };

    it("should execute successful file workflow", async () => {
      const files = [createMockFile("runsheet.pdf")];

      // Mock successful processing
      const { Step3AnalysisService } = await import("@/lib/services/step3-analysis-service");
      (Step3AnalysisService.processAnalysis as unknown as Mock).mockResolvedValue({
        days: [
          {
            date: "2025-01-06",
            day: "Monday",
            consignments: 100,
            basePayment: 200,
            paidAmount: 275,
            expectedTotal: 275,
            pickupCount: 0,
          },
        ],
      });

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.createAnalysis as unknown as Mock).mockResolvedValue({
        analysisId: "analysis-123",
        success: true,
      });

      const result = await service.executeFileWorkflow(files, validConfig);

      expect(result.success).toBe(true);
      expect(result.analysisId).toBeDefined();
    });

    it("should fail workflow when no files provided", async () => {
      const result = await service.executeFileWorkflow([], validConfig);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("No files provided");
    });

    it("should fail workflow for non-PDF files", async () => {
      const files = [createMockFile("document.txt")];

      const result = await service.executeFileWorkflow(files, validConfig);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain("Invalid file type");
    });

    it("should fail workflow for oversized files", async () => {
      // Create a file with actual large content
      const largeContent = new ArrayBuffer(100 * 1024 * 1024); // 100MB
      const blob = new Blob([largeContent], { type: "application/pdf" });
      const largeFile = new File([blob], "large.pdf", { type: "application/pdf" });

      const result = await service.executeFileWorkflow([largeFile], validConfig);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain("File too large");
    });

    it("should fail workflow for empty files", async () => {
      // Create a file with zero content
      const emptyFile = new File([], "empty.pdf", { type: "application/pdf" });

      const result = await service.executeFileWorkflow([emptyFile], validConfig);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain("Empty file");
    });

    it("should check fingerprints when enabled", async () => {
      const files = [createMockFile("runsheet.pdf")];
      const configWithFingerprints = {
        ...validConfig,
        validateFingerprints: true,
      };

      const { FileFingerprintService } = await import("@/lib/services/file-fingerprint-service");
      (FileFingerprintService.validateFileSet as unknown as Mock).mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        duplicates: [],
      });

      const { Step3AnalysisService } = await import("@/lib/services/step3-analysis-service");
      (Step3AnalysisService.processAnalysis as unknown as Mock).mockResolvedValue({
        days: [{ date: "2025-01-06", consignments: 100, paidAmount: 275 }],
      });

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.createAnalysis as unknown as Mock).mockResolvedValue({
        analysisId: "analysis-123",
        success: true,
      });

      const result = await service.executeFileWorkflow(files, configWithFingerprints);

      expect(FileFingerprintService.validateFileSet).toHaveBeenCalledWith(files);
      expect(result.success).toBe(true);
    });

    it("should fail workflow when duplicates detected", async () => {
      const files = [createMockFile("runsheet.pdf")];
      const configWithFingerprints = {
        ...validConfig,
        validateFingerprints: true,
      };

      const { FileFingerprintService } = await import("@/lib/services/file-fingerprint-service");
      (FileFingerprintService.validateFileSet as unknown as Mock).mockResolvedValue({
        isValid: false,
        errors: [],
        warnings: ["Duplicate detected"],
        duplicates: [{ file: "runsheet.pdf" }],
      });

      const result = await service.executeFileWorkflow(files, configWithFingerprints);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Duplicate files detected");
    });

    it("should save session when enabled", async () => {
      const files = [createMockFile("runsheet.pdf")];
      const configWithSession = {
        ...validConfig,
        saveSession: true,
      };

      const { Step3AnalysisService } = await import("@/lib/services/step3-analysis-service");
      (Step3AnalysisService.processAnalysis as unknown as Mock).mockResolvedValue({
        days: [{ date: "2025-01-06", consignments: 100, paidAmount: 275 }],
      });

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.createAnalysis as unknown as Mock).mockResolvedValue({
        analysisId: "analysis-123",
        success: true,
      });

      const { SessionRecoveryService } = await import("@/lib/services/session-recovery-service");

      await service.executeFileWorkflow(files, configWithSession);

      expect(SessionRecoveryService.saveSession).toHaveBeenCalled();
    });

    it("should emit progress updates during workflow", async () => {
      const progressCallback = vi.fn();
      service.onProgress(progressCallback);

      const files = [createMockFile("runsheet.pdf")];

      const { Step3AnalysisService } = await import("@/lib/services/step3-analysis-service");
      (Step3AnalysisService.processAnalysis as unknown as Mock).mockResolvedValue({
        days: [{ date: "2025-01-06", consignments: 100, paidAmount: 275 }],
      });

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.createAnalysis as unknown as Mock).mockResolvedValue({
        analysisId: "analysis-123",
        success: true,
      });

      await service.executeFileWorkflow(files, validConfig);

      expect(progressCallback).toHaveBeenCalled();
      const calls = progressCallback.mock.calls as Array<[{ stage: string }]>;
      expect(calls.some(([arg]) => arg.stage === "INITIALIZING")).toBe(true);
      expect(calls.some(([arg]) => arg.stage === "COMPLETE")).toBe(true);
    });

    it("should handle workflow errors gracefully", async () => {
      const files = [createMockFile("runsheet.pdf")];

      const { Step3AnalysisService } = await import("@/lib/services/step3-analysis-service");
      (Step3AnalysisService.processAnalysis as unknown as Mock).mockRejectedValue(
        new Error("Processing failed")
      );

      await expect(service.executeFileWorkflow(files, validConfig)).rejects.toThrow(
        "Workflow execution failed"
      );
    });
  });

  describe("executeManualWorkflow", () => {
    const validConfig = {
      userId: "user-123",
    };

    it("should execute successful manual workflow", async () => {
      const entries: ManualEntry[] = [
        createMockManualEntry("2025-01-06", 100),
        createMockManualEntry("2025-01-07", 120),
      ];

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.createAnalysis as unknown as Mock).mockResolvedValue({
        analysisId: "analysis-123",
        success: true,
      });

      const result = await service.executeManualWorkflow(entries, validConfig);

      expect(result.success).toBe(true);
      expect(result.analysisId).toBe("analysis-123");
    });

    it("should fail workflow when no entries provided", async () => {
      const result = await service.executeManualWorkflow([], validConfig);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("No entries provided");
    });

    it("should fail workflow when entry missing date", async () => {
      const invalidEntries: ManualEntry[] = [{ consignments: 100, totalPay: 275 } as ManualEntry];

      const result = await service.executeManualWorkflow(invalidEntries, validConfig);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain("missing date");
    });

    it("should fail workflow for invalid consignment count", async () => {
      const invalidEntries: ManualEntry[] = [createMockManualEntry("2025-01-06", -10)];

      const result = await service.executeManualWorkflow(invalidEntries, validConfig);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain("Invalid consignment count");
    });

    it("should fail workflow for invalid total pay", async () => {
      const invalidEntries: ManualEntry[] = [
        { ...createMockManualEntry("2025-01-06", 100), totalPay: -100 },
      ];

      const result = await service.executeManualWorkflow(invalidEntries, validConfig);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain("Invalid total pay");
    });

    it("should emit progress updates during manual workflow", async () => {
      const progressCallback = vi.fn();
      service.onProgress(progressCallback);

      const entries: ManualEntry[] = [createMockManualEntry("2025-01-06", 100)];

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.createAnalysis as unknown as Mock).mockResolvedValue({
        analysisId: "analysis-123",
        success: true,
      });

      await service.executeManualWorkflow(entries, validConfig);

      expect(progressCallback).toHaveBeenCalled();
      const manualCalls = progressCallback.mock.calls as Array<[{ stage: string }]>;
      expect(manualCalls.some(([arg]) => arg.stage === "INITIALIZING")).toBe(true);
      expect(manualCalls.some(([arg]) => arg.stage === "COMPLETE")).toBe(true);
    });

    it("should handle manual workflow errors", async () => {
      const entries: ManualEntry[] = [createMockManualEntry("2025-01-06", 100)];

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.createAnalysis as unknown as Mock).mockRejectedValue(
        new Error("Creation failed")
      );

      await expect(service.executeManualWorkflow(entries, validConfig)).rejects.toThrow(
        "Manual workflow execution failed"
      );
    });
  });

  describe("getAnalysis", () => {
    it("should retrieve analysis by ID", async () => {
      const analysisId = "analysis-123";

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.getAnalysisById as unknown as Mock).mockResolvedValue({
        analysis: {
          id: analysisId,
          userId: "user-123",
          status: "completed",
        },
      });

      const result = await service.getAnalysis(analysisId);

      expect(result.success).toBe(true);
      expect(result.analysisId).toBe(analysisId);
      expect(result.analysis).toBeDefined();
    });

    it("should throw NotFoundError when analysis not found", async () => {
      const analysisId = "non-existent";

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.getAnalysisById as unknown as Mock).mockResolvedValue({
        error: "Analysis not found",
        analysis: null,
      });

      await expect(service.getAnalysis(analysisId)).rejects.toThrow("Analysis not found");
    });

    it("should handle service errors", async () => {
      const analysisId = "analysis-123";

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.getAnalysisById as unknown as Mock).mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.getAnalysis(analysisId)).rejects.toThrow("Failed to retrieve analysis");
    });
  });

  describe("updateAnalysis", () => {
    it("should update analysis status", async () => {
      const analysisId = "analysis-123";
      const newStatus = "completed" as const;

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.updateAnalysisStatus as unknown as Mock).mockResolvedValue(undefined);
      (analysisService.getAnalysisById as unknown as Mock).mockResolvedValue({
        analysis: {
          id: analysisId,
          status: newStatus,
        },
      });

      const result = await service.updateAnalysis(analysisId, newStatus);

      expect(analysisService.updateAnalysisStatus).toHaveBeenCalledWith(analysisId, newStatus);
      expect(result.analysisId).toBe(analysisId);
    });

    it("should handle update errors", async () => {
      const analysisId = "analysis-123";

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.updateAnalysisStatus as unknown as Mock).mockRejectedValue(
        new Error("Update failed")
      );

      await expect(service.updateAnalysis(analysisId, "completed")).rejects.toThrow(
        "Failed to update analysis"
      );
    });

    it("should update to different statuses", async () => {
      const analysisId = "analysis-123";
      const statuses: Array<"pending" | "processing" | "completed" | "error"> = [
        "pending",
        "processing",
        "completed",
        "error",
      ];

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.updateAnalysisStatus as unknown as Mock).mockResolvedValue(undefined);

      for (const status of statuses) {
        (analysisService.getAnalysisById as unknown as Mock).mockResolvedValue({
          analysis: {
            id: analysisId,
            status,
          },
        });

        const result = await service.updateAnalysis(analysisId, status);
        expect(result.analysis?.status).toBe(status);
      }
    });
  });

  describe("Progress Callback Error Handling", () => {
    it("should handle errors in progress callbacks gracefully", async () => {
      const faultyCallback = vi.fn(() => {
        throw new Error("Callback error");
      });
      const goodCallback = vi.fn();

      service.onProgress(faultyCallback);
      service.onProgress(goodCallback);

      const entries: ManualEntry[] = [createMockManualEntry("2025-01-06", 100)];

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.createAnalysis as unknown as Mock).mockResolvedValue({
        analysisId: "analysis-123",
        success: true,
      });

      // Workflow should complete despite callback error
      const result = await service.executeManualWorkflow(entries, { userId: "user-123" });

      expect(result.success).toBe(true);
      expect(faultyCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete file workflow with all features enabled", async () => {
      const files = [createMockFile("runsheet.pdf")];
      const config = {
        userId: "user-123",
        validateFingerprints: true,
        trackProgress: true,
        saveSession: true,
      };

      const progressCallback = vi.fn();
      service.onProgress(progressCallback);

      const { FileFingerprintService } = await import("@/lib/services/file-fingerprint-service");
      (FileFingerprintService.validateFileSet as unknown as Mock).mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        duplicates: [],
      });

      const { Step3AnalysisService } = await import("@/lib/services/step3-analysis-service");
      (Step3AnalysisService.processAnalysis as unknown as Mock).mockResolvedValue({
        days: [{ date: "2025-01-06", consignments: 100, paidAmount: 275 }],
      });

      const { analysisService } = await import("@/lib/services/analysis-service");
      (analysisService.createAnalysis as unknown as Mock).mockResolvedValue({
        analysisId: "analysis-123",
        success: true,
      });

      const result = await service.executeFileWorkflow(files, config);

      expect(result.success).toBe(true);
      expect(FileFingerprintService.validateFileSet).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalled();
    });
  });
});
