import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CalendarOAuthState, GoogleOAuthTokenResponse } from '@/types/calendar';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/dashboard?tab=settings&error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=missing_params', request.url)
      );
    }

    // Decode state
    let oauthState: CalendarOAuthState;
    try {
      oauthState = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (err) {
      console.error('Invalid state parameter:', err);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=invalid_state', request.url)
      );
    }

    // Verify state timestamp (5 minute expiry)
    if (Date.now() - oauthState.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=state_expired', request.url)
      );
    }

    // Exchange code for tokens
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenParams = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/auth/google/callback`,
      grant_type: 'authorization_code'
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=token_exchange_failed', request.url)
      );
    }

    const tokens: GoogleOAuthTokenResponse = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info');
      return NextResponse.redirect(
        new URL('/dashboard?tab=settings&error=user_info_failed', request.url)
      );
    }

    const userInfo = await userInfoResponse.json();

    // Create Recall.ai calendar
    const recallApiKey = process.env.RECALL_AI_API_KEY;
    if (!recallApiKey) {
      console.error('Recall.ai API key not configured');
      return NextResponse.redirect(
        new URL('/dashboard?tab=settings&error=recall_not_configured', request.url)
      );
    }

    // Recall.ai calendar creation endpoint
    const recallRegion = process.env.RECALL_AI_REGION || 'us-west-2';
    const recallResponse = await fetch(`https://${recallRegion}.recall.ai/api/v2/calendars/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${recallApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platform: 'google_calendar',
        oauth_client_id: process.env.GOOGLE_CLIENT_ID,
        oauth_client_secret: process.env.GOOGLE_CLIENT_SECRET,
        oauth_refresh_token: tokens.refresh_token
      })
    });

    if (!recallResponse.ok) {
      const error = await recallResponse.text();
      console.error('Failed to create Recall calendar:', {
        status: recallResponse.status,
        statusText: recallResponse.statusText,
        error: error,
        url: `https://${recallRegion}.recall.ai/api/v2/calendars/`
      });
      return NextResponse.redirect(
        new URL('/dashboard?tab=settings&error=recall_calendar_failed', request.url)
      );
    }

    const recallCalendar = await recallResponse.json();

    // Store calendar connection in database
    const supabase = createServerSupabaseClient();
    
    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, current_organization_id')
      .eq('id', oauthState.user_id)
      .single();

    if (userError || !userData) {
      console.error('Failed to get user data:', userError);
      return NextResponse.redirect(
        new URL('/dashboard?tab=settings&error=user_not_found', request.url)
      );
    }

    // First, deactivate any existing connections for this email to prevent duplicates
    const { error: deactivateError } = await supabase
      .from('calendar_connections')
      .update({ is_active: false })
      .eq('email', userInfo.email)
      .eq('user_id', oauthState.user_id);
    
    if (deactivateError) {
      console.warn('Failed to deactivate old connections:', deactivateError);
    }
    
    // Insert calendar connection
    const { error: insertError } = await supabase
      .from('calendar_connections')
      .insert({
        user_id: oauthState.user_id,
        organization_id: userData.current_organization_id,
        provider: 'google_calendar',
        recall_calendar_id: recallCalendar.id,
        oauth_refresh_token: tokens.refresh_token,
        email: userInfo.email,
        display_name: userInfo.name,
        is_active: true
      });

    if (insertError) {
      console.error('Failed to save calendar connection:', insertError);
      
      // If it's a unique constraint violation, the calendar is already connected
      if (insertError.code === '23505') {
        return NextResponse.redirect(
          new URL('/dashboard?tab=settings&error=calendar_already_connected', request.url)
        );
      }
      
      return NextResponse.redirect(
        new URL('/dashboard?tab=settings&error=save_failed', request.url)
      );
    }

    // Create default preferences if they don't exist
    await supabase
      .from('calendar_preferences')
      .upsert({
        user_id: oauthState.user_id,
        auto_join_enabled: false,
        join_buffer_minutes: 2,
        auto_record_enabled: false,
        notify_before_join: true,
        notification_minutes: 5
      }, {
        onConflict: 'user_id'
      });

    // Redirect to success
    // Parse existing URL parameters to avoid duplicates
    const redirectUrl = new URL(oauthState.redirect_url, request.url);
    redirectUrl.searchParams.set('calendar_connected', 'google');
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard?tab=settings&error=unexpected_error', request.url)
    );
  }
}