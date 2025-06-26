/**
 * Simple script to sync a single recording
 * Run with: RECALL_API_KEY=your_key npx tsx scripts/sync-single-recording.ts BOT_ID
 */

const BOT_ID = process.argv[2];
const RECALL_API_KEY = process.env.RECALL_AI_API_KEY || process.env.RECALL_API_KEY;
const RECALL_REGION = process.env.RECALL_AI_REGION || process.env.RECALL_REGION || 'us-west-2';

if (!BOT_ID) {
  console.error('Usage: npx tsx scripts/sync-single-recording.ts BOT_ID');
  process.exit(1);
}

if (!RECALL_API_KEY) {
  console.error('Missing RECALL_API_KEY environment variable');
  process.exit(1);
}

async function fetchRecording() {
  console.log(`Fetching recording for bot: ${BOT_ID}`);
  console.log(`Using region: ${RECALL_REGION}`);
  
  try {
    const response = await fetch(
      `https://${RECALL_REGION}.recall.ai/api/v1/bot/${BOT_ID}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Token ${RECALL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    const bot = await response.json();
    console.log('\nBot Status:', bot.status);
    
    if (!bot.recordings || bot.recordings.length === 0) {
      console.log('No recordings found for this bot');
      return;
    }

    console.log(`\nFound ${bot.recordings.length} recording(s):`);
    
    bot.recordings.forEach((recording: any, index: number) => {
      console.log(`\nRecording ${index + 1}:`);
      console.log('  ID:', recording.id);
      console.log('  Status:', recording.status?.code);
      console.log('  Started:', recording.started_at);
      console.log('  Completed:', recording.completed_at);
      console.log('  Expires:', recording.expires_at);
      
      const videoUrl = recording.media_shortcuts?.video_mixed?.data?.download_url;
      if (videoUrl) {
        console.log('  Video URL:', videoUrl.substring(0, 100) + '...');
        console.log('\n📋 SQL to update session:');
        console.log(`UPDATE sessions SET 
  recall_recording_id = '${recording.id}',
  recall_recording_url = '${videoUrl}',
  recall_recording_status = '${recording.status?.code}',
  recall_recording_expires_at = '${recording.expires_at}'
WHERE recall_bot_id = '${BOT_ID}';`);
      } else {
        console.log('  Video URL: Not available (status:', recording.media_shortcuts?.video_mixed?.status?.code, ')');
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fetchRecording();