import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useTestRealtime() {
  useEffect(() => {
    console.log('🧪 Testing Supabase real-time connection...');
    
    // Test with a simple channel
    const channel = supabase
      .channel('test-channel')
      .on('presence', { event: 'sync' }, () => {
        console.log('✅ Presence sync working');
      })
      .subscribe((status) => {
        console.log('🧪 Test channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time connection is working!');
          
          // Clean up after successful test
          setTimeout(() => {
            console.log('🧹 Cleaning up test channel');
            supabase.removeChannel(channel);
          }, 1000);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('⚠️ Real-time connection issue:', status);
          console.log('💡 Possible solutions:');
          console.log('   1. Check if Supabase real-time is enabled for your project');
          console.log('   2. Check if your network allows WebSocket connections');
          console.log('   3. Try refreshing the page');
          console.log('   4. Check Supabase dashboard for real-time settings');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}