import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useMeetingContext } from '../context/MeetingContext';

export function useMeetingRealtimeSync(meetingId: string) {
  const { meeting, setMeeting } = useMeetingContext();

  useEffect(() => {
    if (!meetingId) return;

    console.log('🔌 Setting up enhanced realtime subscription for meeting:', meetingId.substring(0, 8));

    // Subscribe to changes in the sessions table for this specific meeting
    const subscription = supabase
      .channel(`meeting-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${meetingId}`
        },
        (payload) => {
          console.log('📡 Session realtime update received:', payload);
          
          // Update meeting with new data
          if (payload.new) {
            const updates = payload.new as any;
            
            // If recall_bot_id was updated, update the meeting
            if (updates.recall_bot_id !== undefined && meeting) {
              console.log('🤖 Bot ID updated:', updates.recall_bot_id);
              setMeeting({
                ...meeting,
                botId: updates.recall_bot_id
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Enhanced subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Enhanced realtime subscription active for meeting:', meetingId.substring(0, 8));
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ Enhanced realtime subscription failed for meeting:', meetingId.substring(0, 8));
        }
      });

    return () => {
      console.log('🔌 Cleaning up enhanced realtime subscription');
      subscription.unsubscribe();
    };
  }, [meetingId, meeting, setMeeting]);
}