import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const openrouterApiKey = process.env.OPENROUTER_API_KEY;

interface FinalSummaryRequest {
  conversationType?: string;
  conversationTitle?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const { textContext, conversationType, conversationTitle } = await request.json();

    if (!openrouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to finalize session' },
        { status: 401 }
      );
    }

    // Verify session belongs to user and get organization_id
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id, organization_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (sessionError || !sessionData) {
      console.error('❌ Session query error:', sessionError);
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch transcript data from database
    const { data: transcriptLines, error: transcriptError } = await supabase
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

    // Convert transcript lines to text format
    const transcriptText = transcriptLines && transcriptLines.length > 0 
      ? transcriptLines.map(line => `${line.speaker}: ${line.content}`).join('\n')
      : '';

    if (!transcriptText || transcriptText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No transcript available for this session' },
        { status: 400 }
      );
    }

    console.log('🔍 Processing transcript:', {
      sessionId,
      transcriptLines: transcriptLines?.length || 0,
      transcriptLength: transcriptText.length,
      conversationType,
      conversationTitle
    });

    // Generate summary and finalization
    const summary = await generateFinalSummary(transcriptText, conversationType);
    const finalData = await generateFinalizationData(transcriptText, textContext, conversationType, summary);

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
        ...(summary.insights?.map((i: any) => i.observation) || []),
        ...(summary.successful_moments || [])
      ], // Combine all highlights
      full_transcript: transcriptText,
      structured_notes: JSON.stringify({
        insights: summary.insights || [],
        missed_opportunities: summary.missed_opportunities || [],
        successful_moments: summary.successful_moments || [],
        conversation_dynamics: summary.conversation_dynamics || {},
        effectiveness_metrics: summary.effectiveness_metrics || {},
        coaching_recommendations: summary.coaching_recommendations || [],
        performance_analysis: finalData?.performance_analysis || {},
        conversation_patterns: finalData?.conversation_patterns || {},
        key_techniques_used: finalData?.key_techniques_used || [],
        follow_up_strategy: finalData?.follow_up_strategy || {},
        success_indicators: finalData?.success_indicators || [],
        risk_factors: finalData?.risk_factors || []
      }), // Store enhanced data as structured notes
      generation_status: 'completed',
      model_used: 'google/gemini-2.5-flash-preview-05-20'
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

    const { data: summaryData, error: summaryError } = await supabase
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

    // Update session status to completed
    const { error: sessionUpdateError } = await supabase
      .from('sessions')
      .update({ 
        status: 'completed',
        finalized_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (sessionUpdateError) {
      console.error('❌ Failed to update session status:', sessionUpdateError);
    } else {
      console.log('✅ Session status updated to completed');
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
    console.error('Session finalization error:', error);
    return NextResponse.json(
      { error: 'Failed to finalize session' },
      { status: 500 }
    );
  }
}

async function generateFinalSummary(transcript: string, conversationType?: string) {
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

  const systemPrompt = `You are an expert conversation analyst specializing in ${conversationType || 'business'} conversations. 
Create a comprehensive, actionable summary that provides real value.

${conversationTypePrompt}

IMPORTANT: 
- Be SPECIFIC, not generic. Reference actual content from the transcript.
- Every point must be supported by evidence from the conversation.
- Focus on actionable insights that can improve future conversations.
- Identify missed opportunities or areas for improvement.
- Highlight successful techniques or positive moments.

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
      "owner": "Who is responsible (ME/THEM/Both)",
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
    "overall_success": 0-100
  },
  "coaching_recommendations": [
    "Specific advice for improving future conversations",
    "Skill to develop based on this conversation"
  ]
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://liveconvo.app',
      'X-Title': 'LiveConvo Session Summary',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-preview-05-20',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Analyze this ${conversationType || 'business'} conversation and provide specific, actionable insights:

${transcript}

Remember: Be specific, reference actual content, and provide value beyond generic observations.`
        }
      ],
      temperature: 0.3,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const summary = JSON.parse(data.choices[0].message.content);
  
  // Map the new structure to the expected database fields
  return {
    tldr: summary.tldr,
    key_points: summary.key_points || [],
    action_items: summary.action_items?.map((item: any) => 
      typeof item === 'string' ? item : `${item.task} (${item.owner}) - ${item.timeline}`
    ) || [],
    outcomes: summary.decisions_made?.map((d: any) => d.decision) || [],
    next_steps: summary.follow_up_questions || [],
    insights: summary.insights || [],
    missed_opportunities: summary.missed_opportunities || [],
    successful_moments: summary.successful_moments || [],
    conversation_dynamics: summary.conversation_dynamics || {},
    effectiveness_metrics: summary.effectiveness_metrics || {},
    coaching_recommendations: summary.coaching_recommendations || []
  };
}

async function generateFinalizationData(transcript: string, context: string, conversationType?: string, summary?: any) {
  const systemPrompt = `You are an expert conversation coach providing deep analysis and actionable recommendations.

Analyze the conversation for patterns, techniques, and opportunities.

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

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://liveconvo.app',
      'X-Title': 'LiveConvo Conversation Analysis',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-preview-05-20',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Provide deep performance analysis and coaching for this ${conversationType || 'business'} conversation.

Context provided: ${context || 'No additional context'}

Transcript:
${transcript}

Provide specific, evidence-based analysis with actionable recommendations.`
        }
      ],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
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