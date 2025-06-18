import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/smart-notes?session=123
 * Retrieve smart notes for a specific session
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session ID from query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Verify user has access to this session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, organization_id, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user owns this session
    if (sessionData.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get smart notes for the session
    const { data: items, error: itemsError } = await supabase
      .from('prep_checklist')
      .select('id, text, status, created_at, created_by')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('Error fetching smart notes:', itemsError);
      return NextResponse.json({ error: 'Failed to fetch smart notes' }, { status: 500 });
    }

    return NextResponse.json(items || []);

  } catch (error) {
    console.error('Smart notes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/smart-notes
 * Create a new smart note
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { sessionId, text } = body;

    if (!sessionId || !text) {
      return NextResponse.json({ error: 'Session ID and text required' }, { status: 400 });
    }

    // Verify user has access to this session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, organization_id, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user owns this session
    if (sessionData.user_id !== user.id) {
      console.log('🔍 User does not own session:', { sessionUserId: sessionData.user_id, requestUserId: user.id });
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create new smart note
    const { data: newItem, error: insertError } = await supabase
      .from('prep_checklist')
      .insert({
        session_id: sessionId,
        text: text.trim(),
        status: 'open',
        created_by: user.id
      })
      .select('id, text, status, created_at, created_by')
      .single();

    if (insertError) {
      console.error('Error creating smart note:', insertError);
      return NextResponse.json({ error: 'Failed to create smart note' }, { status: 500 });
    }

    return NextResponse.json(newItem, { status: 201 });

  } catch (error) {
    console.error('Smart notes POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}