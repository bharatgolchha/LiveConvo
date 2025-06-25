import { createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { RecallAIClient } from '@/lib/recall-ai/client';

/**
 * User-facing endpoint to sync bot status for all their sessions
 * Can sync a single session or all sessions with issues
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userClient = createAuthenticatedSupabaseClient(token);
    
    // Check user authentication
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, syncAll = false } = body;

    const serviceClient = createServerSupabaseClient();
    
    console.log(`🔄 Bot status sync requested by user ${user.id}`, { sessionId, syncAll });

    // Get sessions to sync
    let sessionsToSync = [];
    
    if (sessionId) {
      // Sync specific session
      const { data: session } = await serviceClient
        .from('sessions')
        .select(`
          id,
          recall_bot_id,
          recall_bot_status,
          bot_recording_minutes,
          user_id,
          organization_id,
          title
        `)
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();
        
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      sessionsToSync = [session];
    } else if (syncAll) {
      // Sync all sessions with potential issues
      const { data: sessions } = await serviceClient
        .from('sessions')
        .select(`
          id,
          recall_bot_id,
          recall_bot_status,
          bot_recording_minutes,
          user_id,
          organization_id,
          title
        `)
        .eq('user_id', user.id)
        .not('recall_bot_id', 'is', null)
        .or('recall_bot_status.eq.recording,bot_recording_minutes.eq.0')
        .order('created_at', { ascending: false })
        .limit(50); // Limit to prevent abuse
        
      sessionsToSync = sessions || [];
    } else {
      return NextResponse.json({ error: 'Must specify sessionId or syncAll' }, { status: 400 });
    }

    if (sessionsToSync.length === 0) {
      return NextResponse.json({ 
        message: 'No sessions found to sync',
        synced: 0 
      });
    }

    console.log(`📊 Found ${sessionsToSync.length} sessions to sync`);

    const recallClient = new RecallAIClient({
      apiKey: process.env.RECALL_AI_API_KEY!,
      region: (process.env.RECALL_AI_REGION as 'us-west-2' | 'us-east-1' | 'eu-west-1') || 'us-west-2',
      webhookUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/recall'
    });

    const results = {
      synced: 0,
      updated: 0,
      errors: 0,
      sessions: [] as any[]
    };

    // Process each session
    for (const session of sessionsToSync) {
      results.synced++;
      
      if (!session.recall_bot_id) {
        results.sessions.push({
          sessionId: session.id,
          title: session.title,
          status: 'skipped',
          reason: 'No bot ID'
        });
        continue;
      }

      try {
        // Get bot usage tracking
        const { data: botUsage } = await serviceClient
          .from('bot_usage_tracking')
          .select('*')
          .eq('bot_id', session.recall_bot_id)
          .single();

        // Get bot status from Recall.ai
        const recallBot = await recallClient.getBot(session.recall_bot_id);
        const botData = recallBot as any;
        
        // Determine status
        let recallStatus = 'unknown';
        if (botData.status?.code) {
          recallStatus = botData.status.code;
        } else if (botData.status_changes?.length > 0) {
          const latest = botData.status_changes[botData.status_changes.length - 1];
          recallStatus = latest.code;
        }
        
        const isCompleted = ['done', 'call_ended', 'completed'].includes(recallStatus);
        const isFailed = ['error', 'fatal'].includes(recallStatus);
        
        // Check if update is needed
        const needsUpdate = 
          (isCompleted && session.recall_bot_status !== 'completed') ||
          (isFailed && session.recall_bot_status !== 'failed') ||
          (session.bot_recording_minutes === 0 && botUsage?.billable_minutes > 0);

        if (needsUpdate) {
          const endTime = botData.completed_at || new Date().toISOString();
          let durationSeconds = 0;
          let billableMinutes = 0;
          
          // Calculate from Recall.ai data if local data is missing
          if (botData.status_changes?.length > 0) {
            const joinTime = botData.status_changes.find((s: any) => 
              s.code === 'joining_call' || s.code === 'in_call_recording'
            )?.created_at;
            
            if (joinTime) {
              const startMs = new Date(joinTime).getTime();
              const endMs = new Date(endTime).getTime();
              durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
              billableMinutes = Math.ceil(durationSeconds / 60);
            }
          }
          
          // Use bot usage data if available
          if (botUsage && botUsage.billable_minutes > 0) {
            billableMinutes = botUsage.billable_minutes;
            durationSeconds = botUsage.total_recording_seconds;
          }
          
          // Update bot usage tracking
          if (botUsage) {
            await serviceClient
              .from('bot_usage_tracking')
              .update({
                status: isCompleted ? 'completed' : 'failed',
                recording_ended_at: endTime,
                total_recording_seconds: durationSeconds,
                billable_minutes: billableMinutes,
                updated_at: new Date().toISOString()
              })
              .eq('bot_id', session.recall_bot_id);
          }
          
          // Update session
          await serviceClient
            .from('sessions')
            .update({
              status: isCompleted ? 'completed' : 'failed',
              recall_bot_status: isCompleted ? 'completed' : 'failed',
              recording_ended_at: endTime,
              recording_duration_seconds: durationSeconds,
              bot_recording_minutes: billableMinutes,
              bot_billable_amount: parseFloat((billableMinutes * 0.10).toFixed(2)),
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);
          
          results.updated++;
          results.sessions.push({
            sessionId: session.id,
            title: session.title,
            status: 'updated',
            oldStatus: session.recall_bot_status,
            newStatus: isCompleted ? 'completed' : 'failed',
            billableMinutes,
            cost: `$${(billableMinutes * 0.10).toFixed(2)}`
          });
          
          console.log(`✅ Updated session ${session.id}: ${billableMinutes} minutes`);
        } else {
          results.sessions.push({
            sessionId: session.id,
            title: session.title,
            status: 'up-to-date',
            currentStatus: session.recall_bot_status,
            billableMinutes: session.bot_recording_minutes
          });
        }
        
      } catch (error) {
        console.error(`❌ Error syncing session ${session.id}:`, error);
        results.errors++;
        results.sessions.push({
          sessionId: session.id,
          title: session.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ User sync completed in ${duration}ms: ${results.updated}/${results.synced} updated`);

    return NextResponse.json({
      success: true,
      message: `Synced ${results.synced} sessions, updated ${results.updated}`,
      duration,
      ...results
    });

  } catch (error) {
    console.error('❌ Bot sync error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync bot status',
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}