'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Signing in...')

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth error:', error)
          router.replace('/auth/login?error=Authentication failed')
          return
        }

        if (session?.user?.email) {
          setStatus('Verifying access...')
          
          // Check if user is on approved waitlist
          const waitlistResponse = await fetch('/api/auth/check-waitlist', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: session.user.email }),
          })

          const waitlistData = await waitlistResponse.json()

          if (!waitlistResponse.ok || !waitlistData.isApproved) {
            // Sign out the user and redirect with error
            await supabase.auth.signOut()
            router.replace('/auth/login?error=This email is not on our approved waitlist. Please contact support.')
            return
          }
        }

        // Check if user has completed onboarding
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('has_completed_onboarding')
          .eq('id', session.user.id)
          .single()

        if (userError) {
          console.error('Error fetching user data:', userError)
          router.replace('/dashboard')
          return
        }

        // Redirect based on onboarding status
        if (userData?.has_completed_onboarding) {
          router.replace('/dashboard')
        } else {
          router.replace('/onboarding')
        }
      } catch (error) {
        console.error('Callback error:', error)
        router.replace('/auth/login?error=Authentication failed')
      }
    }
    
    handleAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">{status}</p>
      </div>
    </div>
  )
}
