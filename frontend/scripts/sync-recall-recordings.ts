/**
 * Script to sync Recall.ai recording URLs for existing sessions
 * Run with: npx tsx scripts/sync-recall-recordings.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

// Also try loading production env if local doesn't have all values
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RECALL_API_KEY = process.env.RECALL_API_KEY;
const RECALL_REGION = process.env.RECALL_REGION || 'us-west-2';

console.log('Environment check:');
console.log('  SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
console.log('  RECALL_API_KEY:', RECALL_API_KEY ? '✓' : '✗');
console.log('  RECALL_REGION:', RECALL_REGION);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RECALL_API_KEY) {
  console.error('\n❌ Missing required environment variables');
  console.error('Please ensure these are set in .env.local or .env.production.local');
  process.exit(1);
}

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Recall API functions
async function getBotWithRecordings(botId: string) {
  const response = await fetch(
    `https://${RECALL_REGION}.recall.ai/api/v1/bot/${botId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get bot: ${response.statusText}`);
  }

  return response.json();
}

function extractVideoUrl(recording: any): string | null {
  const videoMixed = recording.media_shortcuts?.video_mixed;
  if (videoMixed?.status?.code === 'done' && videoMixed?.data?.download_url) {
    return videoMixed.data.download_url;
  }
  return null;
}

async function syncRecordings() {
  console.log('🔄 Starting Recall.ai recordings sync...\n');

  try {
    // Get sessions with bots but no recording URLs
    const { data: sessions, error: fetchError } = await supabase
      .from('sessions')
      .select('id, recall_bot_id, recall_recording_id, recall_recording_url, title, created_at')
      .not('recall_bot_id', 'is', null)
      .is('recall_recording_url', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) {
      console.error('❌ Error fetching sessions:', fetchError);
      return;
    }

    if (!sessions || sessions.length === 0) {
      console.log('✅ No sessions found that need recording URLs');
      return;
    }

    console.log(`📊 Found ${sessions.length} sessions with bots but no recording URLs\n`);

    let processed = 0;
    let updated = 0;
    let failed = 0;

    for (const session of sessions) {
      try {
        console.log(`Processing session ${session.id}...`);
        console.log(`  Title: ${session.title || 'Untitled'}`);
        console.log(`  Bot ID: ${session.recall_bot_id}`);
        
        // Get bot with recordings
        const bot = await getBotWithRecordings(session.recall_bot_id);
        
        if (!bot.recordings || bot.recordings.length === 0) {
          console.log(`  ⚠️  No recordings found`);
          processed++;
          console.log('');
          continue;
        }

        // Get the first recording
        const recording = bot.recordings[0];
        const videoUrl = extractVideoUrl(recording);
        
        if (!videoUrl) {
          console.log(`  ⚠️  No video URL available (status: ${recording.status?.code})`);
          processed++;
          console.log('');
          continue;
        }

        // Update session with recording information
        const { error: updateError } = await supabase
          .from('sessions')
          .update({
            recall_recording_id: recording.id,
            recall_recording_url: videoUrl,
            recall_recording_status: recording.status.code,
            recall_recording_expires_at: recording.expires_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);
          
        if (updateError) {
          console.error(`  ❌ Failed to update: ${updateError.message}`);
          failed++;
        } else {
          console.log(`  ✅ Updated with recording URL`);
          console.log(`  📹 Status: ${recording.status.code}`);
          console.log(`  ⏰ Expires: ${new Date(recording.expires_at).toLocaleString()}`);
          updated++;
        }
        
        processed++;
        console.log('');
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
        processed++;
        console.log('');
      }
    }

    console.log('\n📊 Sync Summary:');
    console.log(`  Total processed: ${processed}`);
    console.log(`  Successfully updated: ${updated}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Skipped (no recording): ${processed - updated - failed}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the sync
syncRecordings().then(() => {
  console.log('\n✅ Sync complete');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Sync failed:', error);
  process.exit(1);
});