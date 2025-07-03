import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { 
  EnhancedSummary, 
  FinalizationData, 
  SummaryInsight,
  SummaryActionItem,
  SummaryDecision,
  QuotableQuote 
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
import { generateEnhancedSummaryPromptV2 } from '@/lib/prompts/enhancedSummaryPrompts';
import { 
  generateExecutiveSummaryPrompt,
  generateParticipantAnalysisPrompt,
  generateDecisionsAndActionsPrompt,
  generateInsightsAndMetricsPrompt,
  generateEffectivenessScorePrompt,
  generateRiskAssessmentPrompt,
  generateFollowUpContentPrompt,
  combineModularResults
} from '@/lib/prompts/modularSummaryPrompts';

const openrouterApiKey = process.env.OPENROUTER_API_KEY;
console.log('🔍 Environment check:', {
  hasOpenRouterKey: !!openrouterApiKey,
  keyLength: openrouterApiKey?.length,
  nodeEnv: process.env.NODE_ENV
});

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
  // Check if client wants SSE progress updates
  const wantsSSE = request.headers.get('accept')?.includes('text/event-stream');
  
  if (wantsSSE) {
    // Parse body first before streaming
    const { id: sessionId } = await params;
    const body = await request.json();
    
    // Return SSE response with progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send progress update helper
          const sendProgress = (step: string, progress: number, total: number = 8) => {
            const message = `data: ${JSON.stringify({ step, progress, total })}\n\n`;
            controller.enqueue(encoder.encode(message));
          };
          
          sendProgress('Initializing report generation...', 0);
          
          // Continue with the rest of the logic, sending progress updates
          await processFinalization({
            sessionId,
            body,
            request,
            sendProgress,
            controller,
            encoder
          });
        } catch (error) {
          const errorMessage = `data: ${JSON.stringify({ error: true, message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
        } finally {
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
  
  // Regular POST request without SSE
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    
    const result = await processFinalization({
      sessionId,
      body,
      request
    });
    
    return NextResponse.json(result);

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
      errorName: error instanceof Error ? error.name : 'Unknown',
      hasOpenRouterKey: !!openrouterApiKey,
      openRouterKeyPrefix: openrouterApiKey ? openrouterApiKey.substring(0, 10) + '...' : 'none'
    });
    
    // Return a more detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to finalize session',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        sessionId: (await params).id,
        hint: error instanceof Error && error.message.includes('OpenRouter') 
          ? 'Check that OPENROUTER_API_KEY is properly configured in environment variables'
          : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to process finalization with progress updates
async function processFinalization({
  sessionId,
  body,
  request,
  sendProgress,
  controller,
  encoder
}: {
  sessionId: string;
  body: any;
  request: NextRequest;
  sendProgress?: (step: string, progress: number, total?: number) => void;
  controller?: ReadableStreamDefaultController;
  encoder?: TextEncoder;
}) {
  const { textContext, conversationType, conversationTitle, uploadedFiles, selectedPreviousConversations, personalContext, participantMe, participantThem, regenerate } = body;

  console.log('📝 Finalize request received:', {
    sessionId,
    conversationType,
    conversationTitle,
    hasTextContext: !!textContext,
    hasParticipants: !!participantMe && !!participantThem,
    regenerate: !!regenerate
  });

  if (!openrouterApiKey) {
    console.error('❌ CRITICAL: OpenRouter API key not configured');
    throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.');
  }

  // Get current user from Supabase auth using the access token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    throw new Error('Unauthorized: Missing authentication token');
  }

  // Verify Supabase config
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ CRITICAL: Supabase configuration missing');
    throw new Error('Supabase configuration is incomplete. Check environment variables.');
  }

  // Create authenticated client
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

  // Get user
  const { data: { user }, error: userError } = await authenticatedSupabase.auth.getUser();
  if (!user || userError) {
    throw new Error('Unauthorized: Invalid user');
  }

  sendProgress?.('Fetching session data...', 1);

  // Fetch session data
  const { data: sessionData, error: sessionError } = await authenticatedSupabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !sessionData) {
    throw new Error('Session not found');
  }

  // Check if session is already finalized
  if (sessionData.finalized_at && !regenerate) {
    const { data: existingSummary } = await authenticatedSupabase
      .from('summaries')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (existingSummary) {
      return {
        sessionId,
        summary: {
          tldr: existingSummary.tldr,
          key_points: existingSummary.key_decisions || [],
          action_items: existingSummary.action_items || [],
          outcomes: existingSummary.key_decisions || [],
          next_steps: existingSummary.follow_up_questions || [],
        },
        finalization: null,
        transcript: existingSummary.full_transcript || '',
        conversationType,
        conversationTitle,
        finalizedAt: sessionData.finalized_at,
        warning: 'Session was already finalized. Returning existing summary.'
      };
    }
  }

  sendProgress?.('Loading transcript data...', 2);

  // Get transcript data
  const { data: transcriptLines, error: transcriptError } = await authenticatedSupabase
    .from('transcripts')
    .select('*')
    .eq('session_id', sessionId)
    .order('sequence_number', { ascending: true });

  console.log('📝 Transcript data:', {
    sessionId,
    hasTranscripts: !!transcriptLines,
    transcriptCount: transcriptLines?.length || 0,
    transcriptError: transcriptError?.message
  });

  // Convert transcript lines to text format
  const transcriptText = transcriptLines && transcriptLines.length > 0 
    ? transcriptLines.map(line => {
        return `${line.speaker}: ${line.content}`;
      }).join('\n')
    : '';

  if (!transcriptText || transcriptText.trim().length === 0) {
    console.warn('⚠️ No transcript available for session:', sessionId);
    throw new Error('No transcript data available. Please ensure the conversation has been recorded and transcribed.');
  }

  // Calculate session statistics
  const totalWords = transcriptLines?.reduce((total, line) => {
    return total + (line.content?.split(' ').length || 0);
  }, 0) || 0;

  const sessionDuration = transcriptLines && transcriptLines.length > 0 
    ? Math.max(...transcriptLines.map(line => line.end_time_seconds || line.start_time_seconds || 0))
    : 0;

  // Create meeting context
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
    participantCount: 2,
    duration: sessionDuration
  };

  const promptConfig: SummaryPromptConfig = {
    includeEmailDraft: true,
    includeRiskAssessment: normalizedType === 'sales' || normalizedType === 'meeting',
    includeEffectivenessScore: true,
    includeNextMeetingTemplate: normalizedType === 'meeting' || normalizedType === 'sales'
  };
  
  // Generate summary with progress updates
  const summary = await generateFinalSummary(transcriptText, meetingContext, promptConfig, participantMe, participantThem, sendProgress);
  
  sendProgress?.('Generating coaching insights...', 8);
  const finalData = await generateFinalizationData(transcriptText, summary, meetingContext, participantMe, participantThem);

  sendProgress?.('Saving report to database...', 8);

  // Save to database
  const summaryInsertData = {
    session_id: sessionId,
    user_id: user.id,
    organization_id: sessionData.organization_id,
    title: conversationTitle || 'Conversation Summary',
    tldr: summary.tldr || 'Summary not available',
    key_decisions: summary.outcomes || summary.key_points || [],
    action_items: summary.action_items || [],
    follow_up_questions: summary.next_steps || [],
    conversation_highlights: [
      ...summary.key_points || [],
      ...(summary.insights?.map((i: any) => {
        if (typeof i === 'string') return i;
        return i.observation || JSON.stringify(i);
      }) || []),
      ...(summary.quotable_quotes?.map((q: QuotableQuote) => `"${q.quote}" - ${q.speaker}`) || [])
    ],
    full_transcript: transcriptText,
    structured_notes: JSON.stringify({
      insights: summary.insights || [],
      missed_opportunities: summary.missed_opportunities || [],
      successful_moments: summary.successful_moments || [],
      conversation_dynamics: summary.conversation_dynamics || {},
      effectiveness_metrics: summary.effectiveness_metrics || {},
      agenda_coverage: summary.agenda_coverage || {},
      coaching_recommendations: summary.coaching_recommendations || [],
      participants: summary.participants || [],
      conversation_flow: summary.conversation_flow || {},
      important_numbers: summary.important_numbers || [],
      quotable_quotes: summary.quotable_quotes || [],
      metadata: summary.metadata || {},
      performance_analysis: finalData?.performance_analysis || {},
      conversation_patterns: finalData?.conversation_patterns || {},
      key_techniques_used: finalData?.key_techniques_used || [],
      follow_up_strategy: finalData?.follow_up_strategy || {},
      success_indicators: finalData?.success_indicators || [],
      risk_factors: finalData?.risk_factors || [],
      email_draft: summary.email_draft,
      risk_assessment: summary.risk_assessment,
      effectiveness_score: summary.effectiveness_score,
      next_meeting_template: summary.next_meeting_template,
      templates: finalData?.templates
    }),
    generation_status: 'completed',
    model_used: await getAIModelForAction(AIAction.SUMMARY)
  };

  // First check if a summary already exists
  const { data: existingSummary } = await authenticatedSupabase
    .from('summaries')
    .select('id')
    .eq('session_id', sessionId)
    .single();

  let summaryResult;
  if (existingSummary) {
    // Update existing summary
    summaryResult = await authenticatedSupabase
      .from('summaries')
      .update(summaryInsertData)
      .eq('id', existingSummary.id);
  } else {
    // Insert new summary
    summaryResult = await authenticatedSupabase
      .from('summaries')
      .insert(summaryInsertData);
  }

  if (summaryResult.error) {
    console.error('❌ Failed to save summary:', summaryResult.error);
  }

  // Update session status
  await authenticatedSupabase
    .from('sessions')
    .update({ 
      status: 'completed',
      finalized_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  sendProgress?.('Report generation complete!', 8, 8);

  // Return final result
  const result = {
    sessionId,
    summary,
    finalization: finalData,
    transcript: transcriptText,
    conversationType,
    conversationTitle,
    finalizedAt: new Date().toISOString()
  };

  if (controller && encoder) {
    // Send final result for SSE
    const finalMessage = `data: ${JSON.stringify({ complete: true, result })}\n\n`;
    controller.enqueue(encoder.encode(finalMessage));
  }

  return result;
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

async function generateFinalSummary(
  transcript: string, 
  context: MeetingContext, 
  config: SummaryPromptConfig, 
  participantMe?: string, 
  participantThem?: string,
  sendProgress?: (step: string, progress: number, total?: number) => void
): Promise<EnhancedSummary> {
  console.log('🔄 Starting modular summary generation...');
  
  // Use modular approach to avoid truncation
  const useModularApproach = true;
  
  if (useModularApproach) {
    return generateModularSummary(transcript, context, config, sendProgress);
  }
  
  // Fallback to original approach
  const promptContent = generateEnhancedSummaryPromptV2(transcript, context, config);

  const model = await getAIModelForAction(AIAction.SUMMARY);
  console.log('🤖 Using AI model for summary:', model);
  console.log('🔑 OpenRouter API key present:', !!openrouterApiKey);
  console.log('📊 Prompt content length:', promptContent.length);
  
  // Only use response_format for OpenAI models
  const requestBody: any = {
    model,
    messages: [
      {
        role: 'system',
        content: 'You are an expert at analyzing conversations and creating detailed summaries. Always return valid JSON without any markdown formatting.'
      },
      {
        role: 'user',
        content: promptContent
      }
    ],
    temperature: 0.3,
    max_tokens: 6000
  };
  
  // Add response_format only for OpenAI models that support it
  if (model.includes('openai/')) {
    requestBody.response_format = { type: 'json_object' };
  }

  console.log('🚀 Calling OpenRouter API with model:', model);
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://liveconvo.app',
      'X-Title': 'liveprompt.ai Session Summary',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    let errorText = '';
    let errorData: any = null;
    try {
      errorText = await response.text();
      errorData = JSON.parse(errorText);
    } catch (e) {
      errorData = { message: errorText };
    }
    
    console.error('❌ OpenRouter API error:', {
      status: response.status,
      statusText: response.statusText,
      errorData,
      errorText: errorText.substring(0, 500)
    });
    
    // Check for common errors
    if (response.status === 401) {
      throw new Error('OpenRouter API authentication failed. Please check your API key.');
    } else if (response.status === 429) {
      throw new Error('OpenRouter API rate limit exceeded. Please try again later.');
    } else if (response.status === 400 && errorData?.error?.message?.includes('credit')) {
      throw new Error('OpenRouter API credits exhausted. Please add credits to your account.');
    }
    
    throw new Error(`OpenRouter API error: ${response.status} - ${errorData?.error?.message || errorData?.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('🤖 AI response received:', {
    hasChoices: !!data.choices,
    choicesLength: data.choices?.length,
    messageContent: data.choices?.[0]?.message?.content?.substring(0, 200) + '...'
  });

  try {
    let rawContent = data.choices[0].message.content;
    console.log('📄 Raw AI response (first 500 chars):', rawContent?.substring(0, 500));
    console.log('📄 Raw AI response length:', rawContent?.length);
    
    // Strip markdown code blocks if present
    if (rawContent.includes('```')) {
      // Remove any markdown code blocks (```json or just ```)
      rawContent = rawContent.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '');
      console.log('🔧 Stripped markdown code blocks from response');
    }
    
    // Trim any whitespace
    rawContent = rawContent.trim();
    
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
    console.log('✅ Successfully parsed AI response JSON');
    return result;
  } catch (parseError) {
    console.error('❌ Failed to parse AI response JSON:', parseError);
    console.error('🔍 Raw content that failed to parse:', data.choices[0].message.content);
    
    // Return a fallback summary structure
    return {
      tldr: 'Summary generation encountered a formatting issue. The conversation was analyzed but the detailed breakdown is not available.',
      key_points: ['Conversation completed', 'Analysis in progress'],
      action_items: [],
      outcomes: [],
      next_steps: [],
      insights: [],
      missed_opportunities: [],
      successful_moments: [],
      conversation_dynamics: {
        rapport_level: 'neutral',
        engagement_quality: 'medium',
        dominant_speaker: 'balanced',
        pace: 'moderate',
        tone: 'mixed'
      },
      effectiveness_metrics: {
        objective_achievement: 0,
        communication_clarity: 0,
        participant_satisfaction: 0,
        overall_success: 0
      },
      agenda_coverage: {
        items_covered: [],
        items_missed: [],
        unexpected_topics: []
      },
      coaching_recommendations: []
    };
  }
}

async function generateFinalizationData(transcript: string, summary: EnhancedSummary, context: MeetingContext, participantMe?: string, participantThem?: string): Promise<FinalizationData | null> {
  const dateContext = getCurrentDateContext();
  const participants = participantMe && participantThem 
    ? `Participants: ${participantMe} (me) and ${participantThem} (them)\n`
    : '';
    
  // Updated prompt with coaching analysis focus
  const promptContent = generateCoachingPrompt(transcript, summary, context);

  const model2 = await getAIModelForAction(AIAction.SUMMARY);
  console.log('🤖 Using AI model for finalization/coaching:', model2);
  
  const requestBody2: any = {
    model: model2,
    messages: [
      {
        role: 'system',
        content: 'You are an expert conversation coach. Analyze the conversation to provide actionable coaching feedback and improvements.'
      },
      {
        role: 'user',
        content: promptContent
      }
    ],
    temperature: 0.4,
    max_tokens: 6000
  };
  
  // Add response_format only for OpenAI models that support it
  if (model2.includes('openai/')) {
    requestBody2.response_format = { type: 'json_object' };
  }
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://liveconvo.app',
      'X-Title': 'liveprompt.ai Conversation Analysis',
    },
    body: JSON.stringify(requestBody2)
  });

  if (!response.ok) {
    let errorText = '';
    let errorData: any = null;
    try {
      errorText = await response.text();
      errorData = JSON.parse(errorText);
    } catch (e) {
      errorData = { message: errorText };
    }
    
    console.error('❌ OpenRouter API error (finalization):', {
      status: response.status,
      statusText: response.statusText,
      errorData
    });
    
    throw new Error(`OpenRouter API error: ${response.status} - ${errorData?.error?.message || errorData?.message || response.statusText}`);
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
    
    // Strip markdown code blocks if present
    if (rawContent.includes('```')) {
      // Remove any markdown code blocks (```json or just ```)
      rawContent = rawContent.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '');
      console.log('🔧 Stripped markdown code blocks from finalization response');
    }
    
    // Trim any whitespace
    rawContent = rawContent.trim();
    
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

