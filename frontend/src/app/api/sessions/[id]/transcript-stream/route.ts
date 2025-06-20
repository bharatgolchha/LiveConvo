import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { addConnection, removeConnection } from '@/lib/recall-ai/transcript-broadcaster';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  
  console.log('🔄 Transcript stream requested for session:', sessionId);
  console.log('📍 Full URL:', request.url);
  
  // Create a new response stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`)
      );
      
      // Create listener for this connection
      const listener = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };
      
      // Add to active connections
      addConnection(sessionId, listener);
      
      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`)
          );
        } catch (error) {
          // Connection closed, clear interval
          clearInterval(heartbeatInterval);
        }
      }, 30000);
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        removeConnection(sessionId, listener);
        clearInterval(heartbeatInterval);
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
}