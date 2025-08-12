import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const supabase = createAuthenticatedSupabaseClient(token);

    // Person profile
    const { data: person, error: pErr } = await supabase
      .from('people')
      .select('id, full_name, primary_email, company, title, phone, avatar_url, linkedin_url, tags, notes, created_at, updated_at')
      .eq('id', id)
      .single();
    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 404 });
    }

    // Calendar stats
    const { data: stats } = await supabase
      .from('person_calendar_stats')
      .select('total_events, times_organizer, accepted_count, declined_count, tentative_count, needs_action_count, first_seen_at, last_seen_at')
      .eq('person_id', id)
      .maybeSingle();

    // Recent activity timeline
    const { data: activity } = await supabase
      .from('person_activity')
      .select('session_id, event_id, occurred_at, activity_type, details')
      .eq('person_id', id)
      .order('occurred_at', { ascending: false })
      .limit(50);

    // Recent meetings (denormalized for convenience)
    const { data: meetings } = await supabase
      .from('person_calendar_attendance')
      .select('session_id, event_id, start_time, end_time, event_title, is_organizer, response_status, meeting_url')
      .eq('person_id', id)
      .order('start_time', { ascending: false })
      .limit(20);

    return NextResponse.json({ person, stats, activity: activity || [], meetings: meetings || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    const body = await request.json().catch(() => ({}));

    const allowedFields = ['full_name', 'company', 'title', 'phone', 'avatar_url', 'linkedin_url', 'tags', 'notes'] as const;
    const updatePayload: Record<string, any> = {};
    for (const f of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, f)) {
        updatePayload[f] = body[f];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabase
      .from('people')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}


