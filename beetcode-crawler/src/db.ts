import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface LeetCodeProblem {
  problem_slug: string;
  leetcode_id: number | null;
  problem_name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  problem_url: string;
}

export class DatabaseService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Upsert a LeetCode problem into the database
   */
  async upsertProblem(problem: LeetCodeProblem): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('leetcode_problems')
        .upsert(
          {
            problem_slug: problem.problem_slug,
            leetcode_id: problem.leetcode_id,
            problem_name: problem.problem_name,
            difficulty: problem.difficulty,
            problem_url: problem.problem_url,
            crawled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'problem_slug',
          }
        );

      if (error) {
        console.error(`Error upserting problem ${problem.problem_slug}:`, error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Unexpected error upserting problem ${problem.problem_slug}:`, error);
      return false;
    }
  }

  /**
   * Batch upsert multiple problems
   */
  async upsertProblems(problems: LeetCodeProblem[]): Promise<number> {
    if (problems.length === 0) return 0;

    try {
      const records = problems.map((problem) => ({
        problem_slug: problem.problem_slug,
        leetcode_id: problem.leetcode_id,
        problem_name: problem.problem_name,
        difficulty: problem.difficulty,
        problem_url: problem.problem_url,
        crawled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('leetcode_problems')
        .upsert(records, {
          onConflict: 'problem_slug',
        });

      if (error) {
        console.error('Error batch upserting problems:', error.message);
        return 0;
      }

      return problems.length;
    } catch (error) {
      console.error('Unexpected error batch upserting problems:', error);
      return 0;
    }
  }

  /**
   * Check if a problem exists in the database
   */
  async problemExists(problemSlug: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('leetcode_problems')
        .select('problem_slug')
        .eq('problem_slug', problemSlug)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error
        console.error(`Error checking if problem exists:`, error.message);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Unexpected error checking if problem exists:', error);
      return false;
    }
  }

  /**
   * Get count of problems in database
   */
  async getProblemCount(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('leetcode_problems')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error getting problem count:', error.message);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Unexpected error getting problem count:', error);
      return 0;
    }
  }

  /**
   * Get the problem with the largest leetcode_id from the database
   */
  async getLargestProblem(): Promise<LeetCodeProblem | null> {
    try {
      const { data, error } = await this.supabase
        .from('leetcode_problems')
        .select('problem_slug, leetcode_id, problem_name, difficulty, problem_url')
        .not('leetcode_id', 'is', null)
        .order('leetcode_id', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No problems found
          return null;
        }
        console.error('Error getting largest problem:', error.message);
        return null;
      }

      return data ? {
        problem_slug: data.problem_slug,
        leetcode_id: data.leetcode_id,
        problem_name: data.problem_name,
        difficulty: data.difficulty,
        problem_url: data.problem_url,
      } : null;
    } catch (error) {
      console.error('Unexpected error getting largest problem:', error);
      return null;
    }
  }
}
