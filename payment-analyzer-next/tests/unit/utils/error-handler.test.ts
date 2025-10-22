import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  NotFoundError,
  ServiceError,
  ValidationError,
} from "@/lib/interfaces/service-interfaces";
import {
  ErrorCategory,
  ErrorSeverity,
  errorHandler,
  formatErrorForDisplay,
} from "@/lib/utils/error-handler";

describe("utils/error-handler", () => {
  it("classifies ValidationError correctly", () => {
    const err = new ValidationError("Invalid input");
    const classified = errorHandler.handle(err, { route: "/api" });
    expect(classified.category).toBe(ErrorCategory.VALIDATION);
    expect(classified.severity).toBe(ErrorSeverity.LOW);
    expect(classified.userMessage).toMatch(/please check/i);
  });

  it("classifies AuthenticationError correctly", () => {
    const err = new AuthenticationError("Auth fail");
    const c = errorHandler.handle(err);
    expect(c.category).toBe(ErrorCategory.AUTHENTICATION);
    expect(c.severity).toBe(ErrorSeverity.HIGH);
  });

  it("classifies NotFoundError correctly", () => {
    const err = new NotFoundError("Missing");
    const c = errorHandler.handle(err);
    expect(c.category).toBe(ErrorCategory.NOT_FOUND);
    expect(c.severity).toBe(ErrorSeverity.MEDIUM);
  });

  it("falls back for generic Error and formats message", () => {
    const c = errorHandler.handle(new Error("boom"));
    expect(c.category).toBeDefined();
    expect(typeof formatErrorForDisplay(new Error("x"))).toBe("string");
  });

  it("handleWithRetry retries and succeeds", async () => {
    let attempt = 0;
    const result = await errorHandler.handleWithRetry(
      async () => {
        attempt++;
        if (attempt < 3) {
          // trigger network classification path
          throw new TypeError("fetch failed");
        }
        return "ok";
      },
      { maxRetries: 3, retryDelay: 1 }
    );
    expect(result).toBe("ok");
  });

  it("categorizes by ServiceError code", () => {
    const err = new ServiceError("DB error", "DATABASE_ERROR");
    const c = errorHandler.handle(err);
    expect(c.category).toBe(ErrorCategory.DATABASE);
  });
});
