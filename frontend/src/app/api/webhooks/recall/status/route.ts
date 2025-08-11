import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import * as crypto from 'crypto';
import { WebhookEventProcessor } from '@/lib/webhooks/processor';
import { WebhookRateLimiter } from '@/lib/webhooks/rate-limiter';

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

interface CalendarSyncWebhookEvent {
  event: 'calendar.sync_events';
  data: {
    calendar_id: string;
    last_updated_ts: string;
  };
}

interface CalendarUpdateWebhookEvent {
  event: 'calendar.update';
  data: {
    calendar_id: string;
  };
}

type WebhookEvent = BotStatusWebhookEvent | CalendarSyncWebhookEvent | CalendarUpdateWebhookEvent;

/**
 * Global webhook handler for bot status events from Recall.ai
 * This handles status events for ALL bots, not just specific sessions
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🌐 Global bot status webhook received');
    
    // Check rate limit
    const rateLimitResult = await WebhookRateLimiter.checkRateLimit(request, {
      windowMs: 60000, // 1 minute
      maxRequests: 200 // 200 webhooks per minute
    });
    
    if (!rateLimitResult.allowed) {
      console.warn('⚠️ Webhook rate limit exceeded');
      await WebhookRateLimiter.logSuspiciousActivity(request, 'Rate limit exceeded');
      
      return NextResponse.json({ 
        error: 'Rate limit exceeded',
        resetTime: rateLimitResult.resetTime 
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '200',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      });
    }
    
    // Verify webhook source IP (optional - enable for production)
    if (process.env.NODE_ENV === 'production' && process.env.VERIFY_WEBHOOK_SOURCE === 'true') {
      const isValidSource = await WebhookRateLimiter.verifyWebhookSource(request);
      if (!isValidSource) {
        await WebhookRateLimiter.logSuspiciousActivity(request, 'Invalid source IP');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    // Get the raw body for signature verification
    const body = await request.text();
    
    // Verify webhook authenticity
    const signature = request.headers.get('x-recall-signature');
    const webhookSecret = process.env.RECALL_AI_WEBHOOK_SECRET;
    
    if (signature && webhookSecret) {
      const timestamp = request.headers.get('x-recall-timestamp');
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
    
    const event: WebhookEvent = JSON.parse(body);
    
    // Handle calendar sync events
    if (event.event === 'calendar.sync_events') {
      console.log('📅 Calendar sync event received:', {
        calendarId: event.data.calendar_id,
        lastUpdated: event.data.last_updated_ts
      });
      
      const supabase = createServerSupabaseClient();
      
      // Get calendar connection by recall_calendar_id
      const { data: connection, error: connectionError } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('recall_calendar_id', event.data.calendar_id)
        .single();

      if (connectionError || !connection) {
        console.error('Calendar connection not found:', event.data.calendar_id);
        return NextResponse.json({ received: true, error: 'Connection not found' });
      }

      // Log webhook event
      await supabase
        .from('calendar_webhooks')
        .insert({
          calendar_connection_id: connection.id,
          event_type: 'calendar.sync_events',
          payload: event,
          processed_at: new Date().toISOString()
        });

      // Fetch events from Recall.ai
      const recallApiKey = process.env.RECALL_AI_API_KEY;
      const recallRegion = process.env.RECALL_AI_REGION || 'us-west-2';
      
      if (!recallApiKey) {
        console.error('Recall.ai API key not configured');
        return NextResponse.json({ error: 'Recall.ai not configured' }, { status: 500 });
      }

      try {
        console.log('Fetching calendar events from Recall.ai...');
        const recallResponse = await fetch(
          `https://${recallRegion}.recall.ai/api/v2/calendar-events/?calendar_id=${connection.recall_calendar_id}`,
          {
            headers: {
              'Authorization': `Token ${recallApiKey}`
            }
          }
        );

        if (!recallResponse.ok) {
          console.error('Failed to fetch events from Recall.ai:', recallResponse.status);
          return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
        }

        const recallEvents = await recallResponse.json();
        console.log(`Fetched ${recallEvents.results?.length || 0} events from Recall.ai`);

        // Clear existing events and insert new ones
        await supabase
          .from('calendar_events')
          .delete()
          .eq('calendar_connection_id', connection.id);

        if (recallEvents.results && recallEvents.results.length > 0) {
          const activeEvents = recallEvents.results.filter((e: { is_deleted?: boolean }) => !e.is_deleted);
          
          // Filter out events older than 60 days
          const sixtyDaysAgo = new Date();
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
          
          const validEvents = activeEvents.filter((event: { start_time: string; raw?: { summary?: string; title?: string; subject?: string } }) => {
            const eventDate = new Date(event.start_time);
            if (eventDate < sixtyDaysAgo) {
              console.warn(`Filtering out stale event in webhook: ${event.raw?.summary || event.raw?.title || 'Untitled'} from ${event.start_time}`);
              return false;
            }
            return true;
          });
          
          console.log(`Webhook: Filtered ${activeEvents.length} active events to ${validEvents.length} valid events`);
          
          // Recall event raw structure is dynamic so we cast to any.
          const eventsToInsert = validEvents.map((event: any) => ({
            calendar_connection_id: connection.id,
            external_event_id: event.id,
            title: event.raw?.subject || event.raw?.summary || event.raw?.title || 'Untitled Event',
            description: event.raw?.description || null,
            start_time: event.start_time,
            end_time: event.end_time,
            meeting_url: event.meeting_url || event.raw?.onlineMeeting?.joinUrl || event.raw?.onlineMeetingUrl || event.raw?.webLink || null,
            attendees: (Array.isArray(event.raw?.attendees) ? event.raw.attendees : []).map((att: any) => ({
              email: att.email || null,
              name: att.displayName || att.name || null,
              response_status: (att.response_status || att.responseStatus || '').toLowerCase().replace('needsaction', 'needs_action') || null,
              is_organizer: Boolean(att.organizer || att.self || false)
            })),
            location: event.raw?.location || null,
            organizer_email: event.raw?.organizer?.email || connection.email,
            is_organizer: event.raw?.organizer?.email === connection.email,
            raw_data: event
          }));

          if (eventsToInsert.length > 0) {
            await supabase
              .from('calendar_events')
              .insert(eventsToInsert);
          }
        }

        // Update last sync time
        await supabase
          .from('calendar_connections')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', connection.id);

        console.log('✅ Calendar sync completed successfully');
        return NextResponse.json({ 
          success: true, 
          type: 'calendar_sync',
          events_synced: recallEvents.results?.length || 0
        });
        
      } catch (syncError) {
        console.error('Calendar sync error:', syncError);
        return NextResponse.json({ 
          error: 'Sync failed', 
          details: syncError instanceof Error ? syncError.message : 'Unknown error' 
        }, { status: 500 });
      }
    }
    
    // Handle calendar.update events (different structure than calendar.sync_events)
    if (event.event === 'calendar.update') {
      console.log('📅 Calendar update event received:', {
        calendarId: (event as any).data.calendar_id
      });
      
      // Log the event and return success
      // The calendar.update event just notifies that something changed
      // It doesn't require the same processing as calendar.sync_events
      return NextResponse.json({ 
        success: true, 
        type: 'calendar_update',
        message: 'Calendar update notification received'
      });
    }
    
    // Handle bot status events
    const botEvent = event as BotStatusWebhookEvent;
    
    // Safely access nested properties with validation
    if (!botEvent.data || !botEvent.data.bot || !botEvent.data.data) {
      console.error('❌ Invalid webhook payload structure:', JSON.stringify(event));
      return NextResponse.json({ 
        error: 'Invalid webhook payload', 
        received: true 
      }, { status: 400 });
    }
    
    console.log('🎯 Bot status event:', {
      type: botEvent.event,
      botId: botEvent.data.bot.id,
      code: botEvent.data.data.code,
      subCode: botEvent.data.data.sub_code,
      timestamp: botEvent.data.data.updated_at,
      metadata: botEvent.data.bot.metadata
    });
    
    const supabase = createServerSupabaseClient();
    
    // Extract bot and session info with safety checks
    const botId = botEvent.data.bot.id;
    if (!botId) {
      console.error('❌ Missing bot ID in webhook payload');
      return NextResponse.json({ 
        error: 'Missing bot ID', 
        received: true 
      }, { status: 400 });
    }
    
    let sessionId = botEvent.data.bot.metadata?.session_id;
    const statusCode = botEvent.data.data.code;
    const timestamp = botEvent.data.data.updated_at || new Date().toISOString();
    
    // Check for duplicate webhook events
    const webhookHash = `${botId}-${botEvent.event}-${timestamp}`;
    const { data: existingWebhook } = await supabase
      .from('webhook_logs')
      .select('id')
      .eq('webhook_type', 'bot_status')
      .eq('event_type', botEvent.event)
      .eq('bot_id', botId)
      .eq('created_at', timestamp)
      .single();
      
    if (existingWebhook) {
      console.log(`⚠️ Duplicate webhook event detected for bot ${botId}, event ${botEvent.event} at ${timestamp}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Duplicate webhook event, skipped processing',
        duplicate: true
      });
    }
    
    // Log webhook event for debugging
    await supabase.from('webhook_logs').insert({
      webhook_type: 'bot_status',
      event_type: botEvent.event,
      bot_id: botId,
      session_id: sessionId,
      payload: botEvent,
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
    switch (botEvent.event) {
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
        await handlePermissionDenied(botId, sessionId, timestamp, botEvent.data.data.sub_code, supabase);
        break;
        
      case 'bot.call_ended':
      case 'bot.done':
        await handleBotCompleted(botId, sessionId, timestamp, session, supabase);
        break;
        
      case 'bot.fatal':
        await handleBotFailed(botId, sessionId, timestamp, botEvent.data.data.sub_code, session, supabase);
        break;
    }
    
    // Broadcast event to connected clients via SSE
    if (sessionId && session) {
      await WebhookEventProcessor.processBotStatusEvent({
        type: botEvent.event,
        botId,
        sessionId,
        userId: session.user_id,
        organizationId: session.organization_id,
        status: statusCode,
        data: botEvent.data.data,
        timestamp
      });
    }
    
    // Mark webhook as processed
    await supabase
      .from('webhook_logs')
      .update({ processed: true, processing_time_ms: Date.now() - startTime })
      .match({ 
        webhook_type: 'bot_status',
        event_type: botEvent.event,
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
      event: botEvent.event,
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
  session: { user_id: string; organization_id: string },
  supabase: ReturnType<typeof createServerSupabaseClient>
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
  supabase: ReturnType<typeof createServerSupabaseClient>
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
  session: { user_id: string; organization_id: string },
  supabase: ReturnType<typeof createServerSupabaseClient>
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
        status: 'active',
        recall_bot_status: 'recording',
        recording_started_at: timestamp,
        updated_at: new Date().toISOString()
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
  supabase: ReturnType<typeof createServerSupabaseClient>
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
  session: { user_id: string; organization_id: string },
  supabase: ReturnType<typeof createServerSupabaseClient>
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
  
  // Check if already completed to prevent duplicate processing
  if (botUsage.status === 'completed' && botUsage.recording_ended_at) {
    console.log(`✅ Bot ${botId} already completed, skipping duplicate processing`);
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
    
    // Trigger summary generation and email notification
    if (targetSessionId && session) {
      console.log('🔄 Triggering automatic summary generation for completed session');
      try {
        // Get session details for summary generation
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', targetSessionId)
          .single();
          
        const { data: sessionContext } = await supabase
          .from('session_context')
          .select('text_context')
          .eq('session_id', targetSessionId)
          .single();
          
        // Call the finalize endpoint using the service-role key. The finalize
        // route now accepts the service-role token and will infer the correct
        // user from the session owner.
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
          console.error('❌ Service role key not configured for auto-finalization');
          return;
        }

        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.APP_URL ||
          (process.env.NEXT_PUBLIC_VERCEL_URL
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
            : process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000');
        const finalizeUrl = `${baseUrl}/api/sessions/${targetSessionId}/finalize`;
        
        const finalizePayload = {
          conversationType: sessionData?.conversation_type,
          conversationTitle: sessionData?.title,
          textContext: sessionContext?.text_context,
          participantMe: sessionData?.participant_me,
          participantThem: sessionData?.participant_them
        };
        
        const response = await fetch(finalizeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`
          },
          body: JSON.stringify(finalizePayload)
        });
        
        if (response.ok) {
          console.log('✅ Auto-finalization triggered successfully');
        } else {
          const errorText = await response.text();
          console.error('❌ Auto-finalization failed:', response.status, errorText);
        }
      } catch (error) {
        console.error('❌ Error triggering auto-finalization:', error);
        // Don't fail the webhook processing if finalization fails
      }
    }
  }
  
  console.log(`✅ Bot ${botId} completed: ${durationSeconds}s = ${billableMinutes} billable minutes`);
}

async function handleBotFailed(
  botId: string,
  sessionId: string | undefined,
  timestamp: string,
  subCode: string | null,
  session: { user_id: string; organization_id: string },
  supabase: ReturnType<typeof createServerSupabaseClient>
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
  supabase: ReturnType<typeof createServerSupabaseClient>
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