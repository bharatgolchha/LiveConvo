import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { headers } from 'next/headers';
import { broadcastTranscript } from '@/lib/recall-ai/transcript-broadcaster';

interface RecallWebhookEvent {
  event: 'transcript.data' | 'transcript.partial_data' | 'bot.joining_call' | 'bot.in_waiting_room' | 'bot.in_call_not_recording' | 'bot.recording_permission_allowed' | 'bot.recording_permission_denied' | 'bot.in_call_recording' | 'bot.call_ended' | 'bot.done' | 'bot.fatal';
  data: any;
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

  console.log(`🔄 Bot status change: ${botId} -> ${status}`);

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
      await markRecordingCompleted(botId, timestamp, session, supabase);
      break;
    
    case 'fatal':
      await updateBotUsageStatus(botId, 'failed', timestamp, supabase);
      await markRecordingCompleted(botId, timestamp, session, supabase);
      break;
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
 * Fallback: Ensure bot usage tracking from transcript events
 * This is used when bot status webhooks are not configured
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
): Promise<void> {
  // Get current bot usage data
  const { data: botUsage } = await supabase
    .from('bot_usage_tracking')
    .select('recording_started_at')
    .eq('bot_id', botId)
    .single();

  if (!botUsage?.recording_started_at) {
    console.warn(`⚠️ No recording start time found for bot ${botId}`);
    return;
  }

  const startTime = new Date(botUsage.recording_started_at);
  const endTime = new Date(timestamp);
  const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
  const billableMinutes = Math.ceil(durationSeconds / 60);

  await finalizeRecordingUsage(
    botId,
    botUsage.recording_started_at,
    timestamp,
    durationSeconds,
    billableMinutes,
    session,
    supabase
  );
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
      session.session_id,
      startedAt,
      durationSeconds,
      supabase
    );
  }

  // Update session with bot recording info
  await supabase
    .from('sessions')
    .update({
      recording_duration_seconds: durationSeconds,
      bot_recording_minutes: billableMinutes,
      updated_at: new Date().toISOString()
    })
    .eq('id', session.session_id);

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
    
    const event: RecallWebhookEvent = await request.json();
    console.log('🎯 Webhook event type:', event.event);
    
    // The bot information is nested inside the data object according to the documentation
    const transcriptData = event.data as TranscriptData;
    const botId = transcriptData.bot?.id || '00000000-0000-0000-0000-000000000000';
    console.log('🤖 Bot ID:', botId);
    
    // Store webhook event
    const supabase = createServerSupabaseClient();
    
    await supabase.from('recall_ai_webhooks').insert({
      session_id: sessionId,
      bot_id: botId,
      event_type: event.event,
      event_data: event.data,
      processed: false,
    });

    // Track bot usage for bot status events
    const botStatusEvents = [
      'bot.joining_call', 'bot.in_waiting_room', 'bot.in_call_not_recording', 
      'bot.recording_permission_allowed', 'bot.recording_permission_denied', 
      'bot.in_call_recording', 'bot.call_ended', 'bot.done', 'bot.fatal'
    ];
    
    if (botId && botStatusEvents.includes(event.event as any)) {
      await trackBotUsage(sessionId, botId, event.event, event.data, supabase);
    }

    // Process event based on type
    switch (event.event) {
      case 'transcript.data':
        await handleTranscriptData(sessionId, event.data as TranscriptData, false);
        // Fallback: Track bot usage based on transcript events if no status events are coming
        if (botId && botId !== '00000000-0000-0000-0000-000000000000') {
          await ensureBotUsageTrackingFromTranscript(sessionId, botId, supabase);
        }
        break;
        
      case 'transcript.partial_data':
        await handleTranscriptData(sessionId, event.data as TranscriptData, true);
        break;
        
      // These events are not currently supported by Recall.ai webhook
      // case 'participant.events':
      //   await handleParticipantEvent(sessionId, event.data);
      //   break;
        
      // case 'recording.completed':
      //   await handleRecordingCompleted(sessionId, event.data);
      //   break;
        
      // case 'bot.status_changed':
      //   await handleBotStatusChanged(sessionId, event.data);
      //   break;
    }

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
  
  // Get session to find participant names
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('participant_me, participant_them')
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

  // For partial data, just broadcast without storing
  if (isPartial) {
    const partialId = `partial-${Date.now()}-${speakerAlias}`;
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
        sequenceNumber: nextSequence
      }
    };
    
    console.log('📦 Broadcast data:', JSON.stringify(broadcastData, null, 2));
    broadcastTranscript(sessionId, broadcastData);
    console.log('✅ Broadcast complete');
  }

  // Update session duration - for now, just skip this update
  // TODO: Implement proper duration tracking
  console.log(`Session duration would increase by ${endTime - startTime} seconds`);
}

async function handleParticipantEvent(sessionId: string, data: any) {
  const supabase = createServerSupabaseClient();
  
  // Store participant events for analytics
  await supabase.from('session_timeline_events').insert({
    session_id: sessionId,
    event_type: data.type, // 'joined', 'left', 'started_speaking', etc.
    event_data: data,
    timestamp: new Date(data.timestamp * 1000).toISOString(),
  });
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
