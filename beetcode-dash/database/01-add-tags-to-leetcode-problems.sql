-- Migration: Add tags column to leetcode_problems table
-- This adds support for topic tags as specified in the API design

-- Add tags column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'leetcode_problems'
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.leetcode_problems ADD COLUMN tags TEXT[];
  END IF;
END $$;

COMMENT ON COLUMN public.leetcode_problems.tags IS 'Array of topic tags (e.g., Array, Hash Table, Two Pointers)';
