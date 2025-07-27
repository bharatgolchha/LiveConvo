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
    
    /*
     * Fallback: attempt to read Supabase access token from cookies.  
     * When the extension performs a cross-origin fetch with `credentials:\'include\'`,
     * the browser will attach the Supabase auth cookies set by the web app (e.g.
     *   sb-<project-id>-access-token).
     * This allows the extension to silently refresh its token without forcing an
     * explicit re-login.
     */

    const cookieStore = cookies();
    let accessToken: string | undefined;
    let refreshToken: string | undefined;

    // Supabase cookie names look like: sb-<project>-access-token and sb-<project>-refresh-token
    const allCookies: any[] = (cookieStore as any).getAll ? (cookieStore as any).getAll() : [];
    allCookies.forEach((c) => {
      if (c.name?.endsWith('access-token')) {
        accessToken = c.value;
      } else if (c.name?.endsWith('refresh-token')) {
        refreshToken = c.value;
      }
    });

    if (accessToken) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data: { user }, error } = await supabase.auth.getUser(accessToken);

      if (!error && user) {
        return NextResponse.json({
          authenticated: true,
          token: accessToken,
          refresh_token: refreshToken,
          user: { id: user.id, email: user.email }
        });
      }
    }

    // If no valid token found
    return NextResponse.json(
      { authenticated: false, message: 'Not logged in' },
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