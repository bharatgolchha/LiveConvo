import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Test session creation with minimal valid data
    const sessionData = {
      user_id: 'e1ae6d39-bc60-4954-a498-ab08f14144af',
      organization_id: 'dfc638a2-43c9-4808-abc9-d028ae31c5ba',
      title: 'Test Auto Session',
      meeting_url: 'https://meet.google.com/test-meeting',
      meeting_platform: 'google-meet',
      recording_type: 'meeting',
      status: 'draft',
      conversation_type: 'meeting'
    };

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json({ 
        error: 'Failed to create session',
        details: sessionError
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}