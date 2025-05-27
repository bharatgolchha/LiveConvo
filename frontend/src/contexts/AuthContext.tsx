'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  sessionExpiredMessage: string | null
  setSessionExpiredMessage: (message: string | null) => void
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
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
      } catch (error) {
        console.error('Error getting session:', error)
        // setUser and setSession remain null
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // setLoading(true) // Optional: indicate loading during auth state change
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        if (!currentSession) {
          // If user explicitly signs out or session becomes null,
          // this is not necessarily an "expired" session from an API call perspective.
          // We might want to clear the message, or let API call failures handle it.
          // For now, clearing it here ensures a clean state on logout.
          setSessionExpiredMessage(null)
        }
        setLoading(false) // Auth state change processed
      }
    )

    return () => subscription.unsubscribe()
  }, [isSupabaseConfigured])

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Authentication not configured. Please set up Supabase credentials.' } as any }
    }
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })
      return { error }
    } catch (error) {
      return { error: { message: 'Authentication service unavailable' } as any }
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Authentication not configured. Please set up Supabase credentials.' } as any }
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (!error) {
        setSessionExpiredMessage(null)
      }
      return { error }
    } catch (error) {
      return { error: { message: 'Authentication service unavailable' } as any }
    }
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Authentication not configured. Please set up Supabase credentials.' } as any }
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      return { error }
    } catch (error) {
      return { error: { message: 'Authentication service unavailable' } as any }
    }
  }

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) {
      setSessionExpiredMessage(null)
      return { error: null }
    }
    try {
      const { error } = await supabase.auth.signOut()
      setSessionExpiredMessage(null)
      if (error) {
        console.error('Sign out error:', error)
      }
      return { error }
    } catch (error) {
      setSessionExpiredMessage(null)
      return { error: { message: 'Sign out failed' } as any }
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