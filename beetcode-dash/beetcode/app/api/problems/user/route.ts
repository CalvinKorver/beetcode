import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { problemsService } from '@/lib/services/problemsService';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all problems for the user
    const problems = await problemsService.getProblemsForUser();
    const stats = problemsService.calculateStats(problems);

    return NextResponse.json({
      success: true,
      problems,
      stats
    });

  } catch (error) {
    console.error('Error in /api/problems/user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}