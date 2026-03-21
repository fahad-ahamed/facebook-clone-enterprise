/**
 * Winston-Compatible Logger Configuration
 * Configuration that mirrors Winston logger patterns
 * @module shared/logger/winston-config
 */

import { LogLevel } from '../middlewares/logging.middleware';

/**
 * Transport configuration
 */
export interface TransportConfig {
  /** Transport type */
  type: 'console' | 'file' | 'elasticsearch' | 'http' | 'stream';
  /** Whether transport is enabled */
  enabled: boolean;
  /** Minimum log level for this transport */
  level?: LogLevel;
  /** Transport-specific options */
  options?: Record<string, unknown>;
}

/**
 * Console transport options
 */
export interface ConsoleTransportOptions {
  /** Whether to colorize output */
  colorize?: boolean;
  /** Whether to pretty print */
  prettyPrint?: boolean;
  /** Timestamp format */
  timestampFormat?: string;
  /** Whether to show log level */
  showLevel?: boolean;
}

/**
 * File transport options
 */
export interface FileTransportOptions {
  /** Log file path */
  filename: string;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files to keep */
  maxFiles?: number;
  /** Whether to compress rotated files */
  zippedArchive?: boolean;
  /** Date pattern for log rotation */
  datePattern?: string;
}

/**
 * Elasticsearch transport options
 */
export interface ElasticsearchTransportOptions {
  /** Elasticsearch node URL */
  node: string;
  /** Index name pattern */
  indexPattern?: string;
  /** Index prefix */
  indexPrefix?: string;
  /** Elasticsearch authentication */
  auth?: {
    username: string;
    password: string;
  };
  /** Pipeline name for ingest */
  pipeline?: string;
  /** Bulk settings */
  bulk?: {
    size?: number;
    flushInterval?: number;
  };
}

/**
 * Logger configuration (Winston-compatible)
 */
export interface WinstonConfig {
  /** Default log level */
  level: LogLevel;
  /** Log format */
  format: LogFormat;
  /** Default metadata for all logs */
  defaultMeta?: Record<string, unknown>;
  /** Transport configurations */
  transports: TransportConfig[];
  /** Exception handling */
  exceptionHandlers?: TransportConfig[];
  /** Rejection handling */
  rejectionHandlers?: TransportConfig[];
  /** Whether to exit on error */
  exitOnError?: boolean;
  /** Whether to handle uncaught exceptions */
  handleExceptions?: boolean;
  /** Whether to handle unhandled rejections */
  handleRejections?: boolean;
}

/**
 * Log format type
 */
export type LogFormat = 'json' | 'simple' | 'pretty' | 'custom';

/**
 * Format configuration
 */
export interface FormatConfig {
  /** Format type */
  type: LogFormat;
  /** Whether to include timestamp */
  timestamp?: boolean;
  /** Whether to colorize */
  colorize?: boolean;
  /** Whether to pretty print */
  prettyPrint?: boolean;
  /** Custom format function */
  customFormatter?: (info: LogInfo) => string;
}

/**
 * Log info object (Winston-compatible)
 */
export interface LogInfo {
  level: LogLevel;
  message: string;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Default Winston configuration for development
 */
export const developmentConfig: WinstonConfig = {
  level: LogLevel.DEBUG,
  format: 'pretty',
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'facebook-clone',
    environment: 'development',
  },
  transports: [
    {
      type: 'console',
      enabled: true,
      level: LogLevel.DEBUG,
      options: {
        colorize: true,
        prettyPrint: true,
        showLevel: true,
      } as ConsoleTransportOptions,
    },
  ],
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true,
};

/**
 * Default Winston configuration for production
 */
export const productionConfig: WinstonConfig = {
  level: LogLevel.INFO,
  format: 'json',
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'facebook-clone',
    environment: 'production',
  },
  transports: [
    {
      type: 'console',
      enabled: true,
      level: LogLevel.INFO,
      options: {
        colorize: false,
        prettyPrint: false,
      } as ConsoleTransportOptions,
    },
    {
      type: 'file',
      enabled: true,
      level: LogLevel.WARN,
      options: {
        filename: 'logs/error.log',
        maxSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        zippedArchive: true,
      } as FileTransportOptions,
    },
    {
      type: 'file',
      enabled: true,
      level: LogLevel.INFO,
      options: {
        filename: 'logs/combined.log',
        maxSize: 50 * 1024 * 1024, // 50MB
        maxFiles: 10,
        zippedArchive: true,
      } as FileTransportOptions,
    },
  ],
  exceptionHandlers: [
    {
      type: 'file',
      enabled: true,
      options: {
        filename: 'logs/exceptions.log',
      } as FileTransportOptions,
    },
  ],
  rejectionHandlers: [
    {
      type: 'file',
      enabled: true,
      options: {
        filename: 'logs/rejections.log',
      } as FileTransportOptions,
    },
  ],
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true,
};

/**
 * Elasticsearch configuration for production logging
 */
export const elasticsearchConfig: Partial<WinstonConfig> = {
  transports: [
    {
      type: 'elasticsearch',
      enabled: !!process.env.ELASTICSEARCH_URL,
      level: LogLevel.INFO,
      options: {
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
        indexPattern: 'facebook-clone-logs',
        indexPrefix: 'facebook-clone',
        auth: process.env.ELASTICSEARCH_AUTH
          ? {
              username: process.env.ELASTICSEARCH_USERNAME || '',
              password: process.env.ELASTICSEARCH_PASSWORD || '',
            }
          : undefined,
        bulk: {
          size: 100,
          flushInterval: 5000,
        },
      } as ElasticsearchTransportOptions,
    },
  ],
};

/**
 * Get configuration based on environment
 */
export function getConfig(): WinstonConfig {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';

  const baseConfig = isProduction ? productionConfig : developmentConfig;

  // Merge Elasticsearch config if URL is provided
  if (process.env.ELASTICSEARCH_URL) {
    return {
      ...baseConfig,
      transports: [...baseConfig.transports, ...elasticsearchConfig.transports!],
    };
  }

  return baseConfig;
}

/**
 * Create custom configuration
 */
export function createConfig(
  overrides: Partial<WinstonConfig>
): WinstonConfig {
  const baseConfig = getConfig();
  return {
    ...baseConfig,
    ...overrides,
    defaultMeta: {
      ...baseConfig.defaultMeta,
      ...overrides.defaultMeta,
    },
    transports: overrides.transports || baseConfig.transports,
  };
}

export default {
  developmentConfig,
  productionConfig,
  elasticsearchConfig,
  getConfig,
  createConfig,
};
