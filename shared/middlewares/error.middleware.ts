/**
 * Error Handling Middleware
 * Centralized error handling with custom error classes and standardized responses
 * @module shared/middlewares/error.middleware
 */

import { NextResponse } from 'next/server';

/**
 * Error codes for consistent error identification
 */
export enum ErrorCode {
  // Authentication errors (1xxx)
  UNAUTHORIZED = 'AUTH_1001',
  TOKEN_EXPIRED = 'AUTH_1002',
  TOKEN_INVALID = 'AUTH_1003',
  SESSION_EXPIRED = 'AUTH_1004',
  INSUFFICIENT_PERMISSIONS = 'AUTH_1005',

  // Validation errors (2xxx)
  VALIDATION_ERROR = 'VAL_2001',
  INVALID_INPUT = 'VAL_2002',
  MISSING_FIELD = 'VAL_2003',
  INVALID_FORMAT = 'VAL_2004',
  VALUE_TOO_LONG = 'VAL_2005',
  VALUE_TOO_SHORT = 'VAL_2006',

  // Resource errors (3xxx)
  NOT_FOUND = 'RES_3001',
  ALREADY_EXISTS = 'RES_3002',
  CONFLICT = 'RES_3003',
  RESOURCE_DELETED = 'RES_3004',

  // User errors (4xxx)
  USER_NOT_FOUND = 'USR_4001',
  USER_BANNED = 'USR_4002',
  USER_NOT_VERIFIED = 'USR_4003',
  BLOCKED_BY_USER = 'USR_4004',
  CANNOT_PERFORM_ON_SELF = 'USR_4005',

  // Post errors (5xxx)
  POST_NOT_FOUND = 'PST_5001',
  POST_ACCESS_DENIED = 'PST_5002',
  POST_DELETED = 'PST_5003',

  // Chat errors (6xxx)
  CONVERSATION_NOT_FOUND = 'CHT_6001',
  MESSAGE_NOT_FOUND = 'CHT_6002',
  NOT_CONVERSATION_MEMBER = 'CHT_6003',

  // Rate limiting errors (7xxx)
  RATE_LIMIT_EXCEEDED = 'RTE_7001',
  TOO_MANY_REQUESTS = 'RTE_7002',

  // Server errors (9xxx)
  INTERNAL_ERROR = 'SRV_9001',
  DATABASE_ERROR = 'SRV_9002',
  EXTERNAL_SERVICE_ERROR = 'SRV_9003',
  FILE_UPLOAD_ERROR = 'SRV_9004',
  UNKNOWN_ERROR = 'SRV_9999',
}

/**
 * HTTP status code mapping for error codes
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.SESSION_EXPIRED]: 401,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,

  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,
  [ErrorCode.VALUE_TOO_LONG]: 400,
  [ErrorCode.VALUE_TOO_SHORT]: 400,

  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RESOURCE_DELETED]: 410,

  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.USER_BANNED]: 403,
  [ErrorCode.USER_NOT_VERIFIED]: 403,
  [ErrorCode.BLOCKED_BY_USER]: 403,
  [ErrorCode.CANNOT_PERFORM_ON_SELF]: 400,

  [ErrorCode.POST_NOT_FOUND]: 404,
  [ErrorCode.POST_ACCESS_DENIED]: 403,
  [ErrorCode.POST_DELETED]: 410,

  [ErrorCode.CONVERSATION_NOT_FOUND]: 404,
  [ErrorCode.MESSAGE_NOT_FOUND]: 404,
  [ErrorCode.NOT_CONVERSATION_MEMBER]: 403,

  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,

  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.FILE_UPLOAD_ERROR]: 500,
  [ErrorCode.UNKNOWN_ERROR]: 500,
};

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      statusCode?: number;
      isOperational?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, { cause: options?.cause });
    this.code = code;
    this.statusCode = options?.statusCode ?? ERROR_STATUS_MAP[code] ?? 500;
    this.isOperational = options?.isOperational ?? true;
    this.details = options?.details;
    this.timestamp = new Date();

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);

    // Set prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON(): ErrorResponse {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Success response interface
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * API response type
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Create a successful response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  error: AppError | Error | string,
  defaultCode: ErrorCode = ErrorCode.INTERNAL_ERROR
): NextResponse<ErrorResponse> {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new AppError(defaultCode, error.message, {
      isOperational: false,
      cause: error,
    });
  } else {
    appError = new AppError(defaultCode, error);
  }

  // Log error for debugging
  console.error(`[Error] ${appError.code}: ${appError.message}`, {
    stack: appError.stack,
    details: appError.details,
  });

  return NextResponse.json(appError.toJSON(), {
    status: appError.statusCode,
  });
}

/**
 * Specific error classes for common scenarios
 */

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(ErrorCode.UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(ErrorCode.INSUFFICIENT_PERMISSIONS, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(ErrorCode.NOT_FOUND, `${resource} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, { details });
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCode.CONFLICT, message);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded. Please try again later.', {
      details: retryAfter ? { retryAfter } : undefined,
    });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', cause?: Error) {
    super(ErrorCode.DATABASE_ERROR, message, {
      isOperational: false,
      cause,
    });
  }
}

/**
 * Error handler wrapper for API routes
 * Wraps route handlers with automatic error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ErrorResponse>> {
  return handler().catch((error: unknown) => {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    if (error instanceof Error) {
      return errorResponse(
        new AppError(ErrorCode.INTERNAL_ERROR, error.message, {
          isOperational: false,
          cause: error,
        })
      );
    }

    return errorResponse(
      new AppError(ErrorCode.UNKNOWN_ERROR, 'An unexpected error occurred')
    );
  });
}

/**
 * Async handler wrapper with error handling
 */
export function asyncHandler<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R | ErrorResponse> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(error);
      }

      if (error instanceof Error) {
        return errorResponse(
          new AppError(ErrorCode.INTERNAL_ERROR, error.message, {
            isOperational: false,
            cause: error,
          })
        );
      }

      return errorResponse(new AppError(ErrorCode.UNKNOWN_ERROR, 'Unknown error'));
    }
  };
}

/**
 * Check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format validation errors from Zod or similar libraries
 */
export function formatValidationErrors(
  errors: Array<{ path: (string | number)[]; message: string }>
): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const error of errors) {
    const field = error.path.join('.');
    if (!formatted[field]) {
      formatted[field] = [];
    }
    formatted[field].push(error.message);
  }

  return formatted;
}

export default {
  AppError,
  ErrorCode,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  successResponse,
  errorResponse,
  withErrorHandler,
  asyncHandler,
  isOperationalError,
  formatValidationErrors,
};
