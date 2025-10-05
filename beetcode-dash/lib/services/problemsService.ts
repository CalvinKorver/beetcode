import { createClient } from "@/utils/supabase/server";

export interface Problem {
  id: string;
  user_id: string;
  problem_slug: string;
  problem_name: string;
  leetcode_id: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  problem_url: string;
  status: "Attempted" | "Completed";
  best_time_seconds: number | null;
  score: number;
  last_attempted_at: string;
  first_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProblemsStats {
  total: number;
  completed: number;
  attempted: number;
}

export interface ExtensionProblemData {
  id: string; // problem slug
  leetcodeId?: number;
  name?: string;
  difficulty?: string; // "easy", "medium", "hard"
  status: string; // "TRACKING", "ATTEMPTED", "COMPLETED"
  lastAttempted?: number; // timestamp
  completedAt?: number; // timestamp
  bestTime?: string; // "mm:ss" or "h:mm:ss" format
  timeEntries?: Array<{
    duration: string;
    timestamp: number;
  }>;
}

export class ProblemsService {
  private async getSupabaseClient() {
    return await createClient();
  }

  /**
   * Convert time format from extension to seconds
   * Supports "mm:ss" and "h:mm:ss" formats
   */
  private timeToSeconds(timeString: string): number {
    if (!timeString) return 0;

    const parts = timeString.split(':');
    let hours = 0, minutes = 0, seconds = 0;

    if (parts.length === 2) {
      // "mm:ss" format
      minutes = parseInt(parts[0], 10) || 0;
      seconds = parseInt(parts[1], 10) || 0;
    } else if (parts.length === 3) {
      // "h:mm:ss" format
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
      seconds = parseInt(parts[2], 10) || 0;
    }

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Normalize status from extension format to database format
   */
  private normalizeStatus(extensionStatus: string): "Attempted" | "Completed" {
    switch (extensionStatus?.toUpperCase()) {
      case 'COMPLETED':
        return 'Completed';
      case 'ATTEMPTED':
      case 'TRACKING':
      default:
        return 'Attempted';
    }
  }

  /**
   * Normalize difficulty from extension format to database format
   */
  private normalizeDifficulty(extensionDifficulty?: string): "Easy" | "Medium" | "Hard" | null {
    if (!extensionDifficulty) return null;

    const normalized = extensionDifficulty.toLowerCase();
    switch (normalized) {
      case 'easy':
        return 'Easy';
      case 'medium':
        return 'Medium';
      case 'hard':
        return 'Hard';
      default:
        return null;
    }
  }

  /**
   * Get all problems for the authenticated user with joined metadata
   */
  async getProblemsForUser(supabaseClient?: any): Promise<Problem[]> {
    try {
      const supabase = supabaseClient || await this.getSupabaseClient();

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error getting user:', userError);
        return [];
      }

      if (!user) {
        console.log('No authenticated user found');
        return [];
      }

      // Use the view to get problems with metadata
      const { data: problems, error: problemsError } = await supabase
        .from('user_problems_with_metadata')
        .select('*')
        .eq('user_id', user.id)
        .order('last_attempted_at', { ascending: false });

      if (problemsError) {
        console.error('Error fetching problems:', problemsError);
        return [];
      }

      return problems || [];
    } catch (error) {
      console.error('Unexpected error in getProblemsForUser:', error);
      return [];
    }
  }

  /**
   * Calculate statistics from problems data
   */
  calculateStats(problems: Problem[]): ProblemsStats {
    const total = problems.length;
    const completed = problems.filter(p => p.status === 'Completed').length;
    const attempted = problems.filter(p => p.status === 'Attempted').length;

    return { total, completed, attempted };
  }

  /**
   * Update an existing user problem
   */
  async updateProblem(problemId: string, updates: Partial<Problem>): Promise<Problem | null> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from('user_problems')
        .update({
          status: updates.status,
          best_time_seconds: updates.best_time_seconds,
          score: updates.score,
          first_completed_at: updates.first_completed_at,
          last_attempted_at: updates.last_attempted_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', problemId)
        .select()
        .single();

      if (error) {
        console.error('Error updating problem:', error);
        return null;
      }

      // Return with joined metadata
      return await this.getProblemById(data.id);
    } catch (error) {
      console.error('Unexpected error in updateProblem:', error);
      return null;
    }
  }

