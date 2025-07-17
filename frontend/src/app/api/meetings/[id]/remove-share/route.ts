import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get auth token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No authorization token provided' },
        { status: 401 }
      );
    }
    
    const authClient = createAuthenticatedSupabaseClient(token);
    
    // Get current user
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in' },
        { status: 401 }
      );
    }

    // First check if this session was shared with the user
    const { data: sharedMeeting, error: sharedError } = await authClient
      .from('shared_meetings')
      .select('id')
      .eq('session_id', sessionId)
      .eq('shared_with', user.id)
      .single();

    if (sharedError && sharedError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking shared meeting:', sharedError);
      return NextResponse.json(
        { error: 'Database error', message: sharedError.message },
        { status: 500 }
      );
    }

    if (!sharedMeeting) {
      // Check if it's an organization shared meeting
      const { data: orgShared, error: orgError } = await authClient
        .from('organization_shared_meetings')
        .select('id, organization_id')
        .eq('session_id', sessionId)
        .single();

      if (orgError && orgError.code !== 'PGRST116') {
        console.error('Error checking org shared meeting:', orgError);
        return NextResponse.json(
          { error: 'Database error', message: orgError.message },
          { status: 500 }
        );
      }

      if (!orgShared) {
        return NextResponse.json(
          { error: 'Not found', message: 'This meeting is not shared with you' },
          { status: 404 }
        );
      }

      // For organization shared meetings, we can't remove individual access
      // The user would need to leave the organization or have the owner unshare it
      return NextResponse.json(
        { error: 'Cannot remove', message: 'This meeting is shared with your organization. Contact the owner to remove organization-wide sharing.' },
        { status: 400 }
      );
    }

    // Remove the individual share
    const { error: deleteError } = await authClient
      .from('shared_meetings')
      .delete()
      .eq('session_id', sessionId)
      .eq('shared_with', user.id);

    if (deleteError) {
      console.error('Error removing share:', deleteError);
      return NextResponse.json(
        { error: 'Database error', message: deleteError.message },
        { status: 500 }
      );
    }

    // Log the activity
    await authClient
      .from('sharing_activity')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        action: 'accessed',
        details: { removed_from_shared: true }
      });

    // Return response with cache invalidation headers
    return NextResponse.json({ 
      success: true,
      message: 'Meeting removed from your shared meetings' 
    }, {
      headers: {
        // Force cache invalidation
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Remove share error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to remove shared meeting' },
      { status: 500 }
    );
  }
}