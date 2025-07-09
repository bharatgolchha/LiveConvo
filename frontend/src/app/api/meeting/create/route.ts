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

    // Get user's organization and profile info
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, current_organization_id')
      .eq('id', user.id)
      .single();

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

    // Set participant_me to user's full name if not provided
    const participantMe = data.participantMe || userData?.full_name || user.email?.split('@')[0] || 'Host';

    // Create session in database
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        organization_id: orgMember.organization_id,
        title: data.title,
        conversation_type: data.type === 'custom' ? data.customType : data.type,
        status: 'active',
        participant_me: participantMe,
        participant_them: data.participantThem || 'Participants',
        meeting_url: data.meetingUrl && data.meetingUrl.trim() ? data.meetingUrl : null,
        meeting_platform: platform,
        transcription_provider: 'recall_ai',
        ai_instructions: data.ai_instructions || null
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
      // Ensure context is a string
      const contextString = typeof data.context === 'string' 
        ? data.context 
        : JSON.stringify(data.context);
      
      console.log('📝 Creating session context with data:', {
        session_id: session.id,
        context_length: contextString.length,
        context_preview: contextString.substring(0, 100) + (contextString.length > 100 ? '...' : '')
      });

      const { error: contextError } = await supabase
        .from('session_context')
        .insert({
          session_id: session.id,
          user_id: user.id,
          organization_id: orgMember.organization_id,
          text_context: contextString,
          context_metadata: {
            meeting_agenda: contextString,
            scheduled_at: data.scheduledAt,
            created_from: 'meeting_creation'
          }
        });

      if (contextError) {
        console.error('❌ Failed to create session context:', contextError);
        // Don't fail the entire meeting creation, but log the error
      } else {
        console.log('✅ Session context created successfully');
      }
    } else {
      console.log('⚠️ No context provided for meeting creation');
    }

    // Create meeting metadata
    const contextForMetadata = data.context 
      ? (typeof data.context === 'string' ? data.context : JSON.stringify(data.context))
      : null;
    
    await supabase
      .from('meeting_metadata')
      .insert({
        session_id: session.id,
        platform,
        meeting_agenda: contextForMetadata,
        scheduled_at: data.scheduledAt,
        started_at: new Date().toISOString()
      });

    // Create linked conversations if provided
    if (data.linkedConversationIds && data.linkedConversationIds.length > 0) {
      console.log('🔗 Creating linked conversations:', {
        session_id: session.id,
        linked_count: data.linkedConversationIds.length,
        linked_ids: data.linkedConversationIds
      });

      // Verify linked sessions exist and user has access to them
      const { data: linkedSessions, error: linkedSessionsError } = await supabase
        .from('sessions')
        .select('id, title')
        .in('id', data.linkedConversationIds)
        .eq('organization_id', orgMember.organization_id)
        .is('deleted_at', null);

      if (linkedSessionsError) {
        console.error('❌ Error verifying linked sessions:', linkedSessionsError);
      } else if (linkedSessions && linkedSessions.length > 0) {
        // Create conversation links
        const linksToCreate = linkedSessions.map(linkedSession => ({
          session_id: session.id,
          linked_session_id: linkedSession.id
        }));

        const { error: linkError } = await supabase
          .from('conversation_links')
          .insert(linksToCreate);

        if (linkError) {
          console.error('❌ Failed to create conversation links:', linkError);
          // Don't fail the entire meeting creation, but log the error
        } else {
          console.log('✅ Conversation links created successfully:', {
            links_created: linksToCreate.length,
            linked_sessions: linkedSessions.map(s => ({ id: s.id, title: s.title }))
          });
        }
      } else {
        console.log('⚠️ No valid linked sessions found to link');
      }
    } else {
      console.log('⚠️ No linked conversations provided for meeting creation');
    }

    // Don't deploy bot automatically - wait for user action

    return NextResponse.json({
      success: true,
      meeting: {
        id: session.id,
        title: session.title,
        type: session.conversation_type,
        platform,
        meetingUrl: data.meetingUrl && data.meetingUrl.trim() ? data.meetingUrl : null,
        context: contextForMetadata || null,
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