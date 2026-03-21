/**
 * Feed Data Sharding Schema
 * Partitioning strategy for user feeds (Redis-based)
 */

// =====================================================
// Feed Shard Configuration (Redis)
// =====================================================

export const FEED_SHARD_CONFIG = {
  // Feed cache keys pattern
  patterns: {
    userFeed: (userId: string) => `feed:${userId}`,
    feedMetadata: (userId: string) => `feed:meta:${userId}`,
    feedTimestamp: (userId: string) => `feed:ts:${userId}`,
    feedLock: (userId: string) => `feed:lock:${userId}`,
    precomputedFeed: (userId: string) => `feed:precomputed:${userId}`,
  },

  // TTL settings
  ttl: {
    feed: 300,           // 5 minutes
    metadata: 3600,      // 1 hour
    lock: 10,            // 10 seconds
    precomputed: 86400,  // 24 hours
  },

  // Feed size limits
  limits: {
    maxFeedSize: 1000,     // Max items in feed
    defaultPageSize: 25,   // Default page size
    maxPageSize: 100,      // Max page size
  },
};

// =====================================================
// Feed Redis Schema
// =====================================================

export const FEED_REDIS_SCHEMA = `
# =====================================================
# Feed Redis Keys
# =====================================================

# User's main feed (Sorted Set)
# Key: feed:{userId}
# Score: timestamp (for ordering)
# Members: postId
feed:{userId}

# Feed metadata (Hash)
# Key: feed:meta:{userId}
# Fields: lastUpdated, itemCount, version
feed:meta:{userId}

# Feed lock for updates (String with TTL)
# Key: feed:lock:{userId}
# Value: lock holder ID
feed:lock:{userId}

# Precomputed feed (List of post IDs)
# Key: feed:precomputed:{userId}
# Members: postId1, postId2, ...
feed:precomputed:{userId}

# User's following list for fanout (Set)
# Key: user:following:{userId}
# Members: userId1, userId2, ...
user:following:{userId}

# User's followers for fanout (Set)
# Key: user:followers:{userId}
# Members: userId1, userId2, ...
user:followers:{userId}

# Post's score/ranking (Hash)
# Key: post:score:{postId}
# Fields: engagement, recency, affinity
post:score:{postId}

# Feed generation timestamp (String)
# Key: feed:ts:{userId}
# Value: last generation timestamp
feed:ts:{userId}
`;

// =====================================================
// Feed Commands
// =====================================================

export const FEED_COMMANDS = {
  /**
   * Add post to user's feed
   */
  addToFeed: `
    ZADD feed:{userId} {timestamp} {postId}
    EXPIRE feed:{userId} 300
  `,
  
  /**
   * Get feed page
   */
  getFeedPage: `
    ZREVRANGE feed:{userId} {start} {end} WITHSCORES
  `,
  
  /**
   * Remove old posts from feed
   */
  trimFeed: `
    ZREMRANGEBYRANK feed:{userId} 0 -{maxSize}
  `,
  
  /**
   * Get feed size
   */
  getFeedSize: `
    ZCARD feed:{userId}
  `,
  
  /**
   * Fanout post to followers
   */
  fanoutToFollowers: `
    # For each follower in SMEMBERS user:followers:{authorId}
    ZADD feed:{followerId} {timestamp} {postId}
    EXPIRE feed:{followerId} 300
  `,
  
  /**
   * Acquire feed lock
   */
  acquireLock: `
    SET feed:lock:{userId} {lockId} NX EX 10
  `,
  
  /**
   * Release feed lock
   */
  releaseLock: `
    # Only release if we own the lock
    EVAL "
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      else
        return 0
      end
    " 1 feed:lock:{userId} {lockId}
  `,
};

// =====================================================
// Feed Shard Router
// =====================================================

export class FeedShardRouter {
  private shardCount: number;
  private shardHosts: string[];

  constructor() {
    this.shardCount = parseInt(process.env.FEED_SHARD_COUNT || '3');
    this.shardHosts = [
      process.env.FEED_SHARD_0_HOST || 'localhost:6379',
      process.env.FEED_SHARD_1_HOST || 'localhost:6380',
      process.env.FEED_SHARD_2_HOST || 'localhost:6381',
    ];
  }

  /**
   * Get shard for user's feed
   */
  getShard(userId: string): { shardId: number; host: string } {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const shardId = Math.abs(hash) % this.shardCount;
    return {
      shardId,
      host: this.shardHosts[shardId],
    };
  }

  /**
   * Get key with shard prefix
   */
  getShardedKey(userId: string, keyPattern: string): string {
    const { shardId } = this.getShard(userId);
    return `shard${shardId}:${keyPattern.replace('{userId}', userId)}`;
  }

  /**
   * Get all shards for fanout
   */
  getAllShards(): Array<{ shardId: number; host: string }> {
    return this.shardHosts.map((host, index) => ({
      shardId: index,
      host,
    }));
  }
}

// =====================================================
// Feed Fanout Service
// =====================================================

export interface FanoutOptions {
  postId: string;
  authorId: string;
  timestamp: number;
  followers: string[];
  fanoutType: 'push' | 'pull' | 'hybrid';
}

export class FeedFanoutService {
  private shardRouter: FeedShardRouter;

  constructor() {
    this.shardRouter = new FeedShardRouter();
  }

  /**
   * Fanout post to followers' feeds
   */
  async fanout(options: FanoutOptions): Promise<void> {
    const { postId, authorId, timestamp, followers, fanoutType } = options;

    switch (fanoutType) {
      case 'push':
        await this.pushFanout(postId, timestamp, followers);
        break;
      case 'pull':
        // Pull model - nothing to do, feed is generated on request
        break;
      case 'hybrid':
        // Hybrid - push to active users, pull for inactive
        await this.hybridFanout(postId, authorId, timestamp, followers);
        break;
    }
  }

  /**
   * Push model: Add post to all followers' feeds
   */
  private async pushFanout(
    postId: string,
    timestamp: number,
    followers: string[]
  ): Promise<void> {
    // Group followers by shard
    const shardGroups = new Map<number, string[]>();
    
    for (const followerId of followers) {
      const { shardId } = this.shardRouter.getShard(followerId);
      if (!shardGroups.has(shardId)) {
        shardGroups.set(shardId, []);
      }
      shardGroups.get(shardId)!.push(followerId);
    }

    // Execute fanout on each shard
    for (const [shardId, shardFollowers] of shardGroups) {
      // Pipeline commands for efficiency
      const commands = shardFollowers.map(followerId => ({
        command: 'ZADD',
        args: [`feed:${followerId}`, timestamp.toString(), postId],
      }));
      
      // Execute pipeline on shard
      console.log(`Fanout to shard ${shardId}: ${shardFollowers.length} followers`);
    }
  }

  /**
   * Hybrid model: Push to active users only
   */
  private async hybridFanout(
    postId: string,
    authorId: string,
    timestamp: number,
    followers: string[]
  ): Promise<void> {
    // Active users (online in last 7 days) get push
    // Inactive users get pull (generated on demand)
    
    const activeThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const activeFollowers = followers.filter(f => {
      // Check if user was active recently
      return true; // Simplified - would check last_active_at
    });

    await this.pushFanout(postId, timestamp, activeFollowers);
  }
}

export default {
  FEED_SHARD_CONFIG,
  FEED_REDIS_SCHEMA,
  FEED_COMMANDS,
  FeedShardRouter,
  FeedFanoutService,
};
