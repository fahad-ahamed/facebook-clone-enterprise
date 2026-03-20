-- =====================================================
-- PostgreSQL Posts, Comments, and Reactions Schema
-- Facebook Clone Enterprise Architecture
-- =====================================================

-- =====================================================
-- POSTS TABLE
-- Main content entity for all post types
-- =====================================================
CREATE TABLE IF NOT EXISTS posts (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Author Information
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_type VARCHAR(20) DEFAULT 'user' CHECK (author_type IN ('user', 'page', 'group')),
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    
    -- Content
    content TEXT,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN (
        'text', 'photo', 'video', 'link', 'shared_post', 'poll',
        'event', 'live_video', 'album', 'reel', 'story', 'product'
    )),
    
    -- Media Attachments
    media JSONB DEFAULT '[]'::jsonb,
    media_urls TEXT[],
    media_ids UUID[],
    
    -- Post Type & Visibility
    post_type VARCHAR(20) DEFAULT 'status' CHECK (post_type IN (
        'status', 'photo', 'video', 'link', 'shared', 'poll',
        'check_in', 'life_event', 'milestone', 'note', 'reel', 'story'
    )),
    visibility VARCHAR(20) DEFAULT 'friends' CHECK (visibility IN (
        'public', 'friends', 'friends_except', 'specific_friends', 
        'only_me', 'custom', 'group', 'page'
    )),
    
    -- Privacy Lists
    allowed_user_ids UUID[] DEFAULT '{}',
    blocked_user_ids UUID[] DEFAULT '{}',
    
    -- Rich Content
    feeling JSONB,
    activity JSONB,
    location JSONB,
    background JSONB,
    
    -- Tagging
    tagged_users UUID[] DEFAULT '{}',
    tagged_pages UUID[] DEFAULT '{}',
    tagged_location_id UUID,
    
    -- Link Preview
    link_url TEXT,
    link_title VARCHAR(500),
    link_description TEXT,
    link_image TEXT,
    link_domain VARCHAR(255),
    
    -- Shared Post
    shared_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    shared_with_comment TEXT,
    
    -- Engagement Metrics (denormalized for performance)
    reaction_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    love_count INTEGER DEFAULT 0,
    care_count INTEGER DEFAULT 0,
    haha_count INTEGER DEFAULT 0,
    wow_count INTEGER DEFAULT 0,
    sad_count INTEGER DEFAULT 0,
    angry_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    
    -- Post Status
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN (
        'draft', 'scheduled', 'published', 'archived', 'deleted', 'hidden'
    )),
    
    -- Moderation
    is_approved BOOLEAN DEFAULT TRUE,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    moderation_notes TEXT,
    content_flags JSONB DEFAULT '[]'::jsonb,
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Pinning & Featuring
    is_pinned BOOLEAN DEFAULT FALSE,
    pinned_until TIMESTAMP WITH TIME ZONE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Editing History
    edit_count INTEGER DEFAULT 0,
    last_edited_at TIMESTAMP WITH TIME ZONE,
    edit_history JSONB DEFAULT '[]'::jsonb,
    
    -- Cross-posting
    cross_posted_to JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_content CHECK (
        content IS NOT NULL OR 
        media IS NOT NULL AND jsonb_array_length(media) > 0 OR
        link_url IS NOT NULL OR
        shared_post_id IS NOT NULL
    )
);

-- =====================================================
-- POST MEDIA TABLE
-- Individual media attachments for posts
-- =====================================================
CREATE TABLE IF NOT EXISTS post_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    -- Media Information
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN (
        'image', 'video', 'gif', 'audio', 'document', 'sticker'
    )),
    
    -- URLs
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    preview_url TEXT,
    
    -- Storage References
    storage_provider VARCHAR(20) DEFAULT 's3',
    storage_bucket VARCHAR(255),
    storage_key VARCHAR(500),
    storage_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Dimensions
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- for video/audio in seconds
    file_size BIGINT,
    
    -- Processing
    processing_status VARCHAR(20) DEFAULT 'completed' CHECK (processing_status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    processing_progress INTEGER DEFAULT 0,
    
    -- Variants (for responsive images/videos)
    variants JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    title VARCHAR(255),
    description TEXT,
    alt_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Order
    display_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- COMMENTS TABLE
-- Comments on posts with threading support
-- =====================================================
CREATE TABLE IF NOT EXISTS comments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Target
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    
    -- Author
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_type VARCHAR(20) DEFAULT 'user',
    page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    
    -- Content
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text',
    
    -- Media
    media_url TEXT,
    media_type VARCHAR(20),
    media_metadata JSONB,
    sticker_id UUID,
    
    -- Attachment
    attachment_type VARCHAR(20),
    attachment_url TEXT,
    attachment_metadata JSONB,
    
    -- Threading
    reply_count INTEGER DEFAULT 0,
    reply_depth INTEGER DEFAULT 0 CHECK (reply_depth BETWEEN 0 AND 10),
    thread_path LTREE,
    
    -- Engagement
    reaction_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'hidden', 'deleted', 'spam'
    )),
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    
    -- Moderation
    is_approved BOOLEAN DEFAULT TRUE,
    moderated_by UUID REFERENCES users(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderation_reason TEXT,
    spam_score DECIMAL(3,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT comment_has_target CHECK (
        post_id IS NOT NULL OR parent_comment_id IS NOT NULL
    )
);

-- =====================================================
-- REACTIONS TABLE
-- Unified reactions for posts and comments
-- =====================================================
CREATE TABLE IF NOT EXISTS reactions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Target (one of these must be set)
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    
    -- Reaction Type
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN (
        'like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'
    )),
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT one_reaction_target CHECK (
        (post_id IS NOT NULL)::INTEGER + 
        (comment_id IS NOT NULL)::INTEGER = 1
    ),
    CONSTRAINT unique_post_reaction UNIQUE (user_id, post_id),
    CONSTRAINT unique_comment_reaction UNIQUE (user_id, comment_id)
);

