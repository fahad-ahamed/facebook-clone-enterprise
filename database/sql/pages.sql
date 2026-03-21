-- =====================================================
-- PostgreSQL Pages Schema
-- Facebook Clone Enterprise Architecture
-- Pages, Followers, Roles, and Insights
-- =====================================================

-- =====================================================
-- PAGES TABLE
-- Main page entity
-- =====================================================
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    
    -- Category & Classification
    category VARCHAR(100) NOT NULL,
    subcategories TEXT[],
    page_type VARCHAR(30) CHECK (page_type IN (
        'business', 'brand', 'community', 'entertainment', 'public_figure',
        'local_business', 'company', 'organization', 'education', 'government',
        'cause', 'artist', 'band', 'sports', 'media', 'store', 'hotel', 'restaurant'
    )),
    
    -- Description
    description TEXT,
    short_description VARCHAR(255),
    
    -- Media
    avatar TEXT,
    avatar_id UUID,
    cover_photo TEXT,
    cover_photo_id UUID,
    cover_video TEXT,
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(500),
    
    -- Location
    address JSONB DEFAULT '{}'::jsonb,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Business Hours
    hours JSONB DEFAULT '{}'::jsonb,
    always_open BOOLEAN DEFAULT FALSE,
    
    -- Social Links
    social_links JSONB DEFAULT '{}'::jsonb,
    
    -- Owner & Management
    owner_id UUID NOT NULL REFERENCES users(id),
    
    -- Stats
    like_count INTEGER DEFAULT 0,
    follower_count INTEGER DEFAULT 0,
    checkin_count INTEGER DEFAULT 0,
    talk_about_count INTEGER DEFAULT 0,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(20) DEFAULT 'not_verified' CHECK (verification_status IN (
        'not_verified', 'pending', 'verified', 'rejected'
    )),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Page Status
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN (
        'published', 'unpublished', 'archived', 'banned'
    )),
    
    -- Settings
    settings JSONB DEFAULT '{
        "allow_messages": true,
        "allow_posts": true,
        "allow_photos": true,
        "allow_videos": true,
        "allow_reviews": true,
        "show_address": true,
        "show_phone": true,
        "show_email": false,
        "age_restriction": "none",
        "content_restrictions": []
    }'::jsonb,
    
    -- Features
    features JSONB DEFAULT '{
        "shop": false,
        "services": false,
        "events": false,
        "offers": false,
        "jobs": false,
        "appointments": false,
        "donations": false
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_page_username CHECK (username ~* '^[a-zA-Z0-9.]{5,100}$')
);

-- =====================================================
-- PAGE FOLLOWERS TABLE
-- Page followers with notification preferences
-- =====================================================
CREATE TABLE IF NOT EXISTS page_followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Status
    is_following BOOLEAN DEFAULT TRUE,
    
    -- Notification Preferences
    notify_on_posts BOOLEAN DEFAULT TRUE,
    notify_on_events BOOLEAN DEFAULT TRUE,
    notify_on_lives BOOLEAN DEFAULT TRUE,
    notify_on_offers BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    followed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unfollowed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraint
    CONSTRAINT unique_page_follower UNIQUE (page_id, user_id)
);

-- =====================================================
-- PAGE LIKES TABLE
-- Page likes (distinct from follows)
-- =====================================================
CREATE TABLE IF NOT EXISTS page_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Timestamps
    liked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint
    CONSTRAINT unique_page_like UNIQUE (page_id, user_id)
);

-- =====================================================
-- PAGE ROLES TABLE
-- Page admin roles and permissions
-- =====================================================
CREATE TABLE IF NOT EXISTS page_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role
    role VARCHAR(30) DEFAULT 'editor' CHECK (role IN (
        'admin', 'editor', 'moderator', 'advertiser', 'analyst'
    )),
    
    -- Permissions
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Assigned By
    assigned_by UUID REFERENCES users(id),
    
    -- Timestamps
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint
    CONSTRAINT unique_page_role UNIQUE (page_id, user_id)
);

-- =====================================================
-- PAGE POSTS TABLE
-- Posts published on pages
-- =====================================================
CREATE TABLE IF NOT EXISTS page_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    -- Author (page admin who created the post)
    author_id UUID REFERENCES users(id),
    
    -- Post Settings
    is_pinned BOOLEAN DEFAULT FALSE,
    pinned_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint
    CONSTRAINT unique_page_post UNIQUE (page_id, post_id)
);

