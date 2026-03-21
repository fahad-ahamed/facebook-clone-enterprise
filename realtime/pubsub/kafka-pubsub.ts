/**
 * Kafka Pub/Sub Implementation
 * Apache Kafka-based pub/sub for high-throughput scenarios
 */

import {
  Kafka,
  Producer,
  Consumer,
  Admin,
  CompressionTypes,
  CompressionCodecs,
  logLevel,
} from 'kafkajs';
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

interface KafkaConfig {
  brokers: string[];
  clientId?: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

export class KafkaPubSub implements IPubSubBackend {
  readonly name = 'kafka';
  
  private kafka: Kafka;
  private producer: Producer | null = null;
  private admin: Admin | null = null;
  private consumers: Map<string, Consumer> = new Map();
  private config: KafkaConfig;
  private connected: boolean = false;
  private subscriptions: Map<string, () => Promise<void>> = new Map();

  constructor(config?: KafkaConfig) {
    this.config = config || {
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      clientId: process.env.KAFKA_CLIENT_ID || 'facebook-clone',
    };

    this.kafka = new Kafka({
      brokers: this.config.brokers,
      clientId: this.config.clientId,
      ssl: this.config.ssl,
      sasl: this.config.sasl,
      logLevel: logLevel.ERROR,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
        multiplier: 2,
      },
    });
  }

  /**
   * Connect to Kafka
   */
  async connect(): Promise<void> {
    try {
      // Create producer
      this.producer = this.kafka.producer({
        maxInFlightRequests: 5,
        idempotent: true,
        transactionalId: `producer-${process.pid}`,
      });

      // Create admin client
      this.admin = this.kafka.admin();

      // Connect
      await this.producer.connect();
      await this.admin.connect();

      this.connected = true;
      Logger.info('Kafka pub/sub connected');
    } catch (error) {
      Logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    // Stop all consumers
    for (const unsubscribe of this.subscriptions.values()) {
      await unsubscribe();
    }

    // Disconnect producer and admin
    if (this.producer) {
      await this.producer.disconnect();
    }

    if (this.admin) {
      await this.admin.disconnect();
    }

    this.connected = false;
    Logger.info('Kafka pub/sub disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.producer !== null;
  }

  /**
   * Create a topic
   */
  async createTopic(config: TopicConfig): Promise<void> {
    if (!this.admin) {
      throw new Error('Admin client not connected');
    }

    const topicConfigs = [{
      topic: config.name,
      numPartitions: config.partitions || 3,
      replicationFactor: config.replicationFactor || 1,
      configEntries: [
        { name: 'retention.ms', value: String(config.retentionMs || 604800000) }, // 7 days default
        { name: 'max.message.bytes', value: String(config.maxMessageBytes || 10485760) }, // 10MB
        { name: 'cleanup.policy', value: config.cleanupPolicy || 'delete' },
      ].filter(Boolean),
    }];

    try {
      await this.admin.createTopics({
        topics: topicConfigs,
        waitForLeaders: true,
      });
      Logger.debug(`Topic created: ${config.name}`);
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }
  }

  /**
   * Delete a topic
   */
  async deleteTopic(topic: string): Promise<void> {
    if (!this.admin) {
      throw new Error('Admin client not connected');
    }

    try {
      await this.admin.deleteTopics({
        topics: [topic],
        timeout: 5000,
      });
      Logger.debug(`Topic deleted: ${topic}`);
    } catch (error: any) {
      if (!error.message?.includes('does not exist')) {
        throw error;
      }
    }
  }

  /**
   * Subscribe to a topic
   */
  async subscribe<T>(
    topic: string,
    handler: MessageHandler<T>,
    options: SubscribeOptions = {}
  ): Promise<() => Promise<void>> {
    const groupId = options.groupId || `group-${topic}`;
    const consumerId = uuidv4();

    const consumer = this.kafka.consumer({
      groupId,
      allowAutoTopicCreation: true,
      maxBytesPerPartition: 1048576, // 1MB
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxPollInterval: 300000,
    });

    await consumer.connect();
    await consumer.subscribe({
      topic,
      fromBeginning: options.fromBeginning ?? false,
    });

    this.consumers.set(consumerId, consumer);

    // Message processing
    const maxRetries = options.maxRetries ?? 3;

    await consumer.run({
      autoCommit: options.autoAck ?? true,
      partitionsConsumedConcurrently: options.concurrency || 1,
      eachMessage: async ({ topic: msgTopic, partition, message }) => {
        const msg: Message<T> = {
          id: message.key?.toString() || uuidv4(),
          topic: msgTopic,
          payload: this.parsePayload<T>(message.value),
          timestamp: Number(message.timestamp),
          headers: this.parseHeaders(message.headers),
          key: message.key?.toString(),
          partition,
          offset: message.offset,
          retryCount: 0,
        };

        const ack = async () => {
          // Auto-commit handles this
        };

        const nack = async (error?: Error) => {
          msg.retryCount = (msg.retryCount || 0) + 1;

          if (msg.retryCount >= maxRetries && options.deadLetterTopic) {
            // Send to dead letter topic
            await this.publish(options.deadLetterTopic, {
              originalMessage: msg,
              error: error?.message,
              failedAt: Date.now(),
            });
          }
        };

        try {
          await handler(msg, ack, nack);
        } catch (error) {
          Logger.error('Message handler error:', error);
          await nack(error as Error);
        }
      },
    });

    Logger.info(`Subscribed to topic: ${topic}`);

    // Return unsubscribe function
    const unsubscribe = async () => {
      await consumer.disconnect();
      this.consumers.delete(consumerId);
      this.subscriptions.delete(consumerId);
    };

    this.subscriptions.set(consumerId, unsubscribe);

    return unsubscribe;
  }

  /**
   * Publish a message
   */
  async publish<T>(
    topic: string,
    payload: T,
    options: PublishOptions = {}
  ): Promise<string> {
    if (!this.producer) {
      throw new Error('Producer not connected');
    }

    const messageId = options.key || uuidv4();

    const message: any = {
      key: messageId,
      value: JSON.stringify(payload),
      timestamp: String(options.timestamp || Date.now()),
      headers: {
        ...options.headers,
        'message-id': messageId,
        'content-type': 'application/json',
      },
    };

    // Partition selection
    if (options.partition !== undefined) {
      message.partition = options.partition;
    }

    // Handle delayed messages using a delayed topic
    if (options.delay && options.delay > 0) {
      const delayedTopic = `${topic}.delayed`;
      
      // Create delayed topic if not exists
      await this.createTopic({
        name: delayedTopic,
        retentionMs: options.delay * 2,
      });

      message.headers['target-topic'] = topic;
      message.headers['process-at'] = String(Date.now() + options.delay);

      await this.producer.send({
        topic: delayedTopic,
        messages: [message],
        compression: CompressionTypes.GZIP,
      });

      return messageId;
    }

    // Send message
    const result = await this.producer.send({
      topic,
      messages: [message],
      compression: CompressionTypes.GZIP,
      acks: -1, // Wait for all replicas
    });

    Logger.debug(`Message published to ${topic}: ${messageId}`);

    return messageId;
  }

  /**
   * Publish batch of messages
   */
  async publishBatch<T>(
    messages: Array<{
      topic: string;
      payload: T;
      options?: PublishOptions;
    }>
  ): Promise<string[]> {
    if (!this.producer) {
      throw new Error('Producer not connected');
    }

    const topicMessages: Record<string, any[]> = {};
    const messageIds: string[] = [];

    for (const msg of messages) {
      const messageId = msg.options?.key || uuidv4();
      messageIds.push(messageId);

      if (!topicMessages[msg.topic]) {
        topicMessages[msg.topic] = [];
      }

      topicMessages[msg.topic].push({
        key: messageId,
        value: JSON.stringify(msg.payload),
        timestamp: String(msg.options?.timestamp || Date.now()),
        headers: {
          ...msg.options?.headers,
          'message-id': messageId,
        },
      });
    }

    const sendBatch = Object.entries(topicMessages).map(([topic, msgs]) =>
      this.producer!.send({
        topic,
        messages: msgs,
        compression: CompressionTypes.GZIP,
      })
    );

    await Promise.all(sendBatch);

    return messageIds;
  }

  /**
   * Parse payload from buffer
   */
  private parsePayload<T>(buffer: Buffer | null): T {
    if (!buffer) {
      return {} as T;
    }
    try {
      return JSON.parse(buffer.toString());
    } catch {
      return buffer.toString() as unknown as T;
    }
  }

  /**
   * Parse headers
   */
  private parseHeaders(
    headers: Record<string, Buffer | undefined> | undefined
  ): Record<string, string> | undefined {
    if (!headers) {
      return undefined;
    }

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value) {
        result[key] = value.toString();
      }
    }
    return result;
  }

