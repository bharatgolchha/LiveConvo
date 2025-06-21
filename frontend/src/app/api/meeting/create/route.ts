import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { CreateMeetingData } from '@/lib/meeting/types/meeting.types';
import { detectMeetingPlatform } from '@/lib/meeting/utils/platform-detector';
import { RecallAIClient } from '@/lib/recall-ai/client';
import { RecallSessionManager } from '@/lib/recall-ai/session-manager';

export async function POST(req: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data: CreateMeetingData = await req.json();
    
    // Validate required fields
    if (!data.title) {
      return NextResponse.json(
        { error: 'Missing required field: title is required' },
        { status: 400 }
      );
    }

    // Detect meeting platform (only if URL is provided)
    let platform = null;
    if (data.meetingUrl && data.meetingUrl.trim()) {
      platform = detectMeetingPlatform(data.meetingUrl);
      if (!platform) {
        return NextResponse.json(
          { error: 'Unsupported meeting platform' },
          { status: 400 }
        );
      }
    }

    // Get user's organization
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!orgMember) {
      return NextResponse.json(
        { error: 'User must be part of an organization' },
        { status: 400 }
      );
    }

    // Create session in database
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        organization_id: orgMember.organization_id,
        title: data.title,
        conversation_type: data.type === 'custom' ? data.customType : data.type,
        status: 'active',
        participant_me: data.participantMe || null,
        participant_them: data.participantThem || null,
        meeting_url: data.meetingUrl && data.meetingUrl.trim() ? data.meetingUrl : null,
        meeting_platform: platform,
        transcription_provider: 'recall_ai'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Create session context if provided
    if (data.context) {
      await supabase
        .from('session_context')
        .insert({
          session_id: session.id,
          user_id: user.id,
          organization_id: orgMember.organization_id,
          text_context: data.context,
          context_metadata: {
            meeting_agenda: data.context,
            scheduled_at: data.scheduledAt
          }
        });
    }

    // Create meeting metadata
    await supabase
      .from('meeting_metadata')
      .insert({
        session_id: session.id,
        platform,
        meeting_agenda: data.context,
        scheduled_at: data.scheduledAt,
        started_at: new Date().toISOString()
      });

    // Don't deploy bot automatically - wait for user action

    return NextResponse.json({
      success: true,
      meeting: {
        id: session.id,
        title: session.title,
        type: session.conversation_type,
        platform,
        meetingUrl: data.meetingUrl && data.meetingUrl.trim() ? data.meetingUrl : null,
        status: session.status,
        botId: session.recall_bot_id,
        createdAt: session.created_at
      }
    });

  } catch (error) {
    console.error('Create meeting error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}