/**
 * Log Formatters
 * Various log formatting utilities
 * @module shared/logger/log-formatters
 */

import { LogLevel } from '../middlewares/logging.middleware';

/**
 * Log info object
 */
export interface LogInfo {
  level: LogLevel;
  message: string;
  timestamp?: string;
  service?: string;
  environment?: string;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/**
 * Level colors mapping
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: COLORS.cyan,
  [LogLevel.INFO]: COLORS.green,
  [LogLevel.WARN]: COLORS.yellow,
  [LogLevel.ERROR]: COLORS.red,
};

/**
 * Format timestamp
 */
export function formatTimestamp(
  date: Date = new Date(),
  format: 'iso' | 'locale' | 'custom' = 'iso'
): string {
  switch (format) {
    case 'iso':
      return date.toISOString();
    case 'locale':
      return date.toLocaleString();
    case 'custom':
      return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    default:
      return date.toISOString();
  }
}

/**
 * Format level with optional color
 */
export function formatLevel(
  level: LogLevel,
  colorize: boolean = true
): string {
  const paddedLevel = level.toUpperCase().padEnd(5);
  if (colorize) {
    return `${LEVEL_COLORS[level]}${paddedLevel}${COLORS.reset}`;
  }
  return paddedLevel;
}

/**
 * JSON formatter
 * Outputs logs as JSON strings
 */
export function jsonFormatter(info: LogInfo): string {
  const entry = {
    level: info.level,
    message: info.message,
    timestamp: info.timestamp || new Date().toISOString(),
    ...Object.fromEntries(
      Object.entries(info).filter(
        ([key]) => !['level', 'message', 'timestamp'].includes(key)
      )
    ),
  };
  return JSON.stringify(entry);
}

/**
 * Simple formatter
 * Outputs logs in a simple readable format
 */
export function simpleFormatter(info: LogInfo, colorize: boolean = false): string {
  const timestamp = info.timestamp || formatTimestamp();
  const level = formatLevel(info.level, colorize);
  const meta = Object.entries(info)
    .filter(([key]) => !['level', 'message', 'timestamp'].includes(key))
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(' ');

  const metaStr = meta ? ` ${meta}` : '';
  return `[${timestamp}] ${level}: ${info.message}${metaStr}`;
}

/**
 * Pretty formatter
 * Outputs logs with indentation and colors
 */
export function prettyFormatter(info: LogInfo, colorize: boolean = true): string {
  const timestamp = info.timestamp || formatTimestamp();
  const level = formatLevel(info.level, colorize);
  
  const meta: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(info)) {
    if (!['level', 'message', 'timestamp'].includes(key)) {
      meta[key] = value;
    }
  }

  const metaStr = Object.keys(meta).length > 0
    ? `\n${JSON.stringify(meta, null, 2)}`
    : '';

  const dimTimestamp = colorize
    ? `${COLORS.dim}[${timestamp}]${COLORS.reset}`
    : `[${timestamp}]`;

  return `${dimTimestamp} ${level}: ${info.message}${metaStr}`;
}

/**
 * Detailed formatter
 * Outputs logs with all available information
 */
export function detailedFormatter(info: LogInfo, colorize: boolean = true): string {
  const lines: string[] = [];
  const timestamp = info.timestamp || formatTimestamp();
  const level = formatLevel(info.level, colorize);

  // Header line
  lines.push(`${'='.repeat(80)}`);
  lines.push(
    `[${timestamp}] ${level} ${info.service || 'app'} (${info.environment || 'local'})`
  );
  lines.push(`${'='.repeat(80)}`);

  // Message
  lines.push(`Message: ${info.message}`);

  // Metadata
  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(info)) {
    if (!['level', 'message', 'timestamp', 'service', 'environment'].includes(key)) {
      metadata[key] = value;
    }
  }

  if (Object.keys(metadata).length > 0) {
    lines.push('Metadata:');
    for (const [key, value] of Object.entries(metadata)) {
      const valueStr = typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : String(value);
      lines.push(`  ${key}: ${valueStr}`);
    }
  }

  return lines.join('\n');
}

/**
 * Create custom formatter with options
 */
export function createFormatter(options: {
  type: 'json' | 'simple' | 'pretty' | 'detailed';
  colorize?: boolean;
  timestampFormat?: 'iso' | 'locale' | 'custom';
}): (info: LogInfo) => string {
  const { type, colorize = false, timestampFormat = 'iso' } = options;

  return (info: LogInfo) => {
    const formattedInfo: LogInfo = {
      ...info,
      timestamp: formatTimestamp(
        info.timestamp ? new Date(info.timestamp) : new Date(),
        timestampFormat
      ),
    };

    switch (type) {
      case 'json':
        return jsonFormatter(formattedInfo);
      case 'simple':
        return simpleFormatter(formattedInfo, colorize);
      case 'pretty':
        return prettyFormatter(formattedInfo, colorize);
      case 'detailed':
        return detailedFormatter(formattedInfo, colorize);
      default:
        return jsonFormatter(formattedInfo);
    }
  };
}

/**
 * Filter log entry by level
 */
export function filterByLevel(
  info: LogInfo,
  minLevel: LogLevel
): LogInfo | null {
  const levelPriority = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
  };

  if (levelPriority[info.level] < levelPriority[minLevel]) {
    return null;
  }

  return info;
}

/**
 * Mask sensitive data in log entry
 */
export function maskSensitiveData(
  info: LogInfo,
  sensitiveFields: string[] = ['password', 'token', 'secret', 'apiKey', 'authorization']
): LogInfo {
  const masked = { ...info };

  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
      masked[key] = '***REDACTED***';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(
        masked[key] as LogInfo,
        sensitiveFields
      );
    }
  }

  return masked;
}

/**
 * Add default fields to log entry
 */
export function addDefaults(
  info: LogInfo,
  defaults: Record<string, unknown>
): LogInfo {
  return {
    ...defaults,
    ...info,
  };
}

/**
 * Combine multiple formatters
 */
export function combineFormatters(
  ...formatters: Array<(info: LogInfo) => LogInfo>
): (info: LogInfo) => LogInfo {
  return (info: LogInfo) => {
    return formatters.reduce((acc, formatter) => formatter(acc), info);
  };
}

export default {
  formatTimestamp,
  formatLevel,
  jsonFormatter,
  simpleFormatter,
  prettyFormatter,
  detailedFormatter,
  createFormatter,
  filterByLevel,
  maskSensitiveData,
  addDefaults,
  combineFormatters,
  COLORS,
};
