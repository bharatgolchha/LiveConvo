'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'

export default function AuthRecoveryPage() {
  const router = useRouter()

  useEffect(() => {
    // Clear all auth-related data from localStorage
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key)
        }
      })
      
      // Also clear sessionStorage
      const sessionKeys = Object.keys(sessionStorage)
      sessionKeys.forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          sessionStorage.removeItem(key)
        }
      })
    }
  }, [])

  const handleContinue = () => {
    // Force reload to ensure clean state
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full px-6">
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-yellow-100 dark:bg-yellow-900/20 rounded-full p-3">
              <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Authentication Error
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            We encountered an issue with your authentication session. This page has cleared your local auth data to help you recover.
          </p>
          
          <div className="space-y-4">
            <Button 
              onClick={handleContinue}
              className="w-full"
              size="lg"
            >
              Return to Homepage
            </Button>
            
            <Button 
              onClick={() => router.push('/signin')}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Go to Sign In
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-6">
            If you continue to experience issues, please try clearing your browser cache or using a different browser.
          </p>
        </div>
      </div>
    </div>
  )
}