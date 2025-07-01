import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, expiresIn, includeTranscript } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get auth token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const supabase = createAuthenticatedSupabaseClient(token);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id, organization_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user has access to this session
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', session.organization_id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Generate unique share token
    const shareToken = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration date
    let expiresAt = null;
    if (expiresIn !== 'never') {
      const daysToAdd = parseInt(expiresIn) || 7;
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + daysToAdd);
    }

    // Create share link entry in database
    const { data: shareLink, error: createError } = await supabase
      .from('session_share_links')
      .insert({
        session_id: sessionId,
        share_token: shareToken,
        created_by: user.id,
        expires_at: expiresAt,
        include_transcript: includeTranscript,
        access_count: 0
      })
      .select()
      .single();

    if (createError) {
      // If table doesn't exist, return a simplified share link
      console.error('Share link creation error:', createError);
      // For now, we'll create a simple encoded link
      // Check if we're in production based on Supabase URL
      const isProduction = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://juuysuamfoteblrqqdnu.supabase.co';
      const baseUrl = isProduction 
        ? 'https://liveprompt.ai'
        : (process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || '');
      const encodedId = Buffer.from(sessionId).toString('base64').replace(/=/g, '');
      return NextResponse.json({
        shareLink: `${baseUrl}/shared/summary/${encodedId}`,
        expiresAt: expiresAt?.toISOString()
      });
    }

    // Generate the full share URL
    // Check if we're in production based on Supabase URL
    const isProduction = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://juuysuamfoteblrqqdnu.supabase.co';
    const baseUrl = isProduction 
      ? 'https://liveprompt.ai'
      : (process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || '');
    const shareUrl = `${baseUrl}/shared/summary/${shareToken}`;

    return NextResponse.json({
      shareLink: shareUrl,
      expiresAt: shareLink.expires_at
    });

  } catch (error) {
    console.error('Share link generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate share link' },
      { status: 500 }
    );
  }
}