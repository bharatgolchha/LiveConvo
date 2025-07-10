import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendReferralEmail } from '@/lib/referrals/email-notifications';

interface ReferralNotifyRequest {
  event: 'new_signup' | 'payment_completed' | 'credits_added';
  referrerId?: string;
  refereeId?: string;
  referralId?: string;
  amount?: number;
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be protected - check for API key or webhook secret
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ReferralNotifyRequest = await request.json();
    const { event, referrerId, refereeId, referralId, amount } = body;

    const supabase = createServerSupabaseClient();

    switch (event) {
      case 'new_signup':
        // Get referrer and referee details
        if (!referrerId || !refereeId) {
          return NextResponse.json({ error: 'Missing required IDs' }, { status: 400 });
        }

        const { data: referee } = await supabase
          .from('users')
          .select('email')
          .eq('id', refereeId)
          .single();

        if (referee) {
          // Send email to referrer about new signup
          await sendReferralEmail({
            type: 'new_referral',
            referrerId: referrerId,
            refereeEmail: referee.email,
          });
        }
        break;

      case 'payment_completed':
        // Handle payment completion and credit reward
        if (!referralId) {
          return NextResponse.json({ error: 'Missing referral ID' }, { status: 400 });
        }

        const { data: referral } = await supabase
          .from('user_referrals')
          .select('referrer_id, referee_id, reward_amount')
          .eq('id', referralId)
          .single();

        if (referral && referral.referrer_id) {
          // Send completion email
          await sendReferralEmail({
            type: 'referral_completed',
            referrerId: referral.referrer_id,
            amount: referral.reward_amount || 5,
          });
        }
        break;

      case 'credits_added':
        // Notify about credits being added
        if (!referrerId || !amount) {
          return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        await sendReferralEmail({
          type: 'credits_earned',
          referrerId: referrerId,
          amount: amount,
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in referral notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}