-- Migration: Add status column to analyses table
-- Purpose: Track analysis lifecycle (pending, completed, failed)
-- Date: 2025-01-20

-- Add status column with default 'completed' for backwards compatibility
ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' 
CHECK (status IN ('pending', 'completed', 'failed'));

-- Update all existing records to 'completed' (they were already analyzed)
UPDATE analyses 
SET status = 'completed' 
WHERE status IS NULL;

-- Make status NOT NULL after backfilling data
ALTER TABLE analyses 
ALTER COLUMN status SET NOT NULL;

-- Add index for querying by status
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);

-- Add comments for documentation
COMMENT ON COLUMN analyses.status IS 'Analysis lifecycle status: pending (files uploaded), completed (analysis done), failed (error during analysis)';

-- Grant permissions (following existing RLS policies)
-- RLS policies already handle user-level access, this just ensures column is accessible
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
