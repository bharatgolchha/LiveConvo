import { supabase } from '@/lib/supabase';

interface SendReferralEmailOptions {
  type: 'new_referral' | 'referral_completed' | 'credits_earned' | 'credits_expiring';
  referrerId: string;
  refereeEmail?: string;
  amount?: number;
  expiryDate?: string;
}

export async function sendReferralEmail(options: SendReferralEmailOptions) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error('No session available for sending email');
      return { success: false, error: 'No session' };
    }

    const response = await fetch('/api/emails/referral-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to send referral email:', error);
      return { success: false, error: error.error || 'Failed to send email' };
    }

    const data = await response.json();
    return { success: true, emailId: data.emailId };
  } catch (error) {
    console.error('Error sending referral email:', error);
    return { success: false, error: 'Internal error' };
  }
}

// Helper function to check and send expiry warnings
export async function checkAndSendExpiryWarnings(userId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get credits expiring in the next 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: expiringCredits, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'referral_reward')
      .not('expires_at', 'is', null)
      .lte('expires_at', sevenDaysFromNow.toISOString())
      .gte('expires_at', new Date().toISOString());

    if (error || !expiringCredits || expiringCredits.length === 0) {
      return;
    }

    // Calculate total expiring amount
    const totalExpiring = expiringCredits.reduce((sum, credit) => sum + credit.amount, 0);
    const earliestExpiry = expiringCredits.sort((a, b) => 
      new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
    )[0].expires_at;

    // Send warning email
    await sendReferralEmail({
      type: 'credits_expiring',
      referrerId: userId,
      amount: totalExpiring,
      expiryDate: new Date(earliestExpiry).toLocaleDateString(),
    });
  } catch (error) {
    console.error('Error checking expiring credits:', error);
  }
}