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

    // Create service role Supabase client (no auth required for public shares)
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
        { status: 410 } // 410 Gone
      );
    }

    // Update access count and last accessed time
    await supabase
      .from('shared_reports')
      .update({
        accessed_count: (shareRecord.accessed_count || 0) + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', shareRecord.id);

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        conversation_type,
        recording_duration_seconds,
        created_at,
        participant_me,
        participant_them,
        summaries (
          id,
          tldr,
          key_decisions,
          action_items,
          follow_up_questions,
          conversation_highlights,
          structured_notes
        )
      `)
      .eq('id', shareRecord.session_id)
      .single();

    if (!session || sessionError) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Get user info (just name, no sensitive data)
    const { data: userData } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', shareRecord.user_id)
      .single();

    // Filter data based on shared tabs
    const sharedTabs = shareRecord.shared_tabs || [];
    const summary = session.summaries?.[0];
    
    // Parse structured notes
    let structuredNotes: any = {};
    if (summary?.structured_notes) {
      try {
        structuredNotes = JSON.parse(summary.structured_notes);
      } catch (e) {
        console.error('Failed to parse structured notes:', e);
      }
    }

    // Build filtered report data
    const filteredReport = {
      id: session.id,
      title: session.title,
      type: session.conversation_type,
      duration: session.recording_duration_seconds,
      participants: {
        me: session.participant_me || 'Participant 1',
        them: session.participant_them || 'Participant 2'
      },
      createdAt: session.created_at,
      sharedBy: userData?.full_name || 'Anonymous',
      shareMessage: shareRecord.message,
      expiresAt: shareRecord.expires_at,
      allowedTabs: sharedTabs,
      summary: {
        // Always include basic info
        tldr: sharedTabs.includes('overview') ? summary?.tldr : null,
        effectiveness: sharedTabs.includes('overview') ? {
          overall: structuredNotes.effectiveness_metrics?.overall_success || 0,
          communication: structuredNotes.effectiveness_metrics?.communication_clarity || 0,
          goalAchievement: structuredNotes.effectiveness_metrics?.objective_achievement || 0
        } : null,
        
        // Conditionally include based on shared tabs
        keyDecisions: sharedTabs.includes('insights') ? summary?.key_decisions || [] : [],
        actionItems: sharedTabs.includes('actions') ? summary?.action_items || [] : [],
        insights: sharedTabs.includes('insights') ? structuredNotes.insights || [] : [],
        conversationHighlights: sharedTabs.includes('overview') ? summary?.conversation_highlights || [] : [],
        followUpQuestions: sharedTabs.includes('followup') ? summary?.follow_up_questions || [] : [],
        participants: sharedTabs.includes('overview') ? structuredNotes.participants : null,
        keyOutcome: sharedTabs.includes('overview') ? structuredNotes.key_outcome : null,
        criticalInsight: sharedTabs.includes('overview') ? structuredNotes.critical_insight : null,
        immediateAction: sharedTabs.includes('followup') ? structuredNotes.immediate_action : null,
        
        // Analytics tab data
        effectivenessScore: sharedTabs.includes('analytics') ? structuredNotes.effectiveness_score : null,
        important_numbers: sharedTabs.includes('insights') ? structuredNotes.important_numbers : null,
        quotable_quotes: sharedTabs.includes('insights') ? structuredNotes.quotable_quotes : null,
        metadata: sharedTabs.includes('analytics') ? structuredNotes.metadata : null,
        conversation_flow: sharedTabs.includes('analytics') ? structuredNotes.conversation_flow : null,
        coaching_recommendations: sharedTabs.includes('analytics') ? structuredNotes.coaching_recommendations : null,
        
        // Follow-up tab data
        emailDraft: sharedTabs.includes('followup') ? structuredNotes.email_draft : null,
        nextMeetingTemplate: sharedTabs.includes('followup') ? structuredNotes.next_meeting_template : null,
        templates: sharedTabs.includes('followup') ? structuredNotes.templates : null,
        riskAssessment: sharedTabs.includes('followup') ? structuredNotes.risk_assessment : null,
        follow_up_strategy: sharedTabs.includes('followup') ? structuredNotes.follow_up_strategy : null,
      }
    };

    return NextResponse.json({
      report: filteredReport,
      isShared: true
    });

  } catch (error) {
    console.error('Error retrieving shared report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}