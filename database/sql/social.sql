-- =====================================================
-- PostgreSQL Social Tables Schema
-- Facebook Clone Enterprise Architecture
-- Friends, Follows, Blocks, and Social Relationships
-- =====================================================

-- =====================================================
-- FRIENDSHIPS TABLE
-- Confirmed friend relationships
-- =====================================================
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Users (stored with smaller UUID first for consistency)
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Friendship Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Close Friends
    is_close_friend_user1 BOOLEAN DEFAULT FALSE,
    is_close_friend_user2 BOOLEAN DEFAULT FALSE,
    
    -- Acquaintances
    is_acquaintance_user1 BOOLEAN DEFAULT FALSE,
    is_acquaintance_user2 BOOLEAN DEFAULT FALSE,
    
    -- Restricted
    is_restricted_user1 BOOLEAN DEFAULT FALSE,
    is_restricted_user2 BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT different_users CHECK (user1_id != user2_id),
    CONSTRAINT ordered_users CHECK (user1_id < user2_id)
);

-- =====================================================
-- FRIEND REQUESTS TABLE
-- Pending friend requests
-- =====================================================
CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Sender and Receiver
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request Details
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'rejected', 'cancelled', 'expired'
    )),
    
    -- Optional Message
    message TEXT,
    
    -- Friend List Assignment (on acceptance)
    suggested_list_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    
    -- Constraints
    CONSTRAINT no_self_request CHECK (sender_id != receiver_id)
);

-- =====================================================
-- FOLLOWS TABLE
-- Follow relationships (asymmetric)
-- =====================================================
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Follower and Following
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Follow Type
    follow_type VARCHAR(20) DEFAULT 'user' CHECK (follow_type IN (
        'user', 'page', 'group', 'hashtag'
    )),
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    
    -- Notification Preferences
    notify_on_posts BOOLEAN DEFAULT FALSE,
    notify_on_stories BOOLEAN DEFAULT FALSE,
    notify_on_lives BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- =====================================================
-- BLOCKS TABLE
-- User blocking relationships
-- =====================================================
CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Blocker and Blocked
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Block Details
    reason VARCHAR(50),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT no_self_block CHECK (blocker_id != blocked_id),
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- =====================================================
-- REPORTS TABLE
-- User reports for content/behavior
-- =====================================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reporter
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Reported Entity
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    reported_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    reported_page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    reported_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    reported_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    reported_conversation_id UUID,
    reported_message_id UUID,
    
    -- Report Details
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'spam', 'harassment', 'hate_speech', 'violence', 'nudity',
        'fake_account', 'impersonation', 'scam', 'copyright',
        'self_harm', 'dangerous_organization', 'other'
    )),
    subcategory VARCHAR(100),
    description TEXT,
    
    -- Evidence
    evidence JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'under_review', 'resolved', 'dismissed', 'escalated'
    )),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Resolution
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution VARCHAR(50),
    resolution_notes TEXT,
    
    -- Actions Taken
    action_taken VARCHAR(50),
    action_details JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT has_reported_entity CHECK (
        reported_user_id IS NOT NULL OR
        reported_post_id IS NOT NULL OR
        reported_comment_id IS NOT NULL OR
        reported_page_id IS NOT NULL OR
        reported_group_id IS NOT NULL OR
        reported_event_id IS NOT NULL OR
        reported_conversation_id IS NOT NULL
    )
);

-- =====================================================
-- FRIEND LISTS TABLE
-- Custom friend lists/groups
-- =====================================================
CREATE TABLE IF NOT EXISTS friend_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- List Details
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    
    -- Default Lists
    is_default BOOLEAN DEFAULT FALSE,
    list_type VARCHAR(20) CHECK (list_type IN (
        'custom', 'close_friends', 'acquaintances', 'family', 'work', 'restricted'
    )),
    
    -- Privacy
    is_private BOOLEAN DEFAULT TRUE,
    
    -- Stats
    member_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FRIEND LIST MEMBERS TABLE
-- Junction table for friend lists
-- =====================================================
CREATE TABLE IF NOT EXISTS friend_list_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES friend_lists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Timestamps
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_list_member UNIQUE (list_id, friend_id)
);

-- =====================================================
-- USER SUGGESTIONS TABLE
-- Friend/page suggestions
-- =====================================================
CREATE TABLE IF NOT EXISTS user_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Suggested Entity
    suggested_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    suggested_page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    suggested_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    
    -- Suggestion Source
    source VARCHAR(50) NOT NULL CHECK (source IN (
        'mutual_friends', 'imported_contacts', 'same_school',
        'same_workplace', 'same_location', 'common_interests',
        'facebook_algorithms', 'you_may_know'
    )),
    source_details JSONB,
    
    -- Scoring
    relevance_score DECIMAL(5,2) DEFAULT 0.00,
    mutual_friend_count INTEGER DEFAULT 0,
    
    -- Status
    is_dismissed BOOLEAN DEFAULT FALSE,
    is_shown BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    shown_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT has_suggested_entity CHECK (
        suggested_user_id IS NOT NULL OR
        suggested_page_id IS NOT NULL OR
        suggested_group_id IS NOT NULL
    )
);

