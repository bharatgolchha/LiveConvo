import { useEffect, useRef, useState, useCallback } from 'react';
import { getRealtimeClient } from '@/lib/supabase-realtime';
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
  
  // Stable callback ref
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!user?.id || isSubscribingRef.current) {
      return;
    }

    let mounted = true;
    isSubscribingRef.current = true;

    const setupRealtime = async () => {
      try {
        // Clean up any existing channel
        if (channelRef.current) {
          console.log('🧹 Cleaning up existing channel');
          const client = getRealtimeClient();
          client.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        if (!mounted) return;

        console.log('🎯 Setting up final realtime for user:', user.id);

        // Get auth session for the real-time client
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession) {
          console.error('❌ No auth session available');
          return;
        }

        // Set the auth token on the real-time client
        const realtimeClient = getRealtimeClient();
        await realtimeClient.auth.setSession({
          access_token: authSession.access_token,
          refresh_token: authSession.refresh_token,
        });

        if (!mounted) return;

        // Create channel with a simple name
        const channel = realtimeClient
          .channel('sessions-dashboard')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'sessions'
            },
            (payload: RealtimePostgresChangesPayload<Session>) => {
              const session = (payload.new || payload.old) as Session;
              
              if (session && session.user_id === user.id) {
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
            } else if (status === 'CLOSED') {
              console.log('📪 Final subscription closed');
              setIsConnected(false);
            }
          }
        });

      } catch (error) {
        console.error('❌ Error setting up real-time:', error);
        setIsConnected(false);
      } finally {
        isSubscribingRef.current = false;
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (channelRef.current) {
        console.log('🧹 Cleaning up final subscription');
        const client = getRealtimeClient();
        client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      isSubscribingRef.current = false;
    };
  }, [user?.id]);

  return { isConnected };
}