-- =====================================================
-- PostgreSQL Groups Schema
-- Facebook Clone Enterprise Architecture
-- Groups, Memberships, Group Posts, and Settings
-- =====================================================

-- =====================================================
-- GROUPS TABLE
-- Main group entity
-- =====================================================
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    description TEXT,
    
    -- Media
    cover_photo TEXT,
    cover_photo_id UUID,
    avatar TEXT,
    avatar_id UUID,
    
    -- Group Type
    type VARCHAR(20) DEFAULT 'public' CHECK (type IN (
        'public', 'private', 'secret'
    )),
    category VARCHAR(50) CHECK (category IN (
        'buy_sell', 'education', 'entertainment', 'family', 'fitness',
        'food', 'gaming', 'hobbies', 'lifestyle', 'local', 'music',
        'parenting', 'pets', 'professional', 'religion', 'sports',
        'support', 'technology', 'travel', 'other'
    )),
    subcategory VARCHAR(100),
    tags TEXT[],
    
    -- Creator & Ownership
    creator_id UUID NOT NULL REFERENCES users(id),
    
    -- Membership Settings
    membership_type VARCHAR(20) DEFAULT 'open' CHECK (membership_type IN (
        'open', 'approval', 'invite_only'
    )),
    who_can_post VARCHAR(20) DEFAULT 'members' CHECK (who_can_post IN (
        'anyone', 'members', 'admins_only'
    )),
    who_can_add_members VARCHAR(20) DEFAULT 'members' CHECK (who_can_add_members IN (
        'anyone', 'members', 'admins_only'
    )),
    
    -- Content Moderation
    post_approval_required BOOLEAN DEFAULT FALSE,
    auto_approve_posts BOOLEAN DEFAULT TRUE,
    profanity_filter BOOLEAN DEFAULT TRUE,
    allowed_post_types VARCHAR(50)[] DEFAULT ARRAY['text', 'photo', 'video', 'link'],
    
    -- Stats
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    active_member_count INTEGER DEFAULT 0,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Featured
    is_featured BOOLEAN DEFAULT FALSE,
    featured_until TIMESTAMP WITH TIME ZONE,
    
    -- Location (for local groups)
    location VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Rules
    rules JSONB DEFAULT '[]'::jsonb,
    
    -- Settings
    settings JSONB DEFAULT '{
        "allow_member_posts": true,
        "allow_member_polls": true,
        "allow_member_events": true,
        "allow_member_files": true,
        "allow_member_photos": true,
        "allow_member_videos": true,
        "allow_member_links": true,
        "allow_anonymous_posts": false,
        "show_in_search": true,
        "allow_message_members": false,
        "allow_member_invites": true
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Soft Delete
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    archived_by UUID REFERENCES users(id)
);

-- =====================================================
-- GROUP MEMBERSHIPS TABLE
-- Group membership with roles
-- =====================================================
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN (
        'creator', 'admin', 'moderator', 'member'
    )),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'pending', 'banned', 'left', 'removed'
    )),
    
    -- Permissions (override group defaults)
    permissions JSONB DEFAULT '{}'::jsonb,
    
    -- Notifications
    notify_on_posts BOOLEAN DEFAULT TRUE,
    notify_on_comments BOOLEAN DEFAULT FALSE,
    notify_on_events BOOLEAN DEFAULT TRUE,
    notification_frequency VARCHAR(20) DEFAULT 'all' CHECK (notification_frequency IN (
        'all', 'highlights', 'friends', 'off'
    )),
    
    -- Membership Details
    invited_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    
    -- Timestamps
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint
    CONSTRAINT unique_membership UNIQUE (group_id, user_id)
);

-- =====================================================
-- GROUP INVITES TABLE
-- Invitations to join groups
-- =====================================================
CREATE TABLE IF NOT EXISTS group_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    
    -- Inviter
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Invitee
    invitee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    invite_email VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'declined', 'expired', 'cancelled'
    )),
    
    -- Message
    message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    
    -- Constraint
    CONSTRAINT has_invitee CHECK (invitee_id IS NOT NULL OR invite_email IS NOT NULL)
);

