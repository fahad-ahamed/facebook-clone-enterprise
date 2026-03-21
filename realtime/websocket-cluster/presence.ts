/**
 * Presence Manager
 * Manages online/offline status and user presence
 * 
 * Features:
 * - Real-time presence tracking
 * - Multi-device support
 * - Status broadcasting
 * - Presence history
 * - Idle detection
 * - Custom status support
 */

import { Redis } from 'ioredis';
import { Logger } from '../../services/observability/index';

type PresenceStatus = 'online' | 'offline' | 'away' | 'busy' | 'invisible';

interface PresenceInfo {
  userId: string;
  status: PresenceStatus;
  lastSeen: number;
  devices: DeviceInfo[];
  customStatus?: CustomStatus;
}

interface DeviceInfo {
  deviceId: string;
  deviceType: 'web' | 'mobile' | 'desktop' | 'tablet';
  socketId: string;
  clientVersion?: string;
  connectedAt: number;
  lastActivity: number;
  ip?: string;
  location?: string;
}

interface CustomStatus {
  text: string;
  emoji?: string;
  expiresAt?: number;
}

interface PresenceSubscription {
  subscriberId: string;
  callback: (presence: PresenceInfo) => void;
}

export class PresenceManager {
  private redis: Redis;
  private pubClient: Redis;
  private subClient: Redis;
  private presenceCache: Map<string, PresenceInfo> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private userDevices: Map<string, Map<string, DeviceInfo>> = new Map();
  private idleCheckInterval: NodeJS.Timeout | null = null;
  private readonly keyPrefix = 'presence:';
  private readonly statusChannel = 'presence:updates';
  private idleTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(pubClient?: Redis, subClient?: Redis) {
    this.redis = pubClient || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.pubClient = pubClient || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.subClient = subClient || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.initialize();
  }

  /**
   * Initialize presence manager
   */
  private async initialize(): Promise<void> {
    // Subscribe to presence updates from other instances
    await this.subClient.subscribe(this.statusChannel);
    
    this.subClient.on('message', (channel, message) => {
      if (channel === this.statusChannel) {
        this.handlePresenceUpdate(JSON.parse(message));
      }
    });

    // Start idle check interval
    this.startIdleCheck();

    Logger.info('Presence manager initialized');
  }

  /**
   * Set user online
   */
  async setUserOnline(
    userId: string,
    deviceInfo: {
      socketId: string;
      deviceId?: string;
      deviceType?: DeviceInfo['deviceType'];
      clientVersion?: string;
      ip?: string;
    }
  ): Promise<PresenceInfo> {
    const now = Date.now();
    const deviceId = deviceInfo.deviceId || 'default';

    // Get or create presence info
    let presence = await this.getPresence(userId);
    
    if (!presence) {
      presence = {
        userId,
        status: 'online',
        lastSeen: now,
        devices: [],
      };
    }

    // Add or update device
    const device: DeviceInfo = {
      deviceId,
      deviceType: deviceInfo.deviceType || 'web',
      socketId: deviceInfo.socketId,
      clientVersion: deviceInfo.clientVersion,
      connectedAt: now,
      lastActivity: now,
      ip: deviceInfo.ip,
    };

    // Track in user devices map
    if (!this.userDevices.has(userId)) {
      this.userDevices.set(userId, new Map());
    }
    this.userDevices.get(userId)!.set(deviceId, device);

    // Update presence devices list
    const existingDeviceIndex = presence.devices.findIndex(d => d.deviceId === deviceId);
    if (existingDeviceIndex >= 0) {
      presence.devices[existingDeviceIndex] = device;
    } else {
      presence.devices.push(device);
    }

    // Update status if not invisible
    if (presence.status !== 'invisible') {
      presence.status = 'online';
    }
    presence.lastSeen = now;

    // Cache and persist
    this.presenceCache.set(userId, presence);
    await this.persistPresence(presence);

    // Broadcast update
    await this.broadcastPresenceUpdate(presence);

    Logger.debug(`User ${userId} is online (device: ${deviceId})`);

    return presence;
  }

  /**
   * Set user offline
   */
  async setUserOffline(userId: string, deviceId?: string): Promise<PresenceInfo | null> {
    const now = Date.now();
    let presence = await this.getPresence(userId);

    if (!presence) {
      return null;
    }

    // Remove specific device or all devices
    if (deviceId) {
      presence.devices = presence.devices.filter(d => d.deviceId !== deviceId);
      this.userDevices.get(userId)?.delete(deviceId);
    } else {
      presence.devices = [];
      this.userDevices.delete(userId);
    }

    // Update status if no more devices
    if (presence.devices.length === 0) {
      presence.status = 'offline';
      this.presenceCache.delete(userId);
    }

    presence.lastSeen = now;

    // Persist and broadcast
    await this.persistPresence(presence);
    await this.broadcastPresenceUpdate(presence);

    Logger.debug(`User ${userId} is offline (device: ${deviceId || 'all'})`);

    return presence;
  }

