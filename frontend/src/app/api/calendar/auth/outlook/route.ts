import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CalendarOAuthState } from '@/types/calendar';

// Generates the Microsoft OAuth authorization URL for Outlook calendar connection
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/auth/outlook/callback`;

    if (!clientId || !redirectUri) {
      return NextResponse.json({ error: 'Microsoft OAuth not configured' }, { status: 500 });
    }

    // Block connecting a different provider if an active connection exists
    const { data: existingConn } = await supabase
      .from('calendar_connections')
      .select('provider')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (existingConn && existingConn.provider && existingConn.provider !== 'microsoft_outlook') {
      return NextResponse.json({ error: 'A different calendar provider is already connected' }, { status: 409 });
    }

    // Determine where to return the user after success
    let redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    const referer = request.headers.get('referer');
    if (referer && referer.includes('/onboarding')) {
      const onboardingUrl = new URL(referer);
      onboardingUrl.searchParams.set('calendar_connected', 'true');
      redirectUrl = onboardingUrl.pathname + onboardingUrl.search;
    }

    // Create state parameter with user info
    const state: CalendarOAuthState = {
      user_id: user.id,
      redirect_url: redirectUrl,
      provider: 'microsoft_outlook',
      timestamp: Date.now()
    };
    const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');

    // Microsoft scopes (URLSearchParams will encode spaces as '+', so join with spaces)
    const scopes = [
      'offline_access',
      'openid',
      'email',
      // Needed so we can fetch the connected account's email via Graph /me
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Calendars.Read'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      response_mode: 'query',
      scope: scopes,
      state: encodedState
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    return NextResponse.json({ auth_url: authUrl });
  } catch (error) {
    console.error('Error creating Microsoft OAuth URL:', error);
    return NextResponse.json({ error: 'Failed to create authentication URL' }, { status: 500 });
  }
}


