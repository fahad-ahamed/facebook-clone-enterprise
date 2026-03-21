/**
 * Error Logger
 * Specialized error logging and tracking
 * @module shared/logger/error-logger
 */

import { NextRequest } from 'next/server';
import { LogLevel } from '../middlewares/logging.middleware';
import { LogInfo, prettyFormatter, jsonFormatter } from './log-formatters';
import { ConsoleTransport, FileTransport } from './log-transporters';

/**
 * Error context
 */
export interface ErrorContext {
  /** Request ID */
  requestId?: string;
  /** User ID */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Request path */
  path?: string;
  /** HTTP method */
  method?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Original request */
  request?: NextRequest;
  /** Stack trace */
  stack?: string;
  /** Error code */
  code?: string;
  /** Error category */
  category?: ErrorCategory;
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  /** Application errors */
  APPLICATION = 'application',
  /** Database errors */
  DATABASE = 'database',
  /** Network errors */
  NETWORK = 'network',
  /** Authentication errors */
  AUTHENTICATION = 'authentication',
  /** Authorization errors */
  AUTHORIZATION = 'authorization',
  /** Validation errors */
  VALIDATION = 'validation',
  /** External service errors */
  EXTERNAL = 'external',
  /** Rate limiting errors */
  RATE_LIMIT = 'rate_limit',
  /** Unknown errors */
  UNKNOWN = 'unknown',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  /** Low - can be handled gracefully */
  LOW = 'low',
  /** Medium - affects functionality but recoverable */
  MEDIUM = 'medium',
  /** High - major functionality impacted */
  HIGH = 'high',
  /** Critical - system unstable */
  CRITICAL = 'critical',
}

/**
 * Logged error entry
 */
export interface LoggedError {
  /** Unique error ID */
  errorId: string;
  /** Error message */
  message: string;
  /** Error name/type */
  name: string;
  /** Stack trace */
  stack?: string;
  /** Error category */
  category: ErrorCategory;
  /** Error severity */
  severity: ErrorSeverity;
  /** Error code */
  code?: string;
  /** Context when error occurred */
  context: ErrorContext;
  /** Timestamp */
  timestamp: string;
  /** Whether error was handled */
  handled: boolean;
  /** Retry count if applicable */
  retryCount?: number;
}

/**
 * Error logger configuration
 */
export interface ErrorLoggerConfig {
  /** Whether to include stack traces */
  includeStackTrace: boolean;
  /** Maximum stack trace lines */
  maxStackTraceLines: number;
  /** Whether to log to file */
  logToFile: boolean;
  /** Error log file path */
  errorLogFile: string;
  /** Whether to track error frequencies */
  trackFrequencies: true;
  /** Maximum similar errors to log */
  maxSimilarErrors: number;
  /** Whether to send alerts for critical errors */
  enableAlerts: boolean;
  /** Webhook URL for alerts */
  alertWebhookUrl?: string;
}

/**
 * Default error logger configuration
 */
const defaultConfig: ErrorLoggerConfig = {
  includeStackTrace: true,
  maxStackTraceLines: 50,
  logToFile: process.env.NODE_ENV === 'production',
  errorLogFile: 'logs/errors.log',
  trackFrequencies: true,
  maxSimilarErrors: 10,
  enableAlerts: process.env.NODE_ENV === 'production',
  alertWebhookUrl: process.env.ERROR_ALERT_WEBHOOK_URL,
};

/**
 * Error tracker for frequency analysis
 */
class ErrorTracker {
  private errorCounts: Map<string, { count: number; lastOccurrence: number }> =
    new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old entries every hour
    this.cleanupInterval = setInterval(() => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      for (const [key, value] of this.errorCounts.entries()) {
        if (value.lastOccurrence < oneHourAgo) {
          this.errorCounts.delete(key);
        }
      }
    }, 60 * 60 * 1000);
  }

  track(errorKey: string): number {
    const existing = this.errorCounts.get(errorKey);
    const count = (existing?.count || 0) + 1;
    this.errorCounts.set(errorKey, {
      count,
      lastOccurrence: Date.now(),
    });
    return count;
  }

  getCount(errorKey: string): number {
    return this.errorCounts.get(errorKey)?.count || 0;
  }

  cleanup(): void {
    clearInterval(this.cleanupInterval);
    this.errorCounts.clear();
  }
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate error key for deduplication
 */
function generateErrorKey(error: Error): string {
  const stackLines = error.stack?.split('\n').slice(0, 3).join('\n') || '';
  return `${error.name}:${error.message}:${stackLines}`;
}

/**
 * Truncate stack trace
 */
function truncateStackTrace(
  stack: string | undefined,
  maxLines: number
): string | undefined {
  if (!stack) return undefined;
  const lines = stack.split('\n');
  if (lines.length <= maxLines) return stack;
  return lines.slice(0, maxLines).join('\n') + '\n...[TRUNCATED]';
}

/**
 * Determine error category from error
 */
