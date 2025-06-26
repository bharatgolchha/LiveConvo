/**
 * Batch sync recordings for all sessions with bots
 * Run with: RECALL_AI_API_KEY=your_key npx tsx scripts/batch-sync-recordings.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });

const RECALL_API_KEY = process.env.RECALL_AI_API_KEY || process.env.RECALL_API_KEY;
const RECALL_REGION = process.env.RECALL_AI_REGION || process.env.RECALL_REGION || 'us-west-2';

if (!RECALL_API_KEY) {
  console.error('Missing RECALL_AI_API_KEY environment variable');
  process.exit(1);
}

// Bot IDs from the query - these need recording URLs
const SESSIONS_TO_SYNC = [
  { id: '19457e4c-1105-4f2e-ade2-ccdb56f1b5d1', bot_id: 'aa347e0c-a4b7-41aa-9146-b786bc76a755', title: 'CYasn' },
  { id: '736753cc-e679-4d08-b01c-a572a75959d7', bot_id: '6e53aa0f-63be-4576-97fd-fa6e1bba3264', title: 'XYZ' },
  { id: '7b0b93d0-ba13-4820-b756-e13033944e6a', bot_id: 'f2e1df63-f50f-4554-ba63-35ffdd9e9d29', title: 'Test444444' },
  { id: '2bdb40c7-9257-42b2-8909-6e86a6edc15f', bot_id: '421c613a-0010-447b-a56d-d1cea5b57458', title: 'Test 3443' },
  { id: 'fef007ee-5865-4773-bf48-bb38cd2e4eea', bot_id: '9c75f7cc-f053-4ec0-9c87-37e5f4a9890c', title: 'Test A' },
  { id: '2c0f3e59-47b5-4c2f-88f8-9267d150b0b7', bot_id: 'd6d24fc3-06eb-49fb-89b1-29eaec30adb7', title: 'ABCCC' },
  { id: 'c8e63b37-db03-49c0-b9d3-8efa61ccf330', bot_id: '9e47ec64-5e7d-4933-ae3a-ba3494509ca2', title: 'Test 243' },
  { id: '6ea67f64-8f0e-4407-8fb2-c25c68744e56', bot_id: '19ba6fa7-a9fe-41f7-813b-d868c7f226f2', title: 'Sffdd' },
  { id: '57c1b693-4f4a-47c6-99db-4bd5d4ec37c3', bot_id: '43174532-47ca-4a9a-9990-b8361a9fcaa4', title: 'Test Meeting 3' },
  { id: 'f5f5993a-42f4-4a3a-83eb-8be70fd678ae', bot_id: 'aa0663d0-83e5-42dc-aaaa-3f49ad328df9', title: 'Test meeting 2' }
];

async function fetchBotRecording(botId: string) {
  try {
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
      throw new Error(`API Error (${response.status}): ${response.statusText}`);
    }

    const bot = await response.json();
    
    if (!bot.recordings || bot.recordings.length === 0) {
      return null;
    }

    const recording = bot.recordings[0];
    const videoUrl = recording.media_shortcuts?.video_mixed?.data?.download_url;
    
    if (!videoUrl) {
      return null;
    }

    return {
      id: recording.id,
      url: videoUrl,
      status: recording.status?.code || 'unknown',
      expiresAt: recording.expires_at
    };
  } catch (error) {
    console.error(`Error fetching bot ${botId}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function syncAllRecordings() {
  console.log('🔄 Starting batch sync of Recall.ai recordings\n');
  console.log(`Found ${SESSIONS_TO_SYNC.length} sessions to process\n`);

  const results = {
    success: 0,
    failed: 0,
    noRecording: 0
  };

  const sqlStatements: string[] = [];

  for (const session of SESSIONS_TO_SYNC) {
    console.log(`Processing: ${session.title} (${session.id})`);
    console.log(`  Bot ID: ${session.bot_id}`);

    const recording = await fetchBotRecording(session.bot_id);

    if (!recording) {
      console.log('  ❌ No recording found\n');
      results.noRecording++;
      continue;
    }

    console.log(`  ✅ Found recording: ${recording.id}`);
    console.log(`  Status: ${recording.status}`);
    console.log(`  Expires: ${recording.expiresAt || 'Never'}\n`);

    // Generate SQL statement
    const sql = `UPDATE sessions SET 
  recall_recording_id = '${recording.id}',
  recall_recording_url = '${recording.url}',
  recall_recording_status = '${recording.status}',
  recall_recording_expires_at = ${recording.expiresAt ? `'${recording.expiresAt}'` : 'NULL'},
  updated_at = NOW()
WHERE id = '${session.id}';`;

    sqlStatements.push(sql);
    results.success++;

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n📊 Summary:');
  console.log(`  Successfully found recordings: ${results.success}`);
  console.log(`  No recordings available: ${results.noRecording}`);
  console.log(`  Failed to fetch: ${results.failed}`);

  if (sqlStatements.length > 0) {
    console.log('\n📋 SQL statements to run:\n');
    console.log('-- Batch update for Recall.ai recordings');
    console.log('BEGIN;');
    sqlStatements.forEach(sql => console.log('\n' + sql));
    console.log('\nCOMMIT;');
  }
}

syncAllRecordings();