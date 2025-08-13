import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import { getCurrentDateContext } from '@/lib/utils';

const requestSchema = z.object({
  transcript: z.array(z.object({
    id: z.string().optional(),
    speaker: z.string().optional(),
    text: z.string().optional(),
    content: z.string().optional(),
    displayName: z.string().optional(),
    isOwner: z.boolean().optional(),
    timestamp: z.string().optional(),
    timeSeconds: z.number().optional(),
  })),
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
    const bodyResult = requestSchema.safeParse(body);
    if (!bodyResult.success) {
      return NextResponse.json({ error: 'Invalid body', details: bodyResult.error.flatten() }, { status: 400 });
    }
    const { transcript, participantMe = 'You', participantThem = 'Them', conversationType = 'meeting' } = bodyResult.data;
    if (!Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json({ agendaUpdates: [] });
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();
    if (sessionErr || !session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Load agenda items (open/in_progress only)
    const { data: agendaRows } = await supabase
      .from('agenda_items')
      .select('id, title, status')
      .eq('session_id', sessionId)
      .in('status', ['open', 'in_progress'])
      .order('order_index', { ascending: true })
      .limit(24);
    const agendaItems: Array<{ id: string; title: string; status: string }> = Array.isArray(agendaRows) ? agendaRows as any : [];
    if (agendaItems.length === 0) return NextResponse.json({ agendaUpdates: [] });

    // Build full transcript text
    const transcriptText = transcript
      .filter((m) => m && (m.text || m.content))
      .map((m) => `${m.displayName || m.speaker || participantThem}: ${(m.text || m.content || '').trim()}`)
      .join('\n');
    if (!transcriptText) return NextResponse.json({ agendaUpdates: [] });

    const model = await getAIModelForAction(AIAction.REALTIME_SUMMARY);

    const systemPrompt = `You are Nova. Using the full transcript, assess which agenda items have been fully completed versus only discussed.

${getCurrentDateContext()}

Rules:
- Mark an item as done only if the transcript clearly shows it was covered to completion or a decision was reached.
- If merely discussed or partially addressed, mark in_progress.
- Be conservative. If uncertain, prefer in_progress.
- Return JSON only.

Output JSON:
{ "agendaUpdates": [ { "id": "<id>", "status": "in_progress" | "done", "confidence": 0-100, "evidence": { "quotes": ["<= 120 chars"], "timestamps": [] } } ] }`;

    const userPrompt = `Session type: ${conversationType}
Participants: ${participantMe} and ${participantThem}

Open agenda items (id | title | status):\n${agendaItems.map(a => `- ${a.id} | ${a.title} | ${a.status}`).join('\n')}

Full Transcript (${transcript.length} messages):\n${transcriptText}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing OpenRouter key' }, { status: 500 });

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://liveconvo.app',
        'X-Title': 'liveconvo-agenda-check-full'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1200,
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
      .slice(0, 24);

    if (updates.length > 0) {
      const allowed = new Set(['in_progress', 'done']);
      const existing = new Set(agendaItems.map(a => a.id));
      for (const upd of updates) {
        if (!existing.has(upd.id) || !allowed.has(upd.status)) continue;
        await supabase
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



