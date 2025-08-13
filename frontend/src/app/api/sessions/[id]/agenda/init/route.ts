import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { getCurrentDateContext } from '@/lib/utils';
import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';

function parseAgendaToItems(raw: string): string[] {
  const lines = raw
    .split(/\r?\n|[•\-]\s+|\d+\.|\d+\)/g)
    .map(l => l.trim())
    .filter(l => l.length >= 3);

  const unique = Array.from(new Set(lines));
  return unique.slice(0, 50); // safety cap
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAuthenticatedSupabaseClient(token);

    // Fetch session details and context where agenda may be stored
    const { data: session } = await supabase
      .from('sessions')
      .select('id, title, conversation_type, participant_me, participant_them')
      .eq('id', sessionId)
      .single();
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: ctx } = await supabase
      .from('session_context')
      .select('text_context, context_metadata')
      .eq('session_id', sessionId)
      .single();

    // Fallback to meeting_metadata.meeting_agenda if present
    const { data: meta } = await supabase
      .from('meeting_metadata')
      .select('meeting_agenda')
      .eq('session_id', sessionId)
      .maybeSingle();

    const rawAgenda: string | null =
      (ctx?.context_metadata as any)?.meeting_agenda || ctx?.text_context || meta?.meeting_agenda || null;

    if (!rawAgenda || rawAgenda.trim().length < 3) {
      return NextResponse.json({ error: 'No agenda found in session context' }, { status: 400 });
    }

    // Check if items already exist
    const { data: existing } = await supabase
      .from('agenda_items')
      .select('id')
      .eq('session_id', sessionId)
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ message: 'Agenda already initialized' }, { status: 200 });
    }

    // Try AI-driven agenda generation first
    let aiItems: Array<{ title: string; description?: string }> = [];
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

      const model = await getAIModelForAction(AIAction.REALTIME_SUMMARY);

      const systemPrompt = `You are Nova, an expert meeting planner. Given a short agenda/context string, generate a clear, practical meeting agenda tailored to the session type. Be specific and comprehensive, but concise.

${getCurrentDateContext()}

Rules:
- Return JSON only.
- Each item should be a short, action-oriented title.
- Optionally include a one-line description when useful.
- Cover typical stages for the meeting type.
- Aim for 6–12 items; max 15.

Output JSON schema:
{ "items": [ { "title": "...", "description": "..." } ] }`;

      const userPrompt = `Session: ${session?.conversation_type || 'meeting'}\nTitle: ${session?.title || '(untitled)'}\nParticipants: ${session?.participant_me || 'You'} and ${session?.participant_them || 'Participant'}\n\nProvided agenda/context:\n${rawAgenda}`;

      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://liveconvo.app',
          'X-Title': 'liveconvo-agenda-init'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 700,
          response_format: { type: 'json_object' }
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed?.items)) {
            aiItems = parsed.items
              .filter((x: any) => x && typeof x.title === 'string' && x.title.trim().length > 0)
              .slice(0, 15)
              .map((x: any) => ({ title: x.title.trim(), description: typeof x.description === 'string' ? x.description.trim() : undefined }));
          }
        }
      }
    } catch (e) {
      console.warn('AI agenda generation failed, falling back to heuristics:', e);
    }

    // Fallback to heuristic parsing if AI failed or returned nothing
    if (!aiItems.length) {
      const titles = parseAgendaToItems(rawAgenda).slice(0, 12);
      aiItems = titles.map(t => ({ title: t }));
    }

    if (!aiItems.length) {
      return NextResponse.json({ error: 'Could not generate agenda items' }, { status: 400 });
    }

    // Idempotency without relying on DB constraints: fetch existing titles and only insert new ones
    const { data: existingRows, error: existingErr } = await supabase
      .from('agenda_items')
      .select('title, order_index')
      .eq('session_id', sessionId);

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    const existingTitles = new Set((existingRows || []).map((r: any) => String(r.title).trim().toLowerCase()));
    const startIndex = (existingRows || []).length;
    const toInsert = aiItems
      .filter(it => !existingTitles.has(it.title.trim().toLowerCase()))
      .map((it, i) => ({ session_id: sessionId, title: it.title, description: it.description || null, order_index: startIndex + i }));

    if (toInsert.length === 0) {
      return NextResponse.json({ message: 'Agenda already initialized' }, { status: 200 });
    }

    const { data: inserted, error } = await supabase
      .from('agenda_items')
      .insert(toInsert)
      .select('*')
      .order('order_index', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ items: inserted }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



