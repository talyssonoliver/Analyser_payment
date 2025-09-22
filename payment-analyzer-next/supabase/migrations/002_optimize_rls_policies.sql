-- Optimize RLS policies to prevent per-row auth.uid() re-evaluation
-- This migration replaces direct auth.uid() calls with subqueries for better performance

-- Drop existing policies to recreate them with optimized expressions

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Payment rules policies
DROP POLICY IF EXISTS "Users can view their own payment rules" ON payment_rules;
DROP POLICY IF EXISTS "Users can manage their own payment rules" ON payment_rules;

-- Analyses policies
DROP POLICY IF EXISTS "Users can view their own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can manage their own analyses" ON analyses;

-- Daily entries policies
DROP POLICY IF EXISTS "Users can view daily entries for their analyses" ON daily_entries;
DROP POLICY IF EXISTS "Users can manage daily entries for their analyses" ON daily_entries;

-- Analysis totals policies
DROP POLICY IF EXISTS "Users can view totals for their analyses" ON analysis_totals;
DROP POLICY IF EXISTS "Users can manage totals for their analyses" ON analysis_totals;

-- Analysis files policies
DROP POLICY IF EXISTS "Users can view files for their analyses" ON analysis_files;
DROP POLICY IF EXISTS "Users can manage files for their analyses" ON analysis_files;

-- User sessions policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON user_sessions;

-- Recreate policies with optimized subquery pattern

-- Profiles policies (OPTIMIZED)
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- Payment rules policies (OPTIMIZED)
CREATE POLICY "Users can view their own payment rules" ON payment_rules
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their own payment rules" ON payment_rules
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Analyses policies (OPTIMIZED)
CREATE POLICY "Users can view their own analyses" ON analyses
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their own analyses" ON analyses
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Daily entries policies (OPTIMIZED - subquery for auth.uid())
CREATE POLICY "Users can view daily entries for their analyses" ON daily_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = daily_entries.analysis_id 
      AND analyses.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage daily entries for their analyses" ON daily_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = daily_entries.analysis_id 
      AND analyses.user_id = (SELECT auth.uid())
    )
  );

-- Analysis totals policies (OPTIMIZED - subquery for auth.uid())
CREATE POLICY "Users can view totals for their analyses" ON analysis_totals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = analysis_totals.analysis_id 
      AND analyses.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage totals for their analyses" ON analysis_totals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = analysis_totals.analysis_id 
      AND analyses.user_id = (SELECT auth.uid())
    )
  );

-- Analysis files policies (OPTIMIZED - subquery for auth.uid())
CREATE POLICY "Users can view files for their analyses" ON analysis_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = analysis_files.analysis_id 
      AND analyses.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage files for their analyses" ON analysis_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = analysis_files.analysis_id 
      AND analyses.user_id = (SELECT auth.uid())
    )
  );

-- User sessions policies (OPTIMIZED)
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their own sessions" ON user_sessions
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Add comments for future reference
COMMENT ON POLICY "Users can view their own profile" ON profiles IS 
'Optimized RLS policy using subquery (SELECT auth.uid()) to prevent per-row function re-evaluation';

COMMENT ON POLICY "Users can view their own payment rules" ON payment_rules IS 
'Optimized RLS policy using subquery (SELECT auth.uid()) to prevent per-row function re-evaluation';

COMMENT ON POLICY "Users can view their own analyses" ON analyses IS 
'Optimized RLS policy using subquery (SELECT auth.uid()) to prevent per-row function re-evaluation';
