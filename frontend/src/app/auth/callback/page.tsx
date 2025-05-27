'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  useEffect(() => {
    const handleAuth = async () => {
      await supabase.auth.getSession()
      router.replace('/dashboard')
    }
    handleAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Signing in...</p>
    </div>
  )
}