// Modular summary generation functions
async function generateModularSummary(
  transcript: string, 
  context: MeetingContext, 
  config: SummaryPromptConfig,
  sendProgress?: (step: string, progress: number, total?: number) => void
): Promise<EnhancedSummary> {
  const model = await getAIModelForAction(AIAction.SUMMARY);
  const results: any = {};
  
  try {
    // Step 1: Executive Summary (lightweight)
    console.log('📝 Generating executive summary...');
    sendProgress?.('Generating executive summary...', 1);
    const execPrompt = generateExecutiveSummaryPrompt(transcript, context);
    const execResponse = await callOpenRouter(execPrompt, model, 2000);
    results.executive = parseAIResponse(execResponse, 'executive summary');
    
    // Step 2: Participant Analysis
    console.log('👥 Analyzing participants...');
    sendProgress?.('Analyzing participants and contributions...', 2);
    const participantPrompt = generateParticipantAnalysisPrompt(transcript, context);
    const participantResponse = await callOpenRouter(participantPrompt, model, 2000);
    results.participants = parseAIResponse(participantResponse, 'participants');
    
    // Step 3: Decisions and Actions
    console.log('📋 Extracting decisions and actions...');
    sendProgress?.('Extracting key decisions and action items...', 3);
    const decisionsPrompt = generateDecisionsAndActionsPrompt(transcript, context);
    const decisionsResponse = await callOpenRouter(decisionsPrompt, model, 3000);
    results.decisions = parseAIResponse(decisionsResponse, 'decisions');
    
    // If decisions parsing failed, provide defaults
    if (!results.decisions || Object.keys(results.decisions).length === 0) {
      results.decisions = {
        keyDecisions: [],
        actionItems: [],
        followUpQuestions: []
      };
    }
    
    // Step 4: Insights and Metrics
    console.log('💡 Generating insights...');
    sendProgress?.('Generating insights and identifying key metrics...', 4);
    const insightsPrompt = generateInsightsAndMetricsPrompt(transcript, context);
    const insightsResponse = await callOpenRouter(insightsPrompt, model, 3000);
    results.insights = parseAIResponse(insightsResponse, 'insights');
    
    // Step 5: Effectiveness Score
    console.log('📊 Calculating effectiveness...');
    sendProgress?.('Calculating effectiveness and performance metrics...', 5);
    const keyDecisions = results.decisions?.keyDecisions?.length || 0;
    const actionItems = results.decisions?.actionItems?.length || 0;
    const effectivenessPrompt = generateEffectivenessScorePrompt(transcript, context, keyDecisions, actionItems);
    const effectivenessResponse = await callOpenRouter(effectivenessPrompt, model, 2000);
    results.effectiveness = parseAIResponse(effectivenessResponse, 'effectiveness');
    
    // Step 6: Risk Assessment (if applicable)
    if (config.includeRiskAssessment && (context.type === 'sales' || context.type === 'meeting')) {
      console.log('⚠️ Assessing risks...');
      sendProgress?.('Assessing risks and opportunities...', 6);
      const riskPrompt = generateRiskAssessmentPrompt(transcript, context);
      if (riskPrompt) {
        const riskResponse = await callOpenRouter(riskPrompt, model, 2000);
        results.risks = parseAIResponse(riskResponse, 'risks');
      }
    }
    
    // Step 7: Follow-up Content
    if (config.includeEmailDraft || config.includeNextMeetingTemplate) {
      console.log('📧 Generating follow-up content...');
      sendProgress?.('Creating follow-up email draft and next steps...', 7);
      const followUpPrompt = generateFollowUpContentPrompt(
        transcript, 
        context,
        results.decisions?.keyDecisions || [],
        results.decisions?.actionItems || []
      );
      const followUpResponse = await callOpenRouter(followUpPrompt, model, 2000);
      results.followUp = parseAIResponse(followUpResponse, 'follow-up');
    }
    
    // Combine all results
    console.log('🔗 Combining modular results...');
    sendProgress?.('Finalizing report...', 7);
    return combineModularResults(results);
    
  } catch (error) {
    console.error('❌ Error in modular summary generation:', error);
    // Return a minimal summary on error
    return {
      tldr: 'Summary generation encountered an error. Please try again.',
      key_points: ['Error occurred during processing'],
      action_items: [],
      outcomes: [],
      next_steps: [],
      insights: [],
      missed_opportunities: [],
      successful_moments: [],
      conversation_dynamics: {
        rapport_level: 'neutral',
        engagement_quality: 'medium',
        dominant_speaker: 'balanced',
        pace: 'moderate',
        tone: 'mixed'
      },
      effectiveness_metrics: {
        objective_achievement: 0,
        communication_clarity: 0,
        participant_satisfaction: 0,
        overall_success: 0
      },
      coaching_recommendations: []
    };
  }
}

