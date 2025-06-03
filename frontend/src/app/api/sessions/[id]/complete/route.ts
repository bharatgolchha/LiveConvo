import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedServerClient } from '@/lib/supabase-server';

const openrouterApiKey = process.env.OPENROUTER_API_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await request.json();
    const { summary } = body;

    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const supabase = await createAuthenticatedServerClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to complete session' },
        { status: 401 }
      );
    }

    // Verify session belongs to user and get organization_id
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id, organization_id, title, conversation_type, realtime_summary_cache')
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

    // Check if there's already a summary in the summaries table
    const { data: existingSummary, error: summaryCheckError } = await supabase
      .from('summaries')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (existingSummary) {
      console.log('✅ Summary already exists for session:', sessionId);
      return NextResponse.json({
        message: 'Session already has a summary',
        summaryId: existingSummary.id
      });
    }

    // Get the latest summary (from request body or realtime cache)
    let finalSummary = summary;
    
    if (!finalSummary && sessionData.realtime_summary_cache) {
      try {
        finalSummary = typeof sessionData.realtime_summary_cache === 'string' 
          ? JSON.parse(sessionData.realtime_summary_cache)
          : sessionData.realtime_summary_cache;
        console.log('📦 Using realtime summary cache');
      } catch (e) {
        console.error('Failed to parse realtime_summary_cache:', e);
      }
    }

    if (!finalSummary) {
      return NextResponse.json(
        { error: 'No summary available to save' },
        { status: 400 }
      );
    }

    // Fetch transcript to include in summary
    const { data: transcriptLines, error: transcriptError } = await supabase
      .from('transcripts')
      .select('content, speaker')
      .eq('session_id', sessionId)
      .order('start_time_seconds', { ascending: true });

    const transcriptText = transcriptLines && transcriptLines.length > 0 
      ? transcriptLines.map(line => `${line.speaker}: ${line.content}`).join('\n')
      : '';

    // Generate enhanced analysis if we have transcript
    let enhancedData = null;
    if (transcriptText && transcriptText.length > 100) {
      try {
        enhancedData = await generateQuickAnalysis(transcriptText, sessionData.conversation_type);
        console.log('🔍 Generated enhanced analysis for completion');
      } catch (error) {
        console.error('Failed to generate enhanced analysis:', error);
        // Continue without enhanced data
      }
    }

    // Save summary to summaries table
    const summaryInsertData = {
      session_id: sessionId,
      user_id: user.id,
      organization_id: sessionData.organization_id,
      title: sessionData.title || `${sessionData.conversation_type || 'Conversation'} Summary`,
      tldr: finalSummary.tldr || 'Summary not available',
      key_decisions: finalSummary.decisions || finalSummary.keyDecisions || [],
      action_items: finalSummary.actionItems || [],
      follow_up_questions: finalSummary.nextSteps || finalSummary.followUpQuestions || [],
      conversation_highlights: finalSummary.keyPoints || [],
      full_transcript: transcriptText,
      structured_notes: JSON.stringify({
        topics: finalSummary.topics || [],
        sentiment: finalSummary.sentiment || 'neutral',
        progressStatus: finalSummary.progressStatus || 'completed',
        suggestedChecklistItems: finalSummary.suggestedChecklistItems || [],
        // Include enhanced analysis data if available
        ...(enhancedData ? {
          performance_analysis: enhancedData.performance_analysis,
          conversation_dynamics: enhancedData.conversation_dynamics || finalSummary.conversationDynamics,
          effectiveness_metrics: enhancedData.effectiveness_metrics,
          insights: enhancedData.insights,
          missed_opportunities: enhancedData.missed_opportunities,
          successful_moments: enhancedData.successful_moments,
          coaching_recommendations: enhancedData.coaching_recommendations,
          conversation_patterns: enhancedData.conversation_patterns,
          key_techniques_used: enhancedData.key_techniques_used,
          follow_up_strategy: enhancedData.follow_up_strategy,
          success_indicators: enhancedData.success_indicators,
          risk_factors: enhancedData.risk_factors
        } : {})
      }),
      generation_status: 'completed',
      model_used: 'google/gemini-2.5-flash-preview-05-20'
    };

    console.log('💾 Saving summary to summaries table:', {
      session_id: summaryInsertData.session_id,
      user_id: summaryInsertData.user_id,
      organization_id: summaryInsertData.organization_id,
      tldr_length: summaryInsertData.tldr?.length || 0,
      key_decisions_count: Array.isArray(summaryInsertData.key_decisions) ? summaryInsertData.key_decisions.length : 0,
      action_items_count: Array.isArray(summaryInsertData.action_items) ? summaryInsertData.action_items.length : 0
    });

    const { data: savedSummary, error: summaryError } = await supabase
      .from('summaries')
      .insert(summaryInsertData)
      .select()
      .single();

    if (summaryError) {
      console.error('❌ Database error saving summary:', summaryError);
      return NextResponse.json(
        { error: 'Failed to save summary', details: summaryError.message },
        { status: 500 }
      );
    }

    console.log('✅ Summary successfully saved with ID:', savedSummary.id);

    // Update session status to completed
    const { error: sessionUpdateError } = await supabase
      .from('sessions')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (sessionUpdateError) {
      console.error('⚠️ Failed to update session status:', sessionUpdateError);
    }

    return NextResponse.json({
      message: 'Session completed and summary saved',
      summaryId: savedSummary.id,
      sessionId
    });

  } catch (error) {
    console.error('Session completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}

async function generateQuickAnalysis(transcript: string, conversationType?: string) {
  if (!openrouterApiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const systemPrompt = `You are an expert conversation coach providing quick performance analysis.
  
Analyze this ${conversationType || 'conversation'} and provide metrics and insights.

Return a JSON object with this structure:
{
  "performance_analysis": {
    "strengths": ["Specific strength with example"],
    "areas_for_improvement": ["Area needing work"],
    "communication_effectiveness": 0-100,
    "goal_achievement": 0-100,
    "listening_quality": 0-100,
    "question_effectiveness": 0-100
  },
  "effectiveness_metrics": {
    "objective_achievement": 0-100,
    "communication_clarity": 0-100,
    "participant_satisfaction": 0-100,
    "overall_success": 0-100
  },
  "conversation_dynamics": {
    "rapport_level": "excellent|good|neutral|poor",
    "engagement_quality": "high|medium|low",
    "dominant_speaker": "ME|THEM|balanced",
    "pace": "fast|moderate|slow",
    "tone": "formal|casual|mixed"
  },
  "insights": [
    {
      "observation": "Key insight",
      "evidence": "Supporting quote",
      "recommendation": "Action to take"
    }
  ],
  "coaching_recommendations": [
    "Specific actionable advice"
  ]
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://liveconvo.app',
      'X-Title': 'liveprompt.ai Quick Analysis',
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
          content: `Analyze this conversation and provide performance metrics:\n\n${transcript}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}