/**
 * User Data Sharding Schema
 * Partitioning strategy for user-related data
 */

// =====================================================
// User Shard Schema (PostgreSQL)
// =====================================================

export const USER_SHARD_SCHEMA = `
-- User Shard Table Schema
-- Each shard contains a subset of users based on hash partitioning

-- Users table (sharded by user_id)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    cover_url TEXT,
    gender VARCHAR(20),
    birth_date DATE,
    location VARCHAR(255),
    website VARCHAR(500),
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_verified BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Shard metadata
    _shard_id INTEGER NOT NULL,
    
    -- Index columns
    search_vector TSVECTOR
);

-- Profiles table (co-located with users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work JSONB,
    education JSONB,
    relationship_status VARCHAR(30),
    hometown VARCHAR(255),
    current_city VARCHAR(255),
    phone_number VARCHAR(20),
    interests TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings (co-located with users)
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Sessions table (sharded by user_id)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, token_hash)
);

-- Friendship edges (sharded by user_id)
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    friend_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, friend_id)
);

-- Followers (sharded by user_id)
CREATE TABLE IF NOT EXISTS followers (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    follower_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, follower_id)
);

-- Following (sharded by user_id)
CREATE TABLE IF NOT EXISTS following (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    following_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, following_id)
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_friendships_user ON friendships(user_id);
CREATE INDEX idx_followers_user ON followers(user_id);
CREATE INDEX idx_following_user ON following(user_id);
`;

// =====================================================
// Cross-Shard Queries
// =====================================================

export const CROSS_SHARD_QUERIES = {
  /**
   * Get user from correct shard
   */
  getUserById: `
    SELECT * FROM users WHERE id = $1
  `,
  
  /**
   * Get user by email (requires broadcast to all shards or directory lookup)
   */
  getUserByEmail: `
    SELECT * FROM users WHERE email = $1 LIMIT 1
  `,
  
  /**
   * Get user's friends (cross-shard query if friends on different shards)
   */
  getFriends: `
    SELECT f.friend_id, f.status, u.username, u.full_name, u.avatar_url
    FROM friendships f
    LEFT JOIN users u ON f.friend_id = u.id
    WHERE f.user_id = $1 AND f.status = 'accepted'
    ORDER BY f.created_at DESC
    LIMIT $2 OFFSET $3
  `,
  
  /**
   * Check friendship status between users (may require cross-shard query)
   */
  checkFriendship: `
    SELECT status FROM friendships 
    WHERE user_id = $1 AND friend_id = $2
  `,
};

// =====================================================
// Shard Directory Service
// =====================================================

export interface ShardDirectoryEntry {
  userId: string;
  shardId: number;
  createdAt: Date;
}

/**
 * User Shard Directory Schema
 * Central directory for user-to-shard mapping
 */
export const USER_DIRECTORY_SCHEMA = `
-- Central directory for user shard lookup
-- This is NOT sharded - it's a small lookup table

CREATE TABLE IF NOT EXISTS user_directory (
    user_id UUID PRIMARY KEY,
    shard_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_shard_id (shard_id)
);

-- For quick shard statistics
CREATE TABLE IF NOT EXISTS shard_stats (
    shard_id INTEGER PRIMARY KEY,
    user_count BIGINT DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

export default {
  USER_SHARD_SCHEMA,
  USER_DIRECTORY_SCHEMA,
  CROSS_SHARD_QUERIES,
};
