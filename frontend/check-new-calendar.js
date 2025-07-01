const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function checkNewCalendar() {
  console.log('🔍 Checking NEW calendar connection for bgolchha@gmail.com\n');

  const RECALL_API_KEY = process.env.RECALL_AI_API_KEY;
  const RECALL_REGION = process.env.RECALL_AI_REGION || 'us-west-2';
  
  // New calendar ID from the reconnection
  const NEW_CALENDAR_ID = 'e22aee14-9fad-4f95-b10f-c112e78f6183';

  console.log('Checking calendar ID:', NEW_CALENDAR_ID);
  console.log('(Created at: 2025-07-01 09:12:50 UTC)\n');

  // Fetch events from Recall.ai for the NEW calendar
  console.log('📅 Fetching events from Recall.ai...\n');
  
  const recallUrl = `https://${RECALL_REGION}.recall.ai/api/v2/calendar-events/?calendar_id=${NEW_CALENDAR_ID}`;
  
  const recallResponse = await fetch(recallUrl, {
    headers: {
      'Authorization': `Token ${RECALL_API_KEY}`
    }
  });

  if (!recallResponse.ok) {
    console.error('Failed to fetch from Recall.ai:', {
      status: recallResponse.status,
      statusText: recallResponse.statusText,
      body: await recallResponse.text()
    });
    return;
  }

  const recallData = await recallResponse.json();
  console.log(`Total events returned: ${recallData.results?.length || 0}\n`);

  if (recallData.results && recallData.results.length > 0) {
    console.log('Events from Recall.ai:\n');
    
    recallData.results.forEach((event, index) => {
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time);
      const created = new Date(event.created);
      
      console.log(`Event ${index + 1}:`);
      console.log(`  Title: ${event.raw?.summary || event.raw?.title || 'Untitled'}`);
      console.log(`  Start: ${event.start_time} (${startTime.toLocaleString()})`);
      console.log(`  End: ${event.end_time} (${endTime.toLocaleString()})`);
      console.log(`  Created in Recall: ${event.created} (${created.toLocaleString()})`);
      console.log(`  Meeting URL: ${event.meeting_url || 'No meeting URL'}`);
      console.log(`  Platform: ${event.platform}`);
      console.log(`  Is Deleted: ${event.is_deleted}`);
      console.log(`  Event ID: ${event.id}`);
      console.log('');
    });
  } else {
    console.log('❌ No events found for this calendar in Recall.ai\n');
  }

  // Check calendar details
  console.log('\n📊 Checking calendar details...\n');
  
  const calendarResponse = await fetch(
    `https://${RECALL_REGION}.recall.ai/api/v2/calendars/${NEW_CALENDAR_ID}/`,
    {
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`
      }
    }
  );

  if (calendarResponse.ok) {
    const calendarData = await calendarResponse.json();
    console.log('Calendar info:', JSON.stringify(calendarData, null, 2));
  } else {
    console.log('Failed to get calendar details:', calendarResponse.status);
  }

  console.log('\n\n💡 Next Steps:');
  console.log('1. If no events are showing, create a NEW test event in Google Calendar');
  console.log('2. Make sure the event:');
  console.log('   - Is scheduled for TODAY or TOMORROW (Jan 30-31, 2025)');
  console.log('   - Has a Google Meet link');
  console.log('   - Is on your primary calendar');
  console.log('3. Wait 2-3 minutes for Recall.ai to sync');
  console.log('4. Run this script again');
  
  // Also check for pagination
  if (recallData.next) {
    console.log('\n⚠️ Note: There are more events available (pagination detected)');
    console.log('Next page URL:', recallData.next);
  }
}

checkNewCalendar().catch(console.error);