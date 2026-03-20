-- =====================================================
-- Migration: 005_add_row_level_security
-- Created: 2024-01-05
-- Description: Add row-level security policies
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY users_select_public ON users
    FOR SELECT
    USING (
        id = current_setting('app.current_user_id', TRUE)::UUID
        OR account_status = 'active'
    );

CREATE POLICY users_update_own ON users
    FOR UPDATE
    USING (id = current_setting('app.current_user_id', TRUE)::UUID);

-- Posts policies
CREATE POLICY posts_select_visible ON posts
    FOR SELECT
    USING (
        -- Own posts
        author_id = current_setting('app.current_user_id', TRUE)::UUID
        -- Public posts
        OR visibility = 'public'
        -- Friends only posts (simplified)
        OR (visibility = 'friends' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user1_id = posts.author_id AND f.user2_id = current_setting('app.current_user_id', TRUE)::UUID)
            OR (f.user2_id = posts.author_id AND f.user1_id = current_setting('app.current_user_id', TRUE)::UUID)
        ))
        -- Group posts (member check)
        OR (visibility = 'group' AND group_id IN (
            SELECT gm.group_id FROM group_memberships gm
            WHERE gm.user_id = current_setting('app.current_user_id', TRUE)::UUID
            AND gm.status = 'active'
        ))
        -- Admin bypass
        OR current_setting('app.user_role', TRUE) IN ('admin', 'moderator')
    );

CREATE POLICY posts_insert_own ON posts
    FOR INSERT
    WITH CHECK (author_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY posts_update_own ON posts
    FOR UPDATE
    USING (author_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Profiles policies
CREATE POLICY profiles_select_visible ON profiles
    FOR SELECT
    USING (
        user_id = current_setting('app.current_user_id', TRUE)::UUID
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = profiles.user_id
            AND u.account_status = 'active'
        )
    );

CREATE POLICY profiles_update_own ON profiles
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Notifications policies
CREATE POLICY notifications_select_own ON notifications
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY notifications_update_own ON notifications
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Create helper function to check privacy
CREATE OR REPLACE FUNCTION can_view_content(
    content_owner_id UUID,
    content_visibility VARCHAR,
    viewer_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_id UUID;
BEGIN
    v_id := COALESCE(viewer_id, current_setting('app.current_user_id', TRUE)::UUID);
    
    RETURN CASE
        WHEN content_visibility = 'public' THEN TRUE
        WHEN content_visibility = 'only_me' THEN content_owner_id = v_id
        WHEN content_visibility = 'friends' THEN
            content_owner_id = v_id
            OR EXISTS (
                SELECT 1 FROM friendships f
                WHERE (f.user1_id = content_owner_id AND f.user2_id = v_id)
                OR (f.user2_id = content_owner_id AND f.user1_id = v_id)
            )
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to set current user context
CREATE OR REPLACE FUNCTION set_user_context(user_id UUID, user_role VARCHAR DEFAULT 'user')
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::TEXT, FALSE);
    PERFORM set_config('app.user_role', user_role, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
