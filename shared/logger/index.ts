/**
 * Logger System
 * Centralized logging with Winston-compatible configuration
 * @module shared/logger
 */

import { LogLevel, logError } from '../middlewares/logging.middleware';

export * from './winston-config';
export * from './log-formatters';
export * from './log-transporters';
export * from './request-logger';
export * from './error-logger';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Service name for log identification */
  service: string;
  /** Environment (development, production, test) */
  environment: string;
  /** Minimum log level */
  level: LogLevel;
  /** Whether to include timestamps */
  timestamp: boolean;
  /** Whether to include stack traces */
  stackTrace: boolean;
  /** Whether to colorize output */
  colorize: boolean;
  /** Whether to pretty print JSON */
  prettyPrint: boolean;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Timestamp in ISO format */
  timestamp: string;
  /** Service name */
  service: string;
  /** Environment */
  environment: string;
  /** Request ID if applicable */
  requestId?: string;
  /** User ID if applicable */
  userId?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Logger instance interface
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
  child(meta: Record<string, unknown>): Logger;
}

/**
 * Create a new logger instance
 */
export function createLogger(config: Partial<LoggerConfig> = {}): Logger {
  const defaultConfig: LoggerConfig = {
    service: process.env.SERVICE_NAME || 'facebook-clone',
    environment: process.env.NODE_ENV || 'development',
    level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
    timestamp: true,
    stackTrace: true,
    colorize: process.env.NODE_ENV !== 'production',
    prettyPrint: process.env.NODE_ENV !== 'production',
  };

  const mergedConfig = { ...defaultConfig, ...config };

  // Store for child logger metadata
  let baseMeta: Record<string, unknown> = {};

  const formatEntry = (
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>
  ): LogEntry => {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: mergedConfig.service,
      environment: mergedConfig.environment,
      ...baseMeta,
      ...meta,
    };
  };

  const output = (entry: LogEntry): void => {
    const levelPriority = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    };

    if (levelPriority[entry.level] < levelPriority[mergedConfig.level]) {
      return;
    }

    const outputString = mergedConfig.prettyPrint
      ? JSON.stringify(entry, null, 2)
      : JSON.stringify(entry);

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(mergedConfig.colorize ? `\x1b[31m${outputString}\x1b[0m` : outputString);
        break;
      case LogLevel.WARN:
        console.warn(mergedConfig.colorize ? `\x1b[33m${outputString}\x1b[0m` : outputString);
        break;
      case LogLevel.DEBUG:
        console.debug(mergedConfig.colorize ? `\x1b[36m${outputString}\x1b[0m` : outputString);
        break;
      default:
        console.log(mergedConfig.colorize ? `\x1b[32m${outputString}\x1b[0m` : outputString);
    }
  };

  return {
    debug(message: string, meta?: Record<string, unknown>): void {
      output(formatEntry(LogLevel.DEBUG, message, meta));
    },

    info(message: string, meta?: Record<string, unknown>): void {
      output(formatEntry(LogLevel.INFO, message, meta));
    },

    warn(message: string, meta?: Record<string, unknown>): void {
      output(formatEntry(LogLevel.WARN, message, meta));
    },

    error(message: string, meta?: Record<string, unknown>): void {
      output(formatEntry(LogLevel.ERROR, message, meta));
    },

    log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
      output(formatEntry(level, message, meta));
    },

    child(meta: Record<string, unknown>): Logger {
      const childLogger = createLogger(mergedConfig);
      // Merge parent metadata with child metadata
      childLogger['baseMeta'] = { ...baseMeta, ...meta };
      return childLogger;
    },
  } as Logger;
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Create a child logger with persistent metadata
 */
export function getChildLogger(meta: Record<string, unknown>): Logger {
  return logger.child(meta);
}

export default {
  createLogger,
  logger,
  getChildLogger,
  LogLevel,
};
