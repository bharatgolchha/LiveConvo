const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function forceRecallSync() {
  console.log('🔄 Forcing Recall.ai to sync with Google Calendar\n');

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RECALL_API_KEY = process.env.RECALL_AI_API_KEY;
  const RECALL_REGION = process.env.RECALL_AI_REGION || 'us-west-2';

  // Get the calendar connection
  const connectionResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/calendar_connections?email=eq.bgolchha@gmail.com&select=*`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const connections = await connectionResponse.json();
  if (connections.length === 0) {
    console.error('No calendar connection found');
    return;
  }

  const connection = connections[0];
  console.log('Calendar ID:', connection.recall_calendar_id);

  // First, let's check if we can get the calendar details
  console.log('\n1️⃣ Getting calendar details from Recall.ai...');
  
  const calendarResponse = await fetch(
    `https://${RECALL_REGION}.recall.ai/api/v2/calendars/${connection.recall_calendar_id}/`,
    {
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`
      }
    }
  );

  if (calendarResponse.ok) {
    const calendarData = await calendarResponse.json();
    console.log('Calendar details:', {
      id: calendarData.id,
      platform: calendarData.platform,
      created: calendarData.created,
      email: calendarData.email,
      is_connected: calendarData.is_connected,
      last_synced: calendarData.last_synced
    });
  } else {
    console.error('Failed to get calendar details:', calendarResponse.status, await calendarResponse.text());
  }

  // Try to trigger a sync by updating the calendar
  console.log('\n2️⃣ Attempting to trigger sync...');
  
  // Option 1: Try to update the calendar (this might trigger a sync)
  const updateResponse = await fetch(
    `https://${RECALL_REGION}.recall.ai/api/v2/calendars/${connection.recall_calendar_id}/`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Send empty update to potentially trigger sync
      })
    }
  );

  if (updateResponse.ok) {
    console.log('✅ Calendar update request sent successfully');
  } else {
    console.log('⚠️ Calendar update failed:', updateResponse.status);
  }

  // Option 2: Check if there's a sync endpoint
  console.log('\n3️⃣ Checking for sync endpoint...');
  
  const syncResponse = await fetch(
    `https://${RECALL_REGION}.recall.ai/api/v2/calendars/${connection.recall_calendar_id}/sync/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    }
  );

  if (syncResponse.ok) {
    console.log('✅ Sync triggered successfully');
  } else if (syncResponse.status === 404) {
    console.log('❌ No sync endpoint available');
  } else {
    console.log('❌ Sync request failed:', syncResponse.status);
  }

  // Wait a moment then check for new events
  console.log('\n⏳ Waiting 5 seconds before checking for updates...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check events again
  console.log('\n4️⃣ Checking for updated events...');
  
  const eventsResponse = await fetch(
    `https://${RECALL_REGION}.recall.ai/api/v2/calendar-events/?calendar_id=${connection.recall_calendar_id}&limit=20`,
    {
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`
      }
    }
  );

  if (eventsResponse.ok) {
    const eventsData = await eventsResponse.json();
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`Total events: ${eventsData.results?.length || 0}`);
    
    // Check for events created today or in the future
    const recentEvents = (eventsData.results || []).filter(event => {
      const created = new Date(event.created);
      const start = new Date(event.start_time);
      return created >= today || start >= now;
    });
    
    console.log(`\nEvents created today or scheduled for the future: ${recentEvents.length}`);
    
    recentEvents.forEach(event => {
      console.log(`\n- ${event.raw?.summary || 'Untitled'}`);
      console.log(`  Start: ${new Date(event.start_time).toLocaleString()}`);
      console.log(`  Created: ${new Date(event.created).toLocaleString()}`);
      console.log(`  Meeting URL: ${event.meeting_url || 'None'}`);
    });
  }

  console.log('\n💡 Recommendations:');
  console.log('1. Create a new test event in Google Calendar (scheduled for today/tomorrow)');
  console.log('2. Wait 1-2 minutes for Recall.ai to sync');
  console.log('3. Run the calendar sync test again');
  console.log('\nIf events still don\'t appear:');
  console.log('- Check if the Google Calendar OAuth token needs refreshing');
  console.log('- Verify the calendar is still connected in Recall.ai dashboard');
  console.log('- Contact Recall.ai support about the sync delay');
}

forceRecallSync().catch(console.error);