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

    // Get user's referral code
    let userData = null;
    try {
      const { data, error: userError } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      if (userError) {
        if (userError.code === '42703') { // Column does not exist
          console.log('referral_code column does not exist yet - migrations needed');
          // Return a temporary code based on user ID
          const tempCode = 'TEMP' + user.id.substring(0, 6).toUpperCase().replace(/-/g, '');
          
          return NextResponse.json({
            referral_code: tempCode,
            referral_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://liveprompt.ai'}/?ref=${tempCode}`,
            stats: {
              total_referrals: 0,
              pending: 0,
              completed: 0,
              total_earned: 0,
              credit_balance: 0
            },
            migration_needed: true
          });
        }
        console.error('Error fetching user data:', userError);
        return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
      }
      
      userData = data;
    } catch (err) {
      console.error('Error checking user data:', err);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // If user doesn't have a referral code, generate one
    let referralCode = userData?.referral_code;
    if (!referralCode) {
      // Generate a referral code directly
      const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
      };
      
      // Try to generate a unique code
      let attempts = 0;
      let newCode = '';
      let isUnique = false;
      
      while (attempts < 10 && !isUnique) {
        newCode = generateCode();
        
        // Check if code already exists
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('referral_code', newCode)
          .single();
        
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }
      
      if (!isUnique) {
        // Fallback: use user ID to ensure uniqueness
        newCode = 'REF' + user.id.substring(0, 7).toUpperCase().replace(/-/g, '');
      }
      
      referralCode = newCode;
      
      // Update user with new code
      const { error: updateError } = await supabase
        .from('users')
        .update({ referral_code: referralCode })
        .eq('id', user.id);
        
      if (updateError) {
        console.error('Error updating referral code:', updateError);
        return NextResponse.json({ error: 'Failed to save referral code' }, { status: 500 });
      }
    }

    // Get referral stats - check if table exists first
    let referrals = [];
    try {
      const { data, error: referralsError } = await supabase
        .from('user_referrals')
        .select('*')
        .eq('referrer_user_id', user.id);

      if (!referralsError) {
        referrals = data || [];
      } else if (referralsError.code === '42P01') {
        console.log('user_referrals table does not exist yet');
      } else {
        console.error('Error fetching referrals:', referralsError);
      }
    } catch (err) {
      console.log('Error checking referrals:', err);
    }

    // Get credit balance - first check if user_credits table exists
    let creditBalance = null;
    try {
      const { data, error: creditError } = await supabase
        .from('user_credits')
        .select('amount, type')
        .eq('user_id', user.id);

      if (!creditError) {
        // Calculate balance manually
        const balance = data?.reduce((acc, credit) => {
          if (credit.type === 'redemption') {
            return acc - credit.amount;
          }
          return acc + credit.amount;
        }, 0) || 0;

        const totalEarned = data?.filter(c => c.type === 'referral_reward')
          .reduce((sum, c) => sum + c.amount, 0) || 0;

        creditBalance = {
          balance,
          total_earned: totalEarned
        };
      }
    } catch (err) {
      console.log('Credits table might not exist yet:', err);
    }

    // Calculate stats
    const stats = {
      total_referrals: referrals?.length || 0,
      pending: referrals?.filter(r => r.status === 'pending').length || 0,
      completed: referrals?.filter(r => r.status === 'completed' || r.status === 'rewarded').length || 0,
      total_earned: creditBalance?.total_earned || 0,
      credit_balance: creditBalance?.balance || 0
    };

    // Generate referral URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveprompt.ai';
    const referralUrl = `${baseUrl}/?ref=${referralCode}`;

    return NextResponse.json({
      referral_code: referralCode,
      referral_url: referralUrl,
      stats
    });

  } catch (error) {
    console.error('Error in referrals/me:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}