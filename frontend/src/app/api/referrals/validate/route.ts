import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/middleware/rate-limit';

const limiter = rateLimit(60 * 1000, 20); // 20 requests per minute

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const { allowed, remaining } = await limiter(request);
  
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': remaining.toString(),
          'Retry-After': '60'
        }
      }
    );
  }
  
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
    }
    
    // Validate code format
    const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleanCode.length < 6 || cleanCode.length > 10) {
      return NextResponse.json({ 
        valid: false,
        error: 'Invalid referral code format'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Get client IP for logging
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Look up the referral code
    const { data: referrer, error } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('referral_code', cleanCode)
      .single();

    if (error || !referrer) {
      // Log invalid code attempt
      await supabase.rpc('log_referral_event', {
        p_event_type: 'code_invalid',
        p_referral_code: cleanCode,
        p_ip_address: clientIp,
        p_event_data: { reason: 'code_not_found' }
      });

      return NextResponse.json({ 
        valid: false,
        referrer_name: null,
        discount_percent: 0
      });
    }

    // Log successful validation
    await supabase.rpc('log_referral_event', {
      p_event_type: 'code_validated',
      p_referrer_id: referrer.id,
      p_referral_code: cleanCode,
      p_ip_address: clientIp
    });

    // Get current plan type to determine discount
    // For now, default to 10% (will be 20% for annual plans at checkout)
    const discountPercent = 10;

    // Return validation result
    return NextResponse.json({
      valid: true,
      referrer_name: referrer.full_name || referrer.email.split('@')[0],
      discount_percent: discountPercent
    });

  } catch (error) {
    console.error('Error validating referral code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}