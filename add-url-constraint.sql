-- Add unique constraint to problem_url column in leetcode_problems table
-- Run this if you've already created the table without the constraint

-- Add unique constraint to problem_url
ALTER TABLE public.leetcode_problems
ADD CONSTRAINT leetcode_problems_problem_url_key UNIQUE (problem_url);

-- Add index for better query performance (if not already exists)
CREATE INDEX IF NOT EXISTS leetcode_problems_url_idx ON public.leetcode_problems (problem_url);
