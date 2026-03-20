/**
 * Realtime - WebSocket Cluster
 * Scalable WebSocket server for real-time features
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { createAdapter, RedisAdapter } from '@socket.io/redis-adapter';
import { RedisClient } from '../cache-system/redis';
import http from 'http';
import url from 'url';

const redis = new RedisClient();

// Connection types
type ConnectionType = 'chat' | 'notifications' | 'presence' | 'feed' | 'live';

interface WebSocketConnection {
  ws: WebSocket;
  userId: string;
  connectionId: string;
  connectionType: ConnectionType;
  subscriptions: Set<string>;
  metadata: {
    device?: string;
    platform?: string;
    version?: string;
    ip?: string;
    connectedAt: Date;
    lastPing: Date;
  };
}

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  messageId?: string;
}

interface PresenceInfo {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  device: string;
}

// Active connections
const connections = new Map<WebSocket, WebSocketConnection>();
const userConnections = new Map<string, Set<WebSocket>>();

// Pub/Sub channels
const CHANNELS = {
  chat: 'ws:chat',
  notifications: 'ws:notifications',
  presence: 'ws:presence',
  feed: 'ws:feed',
  live: 'ws:live',
};

/**
 * Create WebSocket server
 */
export function createWebSocketCluster(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    verifyClient: verifyClientCallback,
  });

  // Setup Redis Pub/Sub for horizontal scaling
  setupRedisPubSub();

  wss.on('connection', (ws, req) => {
    handleConnection(ws, req);
  });

  // Heartbeat interval
  setInterval(() => {
    wss.clients.forEach((ws) => {
      const conn = connections.get(ws);
      if (!conn) return;

      const now = Date.now();
      const lastPing = conn.metadata.lastPing.getTime();

      if (now - lastPing > 60000) {
        // 60 seconds timeout
        ws.close(4001, 'Ping timeout');
        return;
      }

      ws.ping();
    });
  }, 30000); // Check every 30 seconds

  return wss;
}

/**
 * Verify client connection
 */
function verifyClientCallback(info: { req: http.IncomingMessage; origin: string }, callback: (res: boolean, code?: number, message?: string) => void) {
  const parsedUrl = url.parse(info.req.url || '', true);
  const token = parsedUrl.query.token as string;
  const connectionType = (parsedUrl.query.type as ConnectionType) || 'chat';

  if (!token) {
    callback(false, 4001, 'Authentication required');
    return;
  }

  // Verify JWT token
  verifyToken(token)
    .then((userId) => {
      if (!userId) {
        callback(false, 4002, 'Invalid token');
        return;
      }

      // Attach verified data to request
      (info.req as any).userId = userId;
      (info.req as any).connectionType = connectionType;

      callback(true);
    })
    .catch(() => {
      callback(false, 4003, 'Token verification failed');
    });
}

/**
 * Handle new WebSocket connection
 */
function handleConnection(ws: WebSocket, req: http.IncomingMessage) {
  const userId = (req as any).userId;
  const connectionType = (req as any).connectionType;
  const connectionId = generateConnectionId();

  const connection: WebSocketConnection = {
    ws,
    userId,
    connectionId,
    connectionType,
    subscriptions: new Set(),
    metadata: {
      device: req.headers['x-device'] as string,
      platform: req.headers['x-platform'] as string,
      version: req.headers['x-version'] as string,
      ip: req.socket.remoteAddress,
      connectedAt: new Date(),
      lastPing: new Date(),
    },
  };

  connections.set(ws, connection);

  // Track user connections
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId)!.add(ws);

  // Update presence
  updatePresence(userId, 'online');

  // Send connection acknowledgment
  sendMessage(ws, {
    type: 'connection:ack',
    payload: {
      connectionId,
      serverTime: Date.now(),
    },
    timestamp: Date.now(),
  });

  // Setup event handlers
  ws.on('message', (data) => handleMessage(ws, data));
  ws.on('close', () => handleClose(ws));
  ws.on('pong', () => handlePong(ws));
  ws.on('error', (error) => handleError(ws, error));

  console.log(`WebSocket connected: ${userId} (${connectionId})`);
}

