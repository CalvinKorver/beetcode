import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { problemsService } from '@/lib/services/problemsService';

interface UpdateProblemData {
  status?: "Attempted" | "Completed";
  time?: number; // time in milliseconds
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const updateData: UpdateProblemData = await request.json();

    // Validate that at least one field is provided
    if (!updateData.status && !updateData.time) {
      return NextResponse.json(
        { error: 'At least one field (status or time) must be provided' },
        { status: 400 }
      );
    }

    // Get the existing problem first to verify ownership and get current data
    const problems = await problemsService.getProblemsForUser();
    const existingProblem = problems.find(p => p.id === resolvedParams.id);

    if (!existingProblem) {
      return NextResponse.json(
        { error: 'Problem not found' },
        { status: 404 }
      );
    }

    // Prepare update object with conflict resolution
    const updates: Record<string, string | number | null> = {
      updated_at: new Date().toISOString(),
      last_attempted_at: new Date().toISOString(),
    };

    // Handle status update with upgrade-only logic
    if (updateData.status) {
      if (updateData.status === 'Completed') {
        updates.status = 'Completed';
        // Set first completion time if not already set
        if (!existingProblem.first_completed_at) {
          updates.first_completed_at = new Date().toISOString();
        }
      } else if (updateData.status === 'Attempted' && existingProblem.status !== 'Completed') {
        // Only allow downgrade from Completed to Attempted if explicitly requested
        // For most cases, we don't downgrade status
        updates.status = 'Attempted';
      }
    }

    // Handle time update with best-time-only logic
    if (updateData.time) {
      if (!existingProblem.best_time_ms || updateData.time < existingProblem.best_time_ms) {
        updates.best_time_ms = updateData.time;
      }
    }

    // Update the problem
    const updatedProblem = await problemsService.updateProblem(resolvedParams.id, updates);

    if (!updatedProblem) {
      return NextResponse.json(
        { error: 'Failed to update problem' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      problem: updatedProblem,
      updated_fields: Object.keys(updates)
    });

  } catch (error) {
    console.error('Error in /api/problems/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the specific problem
    const problems = await problemsService.getProblemsForUser();
    const problem = problems.find(p => p.id === resolvedParams.id);

    if (!problem) {
      return NextResponse.json(
        { error: 'Problem not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      problem
    });

  } catch (error) {
    console.error('Error in GET /api/problems/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}