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
            content: `You are an expert at crafting concise, useful report generation prompts tailored to meeting data.\n${getCurrentDateContext()}\nReturn ONLY a JSON object with the shape: { \"suggestions\": string[] } with 3-4 high-quality prompts. Prompts should be specific, context-aware, and varied (e.g., executive summary, technical deep-dive, action items, stakeholder update). ${selectedTemplate ? 'Favor the target template.' : ''}`
          },
          {
            role: 'user',
            content: `Context:\n${context}\n\n${guidance ? `Preferences:\n${guidance}\n\n` : ''}Generate 4 distinct report prompts that a user can run to produce high-quality reports from this meeting.`
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
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
    if (suggestions.length === 0) {
      // Provide safe defaults
      suggestions = [
        'Generate an executive summary with key decisions, outcomes, and recommended next steps.',
        'Create a technical report detailing architecture, trade-offs, and implementation considerations discussed.',
        'Produce a prioritized action items report with owners, deadlines, and dependencies.',
        'Draft a stakeholder update summarizing progress, risks, and resource needs.'
      ];
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


