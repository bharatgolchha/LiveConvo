import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { RecallAIClient } from '@/lib/recall-ai/client';

export async function GET(request: NextRequest) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
    
    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    
    console.log('🎬 Starting recording sync...');
    
    // Get all sessions with recall_bot_id but no recordings
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, recall_bot_id, title, created_at')
      .not('recall_bot_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ message: 'No sessions with bots found' });
    }

    console.log(`📊 Found ${sessions.length} sessions with bots`);

    // Check which sessions already have recordings
    const sessionIds = sessions.map(s => s.id);
    const { data: existingRecordings } = await supabase
      .from('bot_recordings')
      .select('session_id')
      .in('session_id', sessionIds);

    const sessionsWithRecordings = new Set(existingRecordings?.map(r => r.session_id) || []);
    const sessionsNeedingRecordings = sessions.filter(s => !sessionsWithRecordings.has(s.id));

    console.log(`🔍 ${sessionsNeedingRecordings.length} sessions need recording sync`);

    const recallClient = new RecallAIClient({
      apiKey: process.env.RECALL_AI_API_KEY!,
      region: (process.env.RECALL_AI_REGION as 'us-west-2' | 'us-east-1' | 'eu-west-1') || 'us-west-2',
      webhookUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/recall'
    });

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const session of sessionsNeedingRecordings) {
      try {
        console.log(`🔄 Fetching recordings for bot ${session.recall_bot_id} (session: ${session.title})`);
        
        // Get bot with recordings
        const bot = await recallClient.getBotWithRecordings(session.recall_bot_id);
        
        if (!bot.recordings || bot.recordings.length === 0) {
          console.log(`⚠️ No recordings found for bot ${session.recall_bot_id}`);
          results.push({
            sessionId: session.id,
            botId: session.recall_bot_id,
            status: 'no_recordings',
            title: session.title
          });
          continue;
        }
        
        // Process all recordings
        for (const recording of bot.recordings) {
          const videoUrl = recallClient.extractVideoUrl(recording);
          
          if (!videoUrl) {
            console.log(`⚠️ No video URL available for recording ${recording.id}`);
            continue;
          }
          
          // Store in bot_recordings table
          const { error: recordingError } = await supabase
            .from('bot_recordings')
            .upsert({
              session_id: session.id,
              bot_id: session.recall_bot_id,
              recording_id: recording.id,
              recording_url: videoUrl,
              recording_status: recording.status.code,
              recording_expires_at: recording.expires_at,
              duration_seconds: recording.started_at && recording.completed_at
                ? Math.floor((new Date(recording.completed_at).getTime() - new Date(recording.started_at).getTime()) / 1000)
                : null,
              bot_name: bot.metadata?.meetingTitle || session.title || 'LivePrompt Recording',
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'session_id,bot_id,recording_id'
            });
            
          if (recordingError) {
            console.error(`❌ Failed to store recording:`, recordingError);
            errorCount++;
          } else {
            console.log(`✅ Recording stored for session ${session.id}`);
            successCount++;
          }
        }
        
        // Also update the main session table with the first recording
        const firstRecording = bot.recordings[0];
        const firstVideoUrl = recallClient.extractVideoUrl(firstRecording);
        
        if (firstVideoUrl) {
          await supabase
            .from('sessions')
            .update({
              recall_recording_id: firstRecording.id,
              recall_recording_url: firstVideoUrl,
              recall_recording_status: firstRecording.status.code,
              recall_recording_expires_at: firstRecording.expires_at,
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);
        }
        
        results.push({
          sessionId: session.id,
          botId: session.recall_bot_id,
          status: 'success',
          title: session.title,
          recordingCount: bot.recordings.length
        });
        
      } catch (error) {
        console.error(`❌ Error processing session ${session.id}:`, error);
        errorCount++;
        results.push({
          sessionId: session.id,
          botId: session.recall_bot_id,
          status: 'error',
          title: session.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Recording sync completed',
      totalSessions: sessions.length,
      sessionsWithRecordings: sessionsWithRecordings.size,
      sessionsProcessed: sessionsNeedingRecordings.length,
      successCount,
      errorCount,
      results
    });

  } catch (error) {
    console.error('❌ Error in recording sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}