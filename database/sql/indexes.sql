-- =====================================================
-- PostgreSQL Indexes
-- Facebook Clone Enterprise Architecture
-- Comprehensive Indexing Strategy for Performance
-- =====================================================

-- =====================================================
-- USERS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active DESC) WHERE last_active IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(account_status) WHERE account_status = 'active';
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified) WHERE is_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin(
    to_tsvector('english', 
        coalesce(first_name, '') || ' ' || 
        coalesce(last_name, '') || ' ' || 
        coalesce(username, '') || ' ' ||
        coalesce(email, '')
    )
);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin(first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_last_name_trgm ON users USING gin(last_name gin_trgm_ops);

-- =====================================================
-- PROFILES INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

-- =====================================================
-- USER DEVICES INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device ON user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_token ON user_devices(push_token) WHERE push_token IS NOT NULL;

-- =====================================================
-- USER SESSIONS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh ON user_sessions(refresh_token) WHERE refresh_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_valid ON user_sessions(user_id, expires_at) WHERE is_valid = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_valid = TRUE;

-- =====================================================
-- POSTS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_group ON posts(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_page ON posts(page_id) WHERE page_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_shared ON posts(shared_post_id) WHERE shared_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(author_id, pinned_until DESC) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_content_search ON posts USING gin(to_tsvector('english', coalesce(content, '')));
CREATE INDEX IF NOT EXISTS idx_posts_content_trgm ON posts USING gin(content gin_trgm_ops) WHERE content IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_tagged_users ON posts USING gin(tagged_users);
CREATE INDEX IF NOT EXISTS idx_posts_engagement ON posts(created_at DESC, reaction_count DESC, comment_count DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_group_created ON posts(group_id, created_at DESC) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_page_created ON posts(page_id, created_at DESC) WHERE page_id IS NOT NULL;

-- =====================================================
-- POST MEDIA INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_type ON post_media(media_type);

-- =====================================================
-- COMMENTS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_thread ON comments USING btree(thread_path);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status) WHERE status = 'active';

-- =====================================================
-- REACTIONS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reactions_comment ON reactions(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reactions_created ON reactions(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_unique_post ON reactions(user_id, post_id) WHERE post_id IS NOT NULL AND is_active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_unique_comment ON reactions(user_id, comment_id) WHERE comment_id IS NOT NULL AND is_active = TRUE;

-- =====================================================
-- FRIENDSHIPS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_unique ON friendships(
    LEAST(user1_id, user2_id), 
    GREATEST(user1_id, user2_id)
);

-- =====================================================
-- FRIEND REQUESTS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(receiver_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_friend_requests_pending ON friend_requests(receiver_id, created_at DESC) WHERE status = 'pending';

-- =====================================================
-- FOLLOWS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created ON follows(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_unique ON follows(follower_id, following_id);

-- =====================================================
-- BLOCKS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_unique ON blocks(blocker_id, blocked_id);

-- =====================================================
-- GROUPS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(type);
CREATE INDEX IF NOT EXISTS idx_groups_category ON groups(category);
CREATE INDEX IF NOT EXISTS idx_groups_created ON groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_member_count ON groups(member_count DESC);
CREATE INDEX IF NOT EXISTS idx_groups_search ON groups USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_groups_name_trgm ON groups USING gin(name gin_trgm_ops);

-- =====================================================
-- GROUP MEMBERSHIPS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_status ON group_memberships(group_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_group_memberships_role ON group_memberships(group_id, role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_memberships_unique ON group_memberships(group_id, user_id);

-- =====================================================
-- PAGES INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_pages_owner ON pages(owner_id);
CREATE INDEX IF NOT EXISTS idx_pages_username ON pages(username);
CREATE INDEX IF NOT EXISTS idx_pages_category ON pages(category);
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(page_type);
CREATE INDEX IF NOT EXISTS idx_pages_verified ON pages(is_verified) WHERE is_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_pages_like_count ON pages(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_pages_search ON pages USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_pages_name_trgm ON pages USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pages_location ON pages USING gist(
    point(longitude, latitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- =====================================================
-- PAGE FOLLOWERS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_page_followers_page ON page_followers(page_id);
CREATE INDEX IF NOT EXISTS idx_page_followers_user ON page_followers(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_followers_unique ON page_followers(page_id, user_id);

-- =====================================================
-- PAGE ROLES INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_page_roles_page ON page_roles(page_id);
CREATE INDEX IF NOT EXISTS idx_page_roles_user ON page_roles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_roles_unique ON page_roles(page_id, user_id);

-- =====================================================
-- EVENTS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_events_creator ON events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_page ON events(page_id) WHERE page_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_group ON events(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end ON events(end_time) WHERE end_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON events(start_time ASC) WHERE status = 'published' AND start_time > CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_events_location ON events USING gist(
    point(longitude, latitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_search ON events USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- =====================================================
-- EVENT RSVPs INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_response ON event_rsvps(event_id, response);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_rsvps_unique ON event_rsvps(event_id, user_id);

-- =====================================================
-- MARKETPLACE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings(category_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_availability ON marketplace_listings(availability);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_price ON marketplace_listings(price);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_condition ON marketplace_listings(condition);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created ON marketplace_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_location ON marketplace_listings USING gist(
    point(longitude, latitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_search ON marketplace_listings USING gin(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_title_trgm ON marketplace_listings USING gin(title gin_trgm_ops);

-- Composite indexes for marketplace queries
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_cat_status ON marketplace_listings(category_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_loc_price ON marketplace_listings(latitude, longitude, price) WHERE status = 'active';

-- =====================================================
-- MARKETPLACE CATEGORIES INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_parent ON marketplace_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_slug ON marketplace_categories(slug);

-- =====================================================
-- ADS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_account ON ad_campaigns(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_dates ON ad_campaigns(start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign ON ad_sets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_status ON ad_sets(status);

CREATE INDEX IF NOT EXISTS idx_ads_adset ON ads(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_created ON ads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ad_creatives_account ON ad_creatives(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_format ON ad_creatives(format);

CREATE INDEX IF NOT EXISTS idx_ad_performance_date ON ad_performance(date);
CREATE INDEX IF NOT EXISTS idx_ad_performance_ad ON ad_performance(ad_id, date);
CREATE INDEX IF NOT EXISTS idx_ad_performance_campaign ON ad_performance(campaign_id, date);

-- =====================================================
-- NOTIFICATIONS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- =====================================================
-- HASHTAGS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_hashtags_name ON hashtags(name);
CREATE INDEX IF NOT EXISTS idx_hashtags_trending ON hashtags(trending_score DESC) WHERE is_trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_hashtags_count ON hashtags(post_count DESC);

-- =====================================================
-- MENTIONS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_mentions_post ON mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_mentions_comment ON mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(mentioned_user_id);

-- =====================================================
-- POST SAVES INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_post_saves_user ON post_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_post ON post_saves(post_id);

-- =====================================================
-- REPORTS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);

-- =====================================================
-- PARTIAL INDEXES FOR COMMON QUERIES
-- =====================================================

-- Active posts only
CREATE INDEX IF NOT EXISTS idx_posts_active ON posts(created_at DESC, reaction_count DESC)
    WHERE status = 'published' AND deleted_at IS NULL;

-- Active groups
CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(member_count DESC)
    WHERE deleted_at IS NULL AND is_archived = FALSE;

-- Active pages
CREATE INDEX IF NOT EXISTS idx_pages_active ON pages(like_count DESC)
    WHERE deleted_at IS NULL AND status = 'published';

-- Unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread_user ON notifications(user_id, created_at DESC)
    WHERE is_read = FALSE;

-- Pending friend requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_pending_receiver ON friend_requests(receiver_id, created_at DESC)
    WHERE status = 'pending';

-- =====================================================
-- EXPRESSION INDEXES
-- =====================================================

-- Lowercase email for case-insensitive lookup
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Lowercase username
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));

-- Full name concatenation
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(LOWER(first_name || ' ' || last_name));

-- =====================================================
-- COVERING INDEXES (Include columns for index-only scans)
-- =====================================================

-- Posts with common columns
CREATE INDEX IF NOT EXISTS idx_posts_feed ON posts(author_id, created_at DESC)
    INCLUDE (content, post_type, visibility, reaction_count, comment_count);

-- User basic info
CREATE INDEX IF NOT EXISTS idx_users_basic ON users(id)
    INCLUDE (first_name, last_name, username, avatar, is_online);

-- =====================================================
-- CONCURRENT INDEX CREATION (for production)
-- =====================================================
-- Note: In production, create indexes with CONCURRENTLY to avoid locking
-- Example: CREATE INDEX CONCURRENTLY idx_name ON table(column);
