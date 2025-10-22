/**
 * Result Mock Helpers
 * Helpers to create proper Result instances for testing
 */

import { AppError, ErrorCodes, Result } from "@/lib/utils/errors";

export function createSuccessResult<T>(data: T): Result<T> {
  return Result.success(data);
}

export function createFailureResult(
  message: string,
  code: string = ErrorCodes.INTERNAL_ERROR
): Result<never> {
  const error = new AppError(message, code);
  return Result.failure(error);
}