-- =====================================================
-- GROUP POSTS TABLE
-- Posts within groups
-- =====================================================
CREATE TABLE IF NOT EXISTS group_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    -- Visibility within group
    visibility VARCHAR(20) DEFAULT 'members' CHECK (visibility IN (
        'members', 'public', 'admins_only'
    )),
    
    -- Anonymous
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    -- Pinned
    is_pinned BOOLEAN DEFAULT FALSE,
    pinned_by UUID REFERENCES users(id),
    pinned_at TIMESTAMP WITH TIME ZONE,
    
    -- Featured
    is_featured BOOLEAN DEFAULT FALSE,
    featured_by UUID REFERENCES users(id),
    featured_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- GROUP EVENTS TABLE
-- Events created within groups
-- =====================================================
CREATE TABLE IF NOT EXISTS group_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_group_event UNIQUE (group_id, event_id)
);

-- =====================================================
-- GROUP FILES TABLE
-- Shared files in groups
-- =====================================================
CREATE TABLE IF NOT EXISTS group_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- File Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_type VARCHAR(100),
    file_size BIGINT,
    
    -- Storage
    url TEXT NOT NULL,
    storage_key VARCHAR(500),
    
    -- Access
    access_level VARCHAR(20) DEFAULT 'members' CHECK (access_level IN (
        'members', 'admins_only'
    )),
    
    -- Stats
    download_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- GROUP ALBUMS TABLE
-- Photo albums within groups
-- =====================================================
CREATE TABLE IF NOT EXISTS group_albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Album Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_photo TEXT,
    
    -- Stats
    photo_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- GROUP RULES TABLE
-- Explicit group rules
-- =====================================================
CREATE TABLE IF NOT EXISTS group_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    
    -- Rule Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- GROUP MODERATION LOG TABLE
-- Moderation actions log
-- =====================================================
CREATE TABLE IF NOT EXISTS group_moderation_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    
    -- Action
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'post_approved', 'post_rejected', 'post_deleted', 'post_pinned',
        'member_approved', 'member_removed', 'member_banned',
        'member_muted', 'role_changed', 'group_updated', 'rule_added'
    )),
    
    -- Actor
    actor_id UUID NOT NULL REFERENCES users(id),
    
    -- Target
    target_user_id UUID REFERENCES users(id),
    target_post_id UUID REFERENCES posts(id),
    
    -- Details
    reason TEXT,
    details JSONB,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- GROUP ANNOUNCEMENTS TABLE
-- Group announcements
-- =====================================================
CREATE TABLE IF NOT EXISTS group_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    
    -- Content
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Display
    display_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- GROUP SCHEDULED POSTS TABLE
-- Scheduled posts for groups
-- =====================================================
CREATE TABLE IF NOT EXISTS group_scheduled_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    
    -- Content
    content TEXT,
    media JSONB,
    
    -- Schedule
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'published', 'cancelled', 'failed'
    )),
    published_post_id UUID REFERENCES posts(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- GROUP LINKS TABLE
-- Related/linked groups
-- =====================================================
CREATE TABLE IF NOT EXISTS group_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    linked_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    
    -- Link Type
    link_type VARCHAR(20) DEFAULT 'related' CHECK (link_type IN (
        'related', 'parent', 'child', 'partner'
    )),
    
    -- Status
    is_approved BOOLEAN DEFAULT FALSE,
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT no_self_link CHECK (group_id != linked_group_id)
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = NEW.group_id;
        ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.group_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_member_count
    AFTER INSERT OR UPDATE OR DELETE ON group_memberships
    FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- Update timestamps
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_memberships_updated_at BEFORE UPDATE ON group_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE groups IS 'Main group entity with settings and configuration';
COMMENT ON TABLE group_memberships IS 'Group membership with roles and permissions';
COMMENT ON TABLE group_invites IS 'Invitations to join groups';
COMMENT ON TABLE group_posts IS 'Posts within groups';
COMMENT ON TABLE group_files IS 'Shared files in groups';
COMMENT ON TABLE group_rules IS 'Explicit group rules';
COMMENT ON TABLE group_moderation_log IS 'Audit log for moderation actions';
