-- =====================================================
-- PostgreSQL Marketplace Schema
-- Facebook Clone Enterprise Architecture
-- Listings, Categories, Transactions, and Reviews
-- =====================================================

-- =====================================================
-- MARKETPLACE CATEGORIES TABLE
-- Listing categories hierarchy
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Category Details
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    image TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES marketplace_categories(id),
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Stats
    listing_count INTEGER DEFAULT 0,
    
    -- Filters
    filters JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MARKETPLACE LISTINGS TABLE
-- Main listing entity
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Seller
    seller_id UUID NOT NULL REFERENCES users(id),
    seller_type VARCHAR(20) DEFAULT 'individual' CHECK (seller_type IN (
        'individual', 'business', 'dealer'
    )),
    page_id UUID REFERENCES pages(id),
    
    -- Basic Information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES marketplace_categories(id),
    
    -- Pricing
    price DECIMAL(12, 2) NOT NULL,
    original_price DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    price_negotiable BOOLEAN DEFAULT TRUE,
    is_free BOOLEAN DEFAULT FALSE,
    
    -- Condition
    condition VARCHAR(30) DEFAULT 'good' CHECK (condition IN (
        'new', 'like_new', 'excellent', 'good', 'fair', 'poor', 'for_parts'
    )),
    condition_description TEXT,
    
    -- Media
    images JSONB DEFAULT '[]'::jsonb,
    primary_image TEXT,
    video_url TEXT,
    
    -- Location
    location JSONB DEFAULT '{}'::jsonb,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Delivery Options
    delivery_options JSONB DEFAULT '{
        "pickup": true,
        "shipping": false,
        "local_delivery": false
    }'::jsonb,
    shipping_price DECIMAL(10, 2),
    shipping_methods TEXT[],
    
    -- Availability
    availability VARCHAR(20) DEFAULT 'available' CHECK (availability IN (
        'available', 'reserved', 'sold', 'pending', 'expired'
    )),
    
    -- Stats
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Duration
    auto_renew BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    
    -- Attributes (category-specific)
    attributes JSONB DEFAULT '{}'::jsonb,
    
    -- Safety
    is_verified BOOLEAN DEFAULT FALSE,
    verification_badge VARCHAR(20),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'draft', 'pending_review', 'active', 'rejected', 'removed', 'expired'
    )),
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- MARKETPLACE LISTING IMAGES TABLE
-- Individual listing images
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_listing_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    
    -- Image Details
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text VARCHAR(255),
    
    -- Metadata
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    
    -- Order
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MARKETPLACE FAVORITES TABLE
-- Saved/favorited listings
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    
    -- Collection
    collection_name VARCHAR(100) DEFAULT 'All Items',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_favorite UNIQUE (user_id, listing_id)
);

-- =====================================================
-- MARKETPLACE COLLECTIONS TABLE
-- Organized saved items
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_image TEXT,
    is_private BOOLEAN DEFAULT TRUE,
    item_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MARKETPLACE MESSAGES TABLE
-- Messages between buyers and sellers
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    
    -- Participants
    sender_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    
    -- Message
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MARKETPLACE OFFERS TABLE
-- Price offers on listings
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    
    -- Parties
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    
    -- Offer Details
    offer_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    message TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'rejected', 'expired', 'withdrawn', 'countered'
    )),
    
    -- Counter Offer
    counter_amount DECIMAL(12, 2),
    counter_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours'),
    responded_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- MARKETPLACE TRANSACTIONS TABLE
-- Completed transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id),
    
    -- Parties
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    
    -- Transaction Details
    transaction_type VARCHAR(20) DEFAULT 'sale' CHECK (transaction_type IN (
        'sale', 'trade', 'giveaway'
    )),
    
    -- Payment
    payment_method VARCHAR(30),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'processing', 'completed', 'refunded', 'failed'
    )),
    transaction_amount DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    payment_reference VARCHAR(255),
    
    -- Delivery
    delivery_method VARCHAR(20),
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN (
        'pending', 'shipped', 'in_transit', 'delivered', 'picked_up'
    )),
    tracking_number VARCHAR(100),
    shipping_carrier VARCHAR(50),
    
    -- Status
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN (
        'in_progress', 'completed', 'cancelled', 'disputed'
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- MARKETPLACE REVIEWS TABLE
-- Seller/buyer reviews
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES marketplace_transactions(id),
    
    -- Parties
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id),
    
    -- Review Details
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    content TEXT,
    
    -- Categories
    accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
    communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
    shipping_rating INTEGER CHECK (shipping_rating BETWEEN 1 AND 5),
    
    -- Status
    is_published BOOLEAN DEFAULT TRUE,
    
    -- Response
    seller_response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_review_per_transaction UNIQUE (transaction_id, reviewer_id)
);