function categorizeError(error: Error): ErrorCategory {
  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();

  if (name.includes('auth') || message.includes('unauthorized')) {
    return ErrorCategory.AUTHENTICATION;
  }
  if (name.includes('forbidden') || message.includes('permission')) {
    return ErrorCategory.AUTHORIZATION;
  }
  if (name.includes('validation') || name.includes('invalid')) {
    return ErrorCategory.VALIDATION;
  }
  if (name.includes('database') || name.includes('prisma') || name.includes('sql')) {
    return ErrorCategory.DATABASE;
  }
  if (name.includes('network') || name.includes('timeout') || name.includes('econn')) {
    return ErrorCategory.NETWORK;
  }
  if (name.includes('rate') || message.includes('too many')) {
    return ErrorCategory.RATE_LIMIT;
  }
  if (name.includes('external') || name.includes('api')) {
    return ErrorCategory.EXTERNAL;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Determine error severity
 */
function determineSeverity(
  error: Error,
  category: ErrorCategory
): ErrorSeverity {
  // Critical errors
  if (
    error.message.includes('FATAL') ||
    error.message.includes('Critical') ||
    category === ErrorCategory.DATABASE
  ) {
    return ErrorSeverity.CRITICAL;
  }

  // High severity
  if (
    category === ErrorCategory.AUTHENTICATION ||
    category === ErrorCategory.EXTERNAL
  ) {
    return ErrorSeverity.HIGH;
  }

  // Medium severity
  if (
    category === ErrorCategory.AUTHORIZATION ||
    category === ErrorCategory.RATE_LIMIT
  ) {
    return ErrorSeverity.MEDIUM;
  }

  // Default low severity
  return ErrorSeverity.LOW;
}

/**
 * Error logger class
 */
export class ErrorLogger {
  private config: ErrorLoggerConfig;
  private consoleTransport: ConsoleTransport;
  private fileTransport: FileTransport | null = null;
  private tracker: ErrorTracker;

  constructor(config: Partial<ErrorLoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.consoleTransport = new ConsoleTransport();
    this.tracker = new ErrorTracker();

    if (this.config.logToFile) {
      this.fileTransport = new FileTransport({
        filename: this.config.errorLogFile,
      });
    }
  }

  /**
   * Log an error
   */
  log(error: Error, context: ErrorContext = {}): LoggedError {
    const errorKey = generateErrorKey(error);
    const frequency = this.tracker.track(errorKey);
    const category = categorizeError(error);
    const severity = determineSeverity(error, category);

    const loggedError: LoggedError = {
      errorId: generateErrorId(),
      message: error.message,
      name: error.name,
      stack: this.config.includeStackTrace
        ? truncateStackTrace(error.stack, this.config.maxStackTraceLines)
        : undefined,
      category,
      severity,
      code: context.code,
      context,
      timestamp: new Date().toISOString(),
      handled: true,
    };

    // Create log entry
    const logInfo: LogInfo = {
      level: severity === ErrorSeverity.CRITICAL ? LogLevel.ERROR : LogLevel.WARN,
      message: `[${loggedError.errorId}] ${error.name}: ${error.message}`,
      timestamp: loggedError.timestamp,
      type: 'error',
      errorId: loggedError.errorId,
      category,
      severity,
      frequency,
      ...context,
      stack: loggedError.stack,
    };

    // Log to console
    this.consoleTransport.log(logInfo);

    // Log to file if enabled
    if (this.fileTransport) {
      this.fileTransport.log(logInfo);
    }

    // Send alert for critical errors
    if (this.config.enableAlerts && severity === ErrorSeverity.CRITICAL) {
      this.sendAlert(loggedError, frequency);
    }

    return loggedError;
  }

  /**
   * Log unhandled error
   */
  logUnhandled(error: Error, context: ErrorContext = {}): LoggedError {
    const loggedError = this.log(error, {
      ...context,
      metadata: {
        ...context.metadata,
        handled: false,
      },
    });

    loggedError.handled = false;
    return loggedError;
  }

  /**
   * Log async error with context
   */
  async logAsync(
    error: Error,
    context: ErrorContext = {}
  ): Promise<LoggedError> {
    return this.log(error, context);
  }

  /**
   * Create error with context
   */
  createContextualError(
    message: string,
    context: ErrorContext,
    originalError?: Error
  ): Error {
    const error = new Error(message);
    if (originalError) {
      error.stack = `${error.stack}\n\nCaused by:\n${originalError.stack}`;
    }
    return error;
  }

  /**
   * Send alert for critical errors
   */
  private async sendAlert(error: LoggedError, frequency: number): Promise<void> {
    if (!this.config.alertWebhookUrl) return;

    try {
      await fetch(this.config.alertWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error,
          frequency,
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Failed to send error alert:', err);
    }
  }

  /**
   * Get error frequency
   */
  getErrorFrequency(error: Error): number {
    return this.tracker.getCount(generateErrorKey(error));
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.tracker.cleanup();
    if (this.fileTransport) {
      this.fileTransport.close();
    }
  }
}

/**
 * Global error logger instance
 */
let globalErrorLogger: ErrorLogger | null = null;

/**
 * Get or create global error logger
 */
function getErrorLogger(): ErrorLogger {
  if (!globalErrorLogger) {
    globalErrorLogger = new ErrorLogger();
  }
  return globalErrorLogger;
}

/**
 * Log error to global logger
 */
export function logError(
  error: Error,
  context: ErrorContext = {}
): LoggedError {
  return getErrorLogger().log(error, context);
}

/**
 * Log unhandled error
 */
export function logUnhandledError(
  error: Error,
  context: ErrorContext = {}
): LoggedError {
  return getErrorLogger().logUnhandled(error, context);
}

/**
 * Create error logger with custom config
 */
export function createErrorLogger(
  config: Partial<ErrorLoggerConfig> = {}
): ErrorLogger {
  return new ErrorLogger(config);
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logUnhandledError(error, {
      category: ErrorCategory.APPLICATION,
    });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logUnhandledError(error, {
      category: ErrorCategory.APPLICATION,
    });
  });
}

export default {
  ErrorLogger,
  createErrorLogger,
  logError,
  logUnhandledError,
  setupGlobalErrorHandlers,
  ErrorCategory,
  ErrorSeverity,
};
