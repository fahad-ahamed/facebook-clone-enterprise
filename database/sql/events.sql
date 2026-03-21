-- =====================================================
-- PostgreSQL Events Schema
-- Facebook Clone Enterprise Architecture
-- Events, RSVPs, and Event Management
-- =====================================================

-- =====================================================
-- EVENTS TABLE
-- Main event entity
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    
    -- Media
    cover_photo TEXT,
    cover_photo_id UUID,
    video_url TEXT,
    
    -- Event Type
    event_type VARCHAR(30) DEFAULT 'public' CHECK (event_type IN (
        'public', 'private', 'group', 'page', 'online_only'
    )),
    category VARCHAR(50) CHECK (category IN (
        'music', 'sports', 'arts', 'food', 'charity', 'community',
        'business', 'education', 'entertainment', 'family', 'festival',
        'film', 'fitness', 'health', 'holiday', 'home', 'literary',
        'nightlife', 'outdoors', 'party', 'professional', 'religion',
        'shopping', 'theater', 'tour', 'other'
    )),
    
    -- Organizer
    creator_id UUID NOT NULL REFERENCES users(id),
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    
    -- Date & Time
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_all_day BOOLEAN DEFAULT FALSE,
    
    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule VARCHAR(500),
    recurrence_end_date DATE,
    parent_event_id UUID REFERENCES events(id),
    
    -- Location
    is_online BOOLEAN DEFAULT FALSE,
    online_platform VARCHAR(50) CHECK (online_platform IN (
        'facebook_live', 'messenger_room', 'zoom', 'google_meet',
        'microsoft_teams', 'custom', 'other'
    )),
    online_url TEXT,
    
    venue_name VARCHAR(255),
    venue_id UUID,
    address JSONB DEFAULT '{}'::jsonb,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Ticket Information
    ticket_type VARCHAR(20) DEFAULT 'free' CHECK (ticket_type IN (
        'free', 'paid', 'donation', 'rsvp_only'
    )),
    ticket_url TEXT,
    ticket_price_min DECIMAL(10, 2),
    ticket_price_max DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Capacity
    capacity INTEGER,
    has_waitlist BOOLEAN DEFAULT FALSE,
    waitlist_capacity INTEGER,
    
    -- Stats
    going_count INTEGER DEFAULT 0,
    interested_count INTEGER DEFAULT 0,
    maybe_count INTEGER DEFAULT 0,
    invited_count INTEGER DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    
    -- Privacy
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN (
        'public', 'private', 'friends', 'group_members'
    )),
    guest_list_visible BOOLEAN DEFAULT TRUE,
    allow_guest_invites BOOLEAN DEFAULT TRUE,
    
    -- Settings
    settings JSONB DEFAULT '{
        "allow_posts": true,
        "allow_photos": true,
        "allow_videos": true,
        "allow_discussion": true,
        "show_guest_list": true,
        "require_approval": false,
        "enable_qa": false,
        "enable_tickets": false
    }'::jsonb,
    
    -- Status
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN (
        'draft', 'published', 'cancelled', 'postponed', 'ended'
    )),
    cancellation_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- EVENT RSVPs TABLE
-- Event attendance responses
-- =====================================================
CREATE TABLE IF NOT EXISTS event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Response
    response VARCHAR(20) NOT NULL CHECK (response IN (
        'going', 'interested', 'maybe', 'declined'
    )),
    
    -- Guests
    additional_guests INTEGER DEFAULT 0,
    guest_names TEXT[],
    
    -- Status
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN (
        'pending', 'confirmed', 'waitlisted', 'cancelled'
    )),
    
    -- Timestamps
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint
    CONSTRAINT unique_event_rsvp UNIQUE (event_id, user_id)
);

-- =====================================================
-- EVENT INVITES TABLE
-- Event invitations
-- =====================================================
CREATE TABLE IF NOT EXISTS event_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Inviter
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Invitee
    invitee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    invite_email VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'delivered', 'viewed', 'responded', 'expired'
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    
    -- Constraint
    CONSTRAINT has_invitee CHECK (invitee_id IS NOT NULL OR invite_email IS NOT NULL)
);

-- =====================================================
-- EVENT ROLES TABLE
-- Event hosts and co-hosts
-- =====================================================
CREATE TABLE IF NOT EXISTS event_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role
    role VARCHAR(20) NOT NULL CHECK (role IN (
        'creator', 'host', 'co_host', 'moderator'
    )),
    
    -- Permissions
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint
    CONSTRAINT unique_event_role UNIQUE (event_id, user_id)
);

-- =====================================================
-- EVENT POSTS TABLE
-- Posts within events
-- =====================================================
CREATE TABLE IF NOT EXISTS event_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_event_post UNIQUE (event_id, post_id)
);

-- =====================================================
-- EVENT PHOTOS TABLE
-- Photos from event attendees
-- =====================================================
CREATE TABLE IF NOT EXISTS event_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Photo Details
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    
    -- Metadata
    width INTEGER,
    height INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- EVENT VIDEOS TABLE
