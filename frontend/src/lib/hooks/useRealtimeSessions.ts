import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Session } from './useSessions';

interface UseRealtimeSessionsProps {
  onSessionInsert?: (session: Session) => void;
  onSessionUpdate?: (session: Session) => void;
  onSessionDelete?: (sessionId: string) => void;
}

export function useRealtimeSessions({
  onSessionInsert,
  onSessionUpdate,
  onSessionDelete
}: UseRealtimeSessionsProps = {}) {
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id) {
      console.log('🚫 No user ID for realtime sessions subscription');
      return;
    }

    // Clean up existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log('📡 Setting up realtime sessions subscription for user:', user.id);

    // Subscribe to all session changes for the user
    const channel = supabase
      .channel(`sessions-${user.id}`)
      // Subscribe to INSERT events
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
            const newSession = payload.new as Session;
            onSessionInsert?.(newSession);
          }
        }
      )
      // Subscribe to UPDATE events
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
          
          if (payload.new) {
            const updatedSession = payload.new as Session;
            onSessionUpdate?.(updatedSession);
          }
        }
      )
      // Subscribe to DELETE events
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
      .subscribe((status) => {
        console.log('📡 Sessions subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time sessions subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Real-time sessions subscription error:', status);
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Real-time sessions subscription timed out - this is normal if there are many subscriptions');
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Cleaning up sessions subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, onSessionInsert, onSessionUpdate, onSessionDelete]);

  return {
    isSubscribed: channelRef.current?.state === 'joined'
  };
}