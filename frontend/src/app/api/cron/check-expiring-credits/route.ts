import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendReferralEmail } from '@/lib/referrals/email-notifications';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (you might want to check for a secret)
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Get credits expiring in the next 7 days that haven't been warned about
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: expiringCredits, error } = await supabase
      .from('user_credits')
      .select(`
        *,
        users!inner(email)
      `)
      .eq('type', 'referral_reward')
      .not('expires_at', 'is', null)
      .lte('expires_at', sevenDaysFromNow.toISOString())
      .gte('expires_at', new Date().toISOString())
      .eq('expiry_warning_sent', false);

    if (error) {
      console.error('Error fetching expiring credits:', error);
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }

    if (!expiringCredits || expiringCredits.length === 0) {
      return NextResponse.json({ message: 'No expiring credits found' });
    }

    // Group credits by user
    const creditsByUser = expiringCredits.reduce((acc, credit) => {
      if (!acc[credit.user_id]) {
        acc[credit.user_id] = {
          credits: [],
          totalAmount: 0,
          earliestExpiry: credit.expires_at,
          email: credit.users.email,
        };
      }
      acc[credit.user_id].credits.push(credit);
      acc[credit.user_id].totalAmount += credit.amount;
      if (new Date(credit.expires_at) < new Date(acc[credit.user_id].earliestExpiry)) {
        acc[credit.user_id].earliestExpiry = credit.expires_at;
      }
      return acc;
    }, {} as Record<string, { email: string; totalAmount: number; earliestExpiry: string; credits: typeof expiringCredits }>);

    // Send warning emails
    const emailsSent = [];
    for (const [userId, userData] of Object.entries(creditsByUser)) {
      try {
        const userCredits = userData as { email: string; totalAmount: number; earliestExpiry: string; credits: Array<{ id: string }> };
        // Send email notification
        await sendReferralEmail({
          type: 'credits_expiring',
          referrerId: userId,
          amount: userCredits.totalAmount,
          expiryDate: new Date(userCredits.earliestExpiry).toLocaleDateString(),
        });

        // Mark credits as warned
        const creditIds = userCredits.credits.map((c) => c.id);
        await supabase
          .from('user_credits')
          .update({ expiry_warning_sent: true })
          .in('id', creditIds);

        emailsSent.push({
          userId,
          email: userCredits.email,
          amount: userCredits.totalAmount,
          expiryDate: userCredits.earliestExpiry,
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${userId}:`, emailError);
      }
    }

    return NextResponse.json({
      message: 'Expiry warnings sent',
      emailsSent: emailsSent.length,
      details: emailsSent,
    });
  } catch (error) {
    console.error('Error in check-expiring-credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}