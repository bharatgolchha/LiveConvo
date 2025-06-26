import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { headers } from 'next/headers';
import { broadcastTranscript } from '@/lib/recall-ai/transcript-broadcaster';

interface RecallWebhookEvent {
  event: 'transcript.data' | 'transcript.partial_data' | 'participant_events.join' | 'participant_events.leave' | 'participant_events.update' | 'participant_events.speech_on' | 'participant_events.speech_off' | 'participant_events.webcam_on' | 'participant_events.webcam_off' | 'participant_events.screenshare_on' | 'participant_events.screenshare_off' | 'participant_events.chat_message' | 'bot.joining_call' | 'bot.in_waiting_room' | 'bot.in_call_not_recording' | 'bot.recording_permission_allowed' | 'bot.in_call_recording' | 'bot.recording_permission_denied' | 'bot.call_ended' | 'bot.done' | 'bot.fatal';
  data: any;
}

// Interface for participant event data structure
interface ParticipantEventData {
  data: {
    action?: string;
    participant: {
      id: number;
      name: string | null;
      is_host: boolean;
      platform: string | null;
      extra_data: object;
    };
    timestamp: {
      absolute: string;
      relative: number;
    };
    data?: {
      text?: string;
      to?: string;
    } | null;
  };
  participant_events?: {
    id: string;
    metadata: object;
  };
  realtime_endpoint?: {
    id: string;
    metadata: object;
  };
  recording?: {
    id: string;
    metadata: object;
  };
  bot?: {
    id: string;
    metadata: object;
  };
}

// Updated interface for real-time transcription format
interface TranscriptData {
  data: {
    words: Array<{
      text: string;
      start_timestamp: { relative: number };
      end_timestamp: { relative: number } | null;
    }>;
    participant: {
      id: number;
      name: string | null;
      is_host: boolean;
      platform: string | null;
      extra_data: object;
    };
  };
  realtime_endpoint?: {
    id: string;
    metadata: object;
  };
  transcript?: {
    id: string;
    metadata: object;
  };
  recording?: {
    id: string;
    metadata: object;
  };
  bot?: {
    id: string;
    metadata: {
      session_id?: string;
    };
  };
}

// Note: Failsafe orphan detection moved to cron job (/api/cron/sync-bot-status) for better performance

/**
 * Track bot usage based on Recall.ai webhook events
 */
async function trackBotUsage(
  sessionId: string,
  botId: string,
  eventType: string,
  eventData: any,
  supabase: any
): Promise<void> {
  try {
    console.log(`🤖 Tracking bot usage: ${botId} - ${eventType}`);

    // Get session details for user/org info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id, organization_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('❌ Failed to get session for bot usage tracking:', sessionError);
      return;
    }

    // Handle all bot status events by extracting the status code from the event name
    const statusCode = eventType.replace('bot.', ''); // e.g., 'bot.in_call_recording' -> 'in_call_recording'
    await handleBotStatusChange(sessionId, botId, { ...eventData, status: statusCode }, session, supabase);
  } catch (error) {
    console.error('❌ Error tracking bot usage:', error);
  }
}

/**
 * Handle bot status changes for usage tracking
 */
