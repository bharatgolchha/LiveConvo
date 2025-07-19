import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }

    // Call the database function to update last login
    const { error } = await supabase.rpc('update_last_login', {
      user_id: session.user.id
    });

    if (error) {
      console.error('Error updating last login:', error);
      return NextResponse.json({ error: 'Failed to update last login' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update last login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}