import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface BotStatusUpdate {
  session_id: string;
  bot_id: string;
  status: string;
  updated_at: string;
}

interface UseRealtimeBotStatusProps {
  onStatusUpdate?: (update: BotStatusUpdate) => void;
}

export function useRealtimeBotStatus({ onStatusUpdate }: UseRealtimeBotStatusProps = {}) {
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      console.log('🚫 No user ID for realtime bot status subscription');
      return;
    }

    // Prevent duplicate subscribe for the same user
    if (isSubscribingRef.current && userIdRef.current === user.id) {
      return;
    }

    let mounted = true;
    isSubscribingRef.current = true;
    userIdRef.current = user.id;

    // Clean up existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('📡 Setting up realtime bot status subscription for user:', user.id);

    // Subscribe to bot status updates for the user's sessions
    const channel = supabase
      .channel(`bot-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Bot status update received:', payload);
          
          // Check if recall_bot_status changed
          if (payload.new && payload.old && 
              payload.new.recall_bot_status !== payload.old.recall_bot_status) {
            
            const update: BotStatusUpdate = {
              session_id: payload.new.id,
              bot_id: payload.new.recall_bot_id,
              status: payload.new.recall_bot_status,
              updated_at: payload.new.updated_at
            };
            
            console.log('✅ Bot status changed:', update);
            onStatusUpdate?.(update);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bot_usage_tracking',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Bot usage tracking update received:', payload);
          
          if (payload.new && payload.new.session_id) {
            const update: BotStatusUpdate = {
              session_id: payload.new.session_id,
              bot_id: payload.new.bot_id,
              status: payload.new.status,
              updated_at: payload.new.updated_at
            };
            
            console.log('✅ Bot usage status changed:', update);
            onStatusUpdate?.(update);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Bot status subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribingRef.current = false;
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Cleaning up bot status subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      isSubscribingRef.current = false;
      userIdRef.current = null;
    };
  }, [user?.id, onStatusUpdate]);

  return {
    // Expose channel status if needed
    isSubscribed: channelRef.current?.state === 'joined'
  };
}