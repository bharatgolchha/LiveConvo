import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ReferralEmailRequest {
  type: 'new_referral' | 'referral_completed' | 'credits_earned' | 'credits_expiring';
  referrerId: string;
  refereeEmail?: string;
  amount?: number;
  expiryDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createServerSupabaseClient();

    const body: ReferralEmailRequest = await request.json();
    const { type, referrerId, refereeEmail, amount, expiryDate } = body;

    // Get referrer details
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('email, referral_code')
      .eq('id', referrerId)
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    let emailContent;
    let subject;

    switch (type) {
      case 'new_referral':
        subject = '🎉 Someone used your referral code!';
        emailContent = {
          to: referrer.email,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Great news!</h2>
              <p>Someone just signed up using your referral code <strong>${referrer.referral_code}</strong>!</p>
              <p>You're one step closer to earning $5 in credits. Once they make their first payment, the credits will be automatically added to your account.</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">What happens next?</h3>
                <ol>
                  <li>Your friend completes their first payment</li>
                  <li>You receive $5 in credits (after 7 days)</li>
                  <li>Credits are automatically applied to your next bill</li>
                </ol>
              </div>
              <p>Keep sharing your referral code to earn more rewards!</p>
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Your referral link: <a href="${process.env.NEXT_PUBLIC_APP_URL}?ref=${referrer.referral_code}">${process.env.NEXT_PUBLIC_APP_URL}?ref=${referrer.referral_code}</a>
              </p>
            </div>
          `,
        };
        break;

      case 'referral_completed':
        subject = '💰 You earned $5 in referral credits!';
        emailContent = {
          to: referrer.email,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Congratulations! 🎊</h2>
              <p>Your referral has completed their first payment. You've earned <strong>$5 in credits</strong>!</p>
              <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h1 style="color: #2e7d32; margin: 0;">$${amount || 5}</h1>
                <p style="color: #2e7d32; margin: 5px 0;">Credits Added</p>
              </div>
              <p>These credits will be automatically applied to your next subscription payment.</p>
              <p>Don't stop now! Share your referral code <strong>${referrer.referral_code}</strong> with more friends to earn additional rewards.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/referrals" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Your Referral Dashboard</a>
              </div>
            </div>
          `,
        };
        break;

      case 'credits_earned':
        subject = '💵 Credits added to your account';
        emailContent = {
          to: referrer.email,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Credits Added!</h2>
              <p>We've added <strong>$${amount}</strong> in credits to your account.</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Amount:</strong> $${amount}</p>
                <p style="margin: 10px 0 0 0;"><strong>Reason:</strong> Referral reward</p>
              </div>
              <p>These credits will be automatically applied to your next subscription payment.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=billing" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Billing Details</a>
              </div>
            </div>
          `,
        };
        break;

      case 'credits_expiring':
        subject = '⏰ Your credits are expiring soon';
        emailContent = {
          to: referrer.email,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Credits Expiring Soon!</h2>
              <p>You have <strong>$${amount}</strong> in credits that will expire on <strong>${expiryDate}</strong>.</p>
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404;"><strong>Action Required:</strong> Use your credits before they expire!</p>
              </div>
              <p>Credits are automatically applied to your subscription payments. Make sure you have an active subscription to use them.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=billing" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Your Credits</a>
              </div>
            </div>
          `,
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'LivePrompt.ai <notifications@liveprompt.ai>',
      ...emailContent,
    });

    if (error) {
      console.error('Error sending email:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: data?.id });
  } catch (error) {
    console.error('Error in referral notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}