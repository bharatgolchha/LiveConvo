import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ 
        error: 'Server configuration error', 
        details: 'Missing Supabase configuration' 
      }, { status: 500 });
    }

    // Create client for user authentication
    const authClient = createClient(supabaseUrl, supabaseAnonKey);

    let user = null;
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser } } = await authClient.auth.getUser(token);
      user = authUser;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await authClient
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role key if available, otherwise use auth client
    const adminClient = supabaseServiceRoleKey 
      ? createClient(supabaseUrl, supabaseServiceRoleKey)
      : authClient;

    // Get current user status
    const { data: currentUser, error: currentUserError } = await adminClient
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

    const { data: updatedUser, error: updateError } = await adminClient
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