async function handleBotStatusChange(
  sessionId: string,
  botId: string,
  eventData: any,
  session: any,
  supabase: any
): Promise<void> {
  const status = eventData?.status;
  const timestamp = eventData?.timestamp || new Date().toISOString();

  console.log(`🔄 Bot status change: ${botId} -> ${status} at ${timestamp}`);

  try {
    // Ensure bot usage tracking record exists
    await ensureBotUsageRecord(sessionId, botId, session, supabase);

    switch (status) {
      case 'joining_call':
        await updateBotUsageStatus(botId, 'joining', timestamp, supabase);
        break;
        
      case 'in_waiting_room':
        await updateBotUsageStatus(botId, 'waiting', timestamp, supabase);
        break;
        
      case 'in_call_not_recording':
        await updateBotUsageStatus(botId, 'in_call', timestamp, supabase);
        break;
        
      case 'recording_permission_allowed':
      case 'in_call_recording':
        await updateBotUsageStatus(botId, 'recording', timestamp, supabase);
        await markRecordingStarted(botId, timestamp, supabase);
        break;
      
      case 'recording_permission_denied':
        await updateBotUsageStatus(botId, 'permission_denied', timestamp, supabase);
        break;
      
      case 'call_ended':
      case 'done':
        console.log(`🎯 Processing bot completion for ${botId}`);
        
        // First mark the recording as completed
        const completionResult = await markRecordingCompleted(botId, timestamp, session, supabase);
        
        if (completionResult) {
          console.log(`✅ Bot usage tracking marked as completed for ${botId}`);
        } else {
          console.error(`❌ Failed to mark bot usage as completed for ${botId}`);
        }
        
        // Update the session status to completed
        const { error: sessionUpdateError } = await supabase
          .from('sessions')
          .update({
            status: 'completed',
            recording_ended_at: timestamp,
            recall_bot_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
          
        if (sessionUpdateError) {
          console.error(`❌ Failed to update session status: ${sessionUpdateError.message}`);
        } else {
          console.log(`🏁 Session ${sessionId} marked as completed`);
        }
        
        // Force update the bot usage tracking status even if other updates fail
        await supabase
          .from('bot_usage_tracking')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('bot_id', botId);
          
        break;
      
      case 'fatal':
        await updateBotUsageStatus(botId, 'failed', timestamp, supabase);
        await markRecordingCompleted(botId, timestamp, session, supabase);
        // Mark session as failed
        const { error: failedUpdateError } = await supabase
          .from('sessions')
          .update({
            status: 'failed',
            recall_bot_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
          
        if (failedUpdateError) {
          console.error(`❌ Failed to update session as failed: ${failedUpdateError.message}`);
        } else {
          console.log(`❌ Session ${sessionId} marked as failed`);
        }
        break;
    }
  } catch (error) {
    console.error(`❌ Error in handleBotStatusChange for ${botId}:`, error);
    // Don't throw - allow webhook to succeed even if some updates fail
  }
}

// Note: Recording completion is now handled through bot status events (bot.done, bot.call_ended)

/**
 * Ensure bot usage tracking record exists
 */
async function ensureBotUsageRecord(
  sessionId: string,
  botId: string,
  session: any,
  supabase: any
): Promise<void> {
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
        status: 'recording',
        created_at: new Date().toISOString()
      });

    console.log(`✅ Created bot usage tracking record for ${botId}`);
  }
}

/**
 * Enhanced fallback: Ensure bot usage tracking from transcript events
 * This is used when bot status webhooks are not configured properly
 */
async function ensureBotUsageTrackingFromTranscript(
  sessionId: string,
  botId: string,
  supabase: any
): Promise<void> {
  // Get session data
  const { data: session } = await supabase
    .from('sessions')
    .select('user_id, organization_id')
    .eq('id', sessionId)
    .single();

  if (!session) {
    console.warn(`⚠️ Session not found for bot usage tracking: ${sessionId}`);
    return;
  }

  // Check if bot usage record already exists
  const { data: existing } = await supabase
    .from('bot_usage_tracking')
    .select('id, recording_started_at, status')
    .eq('bot_id', botId)
    .single();

  if (!existing) {
    // Create new bot usage tracking record
    const now = new Date().toISOString();
    await supabase
      .from('bot_usage_tracking')
      .insert({
        bot_id: botId,
        session_id: sessionId,
        user_id: session.user_id,
        organization_id: session.organization_id,
        status: 'recording',
        recording_started_at: now,
        created_at: now
      });

    console.log(`✅ Created bot usage tracking record from transcript for ${botId}`);
  } else if (!existing.recording_started_at && existing.status !== 'recording') {
    // Update existing record to mark recording as started
    const now = new Date().toISOString();
    await supabase
      .from('bot_usage_tracking')
      .update({
        status: 'recording',
        recording_started_at: now,
        updated_at: now
      })
      .eq('bot_id', botId);

    console.log(`🟢 Updated bot usage tracking to recording status for ${botId}`);
  }

  // Note: Failsafe orphan detection now runs via cron job to avoid webhook performance impact
}

/**
 * Update bot usage status
 */
async function updateBotUsageStatus(
  botId: string,
  status: string,
  timestamp: string,
  supabase: any
): Promise<void> {
  await supabase
    .from('bot_usage_tracking')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('bot_id', botId);
}

/**
 * Mark recording as started
 */
async function markRecordingStarted(
  botId: string,
  timestamp: string,
  supabase: any
): Promise<void> {
  await supabase
    .from('bot_usage_tracking')
    .update({
      recording_started_at: timestamp,
      status: 'recording',
      updated_at: new Date().toISOString()
    })
    .eq('bot_id', botId);

  console.log(`🟢 Recording started for bot ${botId}`);
}

/**
 * Mark recording as completed and calculate usage
 */
async function markRecordingCompleted(
  botId: string,
  timestamp: string,
  session: any,
  supabase: any
): Promise<boolean> {
  try {
    // Get current bot usage data
    const { data: botUsage, error: fetchError } = await supabase
      .from('bot_usage_tracking')
      .select('recording_started_at, session_id, status')
      .eq('bot_id', botId)
      .single();

    if (fetchError) {
      console.error(`❌ Error fetching bot usage data for ${botId}:`, fetchError);
      return false;
    }

    // If already completed, skip processing
    if (botUsage?.status === 'completed') {
      console.log(`✅ Bot ${botId} already marked as completed`);
      return true;
    }

    if (!botUsage?.recording_started_at) {
      console.warn(`⚠️ No recording start time found for bot ${botId}, using default duration`);
      // Use the session creation time or current time minus 1 minute as fallback
      const fallbackStartTime = new Date(new Date(timestamp).getTime() - 60000).toISOString();
      
      // Update the bot usage with fallback start time
      await supabase
        .from('bot_usage_tracking')
        .update({
          recording_started_at: fallbackStartTime,
          updated_at: new Date().toISOString()
        })
        .eq('bot_id', botId);
        
      botUsage.recording_started_at = fallbackStartTime;
    }

    const startTime = new Date(botUsage.recording_started_at);
    const endTime = new Date(timestamp);
    const durationSeconds = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
    const billableMinutes = Math.ceil(durationSeconds / 60);

    const sessionId = botUsage?.session_id;
    if (!sessionId) {
      console.error(`❌ No session ID found for bot ${botId}`);
      return false;
    }

    console.log(`📊 Bot ${botId} recording duration: ${durationSeconds}s (${billableMinutes} billable minutes)`);

    await finalizeRecordingUsage(
      botId,
      botUsage.recording_started_at,
      timestamp,
      durationSeconds,
      billableMinutes,
      sessionId,
      session,
      supabase
    );
    
    return true;
  } catch (error) {
    console.error(`❌ Error in markRecordingCompleted for bot ${botId}:`, error);
    return false;
  }
}

/**
 * Finalize recording usage and create tracking entries
 */
async function finalizeRecordingUsage(
  botId: string,
  startedAt: string,
  completedAt: string,
  durationSeconds: number,
  billableMinutes: number,
  sessionId: string,
  session: any,
  supabase: any
): Promise<void> {
  console.log(`🎯 Finalizing bot usage: ${durationSeconds}s = ${billableMinutes} minutes`);

  // Update bot usage tracking
  await supabase
    .from('bot_usage_tracking')
    .update({
      recording_ended_at: completedAt,
      total_recording_seconds: durationSeconds,
      billable_minutes: billableMinutes,
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('bot_id', botId);

  // Create usage tracking entries for each minute
  if (billableMinutes > 0) {
    await createUsageTrackingEntries(
      session.user_id,
      session.organization_id,
      sessionId,
      startedAt,
      durationSeconds,
      supabase
    );
  }

  // Update session with bot recording info
  const billableAmount = (billableMinutes * 0.10).toFixed(2); // $0.10 per minute
  await supabase
    .from('sessions')
    .update({
      recording_ended_at: completedAt,
      recording_duration_seconds: durationSeconds,
      bot_recording_minutes: billableMinutes,
      bot_billable_amount: parseFloat(billableAmount),
      recall_bot_status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  console.log(`✅ Bot usage finalized: ${billableMinutes} billable minutes`);
}

/**
 * Create usage tracking entries for each minute of bot recording
 */
async function createUsageTrackingEntries(
  userId: string,
  organizationId: string,
  sessionId: string,
  startedAt: string,
  durationSeconds: number,
  supabase: any
): Promise<void> {
  const entries = [];
  let remainingSeconds = durationSeconds;
  let currentMinute = new Date(startedAt);
  
  // Reset to start of minute
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
    currentMinute = new Date(currentMinute.getTime() + 60000); // Add 1 minute
  }

  if (entries.length > 0) {
    await supabase
      .from('usage_tracking')
      .insert(entries);

    console.log(`📊 Created ${entries.length} usage tracking entries for bot recording`);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    console.log('📨 Webhook received for session:', sessionId);
    
    // Verify webhook authenticity (if Recall provides signing)
    // const signature = headers().get('x-recall-signature');
    
    const body = await request.text();
    console.log('📦 Raw webhook body:', body);
    
    const event: RecallWebhookEvent = JSON.parse(body);
    console.log('🎯 Webhook event type:', event.event);
    
    // The bot information location varies by event type
    let botId = '00000000-0000-0000-0000-000000000000';
    
    // Extract bot ID based on event structure
    // For bot status events: event.data.bot.id
    // For transcript/participant events: event.data.bot.id
    // Some events might have it at: event.data.data.bot_id
    if (event.data?.bot?.id) {
      botId = event.data.bot.id;
    } else if (event.data?.data?.bot_id) {
      botId = event.data.data.bot_id;
    }
    
    // Store webhook event
    const supabase = createServerSupabaseClient();
    
    // For bot status events, ensure we have the bot ID
    if (event.event.startsWith('bot.') && botId === '00000000-0000-0000-0000-000000000000') {
      console.error('⚠️ Bot status event without bot ID, checking session for bot ID');
      // Try to get bot ID from session
      const { data: session } = await supabase
        .from('sessions')
        .select('recall_bot_id')
        .eq('id', sessionId)
        .single();
      
      if (session?.recall_bot_id) {
        botId = session.recall_bot_id;
        console.log('🔍 Found bot ID from session:', botId);
      }
    }
    
    console.log('🤖 Bot ID:', botId);
    
    // Store webhook event - handle UUID validation
    const { error: webhookInsertError } = await supabase.from('recall_ai_webhooks').insert({
      session_id: sessionId,
      bot_id: botId,
      event_type: event.event,
      event_data: event.data,
      processed: false,
    });
    
    if (webhookInsertError) {
      console.error('⚠️ Failed to store webhook event:', {
        error: webhookInsertError,
        sessionId,
        botId,
        eventType: event.event
      });
      // Continue processing even if storing fails
    }

    // Process event based on type
    let processed = false;
    
    switch (event.event) {
      case 'transcript.data':
        await handleTranscriptData(sessionId, event.data as TranscriptData, false);
        // Fallback: Track bot usage based on transcript events if no status events are coming
        if (botId && botId !== '00000000-0000-0000-0000-000000000000') {
          await ensureBotUsageTrackingFromTranscript(sessionId, botId, supabase);
        }
        processed = true;
        break;
        
      case 'transcript.partial_data':
        await handleTranscriptData(sessionId, event.data as TranscriptData, true);
        processed = true;
        break;
        
      case 'participant_events.join':
      case 'participant_events.leave':
      case 'participant_events.update':
      case 'participant_events.speech_on':
      case 'participant_events.speech_off':
      case 'participant_events.webcam_on':
      case 'participant_events.webcam_off':
      case 'participant_events.screenshare_on':
      case 'participant_events.screenshare_off':
      case 'participant_events.chat_message':
        await handleParticipantEvent(sessionId, event.event, event.data);
        processed = true;
        break;

      // Bot status events - CRITICAL for bot usage tracking
      case 'bot.joining_call':
      case 'bot.in_waiting_room':
      case 'bot.in_call_not_recording':
      case 'bot.recording_permission_allowed':
      case 'bot.in_call_recording':
      case 'bot.recording_permission_denied':
      case 'bot.call_ended':
      case 'bot.done':
      case 'bot.fatal':
        await trackBotUsage(sessionId, botId, event.event, event.data, supabase);
        processed = true;
        break;
        
      default:
        console.log('⚠️ Unhandled webhook event type:', event.event);
        processed = false;
    }

    // Mark webhook as processed (mark the most recent webhook for this bot/event type)
    if (processed) {
      const { data: latestWebhook } = await supabase
        .from('recall_ai_webhooks')
        .select('id')
        .eq('bot_id', botId)
        .eq('event_type', event.event)
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestWebhook) {
        await supabase
          .from('recall_ai_webhooks')
          .update({ processed: true })
          .eq('id', latestWebhook.id);
      }
    }

    // Note: Failsafe orphan detection now runs via cron job (/api/cron/sync-bot-status) every 30 minutes

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Recall webhook error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      sessionId: (await params).sessionId,
      eventType: (error as any).event?.event,
      details: error
    });
    
    // More specific error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConfigError = errorMessage.includes('Missing Supabase configuration');
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: isConfigError ? 'Server configuration error' : errorMessage,
        type: isConfigError ? 'configuration' : 'processing'
      },
      { status: 500 }
    );
  }
}

