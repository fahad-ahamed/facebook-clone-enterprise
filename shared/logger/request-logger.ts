/**
 * Request Logger
 * HTTP request/response logging utilities
 * @module shared/logger/request-logger
 */

import { NextRequest, NextResponse } from 'next/server';
import { LogLevel } from '../middlewares/logging.middleware';
import { LogInfo, jsonFormatter } from './log-formatters';
import { ConsoleTransport } from './log-transporters';

/**
 * Request log data
 */
export interface RequestLogData {
  /** Request ID */
  requestId: string;
  /** HTTP method */
  method: string;
  /** Request URL */
  url: string;
  /** Request path */
  path: string;
  /** Query parameters */
  query: Record<string, string>;
  /** Request headers */
  headers: Record<string, string>;
  /** Request body (if captured) */
  body?: unknown;
  /** User agent */
  userAgent?: string;
  /** Client IP */
  ip?: string;
  /** User ID (if authenticated) */
  userId?: string;
}

/**
 * Response log data
 */
export interface ResponseLogData {
  /** Request ID */
  requestId: string;
  /** Response status code */
  statusCode: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body (if captured) */
  body?: unknown;
  /** Response time in milliseconds */
  responseTime: number;
}

/**
 * Request logger configuration
 */
export interface RequestLoggerConfig {
  /** Whether to log request bodies */
  logRequestBody: boolean;
  /** Whether to log response bodies */
  logResponseBody: boolean;
  /** Maximum body size to log */
  maxBodySize: number;
  /** Fields to mask in logs */
  sensitiveFields: string[];
  /** Paths to skip logging */
  skipPaths: string[];
  /** Headers to include in logs */
  includeHeaders: string[];
  /** Slow request threshold in ms */
  slowRequestThreshold: number;
  /** Minimum level for request logs */
  minLevel: LogLevel;
}

/**
 * Default request logger configuration
 */
const defaultConfig: RequestLoggerConfig = {
  logRequestBody: false,
  logResponseBody: false,
  maxBodySize: 1024, // 1KB
  sensitiveFields: [
    'password',
    'token',
    'authorization',
    'apiKey',
    'secret',
    'cookie',
    'session',
  ],
  skipPaths: ['/api/health', '/favicon.ico', '/_next/', '/static/'],
  includeHeaders: [
    'content-type',
    'user-agent',
    'x-request-id',
    'x-user-id',
    'x-forwarded-for',
  ],
  slowRequestThreshold: 1000, // 1 second
  minLevel: LogLevel.INFO,
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
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    undefined
  );
}

/**
 * Mask sensitive data
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
  for (const [key, value] of Object.entries(data)) {
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
 * Truncate body if too large
 */
function truncateBody(body: unknown, maxSize: number): unknown {
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  if (str.length > maxSize) {
    return str.substring(0, maxSize) + '...[TRUNCATED]';
  }
  return body;
}

/**
 * Request logger class
 */
export class RequestLogger {
  private config: RequestLoggerConfig;
  private transport: ConsoleTransport;

  constructor(config: Partial<RequestLoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.transport = new ConsoleTransport();
  }

  /**
   * Log incoming request
   */
  logRequest(request: NextRequest): string {
    const requestId =
      request.headers.get('x-request-id') || generateRequestId();
    const path = request.nextUrl.pathname;

    // Skip logging for certain paths
    if (this.config.skipPaths.some((skipPath) => path.startsWith(skipPath))) {
      return requestId;
    }

    const query: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const headers: Record<string, string> = {};
    this.config.includeHeaders.forEach((header) => {
      const value = request.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    });

    const logData: RequestLogData = {
      requestId,
      method: request.method,
      url: request.url,
      path,
      query: maskSensitiveData(query, this.config.sensitiveFields) as Record<string, string>,
      headers,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: getClientIp(request),
      userId: request.headers.get('x-user-id') || undefined,
    };

    const logInfo: LogInfo = {
      level: LogLevel.DEBUG,
      message: `Request started: ${request.method} ${path}`,
      timestamp: new Date().toISOString(),
      type: 'request',
      ...logData,
    };

    this.transport.log(logInfo);

    return requestId;
  }

  /**
   * Log outgoing response
   */
  logResponse(
    requestId: string,
    response: NextResponse,
    startTime: number
  ): void {
    const responseTime = Date.now() - startTime;
    const isSlow = responseTime > this.config.slowRequestThreshold;

    const logData: ResponseLogData = {
      requestId,
      statusCode: response.status,
      headers: Object.fromEntries(response.headers),
      responseTime,
    };

    const logInfo: LogInfo = {
      level: isSlow ? LogLevel.WARN : LogLevel.INFO,
      message: isSlow
        ? `Slow request: ${responseTime}ms`
        : `Request completed: ${response.status} in ${responseTime}ms`,
      timestamp: new Date().toISOString(),
      type: 'response',
      ...logData,
    };

    this.transport.log(logInfo);
  }

  /**
   * Log request error
   */
  logError(
    requestId: string,
    error: Error,
    startTime: number
  ): void {
    const responseTime = Date.now() - startTime;

    const logInfo: LogInfo = {
      level: LogLevel.ERROR,
      message: `Request failed: ${error.message}`,
      timestamp: new Date().toISOString(),
      type: 'error',
      requestId,
      responseTime,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    };

    this.transport.log(logInfo);
  }

  /**
   * Create a logged request handler wrapper
   */
  wrapHandler<T>(
    handler: (request: NextRequest) => Promise<NextResponse<T>>
  ): (request: NextRequest) => Promise<NextResponse<T>> {
    return async (request: NextRequest) => {
      const requestId = this.logRequest(request);
      const startTime = Date.now();

      try {
        const response = await handler(request);
        this.logResponse(requestId, response, startTime);
        
        // Add request ID to response
        response.headers.set('x-request-id', requestId);
        response.headers.set('x-response-time', `${Date.now() - startTime}ms`);
        
        return response;
      } catch (error) {
        this.logError(
          requestId,
          error instanceof Error ? error : new Error(String(error)),
          startTime
        );
        throw error;
      }
    };
  }
}

/**
 * Create request logger instance
 */
export function createRequestLogger(
  config: Partial<RequestLoggerConfig> = {}
): RequestLogger {
  return new RequestLogger(config);
}

/**
 * Default request logger instance
 */
export const requestLogger = createRequestLogger();

export default {
  RequestLogger,
  createRequestLogger,
  requestLogger,
};
