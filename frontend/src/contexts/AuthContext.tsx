'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'
import { clearAuthData, isAuthError, handleAuthError } from '@/lib/auth-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  sessionExpiredMessage: string | null
  setSessionExpiredMessage: (message: string | null) => void
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null)

  // Use the configuration status from supabase.ts

  useEffect(() => {
    // Skip auth setup if Supabase is not configured
    if (!isSupabaseConfigured) {
      console.warn('⚠️ Supabase not configured - running in demo mode')
      setLoading(false)
      return
    }

    setLoading(true);
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          // Check if it's a refresh token error or session missing error
          if (error.message?.includes('Refresh Token') || 
              error.message?.includes('refresh token') ||
              error.message?.includes('Auth session missing')) {
            setSessionExpiredMessage('Your session has expired. Please sign in again.')
            // Clear any invalid stored session
            setUser(null)
            setSession(null)
            clearAuthData()
          }
        } else if (initialSession) {
          // Verify the session is actually valid
          try {
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) {
              console.error('Invalid session detected:', userError)
              setUser(null)
              setSession(null)
              
              clearAuthData()
            } else {
              setSession(initialSession)
              setUser(user)
            }
          } catch (verifyError) {
            console.error('Session verification failed:', verifyError)
            setUser(null)
            setSession(null)
          }
        } else {
          // No session found
          setUser(null)
          setSession(null)
        }
      } catch (error) {
        console.error('Error getting session:', error)
        setUser(null)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // setLoading(true) // Optional: indicate loading during auth state change
        
        // Handle different auth events
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully')
          setSessionExpiredMessage(null)
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
          setSessionExpiredMessage(null)
        } else if (event === 'USER_UPDATED') {
          console.log('User updated')
        }
        
        // Handle session errors
        if (!currentSession && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
          // This suggests a token refresh failure
          console.error('Session refresh failed')
          setSessionExpiredMessage('Your session has expired. Please sign in again.')
        }
        
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        if (!currentSession) {
          // Clear expired message on proper logout
          if (event === 'SIGNED_OUT') {
            setSessionExpiredMessage(null)
          }
        }
        setLoading(false) // Auth state change processed
      }
    )

    return () => subscription.unsubscribe()
  }, [isSupabaseConfigured])

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Authentication not configured. Please set up Supabase credentials.' } as AuthError }
    }
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            referral_code: referralCode,
          }
        }
      })
      return { error }
    } catch (error) {
      return { error: { message: 'Authentication service unavailable' } as AuthError }
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Authentication not configured. Please set up Supabase credentials.' } as AuthError }
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (!error) {
        setSessionExpiredMessage(null)
        // Update last login
        try {
          await fetch('/api/auth/update-last-login', { 
            method: 'POST',
            credentials: 'include'
          })
        } catch (err) {
          console.error('Failed to update last login:', err)
        }
      }
      return { error }
    } catch (error) {
      return { error: { message: 'Authentication service unavailable' } as AuthError }
    }
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Authentication not configured. Please set up Supabase credentials.' } as AuthError }
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false
        }
      })
      return { error }
    } catch (error) {
      return { error: { message: 'Authentication service unavailable' } as AuthError }
    }
  }

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) {
      setSessionExpiredMessage(null)
      setUser(null)
      setSession(null)
      return { error: null }
    }
    try {
      // Clear local state first
      setUser(null)
      setSession(null)
      setSessionExpiredMessage(null)
      
      // Clear all auth data
      clearAuthData()
      
      // Attempt to sign out from Supabase
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error('Sign out error:', error)
        // Continue anyway since we've cleared local state
      }
      
      // Redirect to home page after sign out
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
      
      return { error: null }
    } catch (error) {
      // Even on error, clear local state
      setUser(null)
      setSession(null)
      setSessionExpiredMessage(null)
      
      // Clear all auth data
      clearAuthData()
      
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
      
      return { error: null }
    }
  }

  const refreshSession = async () => {
    if (!isSupabaseConfigured) return;
    
    try {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Failed to refresh session:', error);
        if (error.message?.includes('Refresh Token') || error.message?.includes('refresh token')) {
          setSessionExpiredMessage('Your session has expired. Please sign in again.');
          setUser(null);
          setSession(null);
          clearAuthData();
        }
      } else if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        setSessionExpiredMessage(null);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut: handleSignOut,
    sessionExpiredMessage,
    setSessionExpiredMessage,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {sessionExpiredMessage && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-400 p-4 text-yellow-900 shadow-lg z-50 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 mr-3" />
            <span>{sessionExpiredMessage}</span>
          </div>
          <Button 
            onClick={handleSignOut} 
            variant="outline" 
            className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600 hover:border-yellow-700"
          >
            Sign Out
          </Button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 