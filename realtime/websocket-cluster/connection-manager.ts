/**
 * Connection Manager
 * Manages WebSocket connections, rate limiting, and connection pooling
 * 
 * Features:
 * - Connection tracking and limits
 * - IP-based rate limiting
 * - User session management
 * - Connection health monitoring
 * - Automatic cleanup of stale connections
 */

import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { Logger } from '../../services/observability/index';

interface ConnectionInfo {
  socketId: string;
  userId: string;
  sessionId: string;
  deviceId?: string;
  ip: string;
  userAgent?: string;
  connectedAt: Date;
  lastActivity: Date;
  bytesReceived: number;
  bytesSent: number;
  messagesReceived: number;
  messagesSent: number;
}

interface ConnectionLimits {
  maxConnectionsPerIp: number;
  maxConnectionsPerUser: number;
  connectionThrottlePerMinute: number;
  messageRateLimit: number;
}

const defaultLimits: ConnectionLimits = {
  maxConnectionsPerIp: 10,
  maxConnectionsPerUser: 5,
  connectionThrottlePerMinute: 100,
  messageRateLimit: 1000,
};

export class ConnectionManager {
  private io: Server;
  private redis: Redis;
  private connections: Map<string, ConnectionInfo> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private ipConnections: Map<string, Set<string>> = new Map();
  private limits: ConnectionLimits;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly keyPrefix = 'ws:conn:';

  constructor(io: Server, maxConnections: number = 100000, redis?: Redis) {
    this.io = io;
    this.redis = redis || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.limits = {
      ...defaultLimits,
      maxConnectionsPerIp: parseInt(process.env.MAX_CONN_PER_IP || '10', 10),
      maxConnectionsPerUser: parseInt(process.env.MAX_CONN_PER_USER || '5', 10),
    };
  }

  /**
   * Register a new connection
   */
  async registerConnection(
    socket: Socket,
    userId: string,
    sessionId: string
  ): Promise<void> {
    const socketId = socket.id;
    const ip = this.getClientIp(socket);
    const userAgent = socket.handshake.headers['user-agent'];

    const connectionInfo: ConnectionInfo = {
      socketId,
      userId,
      sessionId,
      deviceId: socket.handshake.auth?.deviceId,
      ip,
      userAgent,
      connectedAt: new Date(),
      lastActivity: new Date(),
      bytesReceived: 0,
      bytesSent: 0,
      messagesReceived: 0,
      messagesSent: 0,
    };

    // Store in memory
    this.connections.set(socketId, connectionInfo);

    // Track by user
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(socketId);

    // Track by IP
    if (!this.ipConnections.has(ip)) {
      this.ipConnections.set(ip, new Set());
    }
    this.ipConnections.get(ip)!.add(socketId);

    // Store in Redis for distributed systems
    await this.redis.hset(
      `${this.keyPrefix}socket:${socketId}`,
      {
        userId,
        sessionId,
        ip,
        connectedAt: Date.now(),
        deviceId: connectionInfo.deviceId || '',
      }
    );

    // Add to user's socket set in Redis
    await this.redis.sadd(`${this.keyPrefix}user:${userId}:sockets`, socketId);

    // Set expiration for cleanup
    await this.redis.expire(`${this.keyPrefix}socket:${socketId}`, 86400); // 24 hours

    Logger.debug(`Connection registered: ${socketId} for user ${userId}`);

    // Start cleanup if not running
    if (!this.cleanupInterval) {
      this.startCleanupInterval();
    }
  }

  /**
   * Unregister a connection
   */
  async unregisterConnection(socketId: string, userId: string): Promise<void> {
    const connectionInfo = this.connections.get(socketId);
    
    if (!connectionInfo) {
      return;
    }

    // Remove from memory
    this.connections.delete(socketId);

    // Remove from user connections
    const userSockets = this.userConnections.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    // Remove from IP connections
    const ipSockets = this.ipConnections.get(connectionInfo.ip);
    if (ipSockets) {
      ipSockets.delete(socketId);
      if (ipSockets.size === 0) {
        this.ipConnections.delete(connectionInfo.ip);
      }
    }

    // Remove from Redis
    await this.redis.del(`${this.keyPrefix}socket:${socketId}`);
    await this.redis.srem(`${this.keyPrefix}user:${userId}:sockets`, socketId);

    Logger.debug(`Connection unregistered: ${socketId}`);
  }

  /**
   * Check if IP is within connection limit
   */
  async checkConnectionLimit(ip: string): Promise<boolean> {
    const ipSocketCount = this.ipConnections.get(ip)?.size || 0;
    
    if (ipSocketCount >= this.limits.maxConnectionsPerIp) {
      Logger.warn(`IP ${ip} exceeded connection limit: ${ipSocketCount}`);
      return false;
    }

    // Check rate limit for new connections from this IP
    const rateKey = `${this.keyPrefix}rate:${ip}`;
    const count = await this.redis.incr(rateKey);
    
    if (count === 1) {
      await this.redis.expire(rateKey, 60); // 1 minute window
    }

    if (count > this.limits.connectionThrottlePerMinute) {
      Logger.warn(`IP ${ip} rate limited: ${count} connections/minute`);
      return false;
    }

    return true;
  }

  /**
   * Check if user is within connection limit
   */
  async checkUserConnectionLimit(userId: string): Promise<boolean> {
    const userSocketCount = this.userConnections.get(userId)?.size || 0;
    
    if (userSocketCount >= this.limits.maxConnectionsPerUser) {
      Logger.warn(`User ${userId} exceeded connection limit: ${userSocketCount}`);
      return false;
    }

    return true;
  }

