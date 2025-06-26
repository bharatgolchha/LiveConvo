import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const RECALL_AI_API_KEY = process.env.RECALL_AI_API_KEY;
const RECALL_AI_API_URL = process.env.RECALL_AI_API_URL || 'https://us-east-1.recall.ai';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, transcriptProvider = 'deepgram_streaming' } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Create SDK upload with Recall.ai API
    const uploadPayload: any = {
      metadata: {
        session_id: sessionId,
        user_id: user.id,
        recording_type: 'desktop',
      },
    };

    // Configure transcript provider
    if (transcriptProvider === 'deepgram_streaming') {
      uploadPayload.transcript = {
        provider: {
          deepgram_streaming: {},
        },
      };
    } else if (transcriptProvider === 'assembly_ai_streaming') {
      uploadPayload.transcript = {
        provider: {
          assembly_ai_streaming: {},
        },
      };
    }

    const response = await fetch(`${RECALL_AI_API_URL}/api/v1/sdk-upload/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${RECALL_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(uploadPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Recall.ai API error:', error);
      return NextResponse.json(
        { error: 'Failed to create SDK upload' },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Update session with SDK upload ID
    await supabase
      .from('sessions')
      .update({
        recall_sdk_upload_id: result.id,
        recording_type: 'desktop',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return NextResponse.json({
      upload_token: result.upload_token,
      sdk_upload_id: result.id,
    });
  } catch (error) {
    console.error('Error creating desktop SDK upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}