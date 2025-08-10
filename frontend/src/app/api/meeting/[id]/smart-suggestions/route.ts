import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentDateContext } from '@/lib/utils';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';

interface SuggestionItem {
  text: string;
  prompt: string;
  category: 'follow_up' | 'action_item' | 'insight' | 'question';
  priority: 'high' | 'medium' | 'low';
  impact?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
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

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this meeting
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, organization_id, user_id')
      .eq('id', meetingId)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if user owns this session
    if (sessionData.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { 
      transcript = '', 
      summary = null,
      meetingType = 'meeting',
      meetingTitle = '',
      context = '',
      aiInstructions = null,
      stage = 'discussion',
      participantMe = 'You',
      sessionOwner = null,
      documentContext = null
    } = await request.json();

    console.log('🔄 Generating smart suggestions for:', {
      meetingId,
      transcriptLength: transcript.length,
      isRecentTranscript: transcript.includes('[Earlier conversation:'),
      stage,
      meetingType,
      hasSummary: !!summary,
      hasAiInstructions: !!aiInstructions,
      hasDocumentContext: !!documentContext,
      recentMessagesCount: transcript.split('\n').filter((line: string) => line.trim()).length
    });

    // Build context for AI
    // Note: 'transcript' already contains windowed recent messages from frontend (last 30 messages)
    const fullTranscript = transcript;
    const summaryContext = summary ? `
📊 REAL-TIME MEETING SUMMARY:
- TL;DR: ${summary.tldr || 'In progress'}
- Key Points: ${(summary.keyPoints || []).slice(0, 5).join('; ')}
- Action Items: ${(summary.actionItems || []).slice(0, 5).join('; ')}
- Decisions Made: ${(summary.decisions || []).slice(0, 3).join('; ')}
- Open Questions: ${(summary.questions || []).slice(0, 3).join('; ')}
` : '';

    // Build session owner context
    let sessionOwnerContext = '';
    if (sessionOwner) {
      sessionOwnerContext = `\n🔐 SESSION OWNER (Primary User):\n`;
      sessionOwnerContext += `- Name: ${sessionOwner.fullName || sessionOwner.email}\n`;
      sessionOwnerContext += `- Email: ${sessionOwner.email}\n`;
      if (sessionOwner.personalContext) {
        sessionOwnerContext += `- Personal Context: ${sessionOwner.personalContext}\n`;
      }
      sessionOwnerContext += `\nIMPORTANT: Generate suggestions specifically tailored for ${sessionOwner.fullName || sessionOwner.email}.\n`;
    }

    // Build document context
    let documentContextSection = '';
    if (documentContext) {
      documentContextSection = `\n📎 DOCUMENT CONTEXT:\n${documentContext}\n\nIMPORTANT: Consider the uploaded documents when generating suggestions. Reference specific data points, metrics, or information from the documents when relevant.\n`;
    }

    const systemPrompt = `You are Nova, an AI assistant that generates smart, immediately actionable suggestions for meeting participants.

${getCurrentDateContext()}
${sessionOwnerContext}${documentContextSection}
Meeting Context:
- Type: ${meetingType}
- Title: ${meetingTitle}
- Stage: ${stage}
- Context: ${context}
${aiInstructions ? `\n📋 MEETING AGENDA/OBJECTIVES:\n${aiInstructions}\n` : ''}

Primary participant (the person seeking advice): ${participantMe}

${summaryContext}

IMPORTANT CONTEXT: The transcript below contains the MOST RECENT messages from the conversation (last 30 messages). Your suggestions MUST be anchored in what's happening RIGHT NOW, with primary emphasis on the last 5–10 exchanges.

Recent Conversation:
${fullTranscript}

Generate EXACTLY 3 highly contextual suggestions for the next turn. Each suggestion must:
1. Reference specific topics, names, or points from the recent exchanges (last 5–10)
2. Be immediately actionable — either:
   • What to SAY next (a ready-to-send question/statement), or
   • What to DO next (a concrete action that moves the discussion forward)
3. Fit the current flow and momentum of the conversation (no generic advice)
4. Help the user navigate RIGHT NOW, not after the meeting
${aiInstructions ? '5. Align with the stated agenda/objectives when relevant' : ''}
${summary ? '6. Consider the real-time summary to identify gaps or follow-ups' : ''}

Prioritize:
- Unresolved questions or concerns from the last few exchanges
- Topics that were just introduced but not fully explored
- Opportunities to clarify or expand on recent points
- Natural next steps based on what was just discussed
${aiInstructions ? '- Progress toward meeting objectives stated in the agenda' : ''}
${summary ? '- Action items or decisions that need clarification' : ''}
${documentContext ? '- Insights or actions related to the uploaded documents' : ''}

Return ONLY a JSON array with this format (no surrounding text):
[
  {
    "text": "Short button label (max 32 chars, include an emoji)",
    "prompt": "Ready-to-send phrasing of what to say/do next, grounded in the last 5–10 messages",
    "category": "follow_up|action_item|question|insight",
    "priority": "high|medium|low",
    "impact": 85
  }
]

Categories:
- follow_up: Direct follow-up to something just mentioned
- action_item: Immediate next steps based on recent discussion
- insight: Analysis of current dynamics or recent exchanges
- question: Clarifying questions about points just raised

CRITICAL: Generic suggestions will be rejected. Every suggestion must clearly relate to specific content from the recent messages${documentContext ? ' or uploaded documents' : ''}.`;

const styleGuide = `\n\nSTYLE GUIDELINES:\n- Address ${participantMe} directly (first-person suggestions).\n- Be concrete and action-oriented; avoid meta-advice and filler.\n- ALWAYS reference specific details from the recent 5–10 messages.\n- Prefer short, vivid button labels for \"text\" (<= 32 chars; include an emoji).\n- \"prompt\" must be a single, ready-to-send sentence that fits the current flow.\n${documentContext ? '- When helpful, reference specific data from uploaded documents.\n' : ''}- Maintain the exact JSON array format with exactly 3 items.`;

    const finalPrompt = `${systemPrompt}${styleGuide}`;

    // Get the AI model for smart suggestions
    const defaultModel = await getAIModelForAction(AIAction.SMART_SUGGESTIONS);

    // Call OpenRouter API with the same model as chat guidance
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'LivePrompt.ai Smart Suggestions'
      },
      body: JSON.stringify({
        model: defaultModel,
        messages: [
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!openRouterResponse.ok) {
      console.error('OpenRouter API error:', openRouterResponse.status);
      return NextResponse.json(
        { error: 'Failed to generate suggestions' },
        { status: 500 }
      );
    }

    const openRouterData = await openRouterResponse.json();
    const aiResponse = openRouterData.choices[0]?.message?.content;

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    console.log('🤖 Raw AI response:', aiResponse);

    // Parse and validate suggestions
    let suggestions: SuggestionItem[] = [];
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      
      const parsedSuggestions = JSON.parse(jsonString);
      
      suggestions = parsedSuggestions
        .filter((item: any) => 
          item && 
          typeof item.text === 'string' && 
          typeof item.prompt === 'string' &&
          ['follow_up', 'action_item', 'insight', 'question'].includes(item.category) &&
          ['high', 'medium', 'low'].includes(item.priority)
        )
        .map((item: any) => ({
          text: item.text.substring(0, 80), // Limit text length (was 50)
          prompt: item.prompt.substring(0, 400), // Limit prompt length (was 200)
          category: item.category,
          priority: item.priority,
          impact: typeof item.impact === 'number' ? Math.min(100, Math.max(0, item.impact)) : 75
        }))
        .slice(0, 3); // Max 3 suggestions

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      
      // Fallback to stage-based suggestions if AI parsing fails
      suggestions = getFallbackSuggestions(stage, meetingType);
    }

    // If no suggestions, provide fallback
    if (suggestions.length === 0) {
      suggestions = getFallbackSuggestions(stage, meetingType).slice(0, 3);
    }

    console.log('✅ Generated suggestions:', suggestions);

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('Smart suggestions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getFallbackSuggestions(stage: string, meetingType: string): SuggestionItem[] {
  const fallbackMap: Record<string, Record<string, SuggestionItem[]>> = {
    sales: {
      opening: [
        { text: "🎯 Set clear agenda", prompt: "How should I structure this sales call for maximum impact?", category: "action_item", priority: "high", impact: 90 },
        { text: "🤝 Build rapport first", prompt: "What's the best way to build rapport with this prospect?", category: "follow_up", priority: "high", impact: 85 },
        { text: "📋 Qualify their needs", prompt: "What qualifying questions should I ask to understand their pain points?", category: "question", priority: "high", impact: 80 }
      ],
      discussion: [
        { text: "💡 Present solution fit", prompt: "How should I position our solution to address their specific needs?", category: "action_item", priority: "high", impact: 90 },
        { text: "🛡️ Address concerns", prompt: "How can I tactfully address their main objections?", category: "follow_up", priority: "high", impact: 85 },
        { text: "📊 Show ROI examples", prompt: "What success stories or ROI examples would resonate with them?", category: "insight", priority: "medium", impact: 80 }
      ],
      closing: [
        { text: "🎯 Close the deal", prompt: "What closing technique should I use based on their responses?", category: "action_item", priority: "high", impact: 95 },
        { text: "📅 Next steps", prompt: "How should I establish clear next steps and timeline?", category: "action_item", priority: "high", impact: 85 },
        { text: "📋 Follow-up plan", prompt: "What follow-up commitments should I make?", category: "follow_up", priority: "medium", impact: 75 }
      ]
    },
    meeting: {
      opening: [
        { text: "📋 Clarify objectives", prompt: "How can I ensure everyone understands our meeting goals?", category: "action_item", priority: "high", impact: 85 },
        { text: "⏰ Set time expectations", prompt: "How should I manage time effectively for this agenda?", category: "action_item", priority: "medium", impact: 75 },
        { text: "👥 Get everyone aligned", prompt: "What should I do to get all participants engaged?", category: "question", priority: "medium", impact: 70 }
      ],
      discussion: [
        { text: "🎯 Keep on track", prompt: "How do I bring the discussion back to our main objectives?", category: "action_item", priority: "high", impact: 80 },
        { text: "💭 Gather all input", prompt: "How can I ensure all voices are heard on this topic?", category: "question", priority: "medium", impact: 75 },
        { text: "⚖️ Facilitate decision", prompt: "How can I help the group reach a decision?", category: "action_item", priority: "high", impact: 85 }
      ],
      closing: [
        { text: "📋 Summarize actions", prompt: "What action items should I confirm with the group?", category: "action_item", priority: "high", impact: 90 },
        { text: "📅 Schedule follow-up", prompt: "What follow-up meetings or check-ins do we need?", category: "follow_up", priority: "medium", impact: 75 },
        { text: "📤 Next steps", prompt: "How should I distribute meeting notes and track progress?", category: "action_item", priority: "medium", impact: 70 }
      ]
    }
  };

  return fallbackMap[meetingType]?.[stage] || fallbackMap.meeting[stage] || fallbackMap.meeting.discussion;
} 