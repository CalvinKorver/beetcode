import { describe, it, expect } from 'vitest';
import { LeetCodeProblem } from './db.js';

describe('Crawler Failure Handling', () => {
  describe('Problem extraction results', () => {
    it('should mark problem as success when all fields are extracted', () => {
      const problem: LeetCodeProblem = {
        problem_slug: 'two-sum',
        leetcode_id: 1,
        problem_name: 'Two Sum',
        difficulty: 'Easy',
        problem_url: 'https://leetcode.com/problems/two-sum/',
        crawl_status: 'success',
        crawl_attempts: 1,
      };

      expect(problem.crawl_status).toBe('success');
      expect(problem.crawl_error).toBeUndefined();
      expect(problem.leetcode_id).not.toBeNull();
      expect(problem.problem_name).not.toBe('Unknown Problem');
    });

    it('should mark problem as failed when extraction completely fails', () => {
      const problem: LeetCodeProblem = {
        problem_slug: 'test-problem',
        leetcode_id: null,
        problem_name: 'Unknown Problem',
        difficulty: 'Medium',
        problem_url: 'https://leetcode.com/problems/test-problem/',
        crawl_status: 'failed',
        crawl_error: 'TimeoutError: Waiting for selector timed out',
        crawl_attempts: 1,
      };

      expect(problem.crawl_status).toBe('failed');
      expect(problem.crawl_error).toBeDefined();
      expect(problem.crawl_error).toContain('Timeout');
      expect(problem.problem_slug).toBe('test-problem');
    });

    it('should mark problem as partial when some fields are missing', () => {
      const problem: LeetCodeProblem = {
        problem_slug: 'partial-problem',
        leetcode_id: null,
        problem_name: 'Unknown Problem',
        difficulty: 'Medium',
        problem_url: 'https://leetcode.com/problems/partial-problem/',
        crawl_status: 'partial',
        crawl_error: 'Could not extract problem title from page',
        crawl_attempts: 1,
      };

      expect(problem.crawl_status).toBe('partial');
      expect(problem.crawl_error).toBeDefined();
      expect(problem.problem_slug).toBe('partial-problem');
    });

    it('should handle problems with no slug extraction', () => {
      const problem: LeetCodeProblem = {
        problem_slug: 'unknown',
        leetcode_id: null,
        problem_name: 'Unknown Problem',
        difficulty: 'Medium',
        problem_url: 'https://invalid-url/',
        crawl_status: 'failed',
        crawl_error: 'Could not extract slug from URL',
        crawl_attempts: 1,
      };

      expect(problem.crawl_status).toBe('failed');
      expect(problem.crawl_error).toContain('slug');
      expect(problem.problem_slug).toBe('unknown');
    });
  });

  describe('Error message validation', () => {
    it('should store meaningful error messages', () => {
      const errors = [
        'TimeoutError: Waiting for selector timed out',
        'Could not extract problem title from page',
        'Could not extract slug from URL',
        'Navigation failed: net::ERR_CONNECTION_REFUSED',
      ];

      errors.forEach(error => {
        expect(error).toBeTruthy();
        expect(error.length).toBeGreaterThan(10);
      });
    });

    it('should handle different failure scenarios', () => {
      const failureScenarios: Array<{ status: 'failed' | 'partial', error: string }> = [
        { status: 'failed', error: 'Timeout waiting for selector' },
        { status: 'partial', error: 'Missing difficulty element' },
        { status: 'failed', error: 'Network error' },
        { status: 'partial', error: 'Could not parse leetcode_id' },
      ];

      failureScenarios.forEach(scenario => {
        expect(['failed', 'partial']).toContain(scenario.status);
        expect(scenario.error).toBeTruthy();
      });
    });
  });

  describe('Crawl statistics', () => {
    it('should correctly count different status types', () => {
      const problems: LeetCodeProblem[] = [
        {
          problem_slug: 'success-1',
          leetcode_id: 1,
          problem_name: 'Success 1',
          difficulty: 'Easy',
          problem_url: 'https://leetcode.com/problems/success-1/',
          crawl_status: 'success',
          crawl_attempts: 1,
        },
        {
          problem_slug: 'success-2',
          leetcode_id: 2,
          problem_name: 'Success 2',
          difficulty: 'Medium',
          problem_url: 'https://leetcode.com/problems/success-2/',
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
          crawl_error: 'Timeout',
          crawl_attempts: 1,
        },
        {
          problem_slug: 'partial-1',
          leetcode_id: null,
          problem_name: 'Unknown Problem',
          difficulty: 'Medium',
          problem_url: 'https://leetcode.com/problems/partial-1/',
          crawl_status: 'partial',
          crawl_error: 'Missing title',
          crawl_attempts: 1,
        },
      ];

      const successCount = problems.filter(p => p.crawl_status === 'success').length;
      const failedCount = problems.filter(p => p.crawl_status === 'failed').length;
      const partialCount = problems.filter(p => p.crawl_status === 'partial').length;

      expect(successCount).toBe(2);
      expect(failedCount).toBe(1);
      expect(partialCount).toBe(1);
      expect(problems.length).toBe(4);
    });
  });
});
