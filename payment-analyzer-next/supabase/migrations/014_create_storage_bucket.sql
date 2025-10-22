-- Migration: Create Supabase Storage bucket for analysis files
-- Purpose: Store uploaded PDF files securely in Supabase Storage
-- Date: 2025-10-20

-- Create the storage bucket for analysis files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'analysis-files',
  'analysis-files',
  false, -- Private bucket
  52428800, -- 50MB limit per file
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload analysis files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'analysis-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can read their own files
CREATE POLICY "Users can read their own analysis files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'analysis-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files (for re-uploads)
CREATE POLICY "Users can update their own analysis files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'analysis-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own analysis files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'analysis-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add comment
COMMENT ON TABLE storage.objects IS 'Stores uploaded PDF files for payment analysis. Path format: {user_id}/{analysis_id}/{filename}';