  /**
   * Update user status
   */
  async updateStatus(
    userId: string,
    status: PresenceStatus,
    customStatus?: CustomStatus
  ): Promise<PresenceInfo | null> {
    let presence = await this.getPresence(userId);

    if (!presence) {
      // Create presence if doesn't exist
      presence = {
        userId,
        status,
        lastSeen: Date.now(),
        devices: [],
        customStatus,
      };
    } else {
      presence.status = status;
      if (customStatus) {
        presence.customStatus = customStatus;
      }
    }

    // Cache and persist
    this.presenceCache.set(userId, presence);
    await this.persistPresence(presence);
    await this.broadcastPresenceUpdate(presence);

    return presence;
  }

  /**
   * Update device activity
   */
  async updateDeviceActivity(
    userId: string,
    deviceId: string,
    socketId: string
  ): Promise<void> {
    const now = Date.now();
    const devices = this.userDevices.get(userId);
    
    if (devices) {
      const device = devices.get(deviceId);
      if (device) {
        device.lastActivity = now;
        device.socketId = socketId;
        
        // Update presence cache
        const presence = this.presenceCache.get(userId);
        if (presence) {
          const deviceIndex = presence.devices.findIndex(d => d.deviceId === deviceId);
          if (deviceIndex >= 0) {
            presence.devices[deviceIndex].lastActivity = now;
          }
        }
      }
    }
  }

  /**
   * Get user presence
   */
  async getPresence(userId: string): Promise<PresenceInfo | null> {
    // Check cache first
    if (this.presenceCache.has(userId)) {
      return this.presenceCache.get(userId) || null;
    }

    // Check Redis
    try {
      const data = await this.redis.hgetall(`${this.keyPrefix}${userId}`);
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      const presence: PresenceInfo = {
        userId,
        status: (data.status as PresenceStatus) || 'offline',
        lastSeen: parseInt(data.lastSeen) || 0,
        devices: data.devices ? JSON.parse(data.devices) : [],
        customStatus: data.customStatus ? JSON.parse(data.customStatus) : undefined,
      };

      // Cache it
      this.presenceCache.set(userId, presence);

      return presence;
    } catch (error) {
      Logger.error('Error getting presence:', error);
      return null;
    }
  }

  /**
   * Get multiple users' presence
   */
  async getPresenceBatch(userIds: string[]): Promise<Map<string, PresenceInfo>> {
    const results = new Map<string, PresenceInfo>();

    // Use pipeline for batch get
    const pipeline = this.redis.pipeline();
    for (const userId of userIds) {
      pipeline.hgetall(`${this.keyPrefix}${userId}`);
    }

    const responses = await pipeline.exec();

    for (let i = 0; i < userIds.length; i++) {
      const [err, data] = responses![i];
      if (!err && data && Object.keys(data as object).length > 0) {
        const presenceData = data as Record<string, string>;
        results.set(userIds[i], {
          userId: userIds[i],
          status: (presenceData.status as PresenceStatus) || 'offline',
          lastSeen: parseInt(presenceData.lastSeen) || 0,
          devices: presenceData.devices ? JSON.parse(presenceData.devices) : [],
          customStatus: presenceData.customStatus
            ? JSON.parse(presenceData.customStatus)
            : undefined,
        });
      }
    }

    return results;
  }

  /**
   * Get online users count
   */
  getOnlineCount(): number {
    let count = 0;
    for (const presence of this.presenceCache.values()) {
      if (presence.status === 'online' || presence.status === 'away' || presence.status === 'busy') {
        count++;
      }
    }
    return count;
  }

  /**
   * Get friends presence
   */
  async getFriendsPresence(friendIds: string[]): Promise<PresenceInfo[]> {
    const presenceMap = await this.getPresenceBatch(friendIds);
    return Array.from(presenceMap.values());
  }

  /**
   * Subscribe to presence updates
   */
  async subscribe(
    subscriberId: string,
    userIds: string[],
    callback: (presence: PresenceInfo) => void
  ): Promise<void> {
    for (const userId of userIds) {
      if (!this.subscriptions.has(userId)) {
        this.subscriptions.set(userId, new Set());
      }
      this.subscriptions.get(userId)!.add(subscriberId);
    }
  }

  /**
   * Unsubscribe from presence updates
   */
  async unsubscribe(subscriberId: string, userIds?: string[]): Promise<void> {
    if (userIds) {
      for (const userId of userIds) {
        this.subscriptions.get(userId)?.delete(subscriberId);
      }
    } else {
      // Unsubscribe from all
      for (const subscribers of this.subscriptions.values()) {
        subscribers.delete(subscriberId);
      }
    }
  }

