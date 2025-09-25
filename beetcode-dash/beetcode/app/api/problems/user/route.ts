import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { problemsService } from '@/lib/services/problemsService';

// Handle CORS preflight requests - no authentication needed for OPTIONS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
    },
  });
}

export async function GET(request: Request) {
  try {
    console.log('API /problems/user - GET request received');

    // Log the authorization header
    const authHeader = request.headers.get('authorization');
    console.log('Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing');

    // Extract token from Authorization header if present
    const token = authHeader?.replace('Bearer ', '');

    let supabase;
    let user;
    let authError;

    if (token) {
      // Use token-based auth for extension requests
      console.log('Using token-based authentication');

      // Create a supabase client with the token
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

    console.log('Auth check result:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message
    });

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

    // Get all problems for the user using the authenticated supabase client
    const problems = await problemsService.getProblemsForUser(supabase);
    const stats = problemsService.calculateStats(problems);

    return NextResponse.json({
      success: true,
      problems,
      stats
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error in /api/problems/user:', error);
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