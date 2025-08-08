-- ================================================================
-- COMPLETE DISCORD SWEARFILTER BOT DATABASE SCHEMA
-- This script creates ALL tables needed for the entire bot system
-- ================================================================

-- Drop all existing tables and functions to start fresh
DROP VIEW IF EXISTS recent_violations CASCADE;
DROP VIEW IF EXISTS guild_stats_summary CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS violations_timeseries(bigint, integer) CASCADE;
DROP FUNCTION IF EXISTS top_blocked_words(bigint, integer) CASCADE;
DROP FUNCTION IF EXISTS get_guild_stats(bigint, integer) CASCADE;
DROP FUNCTION IF EXISTS increment_user_warnings(bigint, bigint) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_logs(integer) CASCADE;

DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS user_warnings CASCADE;
DROP INDEX IF EXISTS idx_filter_logs_today;
DROP TABLE IF EXISTS filter_logs CASCADE;
DROP TABLE IF EXISTS guild_settings CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- CORE TABLES
-- ================================================================

-- Guild settings - Main configuration for each Discord server
CREATE TABLE guild_settings (
    guild_id BIGINT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    action TEXT NOT NULL DEFAULT 'delete' CHECK (action IN ('delete', 'timeout', 'kick', 'ban')),
    auto_timeout BOOLEAN NOT NULL DEFAULT false,
    timeout_duration INTEGER NOT NULL DEFAULT 300 CHECK (timeout_duration BETWEEN 60 AND 3600),
    filter_level INTEGER NOT NULL DEFAULT 1 CHECK (filter_level BETWEEN 1 AND 5),
    log_channel_id BIGINT,
    bypass_roles TEXT[] NOT NULL DEFAULT '{}',
    bypass_channels TEXT[] NOT NULL DEFAULT '{}',
    custom_words TEXT[] NOT NULL DEFAULT '{}',
    whitelist_words TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Filter logs - Every violation gets logged here with full user details
CREATE TABLE filter_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    user_name TEXT NOT NULL DEFAULT 'Unknown User',
    user_avatar TEXT,
    channel_id BIGINT,
    channel_name TEXT NOT NULL DEFAULT 'Unknown Channel',
    message_id BIGINT,
    message_content TEXT,
    blocked_words TEXT[] NOT NULL DEFAULT '{}',
    action_taken TEXT NOT NULL DEFAULT 'delete',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key to guild_settings
    CONSTRAINT fk_filter_logs_guild FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
);

-- User warnings - Track how many times each user violated rules
CREATE TABLE user_warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    warning_count INTEGER NOT NULL DEFAULT 1,
    last_violation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(guild_id, user_id),
    CONSTRAINT fk_user_warnings_guild FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id) ON DELETE CASCADE
);

-- Performance metrics - Bot performance and health monitoring
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC,
    guild_id BIGINT, -- Optional: per-guild metrics
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================
-- ================================================================
-- INDEXES FOR PERFORMANCE (CORRECTED VERSION)
-- ================================================================