-- =====================================================
-- POST SHARES TABLE
-- Track sharing activity
-- =====================================================
CREATE TABLE IF NOT EXISTS post_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    -- Sharer
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    
    -- Share Details
    share_type VARCHAR(20) DEFAULT 'timeline' CHECK (share_type IN (
        'timeline', 'page', 'group', 'message', 'external'
    )),
    share_to_id UUID, -- group_id or page_id or conversation_id
    share_comment TEXT,
    
    -- External Shares
    share_platform VARCHAR(50),
    share_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_sharer CHECK (user_id IS NOT NULL OR page_id IS NOT NULL)
);

-- =====================================================
-- POST SAVES TABLE
-- Saved posts collection
-- =====================================================
CREATE TABLE IF NOT EXISTS post_saves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    -- Collection
    collection_name VARCHAR(100) DEFAULT 'All Posts',
    collection_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_save UNIQUE (user_id, post_id)
);

-- =====================================================
-- POST COLLECTIONS TABLE
-- Organized saved posts
-- =====================================================
CREATE TABLE IF NOT EXISTS post_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_image TEXT,
    is_private BOOLEAN DEFAULT TRUE,
    post_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- HASHTAGS TABLE
-- Hashtag management
-- =====================================================
CREATE TABLE IF NOT EXISTS hashtags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    
    -- Stats
    post_count BIGINT DEFAULT 0,
    
    -- Trending
    is_trending BOOLEAN DEFAULT FALSE,
    trending_score DECIMAL(10,2) DEFAULT 0.00,
    
    -- Moderation
    is_blocked BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- POST HASHTAGS JUNCTION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS post_hashtags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (post_id, hashtag_id)
);

-- =====================================================
-- MENTIONS TABLE
-- User and page mentions in posts/comments
-- =====================================================
CREATE TABLE IF NOT EXISTS mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Source
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('post', 'comment')),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    
    -- Target
    mentioned_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mentioned_page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    
    -- Position in content
    start_offset INTEGER,
    end_offset INTEGER,
    
    -- Status
    is_notified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_mention_target CHECK (
        mentioned_user_id IS NOT NULL OR mentioned_page_id IS NOT NULL
    )
);

-- =====================================================
-- POST EDIT HISTORY TABLE
-- Track all edits to posts
-- =====================================================
CREATE TABLE IF NOT EXISTS post_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    previous_content TEXT,
    previous_media JSONB,
    edit_reason VARCHAR(255),
    edited_by UUID NOT NULL REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- POLLS TABLE
-- Poll posts
-- =====================================================
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    
    -- Settings
    allows_multiple_answers BOOLEAN DEFAULT FALSE,
    allows_write_in BOOLEAN DEFAULT FALSE,
    duration_hours INTEGER,
    ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Stats
    total_votes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- POLL VOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    option_index INTEGER NOT NULL,
    custom_option_text VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_vote_per_option UNIQUE (poll_id, user_id, option_index)
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.post_id IS NOT NULL THEN
            UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.post_id IS NOT NULL THEN
            UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_post_counts();

-- Update reaction counts
CREATE OR REPLACE FUNCTION update_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.post_id IS NOT NULL THEN
            UPDATE posts SET 
                reaction_count = reaction_count + 1,
                like_count = like_count + CASE WHEN NEW.reaction_type = 'like' THEN 1 ELSE 0 END,
                love_count = love_count + CASE WHEN NEW.reaction_type = 'love' THEN 1 ELSE 0 END
            WHERE id = NEW.post_id;
        ELSIF NEW.comment_id IS NOT NULL THEN
            UPDATE comments SET reaction_count = reaction_count + 1 WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.post_id IS NOT NULL THEN
            UPDATE posts SET 
                reaction_count = GREATEST(reaction_count - 1, 0),
                like_count = GREATEST(like_count - CASE WHEN OLD.reaction_type = 'like' THEN 1 ELSE 0 END, 0),
                love_count = GREATEST(love_count - CASE WHEN OLD.reaction_type = 'love' THEN 1 ELSE 0 END, 0)
            WHERE id = OLD.post_id;
        ELSIF OLD.comment_id IS NOT NULL THEN
            UPDATE comments SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reaction_counts
    AFTER INSERT OR DELETE ON reactions
    FOR EACH ROW EXECUTE FUNCTION update_reaction_counts();

-- Update timestamps
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PARTITIONING (for large scale)
-- =====================================================
-- Note: Uncomment for production with high volume
-- CREATE TABLE posts_partitioned (LIKE posts INCLUDING ALL)
-- PARTITION BY RANGE (created_at);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE posts IS 'Main content entity for all post types with rich media support';
COMMENT ON TABLE post_media IS 'Individual media attachments for posts';
COMMENT ON TABLE comments IS 'Threaded comments with reaction support';
COMMENT ON TABLE reactions IS 'Unified reactions (like, love, care, haha, wow, sad, angry)';
COMMENT ON TABLE post_shares IS 'Track sharing activity across platforms';
COMMENT ON TABLE post_saves IS 'User saved posts collection';
COMMENT ON TABLE hashtags IS 'Hashtag management with trending detection';
COMMENT ON TABLE mentions IS 'User and page mentions tracking';
