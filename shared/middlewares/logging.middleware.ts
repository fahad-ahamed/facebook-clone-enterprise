/**
 * Logging Middleware
 * Request/response logging with performance tracking
 * @module shared/middlewares/logging.middleware
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Request log entry
 */
export interface RequestLogEntry {
  // Request info
  requestId: string;
  method: string;
  url: string;
  path: string;
  query: Record<string, string>;
  userAgent?: string;
  ip?: string;
  userId?: string;

  // Response info
  statusCode: number;
  responseTime: number;

  // Metadata
  timestamp: string;
  level: LogLevel;
  message: string;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Minimum log level to record */
  minLevel: LogLevel;
  /** Whether to log request body */
  logBody: boolean;
  /** Whether to log request headers */
  logHeaders: boolean;
  /** Whether to log response body */
  logResponseBody: boolean;
  /** Fields to mask in logs */
  sensitiveFields: string[];
  /** Paths to skip logging */
  skipPaths: string[];
  /** Slow request threshold in ms */
  slowRequestThreshold: number;
}

/**
 * Default logging configuration
 */
const defaultConfig: LoggingConfig = {
  minLevel: LogLevel.INFO,
  logBody: false,
  logHeaders: false,
  logResponseBody: false,
  sensitiveFields: [
    'password',
    'token',
    'authorization',
    'apiKey',
    'api_key',
    'secret',
    'creditCard',
    'credit_card',
    'ssn',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
  ],
  skipPaths: ['/api/health', '/favicon.ico', '/_next/', '/static/'],
  slowRequestThreshold: 1000, // 1 second
};

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Cloudflare specific
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  return undefined;
}

/**
 * Mask sensitive data in object
 */
function maskSensitiveData(
  data: unknown,
  sensitiveFields: string[]
): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item, sensitiveFields));
  }

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some((field) =>
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      masked[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value, sensitiveFields);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Get log level based on status code
 */
function getLogLevel(statusCode: number): LogLevel {
  if (statusCode >= 500) return LogLevel.ERROR;
  if (statusCode >= 400) return LogLevel.WARN;
  return LogLevel.INFO;
}

/**
 * Console logger implementation
 */
class ConsoleLogger {
  private config: LoggingConfig;

  constructor(config: LoggingConfig) {
    this.config = config;
  }

  log(entry: RequestLogEntry): void {
    const levelPriority = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    };

    if (levelPriority[entry.level] < levelPriority[this.config.minLevel]) {
      return;
    }

    const logData = JSON.stringify(entry, null, 2);

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(`\x1b[31m[ERROR]\x1b[0m ${logData}`);
        break;
      case LogLevel.WARN:
        console.warn(`\x1b[33m[WARN]\x1b[0m ${logData}`);
        break;
      case LogLevel.DEBUG:
        console.debug(`\x1b[36m[DEBUG]\x1b[0m ${logData}`);
        break;
      default:
        console.log(`\x1b[32m[INFO]\x1b[0m ${logData}`);
    }
  }
}

/**
 * Request logger instance
 */
let loggerInstance: ConsoleLogger | null = null;

/**
 * Get or create logger instance
 */
function getLogger(config: LoggingConfig): ConsoleLogger {
  if (!loggerInstance) {
    loggerInstance = new ConsoleLogger(config);
  }
  return loggerInstance;
}

/**
 * Logging middleware
 */
export function loggingMiddleware(config: Partial<LoggingConfig> = {}) {
  const mergedConfig: LoggingConfig = { ...defaultConfig, ...config };

  return async function (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const path = request.nextUrl.pathname;

    // Skip logging for certain paths
    if (mergedConfig.skipPaths.some((skipPath) => path.startsWith(skipPath))) {
      return handler(request);
    }

    // Extract request info
    const userId = request.headers.get('x-user-id') || undefined;
    const query: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // Log request start
    const logger = getLogger(mergedConfig);
    const requestStartEntry: Partial<RequestLogEntry> = {
      requestId,
      method: request.method,
      url: request.url,
      path,
      query: maskSensitiveData(query, mergedConfig.sensitiveFields) as Record<string, string>,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: getClientIp(request),
      userId,
      timestamp: new Date().toISOString(),
    };

    logger.log({
      ...requestStartEntry,
      level: LogLevel.DEBUG,
      statusCode: 0,
      responseTime: 0,
      message: `Request started: ${request.method} ${path}`,
    } as RequestLogEntry);

    // Process request
    let response: NextResponse;
    let error: Error | undefined;

    try {
      response = await handler(request);
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      response = NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const level = getLogLevel(response.status);

    // Check for slow requests
    const isSlow = responseTime > mergedConfig.slowRequestThreshold;

    // Create log entry
    const logEntry: RequestLogEntry = {
      requestId,
      method: request.method,
      url: request.url,
      path,
      query: maskSensitiveData(query, mergedConfig.sensitiveFields) as Record<string, string>,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: getClientIp(request),
      userId,
      statusCode: response.status,
      responseTime,
      timestamp: new Date().toISOString(),
      level: isSlow ? LogLevel.WARN : level,
      message: isSlow
        ? `Slow request: ${request.method} ${path} took ${formatDuration(responseTime)}`
        : `Request completed: ${request.method} ${path} - ${response.status} in ${formatDuration(responseTime)}`,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    logger.log(logEntry);

    // Add request ID to response headers
    response.headers.set('x-request-id', requestId);
    response.headers.set('x-response-time', `${responseTime}ms`);

    return response;
  };
}

/**
 * Simple request logger for non-middleware usage
 */
export function logRequest(
  request: NextRequest,
  response: NextResponse,
  duration: number
): void {
  const entry: RequestLogEntry = {
    requestId: generateRequestId(),
    method: request.method,
    url: request.url,
    path: request.nextUrl.pathname,
    query: Object.fromEntries(request.nextUrl.searchParams),
    statusCode: response.status,
    responseTime: duration,
    timestamp: new Date().toISOString(),
    level: getLogLevel(response.status),
    message: `${request.method} ${request.nextUrl.pathname} - ${response.status}`,
  };

  getLogger(defaultConfig).log(entry);
}

/**
 * Log error with context
 */
export function logError(
  error: Error,
  context: {
    request?: NextRequest;
    userId?: string;
    additionalData?: Record<string, unknown>;
  } = {}
): void {
  const entry: RequestLogEntry = {
    requestId: generateRequestId(),
    method: context.request?.method || 'UNKNOWN',
    url: context.request?.url || 'UNKNOWN',
    path: context.request?.nextUrl.pathname || 'UNKNOWN',
    query: context.request
      ? Object.fromEntries(context.request.nextUrl.searchParams)
      : {},
    userId: context.userId,
    statusCode: 500,
    responseTime: 0,
    timestamp: new Date().toISOString(),
    level: LogLevel.ERROR,
    message: error.message,
    error: {
      message: error.message,
      stack: error.stack,
    },
  };

  getLogger(defaultConfig).log(entry);
}

export default {
  loggingMiddleware,
  logRequest,
  logError,
  LogLevel,
};
