-- =====================================================
-- Migration: 002_add_full_text_search
-- Created: 2024-01-02
-- Description: Add full-text search capabilities
-- =====================================================

-- Add search vector columns
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
ALTER TABLE events ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Create search vector update triggers
CREATE TRIGGER posts_search_vector_update
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

CREATE TRIGGER users_search_vector_update
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

CREATE TRIGGER pages_search_vector_update
    BEFORE INSERT OR UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

CREATE TRIGGER groups_search_vector_update
    BEFORE INSERT OR UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Create GIN indexes for search vectors
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_users_search_vector ON users USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_pages_search_vector ON pages USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_groups_search_vector ON groups USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_events_search_vector ON events USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_marketplace_search_vector ON marketplace_listings USING gin(search_vector);

-- Create search function
CREATE OR REPLACE FUNCTION search_posts(search_query TEXT)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    rank FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.content AS title,
        p.content,
        ts_rank(p.search_vector, plainto_tsquery('english', search_query)) AS rank
    FROM posts p
    WHERE p.search_vector @@ plainto_tsquery('english', search_query)
    AND p.status = 'published'
    AND p.deleted_at IS NULL
    ORDER BY rank DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Create user search function
CREATE OR REPLACE FUNCTION search_users(search_query TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(50),
    avatar TEXT,
    rank FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.avatar,
        ts_rank(u.search_vector, plainto_tsquery('english', search_query)) AS rank
    FROM users u
    WHERE u.search_vector @@ plainto_tsquery('english', search_query)
    AND u.account_status = 'active'
    AND u.deleted_at IS NULL
    ORDER BY rank DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
