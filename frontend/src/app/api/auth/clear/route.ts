import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const supabase = await createAuthenticatedServerClient(token);
    
    // Clear the session
    await supabase.auth.signOut();
    
    // Clear cookies
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    
    // Clear auth cookies
    response.cookies.set('sb-access-token', '', { maxAge: 0 });
    response.cookies.set('sb-refresh-token', '', { maxAge: 0 });
    
    return response;
  } catch (error) {
    console.error('Error clearing auth:', error);
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}