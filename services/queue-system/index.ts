/**
 * Queue System - Kafka & RabbitMQ
 * Message queue implementations for async processing
 */

import { RedisClient } from '../cache-system/redis';

const redis = new RedisClient();

// =====================================================
// Job Types
// =====================================================

interface Job<T = any> {
  id: string;
  type: string;
  payload: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

interface QueueOptions {
  name: string;
  maxAttempts?: number;
  delay?: number;
  priority?: number;
}

type JobHandler<T = any> = (job: Job<T>) => Promise<void>;

// =====================================================
// Redis-based Queue (Simple implementation)
// =====================================================

export class RedisQueue<T = any> {
  private queueName: string;
  private handlers: Map<string, JobHandler<T>> = new Map();
  private processingInterval?: ReturnType<typeof setInterval>;

  constructor(queueName: string) {
    this.queueName = queueName;
  }

  /**
   * Add job to queue
   */
  async add(type: string, payload: T, options: Partial<QueueOptions> = {}): Promise<string> {
    const job: Job<T> = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      payload,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay,
      createdAt: new Date(),
    };

    // Add to queue (sorted by priority)
    await redis.zadd(
      `queue:${this.queueName}:pending`,
      -job.priority,
      JSON.stringify(job)
    );

    return job.id;
  }

  /**
   * Register job handler
   */
  process(type: string, handler: JobHandler<T>): void {
    this.handlers.set(type, handler);
  }

  /**
   * Start processing jobs
   */
  start(concurrency: number = 1): void {
    console.log(`Starting queue processor: ${this.queueName}`);

    this.processingInterval = setInterval(async () => {
      for (let i = 0; i < concurrency; i++) {
        this.processNextJob();
      }
    }, 1000);
  }

  /**
   * Stop processing
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }

  /**
   * Process next job
   */
  private async processNextJob(): Promise<void> {
    // Get next job (highest priority first)
    const result = await redis.zpopmin(`queue:${this.queueName}:pending`);

    if (!result || result.length === 0) return;

    const job: Job<T> = JSON.parse(result[0]);
    const handler = this.handlers.get(job.type);

    if (!handler) {
      console.error(`No handler for job type: ${job.type}`);
      await this.failJob(job, 'No handler registered');
      return;
    }

    // Move to processing
    await redis.hset(`queue:${this.queueName}:processing`, job.id, JSON.stringify(job));

    try {
      job.attempts++;
      job.startedAt = new Date();

      await handler(job);

      // Job completed
      job.completedAt = new Date();
      await this.completeJob(job);
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error.message);

      if (job.attempts < job.maxAttempts) {
        // Retry
        await this.retryJob(job);
      } else {
        // Max attempts reached
        await this.failJob(job, error.message);
      }
    }
  }

  private async completeJob(job: Job<T>): Promise<void> {
    await redis.hdel(`queue:${this.queueName}:processing`, job.id);
    await redis.hset(`queue:${this.queueName}:completed`, job.id, JSON.stringify(job));
    
    // Expire completed jobs after 24 hours
    await redis.expire(`queue:${this.queueName}:completed`, 86400);
  }

  private async retryJob(job: Job<T>): Promise<void> {
    await redis.hdel(`queue:${this.queueName}:processing`, job.id);
    
    // Add delay for retry
    const delay = Math.min(1000 * Math.pow(2, job.attempts), 60000);
    job.delay = delay;

    await redis.zadd(
      `queue:${this.queueName}:pending`,
      -job.priority,
      JSON.stringify(job)
    );
  }

  private async failJob(job: Job<T>, error: string): Promise<void> {
    job.failedAt = new Date();
    job.error = error;

    await redis.hdel(`queue:${this.queueName}:processing`, job.id);
    await redis.hset(`queue:${this.queueName}:failed`, job.id, JSON.stringify(job));
  }

  /**
   * Get queue stats
   */
  async stats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      redis.zcard(`queue:${this.queueName}:pending`),
      redis.hlen(`queue:${this.queueName}:processing`),
      redis.hlen(`queue:${this.queueName}:completed`),
      redis.hlen(`queue:${this.queueName}:failed`),
    ]);

    return { pending, processing, completed, failed };
  }
}

// =====================================================
// Pre-defined Queues
// =====================================================

// Email Queue
export const emailQueue = new RedisQueue('emails');

emailQueue.process('send_email', async (job) => {
  const { to, subject, body, template, data } = job.payload;
  console.log(`Sending email to ${to}: ${subject}`);
  // Actual email sending logic here
});

