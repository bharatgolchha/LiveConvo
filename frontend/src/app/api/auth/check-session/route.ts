import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header if sent by extension
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Verify the token with Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        return NextResponse.json({
          authenticated: true,
          token: token,
          user: {
            id: user.id,
            email: user.email,
          }
        });
      }
    }
    
    // For web-based auth, we can't access cookies from extensions
    // The extension should use the web-session.js content script to get the token
    return NextResponse.json(
      { authenticated: false, message: 'Please use web session sync or direct login' },
      { status: 401 }
    );

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}