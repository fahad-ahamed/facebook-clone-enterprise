/**
 * Database Sharding Configuration
 * Horizontal partitioning for high-scale data
 */

// =====================================================
// Shard Configuration
// =====================================================

export interface ShardConfig {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  maxConnections: number;
  weight: number;
}

export interface ShardingStrategy {
  type: 'hash' | 'range' | 'directory';
  shardKey: string;
  algorithm: 'md5' | 'crc32' | 'murmur3';
  totalShards: number;
  virtualNodes: number;
}

// =====================================================
// User Shards Configuration
// =====================================================

export const USER_SHARDS: ShardConfig[] = [
  {
    name: 'user-shard-0',
    host: process.env.USER_SHARD_0_HOST || 'localhost',
    port: parseInt(process.env.USER_SHARD_0_PORT || '5432'),
    database: 'facebook_users_0',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    maxConnections: 20,
    weight: 1,
  },
  {
    name: 'user-shard-1',
    host: process.env.USER_SHARD_1_HOST || 'localhost',
    port: parseInt(process.env.USER_SHARD_1_PORT || '5433'),
    database: 'facebook_users_1',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    maxConnections: 20,
    weight: 1,
  },
  {
    name: 'user-shard-2',
    host: process.env.USER_SHARD_2_HOST || 'localhost',
    port: parseInt(process.env.USER_SHARD_2_PORT || '5434'),
    database: 'facebook_users_2',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    maxConnections: 20,
    weight: 1,
  },
  {
    name: 'user-shard-3',
    host: process.env.USER_SHARD_3_HOST || 'localhost',
    port: parseInt(process.env.USER_SHARD_3_PORT || '5435'),
    database: 'facebook_users_3',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    maxConnections: 20,
    weight: 1,
  },
];

export const USER_SHARDING_STRATEGY: ShardingStrategy = {
  type: 'hash',
  shardKey: 'userId',
  algorithm: 'murmur3',
  totalShards: USER_SHARDS.length,
  virtualNodes: 150,
};

// =====================================================
// Message Shards Configuration
// =====================================================

export const MESSAGE_SHARDS: ShardConfig[] = [
  {
    name: 'message-shard-0',
    host: process.env.MESSAGE_SHARD_0_HOST || 'localhost',
    port: parseInt(process.env.MESSAGE_SHARD_0_PORT || '27017'),
    database: 'facebook_messages_0',
    username: process.env.MONGO_USER || 'admin',
    password: process.env.MONGO_PASSWORD || 'password',
    maxConnections: 50,
    weight: 1,
  },
  {
    name: 'message-shard-1',
    host: process.env.MESSAGE_SHARD_1_HOST || 'localhost',
    port: parseInt(process.env.MESSAGE_SHARD_1_PORT || '27018'),
    database: 'facebook_messages_1',
    username: process.env.MONGO_USER || 'admin',
    password: process.env.MONGO_PASSWORD || 'password',
    maxConnections: 50,
    weight: 1,
  },
  {
    name: 'message-shard-2',
    host: process.env.MESSAGE_SHARD_2_HOST || 'localhost',
    port: parseInt(process.env.MESSAGE_SHARD_2_PORT || '27019'),
    database: 'facebook_messages_2',
    username: process.env.MONGO_USER || 'admin',
    password: process.env.MONGO_PASSWORD || 'password',
    maxConnections: 50,
    weight: 1,
  },
];

export const MESSAGE_SHARDING_STRATEGY: ShardingStrategy = {
  type: 'hash',
  shardKey: 'conversationId',
  algorithm: 'murmur3',
  totalShards: MESSAGE_SHARDS.length,
  virtualNodes: 100,
};

// =====================================================
// Feed Shards Configuration
// =====================================================

export const FEED_SHARDS: ShardConfig[] = [
  {
    name: 'feed-shard-0',
    host: process.env.FEED_SHARD_0_HOST || 'localhost',
    port: parseInt(process.env.FEED_SHARD_0_PORT || '6379'),
    database: '0',
    username: '',
    password: process.env.REDIS_PASSWORD || '',
    maxConnections: 100,
    weight: 1,
  },
  {
    name: 'feed-shard-1',
    host: process.env.FEED_SHARD_1_HOST || 'localhost',
    port: parseInt(process.env.FEED_SHARD_1_PORT || '6380'),
    database: '0',
    username: '',
    password: process.env.REDIS_PASSWORD || '',
    maxConnections: 100,
    weight: 1,
  },
  {
    name: 'feed-shard-2',
    host: process.env.FEED_SHARD_2_HOST || 'localhost',
    port: parseInt(process.env.FEED_SHARD_2_PORT || '6381'),
    database: '0',
    username: '',
    password: process.env.REDIS_PASSWORD || '',
    maxConnections: 100,
    weight: 1,
  },
];

