import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { connections } from '@/lib/webhooks/event-broadcaster';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');
  const userId = searchParams.get('userId');
  
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

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      const connectionId = `${userId || user.id}-${sessionId || 'all'}-${Date.now()}`;
      connections.set(connectionId, controller);
      
      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ 
          type: 'connected', 
          connectionId,
          timestamp: new Date().toISOString() 
        })}\n\n`)
      );

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'heartbeat', 
              timestamp: new Date().toISOString() 
            })}\n\n`)
          );
        } catch (error) {
          clearInterval(heartbeat);
          connections.delete(connectionId);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        connections.delete(connectionId);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}