/**
 * Handle incoming message
 */
async function handleMessage(ws: WebSocket, data: RawData) {
  const conn = connections.get(ws);
  if (!conn) return;

  try {
    const message: WebSocketMessage = JSON.parse(data.toString());

    // Update last ping
    conn.metadata.lastPing = new Date();

    switch (message.type) {
      case 'ping':
        sendMessage(ws, { type: 'pong', payload: {}, timestamp: Date.now() });
        break;

      case 'subscribe':
        handleSubscribe(conn, message.payload);
        break;

      case 'unsubscribe':
        handleUnsubscribe(conn, message.payload);
        break;

      case 'chat:message':
        await handleChatMessage(conn, message);
        break;

      case 'chat:typing':
        handleTypingIndicator(conn, message.payload);
        break;

      case 'presence:update':
        handlePresenceUpdate(conn, message.payload);
        break;

      case 'notification:read':
        handleNotificationRead(conn, message.payload);
        break;

      case 'feed:reaction':
        handleFeedReaction(conn, message.payload);
        break;

      default:
        sendMessage(ws, {
          type: 'error',
          payload: { error: 'Unknown message type' },
          timestamp: Date.now(),
        });
    }
  } catch (error) {
    console.error('Message handling error:', error);
    sendMessage(ws, {
      type: 'error',
      payload: { error: 'Invalid message format' },
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle connection close
 */
function handleClose(ws: WebSocket) {
  const conn = connections.get(ws);
  if (!conn) return;

  // Remove from connections
  connections.delete(ws);

  // Remove from user connections
  const userConns = userConnections.get(conn.userId);
  if (userConns) {
    userConns.delete(ws);
    if (userConns.size === 0) {
      userConnections.delete(conn.userId);
      // Update presence to offline
      updatePresence(conn.userId, 'offline');
    }
  }

  console.log(`WebSocket disconnected: ${conn.userId} (${conn.connectionId})`);
}

/**
 * Handle pong response
 */
function handlePong(ws: WebSocket) {
  const conn = connections.get(ws);
  if (conn) {
    conn.metadata.lastPing = new Date();
  }
}

/**
 * Handle WebSocket error
 */
function handleError(ws: WebSocket, error: Error) {
  console.error('WebSocket error:', error);
}

/**
 * Handle subscription request
 */
function handleSubscribe(conn: WebSocketConnection, payload: { channels: string[] }) {
  const { channels } = payload;

  channels.forEach((channel) => {
    conn.subscriptions.add(channel);
  });

  sendMessage(conn.ws, {
    type: 'subscribe:ack',
    payload: { channels },
    timestamp: Date.now(),
  });
}

/**
 * Handle unsubscription request
 */
function handleUnsubscribe(conn: WebSocketConnection, payload: { channels: string[] }) {
  const { channels } = payload;

  channels.forEach((channel) => {
    conn.subscriptions.delete(channel);
  });

  sendMessage(conn.ws, {
    type: 'unsubscribe:ack',
    payload: { channels },
    timestamp: Date.now(),
  });
}

/**
 * Handle chat message
 */
async function handleChatMessage(conn: WebSocketConnection, message: WebSocketMessage) {
  const { conversationId, content, mediaIds, replyToId } = message.payload;

  // Save message to database (would call chat-service)
  const savedMessage = await saveChatMessage({
    senderId: conn.userId,
    conversationId,
    content,
    mediaIds,
    replyToId,
  });

  // Publish to Redis for distribution
  await redis.publish(
    `chat:${conversationId}`,
    JSON.stringify({
      type: 'chat:message',
      payload: savedMessage,
      timestamp: Date.now(),
    })
  );

  // Send acknowledgment
  sendMessage(conn.ws, {
    type: 'chat:message:sent',
    payload: savedMessage,
    messageId: message.messageId,
    timestamp: Date.now(),
  });
}

/**
 * Handle typing indicator
 */
function handleTypingIndicator(conn: WebSocketConnection, payload: { conversationId: string }) {
  const { conversationId } = payload;

  // Publish typing indicator
  redis.publish(
    `chat:${conversationId}`,
    JSON.stringify({
      type: 'chat:typing',
      payload: {
        userId: conn.userId,
        conversationId,
      },
      timestamp: Date.now(),
    })
  );
}

/**
 * Handle presence update
 */
function handlePresenceUpdate(conn: WebSocketConnection, payload: { status: string }) {
  updatePresence(conn.userId, payload.status as any);
}

/**
 * Handle notification read
 */
function handleNotificationRead(conn: WebSocketConnection, payload: { notificationIds: string[] }) {
  // Mark notifications as read
  markNotificationsRead(conn.userId, payload.notificationIds);
}

/**
 * Handle feed reaction
 */
function handleFeedReaction(conn: WebSocketConnection, payload: { postId: string; reaction: string }) {
  // Process reaction
  processReaction(conn.userId, payload.postId, payload.reaction);

  // Broadcast to feed subscribers
  redis.publish(
    'feed:reactions',
    JSON.stringify({
      type: 'feed:reaction',
      payload: {
        userId: conn.userId,
        postId: payload.postId,
        reaction: payload.reaction,
      },
      timestamp: Date.now(),
    })
  );
}

// ==================== Helper Functions ====================

function sendMessage(ws: WebSocket, message: WebSocketMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function verifyToken(token: string): Promise<string | null> {
  try {
    // Verify JWT and return user ID
    // In production, use actual JWT verification
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return decoded.userId || null;
  } catch {
    return null;
  }
}

async function setupRedisPubSub() {
  // Subscribe to all channels
  const subscriber = redis.duplicate();

  for (const channel of Object.values(CHANNELS)) {
    await subscriber.subscribe(channel);
  }

  subscriber.on('message', (channel, message) => {
    handleRedisMessage(channel, message);
  });
}

function handleRedisMessage(channel: string, message: string) {
  const parsed: WebSocketMessage = JSON.parse(message);

  // Find connections subscribed to this channel
  connections.forEach((conn) => {
    if (conn.subscriptions.has(channel)) {
      sendMessage(conn.ws, parsed);
    }
  });
}

async function updatePresence(userId: string, status: PresenceInfo['status']) {
  const presence: PresenceInfo = {
    userId,
    status,
    lastSeen: new Date(),
    device: 'web',
  };

  await redis.hset('presence', userId, JSON.stringify(presence));

  // Notify presence subscribers
  await redis.publish(
    CHANNELS.presence,
    JSON.stringify({
      type: 'presence:update',
      payload: presence,
      timestamp: Date.now(),
    })
  );
}

async function saveChatMessage(data: any): Promise<any> {
  // Would save to chat-service database
  return {
    id: `msg_${Date.now()}`,
    ...data,
    createdAt: new Date(),
  };
}

async function markNotificationsRead(userId: string, notificationIds: string[]) {
  // Would update notification-service
  console.log(`Marking notifications read: ${notificationIds.join(', ')}`);
}

async function processReaction(userId: string, postId: string, reaction: string) {
  // Would update reaction-service
  console.log(`Processing reaction: ${reaction} on ${postId} by ${userId}`);
}

/**
 * Broadcast to all connections of a user
 */
export function broadcastToUser(userId: string, message: WebSocketMessage) {
  const userConns = userConnections.get(userId);
  if (userConns) {
    userConns.forEach((ws) => sendMessage(ws, message));
  }
}

/**
 * Broadcast to all connections in a channel
 */
export function broadcastToChannel(channel: string, message: WebSocketMessage) {
  redis.publish(channel, JSON.stringify(message));
}

export default {
  createWebSocketCluster,
  broadcastToUser,
  broadcastToChannel,
};
