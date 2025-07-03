import { RecallAIClient } from '../src/lib/recall-ai/client';

async function stopRecallBot() {
  const botId = process.argv[2];
  
  if (!botId) {
    console.error('❌ Please provide a bot ID as an argument');
    console.log('Usage: npm run stop-bot <bot-id>');
    process.exit(1);
  }
  
  console.log('🛑 Attempting to stop Recall.ai bot:', botId);
  
  try {
    const recallClient = new RecallAIClient({
      apiKey: process.env.RECALL_AI_API_KEY || '',
      region: 'us-west-2',
      webhookUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/recall'
    });
    
    // First check bot status
    console.log('\n📊 Checking bot status...');
    const bot = await recallClient.getBot(botId);
    console.log('Current status:', bot.status);
    
    if (bot.status_changes) {
      const latestStatus = bot.status_changes[bot.status_changes.length - 1];
      console.log('Latest status change:', latestStatus.code, 'at', latestStatus.created_at);
    }
    
    // Stop the bot
    console.log('\n🛑 Sending stop command...');
    await recallClient.stopBot(botId);
    console.log('✅ Stop command sent successfully');
    
    // Check status again after a short delay
    console.log('\n⏳ Waiting 3 seconds to check new status...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const updatedBot = await recallClient.getBot(botId);
    console.log('\n📊 New bot status:', updatedBot.status);
    
    if (updatedBot.status_changes) {
      const latestStatus = updatedBot.status_changes[updatedBot.status_changes.length - 1];
      console.log('Latest status change:', latestStatus.code, 'at', latestStatus.created_at);
    }
    
  } catch (error) {
    console.error('❌ Error stopping bot:', error);
  }
}

// Set your API key here or use environment variable
process.env.RECALL_AI_API_KEY = process.env.RECALL_AI_API_KEY || 'YOUR_RECALL_API_KEY';

stopRecallBot();