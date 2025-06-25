import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { webhookLogId, targetUrl } = body;

    if (!webhookLogId) {
      return NextResponse.json({ error: 'Webhook log ID required' }, { status: 400 });
    }

    // Fetch the webhook log
    const { data: webhookLog, error: fetchError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('id', webhookLogId)
      .single();

    if (fetchError || !webhookLog) {
      return NextResponse.json({ error: 'Webhook log not found' }, { status: 404 });
    }

    // Determine target URL
    const replayUrl = targetUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/recall/status`;

    console.log(`🔄 Replaying webhook ${webhookLogId} to ${replayUrl}`);

    // Replay the webhook
    const startTime = Date.now();
    const response = await fetch(replayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Replay-Webhook': 'true',
        'X-Original-Webhook-Id': webhookLogId,
        'X-Replay-User': user.id,
      },
      body: JSON.stringify(webhookLog.payload),
    });

    const processingTime = Date.now() - startTime;
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Log the replay
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: 'replay',
        event_type: webhookLog.event_type,
        bot_id: webhookLog.bot_id,
        session_id: webhookLog.session_id,
        payload: {
          original_webhook_id: webhookLogId,
          original_payload: webhookLog.payload,
          replay_metadata: {
            user_id: user.id,
            target_url: replayUrl,
            response_status: response.status,
            response_data: responseData,
            processing_time: processingTime
          }
        },
        processed: response.ok,
        processing_time_ms: processingTime,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      processingTime,
      response: responseData,
      originalWebhook: {
        id: webhookLogId,
        type: webhookLog.webhook_type,
        event: webhookLog.event_type,
        createdAt: webhookLog.created_at
      },
      replayUrl
    });

  } catch (error) {
    console.error('❌ Webhook replay error:', error);
    return NextResponse.json({ 
      error: 'Failed to replay webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to fetch recent webhooks for replay
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query
    let query = supabase
      .from('webhook_logs')
      .select('id, webhook_type, event_type, bot_id, session_id, processed, created_at')
      .neq('webhook_type', 'replay')
      .neq('webhook_type', 'test')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: webhooks, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      webhooks: webhooks || [],
      total: webhooks?.length || 0
    });

  } catch (error) {
    console.error('❌ Failed to fetch webhooks:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch webhooks',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}