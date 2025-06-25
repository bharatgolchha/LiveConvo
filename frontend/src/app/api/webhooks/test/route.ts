import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// Sample webhook events for testing
const sampleEvents = {
  'bot.joining_call': {
    event: 'bot.joining_call',
    data: {
      data: {
        code: 'joining_call',
        sub_code: null,
        updated_at: new Date().toISOString()
      },
      bot: {
        id: 'test-bot-' + Date.now(),
        metadata: {
          session_id: null,
          source: 'liveprompt',
          userEmail: 'test@example.com',
          meetingTitle: 'Test Meeting'
        }
      }
    }
  },
  'bot.in_call_recording': {
    event: 'bot.in_call_recording',
    data: {
      data: {
        code: 'in_call_recording',
        sub_code: null,
        updated_at: new Date().toISOString()
      },
      bot: {
        id: 'test-bot-' + Date.now(),
        metadata: {
          session_id: null,
          source: 'liveprompt'
        }
      }
    }
  },
  'bot.done': {
    event: 'bot.done',
    data: {
      data: {
        code: 'done',
        sub_code: null,
        updated_at: new Date().toISOString()
      },
      bot: {
        id: 'test-bot-' + Date.now(),
        metadata: {
          session_id: null,
          source: 'liveprompt'
        }
      }
    }
  },
  'bot.fatal': {
    event: 'bot.fatal',
    data: {
      data: {
        code: 'fatal',
        sub_code: 'meeting_url_invalid',
        updated_at: new Date().toISOString()
      },
      bot: {
        id: 'test-bot-' + Date.now(),
        metadata: {
          session_id: null,
          source: 'liveprompt'
        }
      }
    }
  }
};

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventType, sessionId, webhookUrl } = body;

    // Validate event type
    if (!eventType || !sampleEvents[eventType as keyof typeof sampleEvents]) {
      return NextResponse.json({ 
        error: 'Invalid event type',
        availableTypes: Object.keys(sampleEvents)
      }, { status: 400 });
    }

    // Get sample event
    const sampleEvent = { ...sampleEvents[eventType as keyof typeof sampleEvents] };
    
    // Update session ID if provided
    if (sessionId && sampleEvent.data.bot.metadata) {
      sampleEvent.data.bot.metadata.session_id = sessionId;
    }

    // Determine webhook URL
    const targetUrl = webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/recall/status`;

    console.log(`🧪 Sending test webhook: ${eventType} to ${targetUrl}`);

    // Send the webhook
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Webhook': 'true',
        'X-Test-User': user.id,
      },
      body: JSON.stringify(sampleEvent),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Log the test
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: 'test',
        event_type: eventType,
        bot_id: sampleEvent.data.bot.id,
        session_id: sessionId,
        payload: {
          ...sampleEvent,
          test_metadata: {
            user_id: user.id,
            target_url: targetUrl,
            response_status: response.status,
            response_data: responseData
          }
        },
        processed: response.ok,
        processing_time_ms: 0,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      response: responseData,
      event: sampleEvent,
      targetUrl
    });

  } catch (error) {
    console.error('❌ Webhook test error:', error);
    return NextResponse.json({ 
      error: 'Failed to send test webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to list available test events
export async function GET() {
  return NextResponse.json({
    availableEvents: Object.keys(sampleEvents),
    samplePayloads: sampleEvents
  });
}