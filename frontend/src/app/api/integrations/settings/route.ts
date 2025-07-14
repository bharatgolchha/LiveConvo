import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// GET /api/integrations/settings - Get all integration settings for the user
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching integration settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Decrypt sensitive data before sending (in production, implement proper encryption)
    const decryptedSettings = settings?.map(setting => ({
      ...setting,
      config: setting.config // In production, decrypt this
    }));

    return NextResponse.json(decryptedSettings || []);
  } catch (error) {
    console.error('Integration settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/integrations/settings - Create a new integration setting
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, config, organizationId, isActive = true } = body;

    if (!provider || !config) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In production, encrypt sensitive config data
    const encryptedConfig = config; // Implement encryption

    const { data: setting, error } = await supabase
      .from('integration_settings')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        provider,
        config: encryptedConfig,
        is_active: isActive
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating integration setting:', error);
      return NextResponse.json({ error: 'Failed to create setting' }, { status: 500 });
    }

    return NextResponse.json({
      ...setting,
      config: config // Return unencrypted for client use
    });
  } catch (error) {
    console.error('Integration settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}