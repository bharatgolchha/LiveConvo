import { RecallAIClient } from '../src/lib/recall-ai/client';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucvfgfbjcrxbzppwjpuu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const RECALL_API_KEY = process.env.RECALL_AI_API_KEY || '';

async function fixRecording() {
  const sessionId = '089fe5f9-c06c-4b81-98d4-8d2e17297cbd';
  const botId = '43dc791e-9346-4935-9463-baed699ac9ce';
  
  console.log('🔍 Fixing recording for session:', sessionId);
  console.log('🤖 Bot ID:', botId);
  
  try {
    // Initialize clients
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const recallClient = new RecallAIClient({
      apiKey: RECALL_API_KEY,
      region: 'us-west-2',
    });
    
    // Fetch bot with recordings
    console.log('\n📡 Fetching bot from Recall.ai...');
    const bot = await recallClient.getBotWithRecordings(botId);
    
    console.log('✅ Bot fetched:', {
      id: bot.id,
      status: bot.status,
      recordingsCount: bot.recordings?.length || 0
    });
    
    if (!bot.recordings || bot.recordings.length === 0) {
      console.log('❌ No recordings found for this bot');
      return;
    }
    
    // Process each recording
    for (const recording of bot.recordings) {
      const videoUrl = recallClient.extractVideoUrl(recording);
      
      console.log('\n🎬 Processing recording:', {
        id: recording.id,
        status: recording.status?.code,
        hasVideoUrl: !!videoUrl
      });
      
      if (videoUrl) {
        // Store in bot_recordings table
        const { error: recordingError } = await supabase
          .from('bot_recordings')
          .upsert({
            session_id: sessionId,
            bot_id: botId,
            recording_id: recording.id,
            recording_url: videoUrl,
            recording_status: recording.status?.code || 'done',
            recording_expires_at: recording.expires_at,
            duration_seconds: recording.started_at && recording.completed_at
              ? Math.floor((new Date(recording.completed_at).getTime() - new Date(recording.started_at).getTime()) / 1000)
              : null,
            bot_name: 'LivePrompt Recording',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'session_id,bot_id,recording_id'
          });
          
        if (recordingError) {
          console.error('❌ Failed to store recording:', recordingError);
        } else {
          console.log('✅ Recording stored successfully');
          console.log('🔗 Video URL:', videoUrl);
        }
        
        // Update session with recording info
        const { error: sessionError } = await supabase
          .from('sessions')
          .update({
            recall_recording_id: recording.id,
            recall_recording_url: videoUrl,
            recall_recording_status: recording.status?.code,
            recall_recording_expires_at: recording.expires_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
          
        if (sessionError) {
          console.error('⚠️ Failed to update session:', sessionError);
        } else {
          console.log('✅ Session updated with recording info');
        }
      }
    }
    
    console.log('\n🎉 Recording fix completed!');
    console.log('📺 You should now see the recording in the UI');
    
  } catch (error) {
    console.error('❌ Error fixing recording:', error);
  }
}

// Run the fix
fixRecording();