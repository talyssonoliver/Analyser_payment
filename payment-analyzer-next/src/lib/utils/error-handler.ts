/**
 * Unified Error Handling Middleware
 *
 * Provides consistent error handling across the application with:
 * - Error classification and categorization
 * - Error logging and tracking
 * - User-friendly error messages
 * - Error recovery strategies
 *
 * Phase 3: Service Layer Improvements
 */

import {
  AuthenticationError,
  NotFoundError,
  ServiceError,
  ValidationError,
} from "@/lib/interfaces/service-interfaces";

// ============================================================================
// Error Classification
// ============================================================================

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ErrorCategory {
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  NOT_FOUND = "not_found",
  NETWORK = "network",
  DATABASE = "database",
  FILE_PROCESSING = "file_processing",
  BUSINESS_LOGIC = "business_logic",
  UNKNOWN = "unknown",
}

export interface ErrorContext {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  route?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface ClassifiedError {
  originalError: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  code: string;
  context: ErrorContext;
  stack?: string;
  recoverable: boolean;
  retryable: boolean;
}

// ============================================================================
// Error Handler Class
// ============================================================================

// biome-ignore lint/complexity/noStaticOnlyClass: Intentional class-as-namespace for stable API surface
export class ErrorHandler {
  private static readonly errorListeners: ((error: ClassifiedError) => void)[] = [];

  /**
   * Register error listener for monitoring/logging
   */
  public static onError(listener: (error: ClassifiedError) => void): void {
    ErrorHandler.errorListeners.push(listener);
  }

  /**
   * Handle and classify error
   */
  public static handle(error: unknown, context?: Partial<ErrorContext>): ClassifiedError {
    const classified = ErrorHandler.classifyError(error, context);

    // Log error
    ErrorHandler.logError(classified);

    // Notify listeners
    ErrorHandler.notifyListeners(classified);

    return classified;
  }

  /**
   * Classify error into standardized format
   */
  private static classifyError(error: unknown, context?: Partial<ErrorContext>): ClassifiedError {
    const errorContext: ErrorContext = {
      timestamp: new Date(),
      userId: context?.userId,
      sessionId: context?.sessionId,
      route: context?.route,
      action: context?.action,
      metadata: context?.metadata,
    };

    // Handle ServiceError instances
    if (error instanceof ValidationError) {
      return {
        originalError: error,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: error.message,
        userMessage: ErrorHandler.getUserMessage(error),
        code: error.code,
        context: errorContext,
        stack: error.stack,
        recoverable: true,
        retryable: false,
      };
    }

    if (error instanceof AuthenticationError) {
      return {
        originalError: error,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        message: error.message,
        userMessage: "Authentication failed. Please sign in again.",
        code: error.code,
        context: errorContext,
        stack: error.stack,
        recoverable: true,
        retryable: false,
      };
    }

    if (error instanceof NotFoundError) {
      return {
        originalError: error,
        category: ErrorCategory.NOT_FOUND,
        severity: ErrorSeverity.MEDIUM,
        message: error.message,
        userMessage: "The requested resource was not found.",
        code: error.code,
        context: errorContext,
        stack: error.stack,
        recoverable: false,
        retryable: false,
      };
    }

    if (error instanceof ServiceError) {
      return {
        originalError: error,
        category: ErrorHandler.categorizeByCode(error.code),
        severity: ErrorHandler.determineSeverity(error),
        message: error.message,
        userMessage: ErrorHandler.getUserMessage(error),
        code: error.code,
        context: errorContext,
        stack: error.stack,
        recoverable: true,
        retryable: ErrorHandler.isRetryable(error),
      };
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      const networkError = error as Error;
      return {
        originalError: networkError,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        message: error.message,
        userMessage: "Network error. Please check your connection and try again.",
        code: "NETWORK_ERROR",
        context: errorContext,
        stack: error.stack,
        recoverable: true,
        retryable: true,
      };
    }

    // Handle generic Error
    if (error instanceof Error) {
      return {
        originalError: error,
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        message: error.message,
        userMessage: "An unexpected error occurred. Please try again.",
        code: "UNKNOWN_ERROR",
        context: errorContext,
        stack: error.stack,
        recoverable: true,
        retryable: true,
      };
    }

    // Handle unknown error types
    const unknownError = new Error(String(error));
    return {
      originalError: unknownError,
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: String(error),
      userMessage: "An unexpected error occurred. Please try again.",
      code: "UNKNOWN_ERROR",
      context: errorContext,
      recoverable: true,
      retryable: true,
    };
  }

