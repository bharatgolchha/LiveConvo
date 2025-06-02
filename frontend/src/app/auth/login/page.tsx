'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Alert } from "@/components/ui/alert"
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Eye, EyeOff, Mail, Lock, Chrome, Mic, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signInWithGoogle, user } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email, password)
    
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
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
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(to bottom right, #030712, #111827, #030712)' }}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <img 
                src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//dark.png"
                alt="liveprompt.ai logo"
                className="w-12 h-12 object-contain"
              />
              <h1 className="text-4xl font-bold" style={{ fontFamily: 'var(--font-poppins)', color: '#ffffff' }}>liveprompt.ai</h1>
            </div>
            <p className="text-lg" style={{ color: '#9ca3af' }}>Welcome back to your AI conversation coach</p>
          </motion.div>
        </div>

        {/* Login Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="shadow-2xl backdrop-blur-sm" style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', borderColor: '#374151' }}>
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-semibold" style={{ color: '#ffffff' }}>
                  Sign in to your account
                </CardTitle>
                <CardDescription style={{ color: '#9ca3af' }}>
                  Continue your conversation intelligence journey
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {error && (
                  <Alert className="text-sm" style={{ border: '1px solid rgba(239, 68, 68, 0.5)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
                    <div className="text-sm">{error}</div>
                  </Alert>
                )}

                {/* Google Login Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 transition-all duration-200"
                  style={{ 
                    border: '1px solid #4b5563', 
                    backgroundColor: 'rgba(31, 41, 55, 0.5)', 
                    color: '#ffffff' 
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.5)';
                    e.currentTarget.style.borderColor = '#6b7280';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(31, 41, 55, 0.5)';
                    e.currentTarget.style.borderColor = '#4b5563';
                  }}
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <Chrome className="w-5 h-5 mr-3" style={{ color: '#60a5fa' }} />
                  <span className="font-medium">Continue with Google</span>
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: '#4b5563' }} />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4" style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', color: '#9ca3af' }}>Or continue with email</span>
                  </div>
                </div>

                {/* Email Login Form */}
                <form onSubmit={handleEmailLogin} className="space-y-5">
                  <div>
                    <Label htmlFor="email" className="font-medium" style={{ color: '#d1d5db' }}>
                      Email address
                    </Label>
                    <div className="mt-2 relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-11 h-12 focus:ring-blue-500/20"
                        style={{ 
                          backgroundColor: 'rgba(17, 24, 39, 0.5)', 
                          border: '1px solid #4b5563', 
                          color: '#ffffff'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#4b5563'}
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password" className="font-medium" style={{ color: '#d1d5db' }}>
                      Password
                    </Label>
                    <div className="mt-2 relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-11 pr-11 h-12 focus:ring-blue-500/20"
                        style={{ 
                          backgroundColor: 'rgba(17, 24, 39, 0.5)', 
                          border: '1px solid #4b5563', 
                          color: '#ffffff'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#4b5563'}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
                        style={{ color: '#9ca3af' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#d1d5db'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 rounded"
                        style={{ 
                          color: '#3b82f6', 
                          backgroundColor: '#111827', 
                          borderColor: '#4b5563'
                        }}
                      />
                      <label htmlFor="remember-me" className="ml-2 text-sm" style={{ color: '#9ca3af' }}>
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm">
                      <Link
                        href="/auth/forgot-password"
                        className="font-medium transition-colors"
                        style={{ color: '#60a5fa' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#93c5fd'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#60a5fa'}
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Signing in...
                      </div>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </form>

                {/* Sign up link */}
                <div className="text-center">
                  <p className="text-sm" style={{ color: '#9ca3af' }}>
                    Don't have an account?{' '}
                    <Link
                      href="/auth/signup"
                      className="font-medium transition-colors"
                      style={{ color: '#60a5fa' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#93c5fd'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#60a5fa'}
                    >
                      Sign up now
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-sm" style={{ color: '#6b7280' }}>
            By signing in, you agree to our{' '}
            <Link 
              href="/terms" 
              className="transition-colors"
              style={{ color: '#60a5fa' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#93c5fd'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#60a5fa'}
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link 
              href="/privacy" 
              className="transition-colors"
              style={{ color: '#60a5fa' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#93c5fd'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#60a5fa'}
            >
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
} 