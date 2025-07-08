import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid share token' },
        { status: 400 }
      );
    }

    // Create service role Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get share record
    const { data: shareRecord, error: shareError } = await supabase
      .from('shared_reports')
      .select('*')
      .eq('share_token', token)
      .single();

    if (!shareRecord || shareError) {
      return NextResponse.json(
        { error: 'Share link not found or expired' },
        { status: 404 }
      );
    }

    // Check if share has expired
    if (shareRecord.expires_at && new Date(shareRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      );
    }

    // Check if transcript tab is allowed
    const allowedTabs = shareRecord.shared_tabs || [];
    if (!allowedTabs.includes('transcript')) {
      return NextResponse.json(
        { error: 'Transcript access not allowed' },
        { status: 403 }
      );
    }

    // Get transcripts
    const { data: transcripts, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('session_id', shareRecord.session_id)
      .order('sequence_number', { ascending: true });

    if (transcriptError) {
      console.error('Error fetching transcripts:', transcriptError);
      return NextResponse.json(
        { error: 'Failed to fetch transcripts' },
        { status: 500 }
      );
    }

    // Format transcripts for the TranscriptTab component
    const formattedTranscripts = transcripts?.map(t => ({
      id: t.id,
      speaker: t.speaker,
      content: t.content,
      timestamp: t.created_at,
      sequence_number: t.sequence_number
    })) || [];

    return NextResponse.json({
      transcripts: formattedTranscripts
    });

  } catch (error) {
    console.error('Error retrieving shared transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}