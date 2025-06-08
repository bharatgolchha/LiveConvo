import { NextResponse, NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    // Check if user is authenticated
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const supabase = createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get current user status
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', userId)
      .single();

    if (currentUserError) {
      console.error('Error fetching current user status:', currentUserError);
      return NextResponse.json({ 
        error: 'Failed to fetch current user status',
        details: currentUserError.message 
      }, { status: 500 });
    }

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Toggle the status
    const newStatus = !currentUser.is_active;

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ is_active: newStatus })
      .eq('id', userId)
      .select('id, email, is_active')
      .single();

    if (updateError) {
      console.error('Error updating user status:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update user status',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Admin toggle user status error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 