import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

// Server-side Supabase client for API routes
export const createServerSupabaseClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase configuration for server-side client')
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Create a Supabase client with user's auth token for API routes
export const createAuthenticatedSupabaseClient = (token: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })
}

// Export configuration status
export const isSupabaseConfigured = isConfigured 