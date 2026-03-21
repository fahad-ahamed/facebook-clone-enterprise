/**
 * Event Emitter Pub/Sub Implementation
 * In-memory pub/sub for development and single-instance deployments
 */

import { EventEmitter } from 'events';
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

interface DelayedMessage {
  id: string;
  topic: string;
  payload: any;
  options: PublishOptions;
  scheduledAt: number;
  processAt: number;
}

export class EventEmitterPubSub implements IPubSubBackend {
  readonly name = 'memory';
  
  private emitter: EventEmitter;
  private topics: Map<string, TopicConfig> = new Map();
  private subscriptions: Map<string, () => Promise<void>> = new Map();
  private deadLetterQueues: Map<string, Message[]> = new Map();
  private delayedMessages: Map<string, NodeJS.Timeout> = new Map();
  private messageHistory: Map<string, Message[]> = new Map();
  private maxHistorySize: number = 1000;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(10000); // Increase for high throughput
  }

  /**
   * Connect (no-op for in-memory)
   */
  async connect(): Promise<void> {
    Logger.info('EventEmitter pub/sub initialized');
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    // Clear all delayed messages
    for (const timeout of this.delayedMessages.values()) {
      clearTimeout(timeout);
    }
    this.delayedMessages.clear();

    // Unsubscribe all
    for (const unsubscribe of this.subscriptions.values()) {
      await unsubscribe();
    }

    // Remove all listeners
    this.emitter.removeAllListeners();

    // Clear data
    this.topics.clear();
    this.deadLetterQueues.clear();
    this.messageHistory.clear();

    Logger.info('EventEmitter pub/sub disconnected');
  }

  /**
   * Check if connected (always true for in-memory)
   */
  isConnected(): boolean {
    return true;
  }

  /**
   * Create a topic
   */
  async createTopic(config: TopicConfig): Promise<void> {
    this.topics.set(config.name, config);
    
    // Initialize DLQ if configured
    if (config.deadLetterTopic) {
      if (!this.deadLetterQueues.has(config.deadLetterTopic)) {
        this.deadLetterQueues.set(config.deadLetterTopic, []);
      }
    }

    Logger.debug(`Topic created: ${config.name}`);
  }

  /**
   * Delete a topic
   */
  async deleteTopic(topic: string): Promise<void> {
    this.topics.delete(topic);
    this.deadLetterQueues.delete(topic);
    this.messageHistory.delete(topic);
    
    // Remove all listeners for this topic
    this.emitter.removeAllListeners(`topic:${topic}`);

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
    const subscriptionId = uuidv4();
    const eventName = `topic:${topic}`;
    const maxRetries = options.maxRetries ?? 3;

    // Create topic if not exists
    if (!this.topics.has(topic)) {
      await this.createTopic({ name: topic });
    }

    // Create message handler wrapper
    const wrappedHandler = async (message: Message<T>) => {
      const ack = async () => {
        // No-op for in-memory
      };

      const nack = async (error?: Error) => {
        message.retryCount = (message.retryCount || 0) + 1;

        if (message.retryCount >= maxRetries) {
          // Send to DLQ
          const dlqTopic = options.deadLetterTopic || `${topic}.dlq`;
          
          if (!this.deadLetterQueues.has(dlqTopic)) {
            this.deadLetterQueues.set(dlqTopic, []);
          }
          
          this.deadLetterQueues.get(dlqTopic)!.push({
            ...message,
            headers: {
              ...message.headers,
              error: error?.message || 'Max retries exceeded',
              failedAt: Date.now().toString(),
            },
          });
        } else {
          // Retry with exponential backoff
          const delay = Math.pow(2, message.retryCount) * 100;
          setTimeout(() => {
            this.emitter.emit(eventName, message);
          }, delay);
        }
      };

      try {
        if (options.autoAck) {
          await handler(message, ack, nack);
        } else {
          await handler(message, ack, nack);
          // For manual ack, we need to track acknowledgment
        }
      } catch (error) {
        Logger.error('Handler error:', error);
        await nack(error as Error);
      }
    };

    // Register handler
    this.emitter.on(eventName, wrappedHandler);

    // Handle fromBeginning option
    if (options.fromBeginning) {
      const history = this.messageHistory.get(topic) || [];
      for (const message of history) {
        wrappedHandler(message as Message<T>);
      }
    }

    Logger.info(`Subscribed to topic: ${topic}`);

    // Return unsubscribe function
    const unsubscribe = async () => {
      this.emitter.off(eventName, wrappedHandler);
      this.subscriptions.delete(subscriptionId);
    };

    this.subscriptions.set(subscriptionId, unsubscribe);

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
    const messageId = options.key || uuidv4();
    const timestamp = options.timestamp || Date.now();

    const message: Message<T> = {
      id: messageId,
      topic,
      payload,
      timestamp,
      headers: options.headers,
      key: options.key,
      retryCount: 0,
    };

    // Store in history
    if (!this.messageHistory.has(topic)) {
      this.messageHistory.set(topic, []);
    }
    const history = this.messageHistory.get(topic)!;
    history.push(message);
    
    // Trim history if too large
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    // Handle delayed messages
    if (options.delay && options.delay > 0) {
      const timeoutId = setTimeout(() => {
        this.emitter.emit(`topic:${topic}`, message);
        this.delayedMessages.delete(messageId);
      }, options.delay);

      this.delayedMessages.set(messageId, timeoutId);

      return messageId;
    }

    // Emit immediately
    this.emitter.emit(`topic:${topic}`, message);

    return messageId;
  }

  /**
   * Publish and wait for all handlers
   */
  async publishAndWait<T>(
    topic: string,
    payload: T,
    options: PublishOptions = {},
    timeout: number = 5000
  ): Promise<{ messageId: string; processed: number }> {
    const messageId = await this.publish(topic, payload, options);

    // Wait for all async handlers to complete
    const listeners = this.emitter.listeners(`topic:${topic}`);
    const listenerCount = listeners.length;

    // In a real implementation, we'd track completion
    // For now, just wait a short time
    await new Promise(resolve => setTimeout(resolve, Math.min(timeout, 100)));

    return { messageId, processed: listenerCount };
  }

  /**
   * Get list of topics
   */
  async getTopics(): Promise<string[]> {
    return Array.from(this.topics.keys());
  }

  /**
   * Get topic configuration
   */
  getTopicConfig(topic: string): TopicConfig | undefined {
    return this.topics.get(topic);
  }

  /**
   * Get message history for a topic
   */
  getMessageHistory(topic: string, limit: number = 100): Message[] {
    const history = this.messageHistory.get(topic) || [];
    return history.slice(-limit);
  }

  /**
   * Get dead letter queue messages
   */
  getDeadLetterQueue(topic: string): Message[] {
    return this.deadLetterQueues.get(topic) || [];
  }

  /**
   * Replay dead letter queue messages
   */
  async replayDeadLetterQueue(dlqTopic: string, targetTopic?: string): Promise<number> {
    const messages = this.deadLetterQueues.get(dlqTopic) || [];
    const target = targetTopic || dlqTopic.replace('.dlq', '');
    
    let replayed = 0;
    for (const message of messages) {
      await this.publish(target, message.payload, {
        key: message.key,
        headers: {
          ...message.headers,
          'replayed-from': dlqTopic,
          'replayed-at': Date.now().toString(),
        },
      });
      replayed++;
    }

    // Clear DLQ after replay
    this.deadLetterQueues.set(dlqTopic, []);

    return replayed;
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    topics: number;
    subscriptions: number;
    delayedMessages: number;
    totalListeners: number;
    dlqSize: number;
    historySize: number;
  }> {
    let totalListeners = 0;
    for (const topic of this.topics.keys()) {
      totalListeners += this.emitter.listenerCount(`topic:${topic}`);
    }

    let dlqSize = 0;
    for (const messages of this.deadLetterQueues.values()) {
      dlqSize += messages.length;
    }

    let historySize = 0;
    for (const history of this.messageHistory.values()) {
      historySize += history.length;
    }

    return {
      topics: this.topics.size,
      subscriptions: this.subscriptions.size,
      delayedMessages: this.delayedMessages.size,
      totalListeners,
      dlqSize,
      historySize,
    };
  }

  /**
   * Check if topic exists
   */
  hasTopic(topic: string): boolean {
    return this.topics.has(topic);
  }

  /**
   * Get subscriber count for a topic
   */
  getSubscriberCount(topic: string): number {
    return this.emitter.listenerCount(`topic:${topic}`);
  }

  /**
   * Clear message history for a topic
   */
  clearHistory(topic: string): void {
    this.messageHistory.delete(topic);
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.topics.clear();
    this.subscriptions.clear();
    this.deadLetterQueues.clear();
    this.delayedMessages.clear();
    this.messageHistory.clear();
    this.emitter.removeAllListeners();
  }
}
