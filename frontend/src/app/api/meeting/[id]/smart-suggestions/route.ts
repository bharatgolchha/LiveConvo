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

    // Build system and user messages for better adherence
    const systemMessage = `You are Nova, an AI assistant that generates helpful, context-aware meeting advice. Your output should guide the user on what to consider, ask, or do next. Avoid writing first-person lines to say unless explicitly asked.

OUTPUT FORMAT RULES:
- Return ONLY a raw JSON array. No prose before or after. No markdown. No code fences/backticks.
- Exactly 3 items in the array. Keys must be: text, advice, category, priority, impact, why, whyType, evidence. Optional: examplePhrase.

QUALITY RULES:
- Every suggestion MUST be grounded in the last 5–10 messages.
- Include at least one concrete entity/term from the recent messages (e.g., a person, product, metric) when relevant.
- The "text" label is <= 24 chars and includes 1 emoji.
 - The "advice" is an elaboration (1–2 sentences, ~15–45 words) about what to consider, ask, or do next. It must be practical and specific, and MUST NOT be an exact first-person line to say.
- Mix of types across: speak_advice | action_step | strategy | question_to_consider | insight.
 - The "why" field is a concise ANALYSIS (one line) of why this is relevant NOW, using impact/outcome phrasing. Prefer stems like "This will …", "Doing this will …", or "Asking this will …". Do not quote verbatim lines. Explain the trigger using recent context:
  • unresolved question was asked
  • new topic/name/metric was introduced
  • agenda/summary/document item needs follow-up
  • decision/milestone is pending or blocked
  Keep it specific (<= 120 chars), reference the recent term/name/metric, avoid generic phrases.
- The "whyType" must be one of: unresolved_question | new_topic | metric_change | blocker | agenda_alignment | doc_reference | decision_pending.
- The "evidence" object must contain { msgIndex: "mNN", quote: "<= 90 chars" } citing a numbered recent line.
- You MAY include an optional "examplePhrase" that is a possible one-sentence wording the user could say if they ask for phrasing; keep it <= 140 chars.

GOOD VS BAD EXAMPLES (illustrative; not to be copied):
BAD (generic, ungrounded):
[
  {"text":"❓ Ask a question","advice":"Probe further","category":"question_to_consider","priority":"medium","impact":70,"why":"Too vague; no link to recent details","whyType":"new_topic","evidence":{"msgIndex":"m22","quote":"…"}}
]
GOOD (anchored to recent details, single-sentence prompts):
 [
  {"text":"⏱️ Confirm timeline","advice":"Clarify the beta timeline by asking for the specific Q3 date and who is accountable; this prevents planning drift.","category":"speak_advice","priority":"high","impact":90,"why":"This will close the loop on the Q3 beta date just mentioned","whyType":"unresolved_question","evidence":{"msgIndex":"m29","quote":"…Q3 for beta…"},"examplePhrase":"Can we confirm the Q3 rollout date you mentioned for the beta?"},
  {"text":"📊 ROI example","advice":"Relate your value narrative to the 15% churn figure using a similar customer case and a 3‑month outcome to make ROI concrete.","category":"insight","priority":"medium","impact":85,"why":"This will tie recommendations to the 15% churn raised moments ago","whyType":"metric_change","evidence":{"msgIndex":"m30","quote":"…15% churn…"},"examplePhrase":"Given the 15% churn you noted, may I share a 3‑month ROI case that matched that profile?"},
  {"text":"📅 Lock next step","advice":"Schedule a short security review with the named stakeholder this week; confirm agenda and artifacts to unblock the evaluation path.","category":"action_step","priority":"high","impact":92,"why":"Doing this will unblock progress on the security review","whyType":"blocker","evidence":{"msgIndex":"m28","quote":"…security review…"},"examplePhrase":"Shall we schedule a 30‑min review with Priya this week?"}
 ]`;

    // Number recent transcript lines so the model can cite m-indexes in evidence
    const numberedTranscript = fullTranscript
      .split('\n')
      .filter(Boolean)
      .map((line, idx) => `m${idx + 1}) ${line}`)
      .join('\n');

    const userMessage = `${getCurrentDateContext()}
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
${numberedTranscript}

 TASK: Generate EXACTLY 3 suggestions meeting the rules above. Types should be one of: speak_advice, action_step, strategy, question_to_consider, insight. Prioritize unresolved questions, newly introduced topics, and natural next steps. If an agenda exists, align at least one item to it. Ensure why and evidence are provided for each item.`;

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
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
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
          (typeof item.advice === 'string' || typeof item.prompt === 'string') &&
          // accept both legacy categories and new ones; normalize later if needed
          ['follow_up', 'action_item', 'insight', 'question', 'speak_advice', 'action_step', 'strategy', 'question_to_consider'].includes(item.category) &&
          ['high', 'medium', 'low'].includes(item.priority)
        )
        .map((item: any) => ({
          text: item.text.trim().substring(0, 40), // Allow longer label to avoid clipping
          // Store advice as primary; keep prompt for backward compatibility
          advice: typeof item.advice === 'string' ? item.advice.trim().replace(/\s+/g, ' ').substring(0, 280) : undefined,
          prompt: typeof item.prompt === 'string' ? item.prompt.trim().replace(/\s+/g, ' ').substring(0, 200) : undefined,
          category: item.category,
          priority: item.priority,
          impact: typeof item.impact === 'number' ? Math.min(100, Math.max(0, item.impact)) : 75,
          why: typeof item.why === 'string' ? item.why.trim().replace(/\s+/g, ' ').substring(0, 120) : undefined,
          whyType: typeof item.whyType === 'string' ? item.whyType : undefined,
          evidence: item.evidence && typeof item.evidence === 'object' ? {
            msgIndex: typeof item.evidence.msgIndex === 'string' ? item.evidence.msgIndex : undefined,
            quote: typeof item.evidence.quote === 'string' ? item.evidence.quote.trim().substring(0, 90) : undefined
          } : undefined,
          examplePhrase: typeof item.examplePhrase === 'string' ? item.examplePhrase.trim().substring(0, 140) : undefined
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