import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recordingId } = await params;
    
    // Get auth token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this recording
    const authClient = createAuthenticatedSupabaseClient(token);
    const { data: recording } = await authClient
      .from('bot_recordings')
      .select('recording_url, session_id')
      .eq('id', recordingId)
      .single();

    if (!recording || !recording.recording_url) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Verify user has access to the session
    const { data: session } = await authClient
      .from('sessions')
      .select('id')
      .eq('id', recording.session_id)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Fetch the video from S3
    const videoResponse = await fetch(recording.recording_url);
    
    if (!videoResponse.ok) {
      console.error('Failed to fetch video from S3:', videoResponse.status, videoResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch video' },
        { status: videoResponse.status }
      );
    }

    // Stream the video back to the client
    const headers = new Headers();
    headers.set('Content-Type', videoResponse.headers.get('Content-Type') || 'video/mp4');
    headers.set('Content-Length', videoResponse.headers.get('Content-Length') || '0');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=3600');

    return new NextResponse(videoResponse.body, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Video streaming error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}