-- =====================================================
-- PostgreSQL Users and Profiles Schema
-- Facebook Clone Enterprise Architecture
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- USERS TABLE
-- Core user entity with authentication data
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication Fields
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    password_hash VARCHAR(255) NOT NULL,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    
    -- Basic Profile Fields
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE,
    
    -- Contact Information
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    secondary_email VARCHAR(255),
    
    -- Demographics
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'custom', 'prefer_not_to_say')),
    custom_gender VARCHAR(50),
    pronouns VARCHAR(50),
    
    -- Profile Media
    avatar TEXT,
    avatar_id UUID,
    cover_photo TEXT,
    cover_photo_id UUID,
    
    -- Profile Details
    bio TEXT,
    quote VARCHAR(255),
    
    -- Location Information
    current_city VARCHAR(100),
    hometown VARCHAR(100),
    country VARCHAR(100),
    country_code VARCHAR(3),
    
    -- Work & Education (JSONB for flexibility)
    workplace JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    
    -- Relationships
    relationship_status VARCHAR(50) CHECK (relationship_status IN (
        'single', 'in_relationship', 'engaged', 'married', 'separated',
        'divorced', 'widowed', 'complicated', 'open_relationship', 'prefer_not_to_say'
    )),
    relationship_partner_id UUID REFERENCES users(id),
    
    -- Social Links
    website VARCHAR(255),
    social_links JSONB DEFAULT '{}'::jsonb,
    
    -- Verification & Trust
    is_verified BOOLEAN DEFAULT FALSE,
    verification_type VARCHAR(20),
    verified_at TIMESTAMP WITH TIME ZONE,
    trust_score INTEGER DEFAULT 0,
    
    -- Account Status
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN (
        'active', 'suspended', 'deactivated', 'banned', 'deleted'
    )),
    status_reason TEXT,
    
    -- Role & Permissions
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN (
        'user', 'moderator', 'admin', 'super_admin'
    )),
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Online Status
    is_online BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    last_login_device VARCHAR(255),
    
    -- Privacy Settings
    default_post_visibility VARCHAR(20) DEFAULT 'friends',
    profile_visibility VARCHAR(20) DEFAULT 'friends',
    friend_list_visibility VARCHAR(20) DEFAULT 'friends',
    search_visibility BOOLEAN DEFAULT TRUE,
    
    -- Notification Preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    two_factor_backup_codes TEXT[],
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_username CHECK (username ~* '^[a-zA-Z0-9._]{3,50}$')
);

-- =====================================================
-- PROFILES TABLE
-- Extended profile data for rich user profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Extended Bio
    about_me TEXT,
    life_events JSONB DEFAULT '[]'::jsonb,
    
    -- Interests & Preferences
    interests JSONB DEFAULT '[]'::jsonb,
    favorite_quotes JSONB DEFAULT '[]'::jsonb,
    favorite_music JSONB DEFAULT '[]'::jsonb,
    favorite_movies JSONB DEFAULT '[]'::jsonb,
    favorite_books JSONB DEFAULT '[]'::jsonb,
    favorite_tv_shows JSONB DEFAULT '[]'::jsonb,
    favorite_sports JSONB DEFAULT '[]'::jsonb,
    favorite_teams JSONB DEFAULT '[]'::jsonb,
    favorite_athletes JSONB DEFAULT '[]'::jsonb,
    
    -- Skills & Professional
    skills JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    
    -- Gaming
    gaming JSONB DEFAULT '{}'::jsonb,
    
    -- Health & Fitness
    fitness JSONB DEFAULT '{}'::jsonb,
    
    -- Custom Sections
    custom_sections JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- USER DEVICES TABLE
-- Track user devices for security
-- =====================================================
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Device Information
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'other')),
    platform VARCHAR(50),
    os_version VARCHAR(50),
    app_version VARCHAR(20),
    
    -- Browser Information
    browser VARCHAR(100),
    browser_version VARCHAR(50),
    user_agent TEXT,
    
    -- Location
    ip_address INET,
    geo_location POINT,
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Security
    is_trusted BOOLEAN DEFAULT FALSE,
    is_current BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Push Token
    push_token TEXT,
    push_platform VARCHAR(20) CHECK (push_platform IN ('apns', 'fcm', 'web')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_device_per_user UNIQUE (user_id, device_id)
);

-- =====================================================
-- USER SESSIONS TABLE
-- Active session management
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES user_devices(id) ON DELETE CASCADE,
    
    -- Session Data
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    
    -- Session Metadata
    ip_address INET,
    user_agent TEXT,
    location VARCHAR(255),
    
    -- Validity
    is_valid BOOLEAN DEFAULT TRUE,
    invalidated_at TIMESTAMP WITH TIME ZONE,
    invalidation_reason VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_expires_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- USER SETTINGS TABLE