  /**
   * Categorize error by error code
   */
  private static categorizeByCode(code: string): ErrorCategory {
    const codeMap: Record<string, ErrorCategory> = {
      VALIDATION_ERROR: ErrorCategory.VALIDATION,
      AUTH_ERROR: ErrorCategory.AUTHENTICATION,
      NOT_FOUND: ErrorCategory.NOT_FOUND,
      NETWORK_ERROR: ErrorCategory.NETWORK,
      DATABASE_ERROR: ErrorCategory.DATABASE,
      FILE_PROCESSING_ERROR: ErrorCategory.FILE_PROCESSING,
      WORKFLOW_ERROR: ErrorCategory.BUSINESS_LOGIC,
    };

    return codeMap[code] || ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  private static determineSeverity(error: ServiceError): ErrorSeverity {
    if (error instanceof AuthenticationError) return ErrorSeverity.HIGH;
    if (error instanceof ValidationError) return ErrorSeverity.LOW;
    if (error instanceof NotFoundError) return ErrorSeverity.MEDIUM;

    // Check error code for severity hints
    if (error.code.includes("CRITICAL")) return ErrorSeverity.CRITICAL;
    if (error.code.includes("AUTH")) return ErrorSeverity.HIGH;
    if (error.code.includes("VALIDATION")) return ErrorSeverity.LOW;

    return ErrorSeverity.MEDIUM;
  }

  /**
   * Get user-friendly error message
   */
  private static getUserMessage(error: ServiceError): string {
    const messageMap: Record<string, string> = {
      VALIDATION_ERROR: "Please check your input and try again.",
      AUTH_ERROR: "Authentication failed. Please sign in again.",
      NOT_FOUND: "The requested resource was not found.",
      NETWORK_ERROR: "Network error. Please check your connection.",
      DATABASE_ERROR: "Database error. Please try again later.",
      FILE_PROCESSING_ERROR: "Error processing file. Please check the file format.",
      WORKFLOW_ERROR: "Analysis workflow error. Please try again.",
    };

    return messageMap[error.code] || error.message;
  }

  /**
   * Check if error is retryable
   */
  private static isRetryable(error: ServiceError): boolean {
    const retryableCodes = ["NETWORK_ERROR", "DATABASE_ERROR", "TIMEOUT_ERROR"];

    return retryableCodes.includes(error.code);
  }

  /**
   * Log error with appropriate level
   */
  private static logError(error: ClassifiedError): void {
    const logData = {
      category: error.category,
      severity: error.severity,
      code: error.code,
      message: error.message,
      context: error.context,
      recoverable: error.recoverable,
      retryable: error.retryable,
    };

    // Log based on severity
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      console.error("🔴 ERROR:", logData, error.stack);
    } else if (error.severity === ErrorSeverity.MEDIUM) {
      console.warn("🟡 WARNING:", logData);
    } else if (error.severity === ErrorSeverity.LOW) {
      console.info("🔵 INFO:", logData);
    }
  }

  /**
   * Notify error listeners
   */
  private static notifyListeners(error: ClassifiedError): void {
    ErrorHandler.errorListeners.forEach((listener) => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error("Error in error listener:", listenerError);
      }
    });
  }

  /**
   * Handle async errors with automatic retry
   */
  public static async handleWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      context?: Partial<ErrorContext>;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, retryDelay = 1000, context } = options;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const classified = ErrorHandler.handle(error, context);

        // Don't retry if error is not retryable
        if (!classified.retryable || attempt === maxRetries) {
          throw error;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));

        console.log(`Retrying operation... Attempt ${attempt + 2}/${maxRetries + 1}`);
      }
    }

    throw lastError;
  }

  /**
   * Create error recovery strategy
   */
  public static createRecoveryStrategy(error: ClassifiedError): {
    canRecover: boolean;
    strategy: string;
    action: () => void | Promise<void>;
  } | null {
    if (!error.recoverable) {
      return null;
    }

    switch (error.category) {
      case ErrorCategory.AUTHENTICATION:
        return {
          canRecover: true,
          strategy: "redirect_to_login",
          action: async () => {
            // Redirect to login page
            if (typeof window !== "undefined") {
              window.location.href = "/auth/sign-in";
            }
          },
        };

      case ErrorCategory.VALIDATION:
        return {
          canRecover: true,
          strategy: "user_correction",
          action: () => {
            // User should correct input
          },
        };
      default:
        // Network errors and other recoverable errors use retry strategy
        return {
          canRecover: true,
          strategy: "retry",
          action: async () => {
            // Will be handled by retry logic
          },
        };
    }
  }
}

// ============================================================================
// Error Boundary Helpers
// ============================================================================

/**
 * Get fallback UI message based on error
 */
export function getErrorFallbackMessage(error: ClassifiedError): {
  title: string;
  message: string;
  action?: string;
} {
  switch (error.category) {
    case ErrorCategory.AUTHENTICATION:
      return {
        title: "Authentication Required",
        message: "Please sign in to continue.",
        action: "Sign In",
      };

    case ErrorCategory.NOT_FOUND:
      return {
        title: "Not Found",
        message: "The requested resource was not found.",
        action: "Go Back",
      };

    case ErrorCategory.NETWORK:
      return {
        title: "Connection Error",
        message: "Please check your internet connection and try again.",
        action: "Retry",
      };

    default:
      return {
        title: "Something went wrong",
        message: error.userMessage,
        action: error.retryable ? "Retry" : "Go Back",
      };
  }
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: unknown): string {
  const classified = ErrorHandler.handle(error);
  return classified.userMessage;
}

// ============================================================================
// Export singleton
// ============================================================================

export const errorHandler = ErrorHandler;