  /**
   * Get a single problem by ID with metadata
   */
  async getProblemById(problemId: string, supabaseClient?: any): Promise<Problem | null> {
    try {
      const supabase = supabaseClient || await this.getSupabaseClient();

      const { data, error } = await supabase
        .from('user_problems_with_metadata')
        .select('*')
        .eq('id', problemId)
        .single();

      if (error) {
        console.error('Error fetching problem:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error in getProblemById:', error);
      return null;
    }
  }

  /**
   * Delete a problem
   */
  async deleteProblem(problemId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient();

      const { error } = await supabase
        .from('user_problems')
        .delete()
        .eq('id', problemId);

      if (error) {
        console.error('Error deleting problem:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error in deleteProblem:', error);
      return false;
    }
  }

  /**
   * Ensure a LeetCode problem exists in the global table
   * This is called before creating a user_problem entry
   */
  private async ensureLeetCodeProblem(
    problemSlug: string,
    problemData: {
      leetcode_id?: number | null;
      problem_name?: string;
      difficulty?: "Easy" | "Medium" | "Hard" | null;
    },
    supabaseClient: any
  ): Promise<void> {
    // Check if problem exists in leetcode_problems
    const { data: existing } = await supabaseClient
      .from('leetcode_problems')
      .select('problem_slug')
      .eq('problem_slug', problemSlug)
      .single();

    if (!existing) {
      // Insert into leetcode_problems if it doesn't exist
      const { error } = await supabaseClient
        .from('leetcode_problems')
        .insert({
          problem_slug: problemSlug,
          leetcode_id: problemData.leetcode_id || null,
          problem_name: problemData.problem_name || problemSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          difficulty: problemData.difficulty || 'Medium', // Default to Medium if unknown
          problem_url: `https://leetcode.com/problems/${problemSlug}/`,
        });

      if (error) {
        console.warn('Could not insert into leetcode_problems (may already exist):', error.message);
      }
    } else if (problemData.leetcode_id || problemData.difficulty || problemData.problem_name) {
      // Update existing record with any new data
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (problemData.leetcode_id) updates.leetcode_id = problemData.leetcode_id;
      if (problemData.problem_name) updates.problem_name = problemData.problem_name;
      if (problemData.difficulty) updates.difficulty = problemData.difficulty;

      await supabaseClient
        .from('leetcode_problems')
        .update(updates)
        .eq('problem_slug', problemSlug);
    }
  }

  /**
   * Upsert a problem (insert if new, update if exists with conflict resolution)
   */
  async upsertProblem(problemData: {
    problem_slug: string;
    problem_name?: string;
    leetcode_id?: number | null;
    difficulty?: "Easy" | "Medium" | "Hard" | null;
    status: "Attempted" | "Completed";
    best_time_seconds?: number | null;
    score?: number;
    first_completed_at?: string | null;
    last_attempted_at?: string;
  }, supabaseClient?: any): Promise<Problem | null> {
    try {
      const supabase = supabaseClient || await this.getSupabaseClient();

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error getting user or no user found:', userError);
        return null;
      }

      // Ensure the LeetCode problem exists in global table
      await this.ensureLeetCodeProblem(
        problemData.problem_slug,
        {
          leetcode_id: problemData.leetcode_id,
          problem_name: problemData.problem_name,
          difficulty: problemData.difficulty,
        },
        supabase
      );

      // Check if user_problem already exists
      const { data: existingProblem } = await supabase
        .from('user_problems')
        .select('*')
        .eq('user_id', user.id)
        .eq('problem_slug', problemData.problem_slug)
        .single();

      if (existingProblem) {
        // Update existing user_problem with conflict resolution
        const updates: Record<string, string | number | null> = {
          updated_at: new Date().toISOString(),
          last_attempted_at: problemData.last_attempted_at || new Date().toISOString(),
        };

        // Only update status if it's an upgrade (Attempted -> Completed)
        if (problemData.status === 'Completed' && existingProblem.status === 'Attempted') {
          updates.status = 'Completed';
          updates.first_completed_at = problemData.first_completed_at || new Date().toISOString();
        }

        // Only update best time if new time is better (lower)
        if (problemData.best_time_seconds &&
            (!existingProblem.best_time_seconds || problemData.best_time_seconds < existingProblem.best_time_seconds)) {
          updates.best_time_seconds = problemData.best_time_seconds;
        }

        // Update score if provided
        if (problemData.score !== undefined) {
          updates.score = problemData.score;
        }

        const { data, error } = await supabase
          .from('user_problems')
          .update(updates)
          .eq('id', existingProblem.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating user_problem:', error);
          return null;
        }

        // Return with joined metadata
        return await this.getProblemById(data.id, supabase);
      } else {
        // Insert new user_problem
        const { data, error } = await supabase
          .from('user_problems')
          .insert([{
            user_id: user.id,
            problem_slug: problemData.problem_slug,
            status: problemData.status,
            best_time_seconds: problemData.best_time_seconds || null,
            score: problemData.score ?? 5,
            first_completed_at: problemData.first_completed_at || null,
            last_attempted_at: problemData.last_attempted_at || new Date().toISOString(),
          }])
          .select()
          .single();

        if (error) {
          console.error('Error inserting user_problem:', error);
          return null;
        }

        // Return with joined metadata
        return await this.getProblemById(data.id, supabase);
      }
    } catch (error) {
      console.error('Unexpected error in upsertProblem:', error);
      return null;
    }
  }

  /**
   * Sync problem data from extension format
   */
  async syncFromExtension(extensionData: ExtensionProblemData, supabaseClient?: any): Promise<Problem | null> {
    try {
      const bestTimeSeconds = extensionData.bestTime ? this.timeToSeconds(extensionData.bestTime) : null;
      const status = this.normalizeStatus(extensionData.status);
      const difficulty = this.normalizeDifficulty(extensionData.difficulty);

      const problemData = {
        problem_slug: extensionData.id, // The ID from extension is the slug
        problem_name: extensionData.name || extensionData.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        leetcode_id: extensionData.leetcodeId || null,
        difficulty,
        status,
        best_time_seconds: bestTimeSeconds,
        score: 5, // Default score for synced problems
        first_completed_at: extensionData.completedAt ? new Date(extensionData.completedAt).toISOString() : null,
        last_attempted_at: extensionData.lastAttempted ? new Date(extensionData.lastAttempted).toISOString() : undefined,
      };

      return await this.upsertProblem(problemData, supabaseClient);
    } catch (error) {
      console.error('Unexpected error in syncFromExtension:', error);
      return null;
    }
  }
}

// Export singleton instance
export const problemsService = new ProblemsService();
