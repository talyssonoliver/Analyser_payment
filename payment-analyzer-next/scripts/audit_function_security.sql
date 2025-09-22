-- Security Audit: Find all functions with mutable search_path
-- This query identifies functions that may be vulnerable to search_path manipulation

SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END AS security_type,
    CASE 
        WHEN p.proconfig IS NULL THEN '⚠️ MUTABLE (VULNERABLE)'
        WHEN array_to_string(p.proconfig, ', ') LIKE '%search_path%' THEN '✅ FIXED'
        ELSE '⚠️ NO SEARCH_PATH SET'
    END AS search_path_status,
    array_to_string(p.proconfig, ', ') AS current_config,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('public', 'auth')  -- Focus on main schemas
    AND p.prokind = 'f'  -- Functions only (not procedures)
ORDER BY 
    p.prosecdef DESC,  -- SECURITY DEFINER first (highest risk)
    n.nspname,
    p.proname;

-- Additional query: Check for potential search_path vulnerabilities
SELECT 
    schemaname,
    functionname,
    definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN information_schema.routines r ON r.routine_name = p.proname
WHERE n.nspname = 'public'
    AND p.prosecdef = true  -- SECURITY DEFINER functions
    AND p.proconfig IS NULL  -- No configuration set
ORDER BY functionname;
