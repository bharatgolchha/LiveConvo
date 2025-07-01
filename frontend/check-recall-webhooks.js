const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function checkRecallWebhooks() {
  console.log('🔍 Checking Recall.ai webhook configuration\n');

  const RECALL_API_KEY = process.env.RECALL_AI_API_KEY;
  const RECALL_REGION = process.env.RECALL_AI_REGION || 'us-west-2';
  
  // First, check if there's a webhook endpoint to list webhooks
  console.log('1️⃣ Checking for existing webhooks...\n');
  
  const webhookUrl = `https://${RECALL_REGION}.recall.ai/api/v2/webhooks/`;
  
  try {
    const response = await fetch(webhookUrl, {
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`
      }
    });

    if (response.ok) {
      const webhooks = await response.json();
      console.log('Existing webhooks:', JSON.stringify(webhooks, null, 2));
      
      if (webhooks.results && webhooks.results.length > 0) {
        console.log(`\nFound ${webhooks.results.length} configured webhooks`);
        
        webhooks.results.forEach((webhook, index) => {
          console.log(`\nWebhook ${index + 1}:`);
          console.log(`  URL: ${webhook.url}`);
          console.log(`  Events: ${webhook.events?.join(', ') || 'All events'}`);
          console.log(`  Active: ${webhook.is_active !== false}`);
          console.log(`  Created: ${webhook.created}`);
        });
      } else {
        console.log('❌ No webhooks configured');
      }
    } else if (response.status === 404) {
      console.log('❌ Webhook endpoint not found - webhooks might be configured differently');
    } else {
      console.log('Error fetching webhooks:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Failed to check webhooks:', error);
  }

  // Check if we need to register a webhook
  console.log('\n\n2️⃣ Checking if we need to register a webhook...\n');
  
  const ourWebhookUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/recall/status`
    : 'https://your-app.com/api/webhooks/recall/status';
    
  console.log('Our webhook URL should be:', ourWebhookUrl);
  console.log('\nTo register a webhook, you might need to:');
  console.log('1. Use the Recall.ai dashboard');
  console.log('2. Or use their API (if available) to register:');
  console.log(`   - URL: ${ourWebhookUrl}`);
  console.log('   - Events: calendar.sync_events');
  console.log('   - Secret: Set RECALL_AI_WEBHOOK_SECRET in your .env.local');
  
  // Try to create a webhook
  console.log('\n\n3️⃣ Attempting to create a webhook...\n');
  
  try {
    const createResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: ourWebhookUrl,
        events: ['calendar.sync_events'],
        is_active: true
      })
    });

    if (createResponse.ok) {
      const newWebhook = await createResponse.json();
      console.log('✅ Webhook created successfully:', newWebhook);
    } else if (createResponse.status === 404) {
      console.log('❌ Cannot create webhook via API - use Recall.ai dashboard');
    } else {
      console.log('Failed to create webhook:', createResponse.status, await createResponse.text());
    }
  } catch (error) {
    console.error('Error creating webhook:', error);
  }
}

checkRecallWebhooks().catch(console.error);