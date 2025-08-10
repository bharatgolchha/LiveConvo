import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import { getCurrentDateContext } from '@/lib/utils';
import { parsePromptSuggestions } from '@/lib/reports/promptSuggestions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();

    const {
      selectedTemplate,
      includeLinkedConversations = false,
      audience,
      tone,
      length
    } = body || {};

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!sessionId || !uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: `Invalid session ID format: ${sessionId}` },
        { status: 400 }
      );
    }

    // Auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token provided' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message || 'Unauthorized - Invalid authentication token' },
        { status: 401 }
      );
    }

    const db = createAuthenticatedSupabaseClient(token);

    // Fetch minimal session context
    const { data: sessionData, error: sessionError } = await db
      .from('sessions')
      .select(`
        id,
        title,
        created_at,
        participant_me,
        participant_them,
        recording_duration_seconds,
        summaries ( tldr, key_decisions, action_items )
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: sessionError?.message || 'Session not found' },
        { status: 404 }
      );
    }

    let linkedSummariesText = '';
    if (includeLinkedConversations) {
      const { data: linkedSessions } = await db
        .from('conversation_links')
        .select('linked_session_id, session_id')
        .or(`session_id.eq.${sessionId},linked_session_id.eq.${sessionId}`);

      if (linkedSessions && linkedSessions.length > 0) {
        const linkedSessionIds = [...new Set(linkedSessions.map(link => 
          link.session_id === sessionId ? link.linked_session_id : link.session_id
        ))];

        for (const linkedId of linkedSessionIds) {
          const { data: linked } = await db
            .from('sessions')
            .select('title, created_at, summaries ( tldr, key_decisions, action_items )')
            .eq('id', linkedId)
            .single();
          if (linked && linked.summaries?.length > 0) {
            const s = linked.summaries[0];
            linkedSummariesText += `\n- ${linked.title || 'Untitled'} (${new Date(linked.created_at).toLocaleDateString()}): ${s.tldr || ''}`;
          }
        }
      }
    }

    const context = `Meeting: ${sessionData.title || 'Untitled Meeting'}\nDate: ${sessionData.created_at}\nParticipants: ${sessionData.participant_me || 'Me'} & ${sessionData.participant_them || 'Them'}\nDuration: ${sessionData.recording_duration_seconds ? Math.round(sessionData.recording_duration_seconds / 60) + 'm' : 'Unknown'}\n\nSummary: ${sessionData.summaries?.[0]?.tldr || 'N/A'}\nKey Decisions: ${Array.isArray(sessionData.summaries?.[0]?.key_decisions) ? sessionData.summaries[0].key_decisions.join('; ') : 'N/A'}\nAction Items: ${Array.isArray(sessionData.summaries?.[0]?.action_items) ? sessionData.summaries[0].action_items.map((a: any) => (typeof a === 'string' ? a : a.description || a.action || a.task)).join('; ') : 'N/A'}\n${linkedSummariesText ? `\nLinked Conversations:${linkedSummariesText}` : ''}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    const model = await getAIModelForAction(AIAction.CUSTOM_REPORT);

    const guidance = [
      selectedTemplate ? `Target Template: ${selectedTemplate}` : null,
      audience ? `Audience: ${audience}` : null,
      tone ? `Tone: ${tone}` : null,
      length ? `Length: ${length}` : null,
    ].filter(Boolean).join('\n');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveprompt.ai',
        'X-Title': 'liveprompt.ai Prompt Suggestions'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating highly specific, actionable report prompts based on actual meeting content.

${getCurrentDateContext()}

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON with this exact structure: {"suggestions": ["prompt1", "prompt2", "prompt3", "prompt4"]}
2. Create 4 SPECIFIC prompts that reference the ACTUAL meeting content (participants, topics, decisions, action items)
3. Each prompt should be unique and serve a different purpose
4. Prompts must be actionable and include specific details from the meeting context
5. NO generic prompts - every prompt must reference specific meeting elements

Template Focus: ${selectedTemplate ? `Prioritize ${selectedTemplate} style reports` : 'Provide variety across different report types'}

Examples of GOOD specific prompts:
- "Generate a technical architecture report focusing on the database migration strategy discussed between [actual names], including the PostgreSQL to MongoDB transition timeline and the 3-phase rollout plan"
- "Create an executive summary for the board highlighting [specific person]'s proposal for the Q2 product roadmap, the $500K budget allocation, and the 3 key risks identified"
- "Produce a detailed action items report organizing the 7 tasks assigned to [actual team], with emphasis on the API integration deadline of [specific date] and dependencies on the infrastructure team"

Examples of BAD generic prompts to AVOID:
- "Generate an executive summary of the meeting"
- "Create a technical report"
- "List action items from the discussion"`
          },
          {
            role: 'user',
            content: `Meeting Details:
${context}

${guidance ? `User Preferences:\n${guidance}\n\n` : ''}${linkedSummariesText ? `Note: User wants to include linked conversations in the report\n\n` : ''}Create 4 highly specific report prompts that directly reference the people, topics, decisions, and action items from THIS meeting. Each prompt should tell the AI exactly what to focus on from the actual conversation.

Remember: Return ONLY the JSON object, no other text.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error (suggest-prompts):', response.status, errorText);
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';

    let suggestions: string[] = parsePromptSuggestions(content);
    
    // If parsing failed or we got too few suggestions, create context-specific fallbacks
    if (suggestions.length < 2) {
      console.warn('Failed to parse AI suggestions, using context-aware fallbacks');
      
      // Extract key details from the session for specific fallbacks
      const participants = `${sessionData.participant_me || 'the first participant'} and ${sessionData.participant_them || 'the second participant'}`;
      const meetingTitle = sessionData.title || 'this meeting';
      const duration = sessionData.recording_duration_seconds 
        ? `${Math.round(sessionData.recording_duration_seconds / 60)}-minute` 
        : '';
      const hasActionItems = sessionData.summaries?.[0]?.action_items?.length > 0;
      const hasDecisions = sessionData.summaries?.[0]?.key_decisions?.length > 0;
      
      // Build context-specific fallback prompts
      const fallbacks: string[] = [];
      
      if (selectedTemplate === 'executive') {
        fallbacks.push(
          `Generate an executive summary of the ${duration} discussion between ${participants} about ${meetingTitle}, highlighting the main outcomes and strategic implications for leadership`,
          `Create a high-level overview of ${meetingTitle} suitable for C-suite review, emphasizing business impact and required executive decisions`
        );
      } else if (selectedTemplate === 'technical') {
        fallbacks.push(
          `Produce a detailed technical analysis of the solutions discussed between ${participants} in ${meetingTitle}, including implementation approaches and technical trade-offs`,
          `Create a technical documentation report covering the architecture, tools, and methodologies discussed in the ${duration} meeting about ${meetingTitle}`
        );
      } else if (selectedTemplate === 'action_items') {
        fallbacks.push(
          `Generate a comprehensive action items report from the discussion between ${participants}, organizing tasks by priority, owner, and timeline`,
          `Create a task tracking document listing all commitments made during ${meetingTitle}, with clear ownership and dependencies mapped`
        );
      } else {
        // Generic but still context-aware fallbacks
        fallbacks.push(
          `Generate a comprehensive summary of the ${duration} discussion between ${participants} about ${meetingTitle}, focusing on key outcomes and next steps`,
          hasDecisions 
            ? `Create a decision log documenting all key decisions made during ${meetingTitle}, including rationale and implications`
            : `Produce a detailed analysis of the topics covered in ${meetingTitle}, highlighting important insights and recommendations`,
          hasActionItems
            ? `Generate an action-oriented report listing all tasks and commitments from the discussion between ${participants}, with clear timelines`
            : `Create a follow-up report for ${meetingTitle} outlining potential next steps and recommendations based on the discussion`,
          `Draft a ${audience ? audience + '-focused' : 'stakeholder'} update summarizing the progress and outcomes from ${meetingTitle}`
        );
      }
      
      // Add template-specific suggestions if provided
      if (includeLinkedConversations && linkedSummariesText) {
        fallbacks.push(
          `Create a comprehensive report connecting insights from ${meetingTitle} with the linked conversations, showing progression and patterns across meetings`
        );
      }
      
      suggestions = fallbacks.slice(0, 4);
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error in suggest-prompts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


