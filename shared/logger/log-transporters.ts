/**
 * Log Transporters
 * Various log transport implementations
 * @module shared/logger/log-transporters
 */

import { LogLevel } from '../middlewares/logging.middleware';
import {
  ConsoleTransportOptions,
  FileTransportOptions,
  ElasticsearchTransportOptions,
} from './winston-config';
import { LogInfo, jsonFormatter, prettyFormatter } from './log-formatters';

/**
 * Transport base interface
 */
export interface Transport {
  /** Transport name */
  name: string;
  /** Log method */
  log(info: LogInfo): void | Promise<void>;
  /** Flush any pending logs */
  flush?(): Promise<void>;
  /** Close transport */
  close?(): void;
}

/**
 * Console transport
 * Outputs logs to console/terminal
 */
export class ConsoleTransport implements Transport {
  name = 'console';
  private options: ConsoleTransportOptions;
  private formatter: (info: LogInfo) => string;

  constructor(options: ConsoleTransportOptions = {}) {
    this.options = {
      colorize: true,
      prettyPrint: true,
      showLevel: true,
      timestampFormat: 'iso',
      ...options,
    };

    this.formatter = this.options.prettyPrint
      ? (info) => prettyFormatter(info, this.options.colorize || false)
      : (info) => jsonFormatter(info);
  }

  log(info: LogInfo): void {
    const output = this.formatter(info);

    switch (info.level) {
      case LogLevel.ERROR:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }
}

/**
 * File transport
 * Outputs logs to file system
 * Note: This is a simplified implementation for Node.js
 */
export class FileTransport implements Transport {
  name = 'file';
  private options: FileTransportOptions;
  private buffer: LogInfo[] = [];
  private flushInterval?: NodeJS.Timeout;
  private maxBufferSize = 100;

  constructor(options: FileTransportOptions) {
    this.options = {
      maxSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      zippedArchive: false,
      ...options,
    };

    // In a real implementation, you'd use fs module
    // This is simplified for browser/edge compatibility
    if (typeof window === 'undefined') {
      this.startFlushInterval();
    }
  }

  log(info: LogInfo): void {
    this.buffer.push(info);

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, 5000); // Flush every 5 seconds
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    // In a real implementation, write to file
    // For now, just output to console with file label
    const output = logs.map((info) => jsonFormatter(info)).join('\n');
    console.log(`[FILE: ${this.options.filename}]\n${output}`);
  }

  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

/**
 * Elasticsearch transport
 * Sends logs to Elasticsearch
 */
export class ElasticsearchTransport implements Transport {
  name = 'elasticsearch';
  private options: ElasticsearchTransportOptions;
  private buffer: LogInfo[] = [];
  private flushInterval?: NodeJS.Timeout;
  private maxBufferSize = 100;

  constructor(options: ElasticsearchTransportOptions) {
    this.options = {
      indexPattern: 'logs',
      indexPrefix: 'app',
      bulk: {
        size: 100,
        flushInterval: 5000,
      },
      ...options,
    };

    if (typeof window === 'undefined') {
      this.startFlushInterval();
    }
  }

  log(info: LogInfo): void {
    this.buffer.push(info);

    if (this.buffer.length >= (this.options.bulk?.size || 100)) {
      this.flush();
    }
  }

  private startFlushInterval(): void {
    const interval = this.options.bulk?.flushInterval || 5000;
    this.flushInterval = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, interval);
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      const index = `${this.options.indexPrefix}-${new Date().toISOString().split('T')[0]}`;
      
      // Build bulk request body
      const body = logs.flatMap((info) => [
        { index: { _index: index } },
        {
          '@timestamp': info.timestamp || new Date().toISOString(),
          ...info,
        },
      ]);

      // Send to Elasticsearch
      // In production, use actual HTTP client
      const response = await fetch(`${this.options.node}/_bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.auth && {
            Authorization: `Basic ${Buffer.from(
              `${this.options.auth.username}:${this.options.auth.password}`
            ).toString('base64')}`,
          }),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error('Elasticsearch bulk insert failed:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to send logs to Elasticsearch:', error);
    }
  }

  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

/**
 * HTTP transport
 * Sends logs to HTTP endpoint
 */
export class HttpTransport implements Transport {
  name = 'http';
  private endpoint: string;
  private headers: Record<string, string>;
  private buffer: LogInfo[] = [];
  private flushInterval?: NodeJS.Timeout;
  private maxBufferSize = 50;

  constructor(options: { endpoint: string; headers?: Record<string, string> }) {
    this.endpoint = options.endpoint;
    this.headers = options.headers || {};

    if (typeof window === 'undefined') {
      this.flushInterval = setInterval(() => {
        if (this.buffer.length > 0) {
          this.flush();
        }
      }, 10000);
    }
  }

  log(info: LogInfo): void {
    this.buffer.push(info);

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify({ logs }),
      });
    } catch (error) {
      console.error('Failed to send logs to HTTP endpoint:', error);
    }
  }

  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

/**
 * Stream transport
 * Writes logs to a Node.js stream
 */
export class StreamTransport implements Transport {
  name = 'stream';
  private stream: NodeJS.WritableStream | null = null;

  constructor(stream?: NodeJS.WritableStream) {
    this.stream = stream || null;
  }

  log(info: LogInfo): void {
    const output = jsonFormatter(info) + '\n';

    if (this.stream && this.stream.writable) {
      this.stream.write(output);
    } else {
      // Fallback to console if stream not available
      console.log(output);
    }
  }

  close(): void {
    if (this.stream && 'end' in this.stream) {
      this.stream.end();
    }
  }
}

/**
 * Composite transport
 * Sends logs to multiple transports
 */
export class CompositeTransport implements Transport {
  name = 'composite';
  private transports: Transport[];

  constructor(transports: Transport[]) {
    this.transports = transports;
  }

  log(info: LogInfo): void {
    for (const transport of this.transports) {
      transport.log(info);
    }
  }

  async flush(): Promise<void> {
    await Promise.all(
      this.transports.map((t) => (t.flush ? t.flush() : Promise.resolve()))
    );
  }

  close(): void {
    for (const transport of this.transports) {
      if (transport.close) {
        transport.close();
      }
    }
  }

  addTransport(transport: Transport): void {
    this.transports.push(transport);
  }

  removeTransport(name: string): void {
    this.transports = this.transports.filter((t) => t.name !== name);
  }
}

/**
 * Create transport from configuration
 */
export function createTransport(config: {
  type: 'console' | 'file' | 'elasticsearch' | 'http' | 'stream';
  options?: Record<string, unknown>;
}): Transport {
  switch (config.type) {
    case 'console':
      return new ConsoleTransport(config.options as ConsoleTransportOptions);
    case 'file':
      return new FileTransport(config.options as FileTransportOptions);
    case 'elasticsearch':
      return new ElasticsearchTransport(config.options as ElasticsearchTransportOptions);
    case 'http':
      return new HttpTransport(config.options as { endpoint: string; headers?: Record<string, string> });
    case 'stream':
      return new StreamTransport(config.options as { stream?: NodeJS.WritableStream });
    default:
      return new ConsoleTransport();
  }
}

export default {
  ConsoleTransport,
  FileTransport,
  ElasticsearchTransport,
  HttpTransport,
  StreamTransport,
  CompositeTransport,
  createTransport,
};
