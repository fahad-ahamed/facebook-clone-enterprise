/**
 * Room Manager
 * Manages chat rooms, notification rooms, and group rooms
 * 
 * Features:
 * - Room creation and deletion
 * - Member management
 * - Message broadcasting
 * - Room persistence
 * - Access control
 * - Room statistics
 */

import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { Logger } from '../../services/observability/index';

type RoomType = 'chat' | 'group' | 'notification' | 'feed' | 'call';

interface RoomInfo {
  id: string;
  type: RoomType;
  name?: string;
  createdAt: Date;
  createdBy?: string;
  memberCount: number;
  maxMembers?: number;
  isPrivate: boolean;
  metadata?: Record<string, any>;
}

interface RoomMember {
  userId: string;
  socketId: string;
  joinedAt: Date;
  role: 'member' | 'admin' | 'moderator';
}

interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: any;
  type: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class RoomManager {
  private io: Server;
  private redis: Redis;
  private rooms: Map<string, RoomInfo> = new Map();
  private roomMembers: Map<string, Map<string, RoomMember>> = new Map();
  private userRooms: Map<string, Set<string>> = new Map();
  private readonly keyPrefix = 'ws:room:';
  private messageHistorySize = 100;

  constructor(io: Server, redis?: Redis) {
    this.io = io;
    this.redis = redis || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.initialize();
  }

  /**
   * Initialize room manager
   */
  private async initialize(): Promise<void> {
    // Load persisted rooms from Redis
    await this.loadPersistedRooms();
    
    Logger.info('Room manager initialized');
  }

  /**
   * Load persisted rooms from Redis
   */
  private async loadPersistedRooms(): Promise<void> {
    try {
      const roomKeys = await this.redis.keys(`${this.keyPrefix}info:*`);
      
      for (const key of roomKeys) {
        const roomData = await this.redis.hgetall(key);
        if (roomData) {
          const roomId = key.replace(`${this.keyPrefix}info:`, '');
          this.rooms.set(roomId, {
            id: roomId,
            type: roomData.type as RoomType,
            name: roomData.name,
            createdAt: new Date(parseInt(roomData.createdAt)),
            createdBy: roomData.createdBy,
            memberCount: parseInt(roomData.memberCount),
            isPrivate: roomData.isPrivate === 'true',
            metadata: roomData.metadata ? JSON.parse(roomData.metadata) : {},
          });
        }
      }

      Logger.info(`Loaded ${this.rooms.size} persisted rooms`);
    } catch (error) {
      Logger.error('Error loading persisted rooms:', error);
    }
  }

  /**
   * Create a new room
   */
  async createRoom(
    roomId: string,
    type: RoomType,
    options: {
      name?: string;
      createdBy?: string;
      maxMembers?: number;
      isPrivate?: boolean;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<RoomInfo> {
    if (this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} already exists`);
    }

    const roomInfo: RoomInfo = {
      id: roomId,
      type,
      name: options.name,
      createdAt: new Date(),
      createdBy: options.createdBy,
      memberCount: 0,
      maxMembers: options.maxMembers,
      isPrivate: options.isPrivate ?? false,
      metadata: options.metadata,
    };

    // Store in memory
    this.rooms.set(roomId, roomInfo);
    this.roomMembers.set(roomId, new Map());

    // Persist to Redis
    await this.persistRoom(roomInfo);

    Logger.info(`Room created: ${roomId} (type: ${type})`);

    return roomInfo;
  }

  /**
   * Persist room to Redis
   */
  private async persistRoom(room: RoomInfo): Promise<void> {
    await this.redis.hset(`${this.keyPrefix}info:${room.id}`, {
      type: room.type,
      name: room.name || '',
      createdAt: room.createdAt.getTime().toString(),
      createdBy: room.createdBy || '',
      memberCount: room.memberCount.toString(),
      isPrivate: room.isPrivate.toString(),
      metadata: JSON.stringify(room.metadata || {}),
    });
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    // Remove all members from socket.io room
    const ioRoom = this.io.sockets.adapter.rooms.get(roomId);
    if (ioRoom) {
      for (const socketId of ioRoom) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.leave(roomId);
        }
      }
    }

    // Cleanup memory
    this.rooms.delete(roomId);
    this.roomMembers.delete(roomId);

    // Remove user room mappings
    for (const [userId, rooms] of this.userRooms) {
      rooms.delete(roomId);
      if (rooms.size === 0) {
        this.userRooms.delete(userId);
      }
    }

    // Remove from Redis
    await this.redis.del(`${this.keyPrefix}info:${roomId}`);
    await this.redis.del(`${this.keyPrefix}members:${roomId}`);
    await this.redis.del(`${this.keyPrefix}history:${roomId}`);

    Logger.info(`Room deleted: ${roomId}`);
  }

  /**
   * Join a socket to a room
   */
  async joinRoom(
    socket: Socket,
    roomId: string,
    userId: string,
    role: 'member' | 'admin' | 'moderator' = 'member'
  ): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} does not exist`);
    }

    // Check max members limit
    if (room.maxMembers && room.memberCount >= room.maxMembers) {
      throw new Error(`Room ${roomId} is full`);
    }

    // Join Socket.IO room
    await socket.join(roomId);

    // Track member
    const member: RoomMember = {
      userId,
      socketId: socket.id,
      joinedAt: new Date(),
      role,
    };

    if (!this.roomMembers.has(roomId)) {
      this.roomMembers.set(roomId, new Map());
    }
    this.roomMembers.get(roomId)!.set(socket.id, member);

    // Track user's rooms
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId)!.add(roomId);

    // Update member count
    room.memberCount = this.roomMembers.get(roomId)!.size;
    await this.persistRoom(room);

    // Store in Redis
    await this.redis.hset(`${this.keyPrefix}members:${roomId}`, socket.id, JSON.stringify(member));

    // Notify room about new member
    this.broadcastToRoom(roomId, {
      type: 'room:member_joined',
      data: { userId, socketId: socket.id, role },
    }, socket.id);

    Logger.debug(`User ${userId} joined room ${roomId}`);
  }

  /**
   * Leave a room
   */
  async leaveRoom(socket: Socket, roomId: string, userId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    const members = this.roomMembers.get(roomId);

    if (!room || !members) {
      return;
    }

    // Leave Socket.IO room
    await socket.leave(roomId);

    // Remove member tracking
    members.delete(socket.id);

    // Update user's rooms
    const userRoomSet = this.userRooms.get(userId);
    if (userRoomSet) {
      userRoomSet.delete(roomId);
      if (userRoomSet.size === 0) {
        this.userRooms.delete(userId);
      }
    }

    // Update member count
    room.memberCount = members.size;
    await this.persistRoom(room);

    // Remove from Redis
    await this.redis.hdel(`${this.keyPrefix}members:${roomId}`, socket.id);

    // Notify room about member leaving
    this.broadcastToRoom(roomId, {
      type: 'room:member_left',
      data: { userId, socketId: socket.id },
    });

    // Delete room if empty and not persistent
    if (members.size === 0 && room.type !== 'notification') {
      await this.deleteRoom(roomId);
    }

    Logger.debug(`User ${userId} left room ${roomId}`);
  }

  /**
   * Leave all rooms
   */
  async leaveAllRooms(socket: Socket): Promise<void> {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    
    for (const roomId of rooms) {
      const members = this.roomMembers.get(roomId);
      const member = members?.get(socket.id);
      
      if (member) {
        await this.leaveRoom(socket, roomId, member.userId);
      }
    }
  }

  /**
   * Broadcast message to a room
   */
  broadcastToRoom(
    roomId: string,
    message: any,
    excludeSocketId?: string
  ): void {
    const event = message.type || 'room:message';
    
    if (excludeSocketId) {
      this.io.to(roomId).except(excludeSocketId).emit(event, message);
    } else {
      this.io.to(roomId).emit(event, message);
    }

    // Store in history
    this.storeMessage(roomId, {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      senderId: excludeSocketId || 'system',
      content: message,
      type: event,
      timestamp: Date.now(),
    });
  }

  /**
   * Store message in room history
   */
  private async storeMessage(roomId: string, message: RoomMessage): Promise<void> {
    try {
      const key = `${this.keyPrefix}history:${roomId}`;
      await this.redis.rpush(key, JSON.stringify(message));
      await this.redis.ltrim(key, -this.messageHistorySize, -1);
    } catch (error) {
      Logger.error('Error storing message:', error);
    }
  }

  /**
   * Get room message history
   */
  async getRoomHistory(roomId: string, limit: number = 50): Promise<RoomMessage[]> {
    try {
      const key = `${this.keyPrefix}history:${roomId}`;
      const messages = await this.redis.lrange(key, -limit, -1);
      return messages.map(m => JSON.parse(m));
    } catch (error) {
      Logger.error('Error getting room history:', error);
      return [];
    }
  }

  /**
   * Broadcast to chat room
   */
  async broadcastToChatRoom(
    conversationId: string,
    message: any,
    excludeSocketId?: string
  ): Promise<void> {
    const roomId = `chat:${conversationId}`;
    this.broadcastToRoom(roomId, message, excludeSocketId);
  }

  /**
   * Join chat room
   */
  async joinChatRoom(socket: Socket, conversationId: string): Promise<void> {
    const roomId = `chat:${conversationId}`;
    
    // Create room if doesn't exist
    if (!this.rooms.has(roomId)) {
      await this.createRoom(roomId, 'chat', {
        name: `Chat: ${conversationId}`,
      });
    }

    const userId = (socket.data as any).userId;
    await this.joinRoom(socket, roomId, userId);
  }

  /**
   * Leave chat room
   */
  async leaveChatRoom(socket: Socket, conversationId: string): Promise<void> {
    const roomId = `chat:${conversationId}`;
    const userId = (socket.data as any).userId;
    await this.leaveRoom(socket, roomId, userId);
  }

  /**
   * Check chat access
   */
  async checkChatAccess(userId: string, conversationId: string): Promise<boolean> {
    // In production, this would check the database or cache
    // For now, return true for demo
    try {
      const response = await fetch(
        `${process.env.CHAT_SERVICE_URL}/conversations/${conversationId}/access/${userId}`
      );
      return response.ok;
    } catch {
      return true; // Default allow for demo
    }
  }

  /**
   * Join notification room
   */
  async joinNotificationRoom(socket: Socket, userId: string): Promise<void> {
    const roomId = `notifications:${userId}`;
    
    if (!this.rooms.has(roomId)) {
      await this.createRoom(roomId, 'notification', {
        name: `Notifications: ${userId}`,
        isPrivate: true,
      });
    }

    await this.joinRoom(socket, roomId, userId);
  }

  /**
   * Join group room
   */
  async joinGroupRoom(socket: Socket, groupId: string): Promise<void> {
    const roomId = `group:${groupId}`;
    
    if (!this.rooms.has(roomId)) {
      await this.createRoom(roomId, 'group', {
        name: `Group: ${groupId}`,
        metadata: { groupId },
      });
    }

    const userId = (socket.data as any).userId;
    await this.joinRoom(socket, roomId, userId);
  }

  /**
   * Check group access
   */
  async checkGroupAccess(userId: string, groupId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${process.env.GROUP_SERVICE_URL}/groups/${groupId}/members/${userId}`
      );
      return response.ok;
    } catch {
      return true;
    }
  }

  /**
   * Get room info
   */
  getRoom(roomId: string): RoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get room members
   */
  getRoomMembers(roomId: string): RoomMember[] {
    const members = this.roomMembers.get(roomId);
    return members ? Array.from(members.values()) : [];
  }

  /**
   * Get rooms for a user
   */
  getUserRooms(userId: string): RoomInfo[] {
    const roomIds = this.userRooms.get(userId) || new Set();
    const rooms: RoomInfo[] = [];

    for (const roomId of roomIds) {
      const room = this.rooms.get(roomId);
      if (room) {
        rooms.push(room);
      }
    }

    return rooms;
  }

  /**
   * Get room count
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Get room statistics
   */
  getRoomStats(): {
    total: number;
    byType: Record<RoomType, number>;
    totalMembers: number;
    averageMembersPerRoom: number;
  } {
    const byType: Record<RoomType, number> = {
      chat: 0,
      group: 0,
      notification: 0,
      feed: 0,
      call: 0,
    };

    let totalMembers = 0;

    for (const room of this.rooms.values()) {
      byType[room.type]++;
      totalMembers += room.memberCount;
    }

    const total = this.rooms.size;

    return {
      total,
      byType,
      totalMembers,
      averageMembersPerRoom: total > 0 ? totalMembers / total : 0,
    };
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    roomId: string,
    socketId: string,
    role: 'member' | 'admin' | 'moderator'
  ): Promise<void> {
    const members = this.roomMembers.get(roomId);
    const member = members?.get(socketId);

    if (!member) {
      throw new Error('Member not found in room');
    }

    member.role = role;
    await this.redis.hset(
      `${this.keyPrefix}members:${roomId}`,
      socketId,
      JSON.stringify(member)
    );

    this.broadcastToRoom(roomId, {
      type: 'room:role_updated',
      data: { userId: member.userId, socketId, role },
    });
  }

  /**
   * Kick member from room
   */
  async kickMember(roomId: string, socketId: string, reason?: string): Promise<void> {
    const members = this.roomMembers.get(roomId);
    const member = members?.get(socketId);

    if (!member) {
      return;
    }

    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('room:kicked', { roomId, reason });
      await this.leaveRoom(socket, roomId, member.userId);
    }
  }

  /**
   * Create or get call room
   */
  async createCallRoom(
    callId: string,
    participants: string[],
    metadata?: Record<string, any>
  ): Promise<RoomInfo> {
    const roomId = `call:${callId}`;
    
    const room = await this.createRoom(roomId, 'call', {
      name: `Call: ${callId}`,
      maxMembers: 50, // Max participants in a call
      metadata,
    });

    return room;
  }

  /**
   * Check if room exists
   */
  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId);
  }
}

export { RoomInfo, RoomMember, RoomMessage, RoomType };
