import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['open', 'in_progress', 'done', 'skipped']).optional(),
  order_index: z.number().int().nonnegative().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: sessionId, itemId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAuthenticatedSupabaseClient(token);

    // Verify item belongs to session and user has access
    const { data: item, error: itemErr } = await supabase
      .from('agenda_items')
      .select('id, session_id')
      .eq('id', itemId)
      .single();
    if (itemErr || !item || item.session_id !== sessionId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('agenda_items')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: sessionId, itemId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAuthenticatedSupabaseClient(token);

    // Verify item belongs to session and user has access via RLS
    const { data: item, error: itemErr } = await supabase
      .from('agenda_items')
      .select('id, session_id')
      .eq('id', itemId)
      .single();
    if (itemErr || !item || item.session_id !== sessionId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('agenda_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



