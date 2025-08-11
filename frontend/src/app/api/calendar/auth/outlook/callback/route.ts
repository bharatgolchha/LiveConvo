import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CalendarOAuthState } from '@/types/calendar';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Microsoft OAuth error:', error);
      return NextResponse.redirect(new URL(`/dashboard?tab=settings&error=${encodeURIComponent(error)}`, request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=missing_params', request.url));
    }

    // Decode state
    let oauthState: CalendarOAuthState;
    try {
      oauthState = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (err) {
      console.error('Invalid state parameter:', err);
      return NextResponse.redirect(new URL('/dashboard/settings?error=invalid_state', request.url));
    }

    // Verify state timestamp (5 minute expiry)
    if (Date.now() - oauthState.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=state_expired', request.url));
    }

    // Exchange code for tokens with Microsoft
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const tokenParams = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/auth/outlook/callback`,
      grant_type: 'authorization_code',
      code
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams
    });

    if (!tokenResponse.ok) {
      const txt = await tokenResponse.text();
      console.error('MS token exchange failed:', txt);
      return NextResponse.redirect(new URL('/dashboard/settings?error=token_exchange_failed', request.url));
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      id_token?: string;
      token_type: string;
      scope: string;
      expires_in: number;
    };

    // Try to get user email/display name from Graph if possible
    let email: string | null = null;
    let displayName: string | null = null;
    try {
      // If scope doesn't include User.Read, this may fail; it's optional
      const meResp = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      if (meResp.ok) {
        const me = await meResp.json();
        email = me.mail || me.userPrincipalName || null;
        displayName = me.displayName || null;
      }
    } catch {}

    const recallApiKey = process.env.RECALL_AI_API_KEY;
    if (!recallApiKey) {
      console.error('Recall.ai API key not configured');
      return NextResponse.redirect(new URL('/dashboard?tab=settings&error=recall_not_configured', request.url));
    }

    // Create Recall calendar (V2)
    const recallRegion = process.env.RECALL_AI_REGION || 'us-west-2';
    const recallResponse = await fetch(`https://${recallRegion}.recall.ai/api/v2/calendars/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${recallApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platform: 'microsoft_outlook',
        oauth_client_id: process.env.MICROSOFT_CLIENT_ID,
        oauth_client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        oauth_refresh_token: tokens.refresh_token
      })
    });

    if (!recallResponse.ok) {
      const errorText = await recallResponse.text();
      console.error('Failed to create Recall MS calendar:', recallResponse.status, errorText);
      return NextResponse.redirect(new URL('/dashboard?tab=settings&error=recall_calendar_failed', request.url));
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
      return NextResponse.redirect(new URL('/dashboard?tab=settings&error=user_not_found', request.url));
    }

    // Fallback: if Microsoft Graph did not return email, use our app user's email
    if (!email) {
      const { data: appUser, error: appUserErr } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', oauthState.user_id)
        .single();
      if (appUser) {
        email = appUser.email;
        if (!displayName) displayName = appUser.full_name || null;
      } else if (appUserErr) {
        console.warn('Could not load fallback user email:', appUserErr);
      }
    }

    // Deactivate existing connections for same email
    if (email) {
      await supabase
        .from('calendar_connections')
        .update({ is_active: false })
        .eq('email', email)
        .eq('user_id', oauthState.user_id);
    }

    // Insert connection
    const { error: insertError } = await supabase
      .from('calendar_connections')
      .insert({
        user_id: oauthState.user_id,
        organization_id: userData.current_organization_id,
        provider: 'microsoft_outlook',
        recall_calendar_id: recallCalendar.id,
        oauth_refresh_token: tokens.refresh_token ?? null,
        email: email!,
        display_name: displayName,
        is_active: true
      });

    if (insertError) {
      console.error('Failed to save MS calendar connection:', insertError);
      return NextResponse.redirect(new URL('/dashboard?tab=settings&error=save_failed', request.url));
    }

    // Ensure default preferences
    await supabase
      .from('calendar_preferences')
      .upsert({
        user_id: oauthState.user_id,
        auto_join_enabled: false,
        join_buffer_minutes: 2,
        auto_record_enabled: false,
        auto_email_summary_enabled: true,
        notify_before_join: true,
        notification_minutes: 5
      }, { onConflict: 'user_id' });

    // Redirect to success
    const redirectUrl = new URL(oauthState.redirect_url, request.url);
    redirectUrl.searchParams.set('calendar_connected', 'outlook');
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Outlook OAuth callback error:', error);
    return NextResponse.redirect(new URL('/dashboard?tab=settings&error=unexpected_error', request.url));
  }
}


