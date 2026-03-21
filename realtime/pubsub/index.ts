/**
 * Realtime - Pub/Sub Service
 * Redis-based publish/subscribe for real-time features
 */

import { RedisClient } from '../cache-system/redis';

const redis = new RedisClient();

// Pub/Sub channel types
interface PubSubMessage {
  channel: string;
  type: string;
  payload: any;
  timestamp: number;
  senderId?: string;
}

type MessageHandler = (message: PubSubMessage) => void;

// Subscribers registry
const subscribers = new Map<string, Set<MessageHandler>>();

// Create separate Redis client for subscription
let subscriptionClient: any = null;

/**
 * Initialize pub/sub system
 */
export async function initPubSub() {
  if (subscriptionClient) return;

  subscriptionClient = redis.duplicate();

  subscriptionClient.on('message', (channel: string, message: string) => {
    try {
      const parsed: PubSubMessage = JSON.parse(message);
      const handlers = subscribers.get(channel);
      if (handlers) {
        handlers.forEach(handler => handler(parsed));
      }
    } catch (error) {
      console.error('Pub/Sub message parsing error:', error);
    }
  });

  subscriptionClient.on('subscribe', (channel: string, count: number) => {
    console.log(`Subscribed to channel: ${channel} (${count} total)`);
  });

  subscriptionClient.on('unsubscribe', (channel: string, count: number) => {
    console.log(`Unsubscribed from channel: ${channel} (${count} total)`);
  });

  console.log('Pub/Sub system initialized');
}

/**
 * Publish message to channel
 */
export async function publish(
  channel: string,
  type: string,
  payload: any,
  senderId?: string
): Promise<number> {
  const message: PubSubMessage = {
    channel,
    type,
    payload,
    timestamp: Date.now(),
    senderId,
  };

  return redis.publish(channel, JSON.stringify(message));
}

/**
 * Subscribe to channel
 */
export async function subscribe(
  channel: string,
  handler: MessageHandler
): Promise<() => void> {
  if (!subscriptionClient) {
    await initPubSub();
  }

  // Add handler
  if (!subscribers.has(channel)) {
    subscribers.set(channel, new Set());
    await subscriptionClient.subscribe(channel);
  }
  subscribers.get(channel)!.add(handler);

  // Return unsubscribe function
  return async () => {
    const handlers = subscribers.get(channel);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        subscribers.delete(channel);
        await subscriptionClient.unsubscribe(channel);
      }
    }
  };
}

/**
 * Subscribe to pattern (e.g., 'chat:*')
 */
export async function psubscribe(
  pattern: string,
  handler: MessageHandler
): Promise<() => void> {
  if (!subscriptionClient) {
    await initPubSub();
  }

  // Add pattern handler
  const patternKey = `pattern:${pattern}`;
  if (!subscribers.has(patternKey)) {
    subscribers.set(patternKey, new Set());
    await subscriptionClient.psubscribe(pattern);
  }
  subscribers.get(patternKey)!.add(handler);

  return async () => {
    const handlers = subscribers.get(patternKey);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        subscribers.delete(patternKey);
        await subscriptionClient.punsubscribe(pattern);
      }
    }
  };
}

/**
 * Broadcast to multiple channels
 */
export async function broadcast(
  channels: string[],
  type: string,
  payload: any,
  senderId?: string
): Promise<void> {
  const promises = channels.map(channel => 
    publish(channel, type, payload, senderId)
  );
  await Promise.all(promises);
}

/**
 * Pub/Sub channel definitions
 */
export const Channels = {
  // Chat channels
  chatRoom: (roomId: string) => `chat:room:${roomId}`,
  chatUser: (userId: string) => `chat:user:${userId}`,
  
  // Presence channels
  presence: (userId: string) => `presence:${userId}`,
  presenceFriends: (userId: string) => `presence:friends:${userId}`,
  
  // Notification channels
  notifications: (userId: string) => `notifications:${userId}`,
  
  // Feed channels
  feed: (userId: string) => `feed:${userId}`,
  post: (postId: string) => `post:${postId}`,
  
  // Live stream channels
  liveStream: (streamId: string) => `livestream:${streamId}`,
  
  // System channels
  system: 'system:broadcast',
  metrics: 'system:metrics',
} as const;

/**
 * Chat-specific pub/sub helpers
 */
export const ChatPubSub = {
  async sendToRoom(roomId: string, message: any, senderId?: string) {
    return publish(Channels.chatRoom(roomId), 'message', message, senderId);
  },

  async sendToUser(userId: string, message: any, senderId?: string) {
    return publish(Channels.chatUser(userId), 'message', message, senderId);
  },

  async onRoomMessage(roomId: string, handler: MessageHandler) {
    return subscribe(Channels.chatRoom(roomId), handler);
  },

  async onUserMessage(userId: string, handler: MessageHandler) {
    return subscribe(Channels.chatUser(userId), handler);
  },
};

/**
 * Notification-specific pub/sub helpers
 */
export const NotificationPubSub = {
  async send(userId: string, notification: any) {
    return publish(Channels.notifications(userId), 'notification', notification);
  },

  async onNotification(userId: string, handler: MessageHandler) {
    return subscribe(Channels.notifications(userId), handler);
  },
};

/**
 * Presence pub/sub helpers
 */
export const PresencePubSub = {
  async updateStatus(userId: string, status: any) {
    return publish(Channels.presence(userId), 'status_update', status, userId);
  },

  async notifyFriends(userId: string, status: any) {
    return publish(Channels.presenceFriends(userId), 'friend_status', status, userId);
  },

  async onFriendStatus(userId: string, handler: MessageHandler) {
    return subscribe(Channels.presenceFriends(userId), handler);
  },
};

/**
 * Feed pub/sub helpers
 */
export const FeedPubSub = {
  async notifyNewPost(userId: string, post: any) {
    return publish(Channels.feed(userId), 'new_post', post);
  },

  async notifyPostUpdate(postId: string, update: any) {
    return publish(Channels.post(postId), 'post_update', update);
  },

  async onFeedUpdate(userId: string, handler: MessageHandler) {
    return subscribe(Channels.feed(userId), handler);
  },
};

export default {
  initPubSub,
  publish,
  subscribe,
  psubscribe,
  broadcast,
  Channels,
  ChatPubSub,
  NotificationPubSub,
  PresencePubSub,
  FeedPubSub,
};
