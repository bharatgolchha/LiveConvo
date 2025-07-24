import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthenticatedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
 
    // -------------------------------------
    // Delete user-owned data
    // -------------------------------------
    const authed = createAuthenticatedSupabaseClient(token);

    // Fetch session IDs
    const { data: sessions, error: sessionFetchError } = await authed
      .from('sessions')
      .select('id')
      .eq('user_id', user.id);

    if (sessionFetchError) {
      console.error('Error loading sessions:', sessionFetchError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    const sessionIds = (sessions || []).map((s: any) => s.id);

    // Tables keyed by session_id
    const sessionLinkedTables = [
      'transcripts',
      'summaries',
      'guidance',
      'session_context',
      'report_comments',
      'report_activity',
      'smart_notes',
    ];

    for (const table of sessionLinkedTables) {
      const { error } = await authed.from(table).delete().in('session_id', sessionIds);
      if (error) console.warn(`⚠️ Failed to delete from ${table}:`, error.message);
    }

    if (sessionIds.length) {
      const { error: delSessionErr } = await authed.from('sessions').delete().in('id', sessionIds);
      if (delSessionErr) console.warn('⚠️ Failed to delete sessions:', delSessionErr.message);
    }

    // User-centric tables
    const userTables = [
      'user_preferences',
      'monthly_usage_cache',
      'usage_tracking',
      'user_referrals',
      'referral_audit_logs',
      'user_credits',
      'checkout_sessions',
    ];

    for (const table of userTables) {
      const col = table === 'referral_audit_logs' ? 'user_id' : 'user_id';
      const { error } = await authed.from(table).delete().eq(col, user.id);
      if (error) console.warn(`⚠️ Failed to delete from ${table}:`, error.message);
    }

    // Delete public.users row (profile data)
    await authed.from('users').delete().eq('id', user.id);

    // -------------------------------------
    // Delete auth user via service role
    // -------------------------------------
    try {
      const admin = createServerSupabaseClient();
      // @ts-ignore - admin API types vary between versions
      await (admin as any).auth.admin.deleteUser(user.id);
    } catch (adminErr) {
      console.error('Admin deleteUser failed:', adminErr);
    }

    return NextResponse.json({ success: true, message: 'Account and data deleted.' });
  } catch (error) {
    console.error('Error in delete account endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}