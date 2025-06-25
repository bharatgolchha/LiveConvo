import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/sessions/[id]/summary - Get the latest summary for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Get auth token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token provided' },
        { status: 401 }
      );
    }

    // Create authenticated client
    const authClient = createAuthenticatedSupabaseClient(token);

    // Fetch the latest summary for this session
    const { data: summary, error } = await authClient
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
        created_at,
        updated_at
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no summary found, that's ok - return null
      if (error.code === 'PGRST116') {
        return NextResponse.json({ summary: null });
      }
      
      console.error('Database error fetching summary:', error);
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    // Parse structured_notes if it exists
    let parsedStructuredNotes = null;
    if (summary.structured_notes) {
      try {
        parsedStructuredNotes = JSON.parse(summary.structured_notes);
      } catch (parseError) {
        console.warn('Failed to parse structured_notes:', parseError);
      }
    }

    // Return the summary with parsed structured notes
    const enhancedSummary = {
      ...summary,
      structured_notes: parsedStructuredNotes
    };

    return NextResponse.json({ summary: enhancedSummary });

  } catch (error) {
    console.error('Summary fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
} 