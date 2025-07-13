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

    // Check if user has an existing referral relationship
    const { data: referralData, error: referralError } = await supabase
      .from('user_referrals')
      .select(`
        *,
        referrer:referrer_id(
          id,
          email,
          referral_code
        )
      `)
      .eq('referee_id', user.id)
      .eq('status', 'pending')
      .single();

    if (referralError || !referralData) {
      // No referral found, check if user has referred_by_user_id set
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('referred_by_user_id, referrer:referred_by_user_id(referral_code)')
        .eq('id', user.id)
        .single();
      
      if (userData?.referred_by_user_id && userData.referrer) {
        return NextResponse.json({
          hasReferral: true,
          referralCode: userData.referrer.referral_code,
          referrerId: userData.referred_by_user_id
        });
      }

      return NextResponse.json({
        hasReferral: false
      });
    }

    return NextResponse.json({
      hasReferral: true,
      referralCode: referralData.referrer?.referral_code,
      referrerId: referralData.referrer_id
    });

  } catch (error) {
    console.error('Error checking existing referral:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}