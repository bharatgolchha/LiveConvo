import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    
    const { prompt, template, content, metadata } = body;

    // Validate required fields
    if (!prompt || !content) {
      return NextResponse.json(
        { error: 'Prompt and content are required' },
        { status: 400 }
      );
    }

    // Get current user from auth header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token provided' },
        { status: 401 }
      );
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error in save report:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Unauthorized - Invalid authentication token' },
        { status: 401 }
      );
    }

    const authenticatedClient = createAuthenticatedSupabaseClient(token);

    // Verify user owns the session
    const { data: session, error: sessionError } = await authenticatedClient
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Save the report
    const { data: savedReport, error: saveError } = await authenticatedClient
      .from('custom_reports')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        prompt,
        template: template || 'custom',
        generated_content: content,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving report:', saveError);
      return NextResponse.json(
        { error: 'Failed to save report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      report: savedReport 
    });

  } catch (error) {
    console.error('Error in save custom report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}