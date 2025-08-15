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

// Removed invite banner to keep signup generic and simple per product decision

function SignUpPageContent() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | React.ReactNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isEmailMode, setIsEmailMode] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const { signUp, signInWithGoogle, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    // Check URL params for referral code and invite token
    const refFromUrl = searchParams.get('ref')
    const emailFromUrl = searchParams.get('email')

    if (refFromUrl) {
      setReferralCode(refFromUrl)
      try { localStorage.setItem('ref_code', refFromUrl) } catch {}
    } else {
      const storedRef = typeof window !== 'undefined' ? localStorage.getItem('ref_code') : null
      if (storedRef) setReferralCode(storedRef)
    }

    // No invite handling on signup; onboarding will detect invites by email if relevant

    if (emailFromUrl) {
      setEmail(emailFromUrl)
    }
  }, [searchParams])

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await signUp(email, password, fullName, referralCode || undefined)
    
    if (error) {
      setError(error.message)
    } else {
      // Always direct to login with verification message after email signup
      // Clear any stale invite token to avoid redirect loops back to signup
      try { if (typeof window !== 'undefined') localStorage.removeItem('invite_token') } catch {}
      router.push('/auth/login?message=Check your email to confirm your account')
    }
    
    setLoading(false)
  }

  const handleGoogleSignUp = async () => {
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy')
      return
    }

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
      title="Create your account"
      subtitle="Join the future of AI-powered conversations"
    >

      {/* Signup remains clean; invites are handled during onboarding */}

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

      {/* Terms Agreement */}
      <div className="mb-6">
        <div className="flex items-start">
          <input
            id="agree-terms"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="h-4 w-4 mt-0.5 bg-input border-border rounded text-primary focus:ring-0 focus:ring-offset-0"
          />
          <label htmlFor="agree-terms" className="ml-3 text-sm text-muted-foreground">
            I agree to the{' '}
            <Link href="/terms" className="text-primary hover:text-primary/80">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary hover:text-primary/80">
              Privacy Policy
            </Link>
          </label>
        </div>
      </div>

      {/* Google Sign Up - Primary */}
      <AnimatePresence mode="wait">
        {!isEmailMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <GoogleAuthButton
              onClick={handleGoogleSignUp}
              loading={loading}
              text="Sign up with Google"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Toggle */}
      <div className="mt-4">
        <EmailAuthToggle
          isEmailMode={isEmailMode}
          onToggle={() => setIsEmailMode(!isEmailMode)}
          toggleText="Sign up with email"
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
            onSubmit={handleEmailSignUp}
            className="space-y-5"
          >
            <div>
              <Label htmlFor="fullName" className="text-foreground text-sm font-medium">
                Full name
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-2 h-12 bg-input border-border text-foreground placeholder-muted-foreground focus:border-primary focus:ring-0 rounded-lg"
                placeholder="John Doe"
                autoFocus
              />
            </div>

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
                  placeholder="Create a password"
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

            <div>
              <Label htmlFor="confirmPassword" className="text-foreground text-sm font-medium">
                Confirm password
              </Label>
              <div className="relative mt-2">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 pr-12 bg-input border-border text-foreground placeholder-muted-foreground focus:border-primary focus:ring-0 rounded-lg"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
              disabled={loading || !agreedToTerms}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Create account'
              )}
            </Button>

            <BackToGoogleButton onClick={() => setIsEmailMode(false)} />
          </motion.form>
        )}
      </AnimatePresence>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link 
          href="/auth/login" 
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpPageContent />
    </Suspense>
  )
}