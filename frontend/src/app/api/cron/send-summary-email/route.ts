import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Allow either CRON_SECRET in Authorization header OR the Vercel cron header
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (authHeader !== `Bearer ${cronSecret}` && request.headers.get('x-vercel-cron') !== '1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!projectUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase env vars missing' }, { status: 500 });
    }

    // Invoke the edge function
    const supabase = createClient(projectUrl, serviceKey);
    const { data, error } = await supabase.functions.invoke('send-summary-email');

    if (error) {
      console.error('Function invoke error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Cron handler error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
} 