// Store active SSE connections
export const connections = new Map<string, ReadableStreamDefaultController>();

// Export function to broadcast events
export function broadcastWebhookEvent(event: {
  type: string;
  sessionId?: string;
  userId?: string;
  data: Record<string, unknown>;
}) {
  const encoder = new TextEncoder();
  const message = encoder.encode(`data: ${JSON.stringify({
    ...event,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Send to all relevant connections
  connections.forEach((controller, connectionId) => {
    const [connUserId, connSessionId] = connectionId.split('-');
    
    // Check if this connection should receive the event
    const shouldSend = 
      (!event.userId || connUserId === event.userId) &&
      (!event.sessionId || connSessionId === 'all' || connSessionId === event.sessionId);
    
    if (shouldSend) {
      try {
        controller.enqueue(message);
      } catch (error) {
        // Connection closed, remove it
        connections.delete(connectionId);
      }
    }
  });
}