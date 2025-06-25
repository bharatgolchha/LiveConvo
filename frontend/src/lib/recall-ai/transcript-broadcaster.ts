// Store active WebSocket connections per session
const activeConnections = new Map<string, Set<(data: any) => void>>();

// Helper function to broadcast to all connections for a session
export function broadcastTranscript(sessionId: string, data: any) {
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