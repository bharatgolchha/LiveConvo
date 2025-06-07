import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { z } from 'zod';

// Zod schema for a single transcript line
const transcriptLineSchema = z.object({
  session_id: z.string().uuid(),
  content: z.string(),
  speaker: z.string().optional().default('user'),
  confidence_score: z.number().optional(),
  start_time_seconds: z.number(),
  end_time_seconds: z.number().optional(),
  duration_seconds: z.number().optional(),
  stt_provider: z.string().optional(),
  is_final: z.boolean().optional().default(true),
  client_id: z.string().optional(),
  sequence_number: z.number().optional(), // Add sequence number support
});

// Zod schema for batch operations
const transcriptBatchSchema = z.object({
  lines: z.array(transcriptLineSchema),
  lastSequenceNumber: z.number().optional(), // Track last known sequence
});

type TranscriptLineInput = z.infer<typeof transcriptLineSchema>;

/**
 * GET /api/sessions/[id]/transcript - Retrieve transcript lines for a session
 * Supports pagination via query params: ?limit=100&offset=0
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const sessionId = params.id;
    console.log('Transcript API - Session ID:', sessionId);
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');
    const since = searchParams.get('since'); // Get transcripts since sequence number

    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view transcript' },
        { status: 401 }
      );
    }

    // Get user's current organization using service role client (bypasses RLS)
    const serviceClient = createServerSupabaseClient();
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.current_organization_id) {
      return NextResponse.json(
        { error: 'Setup required', message: 'Please complete onboarding first' },
        { status: 400 }
      );
    }

    // Verify session belongs to user's organization
    const { data: session, error: sessionError } = await serviceClient
      .from('sessions')
      .select('id, organization_id')
      .eq('id', sessionId)
      .eq('organization_id', userData.current_organization_id)
      .is('deleted_at', null)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found' },
        { status: 404 }
      );
    }

    // Create authenticated client with user's token for RLS
    const authClient = createAuthenticatedSupabaseClient(token);

    // Build query
    let query = authClient
      .from('transcripts')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId);

    // If 'since' is provided, get only newer transcripts
    if (since) {
      query = query.gt('sequence_number', parseInt(since));
    }

    // Fetch transcript lines with pagination
    const { data: transcriptLines, error: transcriptError, count } = await query
      .order('sequence_number', { ascending: true })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (transcriptError) {
      console.error('Database error fetching transcript:', transcriptError);
      return NextResponse.json(
        { error: 'Database error', message: transcriptError.message },
        { status: 500 }
      );
    }

    console.log('Transcript API - Found transcripts:', transcriptLines?.length || 0);

    // Get the latest sequence number
    const { data: latestSeq } = await authClient
      .from('transcripts')
      .select('sequence_number')
      .eq('session_id', sessionId)
      .order('sequence_number', { ascending: false })
      .limit(1)
      .single();

    // Return in the format expected by the app
    return NextResponse.json({ 
      data: transcriptLines || [],
      transcripts: transcriptLines || [], // Keep for backward compatibility
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      latestSequenceNumber: latestSeq?.sequence_number || 0
    });

  } catch (error) {
    console.error('Transcript fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[id]/transcript - Save transcript lines for a session
 * Supports batch operations and proper sequence numbering
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const pathSessionId = params.id;
    const body = await request.json();

    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to save transcript' },
        { status: 401 }
      );
    }

    // Get user's current organization using service role client (bypasses RLS)
    const serviceClient = createServerSupabaseClient();
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.current_organization_id) {
      return NextResponse.json(
        { error: 'Setup required', message: 'Please complete onboarding first' },
        { status: 400 }
      );
    }

    // Verify session belongs to user's organization
    const { data: session, error: sessionError } = await serviceClient
      .from('sessions')
      .select('id, organization_id')
      .eq('id', pathSessionId)
      .eq('organization_id', userData.current_organization_id)
      .is('deleted_at', null)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Create authenticated client with user's token for RLS
    const authClient = createAuthenticatedSupabaseClient(token);

    // Support both old format (array) and new format (batch object)
    const isOldFormat = Array.isArray(body);
    const batchData = isOldFormat ? { lines: body } : body;

    const validationResult = transcriptBatchSchema.safeParse(batchData);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { lines, lastSequenceNumber } = validationResult.data;

    if (lines.length === 0) {
      return NextResponse.json(
        { message: 'No transcript lines to insert' },
        { status: 200 }
      );
    }

    // Get the current max sequence number if not provided
    let currentSequence = lastSequenceNumber;
    if (currentSequence === undefined) {
      const { data: maxSeq } = await authClient
        .from('transcripts')
        .select('sequence_number')
        .eq('session_id', pathSessionId)
        .order('sequence_number', { ascending: false })
        .limit(1)
        .single();
      
      currentSequence = maxSeq?.sequence_number || 0;
    }

    // Prepare lines with sequence numbers
    const transcriptLinesToInsert = lines.map((line: TranscriptLineInput, index) => ({
      ...line,
      session_id: line.session_id || pathSessionId,
      sequence_number: line.sequence_number || (currentSequence! + index + 1),
    }));

    // Insert in batches to avoid timeouts
    const BATCH_SIZE = 100;
    const results = [];
    
    for (let i = 0; i < transcriptLinesToInsert.length; i += BATCH_SIZE) {
      const batch = transcriptLinesToInsert.slice(i, i + BATCH_SIZE);
      
      const { data, error } = await authClient
        .from('transcripts')
        .upsert(batch, {
          onConflict: 'session_id,sequence_number',
          ignoreDuplicates: false,
        })
        .select();

      if (error) {
        console.error('Database error saving transcript batch:', error);
        return NextResponse.json(
          { error: 'Database error', message: error.message },
          { status: 500 }
        );
      }

      results.push(...(data || []));
    }

    // Get current session word count
    const { data: sessionData } = await authClient
      .from('sessions')
      .select('total_words_spoken')
      .eq('id', pathSessionId)
      .single();

    const currentWords = sessionData?.total_words_spoken || 0;
    const newWords = lines.reduce((sum, line) => sum + line.content.split(' ').length, 0);

    // Update session with latest transcript info
    await authClient
      .from('sessions')
      .update({ 
        updated_at: new Date().toISOString(),
        total_words_spoken: currentWords + newWords
      })
      .eq('id', pathSessionId);

    return NextResponse.json({ 
      data: results,
      inserted: results.length,
      latestSequenceNumber: Math.max(...results.map(r => r.sequence_number || 0))
    }, { status: 201 });

  } catch (error) {
    console.error('Transcript save API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}