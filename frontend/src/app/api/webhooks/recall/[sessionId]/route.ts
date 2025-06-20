import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { headers } from 'next/headers';
import { broadcastTranscript } from '@/lib/recall-ai/transcript-broadcaster';

interface RecallWebhookEvent {
  event: 'transcript.data' | 'transcript.partial_data';
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

    // Process event based on type
    switch (event.event) {
      case 'transcript.data':
        await handleTranscriptData(sessionId, event.data as TranscriptData, false);
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

  // Determine speaker (ME/THEM based on host status)
  const speaker = data.participant.is_host ? 'ME' : 'THEM';
  const speakerName = data.participant.name || (data.participant.is_host ? 
    (session?.participant_me || 'Host') : 
    (session?.participant_them || 'Participant'));

  // For partial data, just broadcast without storing
  if (isPartial) {
    const partialId = `partial-${Date.now()}-${speaker}`;
    console.log('📨 Broadcasting partial transcript:', partialId, 'Text:', fullText);
    
    broadcastTranscript(sessionId, {
      type: 'transcript',
      data: {
        id: partialId,
        text: fullText,
        timestamp: new Date().toISOString(),
        speaker: speaker,
        confidence: 0.85, // Lower confidence for partials
        isFinal: false,
        isPartial: true,
        timeSeconds: startTime
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
    console.log('📡 Broadcasting transcript to session:', sessionId, 'Speaker:', speaker, 'Text:', fullText);
    
    const broadcastData = {
      type: 'transcript',
      data: {
        id: insertedTranscript.id,
        text: fullText,
        timestamp: new Date().toISOString(),
        speaker: speaker, // 'ME' or 'THEM'
        confidence: 0.95,
        isFinal: true,
        timeSeconds: startTime
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

async function handleRecordingCompleted(sessionId: string, data: any) {
  const supabase = createServerSupabaseClient();
  
  // Update session with recording info
  await supabase.from('sessions').update({
    recall_recording_id: data.recording_id,
    status: 'completed',
    recording_ended_at: new Date().toISOString(),
  }).eq('id', sessionId);

  // Mark session as ready for summary generation
  await supabase.from('summaries').insert({
    session_id: sessionId,
    summary_type: 'full',
    status: 'pending',
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