import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !memberData) {
      return NextResponse.json({ error: 'User is not part of any organization' }, { status: 403 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('organization_invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        created_at,
        accepted_at,
        metadata,
        invited_by_user_id,
        invited_by:users!organization_invitations_invited_by_user_id_fkey(
          id,
          email,
          full_name
        )
      `)
      .eq('organization_id', memberData.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if specified
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: invitations, error: invitationsError, count } = await query;

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    // Process invitations to add computed fields
    const processedInvitations = invitations?.map(invite => {
      const now = new Date();
      const expiresAt = new Date(invite.expires_at);
      const isExpired = expiresAt < now && invite.status === 'pending';
      
      return {
        ...invite,
        is_expired: isExpired,
        days_until_expiry: Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
        invited_by_name: invite.invited_by?.full_name || invite.invited_by?.email || 'Unknown'
      };
    });

    // Get invitation statistics
    const { data: stats } = await supabase
      .from('organization_invitations')
      .select('status')
      .eq('organization_id', memberData.organization_id);

    const invitationStats = {
      total: stats?.length || 0,
      pending: stats?.filter(s => s.status === 'pending').length || 0,
      accepted: stats?.filter(s => s.status === 'accepted').length || 0,
      cancelled: stats?.filter(s => s.status === 'cancelled').length || 0,
      expired: stats?.filter(s => s.status === 'expired').length || 0
    };

    return NextResponse.json({
      invitations: processedInvitations,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      stats: invitationStats
    });

  } catch (error) {
    console.error('Error in invitations list endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}