-- =====================================================
-- MARKETPLACE REPORTS TABLE
-- Reports for listings
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id),
    
    -- Report Details
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'prohibited_item', 'fake_item', 'misleading_listing', 'spam',
        'harassment', 'scam', 'inappropriate_content', 'price_manipulation',
        'other'
    )),
    description TEXT,
    evidence JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'under_review', 'resolved', 'dismissed'
    )),
    
    -- Resolution
    action_taken VARCHAR(50),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MARKETPLACE SEARCH HISTORY TABLE
-- User search history
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    
    -- Search Details
    query VARCHAR(500),
    filters JSONB DEFAULT '{}'::jsonb,
    category_id UUID REFERENCES marketplace_categories(id),
    location JSONB,
    price_range JSONB,
    
    -- Results
    results_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MARKETPLACE VIEWS TABLE
-- Listing view tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES users(id),
    
    -- Context
    source VARCHAR(50),
    device_type VARCHAR(20),
    
    -- Timestamps
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MARKETPLACE SAVED SEARCHES TABLE
-- Saved search alerts
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Search Details
    name VARCHAR(100),
    query VARCHAR(500),
    filters JSONB DEFAULT '{}'::jsonb,
    category_id UUID REFERENCES marketplace_categories(id),
    location JSONB,
    price_range JSONB,
    
    -- Alert Settings
    email_alerts BOOLEAN DEFAULT TRUE,
    push_alerts BOOLEAN DEFAULT TRUE,
    alert_frequency VARCHAR(20) DEFAULT 'daily' CHECK (alert_frequency IN (
        'immediate', 'daily', 'weekly'
    )),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_notified_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MARKETPLACE PROMOTIONS TABLE
-- Promoted listings
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    
    -- Promotion Details
    promotion_type VARCHAR(20) NOT NULL CHECK (promotion_type IN (
        'featured', 'bump', 'highlight'
    )),
    
    -- Duration
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Pricing
    cost DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Stats
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'active', 'completed', 'cancelled'
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_listing_category_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE marketplace_categories SET listing_count = listing_count + 1 WHERE id = NEW.category_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE marketplace_categories SET listing_count = GREATEST(listing_count - 1, 0) WHERE id = NEW.category_id;
        ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE marketplace_categories SET listing_count = listing_count + 1 WHERE id = NEW.category_id;
        ELSIF OLD.category_id != NEW.category_id THEN
            UPDATE marketplace_categories SET listing_count = GREATEST(listing_count - 1, 0) WHERE id = OLD.category_id;
            UPDATE marketplace_categories SET listing_count = listing_count + 1 WHERE id = NEW.category_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE marketplace_categories SET listing_count = GREATEST(listing_count - 1, 0) WHERE id = OLD.category_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_listing_category_count
    AFTER INSERT OR UPDATE OR DELETE ON marketplace_listings
    FOR EACH ROW EXECUTE FUNCTION update_listing_category_count();

-- Update timestamps
CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON marketplace_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_categories_updated_at BEFORE UPDATE ON marketplace_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE marketplace_categories IS 'Listing categories hierarchy with filters';
COMMENT ON TABLE marketplace_listings IS 'Main marketplace listing entity';
COMMENT ON TABLE marketplace_offers IS 'Price offers on listings';
COMMENT ON TABLE marketplace_transactions IS 'Completed transactions';
COMMENT ON TABLE marketplace_reviews IS 'Seller/buyer reviews';
COMMENT ON TABLE marketplace_promotions IS 'Promoted listings';
