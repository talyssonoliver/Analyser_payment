/**
 * ErrorBoundary Component
 *
 * React Error Boundary for graceful error handling and recovery.
 * Catches errors in component tree and displays fallback UI.
 *
 * Phase 3: Service Layer Improvements
 */

"use client";

import { AlertTriangle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  type ClassifiedError,
  ErrorHandler,
  getErrorFallbackMessage,
} from "@/lib/utils/error-handler";

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: ClassifiedError, reset: () => void) => ReactNode;
  onError?: (error: ClassifiedError, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: ClassifiedError | null;
  errorInfo: ErrorInfo | null;
}

// ============================================================================
// ErrorBoundary Component
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Classify and handle error
    const classified = ErrorHandler.handle(error, {
      action: "component_render",
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });

    this.setState({
      error: classified,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(classified, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Reload the page as a fallback
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  handleGoBack = (): void => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  handleGoHome = (): void => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI
      const fallbackData = getErrorFallbackMessage(this.state.error);

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-slate-900 text-center mb-4">
                {fallbackData.title}
              </h1>

              {/* Message */}
              <p className="text-lg text-slate-600 text-center mb-8">{fallbackData.message}</p>

              {/* Error Details (if enabled) */}
              {this.props.showDetails && (
                <div className="mb-8 bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Error Details</h3>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div>
                      <span className="font-medium">Category:</span>{" "}
                      <span className="font-mono bg-slate-200 px-2 py-1 rounded">
                        {this.state.error.category}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Code:</span>{" "}
                      <span className="font-mono bg-slate-200 px-2 py-1 rounded">
                        {this.state.error.code}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Message:</span>{" "}
                      <span className="text-slate-700">{this.state.error.message}</span>
                    </div>
                    {this.state.error.context.timestamp && (
                      <div>
                        <span className="font-medium">Time:</span>{" "}
                        <span className="text-slate-700">
                          {this.state.error.context.timestamp.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {this.state.error.retryable && (
                  <Button
                    onClick={this.handleReset}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {fallbackData.action || "Try Again"}
                  </Button>
                )}

                <Button onClick={this.handleGoBack} variant="outline" className="border-slate-300">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>

                <Button onClick={this.handleGoHome} variant="outline" className="border-slate-300">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Recovery Info */}
              {this.state.error.recoverable && (
                <p className="text-sm text-slate-500 text-center mt-6">
                  This error is recoverable. Your data has been preserved.
                </p>
              )}
            </div>

            {/* Stack Trace (development only) */}
            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="mt-4 bg-slate-900 text-slate-100 rounded-lg p-4">
                <summary className="cursor-pointer font-semibold mb-2">
                  Developer Details (Stack Trace)
                </summary>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap mt-4">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Specialized Error Boundaries
// ============================================================================

/**
 * Compact error boundary for inline use
 */
export function InlineErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Error</h4>
              <p className="text-sm text-red-700 mb-3">{error.userMessage}</p>
              {error.retryable && (
                <Button
                  size="sm"
                  onClick={reset}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary for async operations
 */
export function AsyncErrorBoundary({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void | Promise<void>;
}) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="flex flex-col items-center justify-center p-8">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{error.userMessage}</h3>
          {error.retryable && (
            <Button
              onClick={async () => {
                await onRetry?.();
                reset();
              }}
              className="mt-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
