import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { problemsService, ExtensionProblemData } from '@/lib/services/problemsService';

export async function POST(request: NextRequest) {
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

    // Parse request body
    const extensionData: ExtensionProblemData = await request.json();

    // Validate required fields
    if (!extensionData.id || !extensionData.status) {
      return NextResponse.json(
        { error: 'Missing required fields: id and status' },
        { status: 400 }
      );
    }

    // Sync the problem
    const syncedProblem = await problemsService.syncFromExtension(extensionData);

    if (!syncedProblem) {
      return NextResponse.json(
        { error: 'Failed to sync problem' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      problem: syncedProblem
    });

  } catch (error) {
    console.error('Error in /api/problems/sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}