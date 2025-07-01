import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CalendarOAuthState } from '@/types/calendar';

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

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/auth/google/callback`;
    
    if (!clientId) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    // Get the redirect URL from the request
    let redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    
    // Check if we're in the onboarding flow
    const referer = request.headers.get('referer');
    if (referer && referer.includes('/onboarding')) {
      // Preserve the onboarding URL with calendar_connected flag
      const onboardingUrl = new URL(referer);
      onboardingUrl.searchParams.set('calendar_connected', 'true');
      redirectUrl = onboardingUrl.pathname + onboardingUrl.search;
    }
    
    // Create state parameter with user info
    const state: CalendarOAuthState = {
      user_id: user.id,
      redirect_url: redirectUrl,
      provider: 'google_calendar',
      timestamp: Date.now()
    };

    const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');

    // Google OAuth scopes
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state: encodedState
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.json({ auth_url: authUrl });
  } catch (error) {
    console.error('Error creating Google OAuth URL:', error);
    return NextResponse.json(
      { error: 'Failed to create authentication URL' },
      { status: 500 }
    );
  }
}