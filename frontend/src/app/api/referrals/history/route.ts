import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createServerSupabaseClient();
    
    // Get authenticated user using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get referral history
    const { data: referrals, error: referralsError } = await supabase
      .from('user_referrals')
      .select(`
        id,
        status,
        created_at,
        completed_at,
        reward_amount,
        referee_user_id
      `)
      .eq('referrer_user_id', user.id)
      .order('created_at', { ascending: false });

    if (referralsError) {
      console.error('Error fetching referral history:', referralsError);
      return NextResponse.json({ error: 'Failed to fetch referral history' }, { status: 500 });
    }

    // Get referee emails if we have referee_user_ids
    const refereeUserIds = referrals?.map(r => r.referee_user_id).filter(Boolean) || [];
    let refereeEmails: Record<string, string> = {};
    
    if (refereeUserIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', refereeUserIds);
      
      if (users) {
        refereeEmails = users.reduce((acc, user) => {
          acc[user.id] = user.email;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Format the response, hiding part of the email
    const formattedReferrals = referrals?.map((referral: any) => ({
      id: referral.id,
      referee_email: maskEmail(refereeEmails[referral.referee_user_id] || 'Unknown'),
      status: referral.status,
      created_at: referral.created_at,
      completed_at: referral.completed_at,
      reward_amount: referral.reward_amount
    })) || [];

    return NextResponse.json({
      referrals: formattedReferrals
    });

  } catch (error) {
    console.error('Error in referrals/history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to partially hide email
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  
  const visibleLength = Math.min(3, localPart.length);
  const maskedLocal = localPart.substring(0, visibleLength) + '***';
  
  return `${maskedLocal}@${domain}`;
}