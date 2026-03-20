/**
 * Redis Pub/Sub Implementation
 * Redis-based pub/sub with Streams for reliability
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../services/observability/index';
import type { IPubSubBackend } from './pubsub-system';
import type {
  Message,
  MessageHandler,
  TopicConfig,
  SubscribeOptions,
  PublishOptions,
} from './pubsub-system';

interface RedisConfig {
  url?: string;
  cluster?: { nodes: { host: string; port: number }[] };
}

export class RedisPubSub implements IPubSubBackend {
  readonly name = 'redis';
  
  private publisher: Redis;
  private subscriber: Redis;
  private consumer: Redis;
  private config: RedisConfig;
  private connected: boolean = false;
  private subscriptions: Map<string, () => Promise<void>> = new Map();
  private consumerGroups: Map<string, string> = new Map();

  constructor(config?: RedisConfig) {
    this.config = config || { url: process.env.REDIS_URL || 'redis://localhost:6379' };
    
    // Create Redis clients
    const redisConfig = this.config.cluster
      ? { cluster: this.config.cluster }
      : { url: this.config.url };

    if (this.config.cluster) {
      this.publisher = new Redis.Cluster(this.config.cluster.nodes);
      this.subscriber = new Redis.Cluster(this.config.cluster.nodes);
      this.consumer = new Redis.Cluster(this.config.cluster.nodes);
    } else {
      this.publisher = new Redis(this.config.url!);
      this.subscriber = new Redis(this.config.url!);
      this.consumer = new Redis(this.config.url!);
    }
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      // Test connection
      await this.publisher.ping();
      this.connected = true;
      Logger.info('Redis pub/sub connected');
    } catch (error) {
      Logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    // Unsubscribe from all subscriptions
    for (const unsubscribe of this.subscriptions.values()) {
      await unsubscribe();
    }

    // Close connections
    await Promise.all([
      this.publisher.quit(),
      this.subscriber.quit(),
      this.consumer.quit(),
    ]);

    this.connected = false;
    Logger.info('Redis pub/sub disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Create a topic (stream in Redis)
   */
  async createTopic(config: TopicConfig): Promise<void> {
    const streamKey = `stream:${config.name}`;
    
    // Create stream with initial message (Redis creates streams lazily)
    // We use XGROUP CREATE to set up consumer group
    const groupId = `group:${config.name}`;
    
    try {
      await this.consumer.xgroup(
        'CREATE',
        streamKey,
        groupId,
        '0',
        'MKSTREAM'
      );
      this.consumerGroups.set(config.name, groupId);
    } catch (error: any) {
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
      // Group already exists
      this.consumerGroups.set(config.name, groupId);
    }

    Logger.debug(`Topic created: ${config.name}`);
  }

  /**
   * Delete a topic
   */
  async deleteTopic(topic: string): Promise<void> {
    const streamKey = `stream:${topic}`;
    const groupId = this.consumerGroups.get(topic) || `group:${topic}`;

    try {
      await this.consumer.xgroup('DESTROY', streamKey, groupId);
    } catch (error) {
      // Ignore if group doesn't exist
    }

    await this.publisher.del(streamKey);
    await this.publisher.del(`dlq:${topic}`);
    
    this.consumerGroups.delete(topic);
    Logger.debug(`Topic deleted: ${topic}`);
  }

  /**
   * Subscribe to a topic
   */
  async subscribe<T>(
    topic: string,
    handler: MessageHandler<T>,
    options: SubscribeOptions = {}
  ): Promise<() => Promise<void>> {
    const streamKey = `stream:${topic}`;
    const groupId = options.groupId || `group:${topic}`;
    const consumerId = `${process.pid}-${uuidv4()}`;
    let running = true;

    // Create consumer group if not exists
    try {
      await this.consumer.xgroup(
        'CREATE',
        streamKey,
        groupId,
        options.fromBeginning ? '0' : '$',
        'MKSTREAM'
      );
    } catch (error: any) {
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }

    // Consumer loop
    const consume = async () => {
      while (running) {
        try {
          // Read from stream
          const messages = await this.consumer.xreadgroup(
            'GROUP',
            groupId,
            consumerId,
            'COUNT',
            options.concurrency || 10,
            'BLOCK',
            1000,
            'STREAMS',
            streamKey,
            '>'
          );

          if (!messages || messages.length === 0) {
            continue;
          }

          // Process messages
          for (const [stream, entries] of messages) {
            for (const [id, fields] of entries) {
              const message = this.parseMessage<T>(topic, id, fields);
              
              try {
                await this.processMessage(message, handler, options, streamKey, groupId, consumerId);
              } catch (error) {
                Logger.error('Error processing message:', error);
              }
            }
          }
        } catch (error) {
          Logger.error('Consumer error:', error);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };

    // Start consumer
    consume().catch(error => {
      Logger.error('Consumer loop error:', error);
    });

    // Return unsubscribe function
    const unsubscribe = async () => {
      running = false;
      await this.consumer.xgroup('DELCONSUMER', streamKey, groupId, consumerId);
      this.subscriptions.delete(topic);
    };

    this.subscriptions.set(topic, unsubscribe);

    return unsubscribe;
  }

  /**
   * Process a single message
   */
  private async processMessage<T>(
    message: Message<T>,
    handler: MessageHandler<T>,
    options: SubscribeOptions,
    streamKey: string,
    groupId: string,
    consumerId: string
  ): Promise<void> {
    const maxRetries = options.maxRetries ?? 3;

    const ack = async () => {
      await this.consumer.xack(streamKey, groupId, message.id);
    };

    const nack = async (error?: Error) => {
      message.retryCount = (message.retryCount || 0) + 1;

      if (message.retryCount >= maxRetries) {
        // Send to dead letter queue
        if (options.deadLetterTopic) {
          await this.publish(options.deadLetterTopic, {
            originalMessage: message,
            error: error?.message,
            failedAt: Date.now(),
          });
        }
        await ack();
      }
    };

    if (options.autoAck) {
      try {
        await handler(message, ack, nack);
        await ack();
      } catch (error) {
        await nack(error as Error);
      }
    } else {
      await handler(message, ack, nack);
    }
  }

  /**
   * Publish a message
   */
  async publish<T>(
    topic: string,
    payload: T,
    options: PublishOptions = {}
  ): Promise<string> {
    const streamKey = `stream:${topic}`;
    const messageId = uuidv4();

    const fields: Record<string, string> = {
      id: messageId,
      payload: JSON.stringify(payload),
      timestamp: (options.timestamp || Date.now()).toString(),
    };

    // Add headers
    if (options.headers) {
      fields.headers = JSON.stringify(options.headers);
    }

    // Add key for partitioning (using Redis sharding)
    if (options.key) {
      fields.key = options.key;
    }

    // Handle delayed messages
    if (options.delay && options.delay > 0) {
      const delayKey = `delayed:${topic}:${messageId}`;
      await this.publisher.set(delayKey, JSON.stringify(fields));
      await this.publisher.expire(delayKey, Math.ceil(options.delay / 1000));
      
      // Schedule delivery
      setTimeout(async () => {
        const data = await this.publisher.get(delayKey);
        if (data) {
          await this.publisher.xadd(streamKey, '*', JSON.parse(data));
          await this.publisher.del(delayKey);
        }
      }, options.delay);

      return messageId;
    }

    // Add to stream
    const result = await this.publisher.xadd(streamKey, '*', fields);

    // Publish to legacy pub/sub for real-time notifications
    await this.publisher.publish(
      `channel:${topic}`,
      JSON.stringify({ id: messageId, payload })
    );

    return messageId;
  }

  /**
   * Parse Redis stream message to Message type
   */
  private parseMessage<T>(
    topic: string,
    id: string,
    fields: string[]
  ): Message<T> {
    const fieldMap: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      fieldMap[fields[i]] = fields[i + 1];
    }

    return {
      id: fieldMap.id || id,
      topic,
      payload: JSON.parse(fieldMap.payload || '{}'),
      timestamp: parseInt(fieldMap.timestamp) || Date.now(),
      headers: fieldMap.headers ? JSON.parse(fieldMap.headers) : undefined,
      key: fieldMap.key,
      offset: id,
    };
  }

  /**
   * Get list of topics (streams)
   */
  async getTopics(): Promise<string[]> {
    const keys = await this.publisher.keys('stream:*');
    return keys.map(k => k.replace('stream:', ''));
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    streams: number;
    subscriptions: number;
    memory: string;
  }> {
    const info = await this.publisher.info('memory');
    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    
    return {
      streams: (await this.getTopics()).length,
      subscriptions: this.subscriptions.size,
      memory: memoryMatch ? memoryMatch[1] : 'unknown',
    };
  }
}
