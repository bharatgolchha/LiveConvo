#!/usr/bin/env node
/**
 * Script to check Recall.ai bot and store recording in database
 * Run with: npx tsx scripts/check-and-store-recording.ts
 */

import { createClient } from '@supabase/supabase-js';
import { RecallAIClient } from '../src/lib/recall-ai/client';

// Bot ID to check
const BOT_ID = '43dc791e-9346-4935-9463-baed699ac9ce';

// Environment configuration
const RECALL_API_KEY = process.env.RECALL_AI_API_KEY || process.env.RECALL_API_KEY;
const RECALL_REGION = (process.env.RECALL_AI_REGION || process.env.RECALL_REGION || 'us-west-2') as 'us-west-2' | 'us-east-1' | 'eu-west-1';

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://juuysuamfoteblrqqdnu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!RECALL_API_KEY) {
  console.error('❌ Missing RECALL_API_KEY environment variable');
  console.error('Run with: RECALL_API_KEY=your_key npx tsx scripts/check-and-store-recording.ts');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

// Initialize clients
const recallClient = new RecallAIClient({
  apiKey: RECALL_API_KEY,
  region: RECALL_REGION
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAndStoreRecording() {
  console.log('🔍 Checking Recall.ai bot:', BOT_ID);
  console.log('📡 Using region:', RECALL_REGION);
  console.log('🗄️  Using Supabase:', SUPABASE_URL);
  console.log('');

  try {
    // 1. Get bot details with recordings
    console.log('📥 Fetching bot details...');
    const bot = await recallClient.getBotWithRecordings(BOT_ID);
    
    console.log('✅ Bot found!');
    console.log('  Status:', bot.status);
    console.log('  Meeting URL:', bot.meetingUrl);
    console.log('  Session ID:', bot.metadata?.session_id);
    console.log('');

    if (!bot.metadata?.session_id) {
      console.error('❌ No session_id found in bot metadata');
      return;
    }

    const sessionId = bot.metadata.session_id;

    // 2. Check for recordings
    if (!bot.recordings || bot.recordings.length === 0) {
      console.log('❌ No recordings found for this bot');
      
      // Check bot status changes for more info
      if (bot.status_changes && bot.status_changes.length > 0) {
        console.log('\n📋 Bot status history:');
        bot.status_changes.forEach(change => {
          console.log(`  ${change.created_at}: ${change.code} - ${change.message || 'No message'}`);
        });
      }
      return;
    }

    console.log(`✅ Found ${bot.recordings.length} recording(s)`);
    console.log('');

    // 3. Process each recording
    for (const [index, recording] of bot.recordings.entries()) {
      console.log(`📹 Recording ${index + 1}/${bot.recordings.length}:`);
      console.log('  ID:', recording.id);
      console.log('  Status:', recording.status?.code);
      console.log('  Started:', recording.started_at);
      console.log('  Completed:', recording.completed_at);
      console.log('  Expires:', recording.expires_at);
      
      // Extract video URL
      const videoUrl = recallClient.extractVideoUrl(recording);
      const transcriptUrl = recallClient.extractTranscriptUrl(recording);
      
      if (videoUrl) {
        console.log('  ✅ Video URL found:', videoUrl.substring(0, 100) + '...');
      } else {
        console.log('  ❌ Video not available (status:', recording.media_shortcuts?.video_mixed?.status?.code || 'unknown', ')');
      }

      if (transcriptUrl) {
        console.log('  ✅ Transcript URL found');
      }

      // 4. Store in database
      if (videoUrl && recording.status?.code === 'done') {
        console.log('\n💾 Storing recording in database...');
        
        // Calculate duration if possible
        let durationSeconds = null;
        if (recording.started_at && recording.completed_at) {
          const start = new Date(recording.started_at).getTime();
          const end = new Date(recording.completed_at).getTime();
          durationSeconds = Math.floor((end - start) / 1000);
        }

        // Insert or update bot_recordings table
        const { data: existingRecording, error: fetchError } = await supabase
          .from('bot_recordings')
          .select('id')
          .eq('bot_id', BOT_ID)
          .eq('recording_id', recording.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('❌ Error checking existing recording:', fetchError);
          continue;
        }

        const recordingData = {
          session_id: sessionId,
          bot_id: BOT_ID,
          recording_id: recording.id,
          recording_url: videoUrl,
          recording_status: recording.status?.code,
          recording_expires_at: recording.expires_at,
          duration_seconds: durationSeconds,
          bot_name: bot.metadata?.bot_name || 'LivePrompt Assistant',
          updated_at: new Date().toISOString()
        };

        if (existingRecording) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('bot_recordings')
            .update(recordingData)
            .eq('id', existingRecording.id);

          if (updateError) {
            console.error('❌ Error updating recording:', updateError);
          } else {
            console.log('✅ Recording updated in database');
          }
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('bot_recordings')
            .insert({
              ...recordingData,
              created_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('❌ Error inserting recording:', insertError);
          } else {
            console.log('✅ Recording stored in database');
          }
        }

        // Also update the session with the recording info
        console.log('\n🔄 Updating session with recording info...');
        const { error: sessionUpdateError } = await supabase
          .from('sessions')
          .update({
            recall_recording_id: recording.id,
            recall_recording_url: videoUrl,
            recall_recording_status: recording.status?.code,
            recall_recording_expires_at: recording.expires_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (sessionUpdateError) {
          console.error('❌ Error updating session:', sessionUpdateError);
        } else {
          console.log('✅ Session updated with recording info');
        }

        console.log('\n🎬 Recording URL:');
        console.log(videoUrl);
        console.log('\n📋 You can view this recording in the admin panel or use it in your application');
        
      } else if (!videoUrl) {
        console.log('\n⏳ Recording is still processing or unavailable');
        console.log('  Try running this script again in a few minutes');
      }
    }

    // 5. Show session details
    console.log('\n📊 Fetching session details...');
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*, users!inner(email)')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('❌ Error fetching session:', sessionError);
    } else if (session) {
      console.log('\n📄 Session Details:');
      console.log('  ID:', session.id);
      console.log('  User:', session.users.email);
      console.log('  Created:', new Date(session.created_at).toLocaleString());
      console.log('  Recording URL:', session.recall_recording_url ? '✅ Available' : '❌ Not set');
      console.log('  Recording Status:', session.recall_recording_status || 'unknown');
      if (session.recall_recording_expires_at) {
        console.log('  Recording Expires:', new Date(session.recall_recording_expires_at).toLocaleString());
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('  Message:', error.message);
      if (error.stack) {
        console.error('  Stack:', error.stack);
      }
    }
  }
}

// Run the script
checkAndStoreRecording();