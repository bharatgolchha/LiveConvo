const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testCalendarSync() {
  console.log('🔍 Testing Calendar Sync for bgolchha@gmail.com\n');

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RECALL_API_KEY = process.env.RECALL_AI_API_KEY;
  const RECALL_REGION = process.env.RECALL_AI_REGION || 'us-west-2';

  // First, get the calendar connection from Supabase
  console.log('1️⃣ Fetching calendar connection from Supabase...');
  
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

  if (!connectionResponse.ok) {
    console.error('Failed to fetch calendar connection:', await connectionResponse.text());
    return;
  }

  const connections = await connectionResponse.json();
  if (connections.length === 0) {
    console.error('No calendar connection found for bgolchha@gmail.com');
    return;
  }

  const connection = connections[0];
  console.log('✅ Found calendar connection:', {
    id: connection.id,
    recall_calendar_id: connection.recall_calendar_id,
    last_synced: connection.last_synced_at,
    is_active: connection.is_active
  });

  // Now fetch events from Recall.ai
  console.log('\n2️⃣ Fetching events from Recall.ai...');
  
  const recallUrl = `https://${RECALL_REGION}.recall.ai/api/v2/calendar-events/?calendar_id=${connection.recall_calendar_id}`;
  console.log('API URL:', recallUrl);

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
  console.log(`✅ Recall.ai returned ${recallData.results?.length || 0} total events`);

  // Display ALL events first
  console.log('\n📋 ALL events from Recall.ai:\n');
  
  (recallData.results || []).forEach((event, index) => {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    
    console.log(`Event ${index + 1}:`);
    console.log(`  ID: ${event.id}`);
    console.log(`  Title: ${event.raw?.summary || event.raw?.title || 'Untitled'}`);
    console.log(`  Raw Start Time: ${event.start_time}`);
    console.log(`  Parsed Start: ${startTime.toLocaleString()}`);
    console.log(`  Raw End Time: ${event.end_time}`);
    console.log(`  Parsed End: ${endTime.toLocaleString()}`);
    console.log(`  Meeting URL: ${event.meeting_url || 'No meeting URL'}`);
    console.log(`  Platform: ${event.platform || 'Unknown'}`);
    console.log(`  Deleted: ${event.is_deleted}`);
    
    if (event.raw?.attendees?.length > 0) {
      console.log(`  Attendees: ${event.raw.attendees.map(a => a.email).join(', ')}`);
    }
    console.log('');
  });

  // Filter and display future events
  const now = new Date();
  const futureEvents = (recallData.results || []).filter(event => {
    const startTime = new Date(event.start_time);
    return startTime > now && !event.is_deleted;
  });

  console.log(`\n📅 Filtering for upcoming events (after ${now.toLocaleString()}):`);
  console.log(`Found ${futureEvents.length} upcoming events\n`);

  futureEvents.forEach((event, index) => {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    
    console.log(`Event ${index + 1}:`);
    console.log(`  ID: ${event.id}`);
    console.log(`  Title: ${event.raw?.summary || event.raw?.title || 'Untitled'}`);
    console.log(`  Start: ${startTime.toLocaleString()}`);
    console.log(`  End: ${endTime.toLocaleString()}`);
    console.log(`  Meeting URL: ${event.meeting_url || 'No meeting URL'}`);
    console.log(`  Platform: ${event.platform || 'Unknown'}`);
    console.log(`  Deleted: ${event.is_deleted}`);
    
    if (event.raw?.attendees?.length > 0) {
      console.log(`  Attendees: ${event.raw.attendees.map(a => a.email).join(', ')}`);
    }
    console.log('');
  });

  // Check current database state
  console.log('\n3️⃣ Checking current database state...');
  
  const dbEventsResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/calendar_events?calendar_connection_id=eq.${connection.id}&select=*&order=start_time`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (dbEventsResponse.ok) {
    const dbEvents = await dbEventsResponse.json();
    console.log(`Database currently has ${dbEvents.length} events for this calendar`);
    
    const futureDatabaseEvents = dbEvents.filter(event => new Date(event.start_time) > now);
    console.log(`${futureDatabaseEvents.length} are in the future`);
  }

  // Test the sync process
  console.log('\n4️⃣ Would you like to sync these events to the database? This will:');
  console.log('   - Delete all existing events for this calendar');
  console.log('   - Insert all active (non-deleted) events from Recall.ai');
  console.log('\nRun with --sync flag to perform the sync');

  if (process.argv.includes('--sync')) {
    console.log('\n🔄 Performing sync...');
    
    // Delete existing events
    const deleteResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/calendar_events?calendar_connection_id=eq.${connection.id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!deleteResponse.ok) {
      console.error('Failed to delete existing events:', await deleteResponse.text());
      return;
    }

    // Insert active events
    const activeEvents = (recallData.results || []).filter(e => !e.is_deleted);
    if (activeEvents.length > 0) {
      const eventsToInsert = activeEvents.map(event => ({
        calendar_connection_id: connection.id,
        external_event_id: event.id,
        title: event.raw?.summary || event.raw?.title || 'Untitled Event',
        description: event.raw?.description || null,
        start_time: event.start_time,
        end_time: event.end_time,
        meeting_url: event.meeting_url,
        attendees: event.raw?.attendees || [],
        location: event.raw?.location || null,
        organizer_email: event.raw?.organizer?.email || connection.email,
        is_organizer: event.raw?.organizer?.email === connection.email,
        raw_data: event
      }));

      const insertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/calendar_events`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventsToInsert)
        }
      );

      if (insertResponse.ok) {
        console.log(`✅ Successfully synced ${activeEvents.length} events to database`);
      } else {
        console.error('Failed to insert events:', await insertResponse.text());
      }
    }

    // Update last sync time
    await fetch(
      `${SUPABASE_URL}/rest/v1/calendar_connections?id=eq.${connection.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ last_synced_at: new Date().toISOString() })
      }
    );
  }
}

testCalendarSync().catch(console.error);