-- =====================================================
-- PAGE CATEGORIES TABLE
-- Predefined page categories
-- =====================================================
CREATE TABLE IF NOT EXISTS page_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES page_categories(id),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PAGE VERIFICATION REQUESTS TABLE
-- Page verification submissions
-- =====================================================
CREATE TABLE IF NOT EXISTS page_verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id),
    
    -- Verification Type
    verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN (
        'phone', 'email', 'document', 'domain'
    )),
    
    -- Documents
    documents JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_review', 'approved', 'rejected', 'more_info_needed'
    )),
    
    -- Review
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PAGE INSIGHTS TABLE
-- Analytics and insights data
-- =====================================================
CREATE TABLE IF NOT EXISTS page_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    
    -- Time Period
    date DATE NOT NULL,
    hour INTEGER CHECK (hour BETWEEN 0 AND 23),
    
    -- Metrics
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    profile_views INTEGER DEFAULT 0,
    post_engagements INTEGER DEFAULT 0,
    
    -- Demographics (aggregated)
    demographics JSONB DEFAULT '{}'::jsonb,
    
    -- Geographic (aggregated)
    geo_distribution JSONB DEFAULT '{}'::jsonb,
    
    -- Source breakdown
    source_breakdown JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_page_insight UNIQUE (page_id, date, hour)
);

-- =====================================================
-- PAGE REVIEWS TABLE
-- Reviews and ratings
-- =====================================================
CREATE TABLE IF NOT EXISTS page_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rating
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    
    -- Review
    title VARCHAR(255),
    content TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    
    -- Recommendation
    recommends BOOLEAN,
    
    -- Status
    is_published BOOLEAN DEFAULT TRUE,
    
    -- Engagement
    helpful_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint
    CONSTRAINT unique_page_review UNIQUE (page_id, user_id)
);

-- =====================================================
-- PAGE MESSAGES TABLE
-- Messages sent to/from pages
-- =====================================================
CREATE TABLE IF NOT EXISTS page_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    
    -- Message Details
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('page', 'user')),
    sender_id UUID NOT NULL,
    content TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Auto Response
    is_auto_response BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PAGE CTA BUTTONS TABLE
-- Call-to-action buttons
-- =====================================================
CREATE TABLE IF NOT EXISTS page_cta_buttons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    
    -- Button Details
    button_type VARCHAR(50) NOT NULL CHECK (button_type IN (
        'book_now', 'contact_us', 'play_game', 'shop_now', 'sign_up',
        'watch_video', 'call_now', 'send_message', 'send_email',
        'use_app', 'get_quote', 'get_offer', 'get_directions'
    )),
    button_text VARCHAR(50),
    
    -- Destination
    destination_type VARCHAR(20) NOT NULL CHECK (destination_type IN (
        'website', 'app', 'messenger', 'whatsapp', 'phone'
    )),
    destination_url TEXT,
    destination_app_id VARCHAR(100),
    
    -- Display
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    
    -- Stats
    click_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_page_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE pages SET follower_count = follower_count + 1 WHERE id = NEW.page_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE pages SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.page_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_page_follower_count
    AFTER INSERT OR DELETE ON page_followers
    FOR EACH ROW EXECUTE FUNCTION update_page_follower_count();

CREATE OR REPLACE FUNCTION update_page_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE pages SET like_count = like_count + 1 WHERE id = NEW.page_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE pages SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.page_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_page_like_count
    AFTER INSERT OR DELETE ON page_likes
    FOR EACH ROW EXECUTE FUNCTION update_page_like_count();

-- Update timestamps
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE pages IS 'Main page entity for businesses, brands, public figures';
COMMENT ON TABLE page_followers IS 'Page followers with notification preferences';
COMMENT ON TABLE page_likes IS 'Page likes (distinct from follows)';
COMMENT ON TABLE page_roles IS 'Page admin roles and permissions';
COMMENT ON TABLE page_posts IS 'Posts published on pages';
COMMENT ON TABLE page_insights IS 'Analytics and insights data';
COMMENT ON TABLE page_reviews IS 'Reviews and ratings for pages';