// Notification Queue
export const notificationQueue = new RedisQueue('notifications');

notificationQueue.process('push_notification', async (job) => {
  const { userId, title, body, data } = job.payload;
  console.log(`Sending push notification to ${userId}: ${title}`);
  // FCM/APNS logic here
});

notificationQueue.process('send_sms', async (job) => {
  const { to, message } = job.payload;
  console.log(`Sending SMS to ${to}: ${message}`);
  // SMS provider logic here
});

// Feed Precomputation Queue
export const feedQueue = new RedisQueue('feed');

feedQueue.process('fanout', async (job) => {
  const { postId, authorId, followers } = job.payload;
  console.log(`Fanout post ${postId} to ${followers.length} followers`);
  // Feed fanout logic here
});

feedQueue.process('precompute_feed', async (job) => {
  const { userId } = job.payload;
  console.log(`Precomputing feed for user ${userId}`);
  // Feed precomputation logic here
});

// Media Processing Queue
export const mediaQueue = new RedisQueue('media');

mediaQueue.process('process_image', async (job) => {
  const { fileId, operations } = job.payload;
  console.log(`Processing image ${fileId}`);
  // Image processing logic here
});

mediaQueue.process('process_video', async (job) => {
  const { fileId, qualities } = job.payload;
  console.log(`Processing video ${fileId}`);
  // Video transcoding logic here
});

mediaQueue.process('generate_thumbnails', async (job) => {
  const { fileId, count } = job.payload;
  console.log(`Generating thumbnails for ${fileId}`);
  // Thumbnail generation logic here
});

// Analytics Queue
export const analyticsQueue = new RedisQueue('analytics');

analyticsQueue.process('track_event', async (job) => {
  const { eventType, userId, properties, context } = job.payload;
  console.log(`Tracking event: ${eventType}`);
  // Analytics tracking logic here
});

analyticsQueue.process('aggregate_metrics', async (job) => {
  const { date, metrics } = job.payload;
  console.log(`Aggregating metrics for ${date}`);
  // Metric aggregation logic here
});

// =====================================================
// Kafka Event Publisher (for high-throughput)
// =====================================================

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
}

export class KafkaEventPublisher {
  private producer: any;
  private connected: boolean = false;

  constructor(config: KafkaConfig) {
    // In production, would use kafkajs or similar
    console.log(`Kafka producer configured for ${config.brokers.join(',')}`);
  }

  async connect(): Promise<void> {
    // Connect to Kafka
    this.connected = true;
    console.log('Kafka producer connected');
  }

  async publish(topic: string, key: string, value: any, headers?: Record<string, string>): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    console.log(`Publishing to ${topic}: ${key}`);
    
    // In production:
    // await this.producer.send({
    //   topic,
    //   messages: [{ key, value: JSON.stringify(value), headers }],
    // });
  }

  async publishBatch(messages: Array<{ topic: string; key: string; value: any }>): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    console.log(`Publishing batch of ${messages.length} messages`);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('Kafka producer disconnected');
  }
}

// =====================================================
// Event Topics
// =====================================================

export const KAFKA_TOPICS = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Post events
  POST_CREATED: 'post.created',
  POST_UPDATED: 'post.updated',
  POST_DELETED: 'post.deleted',

  // Social events
  FRIENDSHIP_CREATED: 'friendship.created',
  FOLLOW_CREATED: 'follow.created',

  // Chat events
  MESSAGE_SENT: 'message.sent',
  MESSAGE_DELIVERED: 'message.delivered',

  // Analytics
  ANALYTICS_EVENTS: 'analytics.events',

  // Media
  MEDIA_UPLOADED: 'media.uploaded',
  MEDIA_PROCESSED: 'media.processed',
} as const;

// =====================================================
// Dead Letter Queue Handler
// =====================================================

export async function processDeadLetterQueue(queueName: string): Promise<void> {
  const failedJobs = await redis.hgetall(`queue:${queueName}:failed`);

  for (const [jobId, jobData] of Object.entries(failedJobs)) {
    const job: Job = JSON.parse(jobData);
    console.log(`Dead letter job: ${jobId}`, {
      type: job.type,
      attempts: job.attempts,
      error: job.error,
      createdAt: job.createdAt,
      failedAt: job.failedAt,
    });

    // Could implement alerting, retry logic, or manual review here
  }
}

export default {
  RedisQueue,
  emailQueue,
  notificationQueue,
  feedQueue,
  mediaQueue,
  analyticsQueue,
  KafkaEventPublisher,
  KAFKA_TOPICS,
  processDeadLetterQueue,
};
