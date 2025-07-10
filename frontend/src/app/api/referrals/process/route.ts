import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referral_code, device_id } = body;

    if (!referral_code) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get IP address from request headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip_address = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || null;

    // First check if the referral code belongs to the current user (self-referral)
    const { data: ownCode } = await supabase
      .from('users')
      .select('referral_code')
      .eq('id', user.id)
      .single();
    
    if (ownCode?.referral_code && ownCode.referral_code.toUpperCase() === referral_code.toUpperCase()) {
      return NextResponse.json({ 
        success: false, 
        message: 'You cannot use your own referral code' 
      }, { status: 400 });
    }

    // Process the referral
    const { data, error } = await supabase
      .rpc('process_referral_code', {
        p_user_id: user.id,
        p_referral_code: referral_code,
        p_device_id: device_id || null,
        p_ip_address: ip_address
      });

    if (error) {
      console.error('Error processing referral:', error);
      return NextResponse.json({ error: 'Failed to process referral' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid referral code or already used' 
      }, { status: 400 });
    }

    // Clear the referral code from localStorage (client will handle this)
    return NextResponse.json({ 
      success: true,
      message: 'Referral processed successfully'
    });

  } catch (error) {
    console.error('Error in referrals/process:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}