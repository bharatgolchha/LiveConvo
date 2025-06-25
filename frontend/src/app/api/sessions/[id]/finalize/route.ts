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
    const { textContext, conversationType, conversationTitle, uploadedFiles, selectedPreviousConversations, personalContext, participantMe, participantThem } = await request.json();

    if (!openrouterApiKey) {
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
    
    const summary = await generateFinalSummary(transcriptText, conversationType, fullContext, participantMe, participantThem);
    const finalData = await generateFinalizationData(transcriptText, fullContext, conversationType, summary, participantMe, participantThem);

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
        risk_factors: finalData?.risk_factors || []
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
    
    // Return a more detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to finalize session',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'UnknownError'
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

async function generateFinalSummary(transcript: string, conversationType?: string, fullContext?: string, participantMe?: string, participantThem?: string): Promise<EnhancedSummary> {
  const typeSpecificPrompts = {
    sales: `Pay special attention to:
- Customer pain points and needs identified
- Budget discussions and decision timeline
- Product/service fit assessment
- Objections raised and how they were handled
- Competitive mentions or comparisons
- Next steps in the sales process
- Probability of closing the deal`,
    
    interview: `Focus on:
- Candidate's relevant experience and skills
- Technical competency demonstrated
- Cultural fit indicators
- Communication effectiveness
- Red flags or concerns raised
- Strengths and growth areas
- Overall hiring recommendation`,
    
    meeting: `Analyze:
- Agenda items discussed and decisions made
- Action items with clear owners
- Strategic initiatives or changes
- Resource allocations or budget decisions
- Risks identified and mitigation plans
- Timeline and milestones established
- Follow-up meeting requirements`,
    
    support: `Examine:
- Customer issue or problem statement
- Troubleshooting steps taken
- Root cause identification
- Resolution provided or escalation needed
- Customer satisfaction indicators
- Knowledge gaps identified
- Process improvement opportunities`
  };

  const conversationTypePrompt = typeSpecificPrompts[conversationType as keyof typeof typeSpecificPrompts] || 
    'Provide a comprehensive analysis of key discussion points, decisions, and outcomes.';

  const meLabel = participantMe || 'Speaker 1';
  const themLabel = participantThem || 'Speaker 2';
  
  const systemPrompt = `You are an expert conversation analyst specializing in comprehensive meeting analysis and coaching insights.

${getCurrentDateContext()}

Your task is to analyze this ${conversationType || 'business'} conversation between ${participantMe || 'the participants'} and ${participantThem || ''} and provide detailed, actionable insights.

PARTICIPANT IDENTIFICATION:
${participantMe && participantThem ? `- "${participantMe}" = The person who recorded this conversation (the user requesting this analysis)
- "${participantThem}" = The person ${participantMe} was speaking with` : '- Participants not specified'}

ANALYSIS OBJECTIVES:
1. **Meeting Performance**: How effectively did the conversation achieve its stated goals?
2. **Content Analysis**: What key topics, decisions, and outcomes emerged?
3. **Communication Dynamics**: How did the conversation flow and what patterns emerged?
4. **Strategic Insights**: What important insights or opportunities were identified?
5. **Action Planning**: What specific next steps and follow-ups are needed?

Your analysis should be thorough, insightful, and actionable - providing value that goes beyond a simple transcript summary.

${conversationTypePrompt}

IMPORTANT: 
- Be SPECIFIC, not generic. Reference actual content from the transcript.
- Every point must be supported by evidence from the conversation.
- Focus on actionable insights that can improve future conversations.
- For SHORT conversations, focus on the main purpose and outcome rather than trying to extract non-existent insights
- Don't overanalyze brief technical checks or scheduling confirmations - be proportional to the conversation depth
- Use the actual speaker names from the transcript in your analysis
- Compare what was discussed against the meeting agenda/context to identify what was covered and what was missed

EFFECTIVENESS METRICS CALCULATION GUIDE:
- objective_achievement: How well did the conversation achieve its stated goals? (0-100)
- communication_clarity: Were ideas expressed clearly and understood? Look for confusion, clarifications needed (0-100)
- participant_satisfaction: Did both parties seem engaged and satisfied? Look for positive responses, agreement (0-100)
- overall_success: General assessment of whether this was a productive conversation (0-100)
- agenda_alignment: How well did the conversation stick to the planned agenda/context? (0-100)
- speaking_balance: Was speaking time reasonably balanced or did one person dominate? 50-50 = 100, heavily skewed = lower (0-100)
- engagement_level: How engaged were the participants? Look for questions, active responses, enthusiasm (0-100)

Be realistic with scores - most conversations aren't perfect. Use 60-80 range for typical good conversations, 80+ for exceptional ones.

Return a JSON object with this EXACT structure:
{
  "tldr": "2-3 sentence executive summary that captures the essence and outcome",
  "key_points": [
    "Specific point with context from the conversation",
    "Another specific insight with supporting evidence",
    "Important topic discussed with outcome"
  ],
  "decisions_made": [
    {
      "decision": "Specific decision reached",
      "rationale": "Why this decision was made",
      "impact": "Expected outcome or implication"
    }
  ],
  "action_items": [
    {
      "task": "Specific action to be taken",
      "owner": "Who is responsible (use actual name from transcript)",
      "timeline": "When it should be completed",
      "priority": "high|medium|low"
    }
  ],
  "insights": [
    {
      "observation": "Key insight from the conversation",
      "evidence": "Quote or paraphrase supporting this",
      "recommendation": "How to leverage this insight"
    }
  ],
  "missed_opportunities": [
    "Opportunity that wasn't explored",
    "Question that should have been asked"
  ],
  "successful_moments": [
    "Effective technique or approach used",
    "Positive interaction or breakthrough"
  ],
  "follow_up_questions": [
    "Important question for next conversation",
    "Clarification needed on specific topic"
  ],
  "conversation_dynamics": {
    "rapport_level": "excellent|good|neutral|poor",
    "engagement_quality": "high|medium|low",
    "dominant_speaker": "ME|THEM|balanced",
    "pace": "fast|moderate|slow",
    "tone": "formal|casual|mixed"
  },
  "effectiveness_metrics": {
    "objective_achievement": 0-100,
    "communication_clarity": 0-100,
    "participant_satisfaction": 0-100,
    "overall_success": 0-100,
    "agenda_alignment": 0-100,
    "speaking_balance": 0-100,
    "engagement_level": 0-100
  },
  "agenda_coverage": {
    "items_covered": ["List of agenda items that were discussed"],
    "items_missed": ["List of agenda items that were not covered"],
    "unexpected_topics": ["Topics discussed that weren't in the agenda"]
  },
  "coaching_recommendations": [
    "Specific advice for improving future conversations",
    "Skill to develop based on this conversation"
  ]
}`;

  const model = await getAIModelForAction(AIAction.SUMMARY);
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
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Analyze this ${conversationType || 'business'} conversation and provide specific, actionable insights.

MEETING AGENDA AND CONTEXT:
${fullContext || 'No additional context provided.'}

KEY ANALYSIS REQUIREMENTS:
1. Compare what was actually discussed against the meeting agenda/context above
2. Identify which agenda items were covered and which were missed
3. Assess how well the meeting achieved its stated goals
4. Note any unexpected topics that arose outside the agenda

CONVERSATION TRANSCRIPT:
${transcript}

Remember: 
- Be specific, reference actual content, and provide value beyond generic observations
- Use the provided context to understand the background and continuity
- Use the speaker names exactly as they appear in the transcript
- For brief conversations, keep the analysis proportional - don't over-interpret simple exchanges
- If previous conversations are mentioned, consider follow-up on past action items or decisions
- Explicitly mention how the conversation aligned with or deviated from the meeting agenda`
        }
      ],
      temperature: 0.3,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    console.error('❌ OpenRouter API error:', response.status, response.statusText);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('🤖 OpenRouter response received:', {
    hasChoices: !!data.choices,
    choicesLength: data.choices?.length,
    messageContent: data.choices?.[0]?.message?.content?.substring(0, 200) + '...'
  });

  let summary;
  try {
    const rawContent = data.choices[0].message.content;
    console.log('📄 Raw AI response (first 500 chars):', rawContent?.substring(0, 500));
    
    summary = JSON.parse(rawContent);
    console.log('✅ Successfully parsed AI summary JSON');
  } catch (parseError) {
    console.error('❌ Failed to parse AI summary JSON:', parseError);
    console.error('🔍 Raw content that failed to parse:', data.choices[0].message.content);
    
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
  
  // Map the new structure to the expected database fields
  return {
    tldr: summary.tldr,
    key_points: summary.key_points || [],
    action_items: summary.action_items?.map((item: string | SummaryActionItem) => 
      typeof item === 'string' ? item : `${item.task} (${item.owner}) - ${item.timeline}`
    ) || [],
    outcomes: summary.decisions_made?.map((d: SummaryDecision) => d.decision) || [],
    next_steps: summary.follow_up_questions || [],
    insights: summary.insights || [],
    missed_opportunities: summary.missed_opportunities || [],
    successful_moments: summary.successful_moments || [],
    conversation_dynamics: summary.conversation_dynamics || {},
    effectiveness_metrics: summary.effectiveness_metrics || {},
    agenda_coverage: summary.agenda_coverage || {},
    coaching_recommendations: summary.coaching_recommendations || []
  };
}

async function generateFinalizationData(transcript: string, context: string, conversationType?: string, summary?: EnhancedSummary, participantMe?: string, participantThem?: string): Promise<FinalizationData> {
  const meLabel = participantMe || 'Speaker 1';
  const themLabel = participantThem || 'Speaker 2';
  
  const systemPrompt = `You are an expert conversation coach providing deep analysis and actionable recommendations.

${getCurrentDateContext()}

Analyze the conversation for patterns, techniques, and opportunities.

IMPORTANT: 
- The transcript contains actual speaker names. Use these names exactly as they appear in your analysis.
- Use the meeting context/agenda to assess effectiveness against intended goals.

Return a JSON object with this structure:
{
  "performance_analysis": {
    "strengths": [
      "Specific strength demonstrated with example",
      "Effective technique used and when"
    ],
    "areas_for_improvement": [
      "Specific area needing work with suggestion",
      "Missed opportunity with alternative approach"
    ],
    "communication_effectiveness": 0-100,
    "goal_achievement": 0-100,
    "listening_quality": 0-100,
    "question_effectiveness": 0-100
  },
  "conversation_patterns": {
    "opening_effectiveness": "How well the conversation started",
    "flow_management": "How well topics transitioned",
    "closing_quality": "How effectively it concluded",
    "energy_levels": "High/Medium/Low throughout"
  },
  "key_techniques_used": [
    {
      "technique": "Name of technique",
      "example": "How it was used",
      "effectiveness": "Impact it had"
    }
  ],
  "recommendations": [
    {
      "area": "Specific skill or approach",
      "suggestion": "Concrete improvement strategy",
      "practice_tip": "How to implement this"
    }
  ],
  "follow_up_strategy": {
    "immediate_actions": ["Within 24 hours"],
    "short_term": ["Within a week"],
    "long_term": ["Ongoing relationship building"]
  },
  "success_indicators": [
    "What went particularly well",
    "Positive outcomes achieved"
  ],
  "risk_factors": [
    "Potential issues to monitor",
    "Areas requiring attention"
  ]
}`;

  const model2 = await getAIModelForAction(AIAction.SUMMARY);
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
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Provide deep performance analysis and coaching for this ${conversationType || 'business'} conversation.

MEETING AGENDA AND CONTEXT:
${context || 'No additional context'}

ANALYSIS FOCUS:
1. How well did the conversation achieve the goals outlined in the agenda/context?
2. Which planned topics were covered effectively vs. missed?
3. How could the conversation have been more aligned with the stated objectives?

CONVERSATION TRANSCRIPT:
${transcript}

Provide specific, evidence-based analysis with actionable recommendations that reference both the transcript and the meeting agenda/context.`
        }
      ],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    console.error('❌ OpenRouter API error (finalization):', response.status, response.statusText);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('🤖 Finalization response received:', {
    hasChoices: !!data.choices,
    choicesLength: data.choices?.length,
    messageContent: data.choices?.[0]?.message?.content?.substring(0, 200) + '...'
  });

  try {
    const rawContent = data.choices[0].message.content;
    console.log('📄 Raw finalization response (first 500 chars):', rawContent?.substring(0, 500));
    
    const result = JSON.parse(rawContent);
    console.log('✅ Successfully parsed finalization JSON');
    return result;
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