-- Performance Optimization Migration
-- This migration addresses slow query patterns identified in performance analysis

-- 1. Create indexes for common table lookups that are causing performance issues
-- Based on the heavy pg_class, pg_attribute, and pg_type queries

-- Add index for faster table metadata queries
CREATE INDEX IF NOT EXISTS idx_pg_attribute_relid_attnum 
ON pg_attribute (attrelid, attnum) 
WHERE attnum > 0 AND NOT attisdropped;

-- 2. Optimize timezone lookups (major performance issue - 34.8% of query time)
-- Create a materialized view for timezone names to avoid repeated scans
CREATE MATERIALIZED VIEW IF NOT EXISTS cached_timezone_names AS
SELECT name FROM pg_timezone_names
ORDER BY name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cached_timezone_names_name 
ON cached_timezone_names (name);

-- Refresh the materialized view (should be done periodically)
REFRESH MATERIALIZED VIEW cached_timezone_names;

-- 3. Add indexes for common role and permission queries
-- Based on the authenticator role queries

-- Index for role configuration queries
CREATE INDEX IF NOT EXISTS idx_pg_roles_rolconfig 
ON pg_roles USING gin(rolconfig) 
WHERE rolconfig IS NOT NULL;

-- 4. Optimize application-specific tables
-- Add indexes for common query patterns in your payment analyzer

-- Index for analyses table (common queries)
CREATE INDEX IF NOT EXISTS idx_analyses_user_id_created_at 
ON public.analyses (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analyses_fingerprint 
ON public.analyses (fingerprint) 
WHERE fingerprint IS NOT NULL;

-- Index for daily_entries table
CREATE INDEX IF NOT EXISTS idx_daily_entries_analysis_id_date 
ON public.daily_entries (analysis_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_entries_date_analysis_id 
ON public.daily_entries (date, analysis_id);

-- Index for analysis_files table
CREATE INDEX IF NOT EXISTS idx_analysis_files_analysis_id 
ON public.analysis_files (analysis_id);

-- Index for user_sessions table (for recovery functionality)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_created_at 
ON public.user_sessions (user_id, created_at DESC);

-- 5. Add partial indexes for active records only
-- These reduce index size and improve performance for common queries

CREATE INDEX IF NOT EXISTS idx_analyses_active_user_created 
ON public.analyses (user_id, created_at DESC) 
WHERE status IN ('completed', 'processing');

-- 6. Optimize RLS policy performance with covering indexes
-- Based on common RLS patterns

CREATE INDEX IF NOT EXISTS idx_analyses_user_id_covering 
ON public.analyses (user_id) 
INCLUDE (id, title, status, created_at);

CREATE INDEX IF NOT EXISTS idx_daily_entries_user_covering 
ON public.daily_entries (user_id) 
INCLUDE (analysis_id, date, consignment_count);

-- 7. Add statistics targets for better query planning
-- Increase statistics for columns used in complex queries

ALTER TABLE public.analyses ALTER COLUMN user_id SET STATISTICS 1000;
ALTER TABLE public.analyses ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE public.daily_entries ALTER COLUMN analysis_id SET STATISTICS 1000;
ALTER TABLE public.daily_entries ALTER COLUMN date SET STATISTICS 1000;

-- 8. Create function to refresh timezone cache periodically
CREATE OR REPLACE FUNCTION refresh_timezone_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW cached_timezone_names;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Add comment explaining the optimizations
COMMENT ON MATERIALIZED VIEW cached_timezone_names IS 
'Cached timezone names to avoid expensive pg_timezone_names scans. Refresh periodically.';

COMMENT ON FUNCTION refresh_timezone_cache() IS 
'Refreshes the cached_timezone_names materialized view. Should be called periodically.';

-- 10. Create monitoring view for tracking query performance
CREATE OR REPLACE VIEW query_performance_monitor AS
SELECT 
  schemaname,
  tablename,
  attname as column_name,
  n_distinct,
  correlation,
  most_common_vals[1:5] as top_values,
  most_common_freqs[1:5] as top_frequencies
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY schemaname, tablename, attname;

COMMENT ON VIEW query_performance_monitor IS 
'Monitoring view for tracking column statistics and query optimization opportunities.';