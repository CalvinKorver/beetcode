-- Migration: Add crawl status tracking to leetcode_problems table
-- This enables tracking of crawl failures and partial data

-- Add crawl_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'leetcode_problems'
    AND column_name = 'crawl_status'
  ) THEN
    ALTER TABLE public.leetcode_problems
      ADD COLUMN crawl_status TEXT DEFAULT 'success' CHECK (crawl_status IN ('success', 'failed', 'partial'));
  END IF;
END $$;

-- Add crawl_error column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'leetcode_problems'
    AND column_name = 'crawl_error'
  ) THEN
    ALTER TABLE public.leetcode_problems
      ADD COLUMN crawl_error TEXT;
  END IF;
END $$;

-- Add crawl_attempts column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'leetcode_problems'
    AND column_name = 'crawl_attempts'
  ) THEN
    ALTER TABLE public.leetcode_problems
      ADD COLUMN crawl_attempts INTEGER DEFAULT 1;
  END IF;
END $$;

-- Add index for crawl_status to easily query failed problems
CREATE INDEX IF NOT EXISTS leetcode_problems_crawl_status_idx
  ON public.leetcode_problems (crawl_status);

-- Comments for documentation
COMMENT ON COLUMN public.leetcode_problems.crawl_status IS 'Status of the crawl attempt: success, failed, or partial';
COMMENT ON COLUMN public.leetcode_problems.crawl_error IS 'Error message if crawl failed or encountered issues';
COMMENT ON COLUMN public.leetcode_problems.crawl_attempts IS 'Number of times this problem has been crawled';

-- Update existing records to have default values
UPDATE public.leetcode_problems
SET crawl_status = 'success', crawl_attempts = 1
WHERE crawl_status IS NULL;
