import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token provided' },
        { status: 401 }
      );
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view summary' },
        { status: 401 }
      );
    }

    // Create authenticated client for data access
    const authenticatedClient = createAuthenticatedSupabaseClient(token);

    // Fetch the summary data (RLS will handle access control)
    const { data: summary, error: summaryError } = await authenticatedClient
      .from('summaries')
      .select(`
        id,
        session_id,
        title,
        tldr,
        key_decisions,
        action_items,
        follow_up_questions,
        conversation_highlights,
        structured_notes,
        generation_status,
        generation_error,
        created_at,
        updated_at
      `)
      .eq('session_id', sessionId)
      .is('deleted_at', null)
      .single();

    if (summaryError) {
      if (summaryError.code === 'PGRST116') {
        // No summary found
        return NextResponse.json({ 
          error: 'Summary not found',
          exists: false 
        }, { status: 404 });
      }
      console.error('Error fetching summary:', summaryError);
      return NextResponse.json({ 
        error: 'Failed to fetch summary',
        details: summaryError.message 
      }, { status: 500 });
    }

    // Return the summary data
    return NextResponse.json({ 
      summary,
      exists: true 
    });

  } catch (error) {
    console.error('Error in summary endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}