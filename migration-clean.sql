-- Clean Migration: Drop old problems table and create fresh schema
-- Run this in your Supabase SQL Editor

-- Step 1: Drop old problems table if it exists
DROP TABLE IF EXISTS public.problems CASCADE;

-- Step 2: Create leetcode_problems table (global problem metadata)
CREATE TABLE IF NOT EXISTS public.leetcode_problems (
  problem_slug TEXT PRIMARY KEY,
  leetcode_id INTEGER UNIQUE,
  problem_name TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  problem_url TEXT NOT NULL UNIQUE,
  crawled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add indexes for leetcode_problems
CREATE INDEX IF NOT EXISTS leetcode_problems_leetcode_id_idx ON public.leetcode_problems (leetcode_id);
CREATE INDEX IF NOT EXISTS leetcode_problems_difficulty_idx ON public.leetcode_problems (difficulty);
CREATE INDEX IF NOT EXISTS leetcode_problems_url_idx ON public.leetcode_problems (problem_url);

-- Grant permissions for leetcode_problems (read-only for authenticated users)
GRANT SELECT ON public.leetcode_problems TO authenticated, anon;
GRANT ALL ON public.leetcode_problems TO service_role;

-- Step 3: Create user_problems table (join table between users and leetcode_problems)
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own user_problems" ON public.user_problems;
DROP POLICY IF EXISTS "Users can insert own user_problems" ON public.user_problems;
DROP POLICY IF EXISTS "Users can update own user_problems" ON public.user_problems;
DROP POLICY IF EXISTS "Users can delete own user_problems" ON public.user_problems;

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

-- Step 4: Create a view for easy querying (joins user_problems with leetcode_problems)
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

-- Add comments for documentation
COMMENT ON TABLE public.leetcode_problems IS 'Global LeetCode problems metadata, populated by crawler';
COMMENT ON TABLE public.user_problems IS 'User-specific problem tracking data, joins with leetcode_problems';
COMMENT ON VIEW public.user_problems_with_metadata IS 'Convenient view joining user_problems with leetcode_problems metadata';

-- Summary of tables:
-- 1. profiles - User profile information (already exists, linked via user_id)
-- 2. leetcode_problems - Global LeetCode problem metadata (populated by crawler)
-- 3. user_problems - Join table linking users to problems they've attempted/completed
