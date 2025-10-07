import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseService, LeetCodeProblem } from './db.js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
        not: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: null })),
            })),
          })),
        })),
        head: vi.fn(() => ({ count: 0, error: null })),
      })),
    })),
  })),
}));

describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService('https://test.supabase.co', 'test-key');
  });

  describe('upsertProblem', () => {
    it('should successfully upsert a problem with success status', async () => {
      const problem: LeetCodeProblem = {
        problem_slug: 'two-sum',
        leetcode_id: 1,
        problem_name: 'Two Sum',
        difficulty: 'Easy',
        problem_url: 'https://leetcode.com/problems/two-sum/',
        crawl_status: 'success',
        crawl_attempts: 1,
      };

      const result = await db.upsertProblem(problem);
      expect(result).toBe(true);
    });

    it('should successfully upsert a problem with failed status', async () => {
      const problem: LeetCodeProblem = {
        problem_slug: 'unknown-problem',
        leetcode_id: null,
        problem_name: 'Unknown Problem',
        difficulty: 'Medium',
        problem_url: 'https://leetcode.com/problems/unknown-problem/',
        crawl_status: 'failed',
        crawl_error: 'Timeout waiting for selector',
        crawl_attempts: 1,
      };

      const result = await db.upsertProblem(problem);
      expect(result).toBe(true);
    });

    it('should successfully upsert a problem with partial status', async () => {
      const problem: LeetCodeProblem = {
        problem_slug: 'partial-problem',
        leetcode_id: null,
        problem_name: 'Unknown Problem',
        difficulty: 'Medium',
        problem_url: 'https://leetcode.com/problems/partial-problem/',
        crawl_status: 'partial',
        crawl_error: 'Could not extract problem title',
        crawl_attempts: 1,
      };

      const result = await db.upsertProblem(problem);
      expect(result).toBe(true);
    });

    it('should default to success status when not provided', async () => {
      const problem: LeetCodeProblem = {
        problem_slug: 'default-status',
        leetcode_id: 100,
        problem_name: 'Default Status Problem',
        difficulty: 'Hard',
        problem_url: 'https://leetcode.com/problems/default-status/',
      };

      const result = await db.upsertProblem(problem);
      expect(result).toBe(true);
    });
  });

  describe('upsertProblems batch operation', () => {
    it('should handle a mix of successful and failed problems', async () => {
      const problems: LeetCodeProblem[] = [
        {
          problem_slug: 'success-1',
          leetcode_id: 1,
          problem_name: 'Success Problem 1',
          difficulty: 'Easy',
          problem_url: 'https://leetcode.com/problems/success-1/',
          crawl_status: 'success',
          crawl_attempts: 1,
        },
        {
          problem_slug: 'failed-1',
          leetcode_id: null,
          problem_name: 'Unknown Problem',
          difficulty: 'Medium',
          problem_url: 'https://leetcode.com/problems/failed-1/',
          crawl_status: 'failed',
          crawl_error: 'Network timeout',
          crawl_attempts: 1,
        },
        {
          problem_slug: 'partial-1',
          leetcode_id: null,
          problem_name: 'Unknown Problem',
          difficulty: 'Medium',
          problem_url: 'https://leetcode.com/problems/partial-1/',
          crawl_status: 'partial',
          crawl_error: 'Missing difficulty',
          crawl_attempts: 1,
        },
      ];

      const result = await db.upsertProblems(problems);
      expect(result).toBe(3);
    });

    it('should return 0 for empty array', async () => {
      const result = await db.upsertProblems([]);
      expect(result).toBe(0);
    });
  });
});
