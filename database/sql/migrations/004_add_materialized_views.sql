-- =====================================================
-- Migration: 004_add_materialized_views
-- Created: 2024-01-04
-- Description: Add materialized views for analytics
-- =====================================================

-- User stats materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_stats_mv AS
SELECT 
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.username,
    COUNT(DISTINCT p.id) AS post_count,
    COUNT(DISTINCT c.id) AS comment_count,
    COUNT(DISTINCT r.id) AS reaction_count,
    COUNT(DISTINCT f1.id) + COUNT(DISTINCT f2.id) AS friend_count,
    COUNT(DISTINCT fo.id) AS follower_count,
    COUNT(DISTINCT fl.id) AS following_count
FROM users u
LEFT JOIN posts p ON p.author_id = u.id AND p.deleted_at IS NULL
LEFT JOIN comments c ON c.author_id = u.id AND c.deleted_at IS NULL
LEFT JOIN reactions r ON r.user_id = u.id
LEFT JOIN friendships f1 ON f1.user1_id = u.id
LEFT JOIN friendships f2 ON f2.user2_id = u.id
LEFT JOIN follows fo ON fo.following_id = u.id
LEFT JOIN follows fl ON fl.follower_id = u.id
WHERE u.deleted_at IS NULL
GROUP BY u.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stats_mv_user ON user_stats_mv(user_id);

-- Post engagement stats materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS post_engagement_stats_mv AS
SELECT 
    p.id AS post_id,
    p.author_id,
    p.post_type,
    p.visibility,
    p.created_at,
    p.reaction_count,
    p.comment_count,
    p.share_count,
    p.view_count,
    (p.reaction_count + p.comment_count * 2 + p.share_count * 5) AS engagement_score
FROM posts p
WHERE p.deleted_at IS NULL
AND p.status = 'published';

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_engagement_stats_mv_post ON post_engagement_stats_mv(post_id);
CREATE INDEX IF NOT EXISTS idx_post_engagement_stats_mv_score ON post_engagement_stats_mv(engagement_score DESC);

-- Page stats materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS page_stats_mv AS
SELECT 
    p.id AS page_id,
    p.name,
    p.category,
    p.like_count,
    p.follower_count,
    COUNT(DISTINCT pp.id) AS post_count,
    AVG(pr.rating) AS avg_rating,
    COUNT(pr.id) AS review_count
FROM pages p
LEFT JOIN page_posts pp ON pp.page_id = p.id
LEFT JOIN page_reviews pr ON pr.page_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_page_stats_mv_page ON page_stats_mv(page_id);

-- Group stats materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS group_stats_mv AS
SELECT 
    g.id AS group_id,
    g.name,
    g.type,
    g.category,
    g.member_count,
    COUNT(DISTINCT gp.id) AS post_count,
    COUNT(DISTINCT gm.id) FILTER (WHERE gm.role IN ('admin', 'moderator')) AS admin_count,
    COUNT(DISTINCT gm.id) FILTER (WHERE gm.status = 'active') AS active_member_count
FROM groups g
LEFT JOIN group_posts gp ON gp.group_id = g.id
LEFT JOIN group_memberships gm ON gm.group_id = g.id
WHERE g.deleted_at IS NULL
GROUP BY g.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_stats_mv_group ON group_stats_mv(group_id);

-- Trending hashtags materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_hashtags_mv AS
SELECT 
    h.id,
    h.name,
    h.post_count,
    COUNT(ph.post_id) AS recent_post_count,
    h.post_count::FLOAT / NULLIF(COUNT(ph.post_id), 0) AS growth_rate
FROM hashtags h
LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id 
    AND ph.post_id IN (
        SELECT id FROM posts 
        WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
    )
WHERE h.is_blocked = FALSE
GROUP BY h.id
ORDER BY recent_post_count DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_hashtags_mv_id ON trending_hashtags_mv(id);

-- Refresh functions
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY post_engagement_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY page_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY group_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_hashtags_mv;
END;
$$ LANGUAGE plpgsql;
