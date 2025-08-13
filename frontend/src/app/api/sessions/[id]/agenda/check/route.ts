import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import { getCurrentDateContext } from '@/lib/utils';

const requestSchema = z.object({
  newTranscript: z.array(z.object({
    id: z.string().optional(),
    speaker: z.string().optional(),
    text: z.string().optional(),
    content: z.string().optional(),
    displayName: z.string().optional(),
    isOwner: z.boolean().optional(),
    timestamp: z.string().optional(),
    timeSeconds: z.number().optional(),
  })),
  summary: z.object({
    tldr: z.string().optional(),
    keyPoints: z.array(z.string()).optional(),
    decisions: z.array(z.string()).optional(),
    topics: z.array(z.string()).optional(),
  }).optional(),
  participantMe: z.string().optional(),
  participantThem: z.string().optional(),
  conversationType: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const { newTranscript, summary, participantMe = 'You', participantThem = 'Them', conversationType = 'meeting' } = parsed.data;
    if (!Array.isArray(newTranscript) || newTranscript.length === 0) {
      return NextResponse.json({ agendaUpdates: [] });
    }

    // Verify access to session
    const authClient = createAuthenticatedSupabaseClient(token);
    const { data: session, error: sessionError } = await authClient
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load open/in_progress agenda items (limit for efficiency)
    let agendaItems: Array<{ id: string; title: string; status: string }> = [];
    const { data: agendaRows } = await authClient
      .from('agenda_items')
      .select('id, title, status')
      .eq('session_id', sessionId)
      .in('status', ['open', 'in_progress'])
      .order('order_index', { ascending: true })
      .limit(12);
    if (Array.isArray(agendaRows)) agendaItems = agendaRows as any;

    if (agendaItems.length === 0) {
      return NextResponse.json({ agendaUpdates: [] });
    }

    // Prepare compact transcript delta text
    const deltaText = newTranscript
      .filter(m => m && (m.text || m.content))
      .map(m => `${m.displayName || m.speaker || participantThem}: ${(m.text || m.content || '').trim()}`)
      .join('\n');
    if (!deltaText) return NextResponse.json({ agendaUpdates: [] });

    const model = await getAIModelForAction(AIAction.REALTIME_SUMMARY);

    const systemPrompt = `You are Nova, an efficient meeting assistant. Your task is ONLY to assess agenda completion using a small delta of recent transcript lines plus a brief context summary.

${getCurrentDateContext()}

Rules:
- Be conservative: mark an agenda item as done only if it was clearly covered/decided/finished in the delta.
- If an item is mentioned but not fully covered, mark in_progress.
- If nothing relevant occurred, return an empty list.
- Output JSON only.

Output JSON schema:
{
  "agendaUpdates": [
    { "id": "<agenda_item_id>", "status": "in_progress" | "done", "confidence": 0-100, "evidence": { "quotes": ["<= 120 chars"], "timestamps": [] } }
  ]
}`;

    const userPrompt = `Session type: ${conversationType}
Participants: ${participantMe} and ${participantThem}

Open agenda items (id | title | status):\n${agendaItems.map(a => `- ${a.id} | ${a.title} | ${a.status}`).join('\n')}

${summary ? `Brief summary context (may be partial):\n- TLDR: ${summary.tldr || ''}\n- Key: ${(summary.keyPoints || []).slice(0,5).join(' | ')}\n- Decisions: ${(summary.decisions || []).slice(0,5).join(' | ')}` : ''}

Recent transcript delta (${newTranscript.length} messages):\n${deltaText}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing OpenRouter key' }, { status: 500 });

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app',
        'X-Title': 'liveconvo-agenda-check'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: 'AI service error', providerStatus: resp.status, providerBody: errText }, { status: resp.status });
    }

    const providerJson = await resp.json();
    const content = providerJson?.choices?.[0]?.message?.content?.trim();
    if (!content) return NextResponse.json({ agendaUpdates: [] });

    let parsed: { agendaUpdates?: Array<{ id: string; status: 'in_progress' | 'done'; confidence?: number; evidence?: any }> } = {};
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return NextResponse.json({ agendaUpdates: [] });
    }

    const updates = (parsed.agendaUpdates || [])
      .filter(u => u && typeof u.id === 'string' && (u.status === 'in_progress' || u.status === 'done'))
      .slice(0, 12);

    // Persist updates
    if (updates.length > 0) {
      const allowed = new Set(['in_progress', 'done']);
      const existing = new Set(agendaItems.map(a => a.id));
      for (const upd of updates) {
        if (!existing.has(upd.id) || !allowed.has(upd.status)) continue;
        await authClient
          .from('agenda_items')
          .update({ status: upd.status, evidence: upd.evidence || null, updated_at: new Date().toISOString() })
          .eq('id', upd.id);
      }
    }

    return NextResponse.json({ agendaUpdates: updates });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



