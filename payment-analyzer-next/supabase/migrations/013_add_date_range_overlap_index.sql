-- Add Date Range Overlap Index for Merge Detection
-- Migration 013: Support efficient date range overlap queries for file upload conflict detection
--
-- Context: The new merge workflow (CRITICAL_FIX_ANALYSIS_MERGE_PLAN.md) requires
-- fast detection of existing analyses that overlap with newly uploaded files.
--
-- Query Pattern:
--   SELECT * FROM analyses
--   WHERE user_id = ?
--   AND period_start <= ?
--   AND period_end >= ?
--   AND status IN ('completed', 'processing')
--
-- Performance Target: <100ms for typical user with 50+ analyses

-- ============================================================================
-- ADD DATE RANGE OVERLAP INDEX
-- ============================================================================

-- Index for findAnalysesByDateRange() query
-- This index supports the overlap detection query:
--   WHERE user_id = ? AND period_start <= ? AND period_end >= ?
--
-- Index columns in order of selectivity:
-- 1. user_id (most selective - filters to single user)
-- 2. status (selective - filters active analyses)
-- 3. period_start, period_end (range scan for overlap detection)
CREATE INDEX IF NOT EXISTS idx_analyses_date_range_overlap
ON public.analyses (user_id, status, period_start, period_end)
WHERE status IN ('completed', 'processing');

-- Alternative: Using GiST index for true range overlap queries
-- This is more sophisticated but may be overkill for our use case
-- Uncomment if the btree index above doesn't perform well:
--
-- CREATE EXTENSION IF NOT EXISTS btree_gist;
-- CREATE INDEX IF NOT EXISTS idx_analyses_period_range_gist
-- ON public.analyses USING gist (
--   user_id,
--   daterange(period_start, period_end, '[]')
-- )
-- WHERE status IN ('completed', 'processing');

-- ============================================================================
-- PERFORMANCE ANALYSIS
-- ============================================================================

-- Explain the query pattern this index optimizes
DO $$
DECLARE
    index_size TEXT;
BEGIN
    -- Get index size
    SELECT pg_size_pretty(pg_relation_size('idx_analyses_date_range_overlap'))
    INTO index_size;

    RAISE NOTICE '=== DATE RANGE OVERLAP INDEX ADDED ===';
    RAISE NOTICE '📁 Index: idx_analyses_date_range_overlap';
    RAISE NOTICE '📊 Size: %', COALESCE(index_size, 'calculating...');
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Optimized Query Pattern:';
    RAISE NOTICE '   findAnalysesByDateRange(userId, startDate, endDate)';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Use Case:';
    RAISE NOTICE '   - Detect file upload conflicts before processing';
    RAISE NOTICE '   - Show merge dialog when overlapping analyses exist';
    RAISE NOTICE '   - Fast response for better UX (<100ms target)';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Index Strategy:';
    RAISE NOTICE '   - Partial index (only completed/processing analyses)';
    RAISE NOTICE '   - Composite: user_id + status + period_start + period_end';
    RAISE NOTICE '   - Supports both point lookups and range scans';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Index created successfully';
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- You can verify the index is being used with:
-- EXPLAIN ANALYZE
-- SELECT * FROM analyses
-- WHERE user_id = 'some-user-id'
-- AND period_start <= '2025-10-19'
-- AND period_end >= '2025-10-14'
-- AND status IN ('completed', 'processing');
--
-- Expected: Index Scan using idx_analyses_date_range_overlap
