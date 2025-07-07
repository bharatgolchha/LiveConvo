'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, ArrowRight, PlayCircle, Loader2 } from 'lucide-react'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

interface LandingAuthSectionProps {
  variant?: 'hero' | 'cta'
  className?: string
}

export function LandingAuthSection({ variant = 'hero', className = '' }: LandingAuthSectionProps) {
  const router = useRouter()
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = React.useState(false)

  const handleGoogleSignUp = async () => {
    setLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      console.error('Google sign up error:', error)
    }
    setLoading(false)
  }

  if (variant === 'hero') {
    return (
      <div className={`flex justify-center items-center ${className}`}>
        {/* Google Auth Button - Custom Design */}
        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-medium text-foreground bg-card hover:bg-muted border border-border rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin relative" />
          ) : (
            <>
              <svg className="w-5 h-5 relative" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="relative">Continue with Google</span>
            </>
          )}
        </button>
      </div>
    )
  }

  // CTA variant for bottom of page
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`rounded-xl p-8 bg-card/80 border border-border ${className}`}
    >
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-4 text-foreground">
          Start closing more deals today
        </h3>
        <p className="text-muted-foreground mb-2">
          Join 500+ professionals using AI to win conversations
        </p>
        <p className="text-sm text-muted-foreground">
          ⏱️ Setup takes less than 2 minutes • No credit card required
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <GoogleAuthButton
          onClick={handleGoogleSignUp}
          loading={loading}
          text="Continue with Google"
          variant="primary"
        />
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-card text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          onClick={() => router.push('/auth/signup')}
          variant="outline"
          className="w-full h-12 text-foreground"
        >
          Sign up with email
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>

      <div className="mt-8 pt-8 border-t border-border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-app-success">35%</p>
            <p className="text-xs text-muted-foreground">Higher close rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-app-info">&lt;2s</p>
            <p className="text-xs text-muted-foreground">Response time</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-app-success">2hrs</p>
            <p className="text-xs text-muted-foreground">Saved per week</p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Check className="w-4 h-4 text-app-success" />
          <span>Free plan included</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Check className="w-4 h-4 text-app-success" />
          <span>No credit card required</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Check className="w-4 h-4 text-app-success" />
          <span>Cancel anytime</span>
        </div>
      </div>

      <p className="text-xs text-center mt-6 text-muted-foreground">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </p>
    </motion.div>
  )
}