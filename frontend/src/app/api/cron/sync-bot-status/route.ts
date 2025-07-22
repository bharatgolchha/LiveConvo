import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { RecallAIClient } from '@/lib/recall-ai/client';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify this is called by a cron job or internal service
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow both cron secret and Vercel cron
    if (authHeader !== `Bearer ${cronSecret}` && 
        request.headers.get('x-vercel-cron') !== '1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    
    console.log('🔍 Daily bot status sync starting...');
    
    // First, run the SQL function to auto-complete orphaned recordings
    const { data: orphanResults, error: orphanError } = await supabase
      .rpc('auto_complete_orphaned_recordings');
      
    if (orphanError) {
      console.error('❌ Error running orphan detection:', orphanError);
    } else if (orphanResults && orphanResults.length > 0) {
      console.log(`🔄 Auto-completed ${orphanResults.filter((r: { action_taken?: string }) => r.action_taken === 'completed').length} orphaned recordings`);
    }
    
    // Find all bot usage records that might be stuck
    const { data: stuckBots, error } = await supabase
      .from('bot_usage_tracking')
      .select('bot_id, session_id, recording_started_at, status, updated_at')
      .in('status', ['recording', 'in_call', 'joining', 'waiting'])
      .lt('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error fetching stuck bots:', error);
      return NextResponse.json({ error: 'Failed to fetch stuck bots' }, { status: 500 });
    }

    if (!stuckBots || stuckBots.length === 0) {
      return NextResponse.json({ message: 'No stuck bots found', count: 0 });
    }

    console.log(`🔍 Found ${stuckBots.length} potentially stuck bots`);

    const recallClient = new RecallAIClient({
      apiKey: process.env.RECALL_AI_API_KEY!,
      region: (process.env.RECALL_AI_REGION as 'us-west-2' | 'us-east-1' | 'eu-west-1') || 'us-west-2',
      webhookUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/recall'
    });

    let updatedCount = 0;
    const results = [];

    for (const bot of stuckBots) {
      try {
        // Fetch bot status from Recall.ai
        const recallBot = await recallClient.getBot(bot.bot_id);
        const botData = recallBot as {
          status?: { code?: string };
          status_changes?: Array<{ code?: string }>;
          completed_at?: string;
        };

        // Check if bot is actually done
        const isDone = botData.status?.code === 'done' || 
                      botData.status?.code === 'call_ended' ||
                      botData.status?.code === 'fatal' ||
                      (botData.status_changes && 
                       botData.status_changes.some((s: { code?: string }) => 
                         s.code === 'done' || s.code === 'call_ended' || s.code === 'fatal'
                      ));

        if (isDone) {
          console.log(`🔄 Updating stuck bot ${bot.bot_id} to completed`);
          
          // Calculate duration
          const endTime = botData.completed_at || new Date().toISOString();
          const startTime = bot.recording_started_at || botData.created_at;
          const durationSeconds = Math.max(0, 
            Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000)
          );
          const billableMinutes = Math.ceil(durationSeconds / 60);

          // Update bot usage tracking
          await supabase
            .from('bot_usage_tracking')
            .update({
              status: 'completed',
              recording_ended_at: endTime,
              total_recording_seconds: durationSeconds,
              billable_minutes: billableMinutes,
              updated_at: new Date().toISOString()
            })
            .eq('bot_id', bot.bot_id);

          // Update session
          await supabase
            .from('sessions')
            .update({
              status: 'completed',
              recall_bot_status: 'completed',
              recording_ended_at: endTime,
              recording_duration_seconds: durationSeconds,
              bot_recording_minutes: billableMinutes,
              bot_billable_amount: parseFloat((billableMinutes * 0.10).toFixed(2)),
              updated_at: new Date().toISOString()
            })
            .eq('id', bot.session_id);

          // Fetch and store recording URL if bot is done
          try {
            if (recallBot.recordings && recallBot.recordings.length > 0) {
              for (const recording of recallBot.recordings) {
                const videoUrl = recallClient.extractVideoUrl(recording);
                
                if (videoUrl) {
                  // Store in bot_recordings table
                  await supabase
                    .from('bot_recordings')
                    .upsert({
                      session_id: bot.session_id,
                      bot_id: bot.bot_id,
                      recording_id: recording.id,
                      recording_url: videoUrl,
                      recording_status: recording.status.code,
                      recording_expires_at: recording.expires_at,
                      duration_seconds: recording.started_at && recording.completed_at
                        ? Math.floor((new Date(recording.completed_at).getTime() - new Date(recording.started_at).getTime()) / 1000)
                        : null,
                      bot_name: recallBot.metadata?.meetingTitle || 'LivePrompt Recording',
                      updated_at: new Date().toISOString()
                    }, {
                      onConflict: 'session_id,bot_id,recording_id'
                    });
                    
                  console.log(`✅ Recording stored for bot ${bot.bot_id}`);
                }
              }
              
              // Also update the main session table with the first recording
              const firstRecording = recallBot.recordings[0];
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
                  .eq('id', bot.session_id);
              }
            }
          } catch (recordingError) {
            console.error(`❌ Failed to fetch/store recording for bot ${bot.bot_id}:`, recordingError);
          }

          updatedCount++;
          results.push({
            botId: bot.bot_id,
            sessionId: bot.session_id,
            status: 'updated',
            billableMinutes
          });
        }
      } catch (error) {
        console.error(`Error processing bot ${bot.bot_id}:`, error);
        results.push({
          botId: bot.bot_id,
          sessionId: bot.session_id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Get webhook health check
    const { data: webhookHealth } = await supabase
      .rpc('check_webhook_health', { hours_back: 24 });
      
    const duration = Date.now() - startTime;
    console.log(`✅ Daily sync completed in ${duration}ms: ${updatedCount}/${stuckBots.length} bots updated`);

    // Log the sync results
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: 'cron_sync',
        event_type: 'daily_sync',
        payload: {
          orphanResults: orphanResults || [],
          stuckBots: results,
          webhookHealth: webhookHealth || [],
          duration
        },
        processed: true,
        processing_time_ms: duration,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: 'Bot status sync completed',
      duration,
      orphansFixed: orphanResults?.filter((r: { action_taken?: string }) => r.action_taken === 'completed').length || 0,
      botsChecked: stuckBots.length,
      botsUpdated: updatedCount,
      webhookHealth: webhookHealth?.slice(0, 5) || [],
      results
    });

  } catch (error) {
    console.error('❌ Error in bot status sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}