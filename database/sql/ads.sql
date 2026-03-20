-- =====================================================
-- PostgreSQL Ads Schema
-- Facebook Clone Enterprise Architecture
-- Campaigns, Ad Sets, Ads, Creatives, and Tracking
-- =====================================================

-- =====================================================
-- ADVERTISERS TABLE
-- Advertiser accounts
-- =====================================================
CREATE TABLE IF NOT EXISTS advertisers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Account Information
    name VARCHAR(255) NOT NULL,
    business_email VARCHAR(255),
    business_phone VARCHAR(50),
    
    -- Business Details
    business_name VARCHAR(255),
    business_type VARCHAR(50),
    industry VARCHAR(100),
    website VARCHAR(500),
    
    -- Billing
    billing_address JSONB DEFAULT '{}'::jsonb,
    tax_id VARCHAR(100),
    tax_exempt BOOLEAN DEFAULT FALSE,
    
    -- Account Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'suspended', 'closed', 'pending'
    )),
    spend_limit DECIMAL(12, 2),
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AD ACCOUNTS TABLE
-- Advertiser ad accounts
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID NOT NULL REFERENCES advertisers(id),
    
    -- Account Details
    name VARCHAR(255) NOT NULL,
    account_id VARCHAR(50) UNIQUE NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Budget
    daily_budget DECIMAL(12, 2),
    lifetime_budget DECIMAL(12, 2),
    spent_amount DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'paused', 'closed', 'pending', 'disabled'
    )),
    
    -- Settings
    settings JSONB DEFAULT '{
        "bid_strategy": "lowest_cost",
        "optimization_goal": "conversions",
        "attribution_window": 7
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AD CAMPAIGNS TABLE
-- Top-level campaign entity
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id),
    
    -- Campaign Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Objective
    objective VARCHAR(50) NOT NULL CHECK (objective IN (
        'awareness', 'traffic', 'engagement', 'leads', 'app_installs',
        'video_views', 'messages', 'conversions', 'catalog_sales', 'store_traffic'
    )),
    
    -- Budget
    budget_type VARCHAR(20) DEFAULT 'daily' CHECK (budget_type IN ('daily', 'lifetime')),
    budget_amount DECIMAL(12, 2) NOT NULL,
    
    -- Schedule
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    
    -- Bidding
    bid_strategy VARCHAR(30) DEFAULT 'lowest_cost' CHECK (bid_strategy IN (
        'lowest_cost', 'cost_cap', 'bid_cap', 'target_cost'
    )),
    bid_amount DECIMAL(10, 2),
    
    -- Targeting (high level)
    special_ad_category VARCHAR(30),
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'scheduled', 'active', 'paused', 'completed', 'archived'
    )),
    
    -- Stats (denormalized)
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    spend DECIMAL(12, 2) DEFAULT 0.00,
    conversions INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AD SETS TABLE
