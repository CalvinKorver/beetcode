import { createClient } from "@/utils/supabase/server";

export interface Problem {
  id: string;
  problem_name: string;
  difficulty: "Easy" | "Medium" | "Hard";
  status: "Attempted" | "Completed";
  best_time_ms: number | null;
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

export class ProblemsService {
  private async getSupabaseClient() {
    return await createClient();
  }

  /**
   * Get all problems for the authenticated user
   */
  async getProblemsForUser(): Promise<Problem[]> {
    try {
      const supabase = await this.getSupabaseClient();

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
  async addProblem(problemData: Omit<Problem, 'id' | 'created_at' | 'updated_at'>): Promise<Problem | null> {
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
}

// Export singleton instance
export const problemsService = new ProblemsService();