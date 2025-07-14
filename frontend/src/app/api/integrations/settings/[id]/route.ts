import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// PATCH /api/integrations/settings/[id] - Update an integration setting
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if ('config' in body) {
      // In production, encrypt sensitive config data
      updates.config = body.config;
    }
    
    if ('isActive' in body) {
      updates.is_active = body.isActive;
    }

    const { data: setting, error } = await supabase
      .from('integration_settings')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating integration setting:', error);
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
    }

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...setting,
      config: body.config || setting.config // Return unencrypted for client use
    });
  } catch (error) {
    console.error('Integration settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/integrations/settings/[id] - Delete an integration setting
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('integration_settings')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting integration setting:', error);
      return NextResponse.json({ error: 'Failed to delete setting' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Integration settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}