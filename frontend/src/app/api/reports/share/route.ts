import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      );
    }

    // Parse request body
    const { sessionId, sharedTabs, expiresIn, message } = await request.json();

    if (!sessionId || !sharedTabs || sharedTabs.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid user' },
        { status: 401 }
      );
    }

    // Verify user owns the session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!session || sessionError) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Generate unique share token
    const shareToken = randomBytes(16).toString('hex');

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (expiresIn !== 'never') {
      expiresAt = new Date();
      switch (expiresIn) {
        case '24hours':
          expiresAt.setHours(expiresAt.getHours() + 24);
          break;
        case '7days':
          expiresAt.setDate(expiresAt.getDate() + 7);
          break;
        case '30days':
          expiresAt.setDate(expiresAt.getDate() + 30);
          break;
      }
    }

    // Create share record
    const { data: shareRecord, error: insertError } = await supabase
      .from('shared_reports')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        share_token: shareToken,
        shared_tabs: sharedTabs,
        message: message || null,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create share record:', insertError);
      console.error('Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      
      // Check if it's a missing table error
      if (insertError.code === '42P01') {
        return NextResponse.json(
          { error: 'Share feature not yet configured. Please run database migrations.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create share link', details: insertError.message },
        { status: 500 }
      );
    }

    // Generate share URL
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const isProduction = origin.includes('liveprompt.ai') || process.env.NODE_ENV === 'production';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isProduction ? 'https://liveprompt.ai' : origin);
    const shareUrl = `${baseUrl}/shared/report/${shareToken}`;

    return NextResponse.json({
      shareUrl,
      shareToken,
      expiresAt,
      sharedTabs
    });

  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}