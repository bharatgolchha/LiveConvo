import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ 
        error: 'No token provided',
        authHeader: authHeader || 'none'
      }, { status: 401 });
    }
    
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    const { data: { session }, error: sessionError } = await authSupabase.auth.getSession();
    
    return NextResponse.json({
      user: user ? { id: user.id, email: user.email } : null,
      authError: authError?.message || null,
      session: session ? {
        access_token: session.access_token,
        expires_at: session.expires_at,
        user: session.user?.email
      } : null,
      sessionError: sessionError?.message || null,
      tokenReceived: !!token,
      tokenLength: token?.length || 0
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}