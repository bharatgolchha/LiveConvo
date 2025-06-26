import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { 
  EnhancedSummary, 
  FinalizationData, 
  SummaryInsight,
  SummaryActionItem,
  SummaryDecision 
} from '@/types/api';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import { getCurrentDateContext } from '@/lib/utils';
import { 
  generateEnhancedSummaryPrompt, 
  generateCoachingPrompt,
  generateEmailDraftPrompt,
  type MeetingContext,
  type SummaryPromptConfig 
} from '@/lib/prompts/summaryPrompts';

const openrouterApiKey = process.env.OPENROUTER_API_KEY;

interface FinalSummaryRequest {
  conversationType?: string;
  conversationTitle?: string;
  textContext?: string;
  uploadedFiles?: Array<{ name: string; type: string; size: number }>;
  selectedPreviousConversations?: string[];
  personalContext?: string;
  participantMe?: string;
  participantThem?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { textContext, conversationType, conversationTitle, uploadedFiles, selectedPreviousConversations, personalContext, participantMe, participantThem } = body;

    console.log('📝 Finalize request received:', {
      sessionId,
      conversationType,
      conversationTitle,
      hasTextContext: !!textContext,
      hasParticipants: !!participantMe && !!participantThem
    });

    if (!openrouterApiKey) {
      console.error('❌ CRITICAL: OpenRouter API key not configured');
      console.error('❌ Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasSupabaseService: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing authentication token' },
        { status: 401 }
      );
    }

    // Create authenticated client with user token for RLS
    const authenticatedSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user }, error: authError } = await authenticatedSupabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to finalize session' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', { userId: user.id, email: user.email });

    // Verify session belongs to user and get organization_id - using authenticated client
    const { data: sessionData, error: sessionError } = await authenticatedSupabase
      .from('sessions')
      .select('id, user_id, organization_id, finalized_at')
      .eq('id', sessionId)
      .single(); // Remove user_id filter since RLS will handle it

    if (sessionError || !sessionData) {
      console.error('❌ Session query error:', sessionError);
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Check if session is already finalized
    if (sessionData.finalized_at) {
      console.log('⚠️ Session already finalized:', {
        sessionId,
        finalizedAt: sessionData.finalized_at
      });
      
      // Check if there's already a summary
      const { data: existingSummary } = await authenticatedSupabase
        .from('summaries')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (existingSummary) {
        console.log('✅ Returning existing summary');
        return NextResponse.json({
          sessionId,
          summary: {
            tldr: existingSummary.tldr,
            key_points: existingSummary.key_decisions || [],
            action_items: existingSummary.action_items || [],
            outcomes: existingSummary.key_decisions || [],
            next_steps: existingSummary.follow_up_questions || [],
            insights: [],
            missed_opportunities: [],
            successful_moments: [],
            conversation_dynamics: {},
            effectiveness_metrics: {},
            agenda_coverage: {},
            coaching_recommendations: []
          },
          finalization: null,
          transcript: existingSummary.full_transcript || '',
          conversationType,
          conversationTitle,
          finalizedAt: sessionData.finalized_at,
          warning: 'Session was already finalized. Returning existing summary.'
        });
      }
    }

    // Fetch transcript data from database - using authenticated client
    const { data: transcriptLines, error: transcriptError } = await authenticatedSupabase
      .from('transcripts')
      .select('*')
      .eq('session_id', sessionId)
      .order('start_time_seconds', { ascending: true });

    if (transcriptError) {
      console.error('❌ Database error fetching transcript:', transcriptError);
      return NextResponse.json(
        { error: 'Database error', message: transcriptError.message },
        { status: 500 }
      );
    }

    // Convert transcript lines to text format - speaker names are already in the database
    const transcriptText = transcriptLines && transcriptLines.length > 0 
      ? transcriptLines.map(line => {
          // The database already stores the actual speaker names (e.g., "Bharat Golchha", "Mudit Golchha")
          return `${line.speaker}: ${line.content}`;
        }).join('\n')
      : '';

    if (!transcriptText || transcriptText.trim().length === 0) {
      console.warn('⚠️ No transcript available for session:', {
        sessionId,
        transcriptLinesCount: transcriptLines?.length || 0,
        transcriptError
      });
      
      // Return a minimal summary instead of failing completely
      const minimalSummary = {
        tldr: 'No transcript data available for this session.',
        key_points: [],
        action_items: [],
        outcomes: [],
        next_steps: [],
        insights: [],
        missed_opportunities: [],
        successful_moments: [],
        conversation_dynamics: {},
        effectiveness_metrics: {},
        coaching_recommendations: []
      };
      
      // Still save a minimal summary record
      const summaryInsertData = {
        session_id: sessionId,
        user_id: user.id,
        organization_id: sessionData.organization_id,
        title: conversationTitle || 'Conversation Summary',
        tldr: minimalSummary.tldr,
        key_decisions: [],
        action_items: [],
        follow_up_questions: [],
        conversation_highlights: [],
        full_transcript: '',
        structured_notes: JSON.stringify({}),
        generation_status: 'failed',
        model_used: 'none'
      };
      
      await authenticatedSupabase
        .from('summaries')
        .insert(summaryInsertData);
      
      // Update session status
      await authenticatedSupabase
        .from('sessions')
        .update({ 
          status: 'completed',
          finalized_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      return NextResponse.json({
        sessionId,
        summary: minimalSummary,
        finalization: null,
        transcript: '',
        conversationType,
        conversationTitle,
        finalizedAt: new Date().toISOString(),
        warning: 'No transcript data available'
      });
    }

    console.log('🔍 Processing transcript:', {
      sessionId,
      transcriptLines: transcriptLines?.length || 0,
      transcriptLength: transcriptText.length,
      conversationType,
      conversationTitle
    });

    // Calculate session statistics from transcript data
    const totalWords = transcriptLines?.reduce((total, line) => {
      return total + (line.content?.split(' ').length || 0);
    }, 0) || 0;

    const sessionDuration = transcriptLines?.length > 0 
      ? Math.max(...transcriptLines.map(line => line.end_time_seconds || line.start_time_seconds || 0))
      : 0;

    // Calculate speaking time by participant
    const speakingStats = transcriptLines?.reduce((stats, line) => {
      const speaker = line.speaker;
      const duration = (line.end_time_seconds || line.start_time_seconds) - line.start_time_seconds || 0;
      
      if (!stats[speaker]) {
        stats[speaker] = { duration: 0, words: 0 };
      }
      
      stats[speaker].duration += duration;
      stats[speaker].words += (line.content?.split(' ').length || 0);
      
      return stats;
    }, {} as Record<string, { duration: number; words: number }>) || {};

    // Generate summary and finalization with full context
    const fullContext = buildFullContext(textContext, personalContext, uploadedFiles, selectedPreviousConversations);
    
    // Log context being passed to AI
    console.log('📋 Full context being passed to AI:', {
      hasTextContext: !!textContext,
      textContextLength: textContext?.length || 0,
      textContextPreview: textContext ? textContext.substring(0, 200) + '...' : 'None',
      hasPersonalContext: !!personalContext,
      uploadedFilesCount: uploadedFiles?.length || 0,
      previousConversationsCount: selectedPreviousConversations?.length || 0,
      fullContextLength: fullContext.length
    });
    
    // Create meeting context for enhanced prompts
    // Map conversation types to our expected types
    const normalizedType = (() => {
      const lowerType = conversationType?.toLowerCase() || '';
      if (lowerType.includes('sales') || lowerType.includes('demo')) return 'sales';
      if (lowerType.includes('interview') || lowerType.includes('hiring')) return 'interview';
      if (lowerType.includes('support') || lowerType.includes('help')) return 'support';
      if (lowerType.includes('meeting') || lowerType.includes('sync')) return 'meeting';
      return 'general';
    })();

    const meetingContext: MeetingContext = {
      type: normalizedType,
      agenda: textContext,
      context: personalContext,
      previousMeetings: selectedPreviousConversations,
      participantCount: Object.keys(speakingStats).length || 2,
      duration: sessionDuration
    };

    const promptConfig: SummaryPromptConfig = {
      includeEmailDraft: true,
      includeRiskAssessment: normalizedType === 'sales' || normalizedType === 'meeting',
      includeEffectivenessScore: true,
      includeNextMeetingTemplate: normalizedType === 'meeting' || normalizedType === 'sales'
    };
    
    const summary = await generateFinalSummary(transcriptText, meetingContext, promptConfig, participantMe, participantThem);
    const finalData = await generateFinalizationData(transcriptText, summary, meetingContext, participantMe, participantThem);

    console.log('🤖 AI Summary generated:', {
      hasTldr: !!summary.tldr,
      hasKeyPoints: !!summary.key_points,
      hasOutcomes: !!summary.outcomes,
      hasActionItems: !!summary.action_items,
      hasNextSteps: !!summary.next_steps
    });

    // Save final summary to database with proper field mapping
    const summaryInsertData = {
      session_id: sessionId,
      user_id: user.id,
      organization_id: sessionData.organization_id,
      title: conversationTitle || 'Conversation Summary',
      tldr: summary.tldr || 'Summary not available',
      key_decisions: summary.outcomes || summary.key_points || [], // Map to correct field name
      action_items: summary.action_items || [],
      follow_up_questions: summary.next_steps || [], // Map next_steps to follow_up_questions
      conversation_highlights: [
        ...summary.key_points || [],
        ...(summary.insights?.map((i: SummaryInsight) => i.observation) || []),
        ...(summary.successful_moments || [])
      ], // Combine all highlights
      full_transcript: transcriptText,
      structured_notes: JSON.stringify({
        insights: summary.insights || [],
        missed_opportunities: summary.missed_opportunities || [],
        successful_moments: summary.successful_moments || [],
        conversation_dynamics: summary.conversation_dynamics || {},
        effectiveness_metrics: summary.effectiveness_metrics || {},
        agenda_coverage: summary.agenda_coverage || {},
        coaching_recommendations: summary.coaching_recommendations || [],
        performance_analysis: finalData?.performance_analysis || {},
        conversation_patterns: finalData?.conversation_patterns || {},
        key_techniques_used: finalData?.key_techniques_used || [],
        follow_up_strategy: finalData?.follow_up_strategy || {},
        success_indicators: finalData?.success_indicators || [],
        risk_factors: finalData?.risk_factors || [],
        // Add the new enhanced fields
        email_draft: summary.email_draft || null,
        risk_assessment: summary.risk_assessment || null,
        effectiveness_score: summary.effectiveness_score || null,
        next_meeting_template: summary.next_meeting_template || null,
        templates: finalData?.templates || null
      }), // Store enhanced data as structured notes
      generation_status: 'completed',
      model_used: await getAIModelForAction(AIAction.SUMMARY)
    };

    console.log('💾 Attempting to save summary to database:', {
      session_id: summaryInsertData.session_id,
      user_id: summaryInsertData.user_id,
      organization_id: summaryInsertData.organization_id,
      title: summaryInsertData.title,
      tldr_length: summaryInsertData.tldr?.length || 0,
      key_decisions_count: Array.isArray(summaryInsertData.key_decisions) ? summaryInsertData.key_decisions.length : 0,
      action_items_count: Array.isArray(summaryInsertData.action_items) ? summaryInsertData.action_items.length : 0
    });

    const { data: summaryData, error: summaryError } = await authenticatedSupabase
      .from('summaries')
      .insert(summaryInsertData)
      .select()
      .single();

    if (summaryError) {
      console.error('❌ Database error saving summary:', summaryError);
      console.error('❌ Full summary insert data:', summaryInsertData);
      // Continue even if summary save fails but log the error details
    } else {
      console.log('✅ Summary successfully saved to database with ID:', summaryData?.id);
    }

    console.log('📊 Calculated session statistics:', {
      transcriptLinesCount: transcriptLines?.length || 0
    });

    // Update session status and statistics - using authenticated client
    const { error: sessionUpdateError } = await authenticatedSupabase
      .from('sessions')
      .update({ 
        status: 'completed',
        finalized_at: new Date().toISOString(),
        total_words_spoken: totalWords,
        recording_duration_seconds: Math.round(sessionDuration)
      })
      .eq('id', sessionId);

    if (sessionUpdateError) {
      console.error('❌ Failed to update session status:', sessionUpdateError);
    } else {
      console.log('✅ Session status and statistics updated');
    }

    // If summary save failed but session update succeeded, still return a partial success
    if (summaryError && !sessionUpdateError) {
      console.warn('⚠️ Session finalized but summary save failed');
      return NextResponse.json({
        sessionId,
        summary,
        finalization: finalData,
        transcript: transcriptText,
        conversationType,
        conversationTitle,
        finalizedAt: new Date().toISOString(),
        warning: 'Session finalized but summary storage failed. Data may be incomplete.'
      });
    }

    return NextResponse.json({
      sessionId,
      summary,
      finalization: finalData,
      transcript: transcriptText,
      conversationType,
      conversationTitle,
      finalizedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Session finalization error:', error);
    console.error('💥 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    // Log the request details for debugging
    console.error('💥 Request details:', {
      sessionId: (await params).id,
      hasAuth: !!request.headers.get('authorization'),
      errorName: error instanceof Error ? error.name : 'Unknown'
    });
    
    // Return a more detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to finalize session',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        sessionId: (await params).id
      },
      { status: 500 }
    );
  }
}

// Helper function to build full context
function buildFullContext(textContext?: string, personalContext?: string, uploadedFiles?: Array<{ name: string; type: string; size: number }>, selectedPreviousConversations?: string[]): string {
  let fullContext = '';
  
  // Add personal context from user settings
  if (personalContext && personalContext.trim()) {
    fullContext += `USER'S PERSONAL CONTEXT:\n${personalContext}\n\n`;
  }
  
  // Add setup context
  if (textContext && textContext.trim()) {
    fullContext += `SESSION CONTEXT AND NOTES:\n${textContext}\n\n`;
  }
  
  // Add uploaded files info
  if (uploadedFiles && uploadedFiles.length > 0) {
    fullContext += `UPLOADED CONTEXT FILES:\n`;
    uploadedFiles.forEach(file => {
      fullContext += `- ${file.name} (${file.type})\n`;
    });
    fullContext += `\n`;
  }
  
  // Note about previous conversations
  if (selectedPreviousConversations && selectedPreviousConversations.length > 0) {
    fullContext += `NOTE: This conversation has ${selectedPreviousConversations.length} previous related conversations that provide additional context.\n\n`;
  }
  
  return fullContext || 'No additional context provided.';
}

async function generateFinalSummary(transcript: string, context: MeetingContext, config: SummaryPromptConfig, participantMe?: string, participantThem?: string): Promise<EnhancedSummary> {
  // Generate the enhanced prompt using our new system
  const promptContent = generateEnhancedSummaryPrompt(transcript, context, config);

  const model = await getAIModelForAction(AIAction.SUMMARY);
  console.log('🤖 Using AI model for summary:', model);
  console.log('🔑 OpenRouter API key present:', !!openrouterApiKey);
  console.log('📊 Prompt content length:', promptContent.length);
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://liveconvo.app',
      'X-Title': 'liveprompt.ai Session Summary',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: promptContent
        }
      ],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenRouter API error:', response.status, response.statusText);
    console.error('❌ OpenRouter error details:', errorText);
    console.error('❌ Request details:', {
      model,
      hasApiKey: !!openrouterApiKey,
      apiKeyLength: openrouterApiKey?.length,
      promptLength: promptContent.length
    });
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('🤖 OpenRouter response received:', {
    hasChoices: !!data.choices,
    choicesLength: data.choices?.length,
    messageContent: data.choices?.[0]?.message?.content?.substring(0, 200) + '...'
  });

  let summary;
  try {
    let rawContent = data.choices[0].message.content;
    console.log('📄 Raw AI response (first 500 chars):', rawContent?.substring(0, 500));
    console.log('📄 Raw AI response length:', rawContent?.length);
    
    // Check if the response seems truncated
    if (rawContent && !rawContent.trim().endsWith('}')) {
      console.warn('⚠️ Response appears to be truncated');
      // Try to add missing closing braces
      const openBraces = (rawContent.match(/{/g) || []).length;
      const closeBraces = (rawContent.match(/}/g) || []).length;
      const missingBraces = openBraces - closeBraces;
      if (missingBraces > 0) {
        rawContent += '}'.repeat(missingBraces);
        console.log('🔧 Added missing closing braces:', missingBraces);
      }
    }
    
    summary = JSON.parse(rawContent);
    console.log('✅ Successfully parsed AI summary JSON');
  } catch (parseError) {
    console.error('❌ Failed to parse AI summary JSON:', parseError);
    console.error('🔍 Raw content length:', data.choices[0].message.content?.length);
    console.error('🔍 Raw content last 200 chars:', data.choices[0].message.content?.slice(-200));
    
    // Return a fallback summary structure
    summary = {
      tldr: 'Summary generation encountered a formatting issue. The conversation was analyzed but the detailed breakdown is not available.',
      key_points: ['Conversation analysis completed with technical limitations'],
      decisions_made: [],
      action_items: [],
      insights: [],
      missed_opportunities: [],
      successful_moments: [],
      follow_up_questions: [],
      conversation_dynamics: {
        rapport_level: 'neutral',
        engagement_quality: 'medium',
        dominant_speaker: 'balanced',
        pace: 'moderate',
        tone: 'mixed'
      },
      effectiveness_metrics: {
        objective_achievement: 70,
        communication_clarity: 70,
        participant_satisfaction: 70,
        overall_success: 70,
        agenda_alignment: 70
      },
      agenda_coverage: {
        items_covered: [],
        items_missed: [],
        unexpected_topics: []
      },
      coaching_recommendations: ['Technical issue prevented detailed analysis']
    };
  }
  
  // Process email draft if included
  let emailDraft = null;
  if (config.includeEmailDraft && summary.followUpEmail) {
    emailDraft = summary.followUpEmail;
  }
  
  // Map the new structure to the expected database fields
  return {
    tldr: summary.executiveSummary?.oneLineSummary || summary.tldr,
    key_points: summary.discussion?.mainTopics?.map((t: { summary: string }) => t.summary) || summary.key_points || [],
    action_items: summary.actionItems?.map((item: any) => 
      `${item.task} (${item.owner}) - ${item.deadline} [${item.priority}]`
    ) || [],
    outcomes: summary.discussion?.keyDecisions?.map((d: any) => d.decision) || [],
    next_steps: summary.actionItems?.map((item: any) => item.task) || [],
    insights: summary.analysis?.momentum?.positive || [],
    missed_opportunities: summary.analysis?.momentum?.concerns || [],
    successful_moments: summary.analysis?.relationships?.strongAlignment || [],
    conversation_dynamics: {
      rapport_level: 'good',
      engagement_quality: summary.effectivenessScore?.breakdown?.participation > 80 ? 'high' : 'medium',
      dominant_speaker: 'balanced',
      pace: 'moderate',
      tone: 'formal'
    },
    effectiveness_metrics: summary.effectivenessScore?.breakdown || {},
    agenda_coverage: summary.nextMeeting ? {
      items_covered: [],
      items_missed: [],
      unexpected_topics: []
    } : undefined,
    coaching_recommendations: summary.coaching?.improvements || [],
    email_draft: emailDraft,
    risk_assessment: summary.riskAssessment,
    effectiveness_score: summary.effectivenessScore,
    next_meeting_template: summary.nextMeeting
  };
}

