/**
 * Pub/Sub System - Unified Interface
 * Provides a unified interface for multiple pub/sub backends
 */

import { RedisPubSub } from './redis-pubsub';
import { KafkaPubSub } from './kafka-pubsub';
import { EventEmitterPubSub } from './event-emitter';
import { Logger } from '../../services/observability/index';

// Backend types
export type PubSubBackend = 'redis' | 'kafka' | 'memory';

// Message structure
export interface Message<T = any> {
  id: string;
  topic: string;
  payload: T;
  timestamp: number;
  headers?: Record<string, string>;
  key?: string;
  partition?: number;
  offset?: string;
  retryCount?: number;
}

// Message handler type
export type MessageHandler<T = any> = (
  message: Message<T>,
  ack: () => Promise<void>,
  nack: (error?: Error) => Promise<void>
) => Promise<void> | void;

// Topic configuration
export interface TopicConfig {
  name: string;
  partitions?: number;
  replicationFactor?: number;
  retentionMs?: number;
  maxMessageBytes?: number;
  cleanupPolicy?: 'delete' | 'compact';
  deadLetterTopic?: string;
  maxRetries?: number;
}

// Subscribe options
export interface SubscribeOptions {
  groupId?: string;
  fromBeginning?: boolean;
  autoAck?: boolean;
  maxRetries?: number;
  deadLetterTopic?: string;
  concurrency?: number;
}

// Publish options
export interface PublishOptions {
  key?: string;
  partition?: number;
  headers?: Record<string, string>;
  timestamp?: number;
  delay?: number;
}

// Pub/Sub system configuration
export interface PubSubConfig {
  backend: PubSubBackend | PubSubBackend[];
  redis?: {
    url?: string;
    cluster?: { nodes: { host: string; port: number }[] };
  };
  kafka?: {
    brokers: string[];
    clientId?: string;
    ssl?: boolean;
    sasl?: {
      mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
      username: string;
      password: string;
    };
  };
  fallback?: {
    enabled: boolean;
    backends: PubSubBackend[];
  };
  defaultOptions?: {
    subscribe?: SubscribeOptions;
    publish?: PublishOptions;
  };
}

// Backend interface
interface IPubSubBackend {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  createTopic(config: TopicConfig): Promise<void>;
  deleteTopic(topic: string): Promise<void>;
  subscribe<T>(
    topic: string,
    handler: MessageHandler<T>,
    options?: SubscribeOptions
  ): Promise<() => Promise<void>>;
  publish<T>(topic: string, message: T, options?: PublishOptions): Promise<string>;
  getTopics(): Promise<string[]>;
  getStats(): Promise<any>;
}

/**
 * Pub/Sub System - Main class
 */
export class PubSubSystem {
  private backends: Map<PubSubBackend, IPubSubBackend> = new Map();
  private primaryBackend: PubSubBackend;
  private config: PubSubConfig;
  private isInitialized: boolean = false;

  constructor(config: PubSubConfig) {
    this.config = config;
    
    // Determine primary backend
    const backends = Array.isArray(config.backend) ? config.backend : [config.backend];
    this.primaryBackend = backends[0];

    // Initialize backends
    if (backends.includes('redis') || config.redis) {
      this.backends.set('redis', new RedisPubSub(config.redis));
    }
    
    if (backends.includes('kafka') || config.kafka) {
      this.backends.set('kafka', new KafkaPubSub(config.kafka));
    }
    
    if (backends.includes('memory')) {
      this.backends.set('memory', new EventEmitterPubSub());
    }
  }

  /**
   * Connect to all backends
   */
  async connect(): Promise<void> {
    const connectionPromises = Array.from(this.backends.entries()).map(
      async ([name, backend]) => {
        try {
          await backend.connect();
          Logger.info(`Connected to ${name} pub/sub backend`);
        } catch (error) {
          Logger.error(`Failed to connect to ${name} pub/sub backend:`, error);
          
          // Don't throw if we have fallback enabled
          if (!this.config.fallback?.enabled) {
            throw error;
          }
        }
      }
    );

    await Promise.all(connectionPromises);
    this.isInitialized = true;
  }