-- Ad set with targeting
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES ad_campaigns(id),
    
    -- Ad Set Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Budget
    budget_type VARCHAR(20) DEFAULT 'daily' CHECK (budget_type IN ('daily', 'lifetime')),
    budget_amount DECIMAL(12, 2) NOT NULL,
    
    -- Schedule
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    
    -- Bidding
    bid_strategy VARCHAR(30),
    bid_amount DECIMAL(10, 2),
    bid_adjustments JSONB DEFAULT '{}'::jsonb,
    
    -- Optimization
    optimization_goal VARCHAR(50),
    conversion_event VARCHAR(50),
    attribution_spec JSONB DEFAULT '[]'::jsonb,
    
    -- Targeting
    targeting JSONB DEFAULT '{
        "geo_locations": {},
        "age_min": 18,
        "age_max": 65,
        "genders": [],
        "interests": [],
        "behaviors": [],
        "demographics": {},
        "connections": {},
        "custom_audiences": [],
        "excluded_custom_audiences": []
    }'::jsonb,
    
    -- Placements
    placements JSONB DEFAULT '{
        "platforms": ["facebook", "instagram", "audience_network"],
        "device_platforms": ["mobile", "desktop"],
        "positions": ["feed", "story", "reels", "instream"]
    }'::jsonb,
    
    -- Delivery
    delivery_type VARCHAR(20) DEFAULT 'standard' CHECK (delivery_type IN (
        'standard', 'accelerated', 'scheduled'
    )),
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'scheduled', 'active', 'paused', 'completed', 'archived'
    )),
    
    -- Stats
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    spend DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ADS TABLE
-- Individual ads
-- =====================================================
CREATE TABLE IF NOT EXISTS ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_set_id UUID NOT NULL REFERENCES ad_sets(id),
    creative_id UUID,
    
    -- Ad Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Tracking
    tracking_urls JSONB DEFAULT '{}'::jsonb,
    url_parameters TEXT,
    destination_url TEXT NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_review', 'active', 'paused', 'rejected', 'archived'
    )),
    
    -- Review
    review_status VARCHAR(20) DEFAULT 'pending',
    rejection_reasons TEXT[],
    
    -- Stats
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    spend DECIMAL(12, 2) DEFAULT 0.00,
    ctr DECIMAL(5, 4) DEFAULT 0.0000,
    cpc DECIMAL(10, 2) DEFAULT 0.00,
    cpm DECIMAL(10, 2) DEFAULT 0.00,
    conversions INTEGER DEFAULT 0,
    conversion_value DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AD CREATIVES TABLE
-- Creative assets for ads
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_creatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id),
    
    -- Creative Details
    name VARCHAR(255) NOT NULL,
    
    -- Format
    format VARCHAR(30) NOT NULL CHECK (format IN (
        'image', 'video', 'carousel', 'collection', 'story', 'reel'
    )),
    
    -- Content
    title VARCHAR(255),
    body_text TEXT,
    call_to_action VARCHAR(50),
    
    -- Media
    media JSONB NOT NULL DEFAULT '{}'::jsonb,
    thumbnail_url TEXT,
    
    -- Destination
    destination_url TEXT NOT NULL,
    destination_type VARCHAR(30),
    
    -- Branding
    brand_name VARCHAR(100),
    logo_url TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'draft', 'active', 'archived'
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AD PERFORMANCE TABLE
-- Hourly/Daily performance metrics
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Target
    ad_id UUID REFERENCES ads(id),
    ad_set_id UUID REFERENCES ad_sets(id),
    campaign_id UUID REFERENCES ad_campaigns(id),
    
    -- Time
    date DATE NOT NULL,
    hour INTEGER CHECK (hour BETWEEN 0 AND 23),
    
    -- Metrics
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    unique_clicks BIGINT DEFAULT 0,
    spend DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Calculated Metrics
    ctr DECIMAL(6, 4),
    cpc DECIMAL(10, 2),
    cpm DECIMAL(10, 2),
    
    -- Conversions
    conversions INTEGER DEFAULT 0,
    conversion_value DECIMAL(12, 2) DEFAULT 0.00,
    cost_per_conversion DECIMAL(10, 2),
    roas DECIMAL(8, 2),
    
    -- Engagement
    video_views_25 INTEGER DEFAULT 0,
    video_views_50 INTEGER DEFAULT 0,
    video_views_75 INTEGER DEFAULT 0,
    video_views_100 INTEGER DEFAULT 0,
    video_avg_time_watched DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Actions
    link_clicks INTEGER DEFAULT 0,
    page_engagements INTEGER DEFAULT 0,
    post_engagements INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    reactions INTEGER DEFAULT 0,
    
    -- Platform Breakdown
    platform_breakdown JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT has_target CHECK (
        ad_id IS NOT NULL OR ad_set_id IS NOT NULL OR campaign_id IS NOT NULL
    )
);