-- Guild settings indexes
CREATE INDEX IF NOT EXISTS idx_guild_settings_guild_id ON guild_settings(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_settings_enabled ON guild_settings(enabled) WHERE enabled = true;

-- Filter logs indexes (most important for dashboard performance)
CREATE INDEX IF NOT EXISTS idx_filter_logs_guild_id ON filter_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_filter_logs_timestamp ON filter_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_filter_logs_guild_timestamp ON filter_logs(guild_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_filter_logs_user_id ON filter_logs(user_id);
-- REMOVED: idx_filter_logs_today (was causing immutable function error)

-- User warnings indexes
CREATE INDEX IF NOT EXISTS idx_user_warnings_guild_user ON user_warnings(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_warnings_guild_id ON user_warnings(guild_id);
CREATE INDEX IF NOT EXISTS idx_user_warnings_count ON user_warnings(warning_count DESC);

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded ON performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_guild ON performance_metrics(guild_id) WHERE guild_id IS NOT NULL;
-- ================================================================
-- FUNCTIONS
-- ================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Get top blocked words for analytics
CREATE OR REPLACE FUNCTION top_blocked_words(p_guild BIGINT, p_days INTEGER DEFAULT 7)
RETURNS TABLE(word TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    WITH word_counts AS (
        SELECT 
            jsonb_array_elements_text(
                CASE 
                    WHEN jsonb_typeof(to_jsonb(blocked_words)) = 'array' THEN to_jsonb(blocked_words)
                    ELSE '[]'::jsonb
                END
            ) as word
        FROM filter_logs
        WHERE guild_id = p_guild
        AND timestamp > (NOW() - (p_days || ' days')::INTERVAL)
        AND blocked_words IS NOT NULL
        AND array_length(blocked_words, 1) > 0
    )
    SELECT 
        wc.word,
        COUNT(*) as word_count
    FROM word_counts wc
    WHERE wc.word IS NOT NULL 
    AND LENGTH(trim(wc.word)) > 0
    AND wc.word != 'filtered_content'
    GROUP BY wc.word
    ORDER BY word_count DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get violations over time for the real-time chart
CREATE OR REPLACE FUNCTION violations_timeseries(p_guild BIGINT, p_hours INTEGER DEFAULT 24)
RETURNS TABLE(hour TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE hour_series AS (
        -- Generate all hours in the time range
        SELECT 
            generate_series(
                date_trunc('hour', NOW() - (p_hours || ' hours')::INTERVAL),
                date_trunc('hour', NOW()),
                '1 hour'::INTERVAL
            ) AS hour_bucket
    ),
    violation_counts AS (
        -- Count actual violations per hour
        SELECT 
            date_trunc('hour', timestamp) as violation_hour,
            COUNT(*) as violation_count
        FROM filter_logs
        WHERE guild_id = p_guild
        AND timestamp > (NOW() - (p_hours || ' hours')::INTERVAL)
        GROUP BY date_trunc('hour', timestamp)
    )
    SELECT 
        TO_CHAR(hs.hour_bucket AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hour,
        COALESCE(vc.violation_count, 0) as count
    FROM hour_series hs
    LEFT JOIN violation_counts vc ON hs.hour_bucket = vc.violation_hour
    ORDER BY hs.hour_bucket;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get comprehensive guild statistics
CREATE OR REPLACE FUNCTION get_guild_stats(p_guild BIGINT, p_days INTEGER DEFAULT 7)
RETURNS TABLE(
    total_violations BIGINT,
    violations_today BIGINT,
    unique_violators BIGINT,
    avg_violations_per_day NUMERIC,
    most_active_hour INTEGER,
    top_violator_id BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total_viols,
            COUNT(*) FILTER (WHERE timestamp::date = CURRENT_DATE) as today_viols,
            COUNT(DISTINCT user_id) as unique_users,
            ROUND(COUNT(*) FILTER (WHERE timestamp > NOW() - (p_days || ' days')::INTERVAL)::NUMERIC / p_days, 2) as daily_avg
        FROM filter_logs 
        WHERE guild_id = p_guild
    ),
    hourly_activity AS (
        SELECT EXTRACT(hour FROM timestamp)::INTEGER as hour_of_day, COUNT(*) as cnt
        FROM filter_logs
        WHERE guild_id = p_guild 
        AND timestamp > NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(hour FROM timestamp)
        ORDER BY cnt DESC
        LIMIT 1
    ),
    top_user AS (
        SELECT user_id, COUNT(*) as violation_count
        FROM filter_logs
        WHERE guild_id = p_guild
        AND timestamp > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY user_id
        ORDER BY violation_count DESC
        LIMIT 1
    )
    SELECT 
        s.total_viols,
        s.today_viols,
        s.unique_users,
        s.daily_avg,
        COALESCE(h.hour_of_day, 0),
        t.user_id
    FROM stats s
    LEFT JOIN hourly_activity h ON true
    LEFT JOIN top_user t ON true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Increment user warnings and return new count
CREATE OR REPLACE FUNCTION increment_user_warnings(p_guild BIGINT, p_user BIGINT)
RETURNS INTEGER AS $$
DECLARE
    warning_count INTEGER;
BEGIN
    INSERT INTO user_warnings (guild_id, user_id, warning_count, last_violation)
    VALUES (p_guild, p_user, 1, NOW())
    ON CONFLICT (guild_id, user_id)
    DO UPDATE SET 
        warning_count = user_warnings.warning_count + 1,
        last_violation = NOW()
    RETURNING user_warnings.warning_count INTO warning_count;
    
    RETURN COALESCE(warning_count, 1);
END;
$$ LANGUAGE plpgsql;

-- Clean up old data (maintenance function)
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE(deleted_logs INTEGER, deleted_warnings INTEGER) AS $$
DECLARE
    logs_deleted INTEGER;
    warnings_deleted INTEGER;
BEGIN
    -- Delete old filter logs
    DELETE FROM filter_logs 
    WHERE timestamp < (NOW() - (days_to_keep || ' days')::INTERVAL);
    GET DIAGNOSTICS logs_deleted = ROW_COUNT;
    
    -- Delete old warnings for users who haven't violated recently
    DELETE FROM user_warnings
    WHERE last_violation < (NOW() - (days_to_keep || ' days')::INTERVAL);
    GET DIAGNOSTICS warnings_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT logs_deleted, warnings_deleted;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_guild_settings_updated_at
    BEFORE UPDATE ON guild_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- VIEWS FOR EASY QUERYING
-- ================================================================
-- ================================================================
-- VIEWS FOR EASY QUERYING (CORRECTED VERSION)
-- ================================================================

-- Recent violations view (last 24 hours with enriched data)
CREATE VIEW recent_violations AS
SELECT 
    fl.id,
    fl.guild_id,
    fl.user_id,
    fl.user_name,
    fl.user_avatar,
    fl.channel_id,
    fl.channel_name,
    fl.message_content,
    fl.blocked_words,
    fl.action_taken,
    fl.timestamp,
    gs.enabled as guild_filter_enabled,
    uw.warning_count,
    EXTRACT(EPOCH FROM (NOW() - fl.timestamp))::INTEGER as seconds_ago
FROM filter_logs fl
LEFT JOIN guild_settings gs ON fl.guild_id = gs.guild_id
LEFT JOIN user_warnings uw ON fl.guild_id = uw.guild_id AND fl.user_id = uw.user_id
WHERE fl.timestamp > (NOW() - INTERVAL '24 hours')
ORDER BY fl.timestamp DESC;

-- Guild statistics summary view (FIXED - removed FILTER from non-aggregate functions)
CREATE VIEW guild_stats_summary AS
SELECT 
    gs.guild_id,
    gs.enabled,
    gs.action,
    gs.log_channel_id,
    COUNT(fl.id) as total_violations,
    COUNT(fl.id) FILTER (WHERE fl.timestamp::date = CURRENT_DATE) as violations_today,
    COUNT(DISTINCT fl.user_id) as unique_violators,
    MAX(fl.timestamp) as last_violation,
    -- Fixed: Use CASE instead of FILTER for non-aggregate functions
    CASE 
        WHEN gs.custom_words IS NOT NULL THEN array_length(gs.custom_words, 1)
        ELSE 0
    END as custom_word_count,
    CASE 
        WHEN gs.bypass_roles IS NOT NULL THEN array_length(gs.bypass_roles, 1)
        ELSE 0
    END as bypass_role_count,
    CASE 
        WHEN gs.bypass_channels IS NOT NULL THEN array_length(gs.bypass_channels, 1)
        ELSE 0
    END as bypass_channel_count
FROM guild_settings gs
LEFT JOIN filter_logs fl ON gs.guild_id = fl.guild_id
GROUP BY gs.guild_id, gs.enabled, gs.action, gs.log_channel_id, gs.custom_words, gs.bypass_roles, gs.bypass_channels;

-- ================================================================
-- SAMPLE DATA & PERFORMANCE METRICS
-- ================================================================

-- Insert initial performance metrics
INSERT INTO performance_metrics (metric_name, metric_value, recorded_at) VALUES
('bot_uptime_seconds', 0, NOW()),
('total_guilds_connected', 0, NOW()),
('total_users_watched', 0, NOW()),
('cache_hit_ratio', 0, NOW()),
('avg_query_time_ms', 0, NOW()),
('total_queries_executed', 0, NOW()),
('memory_usage_mb', 0, NOW())
ON CONFLICT DO NOTHING;

-- ================================================================
-- ROW LEVEL SECURITY (Optional - Recommended for Production)
-- ================================================================

-- Enable RLS on sensitive tables
ALTER TABLE guild_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication system)
CREATE POLICY "Guild settings access" ON guild_settings FOR ALL USING (true); -- Adjust this
CREATE POLICY "Filter logs access" ON filter_logs FOR ALL USING (true); -- Adjust this
CREATE POLICY "User warnings access" ON user_warnings FOR ALL USING (true); -- Adjust this

-- ================================================================
-- UTILITY FUNCTIONS FOR THE BOT
-- ================================================================

-- Function to get or create guild settings
CREATE OR REPLACE FUNCTION get_or_create_guild_settings(p_guild_id BIGINT)
RETURNS guild_settings AS $$
DECLARE
    result guild_settings;
BEGIN
    SELECT * INTO result FROM guild_settings WHERE guild_id = p_guild_id;
    
    IF NOT FOUND THEN
        INSERT INTO guild_settings (guild_id) VALUES (p_guild_id)
        RETURNING * INTO result;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to log a filter action (used by the bot)
CREATE OR REPLACE FUNCTION log_filter_action(
    p_guild_id BIGINT,
    p_user_id BIGINT,
    p_user_name TEXT,
    p_user_avatar TEXT,
    p_channel_id BIGINT,
    p_channel_name TEXT,
    p_message_id BIGINT,
    p_message_content TEXT,
    p_blocked_words TEXT[],
    p_action_taken TEXT
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO filter_logs (
        guild_id, user_id, user_name, user_avatar, 
        channel_id, channel_name, message_id, message_content,
        blocked_words, action_taken
    ) VALUES (
        p_guild_id, p_user_id, p_user_name, p_user_avatar,
        p_channel_id, p_channel_name, p_message_id, p_message_content,
        p_blocked_words, p_action_taken
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- COMPLETION & VERIFICATION
-- ================================================================

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count created objects
    SELECT COUNT(*) INTO table_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('guild_settings', 'filter_logs', 'user_warnings', 'performance_metrics');
    
    SELECT COUNT(*) INTO function_count FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name IN ('top_blocked_words', 'violations_timeseries', 'get_guild_stats', 'increment_user_warnings');
    
    SELECT COUNT(*) INTO index_count FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
    
    -- Report results
    RAISE NOTICE '🎉 Discord SwearFilter Bot Database Setup Complete!';
    RAISE NOTICE '📋 Tables created: % (guild_settings, filter_logs, user_warnings, performance_metrics)', table_count;
    RAISE NOTICE '⚙️  Functions created: % (analytics and utility functions)', function_count;  
    RAISE NOTICE '🚀 Indexes created: % (optimized for dashboard performance)', index_count;
    RAISE NOTICE '👀 Views created: 2 (recent_violations, guild_stats_summary)';
    RAISE NOTICE '🔒 Row Level Security: Enabled (adjust policies as needed)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Your Discord bot database is ready to use!';
    RAISE NOTICE '🔧 Next steps:';
    RAISE NOTICE '   1. Update your bot code to use the new schema';
    RAISE NOTICE '   2. Test the dashboard endpoints';
    RAISE NOTICE '   3. Verify real-time updates are working';
END $$;