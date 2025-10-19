-- Migration: Create leetcode_problems table and refactor problems → user_problems
-- Run this in your Supabase SQL Editor

-- Step 1: Create leetcode_problems table (global problem metadata)
CREATE TABLE IF NOT EXISTS public.leetcode_problems (
  problem_slug TEXT PRIMARY KEY,
  leetcode_id INTEGER UNIQUE,
  problem_name TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  problem_url TEXT NOT NULL,
  crawled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add indexes for leetcode_problems
CREATE INDEX IF NOT EXISTS leetcode_problems_leetcode_id_idx ON public.leetcode_problems (leetcode_id);
CREATE INDEX IF NOT EXISTS leetcode_problems_difficulty_idx ON public.leetcode_problems (difficulty);

-- Grant permissions for leetcode_problems (read-only for authenticated users)
GRANT SELECT ON public.leetcode_problems TO authenticated, anon;
GRANT ALL ON public.leetcode_problems TO service_role;

-- Step 2: Create new user_problems table (join table between users and leetcode_problems)
CREATE TABLE IF NOT EXISTS public.user_problems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  problem_slug TEXT NOT NULL REFERENCES public.leetcode_problems(problem_slug) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Attempted', 'Completed')),
  best_time_seconds INTEGER,
  score INTEGER DEFAULT 5,
  first_completed_at TIMESTAMP WITH TIME ZONE,
  last_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, problem_slug)
);

-- Add indexes for user_problems
CREATE INDEX IF NOT EXISTS user_problems_user_id_idx ON public.user_problems (user_id);
CREATE INDEX IF NOT EXISTS user_problems_problem_slug_idx ON public.user_problems (problem_slug);
CREATE INDEX IF NOT EXISTS user_problems_status_idx ON public.user_problems (status);
CREATE INDEX IF NOT EXISTS user_problems_last_attempted_idx ON public.user_problems (last_attempted_at DESC);

-- Enable Row Level Security for user_problems
ALTER TABLE public.user_problems ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_problems
CREATE POLICY "Users can view own user_problems" ON public.user_problems
  FOR SELECT USING ( (SELECT auth.uid()) = user_id );

CREATE POLICY "Users can insert own user_problems" ON public.user_problems
  FOR INSERT WITH CHECK ( (SELECT auth.uid()) = user_id );

CREATE POLICY "Users can update own user_problems" ON public.user_problems
  FOR UPDATE USING ( (SELECT auth.uid()) = user_id );

CREATE POLICY "Users can delete own user_problems" ON public.user_problems
  FOR DELETE USING ( (SELECT auth.uid()) = user_id );

-- Grant permissions for user_problems
GRANT ALL ON public.user_problems TO authenticated;
GRANT SELECT ON public.user_problems TO anon;

-- Step 3: Migrate data from old problems table to new structure
-- First, populate leetcode_problems with unique problems from old table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'problems') THEN
    INSERT INTO public.leetcode_problems (problem_slug, leetcode_id, problem_name, difficulty, problem_url)
    SELECT DISTINCT
      -- Generate slug from problem_name (convert to lowercase, replace spaces with hyphens)
      LOWER(REGEXP_REPLACE(problem_name, '[^a-zA-Z0-9]+', '-', 'g')) as problem_slug,
      leetcode_id,
      problem_name,
      difficulty,
      -- Generate URL from problem name if not available
      'https://leetcode.com/problems/' || LOWER(REGEXP_REPLACE(problem_name, '[^a-zA-Z0-9]+', '-', 'g')) || '/' as problem_url
    FROM public.problems
    ON CONFLICT (problem_slug) DO UPDATE SET
      leetcode_id = COALESCE(EXCLUDED.leetcode_id, public.leetcode_problems.leetcode_id),
      problem_name = EXCLUDED.problem_name,
      difficulty = EXCLUDED.difficulty,
      updated_at = timezone('utc'::text, now());
  END IF;
END $$;

-- Then, migrate user-specific problem data to user_problems
DO $$
DECLARE
  has_best_time_ms BOOLEAN;
