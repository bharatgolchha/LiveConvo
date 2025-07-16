import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Session } from './useSessions';

interface BotStatusUpdate {
  session_id: string;
  bot_id: string;
  status: string;
  updated_at: string;
}

interface UseRealtimeDashboardProps {
  onSessionInsert?: (session: Session) => void;
  onSessionUpdate?: (session: Session) => void;
  onSessionDelete?: (sessionId: string) => void;
  onBotStatusUpdate?: (update: BotStatusUpdate) => void;
}

/**
 * Combined real-time hook for dashboard updates
 * This reduces the number of channels and improves performance
 */
export function useRealtimeDashboard({
  onSessionInsert,
  onSessionUpdate,
  onSessionDelete,
  onBotStatusUpdate
}: UseRealtimeDashboardProps = {}) {
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      console.log('🚫 No user ID for realtime dashboard subscription');
      return;
    }

    // Clean up existing channel if any
    if (channelRef.current) {
      console.log('🧹 Cleaning up existing dashboard channel');
      supabase.removeChannel(channelRef.current);
    }

    console.log('📡 Setting up unified realtime dashboard subscription for user:', user.id);

    // Single channel for all dashboard updates
    const channel = supabase
      .channel(`dashboard-${user.id}`, {
        config: {
          presence: { key: user.id },
        }
      })
      // Subscribe to session INSERT events
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🆕 New session created:', payload);
          if (payload.new) {
            onSessionInsert?.(payload.new as Session);
          }
        }
      )
      // Subscribe to session UPDATE events
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Session updated:', payload);
          
          if (payload.new && payload.old) {
            const newSession = payload.new as Session;
            const oldSession = payload.old as Session;
            
            // Handle general session updates
            onSessionUpdate?.(newSession);
            
            // Handle bot status updates specifically
            if (newSession.recall_bot_status !== oldSession.recall_bot_status) {
              const botUpdate: BotStatusUpdate = {
                session_id: newSession.id,
                bot_id: newSession.recall_bot_id,
                status: newSession.recall_bot_status,
                updated_at: newSession.updated_at
              };
              console.log('🤖 Bot status changed:', botUpdate);
              onBotStatusUpdate?.(botUpdate);
            }
          }
        }
      )
      // Subscribe to session DELETE events
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🗑️ Session deleted:', payload);
          if (payload.old) {
            const deletedSession = payload.old as Session;
            onSessionDelete?.(deletedSession.id);
          }
        }
      )
      // Subscribe to bot usage tracking updates
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bot_usage_tracking',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Bot usage tracking update:', payload);
          
          if (payload.new && payload.new.session_id) {
            const update: BotStatusUpdate = {
              session_id: payload.new.session_id,
              bot_id: payload.new.bot_id,
              status: payload.new.status,
              updated_at: payload.new.updated_at
            };
            console.log('✅ Bot usage status changed:', update);
            onBotStatusUpdate?.(update);
          }
        }
      );

    // Subscribe with error handling and timeout management
    const subscriptionTimeout = setTimeout(() => {
      console.warn('⏱️ Dashboard subscription is taking longer than expected...');
      console.log('💡 Real-time updates may be delayed, but the dashboard will still work');
    }, 5000);

    channel.subscribe((status) => {
      clearTimeout(subscriptionTimeout);
      console.log('📡 Dashboard subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time dashboard subscription active');
        setIsConnected(true);
        setConnectionError(null);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('⚠️ Dashboard subscription error - real-time updates may be unavailable');
        console.log('💡 The dashboard will still work, but you may need to refresh to see updates');
        setIsConnected(false);
        setConnectionError('Channel error');
      } else if (status === 'TIMED_OUT') {
        console.warn('⏱️ Dashboard subscription timed out');
        console.log('💡 This can happen with:');
        console.log('   - Slow network connections');
        console.log('   - Firewall blocking WebSocket connections');
        console.log('   - Too many concurrent subscriptions');
        console.log('The dashboard will still work without real-time updates');
        setIsConnected(false);
        setConnectionError('Connection timed out');
      } else if (status === 'CLOSED') {
        console.log('📪 Dashboard subscription closed');
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Cleaning up dashboard subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, onSessionInsert, onSessionUpdate, onSessionDelete, onBotStatusUpdate]);

  return {
    isSubscribed: channelRef.current?.state === 'joined',
    isConnected,
    connectionError
  };
}