import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { problemsService } from '@/lib/services/problemsService';

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

interface UpdateUserProblemRequest {
  status?: 'Attempted' | 'Completed';
  time?: number; // Time in milliseconds
  title?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  url?: string;
  leetcodeId?: number;
  tags?: string[];
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log('API /user-problems/[id] - PUT request received for ID:', resolvedParams.id);

    // Extract token from Authorization header if present
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let supabase;
    let user;
    let authError;

    if (token) {
      // Use token-based auth for extension requests
      console.log('Using token-based authentication');

      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          cookies: {
            getAll: () => [],
            setAll: () => {},
          },
        }
      );

      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      authError = error;
    } else {
      // Use cookie-based auth for web app requests
      console.log('Using cookie-based authentication');
      supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      authError = error;
    }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Parse request body
    const updateData: UpdateUserProblemRequest = await request.json();

    // First verify the user_problem exists and belongs to this user
    const existingProblem = await problemsService.getProblemById(resolvedParams.id, supabase);

    if (!existingProblem) {
      return NextResponse.json(
        { error: 'Problem not found' },
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    if (existingProblem.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - you do not own this problem' },
        {
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Build update object with conflict resolution
    const updates: Record<string, string | number | null> = {
      last_attempted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Status: Only upgrade (Attempted -> Completed), never downgrade
    if (updateData.status === 'Completed' && existingProblem.status !== 'Completed') {
      updates.status = 'Completed';
      // Set first_completed_at if not already set
      if (!existingProblem.first_completed_at) {
        updates.first_completed_at = new Date().toISOString();
      }
    }

    // Time: Convert from milliseconds to seconds, only update if better (lower)
    if (updateData.time !== undefined) {
      const newTimeSeconds = Math.round(updateData.time / 1000);
      if (!existingProblem.best_time_seconds || newTimeSeconds < existingProblem.best_time_seconds) {
        updates.best_time_seconds = newTimeSeconds;
      }
    }

    // If metadata fields are provided, update the leetcode_problems table
    if (updateData.title || updateData.difficulty || updateData.url || updateData.leetcodeId || updateData.tags) {
      const metadataUpdates: Record<string, string | number | string[]> = {};

      if (updateData.title) metadataUpdates.problem_name = updateData.title;
      if (updateData.difficulty) metadataUpdates.difficulty = updateData.difficulty;
      if (updateData.url) metadataUpdates.problem_url = updateData.url;
      if (updateData.leetcodeId) metadataUpdates.leetcode_id = updateData.leetcodeId;
      if (updateData.tags) metadataUpdates.tags = updateData.tags;
      metadataUpdates.updated_at = new Date().toISOString();

      // Update the leetcode_problems table
      const { error: metadataError } = await supabase
        .from('leetcode_problems')
        .update(metadataUpdates)
        .eq('problem_slug', existingProblem.problem_slug);

      if (metadataError) {
        console.error('Error updating leetcode_problems metadata:', metadataError);
      }
    }

    // Update the user_problem
    const { error: updateError } = await supabase
      .from('user_problems')
      .update(updates)
      .eq('id', resolvedParams.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user_problem:', updateError);
      return NextResponse.json(
        { error: 'Failed to update problem' },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Get the updated problem with metadata
    const updatedProblem = await problemsService.getProblemById(resolvedParams.id, supabase);

    return NextResponse.json({
      success: true,
      userProblem: updatedProblem,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error in /api/user-problems/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}
