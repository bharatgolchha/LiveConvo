import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { RecallAIClient } from '@/lib/recall-ai/client';

interface SessionData {
  recall_bot_id: string;
  title: string;
  user_id: string;
  organization_id?: string;
}

/**
 * Real-time bot monitoring service
 * Runs every 30 seconds to check for stuck bots and fix them immediately
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow both cron secret and internal calls
    if (authHeader !== `Bearer ${cronSecret}` && 
        request.headers.get('x-vercel-cron') !== '1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Starting real-time bot monitoring...');
    
    const supabase = createServerSupabaseClient();
    
    // 1. Find all active bots (recording or in_call status)
    const { data: activeBots, error: fetchError } = await supabase
      .from('bot_usage_tracking')
      .select(`
        bot_id,
        session_id,
        status,
        recording_started_at,
        updated_at,
        sessions!inner(
          recall_bot_id,
          title,
          user_id,
          organization_id
        )
      `)
      .in('status', ['recording', 'in_call', 'joining', 'waiting']);

    if (fetchError) {
      console.error('❌ Error fetching active bots:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch active bots' }, { status: 500 });
    }

    if (!activeBots || activeBots.length === 0) {
      return NextResponse.json({ 
        message: 'No active bots to monitor',
        duration: Date.now() - startTime
      });
    }

    console.log(`📊 Found ${activeBots.length} active bots to check`);

    const recallClient = new RecallAIClient({
      apiKey: process.env.RECALL_AI_API_KEY!,
      region: (process.env.RECALL_AI_REGION as 'us-west-2' | 'us-east-1' | 'eu-west-1') || 'us-west-2',
      webhookUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/recall'
    });

    const results = {
      checked: 0,
      updated: 0,
      errors: 0,
      details: [] as { botId: string; status: string; updated?: boolean; error?: string }[]
    };

    // Check each active bot
    for (const botRecord of activeBots) {
      results.checked++;
      
      try {
        // Get bot status from Recall.ai
        const recallBot = await recallClient.getBot(botRecord.bot_id);
        const botData = recallBot as unknown as { 
          status?: { code?: string; sub_code?: string; message?: string }; 
          id?: string; 
          meeting_ended_at?: string;
          completed_at?: string;
          status_changes?: Array<{ code: string }>;
        };
        
        // Determine current status from Recall.ai
        let recallStatus = 'unknown';
        if (botData.status?.code) {
          recallStatus = botData.status.code;
        } else if (botData.status_changes?.length > 0) {
          const latest = botData.status_changes[botData.status_changes.length - 1];
          recallStatus = latest.code;
        }
        
        // Map Recall status to our status
        const mappedStatus = mapRecallStatusToLocal(recallStatus);
        
        // Check if status is out of sync
        if (mappedStatus !== botRecord.status) {
          console.log(`🔄 Status mismatch for bot ${botRecord.bot_id}: local=${botRecord.status}, recall=${mappedStatus}`);
          
          // If Recall says completed/failed but we still show active
          if ((mappedStatus === 'completed' || mappedStatus === 'failed') && 
              ['recording', 'in_call', 'joining', 'waiting'].includes(botRecord.status)) {
            
            // Calculate usage if completed
            const endTime = botData.completed_at || new Date().toISOString();
            let durationSeconds = 0;
            let billableMinutes = 0;
            
            if (botRecord.recording_started_at) {
              const startTime = new Date(botRecord.recording_started_at).getTime();
              const endTimeMs = new Date(endTime).getTime();
              durationSeconds = Math.max(0, Math.floor((endTimeMs - startTime) / 1000));
              billableMinutes = Math.ceil(durationSeconds / 60);
            }
            
            // Update bot usage tracking
            await supabase
              .from('bot_usage_tracking')
              .update({
                status: mappedStatus,
                recording_ended_at: endTime,
                total_recording_seconds: durationSeconds,
                billable_minutes: billableMinutes,
                updated_at: new Date().toISOString()
              })
              .eq('bot_id', botRecord.bot_id);
            
            // Update session
            const session = botRecord.sessions as unknown as SessionData;
            await supabase
              .from('sessions')
              .update({
                status: mappedStatus === 'failed' ? 'failed' : 'completed',
                recall_bot_status: mappedStatus,
                recording_ended_at: endTime,
                recording_duration_seconds: durationSeconds,
                bot_recording_minutes: billableMinutes,
                bot_billable_amount: parseFloat((billableMinutes * 0.10).toFixed(2)),
                updated_at: new Date().toISOString()
              })
              .eq('id', botRecord.session_id);
            
            results.updated++;
            results.details.push({
              botId: botRecord.bot_id,
              sessionId: botRecord.session_id,
              title: session.title,
              oldStatus: botRecord.status,
              newStatus: mappedStatus,
              billableMinutes,
              action: 'completed'
            });
            
            console.log(`✅ Fixed stuck bot ${botRecord.bot_id}: ${billableMinutes} minutes`);
          }
        }
        
        // Check for stale recordings (no update for 15+ minutes)
        const minutesSinceUpdate = (Date.now() - new Date(botRecord.updated_at).getTime()) / 1000 / 60;
        if (minutesSinceUpdate > 15 && botRecord.status === 'recording') {
          console.log(`⚠️ Stale recording detected: ${botRecord.bot_id} (${minutesSinceUpdate.toFixed(1)} minutes)`);
          
          // Check last transcript activity
          const { data: lastTranscript } = await supabase
            .from('transcripts')
            .select('created_at')
            .eq('session_id', botRecord.session_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          const minutesSinceTranscript = lastTranscript 
            ? (Date.now() - new Date(lastTranscript.created_at).getTime()) / 1000 / 60
            : minutesSinceUpdate;
          
          if (minutesSinceTranscript > 15) {
            // Force complete the stale recording
            const endTime = lastTranscript?.created_at || botRecord.updated_at;
            const startTime = botRecord.recording_started_at || botRecord.updated_at;
            const durationSeconds = Math.max(0, 
              Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000)
            );
            const billableMinutes = Math.ceil(durationSeconds / 60);
            
            await supabase
              .from('bot_usage_tracking')
              .update({
                status: 'completed',
                recording_ended_at: endTime,
                total_recording_seconds: durationSeconds,
                billable_minutes: billableMinutes,
                updated_at: new Date().toISOString()
              })
              .eq('bot_id', botRecord.bot_id);
            
            const session = botRecord.sessions as SessionData;
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
              .eq('id', botRecord.session_id);
            
            results.updated++;
            results.details.push({
              botId: botRecord.bot_id,
              sessionId: botRecord.session_id,
              title: session.title,
              oldStatus: botRecord.status,
              newStatus: 'completed',
              billableMinutes,
              minutesStale: minutesSinceTranscript,
              action: 'stale-completed'
            });
            
            console.log(`🔧 Auto-completed stale bot ${botRecord.bot_id}: ${billableMinutes} minutes`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error checking bot ${botRecord.bot_id}:`, error);
        results.errors++;
        results.details.push({
          botId: botRecord.bot_id,
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'error'
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Bot monitoring completed in ${duration}ms: ${results.updated}/${results.checked} updated`);

    // Log monitoring results
    if (results.updated > 0) {
      await supabase
        .from('webhook_logs')
        .insert({
          webhook_type: 'bot_monitor',
          event_type: 'monitoring_run',
          payload: results,
          processed: true,
          processing_time_ms: duration,
          created_at: new Date().toISOString()
        });
    }

    return NextResponse.json({
      success: true,
      duration,
      ...results
    });

  } catch (error) {
    console.error('❌ Bot monitoring error:', error);
    return NextResponse.json({ 
      error: 'Bot monitoring failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function mapRecallStatusToLocal(recallStatus: string): string {
  switch (recallStatus) {
    case 'ready':
    case 'created':
      return 'created';
    case 'joining_call':
      return 'joining';
    case 'in_waiting_room':
      return 'waiting';
    case 'in_call':
    case 'in_call_not_recording':
      return 'in_call';
    case 'in_call_recording':
    case 'recording_permission_allowed':
      return 'recording';
    case 'done':
    case 'call_ended':
    case 'completed':
      return 'completed';
    case 'error':
    case 'fatal':
      return 'failed';
    case 'recording_permission_denied':
      return 'permission_denied';
    default:
      return 'unknown';
  }
}