import { NextRequest, NextResponse } from 'next/server';
import type { RealtimeSummary, SuggestedChecklistItem, SummaryResponse } from '@/types/api';

const getContextSpecificGuidelines = (conversationType: string) => {
  switch (conversationType) {
    case 'sales':
      return `
SALES-SPECIFIC SUGGESTIONS:
- Follow-up calls and demos
- Proposal and contract preparation
- Client research and needs analysis
- Pricing and negotiation preparation
- CRM updates and pipeline management`;
    
    case 'meeting':
      return `
MEETING-SPECIFIC SUGGESTIONS:
- Action item assignments
- Follow-up meetings and check-ins
- Document sharing and preparation
- Decision implementation steps
- Meeting notes distribution`;
    
    case 'interview':
      return `
INTERVIEW-SPECIFIC SUGGESTIONS:
- Thank you note sending
- Reference checks and follow-ups
- Skills assessment and preparation
- Company research and culture fit
- Next round preparation`;
    
    default:
      return `
GENERAL SUGGESTIONS:
- Task follow-ups and assignments
- Information gathering and research
- Decision points and deadlines
- Communication and coordination
- Documentation and record keeping`;
  }
};

export async function POST(request: NextRequest) {
  try {
    const { transcript, sessionId, conversationType, includeLinked } = await request.json();

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to generate summaries' },
        { status: 401 }
      );
    }
    
    // Create authenticated client with user's token
    const { createClient } = await import('@supabase/supabase-js');
    const authClient = createClient(
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
    
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to generate summaries' },
        { status: 401 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    const transcriptText = Array.isArray(transcript) 
      ? transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')
      : transcript;

    // Fetch memory summaries for linked conversations if requested
    let linkedSummariesPrompt = '';
    if (includeLinked && sessionId) {
      try {
        // Create authenticated supabase client with token (already have above)
        const { data: links, error: linksError } = await authClient
          .from('conversation_links')
          .select('linked_session_id')
          .eq('session_id', sessionId);

        if (!linksError && links && links.length > 0) {
          const linkedIds = links.map((l: any) => l.linked_session_id);

          // Fetch latest summary for each linked session
          const { data: summaries, error: summariesError } = await authClient
            .from('summaries')
            .select('session_id, title, tldr, key_decisions, created_at')
            .in('session_id', linkedIds)
            .order('created_at', { ascending: false });

          if (!summariesError && summaries && summaries.length > 0) {
            // Keep only the latest summary per session
            const latestBySession = new Map<string, any>();
            summaries.forEach((s: any) => {
              if (!latestBySession.has(s.session_id)) {
                latestBySession.set(s.session_id, s);
              }
            });

            linkedSummariesPrompt = Array.from(latestBySession.values()).map((s: any, idx: number) => {
              const tldr = s.tldr || '';
              const keyPoints = Array.isArray(s.key_decisions) ? s.key_decisions.slice(0, 5).join('; ') : '';
              return `\n${idx + 1}. ${s.title || 'Untitled'}\nTL;DR: ${tldr}\nKey Points: ${keyPoints}`;
            }).join('\n');
          }
        }
      } catch (err) {
        console.error('Error fetching linked summaries:', err);
      }
    }

    const systemPrompt = `You are an expert conversation analyst. Analyze the conversation transcript and provide a comprehensive summary.

CONTEXT FROM PREVIOUS CONVERSATIONS (if any):${linkedSummariesPrompt || ' None'}

CRITICAL: You MUST respond with valid JSON using this EXACT structure. Do not include any text before or after the JSON.

{
  "tldr": "Brief 1-2 sentence summary of the conversation",
  "keyPoints": ["Specific point 1", "Specific point 2", "Specific point 3"],
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": ["Actionable item 1", "Actionable item 2"],
  "nextSteps": ["Next step 1", "Next step 2"],
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "sentiment": "positive|negative|neutral",
  "progressStatus": "just_started|building_momentum|making_progress|wrapping_up",
  "suggestedChecklistItems": [
    {
      "text": "Checklist item text",
      "priority": "high|medium|low",
      "type": "preparation|followup|research|decision|action",
      "relevance": 85
    }
  ]
}

FIELD REQUIREMENTS:
- tldr: Always include a meaningful summary, even for short conversations
- keyPoints: Extract 3-5 concrete points mentioned in the conversation
- decisions: Only include actual decisions made (can be empty array)
- actionItems: Specific tasks or follow-ups identified (can be empty array)
- nextSteps: Clear next actions to be taken (can be empty array)
- topics: Main subjects discussed (always include at least 1-2)
- sentiment: Choose the most appropriate overall tone
- progressStatus: Assess where the conversation stands

CHECKLIST RECOMMENDATIONS GUIDELINES:
- Generate 2-5 contextual checklist items based on conversation content
- Focus on actionable items that emerge naturally from the discussion
- Include both preparation items (for ongoing conversations) and follow-up items
- Prioritize items that are specific, achievable, and time-relevant
- Use relevance scores (0-100) to rank suggestions by importance
- Types: preparation, followup, research, decision, action
- Only suggest items that add value - avoid generic suggestions
- Consider conversation type (${conversationType}) for context-appropriate suggestions

EXAMPLES BY TYPE:
- preparation: "Review quarterly sales numbers before next meeting"
- followup: "Send meeting notes to all attendees" 
- research: "Research competitor pricing for Project X"
- decision: "Decide on final budget allocation by Friday"
- action: "Schedule follow-up call with client"

${getContextSpecificGuidelines(conversationType || 'general')}

Focus on extracting concrete, actionable information. Return only valid JSON.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app', // Optional: for app identification
        'X-Title': 'liveprompt.ai Summary', // Optional: for app identification
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
            content: `Please analyze this conversation transcript and provide a summary:\n\n${transcriptText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'The AI service is currently unavailable. Please try again later.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.debug('Summary model response received', {
      length: data.choices[0].message.content.length
    });
    
    let summaryData;
    try {
      summaryData = JSON.parse(data.choices[0].message.content);
      console.log('📊 Parsed Summary Data:', {
        hasTldr: !!summaryData.tldr,
        keyPointsCount: summaryData.keyPoints?.length || 0,
        decisionsCount: summaryData.decisions?.length || 0,
        actionItemsCount: summaryData.actionItems?.length || 0,
        sentiment: summaryData.sentiment,
        progressStatus: summaryData.progressStatus
      });
    } catch (parseError) {
      console.error('💥 JSON Parse Error for Summary:', parseError);
      // Fallback to a basic summary structure
      summaryData = {
        tldr: 'Summary generation encountered a formatting issue. Please try again.',
        keyPoints: ['Conversation analysis in progress'],
        decisions: [],
        actionItems: [],
        nextSteps: [],
        topics: ['General conversation'],
        sentiment: 'neutral',
        progressStatus: 'building_momentum'
      };
    }
    
    // Validate and ensure all required fields exist
    const validatedSummary: RealtimeSummary = {
      tldr: summaryData.tldr || 'No summary available',
      keyPoints: Array.isArray(summaryData.keyPoints) ? summaryData.keyPoints : [],
      decisions: Array.isArray(summaryData.decisions) ? summaryData.decisions : [],
      actionItems: Array.isArray(summaryData.actionItems) ? summaryData.actionItems : [],
      nextSteps: Array.isArray(summaryData.nextSteps) ? summaryData.nextSteps : [],
      topics: Array.isArray(summaryData.topics) ? summaryData.topics : ['General'],
      sentiment: ['positive', 'negative', 'neutral'].includes(summaryData.sentiment) ? summaryData.sentiment : 'neutral',
      progressStatus: ['just_started', 'building_momentum', 'making_progress', 'wrapping_up'].includes(summaryData.progressStatus) ? summaryData.progressStatus : 'building_momentum',
      suggestedChecklistItems: Array.isArray(summaryData.suggestedChecklistItems) ? summaryData.suggestedChecklistItems.filter((item: SuggestedChecklistItem) => 
        item && 
        typeof item.text === 'string' && 
        (['high', 'medium', 'low'] as const).includes(item.priority) &&
        (['preparation', 'followup', 'research', 'decision', 'action'] as const).includes(item.type) &&
        typeof item.relevance === 'number' && 
        item.relevance >= 0 && 
        item.relevance <= 100
      ) : []
    };
    
    // Return in the expected format for useRealtimeSummary hook
    const responseData: SummaryResponse = {
      summary: validatedSummary,
      generatedAt: new Date().toISOString(),
      sessionId
    };
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Summary API error:', error);
    return NextResponse.json(
      { error: 'Unable to generate summary. Please try again later.' },
      { status: 500 }
    );
  }
}
