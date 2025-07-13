import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const { id: sessionId, reportId } = await params;
    
    // Get current user from auth header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token provided' },
        { status: 401 }
      );
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Unauthorized - Invalid authentication token' },
        { status: 401 }
      );
    }

    const authenticatedClient = createAuthenticatedSupabaseClient(token);

    const { error } = await authenticatedClient
      .from('custom_reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting custom report:', error);
      return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/reports/[id]/custom/[reportId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}