import { createClient } from "@/utils/supabase/server";

export interface Problem {
  id: string;
  problem_name: string;
  difficulty: "Easy" | "Medium" | "Hard";
  status: "Attempted" | "Completed";
  best_time_seconds: number | null;
  score: number;
  last_attempted_at: string;
  first_completed_at: string | null;
  leetcode_id: number | null;
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
   * Get all problems for the authenticated user
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

      // Fetch problems for the user
      const { data: problems, error: problemsError } = await supabase
        .from('problems')
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
   * Add a new problem for the authenticated user
   */
  async addProblem(problemData: Omit<Problem, 'id' | 'created_at' | 'updated_at' | 'score'> & { score?: number }): Promise<Problem | null> {
    try {
      const supabase = await this.getSupabaseClient();

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error getting user or no user found:', userError);
        return null;
      }

      const { data, error } = await supabase
        .from('problems')
        .insert([{
          ...problemData,
          score: problemData.score ?? 5,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding problem:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error in addProblem:', error);
      return null;
    }
  }

  /**
   * Update an existing problem
   */
  async updateProblem(problemId: string, updates: Partial<Problem>): Promise<Problem | null> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from('problems')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', problemId)
        .select()
        .single();

      if (error) {
        console.error('Error updating problem:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error in updateProblem:', error);
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
        .from('problems')
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
   * Upsert a problem (insert if new, update if exists with conflict resolution)
   */
  async upsertProblem(problemData: {
    problem_name: string;
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

      // First, try to find existing problem by leetcode_id or problem_name
      let existingProblem = null;

      if (problemData.leetcode_id) {
        const { data } = await supabase
          .from('problems')
          .select('*')
          .eq('user_id', user.id)
          .eq('leetcode_id', problemData.leetcode_id)
          .single();
        existingProblem = data;
      }

      // If not found by leetcode_id, try by problem_name
      if (!existingProblem) {
        const { data } = await supabase
          .from('problems')
          .select('*')
          .eq('user_id', user.id)
          .eq('problem_name', problemData.problem_name)
          .single();
        existingProblem = data;
      }

      if (existingProblem) {
        // Update existing problem with conflict resolution
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

        // Update other fields if they're missing
        if (!existingProblem.leetcode_id && problemData.leetcode_id) {
          updates.leetcode_id = problemData.leetcode_id;
        }
        if (!existingProblem.difficulty && problemData.difficulty) {
          updates.difficulty = problemData.difficulty;
        }

        const { data, error } = await supabase
          .from('problems')
          .update(updates)
          .eq('id', existingProblem.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating problem:', error);
          return null;
        }

        return data;
      } else {
        // Insert new problem
        const { data, error } = await supabase
          .from('problems')
          .insert([{
            ...problemData,
            score: problemData.score ?? 5,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_attempted_at: problemData.last_attempted_at || new Date().toISOString(),
          }])
          .select()
          .single();

        if (error) {
          console.error('Error inserting problem:', error);
          return null;
        }

        return data;
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