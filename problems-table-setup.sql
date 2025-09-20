-- Problems Table Setup for Beetcode Dashboard
-- Run this in your Supabase SQL Editor

-- Create problems table to track LeetCode problems
create table if not exists public.problems (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  problem_name text not null,
  leetcode_id integer, -- Official LeetCode problem ID
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  status text not null check (status in ('Attempted', 'Completed')),
  best_time_ms integer, -- Best completion time in milliseconds
  first_completed_at timestamp with time zone,
  last_attempted_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security for problems
alter table public.problems enable row level security;

-- Create RLS policies for problems
-- Users can view their own problems
create policy "Users can view own problems" on public.problems
  for select using ( (select auth.uid()) = user_id );

-- Users can insert their own problems
create policy "Users can insert own problems" on public.problems
  for insert with check ( (select auth.uid()) = user_id );

-- Users can update their own problems
create policy "Users can update own problems" on public.problems
  for update using ( (select auth.uid()) = user_id );

-- Users can delete their own problems
create policy "Users can delete own problems" on public.problems
  for delete using ( (select auth.uid()) = user_id );

-- Add indexes for better performance
create index if not exists problems_user_id_idx on public.problems (user_id);
create index if not exists problems_leetcode_id_idx on public.problems (leetcode_id);
create index if not exists problems_difficulty_idx on public.problems (difficulty);
create index if not exists problems_status_idx on public.problems (status);
create index if not exists problems_last_attempted_idx on public.problems (last_attempted_at desc);

-- Grant permissions (these should already be set by default in Supabase)
grant usage on schema public to anon, authenticated;
grant all on public.problems to anon, authenticated;

-- ============================================================================
-- SAMPLE DATA INSERTION
-- ============================================================================
-- Note: Replace 'a149fc7f-62e3-448a-bdb1-d211d6360fb8' with an actual user ID from auth.users
-- You can get your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Sample problems data (uncomment and replace a149fc7f-62e3-448a-bdb1-d211d6360fb8 to use)
/*
INSERT INTO public.problems (user_id, problem_name, leetcode_id, difficulty, status, best_time_ms, first_completed_at, last_attempted_at) VALUES
(
  'a149fc7f-62e3-448a-bdb1-d211d6360fb8', -- Replace with actual user ID
  'Two Sum',
  1,
  'Easy',
  'Completed',
  45000,
  '2024-01-15T10:30:00Z',
  '2024-01-15T10:30:00Z'
),
(
  'a149fc7f-62e3-448a-bdb1-d211d6360fb8', -- Replace with actual user ID
  'Add Two Numbers',
  2,
  'Medium',
  'Completed',
  180000,
  '2024-01-14T14:20:00Z',
  '2024-01-14T14:20:00Z'
),
(
  'a149fc7f-62e3-448a-bdb1-d211d6360fb8', -- Replace with actual user ID
  'Longest Substring Without Repeating Characters',
  3,
  'Medium',
  'Attempted',
  null,
  null,
  '2024-01-13T16:45:00Z'
),
(
  'a149fc7f-62e3-448a-bdb1-d211d6360fb8', -- Replace with actual user ID
  'Median of Two Sorted Arrays',
  4,
  'Hard',
  'Attempted',
  null,
  null,
  '2024-01-12T11:15:00Z'
),
(
  'a149fc7f-62e3-448a-bdb1-d211d6360fb8', -- Replace with actual user ID
  'Reverse Integer',
  7,
  'Medium',
  'Completed',
  95000,
  '2024-01-11T09:30:00Z',
  '2024-01-11T09:30:00Z'
),
(
  'a149fc7f-62e3-448a-bdb1-d211d6360fb8', -- Replace with actual user ID
  'Palindrome Number',
  9,
  'Easy',
  'Completed',
  32000,
  '2024-01-10T15:20:00Z',
  '2024-01-10T15:20:00Z'
);
*/

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Run the table creation and policies section above first
-- 2. To add sample data:
--    a. Find your user ID: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
--    b. Replace all instances of 'a149fc7f-62e3-448a-bdb1-d211d6360fb8' with your actual user ID
--    c. Uncomment the INSERT statement and run it
-- 3. Verify data: SELECT * FROM public.problems WHERE user_id = 'your-user-id';