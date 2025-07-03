import { RecallAIClient } from '../src/lib/recall-ai/client';

async function checkRecallBot() {
  const botId = process.argv[2] || '762fe9bd-6163-4b18-b071-c5a5f243f855';
  
  console.log('🔍 Checking Recall.ai for bot:', botId);
  
  try {
    const recallClient = new RecallAIClient({
      apiKey: process.env.RECALL_AI_API_KEY || '',
      region: 'us-west-2',
    });
    
    const bot = await recallClient.getBotWithRecordings(botId);
    
    console.log('\n📤 Bot Details:');
    console.log('- ID:', bot.id);
    console.log('- Status:', bot.status);
    console.log('- Meeting URL:', bot.meetingUrl);
    
    if (bot.status_changes) {
      console.log('\n📊 Status History:');
      bot.status_changes.forEach(change => {
        console.log(`  ${change.created_at}: ${change.code}`);
      });
    }
    
    if (bot.recordings && bot.recordings.length > 0) {
      console.log('\n🎬 Recordings Found:', bot.recordings.length);
      
      bot.recordings.forEach((recording, index) => {
        console.log(`\n Recording ${index + 1}:`);
        console.log('  - ID:', recording.id);
        console.log('  - Status:', recording.status?.code);
        console.log('  - Started:', recording.started_at);
        console.log('  - Completed:', recording.completed_at);
        console.log('  - Expires:', recording.expires_at);
        
        const videoUrl = recallClient.extractVideoUrl(recording);
        if (videoUrl) {
          console.log('  - Video URL:', videoUrl);
        } else {
          console.log('  - Video URL: Not available yet');
        }
      });
    } else {
      console.log('\n❌ No recordings found for this bot');
    }
    
  } catch (error) {
    console.error('❌ Error checking bot:', error);
  }
}

// Set your API key here or use environment variable
process.env.RECALL_AI_API_KEY = process.env.RECALL_AI_API_KEY || 'YOUR_RECALL_API_KEY';

checkRecallBot();