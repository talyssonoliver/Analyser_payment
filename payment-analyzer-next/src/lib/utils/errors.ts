/**
 * Centralized Error Handling System
 * Provides consistent error handling across the application
 */

import type { StringKeyObject } from '@/types/core';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true,
    public readonly context?: StringKeyObject
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

export const ErrorCodes = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  
  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',
  VALIDATION_INVALID_DATE: 'VALIDATION_INVALID_DATE',
  VALIDATION_INVALID_UUID: 'VALIDATION_INVALID_UUID',
  
  // Database errors
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  DATABASE_CONSTRAINT_VIOLATION: 'DATABASE_CONSTRAINT_VIOLATION',
  DATABASE_NOT_FOUND: 'DATABASE_NOT_FOUND',
  DATABASE_DUPLICATE_ENTRY: 'DATABASE_DUPLICATE_ENTRY',
  DATABASE_FOREIGN_KEY_VIOLATION: 'DATABASE_FOREIGN_KEY_VIOLATION',
  DATABASE_CHECK_VIOLATION: 'DATABASE_CHECK_VIOLATION',
  
  // File processing errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE: 'FILE_INVALID_TYPE',
  FILE_PROCESSING_FAILED: 'FILE_PROCESSING_FAILED',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  
  // Business logic errors
  ANALYSIS_DUPLICATE: 'ANALYSIS_DUPLICATE',
  ANALYSIS_INVALID_PERIOD: 'ANALYSIS_INVALID_PERIOD',
  ANALYSIS_NOT_FOUND: 'ANALYSIS_NOT_FOUND',
  PAYMENT_CALCULATION_ERROR: 'PAYMENT_CALCULATION_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Result pattern for better error handling
 */
export class Result<T, E = AppError> {
  private constructor(
    private readonly _success: boolean,
    private readonly _data?: T,
    private readonly _error?: E
  ) {}

  static success<T>(data: T): Result<T> {
    return new Result(true, data);
  }

  static failure<E = AppError>(error: E): Result<never, E> {
    return new Result<never, E>(false, undefined, error);
  }

  get isSuccess(): boolean {
    return this._success;
  }

  get isFailure(): boolean {
    return !this._success;
  }

  get data(): T {
    if (!this._success) {
      throw new Error('Cannot access data on failure result');
    }
    return this._data!;
  }

  get error(): E {
    if (this._success) {
      throw new Error('Cannot access error on success result');
    }
    return this._error!;
  }

  map<U>(fn: (data: T) => U): Result<U, E> {
    if (this._success) {
      try {
        return new Result<U, E>(true, fn(this._data!));
      } catch (error) {
        return new Result<U, E>(false, undefined, error as E);
      }
    }
    return new Result<U, E>(false, undefined, this._error);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (this._success) {
      return new Result<T, F>(true, this._data);
    }
    return new Result<T, F>(false, undefined, fn(this._error!));
  }

  flatMap<U>(fn: (data: T) => Result<U, E>): Result<U, E> {
    if (this._success) {
      return fn(this._data!);
    }
    return Result.failure(this._error!);
  }

  match<U>(
    onSuccess: (data: T) => U,
    onFailure: (error: E) => U
  ): U {
    if (this._success) {
      return onSuccess(this._data!);
    }
    return onFailure(this._error!);
  }
}

/**
 * Utility function to handle service errors consistently
 */
export function handleServiceError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(
      error.message,
      ErrorCodes.INTERNAL_ERROR,
      500,
      false,
      { originalError: error.message, stack: error.stack }
    );
  }
  
  return new AppError(
    'An unexpected error occurred',
    ErrorCodes.INTERNAL_ERROR,
    500,
    false,
    { originalError: String(error) }
  );
}

/**
 * Error tracking and monitoring
 */
export class ErrorTracker {
  static track(error: AppError, context?: StringKeyObject) {
    const errorData = {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      context: { ...error.context, ...context },
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Application Error:', errorData);
    }

    // In production, send to monitoring service (e.g., Sentry, DataDog)
    if (process.env.NODE_ENV === 'production') {
      // Integrate with monitoring service when available
      console.error('Production Error:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        timestamp: errorData.timestamp,
      });
    }
  }
}

/**
 * Validation helpers
 */
export class ValidationError extends AppError {
  constructor(message: string, field?: string, value?: unknown) {
    super(
      message,
      ErrorCodes.VALIDATION_INVALID_FORMAT,
      400,
      true,
      { field, value }
    );
  }
}

export function createValidationError(message: string, field?: string, value?: unknown): ValidationError {
  return new ValidationError(message, field, value);
}

/**
 * Database error helpers
 */
export function createDatabaseError(
  operation: string,
  originalError: unknown,
  code: ErrorCode = ErrorCodes.DATABASE_CONNECTION_ERROR
): AppError {
  const errorMessage = originalError instanceof Error
    ? originalError.message
    : String(originalError);

  return new AppError(
    `Database operation failed: ${operation}`,
    code,
    500,
    false,
    { operation, originalError: errorMessage }
  );
}

/**
 * Authentication error helpers
 */
export function createAuthError(message: string, code: ErrorCode = ErrorCodes.AUTH_UNAUTHORIZED): AppError {
  return new AppError(message, code, 401, true);
}