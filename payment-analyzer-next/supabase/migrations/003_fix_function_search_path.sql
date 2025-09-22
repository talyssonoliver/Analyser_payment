-- Fix Function Search Path Mutable issue
-- This migration sets explicit search_path for security-sensitive functions

-- Function: create_profile_for_user
-- Issue: SECURITY DEFINER function without explicit search_path
-- Risk: Caller can manipulate search_path to access wrong schemas
-- Fix: Set explicit search_path = public, pg_temp

CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Use fully qualified names for extra security
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = public, pg_temp;  -- Fixed, immutable search_path

-- Update the updated_at trigger function as well for consistency
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SET search_path = public, pg_temp;  -- Fixed search_path

-- Add comments for documentation
COMMENT ON FUNCTION create_profile_for_user() IS 
'SECURITY DEFINER function with fixed search_path to prevent schema confusion attacks. Only resolves objects in public schema and temporary schema.';

COMMENT ON FUNCTION update_updated_at() IS 
'Timestamp update function with fixed search_path for consistency and security.';
