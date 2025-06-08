import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createServerSupabaseClient();
    
    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authorization' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { status } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update waitlist entry
    const updateData: any = { status };
    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('beta_waitlist')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating waitlist entry:', updateError);
      return NextResponse.json(
        { error: 'Failed to update entry' },
        { status: 500 }
      );
    }

    // If approved, also update the user record to mark them as approved
    if (status === 'approved') {
      // Get the email from waitlist entry
      const { data: waitlistEntry } = await supabase
        .from('beta_waitlist')
        .select('email')
        .eq('id', id)
        .single();

      if (waitlistEntry?.email) {
        // Update user if they exist
        await supabase
          .from('users')
          .update({ waitlist_approved: true })
          .eq('email', waitlistEntry.email);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Waitlist update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}