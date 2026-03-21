/**
 * Error Handler Middleware
 *
 * Provides centralized error handling for the REST API Gateway.
 * Formats errors consistently and logs them appropriately.
 *
 * @module gateway/rest/middlewares/errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import httpContext from 'express-http-context';

// Error codes enumeration
export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  INVALID_PARAMETER = 'INVALID_PARAMETER',

  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  POST_NOT_FOUND = 'POST_NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  ALREADY_EXISTS = 'ALREADY_EXISTS',

  // Rate limiting errors (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Not implemented (501)
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',

  // Bad gateway (502)
  BAD_GATEWAY = 'BAD_GATEWAY',

  // Service unavailable (503)
  UNAVAILABLE = 'UNAVAILABLE',

  // Gateway timeout (504)
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT'
}

// HTTP status code mapping
const errorCodeToStatus: { [key: string]: number } = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_PARAMETER]: 400,
  [ErrorCode.INVALID_PARAMETER]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.MISSING_TOKEN]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.ACCOUNT_SUSPENDED]: 403,
  [ErrorCode.ACCESS_DENIED]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.POST_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.DUPLICATE_ENTRY]: 409,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.NOT_IMPLEMENTED]: 501,
  [ErrorCode.BAD_GATEWAY]: 502,
  [ErrorCode.UNAVAILABLE]: 503,
  [ErrorCode.GATEWAY_TIMEOUT]: 504
};

// Custom application error class
export class AppError extends Error {
  public readonly code: ErrorCode | string;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    details?: any,
    code?: ErrorCode | string,
    isOperational: boolean = true
  ) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code || ErrorCode.INTERNAL_ERROR;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  // Factory methods for common errors
  static notFound(resource: string = 'Resource'): AppError {
    return new AppError(`${resource} not found`, 404, undefined, ErrorCode.NOT_FOUND);
  }

  static unauthorized(message: string = 'Authentication required'): AppError {
    return new AppError(message, 401, undefined, ErrorCode.UNAUTHORIZED);
  }

  static forbidden(message: string = 'Access denied'): AppError {
    return new AppError(message, 403, undefined, ErrorCode.FORBIDDEN);
  }

  static badRequest(message: string, details?: any): AppError {
    return new AppError(message, 400, details, ErrorCode.VALIDATION_ERROR);
  }

  static conflict(message: string, details?: any): AppError {
    return new AppError(message, 409, details, ErrorCode.CONFLICT);
  }

  static rateLimited(retryAfter?: number): AppError {
    return new AppError(
      'Too many requests. Please try again later.',
      429,
      retryAfter ? { retryAfter } : undefined,
      ErrorCode.RATE_LIMIT_EXCEEDED
    );
  }

  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(message, 500, undefined, ErrorCode.INTERNAL_ERROR);
  }
}

// API Error response interface
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
    stack?: string;
  };
}

// Development vs Production error formatting
function formatError(error: Error, isDevelopment: boolean): ErrorResponse {
  const appError = error instanceof AppError ? error : null;

  const statusCode = appError?.statusCode || errorCodeToStatus[appError?.code as string] || 500;
  const errorCode = appError?.code || ErrorCode.INTERNAL_ERROR;

  const response: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: appError?.message || error.message || 'An unexpected error occurred',
      requestId: httpContext.get('requestId')
    }
  };

  // Add details if available
  if (appError?.details) {
    response.error.details = appError.details;
  }

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}

// Log error details
function logError(error: Error, req: Request): void {
  const requestId = httpContext.get('requestId');
  const userId = httpContext.get('userId');

  const logData = {
    requestId,
    userId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  };

  // Use different log levels based on error type
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      console.error('[ERROR]', JSON.stringify(logData, null, 2));
    } else if (error.statusCode >= 400) {
      console.warn('[WARN]', JSON.stringify({
        requestId,
        statusCode: error.statusCode,
        message: error.message
      }));
    }
  } else {
    console.error('[ERROR]', JSON.stringify(logData, null, 2));
  }
}

// Main error handler middleware
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logError(error, req);

  // Determine if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Format the error response
  const errorResponse = formatError(error, isDevelopment);

  // Determine status code
  const statusCode = error instanceof AppError
    ? error.statusCode
    : errorCodeToStatus[(error as any).code] || 500;

  // Set any additional headers
  if (error instanceof AppError && error.details?.retryAfter) {
    res.setHeader('Retry-After', error.details.retryAfter);
  }

  // Don't expose internal errors in production
  if (!isDevelopment && statusCode === 500 && !(error instanceof AppError)) {
    errorResponse.error.message = 'An unexpected error occurred';
    delete errorResponse.error.stack;
  }

  // Send the response
  res.status(statusCode).json(errorResponse);
}

// Async handler wrapper to catch async errors
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler for unmatched routes
export function notFoundHandler(req: Request, res: Response): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Cannot find ${req.method} ${req.path}`,
      requestId: httpContext.get('requestId')
    }
  };

  res.status(404).json(response);
}

// Error type guards
export function isAppError(error: Error): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

export default errorHandler;
