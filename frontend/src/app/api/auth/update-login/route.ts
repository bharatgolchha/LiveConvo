import { NextResponse, NextRequest } from 'next/server';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header if provided (for OAuth flows)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    let userId: string | null = null;
    
    if (token) {
      // For OAuth login with token
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    } else {
      // For email/password login using cookies
      const cookieStore = cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      // Get the session from cookies
      const allCookies = cookieStore.getAll();
      const authToken = allCookies.find(cookie => 
        cookie.name.includes('auth-token') || 
        cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
      );
      
      if (authToken) {
        try {
          const tokenData = JSON.parse(authToken.value);
          const accessToken = tokenData.access_token;
          
          if (accessToken) {
            const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
              global: {
                headers: {
                  Authorization: `Bearer ${accessToken}`
                }
              }
            });
            
            const { data: { user }, error } = await supabase.auth.getUser(accessToken);
            if (!error && user) {
              userId = user.id;
            }
          }
        } catch (parseError) {
          console.error('Error parsing auth token:', parseError);
        }
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Update using service role client to ensure we have permissions
    const serviceClient = createServerSupabaseClient();
    const { error: updateError } = await serviceClient
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating last_login_at:', updateError);
      return NextResponse.json({ error: 'Failed to update login time' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}