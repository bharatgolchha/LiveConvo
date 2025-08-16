import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = createAuthenticatedSupabaseClient(token);
    const { data, error } = await supabase
      .from('session_context')
      .select('context_metadata')
      .eq('session_id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    const response_style = (data as any)?.context_metadata?.response_style || 'concise';
    return NextResponse.json({ response_style });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const style = body?.response_style as 'concise' | 'detailed' | 'conversational' | undefined;
    if (!style || !['concise','detailed','conversational'].includes(style)) {
      return NextResponse.json({ error: 'Invalid response_style' }, { status: 400 });
    }
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = createAuthenticatedSupabaseClient(token);
    // Load session owner/org for required columns
    const { data: sessionRow, error: sessErr } = await supabase
      .from('sessions')
      .select('user_id, organization_id')
      .eq('id', id)
      .single();
    if (sessErr || !sessionRow) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const user_id = (sessionRow as any).user_id;
    const organization_id = (sessionRow as any).organization_id;

    // Upsert into session_context (requires user_id and organization_id)
    const { data: existing } = await supabase
      .from('session_context')
      .select('id, context_metadata')
      .eq('session_id', id)
      .single();
    const newMetadata = {
      ...(existing?.context_metadata || {}),
      response_style: style,
    };
    const payload = {
      session_id: id,
      user_id,
      organization_id,
      context_metadata: newMetadata,
    } as any;
    const { error } = await supabase
      .from('session_context')
      .upsert(payload, { onConflict: 'session_id' });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}


