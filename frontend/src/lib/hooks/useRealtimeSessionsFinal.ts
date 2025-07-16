import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Session } from './useSessions';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeSessionsFinalProps {
  onChange?: (session: Session, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
}

/**
 * Final real-time implementation using a dedicated client
 */
export function useRealtimeSessionsFinal({
  onChange
}: UseRealtimeSessionsFinalProps = {}) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  
  // Stable callback ref
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    // Prevent multiple subscriptions for the same user
    if (isSubscribingRef.current && userIdRef.current === user.id) {
      return;
    }

    let mounted = true;
    isSubscribingRef.current = true;
    userIdRef.current = user.id;

    const setupRealtime = async () => {
      try {
        // Clean up any existing channel first
        if (channelRef.current) {
          console.log('🧹 Cleaning up existing channel');
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
          setIsConnected(false);
        }

        if (!mounted) return;

        console.log('🎯 Setting up final realtime for user:', user.id);

        // Create a unique channel name to avoid conflicts
        const channelName = `user-sessions-${user.id}-${Date.now()}`;
        
        // Create channel with user-specific filtering
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'sessions',
              filter: `user_id=eq.${user.id}`
            },
            (payload: RealtimePostgresChangesPayload<Session>) => {
              const session = (payload.new || payload.old) as Session;
              
              if (session) {
                console.log(`📨 Session ${payload.eventType}:`, session.id);
                
                if (payload.eventType === 'INSERT' && payload.new) {
                  onChangeRef.current?.(payload.new as Session, 'INSERT');
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                  onChangeRef.current?.(payload.new as Session, 'UPDATE');
                } else if (payload.eventType === 'DELETE' && payload.old) {
                  onChangeRef.current?.(payload.old as Session, 'DELETE');
                }
              }
            }
          );

        // Subscribe and wait for connection
        channel.subscribe((status) => {
          console.log('📡 Final subscription status:', status);
          
          if (mounted) {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Final real-time connected!');
              setIsConnected(true);
              channelRef.current = channel;
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('❌ Final subscription failed:', status);
              setIsConnected(false);
              channelRef.current = null;
            } else if (status === 'CLOSED') {
              console.log('📪 Final subscription closed');
              setIsConnected(false);
              channelRef.current = null;
            }
          }
        });

      } catch (error) {
        console.error('❌ Error setting up real-time:', error);
        setIsConnected(false);
        channelRef.current = null;
      } finally {
        isSubscribingRef.current = false;
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (channelRef.current) {
        console.log('🧹 Cleaning up final subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
      isSubscribingRef.current = false;
      userIdRef.current = null;
    };
  }, [user?.id]);

  return { isConnected };
}