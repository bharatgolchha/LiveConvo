import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

/**
 * GET  /api/meeting/[id]/links
 * Returns all sessions that are linked to the current meeting.
 *
 * POST /api/meeting/[id]/links   { linkedIds: string[] }
 * Adds the provided sessions to the link table (duplicates ignored).
 *
 * DELETE /api/meeting/[id]/links { linkedIds: string[] }
 * Removes the provided sessions from the link table.
 */

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function getAuthClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return { error: NextResponse.json({ error: 'No authorization token provided' }, { status: 401 }) };
  }

  const supabase = createAuthenticatedSupabaseClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { supabase, user };
}

async function checkSessionAccess(supabase: any, sessionId: string) {
  // Select minimal field to ensure RLS allows access
  const { data, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// GET
// -----------------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, error } = await getAuthClient(req);
    if (error) return error;

    const { id: sessionId } = await params;
    if (!(await checkSessionAccess(supabase, sessionId))) {
      return NextResponse.json({ error: 'No access to session' }, { status: 403 });
    }

    const { data: links, error: linkErr } = await supabase
      .from('conversation_links')
      .select('linked_session_id, sessions!conversation_links_linked_session_id_fkey(id, title)')
      .eq('session_id', sessionId);

    if (linkErr) {
      console.error('Error fetching conversation links:', linkErr);
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
    }

    const linked = (links || []).map((row: any) => ({
      id: row.linked_session_id,
      title: row.sessions?.title || 'Untitled'
    }));

    return NextResponse.json(linked);
  } catch (err) {
    console.error('Links GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// POST  – add links
// -----------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, error } = await getAuthClient(req);
    if (error) return error;

    const { id: sessionId } = await params;
    if (!(await checkSessionAccess(supabase, sessionId))) {
      return NextResponse.json({ error: 'No access to session' }, { status: 403 });
    }

    const { linkedIds } = await req.json();
    if (!Array.isArray(linkedIds) || linkedIds.length === 0) {
      return NextResponse.json({ error: 'linkedIds must be a non-empty array' }, { status: 400 });
    }

    const rows = linkedIds.map((linkedId: string) => ({
      session_id: sessionId,
      linked_session_id: linkedId
    }));

    // Use upsert to ignore duplicates (requires unique constraint on session_id+linked_session_id)
    const { error: insertErr } = await supabase
      .from('conversation_links')
      .upsert(rows, { ignoreDuplicates: true });

    if (insertErr) {
      console.error('Error inserting links:', insertErr);
      return NextResponse.json({ error: 'Failed to add links' }, { status: 500 });
    }

    return GET(req, { params }); // return updated list
  } catch (err) {
    console.error('Links POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// DELETE – remove links
// -----------------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, error } = await getAuthClient(req);
    if (error) return error;

    const { id: sessionId } = await params;
    if (!(await checkSessionAccess(supabase, sessionId))) {
      return NextResponse.json({ error: 'No access to session' }, { status: 403 });
    }

    const { linkedIds } = await req.json();
    if (!Array.isArray(linkedIds) || linkedIds.length === 0) {
      return NextResponse.json({ error: 'linkedIds must be a non-empty array' }, { status: 400 });
    }

    const { error: delErr } = await supabase
      .from('conversation_links')
      .delete()
      .eq('session_id', sessionId)
      .in('linked_session_id', linkedIds);

    if (delErr) {
      console.error('Error deleting links:', delErr);
      return NextResponse.json({ error: 'Failed to delete links' }, { status: 500 });
    }

    return GET(req, { params });
  } catch (err) {
    console.error('Links DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 