  /**
   * Disconnect from all backends
   */
  async disconnect(): Promise<void> {
    const disconnectionPromises = Array.from(this.backends.values()).map(
      async (backend) => {
        try {
          await backend.disconnect();
        } catch (error) {
          Logger.error('Error disconnecting backend:', error);
        }
      }
    );

    await Promise.all(disconnectionPromises);
    this.isInitialized = false;
  }

  /**
   * Get the primary or fallback backend
   */
  private getBackend(backend?: PubSubBackend): IPubSubBackend {
    const targetBackend = backend || this.primaryBackend;
    const instance = this.backends.get(targetBackend);

    if (!instance) {
      throw new Error(`Backend ${targetBackend} not configured`);
    }

    if (!instance.isConnected() && this.config.fallback?.enabled) {
      // Try fallback backends
      for (const fallbackName of this.config.fallback.backends) {
        const fallback = this.backends.get(fallbackName);
        if (fallback?.isConnected()) {
          Logger.warn(`Using fallback backend ${fallbackName}`);
          return fallback;
        }
      }
    }

    return instance;
  }

  /**
   * Create a topic
   */
  async createTopic(config: TopicConfig, backend?: PubSubBackend): Promise<void> {
    await this.getBackend(backend).createTopic(config);
  }

  /**
   * Delete a topic
   */
  async deleteTopic(topic: string, backend?: PubSubBackend): Promise<void> {
    await this.getBackend(backend).deleteTopic(topic);
  }

  /**
   * Subscribe to a topic
   */
  async subscribe<T>(
    topic: string,
    handler: MessageHandler<T>,
    options?: SubscribeOptions,
    backend?: PubSubBackend
  ): Promise<() => Promise<void>> {
    const mergedOptions = {
      ...this.config.defaultOptions?.subscribe,
      ...options,
    };

    return this.getBackend(backend).subscribe(topic, handler, mergedOptions);
  }

  /**
   * Publish a message
   */
  async publish<T>(
    topic: string,
    message: T,
    options?: PublishOptions,
    backend?: PubSubBackend
  ): Promise<string> {
    const mergedOptions = {
      ...this.config.defaultOptions?.publish,
      ...options,
    };

    return this.getBackend(backend).publish(topic, message, mergedOptions);
  }

  /**
   * Publish to multiple backends
   */
  async publishMulti<T>(
    topic: string,
    message: T,
    backends: PubSubBackend[],
    options?: PublishOptions
  ): Promise<Map<PubSubBackend, string>> {
    const results = new Map<PubSubBackend, string>();

    await Promise.all(
      backends.map(async (backendName) => {
        try {
          const messageId = await this.publish(topic, message, options, backendName);
          results.set(backendName, messageId);
        } catch (error) {
          Logger.error(`Failed to publish to ${backendName}:`, error);
        }
      })
    );

    return results;
  }

  /**
   * Get list of topics
   */
  async getTopics(backend?: PubSubBackend): Promise<string[]> {
    return this.getBackend(backend).getTopics();
  }

  /**
   * Get statistics
   */
  async getStats(backend?: PubSubBackend): Promise<any> {
    return this.getBackend(backend).getStats();
  }

  /**
   * Get all backends status
   */
  getBackendsStatus(): Map<PubSubBackend, { connected: boolean }> {
    const status = new Map<PubSubBackend, { connected: boolean }>();

    for (const [name, backend] of this.backends) {
      status.set(name, { connected: backend.isConnected() });
    }

    return status;
  }

  /**
   * Check if system is healthy
   */
  isHealthy(): boolean {
    if (!this.isInitialized) {
      return false;
    }

    // At least one backend should be connected
    for (const backend of this.backends.values()) {
      if (backend.isConnected()) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Create a Pub/Sub system instance
 */
export function createPubSub(config: PubSubConfig): PubSubSystem {
  return new PubSubSystem(config);
}

/**
 * Create a default Pub/Sub system with Redis
 */
export function createDefaultPubSub(redisUrl?: string): PubSubSystem {
  return createPubSub({
    backend: 'redis',
    redis: { url: redisUrl || process.env.REDIS_URL },
    fallback: {
      enabled: true,
      backends: ['memory'],
    },
  });
}
