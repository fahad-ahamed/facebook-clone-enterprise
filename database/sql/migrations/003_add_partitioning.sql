-- =====================================================
-- Migration: 003_add_partitioning
-- Created: 2024-01-03
-- Description: Add table partitioning for high-volume tables
-- =====================================================

-- Partition posts by created_at (monthly)
-- Note: Requires PostgreSQL 10+ and careful planning

-- Create partitioned posts table template
-- CREATE TABLE posts_partitioned (
--     LIKE posts INCLUDING ALL
-- ) PARTITION BY RANGE (created_at);

-- Create partitions for each month
-- CREATE TABLE posts_2024_01 PARTITION OF posts_partitioned
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- CREATE TABLE posts_2024_02 PARTITION OF posts_partitioned
--     FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Create default partition for catch-all
-- CREATE TABLE posts_default PARTITION OF posts_partitioned DEFAULT;

-- Partition ad_performance by date
CREATE TABLE IF NOT EXISTS ad_performance_partitioned (
    LIKE ad_performance INCLUDING ALL
) PARTITION BY RANGE (date);

-- Create monthly partitions
CREATE TABLE IF NOT EXISTS ad_performance_2024_01 PARTITION OF ad_performance_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE IF NOT EXISTS ad_performance_2024_02 PARTITION OF ad_performance_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Create default partition
CREATE TABLE IF NOT EXISTS ad_performance_default PARTITION OF ad_performance_partitioned DEFAULT;

-- Partition marketplace_views by viewed_at
CREATE TABLE IF NOT EXISTS marketplace_views_partitioned (
    LIKE marketplace_views INCLUDING ALL
) PARTITION BY RANGE (viewed_at);

-- Create monthly partitions
CREATE TABLE IF NOT EXISTS marketplace_views_2024_01 PARTITION OF marketplace_views_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE IF NOT EXISTS marketplace_views_2024_02 PARTITION OF marketplace_views_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Function to create new partitions automatically
CREATE OR REPLACE FUNCTION create_monthly_partition(
    base_table TEXT,
    start_date DATE
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := base_table || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        base_table,
        start_date,
        end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Function to drop old partitions
CREATE OR REPLACE FUNCTION drop_old_partitions(
    base_table TEXT,
    months_to_keep INTEGER DEFAULT 12
) RETURNS VOID AS $$
DECLARE
    partition_record RECORD;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - (months_to_keep || ' months')::INTERVAL;
    
    FOR partition_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE base_table || '_%'
        ORDER BY tablename
    LOOP
        -- Check if partition is older than cutoff
        -- Drop if needed
        -- EXECUTE 'DROP TABLE IF EXISTS ' || partition_record.tablename;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
