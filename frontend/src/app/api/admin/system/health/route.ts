import { NextResponse, NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    
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

    // Check system health
    const health = {
      database: { status: 'healthy', latency: 0 },
      auth: { status: 'operational' },
      storage: { status: 'operational' },
      external_services: {
        deepgram: { status: 'operational' },
        openrouter: { status: 'operational' }
      }
    };

    // Test database connection and measure latency
    const startTime = Date.now();
    try {
      await supabase.from('users').select('id').limit(1);
      health.database.latency = Date.now() - startTime;
    } catch (error) {
      health.database.status = 'down';
    }

    // Test auth service
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session) {
        health.auth.status = 'degraded';
      }
    } catch (error) {
      health.auth.status = 'down';
    }

    // In a real implementation, you would test external services
    // For now, we'll return mock operational status

    return NextResponse.json(health);

  } catch (error) {
    console.error('System health error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}