  /**
   * Persist presence to Redis
   */
  private async persistPresence(presence: PresenceInfo): Promise<void> {
    const key = `${this.keyPrefix}${presence.userId}`;
    
    await this.redis.hset(key, {
      status: presence.status,
      lastSeen: presence.lastSeen.toString(),
      devices: JSON.stringify(presence.devices),
      customStatus: presence.customStatus ? JSON.stringify(presence.customStatus) : '',
    });

    // Set expiration for offline users
    if (presence.status === 'offline') {
      await this.redis.expire(key, 86400); // 24 hours
    }
  }

  /**
   * Broadcast presence update
   */
  private async broadcastPresenceUpdate(presence: PresenceInfo): Promise<void> {
    // Publish to Redis for other instances
    await this.pubClient.publish(this.statusChannel, JSON.stringify(presence));

    // Notify local subscribers
    const subscribers = this.subscriptions.get(presence.userId);
    if (subscribers) {
      // In a real implementation, this would send to connected clients
      Logger.debug(`Notifying ${subscribers.size} subscribers of ${presence.userId} presence`);
    }
  }

  /**
   * Handle presence update from other instances
   */
  private handlePresenceUpdate(presence: PresenceInfo): void {
    // Update cache
    this.presenceCache.set(presence.userId, presence);
    
    Logger.debug(`Received presence update for ${presence.userId}: ${presence.status}`);
  }

  /**
   * Start idle check interval
   */
  private startIdleCheck(): void {
    this.idleCheckInterval = setInterval(() => {
      this.checkIdleUsers();
    }, 60000); // Check every minute
  }

  /**
   * Check for idle users
   */
  private async checkIdleUsers(): Promise<void> {
    const now = Date.now();

    for (const [userId, devices] of this.userDevices) {
      for (const [deviceId, device] of devices) {
        const idleTime = now - device.lastActivity;

        // Mark as away if idle
        if (idleTime > this.idleTimeout) {
          const presence = this.presenceCache.get(userId);
          if (presence && presence.status === 'online') {
            presence.status = 'away';
            await this.persistPresence(presence);
            await this.broadcastPresenceUpdate(presence);
            Logger.debug(`User ${userId} marked as away (idle: ${Math.round(idleTime / 1000)}s)`);
          }
        }
      }
    }
  }

  /**
   * Set custom status
   */
  async setCustomStatus(
    userId: string,
    customStatus: CustomStatus | null
  ): Promise<PresenceInfo | null> {
    const presence = await this.getPresence(userId);
    
    if (!presence) {
      return null;
    }

    presence.customStatus = customStatus || undefined;

    this.presenceCache.set(userId, presence);
    await this.persistPresence(presence);
    await this.broadcastPresenceUpdate(presence);

    return presence;
  }

  /**
   * Get presence statistics
   */
  getPresenceStats(): {
    total: number;
    online: number;
    away: number;
    busy: number;
    offline: number;
    invisible: number;
    totalDevices: number;
  } {
    const stats = {
      total: 0,
      online: 0,
      away: 0,
      busy: 0,
      offline: 0,
      invisible: 0,
      totalDevices: 0,
    };

    for (const presence of this.presenceCache.values()) {
      stats.total++;
      stats.totalDevices += presence.devices.length;
      
      switch (presence.status) {
        case 'online':
          stats.online++;
          break;
        case 'away':
          stats.away++;
          break;
        case 'busy':
          stats.busy++;
          break;
        case 'offline':
          stats.offline++;
          break;
        case 'invisible':
          stats.invisible++;
          break;
      }
    }

    return stats;
  }

  /**
   * Clear presence cache
   */
  clearCache(): void {
    this.presenceCache.clear();
    this.userDevices.clear();
  }

  /**
   * Shutdown presence manager
   */
  async shutdown(): Promise<void> {
    // Stop idle check
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }

    // Unsubscribe from Redis
    await this.subClient.unsubscribe(this.statusChannel);
    await this.subClient.quit();
    await this.pubClient.quit();

    Logger.info('Presence manager shutdown complete');
  }

  /**
   * Force refresh presence from Redis
   */
  async refreshPresence(userId: string): Promise<PresenceInfo | null> {
    this.presenceCache.delete(userId);
    return this.getPresence(userId);
  }

  /**
   * Get active users in a time window
   */
  async getActiveUsers(since: number): Promise<string[]> {
    const activeUsers: string[] = [];
    
    for (const presence of this.presenceCache.values()) {
      if (presence.lastSeen >= since) {
        activeUsers.push(presence.userId);
      }
    }

    return activeUsers;
  }
}

export { PresenceStatus, PresenceInfo, DeviceInfo, CustomStatus };
