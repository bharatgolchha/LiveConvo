'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Simple referral code generator for fallback
function generateSimpleReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Signing in...')

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Small delay to ensure Supabase has processed the auth callback
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // First, check if we need to exchange the code for a session
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const searchParams = new URLSearchParams(window.location.search)
        
        // Clear sensitive data from URL immediately after reading
        if (window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname)
        }
        
        // Check for error in URL parameters
        const error_description = hashParams.get('error_description') || searchParams.get('error_description')
        if (error_description) {
          console.error('OAuth error:', error_description)
          // Check if it's the specific database error
          if (error_description.includes('Database error saving new user')) {
            console.error('User creation failed in database trigger. This might be due to email conflict or trigger error.')
          }
          router.replace(`/auth/login?error=${encodeURIComponent(error_description)}`)
          return
        }

        // Get the current session
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
          
          // Process referral code for OAuth signups
          const referralCode = localStorage.getItem('ref_code')
          if (referralCode && session.user.id) {
            try {
              // Check if this is a new user or doesn't have a referrer yet
              const { data: userData } = await supabase
                .from('users')
                .select('created_at, referral_code, referred_by_user_id')
                .eq('id', session.user.id)
                .single()
              
              if (userData) {
                // Process referral if user doesn't have a referrer yet
                // Remove time restriction as it's unreliable
                if (!userData.referred_by_user_id) {
                  const response = await fetch('/api/referrals/process', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ 
                      referral_code: referralCode,
                      device_id: null 
                    }),
                  })
                  
                  if (response.ok) {
                    // Clear the referral code after successful processing
                    localStorage.removeItem('ref_code')
                    console.log('Referral code processed successfully')
                  }
                }
              }
            } catch (error) {
              console.error('Error processing referral:', error)
              // Don't block the auth flow for referral errors
            }
          }
        }

        // Check if we have a valid session before checking onboarding
        if (!session) {
          router.replace('/auth/login?error=No valid session')
          return
        }

        // Check if user has completed onboarding
        // Retry logic to handle race condition with database trigger
        let userData = null
        let userError = null
        let retryCount = 0
        const maxRetries = 3
        const retryDelay = 1000 // 1 second

        while (retryCount < maxRetries && !userData) {
          const { data, error } = await supabase
            .from('users')
            .select('has_completed_onboarding, referral_code')
            .eq('id', session.user.id)
            .single()

          if (!error && data) {
            userData = data
            break
          }

          userError = error
          retryCount++

          if (retryCount < maxRetries) {
            // Wait before retrying to give the trigger time to complete
            await new Promise(resolve => setTimeout(resolve, retryDelay))
          }
        }

        if (!userData && userError) {
          // If user doesn't exist after retries, create as fallback
          if (userError.code === 'PGRST116' || userError.message?.includes('Row not found')) {
            // Attempt to create the user record as a fallback
            const { data: createdUser, error: createError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || null,
                referral_code: generateSimpleReferralCode(),
                has_completed_onboarding: false,
                has_completed_organization_setup: false,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single()
            
            if (createError) {
              // If it's a conflict error (user already exists), try to fetch again
              if (createError.code === '23505' || createError.message?.includes('duplicate')) {
                const { data: existingUser, error: fetchError } = await supabase
                  .from('users')
                  .select('has_completed_onboarding, referral_code')
                  .eq('id', session.user.id)
                  .single()
                
                if (!fetchError && existingUser) {
                  userData = existingUser
                } else {
                  router.replace('/auth/login?error=User profile creation failed. Please try again.')
                  return
                }
              } else {
                router.replace('/auth/login?error=User profile creation failed. Please try again.')
                return
              }
            } else {
              userData = createdUser
            }
          } else {
            // Other types of errors
            router.replace('/auth/login?error=Unable to access user profile. Please try again.')
            return
          }
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
