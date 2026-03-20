/**
 * Realtime - Event Bus
 * Central event bus for inter-service communication
 */

import { RedisClient } from '../cache-system/redis';

const redis = new RedisClient();

// Event types
interface Event<T = any> {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  payload: T;
  metadata?: Record<string, any>;
}

type EventHandler<T = any> = (event: Event<T>) => Promise<void> | void;

// Event streams
const STREAMS = {
  USER_EVENTS: 'events:user',
  POST_EVENTS: 'events:post',
  CHAT_EVENTS: 'events:chat',
  NOTIFICATION_EVENTS: 'events:notification',
  ANALYTICS_EVENTS: 'events:analytics',
  SYSTEM_EVENTS: 'events:system',
};

// Event handlers registry
const handlers = new Map<string, Set<EventHandler>>();

/**
 * Publish event to stream
 */
export async function publishEvent<T>(
  stream: keyof typeof STREAMS,
  type: string,
  source: string,
  payload: T,
  metadata?: Record<string, any>
): Promise<string> {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const event: Event<T> = {
    id: eventId,
    type,
    source,
    timestamp: new Date(),
    payload,
    metadata,
  };

  // Add to Redis stream
  await redis.xadd(STREAMS[stream], '*', {
    id: event.id,
    type: event.type,
    source: event.source,
    timestamp: event.timestamp.toISOString(),
    payload: JSON.stringify(event.payload),
    metadata: JSON.stringify(event.metadata || {}),
  });

  // Also publish to pub/sub for real-time subscribers
  await redis.publish(
    `events:${type}`,
    JSON.stringify(event)
  );

  return eventId;
}

/**
 * Subscribe to event type
 */
export function subscribe<T = any>(
  eventType: string,
  handler: EventHandler<T>
): () => void {
  if (!handlers.has(eventType)) {
    handlers.set(eventType, new Set());
  }
  handlers.get(eventType)!.add(handler as EventHandler);

  // Return unsubscribe function
  return () => {
    handlers.get(eventType)?.delete(handler as EventHandler);
  };
}

/**
 * Start event consumer
 */
export async function startEventConsumer(
  stream: keyof typeof STREAMS,
  consumerGroup: string,
  consumerName: string
) {
  const streamKey = STREAMS[stream];

  // Create consumer group if not exists
  try {
    await redis.xgroup('CREATE', streamKey, consumerGroup, '0', 'MKSTREAM');
  } catch (error: any) {
    if (!error.message.includes('BUSYGROUP')) {
      throw error;
    }
  }

  console.log(`Starting event consumer: ${consumerGroup}:${consumerName} on ${streamKey}`);

  // Process events in loop
  while (true) {
    try {
      // Read new events
      const events = await redis.xreadgroup(
        'GROUP', consumerGroup, consumerName,
        'COUNT', 10,
        'BLOCK', 5000, // Block for 5 seconds
        'STREAMS', streamKey, '>'
      );

      if (!events || events.length === 0) continue;

      for (const [streamName, messages] of events) {
        for (const [messageId, fields] of messages) {
          try {
            const event = parseEvent(fields);
            await processEvent(event);

            // Acknowledge event
            await redis.xack(streamKey, consumerGroup, messageId);
          } catch (error) {
            console.error(`Error processing event ${messageId}:`, error);
            // Event will be retried or moved to dead letter queue
          }
        }
      }
    } catch (error) {
      console.error('Event consumer error:', error);
      await sleep(1000);
    }
  }
}

/**
 * Process single event
 */
async function processEvent(event: Event): Promise<void> {
  const eventHandlers = handlers.get(event.type);
  
  if (eventHandlers) {
    for (const handler of eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Handler error for event ${event.type}:`, error);
      }
    }
  }

  // Also call wildcard handlers
  const wildcardHandlers = handlers.get('*');
  if (wildcardHandlers) {
    for (const handler of wildcardHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('Wildcard handler error:', error);
      }
    }
  }
}

/**
 * Parse event from Redis stream fields
 */
function parseEvent(fields: string[]): Event {
  const data: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1];
  }

  return {
    id: data.id,
    type: data.type,
    source: data.source,
    timestamp: new Date(data.timestamp),
    payload: JSON.parse(data.payload),
    metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
  };
}

/**
 * Get event history
 */
export async function getEventHistory(
  stream: keyof typeof STREAMS,
  options: {
    start?: string;
    end?: string;
    count?: number;
  } = {}
): Promise<Event[]> {
  const streamKey = STREAMS[stream];
  const events: Event[] = [];

  const messages = await redis.xrange(
    streamKey,
    options.start || '-',
    options.end || '+',
    'COUNT',
    options.count || 100
  );

  for (const [, fields] of messages) {
    events.push(parseEvent(fields));
  }

  return events;
}

/**
 * Create event replay
 */
export async function replayEvents(
  stream: keyof typeof STREAMS,
  fromTimestamp: Date,
  handler: EventHandler
): Promise<number> {
  const streamKey = STREAMS[stream];
  const startId = `${fromTimestamp.getTime()}-0`;
  let count = 0;

  let lastId = startId;
  while (true) {
    const messages = await redis.xrange(streamKey, lastId, '+', 'COUNT', 100);
    
    if (messages.length === 0) break;

    for (const [id, fields] of messages) {
      const event = parseEvent(fields);
      await handler(event);
      count++;
      lastId = id;
    }
  }

  return count;
}

/**
 * Event types for type safety
 */
export const EventTypes = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_FOLLOWED: 'user.followed',
  USER_UNFOLLOWED: 'user.unfollowed',

  // Post events
  POST_CREATED: 'post.created',
  POST_UPDATED: 'post.updated',
  POST_DELETED: 'post.deleted',
  POST_LIKED: 'post.liked',
  POST_SHARED: 'post.shared',

  // Comment events
  COMMENT_CREATED: 'comment.created',
  COMMENT_DELETED: 'comment.deleted',

  // Chat events
  MESSAGE_SENT: 'message.sent',
  MESSAGE_DELIVERED: 'message.delivered',
  MESSAGE_READ: 'message.read',
  CONVERSATION_CREATED: 'conversation.created',

  // Notification events
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ: 'notification.read',

  // System events
  CACHE_INVALIDATE: 'cache.invalidate',
  CONFIG_UPDATED: 'config.updated',
  SERVICE_HEALTH: 'service.health',
} as const;

/**
 * Helper sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  publishEvent,
  subscribe,
  startEventConsumer,
  getEventHistory,
  replayEvents,
  STREAMS,
  EventTypes,
};
