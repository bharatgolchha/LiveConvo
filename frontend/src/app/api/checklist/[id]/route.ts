import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * PATCH /api/checklist/[id]
 * Update a checklist item (toggle status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: itemId } = await params;
    
    // Parse request body
    const body = await request.json();
    const { status } = body;

    if (!status || !['open', 'done'].includes(status)) {
      return NextResponse.json({ error: 'Valid status required (open/done)' }, { status: 400 });
    }

    // Get the checklist item
    const { data: itemData, error: itemError } = await supabase
      .from('prep_checklist')
      .select('id, session_id')
      .eq('id', itemId)
      .single();

    if (itemError || !itemData) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    // Verify user has access to this session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, organization_id, user_id')
      .eq('id', itemData.session_id)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user owns this session
    if (sessionData.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update the checklist item
    const { data: updatedItem, error: updateError } = await supabase
      .from('prep_checklist')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select('id, text, status, created_at, created_by')
      .single();

    if (updateError) {
      console.error('Error updating checklist item:', updateError);
      return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 });
    }

    return NextResponse.json(updatedItem);

  } catch (error) {
    console.error('Checklist PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/checklist/[id]
 * Delete a checklist item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: itemId } = await params;

    // Get the checklist item
    const { data: itemData, error: itemError } = await supabase
      .from('prep_checklist')
      .select('id, session_id')
      .eq('id', itemId)
      .single();

    if (itemError || !itemData) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    // Verify user has access to this session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, organization_id, user_id')
      .eq('id', itemData.session_id)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user owns this session
    if (sessionData.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the checklist item
    const { error: deleteError } = await supabase
      .from('prep_checklist')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      console.error('Error deleting checklist item:', deleteError);
      return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Checklist DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 