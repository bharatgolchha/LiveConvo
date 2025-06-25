import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface WebhookEvent {
  type: string;
  sessionId?: string;
  data: any;
  timestamp: string;
}

export function useWebhookEvents(sessionId?: string) {
  const { session } = useAuth();
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebhookEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!session?.access_token) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = new URLSearchParams();
    if (sessionId) params.append('sessionId', sessionId);
    params.append('userId', session.user.id);

    const url = `/api/webhooks/events?${params.toString()}`;
    
    const eventSource = new EventSource(url, {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      console.log('🔌 SSE connection opened');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'heartbeat') {
          // Ignore heartbeat events
          return;
        }
        
        if (data.type === 'connected') {
          console.log('✅ SSE connected:', data.connectionId);
          return;
        }
        
        // Handle actual events
        const webhookEvent: WebhookEvent = {
          type: data.type,
          sessionId: data.sessionId,
          data: data.data,
          timestamp: data.timestamp
        };
        
        setLastEvent(webhookEvent);
        setEvents(prev => [...prev, webhookEvent]);
        
        // Trigger notification for important events
        if (data.type === 'bot_status_update') {
          handleBotStatusNotification(data.data);
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      setIsConnected(false);
      
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current === eventSource) {
          connect();
        }
      }, 3000);
    };

    eventSourceRef.current = eventSource;
  }, [session, sessionId]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  // Helper function to handle bot status notifications
  const handleBotStatusNotification = (data: any) => {
    const { category, title, message } = data;
    
    // You can integrate with your notification system here
    // For now, just log it
    console.log(`📢 Bot Status: ${title} - ${message}`);
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/icon-192x192.png',
        tag: `bot-status-${data.botId}`,
      });
    }
  };

  // Function to clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  // Function to get events of specific type
  const getEventsByType = useCallback((type: string) => {
    return events.filter(event => event.type === type);
  }, [events]);

  return {
    events,
    lastEvent,
    isConnected,
    clearEvents,
    getEventsByType,
  };
}