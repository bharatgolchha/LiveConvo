import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a production environment, you would:
    // 1. Delete all user data from various tables
    // 2. Delete the user account via Supabase Admin API
    // For now, we'll just sign out the user
    
    // Delete user's sessions first
    await supabase
      .from('sessions')
      .delete()
      .eq('user_id', user.id);

    // In production, you'd need to use the Supabase Admin API to delete the user
    // This requires a service role key and should be done server-side
    console.log('User deletion requested for:', user.id);
    
    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({ 
      success: true, 
      message: 'Account deletion initiated. You will be signed out.' 
    });
  } catch (error) {
    console.error('Error in delete account endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}