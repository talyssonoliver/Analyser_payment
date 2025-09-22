-- Consolidate RLS policies to fix multiple permissive policies advisory
-- The issue is having both specific SELECT policies and FOR ALL policies that include SELECT
-- This migration removes the redundant SELECT-specific policies and keeps only the FOR ALL policies

-- Payment rules policies - Remove redundant SELECT policy
DROP POLICY IF EXISTS "Users can view their own payment rules" ON payment_rules;
-- Keep only: "Users can manage their own payment rules" (FOR ALL covers SELECT)

-- Analyses policies - Remove redundant SELECT policy  
DROP POLICY IF EXISTS "Users can view their own analyses" ON analyses;
-- Keep only: "Users can manage their own analyses" (FOR ALL covers SELECT)

-- Daily entries policies - Remove redundant SELECT policy
DROP POLICY IF EXISTS "Users can view daily entries for their analyses" ON daily_entries;  
-- Keep only: "Users can manage daily entries for their analyses" (FOR ALL covers SELECT)

-- Analysis totals policies - Remove redundant SELECT policy
DROP POLICY IF EXISTS "Users can view totals for their analyses" ON analysis_totals;
-- Keep only: "Users can manage totals for their analyses" (FOR ALL covers SELECT)

-- Analysis files policies - Remove redundant SELECT policy
DROP POLICY IF EXISTS "Users can view files for their analyses" ON analysis_files;
-- Keep only: "Users can manage files for their analyses" (FOR ALL covers SELECT)  

-- User sessions policies - Remove redundant SELECT policy
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
-- Keep only: "Users can manage their own sessions" (FOR ALL covers SELECT)

-- Profiles table - Keep separate policies for granular control
-- This table benefits from having separate SELECT/UPDATE/INSERT policies
-- No changes needed for profiles table

-- Add documentation about the policy consolidation
COMMENT ON POLICY "Users can manage their own payment rules" ON payment_rules IS 
'Consolidated RLS policy (FOR ALL) includes SELECT, INSERT, UPDATE, DELETE operations. Optimized with subquery to prevent per-row auth.uid() re-evaluation.';

COMMENT ON POLICY "Users can manage their own analyses" ON analyses IS 
'Consolidated RLS policy (FOR ALL) includes SELECT, INSERT, UPDATE, DELETE operations. Optimized with subquery to prevent per-row auth.uid() re-evaluation.';

COMMENT ON POLICY "Users can manage daily entries for their analyses" ON daily_entries IS 
'Consolidated RLS policy (FOR ALL) includes SELECT, INSERT, UPDATE, DELETE operations. Uses EXISTS subquery for security through parent analyses table.';

COMMENT ON POLICY "Users can manage totals for their analyses" ON analysis_totals IS 
'Consolidated RLS policy (FOR ALL) includes SELECT, INSERT, UPDATE, DELETE operations. Uses EXISTS subquery for security through parent analyses table.';

COMMENT ON POLICY "Users can manage files for their analyses" ON analysis_files IS 
'Consolidated RLS policy (FOR ALL) includes SELECT, INSERT, UPDATE, DELETE operations. Uses EXISTS subquery for security through parent analyses table.';

COMMENT ON POLICY "Users can manage their own sessions" ON user_sessions IS 
'Consolidated RLS policy (FOR ALL) includes SELECT, INSERT, UPDATE, DELETE operations. Optimized with subquery to prevent per-row auth.uid() re-evaluation.';