async function handleTranscriptData(sessionId: string, eventData: TranscriptData, isPartial: boolean) {
  const supabase = createServerSupabaseClient();
  
  // Extract the transcript data
  const { data } = eventData;
  
  // Validate required data
  if (!data || !data.words || data.words.length === 0) {
    console.warn('Transcript data missing or empty:', { sessionId, isPartial });
    return;
  }
  
  // Get session to find participant names and owner info
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('participant_me, participant_them, user_id')
    .eq('id', sessionId)
    .single();
    
  if (sessionError) {
    console.error('Failed to fetch session:', sessionError);
  }

  // Build the full text from words
  const fullText = data.words.map(w => w.text).join(' ').trim();
  
  // Skip empty transcripts
  if (!fullText) {
    return;
  }
  
  // Calculate timing information
  const startTime = data.words[0]?.start_timestamp?.relative || 0;
  const endTime = data.words[data.words.length - 1]?.end_timestamp?.relative || 
                  data.words[data.words.length - 1]?.start_timestamp?.relative || 0;

  // Determine alias (ME/THEM) and the human-readable name to store/display
  const speakerAlias: 'ME' | 'THEM' = data.participant.is_host ? 'ME' : 'THEM';

  // Prefer the name provided by Recall.ai; if absent fall back to the name saved on the session.
  const speakerName = (data.participant.name && data.participant.name.trim().length > 0)
    ? data.participant.name.trim()
    : data.participant.is_host
      ? (session?.participant_me || 'Host')
      : (session?.participant_them || 'Participant');

  // Determine if this speaker is the meeting owner/initiator
  // The owner is the person who created the session (participant_me)
  const isOwner = session?.participant_me && (
    speakerName === session.participant_me || 
    (data.participant.is_host && speakerAlias === 'ME')
  );

  // For partial data, just broadcast without storing
  if (isPartial) {
    // Use a more unique ID with random component to avoid duplicates
    const partialId = `partial-${Date.now()}-${speakerAlias}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('📨 Broadcasting partial transcript:', partialId, 'Text:', fullText);
    
    broadcastTranscript(sessionId, {
      type: 'transcript',
      data: {
        id: partialId,
        text: fullText,
        timestamp: new Date().toISOString(),
        speaker: speakerAlias,
        confidence: 0.85, // Lower confidence for partials
        isFinal: false,
        isPartial: true,
        timeSeconds: startTime,
        displayName: speakerName,
        isOwner: isOwner || false,
        sequenceNumber: 0 // Partial messages don't have sequence numbers
      }
    });
    return;
  }

  // For final data, store in database
  // Get current max sequence number
  const { data: lastTranscript } = await supabase
    .from('transcripts')
    .select('sequence_number')
    .eq('session_id', sessionId)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .single();

  const nextSequence = (lastTranscript?.sequence_number || 0) + 1;

  // Insert transcript to database
  const { data: insertedTranscript, error } = await supabase.from('transcripts').insert({
    session_id: sessionId,
    sequence_number: nextSequence,
    speaker: speakerName,
    content: fullText,
    start_time_seconds: startTime,
    confidence_score: 0.95, // High confidence for final
    is_final: true,
    stt_provider: 'deepgram',
    is_owner: isOwner || false,
  }).select().single();

  if (error) {
    console.error('Failed to insert transcript:', error);
    console.error('Transcript data:', {
      session_id: sessionId,
      sequence_number: nextSequence,
      speaker: speakerName,
      content: fullText,
      start_time_seconds: startTime,
    });
  } else if (insertedTranscript) {
    console.log('Transcript inserted successfully:', insertedTranscript.id);
    // Broadcast to connected clients in the app's format
    console.log('📡 Broadcasting transcript to session:', sessionId, 'Speaker:', speakerAlias, 'Text:', fullText);
    
    const broadcastData = {
      type: 'transcript',
      data: {
        id: insertedTranscript.id,
        text: fullText,
        timestamp: new Date().toISOString(),
        speaker: speakerAlias,
        displayName: speakerName,
        confidence: 0.95,
        isFinal: true,
        timeSeconds: startTime,
        sequenceNumber: nextSequence,
        isOwner: isOwner || false
      }
    };
    
    console.log('📦 Broadcast data:', JSON.stringify(broadcastData, null, 2));
    broadcastTranscript(sessionId, broadcastData);
    console.log('✅ Broadcast complete');
  }

  // Update session duration with the latest transcript end time
  const durationIncrease = endTime - startTime;
  console.log(`Session duration would increase by ${durationIncrease} seconds`);
  
  if (durationIncrease > 0) {
    // Update the session's recording duration to the latest end time
    await supabase
      .from('sessions')
      .update({
        recording_duration_seconds: Math.round(endTime),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
      
    console.log(`📊 Updated session duration to ${Math.round(endTime)} seconds`);
  }
}

async function handleParticipantEvent(sessionId: string, eventType: string, data: ParticipantEventData) {
  try {
    const supabase = createServerSupabaseClient();
    
    console.log('👥 Participant event:', eventType, 'for session:', sessionId);
    
    // Extract participant info - the structure is nested under data.data
    const participantData = data.data;
    const participant = participantData?.participant;
    const timestamp = participantData?.timestamp;
    
    // Store participant events for analytics
    const { error: insertError } = await supabase.from('session_timeline_events').insert({
      session_id: sessionId,
      event_type: eventType,
      event_data: data,
      timestamp: timestamp?.absolute || new Date().toISOString(),
    });
    
    if (insertError) {
      console.error('❌ Failed to insert participant event:', insertError);
      // Continue processing even if insert fails
    }
    
    // Log participant join/leave for debugging
    if (eventType === 'participant_events.join') {
      console.log(`✅ Participant joined: ${participant?.name || 'Unknown'} (ID: ${participant?.id})`);
    } else if (eventType === 'participant_events.leave') {
      console.log(`👋 Participant left: ${participant?.name || 'Unknown'} (ID: ${participant?.id})`);
    }
  } catch (error) {
    console.error('❌ Error handling participant event:', error);
    // Don't throw - allow webhook to succeed even if this fails
  }
}

async function handleBotStatusChanged(sessionId: string, data: any) {
  const supabase = createServerSupabaseClient();
  
  // Update session based on bot status
  const statusMap: Record<string, string> = {
    'joining': 'active',
    'in_call': 'active', 
    'completed': 'completed',
    'failed': 'failed',
  };

  if (statusMap[data.status]) {
    await supabase.from('sessions').update({
      status: statusMap[data.status],
    }).eq('id', sessionId);
  }
}
