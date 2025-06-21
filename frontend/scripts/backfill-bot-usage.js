#!/usr/bin/env node

/**
 * Bot Usage Backfill Script
 * 
 * Runs the bot usage calculation and backfill process directly
 * without requiring API authentication.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Recall.ai API configuration
const RECALL_AI_API_KEY = process.env.RECALL_AI_API_KEY;
const RECALL_AI_BASE_URL = 'https://us-west-2.recall.ai/api/v1';

/**
 * Fetch bot data from Recall.ai API
 */
async function fetchBotData(botId) {
  try {
    const response = await fetch(`${RECALL_AI_BASE_URL}/bot/${botId}`, {
      headers: {
        'Authorization': `Token ${RECALL_AI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bot ${botId}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error fetching bot ${botId}:`, error.message);
    return null;
  }
}

/**
 * Calculate recording duration from bot status changes
 */
function calculateRecordingDuration(statusChanges) {
  if (!statusChanges || !Array.isArray(statusChanges)) {
    return { durationSeconds: 0, startedAt: null, endedAt: null };
  }

  const recordingStart = statusChanges.find(change => 
    change.code === 'in_call_recording'
  );

  const recordingEnd = statusChanges.find(change => 
    ['recording_done', 'call_ended', 'done'].includes(change.code)
  );

  if (!recordingStart || !recordingEnd) {
    return { durationSeconds: 0, startedAt: null, endedAt: null };
  }

  const startTime = new Date(recordingStart.created_at);
  const endTime = new Date(recordingEnd.created_at);
  const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  return {
    durationSeconds: Math.max(0, durationSeconds),
    startedAt: startTime,
    endedAt: endTime
  };
}

/**
 * Create usage tracking entries for billing integration
 */
async function createUsageTrackingEntries(userId, organizationId, sessionId, startedAt, durationSeconds) {
  const startTime = new Date(startedAt);
  const minutes = Math.ceil(durationSeconds / 60);

  console.log(`📊 Creating ${minutes} usage tracking entries...`);

  for (let i = 0; i < minutes; i++) {
    const minuteTimestamp = new Date(startTime.getTime() + (i * 60 * 1000));
    
    const { error } = await supabase
      .from('usage_tracking')
      .upsert({
        user_id: userId,
        organization_id: organizationId,
        session_id: sessionId,
        minute_timestamp: minuteTimestamp.toISOString(),
        seconds_recorded: Math.min(60, durationSeconds - (i * 60)),
        source: 'recall_ai_bot',
        metadata: {
          bot_usage: true,
          minute_index: i + 1,
          total_minutes: minutes
        }
      });

    if (error) {
      console.error(`❌ Error creating usage tracking entry ${i + 1}:`, error);
    }
  }
}

/**
 * Backfill usage for a single session
 */
async function backfillSession(session) {
  console.log(`\n🔄 Processing session ${session.id}...`);
  console.log(`   Bot ID: ${session.recall_bot_id}`);

  // Fetch bot data from Recall.ai
  const botData = await fetchBotData(session.recall_bot_id);
  if (!botData) {
    console.log(`   ⚠️ Could not fetch bot data, skipping...`);
    return;
  }

  // Calculate recording duration
  const { durationSeconds, startedAt, endedAt } = calculateRecordingDuration(botData.status_changes);
  
  if (durationSeconds === 0) {
    console.log(`   ⚠️ No recording duration found, skipping...`);
    return;
  }

  const billableMinutes = Math.ceil(durationSeconds / 60);
  const billableAmount = (billableMinutes * 0.10).toFixed(2); // $0.10 per minute

  console.log(`   ✅ Found recording: ${durationSeconds}s = ${billableMinutes} minutes ($${billableAmount})`);

  // Update session with calculated usage
  const { error: sessionError } = await supabase
    .from('sessions')
    .update({
      bot_recording_minutes: billableMinutes,
      bot_billable_amount: billableAmount,
      recording_started_at: startedAt?.toISOString(),
      recording_ended_at: endedAt?.toISOString(),
      recording_duration_seconds: durationSeconds
    })
    .eq('id', session.id);

  if (sessionError) {
    console.error(`   ❌ Error updating session:`, sessionError);
    return;
  }

  // Create bot usage tracking record
  const { error: trackingError } = await supabase
    .from('bot_usage_tracking')
    .upsert({
      bot_id: session.recall_bot_id,
      session_id: session.id,
      user_id: session.user_id,
      organization_id: session.organization_id,
      recording_started_at: startedAt?.toISOString(),
      recording_ended_at: endedAt?.toISOString(),
      total_recording_seconds: durationSeconds,
      billable_minutes: billableMinutes,
      status: 'completed'
    });

  if (trackingError) {
    console.error(`   ❌ Error creating bot usage tracking:`, trackingError);
    return;
  }

  // Create usage tracking entries for billing
  if (startedAt) {
    await createUsageTrackingEntries(
      session.user_id,
      session.organization_id,
      session.id,
      startedAt.toISOString(),
      durationSeconds
    );
  }

  console.log(`   ✅ Successfully backfilled session ${session.id}`);
}

/**
 * Main backfill process
 */
async function runBackfill() {
  console.log('🚀 Starting Bot Usage Backfill Process...\n');

  // Get all sessions with bots (regardless of current bot_recording_minutes)
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, recall_bot_id, user_id, organization_id, created_at')
    .not('recall_bot_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching sessions:', error);
    process.exit(1);
  }

  console.log(`📊 Found ${sessions?.length || 0} sessions to process\n`);

  if (!sessions || sessions.length === 0) {
    console.log('✅ No sessions need backfilling!');
    return;
  }

  let processed = 0;
  let errors = 0;

  for (const session of sessions) {
    try {
      await backfillSession(session);
      processed++;
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error processing session ${session.id}:`, error);
      errors++;
    }
  }

  console.log(`\n📈 Backfill Summary:`);
  console.log(`   ✅ Processed: ${processed} sessions`);
  console.log(`   ❌ Errors: ${errors} sessions`);
  console.log(`   📊 Total: ${sessions.length} sessions`);
  
  if (processed > 0) {
    console.log(`\n🎉 Bot usage backfill completed successfully!`);
  }
}

// Run the backfill process
if (require.main === module) {
  runBackfill().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runBackfill }; 