async function generateFinalizationData(transcript: string, summaryData: any, context: MeetingContext, participantMe?: string, participantThem?: string): Promise<FinalizationData> {
  // Generate the coaching prompt using our new system
  const promptContent = generateCoachingPrompt(transcript, summaryData, context);

  const model2 = await getAIModelForAction(AIAction.SUMMARY);
  console.log('🤖 Using AI model for finalization:', model2);
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://liveconvo.app',
      'X-Title': 'liveprompt.ai Conversation Analysis',
    },
    body: JSON.stringify({
      model: model2,
      messages: [
        {
          role: 'user',
          content: promptContent
        }
      ],
      temperature: 0.4,
      max_tokens: 6000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenRouter API error (finalization):', response.status, response.statusText);
    console.error('❌ OpenRouter finalization error details:', errorText);
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('🤖 Finalization response received:', {
    hasChoices: !!data.choices,
    choicesLength: data.choices?.length,
    messageContent: data.choices?.[0]?.message?.content?.substring(0, 200) + '...'
  });

  try {
    let rawContent = data.choices[0].message.content;
    console.log('📄 Raw finalization response (first 500 chars):', rawContent?.substring(0, 500));
    console.log('📄 Raw finalization response length:', rawContent?.length);
    
    // Check if the response seems truncated
    if (rawContent && !rawContent.trim().endsWith('}')) {
      console.warn('⚠️ Response appears to be truncated');
      // Try to add missing closing braces
      const openBraces = (rawContent.match(/{/g) || []).length;
      const closeBraces = (rawContent.match(/}/g) || []).length;
      const missingBraces = openBraces - closeBraces;
      if (missingBraces > 0) {
        rawContent += '}'.repeat(missingBraces);
        console.log('🔧 Added missing closing braces:', missingBraces);
      }
    }
    
    const result = JSON.parse(rawContent);
    console.log('✅ Successfully parsed finalization JSON');
    // Map the coaching analysis to FinalizationData structure
    return {
      performance_analysis: result.performanceAnalysis || result.performance_analysis,
      conversation_patterns: result.communicationPatterns || result.conversation_patterns,
      key_techniques_used: result.strategicInsights?.opportunities || result.key_techniques_used || [],
      recommendations: result.nextTimeRecommendations?.techniques || result.recommendations || [],
      follow_up_strategy: result.strategicInsights || result.follow_up_strategy || {
        immediate_actions: [],
        short_term: [],
        long_term: []
      },
      success_indicators: result.performanceAnalysis?.strengths?.map((s: any) => s.area) || result.success_indicators || [],
      risk_factors: result.strategicInsights?.risks?.map((r: any) => r.what) || result.risk_factors || [],
      templates: result.templates
    };
  } catch (parseError) {
    console.error('❌ Failed to parse finalization JSON:', parseError);
    console.error('🔍 Raw finalization content that failed to parse:', data.choices[0].message.content);
    
    // Return a fallback finalization structure
    return {
      performance_analysis: {
        strengths: ['Conversation completed successfully'],
        areas_for_improvement: ['Detailed analysis not available due to technical issue'],
        communication_effectiveness: 70,
        goal_achievement: 70,
        listening_quality: 70,
        question_effectiveness: 70
      },
      conversation_patterns: {
        opening_effectiveness: 'Analysis pending',
        flow_management: 'Analysis pending',
        closing_quality: 'Analysis pending',
        energy_levels: 'Medium'
      },
      key_techniques_used: [],
      recommendations: [{
        area: 'Technical Analysis',
        suggestion: 'Review completed conversation for insights',
        practice_tip: 'Manual review recommended'
      }],
      follow_up_strategy: {
        immediate_actions: ['Review conversation notes'],
        short_term: ['Follow up on key points'],
        long_term: ['Continue relationship building']
      },
      success_indicators: ['Conversation completed'],
      risk_factors: ['Technical analysis limitation']
    };
  }
}

function getConversationTypeGuidelines(conversationType?: string): string {
  const guidelines = {
    sales: `
- Customer needs, pain points, and requirements identified
- Budget, decision-making process, and timeline discussions
- Product features, benefits, and objections covered
- Competitive considerations and differentiators
- Pricing discussions and proposal requirements
- Next steps in the sales process and follow-up timeline`,

    support: `
- Customer issue description and impact assessment
- Troubleshooting steps performed and results
- Root cause analysis and resolution approach
- Escalation decisions and technical requirements
- Customer satisfaction and feedback
- Follow-up support needs and timeline`,

    meeting: `
- Agenda items covered and outcomes achieved
- Strategic decisions and policy changes
- Project updates, milestones, and roadmap changes
- Resource allocation and staffing decisions
- Risk assessment and mitigation strategies
- Next meeting requirements and timeline`,

    interview: `
- Candidate background, experience, and qualifications
- Technical skills assessment and competency evaluation
- Cultural fit assessment and team dynamics
- Compensation expectations and career goals
- Interview feedback and evaluation criteria
- Next steps in the hiring process and timeline`
  };

  return guidelines[conversationType as keyof typeof guidelines] || 
         'Focus on key discussions, decisions, action items, and outcomes.';
} 