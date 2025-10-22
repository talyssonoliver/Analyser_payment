-- Migration: Add file tracking columns to analysis_files table
-- Purpose: Track file associations with analyses for Phase 2.1 merge functionality
-- Date: 2025-10-15

-- Add new columns to existing analysis_files table for better file tracking
ALTER TABLE analysis_files ADD COLUMN IF NOT EXISTS file_fingerprint TEXT;
ALTER TABLE analysis_files ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows to have uploaded_at = created_at
UPDATE analysis_files SET uploaded_at = created_at WHERE uploaded_at IS NULL;

-- Make uploaded_at NOT NULL after backfilling
ALTER TABLE analysis_files ALTER COLUMN uploaded_at SET NOT NULL;

-- Create index for fingerprint-based lookups
CREATE INDEX IF NOT EXISTS idx_analysis_files_fingerprint ON analysis_files(file_fingerprint);

-- Add comments for documentation
COMMENT ON COLUMN analysis_files.file_fingerprint IS 'SHA-256 fingerprint of file content for duplicate detection';
COMMENT ON COLUMN analysis_files.uploaded_at IS 'Timestamp when the file was uploaded to this analysis';
COMMENT ON TABLE analysis_files IS 'Tracks file associations with analyses, supporting multiple files per analysis and merge operations';
