#!/usr/bin/env node
/**
 * Simple script to check Recall.ai bot and display recording info
 * Run with: RECALL_API_KEY=your_key npx tsx scripts/check-bot-recording.ts
 */

// Bot ID to check
const BOT_ID = '43dc791e-9346-4935-9463-baed699ac9ce';

// Environment configuration
const RECALL_API_KEY = process.env.RECALL_AI_API_KEY || process.env.RECALL_API_KEY;
const RECALL_REGION = process.env.RECALL_AI_REGION || process.env.RECALL_REGION || 'us-west-2';

if (!RECALL_API_KEY) {
  console.error('❌ Missing RECALL_API_KEY environment variable');
  console.error('Run with: RECALL_API_KEY=your_key npx tsx scripts/check-bot-recording.ts');
  process.exit(1);
}

async function checkBotRecording() {
  console.log('🔍 Checking Recall.ai bot:', BOT_ID);
  console.log('📡 Using region:', RECALL_REGION);
  console.log('');

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
    
    console.log('✅ Bot found!');
    console.log('📊 Bot Details:');
    console.log('  Status:', bot.status);
    console.log('  Meeting URL:', bot.meeting_url);
    console.log('  Session ID:', bot.metadata?.session_id);
    console.log('  Created:', bot.created_at);
    console.log('');

    // Show status changes
    if (bot.status_changes && bot.status_changes.length > 0) {
      console.log('📋 Status History:');
      bot.status_changes.forEach((change: any) => {
        const time = new Date(change.created_at).toLocaleString();
        console.log(`  ${time}: ${change.code}${change.message ? ` - ${change.message}` : ''}`);
      });
      console.log('');
    }

    // Check recordings
    if (!bot.recordings || bot.recordings.length === 0) {
      console.log('❌ No recordings found for this bot');
      console.log('');
      console.log('💡 Possible reasons:');
      console.log('  - Bot is still in the meeting');
      console.log('  - Recording is still processing');
      console.log('  - Bot failed to join or record the meeting');
      return;
    }

    console.log(`✅ Found ${bot.recordings.length} recording(s):`);
    console.log('');

    bot.recordings.forEach((recording: any, index: number) => {
      console.log(`📹 Recording ${index + 1}:`);
      console.log('  ID:', recording.id);
      console.log('  Status:', recording.status?.code);
      console.log('  Started:', recording.started_at || 'Not started');
      console.log('  Completed:', recording.completed_at || 'Not completed');
      console.log('  Expires:', recording.expires_at);
      
      // Check video availability
      const videoMixed = recording.media_shortcuts?.video_mixed;
      if (videoMixed?.status?.code === 'done' && videoMixed?.data?.download_url) {
        console.log('  ✅ Video: Available');
        console.log('');
        console.log('🎬 Video URL:');
        console.log(videoMixed.data.download_url);
      } else {
        console.log('  ⏳ Video: ' + (videoMixed?.status?.code || 'Not available'));
      }

      // Check transcript availability
      const transcript = recording.media_shortcuts?.transcript;
      if (transcript?.status?.code === 'done' && transcript?.data?.download_url) {
        console.log('  ✅ Transcript: Available');
      } else {
        console.log('  ⏳ Transcript: ' + (transcript?.status?.code || 'Not available'));
      }

      // Calculate duration if possible
      if (recording.started_at && recording.completed_at) {
        const start = new Date(recording.started_at).getTime();
        const end = new Date(recording.completed_at).getTime();
        const durationMinutes = Math.floor((end - start) / 1000 / 60);
        console.log('  ⏱️  Duration:', durationMinutes, 'minutes');
      }

      console.log('');
    });

    // Show how to store in database
    const recording = bot.recordings[0];
    if (recording && recording.media_shortcuts?.video_mixed?.data?.download_url) {
      console.log('💾 To store this recording in the database, run:');
      console.log('   npx tsx scripts/check-and-store-recording.ts');
      console.log('');
      console.log('📋 Or update manually with SQL:');
      console.log(`UPDATE sessions SET 
  recall_recording_id = '${recording.id}',
  recall_recording_url = '${recording.media_shortcuts.video_mixed.data.download_url}',
  recall_recording_status = '${recording.status?.code}',
  recall_recording_expires_at = '${recording.expires_at}'
WHERE id = '${bot.metadata?.session_id}';`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkBotRecording();