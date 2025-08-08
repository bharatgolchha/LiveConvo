import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAuthenticatedSupabaseClient, supabase } from '@/lib/supabase';
import { addConnection, removeConnection, getBufferedMessages } from '@/lib/recall-ai/transcript-broadcaster';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  
  const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_TRANSCRIPTS === 'true' || process.env.NEXT_PUBLIC_DEBUG_TRANSCRIPTS === 'true';
  if (DEBUG) {
    console.log('🔄 Transcript stream requested for session:', sessionId);
    console.log('📍 Full URL:', request.url);
  }

  // --- AuthN/AuthZ: validate user can access this session ---
  try {
    const url = new URL(request.url);
    const bearerFromHeader = request.headers.get('authorization');
    const tokenFromHeader = bearerFromHeader?.startsWith('Bearer ')
      ? bearerFromHeader.split(' ')[1]
      : undefined;
    const token = url.searchParams.get('token') || tokenFromHeader || undefined;

    if (!token) {
      return new NextResponse('Unauthorized: missing token', { status: 401 });
    }

    // Validate token and get user
    const { data: userResp, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userResp?.user) {
      return new NextResponse('Unauthorized: invalid token', { status: 401 });
    }

    // Use RLS with user's token to verify access to the session
    const authClient = createAuthenticatedSupabaseClient(token);
    const { data: session, error: sessionError } = await authClient
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .is('deleted_at', null)
      .single();

    if (sessionError || !session) {
      return new NextResponse('Forbidden: no access to session', { status: 403 });
    }
  } catch (authErr) {
    if (DEBUG) console.error('SSE auth error:', authErr);
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  // Create a new response stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`)
      );
      
      // Send any buffered messages (last 1 minute)
      const oneMinuteAgo = Date.now() - 60000;
      const bufferedMessages = getBufferedMessages(sessionId, oneMinuteAgo);
      if (bufferedMessages.length > 0) {
        if (DEBUG) console.log(`📦 Sending ${bufferedMessages.length} buffered messages to catch up`);
        bufferedMessages.forEach(msg => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(msg)}\n\n`)
          );
        });
      }
      
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
      // Same-origin EventSource typically carries cookies; we rely on explicit token query param.
      'Access-Control-Allow-Origin': '*',
    },
  });
}