export const FEED_SHARDING_STRATEGY: ShardingStrategy = {
  type: 'hash',
  shardKey: 'userId',
  algorithm: 'crc32',
  totalShards: FEED_SHARDS.length,
  virtualNodes: 50,
};

// =====================================================
// Shard Router
// =====================================================

export class ShardRouter {
  private shards: ShardConfig[];
  private strategy: ShardingStrategy;
  private ring: Map<number, ShardConfig> = new Map();

  constructor(shards: ShardConfig[], strategy: ShardingStrategy) {
    this.shards = shards;
    this.strategy = strategy;
    this.buildConsistentHashRing();
  }

  /**
   * Build consistent hash ring with virtual nodes
   */
  private buildConsistentHashRing(): void {
    const { virtualNodes } = this.strategy;
    
    for (const shard of this.shards) {
      for (let i = 0; i < virtualNodes; i++) {
        const key = this.hash(`${shard.name}:${i}`);
        this.ring.set(key, shard);
      }
    }
  }

  /**
   * Get shard for a given key
   */
  getShard(key: string): ShardConfig {
    const hash = this.hash(key);
    
    // Find the first node with hash >= key hash
    const sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
    
    for (const ringKey of sortedKeys) {
      if (hash <= ringKey) {
        return this.ring.get(ringKey)!;
      }
    }
    
    // Wrap around to first node
    return this.ring.get(sortedKeys[0])!;
  }

  /**
   * Get multiple shards for replication
   */
  getShardsForReplication(key: string, replicationFactor: number): ShardConfig[] {
    const hash = this.hash(key);
    const sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
    
    const shards: ShardConfig[] = [];
    const seenShards = new Set<string>();
    
    for (const ringKey of sortedKeys) {
      if (hash <= ringKey || shards.length > 0) {
        const shard = this.ring.get(ringKey)!;
        if (!seenShards.has(shard.name)) {
          shards.push(shard);
          seenShards.add(shard.name);
          if (shards.length === replicationFactor) break;
        }
      }
    }
    
    // Wrap around if needed
    if (shards.length < replicationFactor) {
      for (const ringKey of sortedKeys) {
        const shard = this.ring.get(ringKey)!;
        if (!seenShards.has(shard.name)) {
          shards.push(shard);
          seenShards.add(shard.name);
          if (shards.length === replicationFactor) break;
        }
      }
    }
    
    return shards;
  }

  /**
   * Hash function based on algorithm
   */
  private hash(key: string): number {
    switch (this.strategy.algorithm) {
      case 'md5':
        return this.md5Hash(key);
      case 'crc32':
        return this.crc32Hash(key);
      case 'murmur3':
      default:
        return this.murmur3Hash(key);
    }
  }

  private md5Hash(key: string): number {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(key).digest();
    return hash.readUInt32BE(0);
  }

  private crc32Hash(key: string): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < key.length; i++) {
      crc ^= key.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  private murmur3Hash(key: string): number {
    let h = 0xdeadbeef;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 0x5bd1e995);
      h ^= h >>> 15;
    }
    return h >>> 0;
  }
}

// =====================================================
// Pre-configured Routers
// =====================================================

export const userShardRouter = new ShardRouter(USER_SHARDS, USER_SHARDING_STRATEGY);
export const messageShardRouter = new ShardRouter(MESSAGE_SHARDS, MESSAGE_SHARDING_STRATEGY);
export const feedShardRouter = new ShardRouter(FEED_SHARDS, FEED_SHARDING_STRATEGY);

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get user shard by user ID
 */
export function getUserShard(userId: string): ShardConfig {
  return userShardRouter.getShard(userId);
}

/**
 * Get message shard by conversation ID
 */
export function getMessageShard(conversationId: string): ShardConfig {
  return messageShardRouter.getShard(conversationId);
}

/**
 * Get feed shard by user ID
 */
export function getFeedShard(userId: string): ShardConfig {
  return feedShardRouter.getShard(userId);
}

/**
 * Get all shards for a user's feed (for fanout)
 */
export function getFeedShardsForUser(userId: string, replicationFactor: number = 2): ShardConfig[] {
  return feedShardRouter.getShardsForReplication(userId, replicationFactor);
}

export default {
  USER_SHARDS,
  MESSAGE_SHARDS,
  FEED_SHARDS,
  USER_SHARDING_STRATEGY,
  MESSAGE_SHARDING_STRATEGY,
  FEED_SHARDING_STRATEGY,
  ShardRouter,
  userShardRouter,
  messageShardRouter,
  feedShardRouter,
  getUserShard,
  getMessageShard,
  getFeedShard,
};
