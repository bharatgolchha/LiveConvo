import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { headers } from 'next/headers';
import * as crypto from 'crypto';

interface BotStatusWebhookEvent {
  event: 'bot.joining_call' | 'bot.in_waiting_room' | 'bot.in_call_not_recording' | 
         'bot.recording_permission_allowed' | 'bot.in_call_recording' | 
         'bot.recording_permission_denied' | 'bot.call_ended' | 'bot.done' | 'bot.fatal';
  data: {
    data: {
      code: string;
      sub_code: string | null;
      updated_at: string;
    };
    bot: {
      id: string;
      metadata: {
        session_id?: string;
        source?: string;
      };
    };
  };
}

/**
 * Global webhook handler for bot status events from Recall.ai
 * This handles status events for ALL bots, not just specific sessions
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🌐 Global bot status webhook received');
    
    // Get the raw body for signature verification
    const body = await request.text();
    
    // Verify webhook authenticity
    const signature = headers().get('x-recall-signature');
    const webhookSecret = process.env.RECALL_AI_WEBHOOK_SECRET;
    
    if (signature && webhookSecret) {
      const timestamp = headers().get('x-recall-timestamp');
      if (!timestamp) {
        console.error('❌ Missing timestamp header for signature verification');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
      
      // Verify the signature
      const signedContent = `${timestamp}.${body}`;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedContent)
        .digest('hex');
      
      const expectedSigHeader = `v1=${expectedSignature}`;
      
      if (signature !== expectedSigHeader) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
      
      console.log('✅ Webhook signature verified');
    } else if (webhookSecret) {
      console.warn('⚠️ Webhook secret configured but no signature received');
    }
    
    const event: BotStatusWebhookEvent = JSON.parse(body);
    
    console.log('🎯 Bot status event:', {
      type: event.event,
      botId: event.data.bot.id,
      code: event.data.data.code,
      subCode: event.data.data.sub_code,
      timestamp: event.data.data.updated_at
    });
    
    const supabase = createServerSupabaseClient();
    
    // Extract bot and session info
    const botId = event.data.bot.id;
    const sessionId = event.data.bot.metadata?.session_id;
    const statusCode = event.data.data.code;
    const timestamp = event.data.data.updated_at || new Date().toISOString();
    
    // Log webhook event for debugging
    await supabase.from('webhook_logs').insert({
      webhook_type: 'bot_status',
      event_type: event.event,
      bot_id: botId,
      session_id: sessionId,
      payload: event,
      processed: false,
      created_at: new Date().toISOString()
    });
    
    if (!sessionId) {
      console.warn('⚠️ Bot status event without session_id:', botId);
      // Try to find session by bot ID
      const { data: botUsage } = await supabase
        .from('bot_usage_tracking')
        .select('session_id')
        .eq('bot_id', botId)
        .single();
        
      if (botUsage?.session_id) {
        sessionId = botUsage.session_id;
        console.log('🔍 Found session_id from bot_usage_tracking:', sessionId);
      }
    }
    
    // Get session and user info
    let session = null;
    if (sessionId) {
      const { data } = await supabase
        .from('sessions')
        .select('user_id, organization_id')
        .eq('id', sessionId)
        .single();
      session = data;
    }
    
    // Process based on status
    switch (event.event) {
      case 'bot.joining_call':
        await handleBotJoining(botId, sessionId, timestamp, session, supabase);
        break;
        
      case 'bot.in_waiting_room':
        await updateBotStatus(botId, 'waiting', timestamp, supabase);
        break;
        
      case 'bot.in_call_not_recording':
        await updateBotStatus(botId, 'in_call', timestamp, supabase);
        break;
        
      case 'bot.recording_permission_allowed':
      case 'bot.in_call_recording':
        await handleRecordingStarted(botId, sessionId, timestamp, session, supabase);
        break;
        
      case 'bot.recording_permission_denied':
        await handlePermissionDenied(botId, sessionId, timestamp, event.data.data.sub_code, supabase);
        break;
        
      case 'bot.call_ended':
      case 'bot.done':
        await handleBotCompleted(botId, sessionId, timestamp, session, supabase);
        break;
        
      case 'bot.fatal':
        await handleBotFailed(botId, sessionId, timestamp, event.data.data.sub_code, session, supabase);
        break;
    }
    
    // Mark webhook as processed
    await supabase
      .from('webhook_logs')
      .update({ processed: true, processing_time_ms: Date.now() - startTime })
      .match({ 
        webhook_type: 'bot_status',
        event_type: event.event,
        bot_id: botId,
        processed: false
      })
      .order('created_at', { ascending: false })
      .limit(1);
    
    console.log(`✅ Bot status webhook processed in ${Date.now() - startTime}ms`);
    
    return NextResponse.json({ 
      success: true, 
      botId,
      sessionId,
      event: event.event,
      processingTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('❌ Global bot status webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleBotJoining(
  botId: string,
  sessionId: string | undefined,
  timestamp: string,
  session: any,
  supabase: any
) {
  // Ensure bot usage tracking exists
  if (sessionId && session) {
    const { data: existing } = await supabase
      .from('bot_usage_tracking')
      .select('id')
      .eq('bot_id', botId)
      .single();
      
    if (!existing) {
      await supabase
        .from('bot_usage_tracking')
        .insert({
          bot_id: botId,
          session_id: sessionId,
          user_id: session.user_id,
          organization_id: session.organization_id,
          status: 'joining',
          created_at: timestamp
        });
    } else {
      await updateBotStatus(botId, 'joining', timestamp, supabase);
    }
  }
}

async function updateBotStatus(
  botId: string,
  status: string,
  timestamp: string,
  supabase: any
) {
  await supabase
    .from('bot_usage_tracking')
    .update({
      status,
      updated_at: timestamp
    })
    .eq('bot_id', botId);
    
  console.log(`📊 Updated bot ${botId} status to: ${status}`);
}

async function handleRecordingStarted(
  botId: string,
  sessionId: string | undefined,
  timestamp: string,
  session: any,
  supabase: any
) {
  await supabase
    .from('bot_usage_tracking')
    .update({
      status: 'recording',
      recording_started_at: timestamp,
      updated_at: timestamp
    })
    .eq('bot_id', botId);
    
  if (sessionId) {
    await supabase
      .from('sessions')
      .update({
        recall_bot_status: 'recording',
        recording_started_at: timestamp
      })
      .eq('id', sessionId);
  }
  
  console.log(`🎬 Bot ${botId} started recording at ${timestamp}`);
}

async function handlePermissionDenied(
  botId: string,
  sessionId: string | undefined,
  timestamp: string,
  subCode: string | null,
  supabase: any
) {
  await updateBotStatus(botId, 'permission_denied', timestamp, supabase);
  
  if (sessionId) {
    await supabase
      .from('sessions')
      .update({
        status: 'failed',
        recall_bot_status: 'permission_denied',
        error_message: `Recording permission denied: ${subCode || 'Unknown reason'}`
      })
      .eq('id', sessionId);
  }
  
  console.log(`🚫 Bot ${botId} permission denied: ${subCode}`);
}

async function handleBotCompleted(
  botId: string,
  sessionId: string | undefined,
  timestamp: string,
  session: any,
  supabase: any
) {
  console.log(`🏁 Processing bot completion: ${botId}`);
  
  // Get bot usage record
  const { data: botUsage } = await supabase
    .from('bot_usage_tracking')
    .select('*')
    .eq('bot_id', botId)
    .single();
    
  if (!botUsage) {
    console.error(`❌ No bot usage record found for ${botId}`);
    return;
  }
  
  // Calculate duration and billing
  let durationSeconds = 0;
  let billableMinutes = 0;
  
  if (botUsage.recording_started_at) {
    const startTime = new Date(botUsage.recording_started_at).getTime();
    const endTime = new Date(timestamp).getTime();
    durationSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
    billableMinutes = Math.ceil(durationSeconds / 60);
  }
  
  // Update bot usage tracking
  await supabase
    .from('bot_usage_tracking')
    .update({
      status: 'completed',
      recording_ended_at: timestamp,
      total_recording_seconds: durationSeconds,
      billable_minutes: billableMinutes,
      updated_at: new Date().toISOString()
    })
    .eq('bot_id', botId);
  
  // Update session if available
  if (sessionId || botUsage.session_id) {
    const targetSessionId = sessionId || botUsage.session_id;
    
    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        recall_bot_status: 'completed',
        recording_ended_at: timestamp,
        recording_duration_seconds: durationSeconds,
        bot_recording_minutes: billableMinutes,
        bot_billable_amount: parseFloat((billableMinutes * 0.10).toFixed(2)),
        updated_at: new Date().toISOString()
      })
      .eq('id', targetSessionId);
      
    // Create usage tracking entries
    if (billableMinutes > 0 && session) {
      await createUsageTrackingEntries(
        session.user_id,
        session.organization_id,
        targetSessionId,
        botUsage.recording_started_at,
        durationSeconds,
        supabase
      );
    }
  }
  
  console.log(`✅ Bot ${botId} completed: ${durationSeconds}s = ${billableMinutes} billable minutes`);
}

async function handleBotFailed(
  botId: string,
  sessionId: string | undefined,
  timestamp: string,
  subCode: string | null,
  session: any,
  supabase: any
) {
  await updateBotStatus(botId, 'failed', timestamp, supabase);
  
  // Still calculate usage for failed bots that recorded something
  await handleBotCompleted(botId, sessionId, timestamp, session, supabase);
  
  if (sessionId) {
    await supabase
      .from('sessions')
      .update({
        status: 'failed',
        recall_bot_status: 'failed',
        error_message: `Bot failed: ${subCode || 'Unknown error'}`
      })
      .eq('id', sessionId);
  }
  
  console.log(`❌ Bot ${botId} failed: ${subCode}`);
}

async function createUsageTrackingEntries(
  userId: string,
  organizationId: string,
  sessionId: string,
  startedAt: string,
  durationSeconds: number,
  supabase: any
) {
  const entries = [];
  let remainingSeconds = durationSeconds;
  let currentMinute = new Date(startedAt);
  currentMinute.setSeconds(0, 0);

  while (remainingSeconds > 0) {
    const secondsInThisMinute = Math.min(60, remainingSeconds);
    
    entries.push({
      organization_id: organizationId,
      user_id: userId,
      session_id: sessionId,
      minute_timestamp: currentMinute.toISOString(),
      seconds_recorded: secondsInThisMinute
    });

    remainingSeconds -= secondsInThisMinute;
    currentMinute = new Date(currentMinute.getTime() + 60000);
  }

  if (entries.length > 0) {
    await supabase
      .from('usage_tracking')
      .insert(entries);
      
    console.log(`📊 Created ${entries.length} usage tracking entries`);
  }
}