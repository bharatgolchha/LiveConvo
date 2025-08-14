'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { EmailAuthToggle, BackToGoogleButton } from '@/components/auth/EmailAuthToggle'
import { supabase } from '@/lib/supabase'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isEmailMode, setIsEmailMode] = useState(false)
  const [referralMessage, setReferralMessage] = useState<string | null>(null)
  const { signIn, signInWithGoogle, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get('error')
    const message = searchParams.get('message')
    
    if (error) {
      setError(error)
    } else if (message) {
      setError(message)
    }
    
    // Check for referral code
    const referralCode = localStorage.getItem('ref_code')
    if (referralCode) {
      // Validate and get referrer info
      fetch('/api/referrals/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: referralCode })
      })
        .then(res => res.json())
        .then(data => {
          if (data.valid && data.referrer_name) {
            setReferralMessage(`${data.referrer_name} referred you! Sign up to get 10% off your subscription.`)
          }
        })
        .catch(() => {})
    }
  }, [searchParams])

  // If the user is already authenticated, route them based on onboarding status
  useEffect(() => {
    const handleAuthenticatedRedirect = async () => {
      if (!user) return;
      try {
        // If there is a pending invite token, go to invite acceptance immediately
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('invite_token') : null
          if (token) {
            router.push(`/invite/${token}`)
            return
          }
        } catch {}

        const { data: userProfile } = await supabase
          .from('users')
          .select('has_completed_onboarding')
          .eq('id', user.id)
          .single();

        if (userProfile?.has_completed_onboarding) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        router.push('/dashboard');
      }
    };

    handleAuthenticatedRedirect();
  }, [user, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
    } else {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        const userId = currentSession?.user?.id

        if (userId) {
          const { data: userProfile } = await supabase
            .from('users')
            .select('has_completed_onboarding')
            .eq('id', userId)
            .single()

          if (userProfile?.has_completed_onboarding) {
            router.push('/dashboard')
          } else {
            router.push('/onboarding')
          }
        } else {
          router.push('/dashboard')
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err)
        router.push('/dashboard')
      }
    }
    
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    const { error } = await signInWithGoogle()
    
    if (error) {
      setError(error.message)
    }
    
    setLoading(false)
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      {referralMessage && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6"
        >
          <Alert className="border-green-500/50 bg-green-500/10">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <span className="text-green-700 dark:text-green-400">{referralMessage}</span>
            </div>
          </Alert>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6"
        >
          <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
            {error}
          </Alert>
        </motion.div>
      )}

      {/* Google Sign In - Primary */}
      <AnimatePresence mode="wait">
        {!isEmailMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <GoogleAuthButton
              onClick={handleGoogleLogin}
              loading={loading}
              text="Sign in with Google"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Toggle */}
      <div className="mt-4">
        <EmailAuthToggle
          isEmailMode={isEmailMode}
          onToggle={() => setIsEmailMode(!isEmailMode)}
          toggleText="Sign in with email"
        />
      </div>

      {/* Email Form */}
      <AnimatePresence>
        {isEmailMode && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleEmailLogin}
            className="space-y-6"
          >
            <div>
              <Label htmlFor="email" className="text-foreground text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 h-12 bg-input border-border text-foreground placeholder-muted-foreground focus:border-primary focus:ring-0 rounded-lg"
                placeholder="you@example.com"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-foreground text-sm font-medium">
                Password
              </Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-12 bg-input border-border text-foreground placeholder-muted-foreground focus:border-primary focus:ring-0 rounded-lg"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link 
                href="/auth/recovery" 
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sign in'
              )}
            </Button>

            <BackToGoogleButton onClick={() => setIsEmailMode(false)} />
          </motion.form>
        )}
      </AnimatePresence>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link 
          href="/auth/signup" 
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}