-- =====================================================
-- CONTACT IMPORTS TABLE
-- Imported contacts for suggestions
-- =====================================================
CREATE TABLE IF NOT EXISTS contact_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Contact Information
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    
    -- Match
    matched_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    match_confidence DECIMAL(3,2),
    
    -- Timestamps
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_email_import UNIQUE (user_id, contact_email),
    CONSTRAINT unique_phone_import UNIQUE (user_id, contact_phone)
);

-- =====================================================
-- SOCIAL ACTIONS LOG TABLE
-- Log of social actions for analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS social_actions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Action Details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'friend_request_sent', 'friend_request_accepted', 'friend_request_rejected',
        'friend_request_cancelled', 'friend_removed', 'user_followed', 'user_unfollowed',
        'user_blocked', 'user_unblocked', 'added_to_list', 'removed_from_list',
        'close_friend_added', 'close_friend_removed'
    )),
    
    -- Target
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    target_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    
    -- Context
    source VARCHAR(50),
    device_type VARCHAR(20),
    ip_address INET,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MUTUAL FRIENDS MATERIALIZED VIEW
-- Fast mutual friends lookup
-- =====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mutual_friends_view AS
SELECT 
    u1.id AS user_id,
    u2.id AS other_user_id,
    COUNT(DISTINCT f2.user1_id) AS mutual_count,
    ARRAY_AGG(DISTINCT f2.user1_id) AS mutual_friend_ids
FROM users u1
CROSS JOIN users u2
JOIN friendships f1 ON (f1.user1_id = u1.id OR f1.user2_id = u1.id)
JOIN friendships f2 ON (
    (f2.user1_id = f1.user1_id OR f2.user2_id = f1.user1_id) AND
    (f2.user1_id = u2.id OR f2.user2_id = u2.id) AND
    f2.id != f1.id
)
WHERE u1.id < u2.id
GROUP BY u1.id, u2.id;

CREATE UNIQUE INDEX idx_mutual_friends_view_unique ON mutual_friends_view(user_id, other_user_id);
CREATE INDEX idx_mutual_friends_view_user ON mutual_friends_view(user_id);
CREATE INDEX idx_mutual_friends_view_count ON mutual_friends_view(mutual_count DESC);

-- =====================================================
-- FRIEND OF FRIEND VIEW
-- For friend suggestions
-- =====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS friends_of_friends_view AS
WITH friends AS (
    SELECT user1_id AS friend_id FROM friendships WHERE user2_id = current_setting('app.current_user_id', true)::UUID
    UNION
    SELECT user2_id AS friend_id FROM friendships WHERE user1_id = current_setting('app.current_user_id', true)::UUID
)
SELECT 
    f.friend_id,
    foaf.friend_id AS friend_of_friend_id,
    COUNT(*) AS mutual_count
FROM friends f
JOIN (
    SELECT user1_id AS friend_id, user2_id AS friend_of_friend_id FROM friendships
    UNION
    SELECT user2_id AS friend_id, user1_id AS friend_of_friend_id FROM friendships
) foaf ON foaf.friend_id = f.friend_id
WHERE foaf.friend_of_friend_id NOT IN (SELECT friend_id FROM friends)
GROUP BY f.friend_id, foaf.friend_of_friend_id;

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_friend_list_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE friend_lists SET member_count = member_count + 1 WHERE id = NEW.list_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE friend_lists SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.list_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_friend_list_count
    AFTER INSERT OR DELETE ON friend_list_members
    FOR EACH ROW EXECUTE FUNCTION update_friend_list_count();

-- Update timestamps
CREATE TRIGGER update_friend_requests_updated_at BEFORE UPDATE ON friend_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_lists_updated_at BEFORE UPDATE ON friend_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE friendships IS 'Confirmed friend relationships with close friend/acquaintance flags';
COMMENT ON TABLE friend_requests IS 'Pending friend requests with expiration';
COMMENT ON TABLE follows IS 'Asymmetric follow relationships';
COMMENT ON TABLE blocks IS 'User blocking relationships';
COMMENT ON TABLE reports IS 'User reports for moderation';
COMMENT ON TABLE friend_lists IS 'Custom friend lists for privacy and organization';
COMMENT ON TABLE user_suggestions IS 'Friend and page suggestions';
COMMENT ON TABLE social_actions_log IS 'Audit log for social actions';