  /**
   * Get list of topics
   */
  async getTopics(): Promise<string[]> {
    if (!this.admin) {
      return [];
    }

    const metadata = await this.admin.fetchTopicMetadata();
    return metadata.topics.map(t => t.name);
  }

  /**
   * Get topic metadata
   */
  async getTopicMetadata(topic: string): Promise<{
    partitions: number;
    replicationFactor: number;
    partitionInfo: Array<{
      partitionId: number;
      leader: number;
      replicas: number[];
      isr: number[];
    }>;
  } | null> {
    if (!this.admin) {
      return null;
    }

    try {
      const metadata = await this.admin.fetchTopicMetadata({ topics: [topic] });
      const topicMeta = metadata.topics.find(t => t.name === topic);
      
      if (!topicMeta) {
        return null;
      }

      return {
        partitions: topicMeta.partitionCount,
        replicationFactor: topicMeta.partitions[0]?.replicas.length || 1,
        partitionInfo: topicMeta.partitions.map(p => ({
          partitionId: p.partitionId,
          leader: p.leader,
          replicas: p.replicas,
          isr: p.isr,
        })),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get consumer group details
   */
  async getConsumerGroup(groupId: string): Promise<{
    state: string;
    members: number;
    protocol: string;
  } | null> {
    if (!this.admin) {
      return null;
    }

    try {
      const groups = await this.admin.describeGroups([groupId]);
      const group = groups.groups[0];
      
      return {
        state: group.state,
        members: group.members.length,
        protocol: group.protocol,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    topics: number;
    consumers: number;
    connected: boolean;
  }> {
    const topics = await this.getTopics();
    
    return {
      topics: topics.length,
      consumers: this.consumers.size,
      connected: this.connected,
    };
  }

  /**
   * Reset consumer group offset
   */
  async resetOffset(
    topic: string,
    groupId: string,
    timestamp?: number
  ): Promise<void> {
    if (!this.admin) {
      throw new Error('Admin client not connected');
    }

    const seekTo = timestamp
      ? { timestamp }
      : { fromBeginning: true };

    await this.admin.resetOffsets({
      groupId,
      topic,
      ...seekTo,
    });
  }
}
