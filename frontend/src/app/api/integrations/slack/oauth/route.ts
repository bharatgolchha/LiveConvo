import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// GET /api/integrations/slack/oauth - Slack OAuth callback
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // User cancelled OAuth flow
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=slack_auth_cancelled`);
    }

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/oauth`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      console.error('Slack OAuth error:', tokenData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=slack_auth_failed`);
    }

    // Save the integration
    const config = {
      accessToken: tokenData.access_token,
      botUserId: tokenData.bot_user_id,
      teamId: tokenData.team.id,
      teamName: tokenData.team.name,
      scope: tokenData.scope,
      defaultChannel: tokenData.incoming_webhook?.channel || null,
      webhookUrl: tokenData.incoming_webhook?.url || null,
    };

    // Check if integration already exists
    const { data: existing } = await supabase
      .from('integration_settings')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'slack')
      .eq('config->teamId', tokenData.team.id)
      .single();

    if (existing) {
      // Update existing
      await supabase
        .from('integration_settings')
        .update({
          config,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new
      await supabase
        .from('integration_settings')
        .insert({
          user_id: user.id,
          provider: 'slack',
          config,
          is_active: true,
        });
    }

    // Redirect back to dashboard with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=slack_connected`);
  } catch (error) {
    console.error('Slack OAuth error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=slack_auth_error`);
  }
}

// POST /api/integrations/slack/oauth/url - Generate OAuth URL
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scopes = [
      'chat:write',
      'chat:write.public',
      'channels:read',
      'groups:read',
      'im:read',
      'mpim:read',
      'incoming-webhook',
    ].join(',');

    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64');

    const oauthUrl = new URL('https://slack.com/oauth/v2/authorize');
    oauthUrl.searchParams.set('client_id', process.env.SLACK_CLIENT_ID!);
    oauthUrl.searchParams.set('scope', scopes);
    oauthUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/oauth`);
    oauthUrl.searchParams.set('state', state);

    return NextResponse.json({ url: oauthUrl.toString() });
  } catch (error) {
    console.error('Slack OAuth URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}