-- =====================================================
-- AD TARGETING PRESETS TABLE
-- Saved targeting configurations
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_targeting_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id),
    
    -- Preset Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Targeting Config
    targeting JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Stats
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CUSTOM AUDIENCES TABLE
-- Custom audience for targeting
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_audiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id),
    
    -- Audience Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Type
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'website', 'app', 'customer_list', 'engagement', 'lookalike', 'offline'
    )),
    
    -- Source
    source_type VARCHAR(30),
    source_id UUID,
    retention_days INTEGER DEFAULT 180,
    
    -- For lookalike
    seed_audience_id UUID REFERENCES custom_audiences(id),
    lookalike_spec JSONB,
    
    -- Stats
    approximate_count BIGINT DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'building' CHECK (status IN (
        'building', 'ready', 'updating', 'failed', 'expired'
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CUSTOM AUDIENCE MEMBERS TABLE
-- Members of custom audiences
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_audience_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audience_id UUID NOT NULL REFERENCES custom_audiences(id) ON DELETE CASCADE,
    
    -- Member
    user_id UUID REFERENCES users(id),
    email_hash VARCHAR(64),
    phone_hash VARCHAR(64),
    
    -- Metadata
    source VARCHAR(50),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_audience_member UNIQUE (audience_id, user_id)
);

-- =====================================================
-- AD CONVERSIONS TABLE
-- Conversion tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Attribution
    ad_id UUID REFERENCES ads(id),
    campaign_id UUID REFERENCES ad_campaigns(id),
    
    -- Conversion Details
    event_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(100),
    
    -- User
    user_id UUID REFERENCES users(id),
    anonymous_id VARCHAR(255),
    
    -- Value
    value DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    quantity INTEGER DEFAULT 1,
    
    -- Attribution
    attribution_window INTEGER DEFAULT 7,
    click_id VARCHAR(255),
    impression_id VARCHAR(255),
    
    -- Context
    source VARCHAR(50),
    device_type VARCHAR(20),
    platform VARCHAR(30),
    
    -- E-commerce
    product_ids TEXT[],
    order_id VARCHAR(255),
    
    -- Timestamps
    event_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AD BILLSING TABLE
-- Billing and payments
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_billing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id),
    
    -- Billing Period
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    
    -- Amounts
    total_spend DECIMAL(12, 2) DEFAULT 0.00,
    total_clicks BIGINT DEFAULT 0,
    total_impressions BIGINT DEFAULT 0,
    
    -- Payment
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'overdue', 'refunded', 'disputed'
    )),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Invoice
    invoice_number VARCHAR(50) UNIQUE,
    invoice_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AD RULES TABLE
-- Automated rules for campaigns
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id),
    
    -- Rule Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Scope
    apply_to JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Triggers
    trigger_type VARCHAR(30) NOT NULL CHECK (trigger_type IN (
        'schedule', 'metric_threshold', 'performance_change'
    )),
    trigger_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Actions
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'pause', 'resume', 'increase_budget', 'decrease_budget',
        'change_bid', 'send_notification', 'send_email'
    )),
    action_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_ad_campaigns_updated_at BEFORE UPDATE ON ad_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_sets_updated_at BEFORE UPDATE ON ad_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE advertisers IS 'Advertiser accounts with billing information';
COMMENT ON TABLE ad_accounts IS 'Advertiser ad accounts';
COMMENT ON TABLE ad_campaigns IS 'Top-level campaign entity with objectives';
COMMENT ON TABLE ad_sets IS 'Ad set with targeting and placements';
COMMENT ON TABLE ads IS 'Individual ads with tracking';
COMMENT ON TABLE ad_creatives IS 'Creative assets for ads';
COMMENT ON TABLE ad_performance IS 'Hourly/Daily performance metrics';
COMMENT ON TABLE custom_audiences IS 'Custom audience for targeting';
COMMENT ON TABLE ad_conversions IS 'Conversion tracking events';
