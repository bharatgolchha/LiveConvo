const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

async function testWebhookTrigger() {
  console.log('🔔 Testing calendar webhook trigger\n');

  const webhookUrl = 'http://localhost:3000/api/webhooks/recall/status';
  const webhookSecret = process.env.RECALL_AI_WEBHOOK_SECRET || '';
  
  // Simulate a calendar sync event
  const event = {
    event: 'calendar.sync_events',
    data: {
      calendar_id: '66f22443-84c8-42f4-9b0c-609e04bb5831', // bgolchha@gmail.com's calendar
      last_updated_ts: new Date().toISOString()
    }
  };

  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  // Generate signature if secret is configured
  let headers = {
    'Content-Type': 'application/json'
  };

  if (webhookSecret) {
    const signedContent = `${timestamp}.${body}`;
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedContent)
      .digest('hex');
    
    headers['x-recall-signature'] = `v1=${signature}`;
    headers['x-recall-timestamp'] = timestamp;
    
    console.log('Using webhook signature verification');
  } else {
    console.log('No webhook secret configured - sending without signature');
  }

  console.log('Sending webhook event:', {
    url: webhookUrl,
    event: event.event,
    calendar_id: event.data.calendar_id
  });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body
    });

    const result = await response.text();
    
    console.log('\nResponse:', {
      status: response.status,
      statusText: response.statusText,
      body: result
    });

    if (response.ok) {
      console.log('\n✅ Webhook processed successfully!');
      console.log('Check your calendar events to see if they were synced.');
    } else {
      console.log('\n❌ Webhook failed');
    }
  } catch (error) {
    console.error('\n❌ Error sending webhook:', error);
  }
}

testWebhookTrigger().catch(console.error);