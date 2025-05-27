import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
const isConfigured = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url_here' &&
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  !supabaseUrl.includes('missing') &&
  !supabaseAnonKey.includes('missing')

if (!isConfigured) {
  console.warn('⚠️ Supabase not configured - running in demo mode')
  console.warn('To enable authentication, update .env.local with real Supabase credentials')
}

// Create Supabase client with valid fallback values
export const supabase = createClient(
  isConfigured ? supabaseUrl! : 'https://demo.supabase.co', 
  isConfigured ? supabaseAnonKey! : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDI3Nzk5OTksImV4cCI6MTk1ODM1NTk5OX0.SdWsznZWxJ7yYF8eMnFKxR-uWwWKFbQBzEGfMz9QCN8', 
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

// Export configuration status
export const isSupabaseConfigured = isConfigured 