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

interface TrackProblemRequest {
  problemSlug: string; // LeetCode problem slug (e.g., "two-sum")
  status?: 'Attempted' | 'Completed';
  time?: number; // Time in milliseconds
}

export async function POST(request: NextRequest) {
  try {
    console.log('API /problems/track - POST request received');

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
    const problemData: TrackProblemRequest = await request.json();

    // Validate required fields
    if (!problemData.problemSlug) {
      return NextResponse.json(
        { error: 'Missing required field: problemSlug' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Convert time from milliseconds to seconds if provided
    const timeSeconds = problemData.time ? Math.round(problemData.time / 1000) : null;

    // Call service layer to track the problem
    const result = await problemsService.trackProblem(
      problemData.problemSlug,
      problemData.status || 'Attempted',
      timeSeconds,
      supabase
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to track problem' },
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

    return NextResponse.json({
      success: true,
      userProblemId: result.userProblemId,
      metadata: result.metadata,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error: unknown) {
    console.error('Error in /api/problems/track:', error);

    // Check if it's a "problem not found" error (404)
    if (error instanceof Error && error.message.includes('not found in database')) {
      return NextResponse.json(
        { error: 'Problem not found in database. The crawler may not have indexed this problem yet.' },
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
