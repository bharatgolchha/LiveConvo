import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL')
  }
  
  // If service role key is not available, return null
  // This allows the app to still function with proper RLS policies
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set - some operations may be restricted')
    return null
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function createAuthenticatedServerClient(accessToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  // Create client with auth header if token provided
  const options: any = {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
  
  if (accessToken) {
    options.global = {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, options)
  
  // If we have a token, set it for the session
  if (accessToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '' // We don't have/need the refresh token for API calls
    })
  }
  
  return supabase
}