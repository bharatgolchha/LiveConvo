import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

interface RecallWebhookEvent {
  id?: string;
  type?: string;
  event?: string;
  created?: string;
  data: {
    calendar_id?: string;
    last_updated_ts?: string;
    event?: {
      id: string;
      title: string;
      start_time: string;
      end_time: string;
      meeting_url?: string;
      attendees?: Array<{
        email: string;
        name?: string;
        response_status?: string;
      }>;
      location?: string;
      description?: string;
      organizer?: {
        email: string;
        name?: string;
      };
    };
  };
}

// Verify webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.RECALL_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('Recall webhook secret not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-recall-signature') || '';

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event: RecallWebhookEvent = JSON.parse(rawBody);
    
    const supabase = createServerSupabaseClient();

    // Get calendar connection by recall_calendar_id
    if (event.data.calendar_id) {
      const { data: connection, error: connectionError } = await supabase
        .from('calendar_connections')
        .select('id, user_id, organization_id')
        .eq('recall_calendar_id', event.data.calendar_id)
        .single();

      if (connectionError || !connection) {
        console.error('Calendar connection not found:', event.data.calendar_id);
        return NextResponse.json({ received: true });
      }

      // Determine event type (support both 'type' and 'event' fields)
      const eventType = event.type || event.event;

      // Log webhook event
      await supabase
        .from('calendar_webhooks')
        .insert({
          calendar_connection_id: connection.id,
          event_type: eventType,
          payload: event,
          processed_at: new Date().toISOString()
        });

      // Handle different event types
      switch (eventType) {
        case 'calendar.event.created':
        case 'calendar.event.updated':
          if (event.data.event) {
            // Upsert calendar event
            await supabase
              .from('calendar_events')
              .upsert({
                calendar_connection_id: connection.id,
                external_event_id: event.data.event.id,
                title: event.data.event.title,
                description: event.data.event.description,
                start_time: event.data.event.start_time,
                end_time: event.data.event.end_time,
                meeting_url: event.data.event.meeting_url,
                attendees: event.data.event.attendees || [],
                location: event.data.event.location,
                organizer_email: event.data.event.organizer?.email,
                is_organizer: false, // Will be determined by comparing with calendar email
                raw_data: event.data.event
              }, {
                onConflict: 'calendar_connection_id,external_event_id'
              });
          }
          break;

        case 'calendar.event.deleted':
          if (event.data.event) {
            // Delete calendar event
            await supabase
              .from('calendar_events')
              .delete()
              .eq('calendar_connection_id', connection.id)
              .eq('external_event_id', event.data.event.id);
          }
          break;

        case 'calendar.sync.completed':
          // Update last sync time
          await supabase
            .from('calendar_connections')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', connection.id);
          break;

        case 'calendar.sync_events':
          // Handle calendar sync event
          console.log('Calendar sync event received:', {
            calendarId: event.data.calendar_id,
            lastUpdated: event.data.last_updated_ts
          });

          // Trigger a sync of calendar events
          const syncResponse = await fetch(`${request.nextUrl.origin}/api/calendar/events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Use service role key for internal API calls
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ 
              connectionId: connection.id,
              lastUpdated: event.data.last_updated_ts 
            })
          });

          if (!syncResponse.ok) {
            console.error('Failed to sync calendar events:', await syncResponse.text());
          } else {
            console.log('Calendar sync triggered successfully');
          }

          // Update last sync time
          await supabase
            .from('calendar_connections')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', connection.id);
          break;

        default:
          console.log('Unhandled webhook event type:', eventType);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Log error to webhooks table if possible
    try {
      const supabase = createServerSupabaseClient();
      await supabase
        .from('calendar_webhooks')
        .insert({
          event_type: 'error',
          payload: { error: String(error) },
          error: String(error),
          processed_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    // Return success to avoid retries for malformed requests
    return NextResponse.json({ received: true });
  }
}