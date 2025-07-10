import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface WelcomeEmailRequest {
  userId: string;
  referralCode?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createServerSupabaseClient();

    const body: WelcomeEmailRequest = await request.json();
    const { userId, referralCode } = body;

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let referrerName = null;
    if (referralCode) {
      // Get referrer name if referred
      const { data: referrer } = await supabase
        .from('users')
        .select('full_name')
        .eq('referral_code', referralCode)
        .single();
      
      referrerName = referrer?.full_name;
    }

    // Prepare welcome email
    const emailContent = {
      to: user.email,
      subject: '🎉 Welcome to LivePrompt.ai!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to LivePrompt.ai, ${user.full_name || 'there'}!</h1>
          
          ${referrerName ? `
            <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #2e7d32;">
                <strong>${referrerName} referred you!</strong> You'll get 10% off your first subscription.
              </p>
            </div>
          ` : ''}
          
          <p>We're excited to have you on board! LivePrompt.ai is your AI-powered conversation coach that provides real-time guidance during live conversations.</p>
          
          <h2 style="color: #333; margin-top: 30px;">Getting Started</h2>
          <ol style="line-height: 1.8;">
            <li><strong>Complete your onboarding:</strong> Set up your profile and preferences</li>
            <li><strong>Start a conversation:</strong> Click "New Conversation" to begin</li>
            <li><strong>Get real-time guidance:</strong> Our AI will provide suggestions as you speak</li>
            <li><strong>Review summaries:</strong> After each conversation, get detailed insights</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          
          ${!referrerName ? `
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <h3 style="margin-top: 0; color: #333;">🎁 Earn $5 for Each Friend</h3>
              <p>Share LivePrompt.ai with your friends and earn $5 in credits for each person who subscribes!</p>
              <p style="margin-bottom: 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/referrals" style="color: #2563eb; text-decoration: none; font-weight: bold;">
                  Get Your Referral Code →
                </a>
              </p>
            </div>
          ` : ''}
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Need help? Reply to this email or visit our 
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/help" style="color: #2563eb;">help center</a>.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            LivePrompt.ai - AI-Powered Conversation Coaching<br>
            © ${new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      `,
    };

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'LivePrompt.ai <welcome@liveprompt.ai>',
      ...emailContent,
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: data?.id });
  } catch (error) {
    console.error('Error in welcome email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}