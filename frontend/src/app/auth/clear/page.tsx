'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function clearSupabaseCookies() {
  if (typeof document === 'undefined') return
  const cookies = document.cookie.split(';')
  cookies.forEach((c) => {
    const [name] = c.split('=')
    if (name && name.trim().includes('sb-')) {
      document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    }
  })
}

export default function ClearAuthPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      try {
        // Best-effort sign out
        await supabase.auth.signOut()
      } catch {}

      try {
        // Clear local storage/session storage
        if (typeof window !== 'undefined') {
          localStorage.clear()
          sessionStorage.clear()
        }
      } catch {}

      try {
        clearSupabaseCookies()
      } catch {}

      router.replace('/auth/login')
    }
    run()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm opacity-70">Clearing auth…</div>
    </div>
  )
}


