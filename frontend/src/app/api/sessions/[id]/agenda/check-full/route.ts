import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import { getCurrentDateContext } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const debug = new URL(request.url).searchParams.get('debug') === '1';
    const { id: sessionId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid body', details: parseResult.error.flatten() }, { status: 400 });
    }
    const { transcript, participantMe = 'You', participantThem = 'Them', conversationType = 'meeting' } = parseResult.data;
    if (!Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json({ agendaUpdates: [], ...(debug ? { debug: { reason: 'no_transcript' } } : {}) });
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
    const agendaItems: Array<{ id: string; title: string; status: string }> = Array.isArray(agendaRows) ? (agendaRows as any) : [];
    if (agendaItems.length === 0) return NextResponse.json({ agendaUpdates: [], ...(debug ? { debug: { reason: 'no_agenda_items' } } : {}) });

    // Build full transcript text
    const transcriptText = transcript
      .filter((m) => m && (m.text || m.content))
      .map((m) => `${m.displayName || m.speaker || participantThem}: ${(m.text || m.content || '').trim()}`)
      .join('\n');
    if (!transcriptText) return NextResponse.json({ agendaUpdates: [], ...(debug ? { debug: { reason: 'empty_transcript_text' } } : {}) });

    const model = await getAIModelForAction(AIAction.REALTIME_SUMMARY);
    if (debug) console.log('📥 AgendaCheckFull request:', {
      sessionId,
      transcriptMessages: transcript.length,
      agendaItemsCount: agendaItems.length,
      model
    });

    const systemPrompt = `You are Nova. Using the full transcript, assess agenda completion rigorously.

${getCurrentDateContext()}

Rules:
- For EACH agenda item provided, decide its current status.
- Mark an item as done only if the transcript clearly shows it was covered to completion or a decision was reached.
- If merely discussed or partially addressed, mark in_progress. If not mentioned, omit it from updates.
- Be conservative. If uncertain, prefer in_progress.
- Return JSON only.

Output JSON:
{ "agendaUpdates": [ { "id": "<id>", "status": "in_progress" | "done", "confidence": 0-100, "evidence": { "quotes": ["<= 120 chars"], "timestamps": [] } } ] }`;

    const userPrompt = `Session type: ${conversationType}
Participants: ${participantMe} and ${participantThem}

Open agenda items to evaluate (JSON):\n${JSON.stringify(agendaItems, null, 2)}

Task: For each agenda item above, check if the transcript indicates it is in progress or clearly completed. Only include items that are in_progress or done in agendaUpdates.

Full Transcript (${transcript.length} messages):\n${transcriptText}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // Heuristic fallback: basic keyword matching to avoid hard failure in local/dev
      const lowerText = transcriptText.toLowerCase();
      const updates = agendaItems
        .map((a) => {
          const title = (a.title || '').toLowerCase();
          if (!title || title.length < 3) return null;
          const occurrences = (lowerText.match(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
          if (occurrences >= 2) {
            return { id: a.id, status: 'done' as const, confidence: 60, evidence: { quotes: [], timestamps: [] } };
          }
          if (occurrences === 1) {
            return { id: a.id, status: 'in_progress' as const, confidence: 40, evidence: { quotes: [], timestamps: [] } };
          }
          return null;
        })
        .filter(Boolean) as Array<{ id: string; status: 'in_progress' | 'done'; confidence?: number; evidence?: any }>;

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
      return NextResponse.json({ agendaUpdates: updates, fallback: true, ...(debug ? { debug: { reason: 'no_api_key', agendaItemsCount: agendaItems.length, transcriptChars: transcriptText.length } } : {}) });
    }

    const debugPrompt = { systemPromptChars: systemPrompt.length, userPromptChars: userPrompt.length };
    if (debug) console.log('📤 AgendaCheckFull prompt sizes:', debugPrompt);

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
        max_tokens: 2500,
        response_format: { type: 'json_object' }
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      if (debug) console.error('❌ AgendaCheckFull provider error:', resp.status, errText);
      return NextResponse.json({ error: 'AI service error', providerStatus: resp.status, providerBody: errText }, { status: resp.status });
    }

    const providerJson = await resp.json();
    const content = providerJson?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      if (debug) console.warn('⚠️ AgendaCheckFull empty content from provider');
      return NextResponse.json({ agendaUpdates: [], ...(debug ? { debug: { reason: 'empty_provider_content', ...debugPrompt } } : {}) });
    }
    if (debug) console.log('📦 AgendaCheckFull raw content (truncated):', content.slice(0, 2000));

    let parsedAi: { agendaUpdates?: Array<{ id: string; status: 'in_progress' | 'done'; confidence?: number; evidence?: any }> } = {};
    const stripFences = (s: string) => s.replace(/^```(?:json)?\n?/i, '').replace(/```\s*$/i, '');
    const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
    parsedAi = tryParse(content) || tryParse(stripFences(content)) || {} as any;
    if (!parsedAi || typeof parsedAi !== 'object' || !Array.isArray(parsedAi.agendaUpdates)) {
      // Attempt to extract agendaUpdates array with bracket balancing
      const idx = content.indexOf('"agendaUpdates"');
      if (idx !== -1) {
        const arrStart = content.indexOf('[', idx);
        if (arrStart !== -1) {
          let depth = 0; let end = -1;
          for (let i = arrStart; i < content.length; i++) {
            const ch = content[i];
            if (ch === '[') depth++;
            else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
          }
          if (end !== -1) {
            const arrSlice = content.slice(arrStart, end + 1);
            const parsedArr = tryParse(arrSlice);
            if (Array.isArray(parsedArr)) {
              parsedAi = { agendaUpdates: parsedArr } as any;
            }
          }
        }
      }
    }
    if (!parsedAi || typeof parsedAi !== 'object' || !Array.isArray(parsedAi.agendaUpdates)) {
      // Last resort: regex extract objects with id/status pairs
      const matches = content.match(/\{[^}]*"id"\s*:\s*"([^"]+)"[^}]*"status"\s*:\s*"(in_progress|done)"[^}]*\}/g);
      if (matches) {
        const updates: Array<{ id: string; status: 'in_progress' | 'done' }> = [];
        for (const m of matches) {
          const id = (m.match(/"id"\s*:\s*"([^"]+)"/) || [])[1];
          const status = (m.match(/"status"\s*:\s*"(in_progress|done)"/) || [])[1] as 'in_progress' | 'done' | undefined;
          if (id && status) updates.push({ id, status });
        }
        parsedAi = { agendaUpdates: updates as any } as any;
        if (debug) console.warn('ℹ️ AgendaCheckFull used lenient extraction');
      } else {
        if (debug) console.warn('⚠️ AgendaCheckFull JSON parse failed');
        return NextResponse.json({ agendaUpdates: [], ...(debug ? { debug: { reason: 'json_parse_failed', ...debugPrompt, rawContentPreview: content.slice(0, 400) } } : {}) });
      }
    }

    const updates = (parsedAi.agendaUpdates || [])
      .filter(u => u && typeof u.id === 'string' && (u.status === 'in_progress' || u.status === 'done'))
      .slice(0, 24);
    if (debug) console.log('✅ AgendaCheckFull parsed updates:', updates.map(u => ({ id: u.id, status: u.status, confidence: u.confidence })));

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

    return NextResponse.json({ agendaUpdates: updates, ...(debug ? { debug: { ...debugPrompt, rawContentPreview: content.slice(0, 2000) } } : {}) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


