// Store active WebSocket connections per session
const activeConnections = new Map<string, Set<(data: any) => void>>();

// Message buffer to store recent messages per session (last 50 messages)
const messageBuffer = new Map<string, any[]>();
const BUFFER_SIZE = 50;

// Helper function to broadcast to all connections for a session
export function broadcastTranscript(sessionId: string, data: any) {
  // Add to message buffer
  if (!messageBuffer.has(sessionId)) {
    messageBuffer.set(sessionId, []);
  }
  const buffer = messageBuffer.get(sessionId)!;
  buffer.push({ ...data, bufferedAt: Date.now() });
  
  // Keep buffer size limited
  if (buffer.length > BUFFER_SIZE) {
    buffer.shift(); // Remove oldest message
  }
  
  const connections = activeConnections.get(sessionId);
  console.log(`📢 Broadcasting to session ${sessionId}: ${connections ? connections.size : 0} connections`);
  console.log('📊 Broadcast data:', JSON.stringify(data, null, 2));
  
  if (connections) {
    connections.forEach(listener => {
      try {
        listener(data);
        console.log('✅ Broadcast sent to listener');
      } catch (error) {
        console.error('❌ Error broadcasting to listener:', error);
      }
    });
  } else {
    console.warn('⚠️ No active connections for session:', sessionId);
  }
}

export function addConnection(sessionId: string, listener: (data: any) => void) {
  if (!activeConnections.has(sessionId)) {
    activeConnections.set(sessionId, new Set());
  }
  activeConnections.get(sessionId)!.add(listener);
  console.log(`👥 Added connection for session ${sessionId}. Total connections: ${activeConnections.get(sessionId)!.size}`);
}

export function removeConnection(sessionId: string, listener: (data: any) => void) {
  const connections = activeConnections.get(sessionId);
  if (connections) {
    connections.delete(listener);
    if (connections.size === 0) {
      activeConnections.delete(sessionId);
    }
  }
}

export function getActiveConnections() {
  const result: Record<string, number> = {};
  activeConnections.forEach((connections, sessionId) => {
    result[sessionId] = connections.size;
  });
  return result;
}

export function getBufferedMessages(sessionId: string, sinceTimestamp?: number): any[] {
  const buffer = messageBuffer.get(sessionId) || [];
  if (sinceTimestamp) {
    return buffer.filter(msg => msg.bufferedAt > sinceTimestamp);
  }
  return [...buffer]; // Return a copy
}