BEGIN
  -- Check which column exists in the problems table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'problems'
    AND column_name = 'best_time_ms'
  ) INTO has_best_time_ms;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'problems') THEN
    IF has_best_time_ms THEN
      -- Migrate with best_time_ms conversion (divide by 1000 to convert to seconds)
      INSERT INTO public.user_problems (
        user_id,
        problem_slug,
        status,
        best_time_seconds,
        score,
        first_completed_at,
        last_attempted_at,
        created_at,
        updated_at
      )
      SELECT
        p.user_id,
        LOWER(REGEXP_REPLACE(p.problem_name, '[^a-zA-Z0-9]+', '-', 'g')) as problem_slug,
        p.status,
        p.best_time_ms / 1000 as best_time_seconds,
        p.score,
        p.first_completed_at,
        p.last_attempted_at,
        p.created_at,
        p.updated_at
      FROM public.problems p
      ON CONFLICT (user_id, problem_slug) DO UPDATE SET
        status = CASE
          WHEN EXCLUDED.status = 'Completed' THEN 'Completed'
          ELSE public.user_problems.status
        END,
        best_time_seconds = CASE
          WHEN EXCLUDED.best_time_seconds IS NOT NULL AND
               (public.user_problems.best_time_seconds IS NULL OR EXCLUDED.best_time_seconds < public.user_problems.best_time_seconds)
          THEN EXCLUDED.best_time_seconds
          ELSE public.user_problems.best_time_seconds
        END,
        first_completed_at = COALESCE(public.user_problems.first_completed_at, EXCLUDED.first_completed_at),
        last_attempted_at = EXCLUDED.last_attempted_at,
        updated_at = timezone('utc'::text, now());
    ELSE
      -- Migrate with best_time_seconds (no conversion needed)
      INSERT INTO public.user_problems (
        user_id,
        problem_slug,
        status,
        best_time_seconds,
        score,
        first_completed_at,
        last_attempted_at,
        created_at,
        updated_at
      )
      SELECT
        p.user_id,
        LOWER(REGEXP_REPLACE(p.problem_name, '[^a-zA-Z0-9]+', '-', 'g')) as problem_slug,
        p.status,
        p.best_time_seconds,
        p.score,
        p.first_completed_at,
        p.last_attempted_at,
        p.created_at,
        p.updated_at
      FROM public.problems p
      ON CONFLICT (user_id, problem_slug) DO UPDATE SET
        status = CASE
          WHEN EXCLUDED.status = 'Completed' THEN 'Completed'
          ELSE public.user_problems.status
        END,
        best_time_seconds = CASE
          WHEN EXCLUDED.best_time_seconds IS NOT NULL AND
               (public.user_problems.best_time_seconds IS NULL OR EXCLUDED.best_time_seconds < public.user_problems.best_time_seconds)
          THEN EXCLUDED.best_time_seconds
          ELSE public.user_problems.best_time_seconds
        END,
        first_completed_at = COALESCE(public.user_problems.first_completed_at, EXCLUDED.first_completed_at),
        last_attempted_at = EXCLUDED.last_attempted_at,
        updated_at = timezone('utc'::text, now());
    END IF;
  END IF;
END $$;

-- Step 4: Drop old problems table (ONLY AFTER VERIFYING MIGRATION SUCCESS)
-- Uncomment the line below after you've verified the migration worked correctly
-- DROP TABLE IF EXISTS public.problems;

-- Step 5: Create a view for easy querying (joins user_problems with leetcode_problems)
CREATE OR REPLACE VIEW public.user_problems_with_metadata AS
SELECT
  up.id,
  up.user_id,
  up.problem_slug,
  lp.leetcode_id,
  lp.problem_name,
  lp.difficulty,
  lp.problem_url,
  up.status,
  up.best_time_seconds,
  up.score,
  up.first_completed_at,
  up.last_attempted_at,
  up.created_at,
  up.updated_at
FROM public.user_problems up
INNER JOIN public.leetcode_problems lp ON up.problem_slug = lp.problem_slug;

-- Grant permissions for the view
GRANT SELECT ON public.user_problems_with_metadata TO authenticated, anon;

COMMENT ON TABLE public.leetcode_problems IS 'Global LeetCode problems metadata, populated by crawler';
COMMENT ON TABLE public.user_problems IS 'User-specific problem tracking data, joins with leetcode_problems';
COMMENT ON VIEW public.user_problems_with_metadata IS 'Convenient view joining user_problems with leetcode_problems metadata';