async function callOpenRouter(prompt: string, model: string, maxTokens: number = 3000): Promise<any> {
  const requestBody: any = {
    model,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: maxTokens
  };
  
  // Add response_format only for OpenAI models that support it
  if (model.includes('openai/')) {
    requestBody.response_format = { type: 'json_object' };
  }
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://liveconvo.app',
      'X-Title': 'liveprompt.ai Session Summary',
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    let errorText = '';
    let errorData: any = null;
    try {
      errorText = await response.text();
      errorData = JSON.parse(errorText);
    } catch (e) {
      errorData = { message: errorText };
    }
    
    console.error('❌ OpenRouter API error (modular):', {
      status: response.status,
      errorData,
      model
    });
    
    throw new Error(`OpenRouter API error: ${response.status} - ${errorData?.error?.message || errorData?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

function parseAIResponse(content: string, section: string): Record<string, any> {
  try {
    // Strip markdown code blocks if present
    let cleanContent = content;
    if (content.includes('```')) {
      cleanContent = content.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '');
    }
    cleanContent = cleanContent.trim();
    
    // Check if the response is not JSON (AI sometimes returns plain text for errors)
    if (!cleanContent.startsWith('{') && !cleanContent.startsWith('[')) {
      console.warn(`⚠️ Non-JSON response for ${section}:`, cleanContent.substring(0, 200));
      // Return empty object for sections that couldn't be parsed
      return {};
    }
    
    const parsed = JSON.parse(cleanContent);
    console.log(`✅ Successfully parsed ${section} response`);
    return parsed;
  } catch (error) {
    console.error(`❌ Failed to parse ${section} response:`, error);
    console.error('Raw content:', content.substring(0, 500));
    return {};
  }
}