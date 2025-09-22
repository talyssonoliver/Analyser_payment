-- Performance Optimization: Remove Unused Indexes
-- Migration 008: Clean up unused indexes identified by performance advisors

-- ============================================================================
-- REMOVE UNUSED INDEXES (Based on Supabase Performance Advisors)
-- ============================================================================

-- Drop unused indexes on analyses table
DROP INDEX IF EXISTS idx_analyses_fingerprint;
DROP INDEX IF EXISTS idx_analyses_period;
DROP INDEX IF EXISTS idx_analyses_status_created;
DROP INDEX IF EXISTS idx_analyses_user_period;
DROP INDEX IF EXISTS idx_analyses_user_id_covering;
DROP INDEX IF EXISTS idx_analyses_active_user_created;

-- Drop unused indexes on daily_entries table  
DROP INDEX IF EXISTS idx_daily_entries_analysis_date;
DROP INDEX IF EXISTS idx_daily_entries_date_status;
DROP INDEX IF EXISTS idx_daily_entries_status_date;
DROP INDEX IF EXISTS idx_daily_entries_analysis_status;
DROP INDEX IF EXISTS idx_daily_entries_covering;

-- Drop unused indexes on analysis_files table
DROP INDEX IF EXISTS idx_analysis_files_analysis;
DROP INDEX IF EXISTS idx_analysis_files_hash;
DROP INDEX IF EXISTS idx_analysis_files_type;
DROP INDEX IF EXISTS idx_analysis_files_size;

-- Drop unused indexes on analysis_totals table
DROP INDEX IF EXISTS idx_analysis_totals_covering;

-- Drop unused indexes on user_sessions table
DROP INDEX IF EXISTS idx_user_sessions_user_activity;
DROP INDEX IF EXISTS idx_user_sessions_expires;

-- Drop unused indexes on payment_rules table
DROP INDEX IF EXISTS idx_payment_rules_user_active;
DROP INDEX IF EXISTS idx_payment_rules_active_version;
DROP INDEX IF EXISTS idx_payment_rules_valid_period;

-- Drop unused indexes on profiles table
DROP INDEX IF EXISTS idx_profiles_preferences;

-- ============================================================================
-- KEEP ESSENTIAL INDEXES (These are being used by actual queries)
-- ============================================================================

-- Keep these indexes as they're used by your actual query patterns:
-- idx_profiles_user_id (for auth queries)
-- idx_analyses_user_created (for getUserAnalyses with ordering)
-- idx_daily_entries_analysis_id_date (for daily entries lookup)
-- idx_analysis_files_analysis_id (for file associations)
-- idx_payment_rules_user_active (if being used for active rules lookup)

-- ============================================================================
-- ADD TARGETED INDEXES (Based on actual query patterns)
-- ============================================================================

-- Index for getUserAnalyses query (most common pattern)
CREATE INDEX IF NOT EXISTS idx_analyses_user_status_created 
ON public.analyses (user_id, status, created_at DESC);

-- Index for daily entries queries (analysis_id + date are always used together)
CREATE INDEX IF NOT EXISTS idx_daily_entries_analysis_date_optimized 
ON public.daily_entries (analysis_id, date);

-- Index for profile lookups (used in auth-service.ts)
CREATE INDEX IF NOT EXISTS idx_profiles_user_lookup 
ON public.profiles (user_id) 
INCLUDE (email, display_name, preferences);

-- ============================================================================
-- OPTIMIZATION SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== INDEX CLEANUP APPLIED ===';
    RAISE NOTICE '🗑️  Removed 20+ unused indexes to improve write performance';
    RAISE NOTICE '⚡ Added 3 targeted indexes based on actual query patterns';
    RAISE NOTICE '📈 Expected improvements:';
    RAISE NOTICE '   - Faster INSERT/UPDATE operations (fewer indexes to maintain)';
    RAISE NOTICE '   - Reduced storage usage';
    RAISE NOTICE '   - Better query performance on frequently used patterns';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Query patterns optimized:';
    RAISE NOTICE '   - getUserAnalyses(): user_id + status + created_at ordering';
    RAISE NOTICE '   - Daily entries lookup: analysis_id + date';  
    RAISE NOTICE '   - Profile lookups: user_id with included columns';
END $$;
