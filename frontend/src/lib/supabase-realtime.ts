import { createClient } from '@supabase/supabase-js';

// Create a dedicated Supabase client for real-time connections
// This prevents connection issues from multiple client instances
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton instance for real-time
let realtimeClient: ReturnType<typeof createClient> | null = null;

export function getRealtimeClient() {
  if (!realtimeClient) {
    console.log('🔌 Creating dedicated real-time Supabase client');
    
    realtimeClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
          heartbeat: { interval: 30 },
        },
        heartbeatIntervalMs: 30000,
        timeout: 20000, // 20 second timeout
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-realtime-dashboard'
        }
      }
    });
  }
  
  return realtimeClient;
}

// Clean up function for hot module reloading
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-expect-error - module.hot is not available in TypeScript types but exists in webpack HMR
  if (module.hot) {
    // @ts-expect-error - module.hot.dispose is a webpack HMR API that's not in TypeScript types
    module.hot.dispose(() => {
      if (realtimeClient) {
        console.log('🧹 Cleaning up real-time client for HMR');
        realtimeClient.removeAllChannels();
        realtimeClient = null;
      }
    });
  }
}