-- Timezone optimization functions
-- Creates RPC functions to optimize timezone queries

-- 1. Create a cached timezone function that uses the materialized view
CREATE OR REPLACE FUNCTION get_timezone_names()
RETURNS TABLE(name text) AS $$
BEGIN
  -- Try to use the cached materialized view first
  BEGIN
    RETURN QUERY 
    SELECT cached_timezone_names.name 
    FROM cached_timezone_names 
    ORDER BY cached_timezone_names.name;
    
    -- If we got results, return them
    IF FOUND THEN
      RETURN;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Materialized view doesn't exist or has issues, continue to fallback
      NULL;
  END;
  
  -- Fallback to direct query with limit to prevent huge result sets
  RETURN QUERY 
  SELECT pg_timezone_names.name::text 
  FROM pg_timezone_names 
  ORDER BY pg_timezone_names.name
  LIMIT 1000; -- Reasonable limit
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to refresh timezone cache safely
CREATE OR REPLACE FUNCTION refresh_timezone_cache_safe()
RETURNS boolean AS $$
BEGIN
  BEGIN
    -- Try to refresh the materialized view
    REFRESH MATERIALIZED VIEW cached_timezone_names;
    RETURN true;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail
      RAISE NOTICE 'Failed to refresh timezone cache: %', SQLERRM;
      RETURN false;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to get common timezones only (faster)
CREATE OR REPLACE FUNCTION get_common_timezones()
RETURNS TABLE(name text) AS $$
BEGIN
  RETURN QUERY VALUES
    ('UTC'),
    ('America/New_York'),
    ('America/Chicago'),
    ('America/Denver'),
    ('America/Los_Angeles'),
    ('Europe/London'),
    ('Europe/Paris'),
    ('Europe/Berlin'),
    ('Asia/Tokyo'),
    ('Australia/Sydney'),
    ('America/Toronto'),
    ('Europe/Madrid'),
    ('Asia/Shanghai'),
    ('Pacific/Auckland');
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 4. Create function to search timezones efficiently
CREATE OR REPLACE FUNCTION search_timezones(search_term text DEFAULT '')
RETURNS TABLE(name text) AS $$
BEGIN
  -- If no search term, return common timezones
  IF search_term = '' OR search_term IS NULL THEN
    RETURN QUERY SELECT * FROM get_common_timezones();
    RETURN;
  END IF;
  
  -- Search in cached view first
  BEGIN
    RETURN QUERY 
    SELECT cached_timezone_names.name 
    FROM cached_timezone_names 
    WHERE cached_timezone_names.name ILIKE '%' || search_term || '%'
    ORDER BY 
      CASE 
        WHEN cached_timezone_names.name ILIKE search_term || '%' THEN 1
        WHEN cached_timezone_names.name ILIKE '%' || search_term THEN 2
        ELSE 3
      END,
      cached_timezone_names.name
    LIMIT 50;
    
    IF FOUND THEN
      RETURN;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Continue to fallback
      NULL;
  END;
  
  -- Fallback to direct search with limit
  RETURN QUERY 
  SELECT pg_timezone_names.name::text 
  FROM pg_timezone_names 
  WHERE pg_timezone_names.name ILIKE '%' || search_term || '%'
  ORDER BY 
    CASE 
      WHEN pg_timezone_names.name ILIKE search_term || '%' THEN 1
      WHEN pg_timezone_names.name ILIKE '%' || search_term THEN 2
      ELSE 3
    END,
    pg_timezone_names.name
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_timezone_names() TO authenticated;
GRANT EXECUTE ON FUNCTION get_common_timezones() TO authenticated;
GRANT EXECUTE ON FUNCTION search_timezones(text) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_timezone_cache_safe() TO service_role;

-- 6. Add comments for documentation
COMMENT ON FUNCTION get_timezone_names() IS 
'Optimized function to get timezone names using cached materialized view when possible';

COMMENT ON FUNCTION get_common_timezones() IS 
'Returns commonly used timezones without database lookup - very fast';

COMMENT ON FUNCTION search_timezones(text) IS 
'Search timezones with text matching, optimized for common use cases';

COMMENT ON FUNCTION refresh_timezone_cache_safe() IS 
'Safely refreshes timezone cache, used by maintenance tasks';