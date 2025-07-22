import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * PATCH /api/smart-notes/[id]
 * Update a smart note (toggle status)
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
    const { status, text } = body;

    // Validate input - at least one field must be provided
    if (!status && !text) {
      return NextResponse.json({ error: 'Status or text required' }, { status: 400 });
    }

    if (status && !['open', 'done'].includes(status)) {
      return NextResponse.json({ error: 'Valid status required (open/done)' }, { status: 400 });
    }

    if (text && typeof text !== 'string') {
      return NextResponse.json({ error: 'Text must be a string' }, { status: 400 });
    }

    // Get the smart note
    const { data: itemData, error: itemError } = await supabase
      .from('prep_checklist')
      .select('id, session_id')
      .eq('id', itemId)
      .single();

    if (itemError || !itemData) {
      return NextResponse.json({ error: 'Smart note not found' }, { status: 404 });
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

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    
    if (status) updateData.status = status;
    if (text) updateData.text = text.trim();

    // Update the smart note
    const { data: updatedItem, error: updateError } = await supabase
      .from('prep_checklist')
      .update(updateData)
      .eq('id', itemId)
      .select('id, text, status, created_at, created_by, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating smart note:', updateError);
      return NextResponse.json({ error: 'Failed to update smart note' }, { status: 500 });
    }

    return NextResponse.json(updatedItem);

  } catch (error) {
    console.error('Smart note PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/smart-notes/[id]
 * Delete a smart note
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

    // Get the smart note
    const { data: itemData, error: itemError } = await supabase
      .from('prep_checklist')
      .select('id, session_id')
      .eq('id', itemId)
      .single();

    if (itemError || !itemData) {
      return NextResponse.json({ error: 'Smart note not found' }, { status: 404 });
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

    // Delete the smart note
    const { error: deleteError } = await supabase
      .from('prep_checklist')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      console.error('Error deleting smart note:', deleteError);
      return NextResponse.json({ error: 'Failed to delete smart note' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Smart note DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}