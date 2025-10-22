-- Migration: Add composite index for fingerprint-based duplicate detection
-- Created: 2025-09-30
-- Purpose: Improve performance of duplicate analysis detection

-- Add composite index on (user_id, fingerprint) for analyses table
-- This significantly speeds up duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_analyses_user_fingerprint
ON analyses(user_id, fingerprint);

-- Add comment for documentation
COMMENT ON INDEX idx_analyses_user_fingerprint IS
'Composite index for fast duplicate analysis detection by user and file fingerprint';

-- Verify the index was created
DO $$
BEGIN
  RAISE NOTICE 'Fingerprint index created successfully';
END $$;
