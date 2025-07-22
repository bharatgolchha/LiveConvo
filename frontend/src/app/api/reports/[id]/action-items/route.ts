import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First authenticate the user
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use server client for database operations to bypass RLS
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');

    // Build query
    let query = supabase
      .from('collaborative_action_items')
      .select(`
        *,
        created_by_user:users!created_by (
          id,
          email,
          full_name
        ),
        assigned_to_user:users!assigned_to (
          id,
          email,
          full_name
        ),
        completed_by_user:users!completed_by (
          id,
          email,
          full_name
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (assignedTo) {
      if (assignedTo === 'me') {
        query = query.eq('assigned_to', user.id);
      } else if (assignedTo === 'unassigned') {
        query = query.is('assigned_to', null);
      } else {
        query = query.eq('assigned_to', assignedTo);
      }
    }

    const { data: actionItems, error } = await query;

    if (error) {
      console.error('Error fetching action items:', error);
      return NextResponse.json({ error: 'Failed to fetch action items' }, { status: 500 });
    }

    return NextResponse.json({ actionItems: actionItems || [] });
  } catch (error) {
    console.error('Error in action items GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First authenticate the user
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use server client for database operations to bypass RLS
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();

    const body = await request.json();
    const {
      title,
      description,
      priority = 'medium',
      assignedTo,
      dueDate,
      sourceType = 'manual',
      sourceId
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Verify user has access to this session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Create the action item
    const { data: actionItem, error: createError } = await supabase
      .from('collaborative_action_items')
      .insert({
        session_id: sessionId,
        created_by: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        priority,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        source_type: sourceType,
        source_id: sourceId || null
      })
      .select(`
        *,
        created_by_user:users!created_by (
          id,
          email,
          full_name
        ),
        assigned_to_user:users!assigned_to (
          id,
          email,
          full_name
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating action item:', createError);
      return NextResponse.json({ error: 'Failed to create action item' }, { status: 500 });
    }

    return NextResponse.json({ actionItem });
  } catch (error) {
    console.error('Error in action items POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First authenticate the user
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use server client for database operations to bypass RLS
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const actionItemId = searchParams.get('actionItemId');

    if (!actionItemId) {
      return NextResponse.json({ error: 'Action item ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      title,
      description,
      priority,
      status,
      assignedTo,
      dueDate
    } = body;

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (priority !== undefined) updates.priority = priority;
    if (status !== undefined) updates.status = status;
    if (assignedTo !== undefined) updates.assigned_to = assignedTo;
    if (dueDate !== undefined) updates.due_date = dueDate;

    // Handle completion
    if (status === 'completed' && updates.status === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user.id;
    } else if (status !== 'completed') {
      updates.completed_at = null;
      updates.completed_by = null;
    }

    // Update the action item
    const { data: actionItem, error } = await supabase
      .from('collaborative_action_items')
      .update(updates)
      .eq('id', actionItemId)
      .select(`
        *,
        created_by_user:users!created_by (
          id,
          email,
          full_name
        ),
        assigned_to_user:users!assigned_to (
          id,
          email,
          full_name
        ),
        completed_by_user:users!completed_by (
          id,
          email,
          full_name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating action item:', error);
      return NextResponse.json({ error: 'Failed to update action item' }, { status: 500 });
    }

    if (!actionItem) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    return NextResponse.json({ actionItem });
  } catch (error) {
    console.error('Error in action items PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First authenticate the user
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use server client for database operations to bypass RLS
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const actionItemId = searchParams.get('actionItemId');

    if (!actionItemId) {
      return NextResponse.json({ error: 'Action item ID is required' }, { status: 400 });
    }

    // Check if user can delete (created by them or session owner)
    const { data: actionItem } = await supabase
      .from('collaborative_action_items')
      .select('created_by, session_id')
      .eq('id', actionItemId)
      .single();

    if (!actionItem) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    // Check permissions
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('id', actionItem.session_id)
      .single();

    const canDelete = actionItem.created_by === user.id || 
                     sessionData?.user_id === user.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Unauthorized to delete this action item' }, { status: 403 });
    }

    // Delete the action item
    const { error } = await supabase
      .from('collaborative_action_items')
      .delete()
      .eq('id', actionItemId);

    if (error) {
      console.error('Error deleting action item:', error);
      return NextResponse.json({ error: 'Failed to delete action item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in action items DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}