-- Videos from event
-- =====================================================
CREATE TABLE IF NOT EXISTS event_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Video Details
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title VARCHAR(255),
    description TEXT,
    duration INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- EVENT SCHEDULE TABLE
-- Event schedule/agenda items
-- =====================================================
CREATE TABLE IF NOT EXISTS event_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Item Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Time
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    
    -- Location (if different from main event)
    location_name VARCHAR(255),
    
    -- Speakers/Performers
    speakers JSONB DEFAULT '[]'::jsonb,
    
    -- Display Order
    display_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- EVENT Q&A TABLE
-- Q&A for events
-- =====================================================
CREATE TABLE IF NOT EXISTS event_qa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Question
    question TEXT NOT NULL,
    asker_id UUID NOT NULL REFERENCES users(id),
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    -- Answer
    answer TEXT,
    answered_by UUID REFERENCES users(id),
    answered_at TIMESTAMP WITH TIME ZONE,
    
    -- Engagement
    upvote_count INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN (
        'open', 'answered', 'dismissed'
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- EVENT SERIES TABLE
-- Recurring event series
-- =====================================================
CREATE TABLE IF NOT EXISTS event_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Organizer
    creator_id UUID NOT NULL REFERENCES users(id),
    page_id UUID REFERENCES pages(id),
    group_id UUID REFERENCES groups(id),
    
    -- Schedule
    recurrence_rule VARCHAR(500) NOT NULL,
    
    -- Stats
    event_count INTEGER DEFAULT 0,
    total_attendees INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- EVENT TICKETS TABLE
-- Paid event tickets
-- =====================================================
CREATE TABLE IF NOT EXISTS event_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Ticket Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Quantity
    quantity_available INTEGER,
    quantity_sold INTEGER DEFAULT 0,
    
    -- Availability
    sale_start TIMESTAMP WITH TIME ZONE,
    sale_end TIMESTAMP WITH TIME ZONE,
    
    -- Limits
    min_per_order INTEGER DEFAULT 1,
    max_per_order INTEGER DEFAULT 10,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- EVENT TICKET ORDERS TABLE
-- Ticket purchase orders
-- =====================================================
CREATE TABLE IF NOT EXISTS event_ticket_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Order Details
    order_number VARCHAR(50) UNIQUE NOT NULL,
    ticket_id UUID NOT NULL REFERENCES event_tickets(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'completed', 'refunded', 'failed'
    )),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    
    -- Attendee Info
    attendee_name VARCHAR(255),
    attendee_email VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_event_rsvp_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.response = 'going' THEN
            UPDATE events SET going_count = going_count + 1 WHERE id = NEW.event_id;
        ELSIF NEW.response = 'interested' THEN
            UPDATE events SET interested_count = interested_count + 1 WHERE id = NEW.event_id;
        ELSIF NEW.response = 'maybe' THEN
            UPDATE events SET maybe_count = maybe_count + 1 WHERE id = NEW.event_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.response != NEW.response THEN
            IF OLD.response = 'going' THEN
                UPDATE events SET going_count = GREATEST(going_count - 1, 0) WHERE id = NEW.event_id;
            ELSIF OLD.response = 'interested' THEN
                UPDATE events SET interested_count = GREATEST(interested_count - 1, 0) WHERE id = NEW.event_id;
            ELSIF OLD.response = 'maybe' THEN
                UPDATE events SET maybe_count = GREATEST(maybe_count - 1, 0) WHERE id = NEW.event_id;
            END IF;
            
            IF NEW.response = 'going' THEN
                UPDATE events SET going_count = going_count + 1 WHERE id = NEW.event_id;
            ELSIF NEW.response = 'interested' THEN
                UPDATE events SET interested_count = interested_count + 1 WHERE id = NEW.event_id;
            ELSIF NEW.response = 'maybe' THEN
                UPDATE events SET maybe_count = maybe_count + 1 WHERE id = NEW.event_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.response = 'going' THEN
            UPDATE events SET going_count = GREATEST(going_count - 1, 0) WHERE id = OLD.event_id;
        ELSIF OLD.response = 'interested' THEN
            UPDATE events SET interested_count = GREATEST(interested_count - 1, 0) WHERE id = OLD.event_id;
        ELSIF OLD.response = 'maybe' THEN
            UPDATE events SET maybe_count = GREATEST(maybe_count - 1, 0) WHERE id = OLD.event_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_rsvp_counts
    AFTER INSERT OR UPDATE OR DELETE ON event_rsvps
    FOR EACH ROW EXECUTE FUNCTION update_event_rsvp_counts();

-- Update timestamps
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_rsvps_updated_at BEFORE UPDATE ON event_rsvps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE events IS 'Main event entity with full event management';
COMMENT ON TABLE event_rsvps IS 'Event attendance responses';
COMMENT ON TABLE event_invites IS 'Event invitations';
COMMENT ON TABLE event_roles IS 'Event hosts and co-hosts';
COMMENT ON TABLE event_schedule IS 'Event schedule/agenda items';
COMMENT ON TABLE event_tickets IS 'Paid event tickets';
COMMENT ON TABLE event_ticket_orders IS 'Ticket purchase orders';