  /**
   * Get client IP from socket
   */
  private getClientIp(socket: Socket): string {
    const handshake = socket.handshake;
    return (
      handshake.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      handshake.headers['x-real-ip'] ||
      handshake.address ||
      'unknown'
    );
  }

  /**
   * Check if user has other active sessions
   */
  async hasOtherSessions(userId: string, excludeSocketId: string): Promise<boolean> {
    const userSockets = this.userConnections.get(userId);
    if (!userSockets) return false;

    for (const socketId of userSockets) {
      if (socketId !== excludeSocketId) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all socket IDs for a user
   */
  getUserSockets(userId: string): string[] {
    return Array.from(this.userConnections.get(userId) || []);
  }

  /**
   * Send message to a specific user (all their sockets)
   */
  async sendToUser(userId: string, event: string, data: any): Promise<number> {
    const socketIds = this.getUserSockets(userId);
    let sent = 0;

    for (const socketId of socketIds) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
        sent++;
      }
    }

    return sent;
  }

  /**
   * Send message to multiple users
   */
  async sendToUsers(userIds: string[], event: string, data: any): Promise<number> {
    let totalSent = 0;

    for (const userId of userIds) {
      totalSent += await this.sendToUser(userId, event, data);
    }

    return totalSent;
  }

  /**
   * Get connection info
   */
  getConnection(socketId: string): ConnectionInfo | undefined {
    return this.connections.get(socketId);
  }

  /**
   * Get all connections for a user
   */
  getUserConnections(userId: string): ConnectionInfo[] {
    const socketIds = this.userConnections.get(userId) || new Set();
    const connections: ConnectionInfo[] = [];

    for (const socketId of socketIds) {
      const conn = this.connections.get(socketId);
      if (conn) {
        connections.push(conn);
      }
    }

    return connections;
  }

  /**
   * Update connection activity
   */
  updateActivity(socketId: string): void {
    const conn = this.connections.get(socketId);
    if (conn) {
      conn.lastActivity = new Date();
    }
  }

  /**
   * Track message statistics
   */
  trackMessage(socketId: string, direction: 'in' | 'out', bytes: number): void {
    const conn = this.connections.get(socketId);
    if (conn) {
      if (direction === 'in') {
        conn.messagesReceived++;
        conn.bytesReceived += bytes;
      } else {
        conn.messagesSent++;
        conn.bytesSent += bytes;
      }
    }
  }

  /**
   * Get total connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connection counts by dimension
   */
  getConnectionStats(): {
    total: number;
    byIp: { ip: string; count: number }[];
    byUser: { userId: string; count: number }[];
  } {
    const byIp = Array.from(this.ipConnections.entries())
      .map(([ip, sockets]) => ({ ip, count: sockets.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const byUser = Array.from(this.userConnections.entries())
      .map(([userId, sockets]) => ({ userId, count: sockets.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: this.connections.size,
      byIp,
      byUser,
    };
  }

  /**
   * Disconnect all connections
   */
  async disconnectAll(reason: string = 'Server shutdown'): Promise<void> {
    Logger.info(`Disconnecting all connections. Reason: ${reason}`);

    for (const [socketId, socket] of this.io.sockets.sockets) {
      socket.emit('server:disconnect', { reason });
      socket.disconnect(true);
    }

    // Clear all tracking
    this.connections.clear();
    this.userConnections.clear();
    this.ipConnections.clear();

    // Clear Redis keys
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Disconnect user from all sessions
   */
  async disconnectUser(userId: string, reason: string = 'Session invalidated'): Promise<void> {
    const socketIds = this.getUserSockets(userId);

    for (const socketId of socketIds) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('server:disconnect', { reason });
        socket.disconnect(true);
      }
    }
  }

  /**
   * Start cleanup interval for stale connections
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000); // Every minute
  }

  /**
   * Cleanup stale connections
   */
  private async cleanupStaleConnections(): Promise<void> {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const staleSockets: string[] = [];

    for (const [socketId, conn] of this.connections) {
      const timeSinceActivity = now - conn.lastActivity.getTime();
      
      // Check if socket is still connected
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket || !socket.connected) {
        staleSockets.push(socketId);
        continue;
      }

      // Check for inactive connections
      if (timeSinceActivity > staleThreshold) {
        // Send ping to check if still alive
        socket.emit('ping', Date.now());
      }
    }

    // Remove stale connections
    for (const socketId of staleSockets) {
      const conn = this.connections.get(socketId);
      if (conn) {
        await this.unregisterConnection(socketId, conn.userId);
      }
    }

    if (staleSockets.length > 0) {
      Logger.debug(`Cleaned up ${staleSockets.length} stale connections`);
    }
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Check rate limit for messages
   */
  async checkMessageRateLimit(userId: string): Promise<boolean> {
    const rateKey = `${this.keyPrefix}msg:${userId}`;
    const count = await this.redis.incr(rateKey);
    
    if (count === 1) {
      await this.redis.expire(rateKey, 60); // 1 minute window
    }

    return count <= this.limits.messageRateLimit;
  }

  /**
   * Get connection health metrics
   */
  getHealthMetrics(): {
    totalConnections: number;
    uniqueUsers: number;
    uniqueIps: number;
    averageMessagesPerConnection: number;
    averageBytesPerConnection: number;
  } {
    let totalMessages = 0;
    let totalBytes = 0;

    for (const conn of this.connections.values()) {
      totalMessages += conn.messagesReceived + conn.messagesSent;
      totalBytes += conn.bytesReceived + conn.bytesSent;
    }

    const count = this.connections.size || 1;

    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      uniqueIps: this.ipConnections.size,
      averageMessagesPerConnection: totalMessages / count,
      averageBytesPerConnection: totalBytes / count,
    };
  }
}

export { ConnectionInfo, ConnectionLimits };