-- User preferences and configurations
-- =====================================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Privacy Settings
    privacy_settings JSONB DEFAULT '{
        "profile_visibility": "friends",
        "friend_list_visibility": "friends",
        "post_visibility": "friends",
        "search_visibility": true,
        "show_online_status": true,
        "show_last_active": true,
        "allow_friend_requests": true,
        "allow_messages_from": "everyone",
        "allow_tags": "friends",
        "allow_mentions": "everyone"
    }'::jsonb,
    
    -- Notification Settings
    notification_settings JSONB DEFAULT '{
        "email_notifications": true,
        "push_notifications": true,
        "sms_notifications": false,
        "notify_on_like": true,
        "notify_on_comment": true,
        "notify_on_share": true,
        "notify_on_tag": true,
        "notify_on_friend_request": true,
        "notify_on_message": true,
        "notify_on_group_post": true,
        "notify_on_event": true,
        "notify_on_birthday": true
    }'::jsonb,
    
    -- Security Settings
    security_settings JSONB DEFAULT '{
        "two_factor_enabled": false,
        "two_factor_method": "app",
        "login_alerts": true,
        "trusted_devices_only": false,
        "session_timeout": 30
    }'::jsonb,
    
    -- Content Settings
    content_settings JSONB DEFAULT '{
        "language": "en",
        "region": "US",
        "timezone": "UTC",
        "date_format": "MM/DD/YYYY",
        "autoplay_videos": true,
        "show_sensitive_content": false,
        "hide_ads": false
    }'::jsonb,
    
    -- Theme Settings
    theme_settings JSONB DEFAULT '{
        "mode": "light",
        "accent_color": "blue",
        "compact_mode": false,
        "font_size": "medium"
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- USER PRIVACY OVERRIDES TABLE
-- Granular privacy controls
-- =====================================================
CREATE TABLE IF NOT EXISTS user_privacy_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Target
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN (
        'profile_section', 'photo', 'post', 'friend_list', 'activity'
    )),
    target_id UUID,
    target_field VARCHAR(100),
    
    -- Privacy Level
    visibility VARCHAR(20) NOT NULL DEFAULT 'friends' CHECK (visibility IN (
        'public', 'friends', 'friends_except', 'specific_friends', 'only_me', 'custom'
    )),
    
    -- Custom Lists
    allowed_user_ids UUID[] DEFAULT '{}',
    blocked_user_ids UUID[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- USER VERIFICATION REQUESTS TABLE
-- Verification document submissions
-- =====================================================
CREATE TABLE IF NOT EXISTS user_verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request Details
    verification_type VARCHAR(30) NOT NULL CHECK (verification_type IN (
        'identity', 'business', 'brand', 'government', 'news', 'entertainment'
    )),
    
    -- Documents
    documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_review', 'approved', 'rejected', 'more_info_needed'
    )),
    
    -- Review
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FOLLOWERS/FOLLOWING VIEW
-- Materialized view for quick follower counts
-- =====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS user_follower_stats AS
SELECT 
    u.id AS user_id,
    COUNT(DISTINCT f.follower_id) AS follower_count,
    COUNT(DISTINCT fo.following_id) AS following_count
FROM users u
LEFT JOIN follows f ON f.following_id = u.id
LEFT JOIN follows fo ON fo.follower_id = u.id
GROUP BY u.id;

-- Refresh index for materialized view
CREATE UNIQUE INDEX idx_user_follower_stats_user ON user_follower_stats(user_id);

-- =====================================================
-- PARTITIONING SETUP (for large scale deployments)
-- =====================================================
-- Note: Uncomment and modify for production deployment
-- CREATE TABLE users_partitioned (LIKE users INCLUDING ALL)
-- PARTITION BY RANGE (created_at);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY users_select_own ON users
    FOR SELECT USING (id = current_setting('app.current_user_id')::UUID);

-- Users can update their own data
CREATE POLICY users_update_own ON users
    FOR UPDATE USING (id = current_setting('app.current_user_id')::UUID);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE users IS 'Core user table with authentication and basic profile data';
COMMENT ON TABLE profiles IS 'Extended profile data for rich user profiles';
COMMENT ON TABLE user_devices IS 'Tracked user devices for security and notifications';
COMMENT ON TABLE user_sessions IS 'Active user sessions with token management';
COMMENT ON TABLE user_settings IS 'User preferences and configuration settings';
COMMENT ON TABLE user_privacy_overrides IS 'Granular privacy controls per content type';
COMMENT ON TABLE user_verification_requests IS 'User verification document submissions';
