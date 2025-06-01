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
import { Eye, EyeOff, Mail, Lock, Chrome, Mic, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signInWithGoogle, user } = useAuth()
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
    <div className="dark min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
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
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <Mic className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white">
                Live<span className="text-blue-400">Convo</span>
              </h1>
            </div>
            <p className="text-gray-400 text-lg">Welcome back to your AI conversation coach</p>
          </motion.div>
        </div>

        {/* Login Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-gray-800/50 border-gray-700 shadow-2xl backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-semibold text-white">
                  Sign in to your account
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Continue your conversation intelligence journey
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {error && (
                  <Alert className="border-red-500/50 bg-red-500/10 text-red-400">
                    <div className="text-sm">{error}</div>
                  </Alert>
                )}

                {/* Google Login Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-gray-600 bg-gray-800/50 hover:bg-gray-700/50 text-white hover:border-gray-500 transition-all duration-200"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <Chrome className="w-5 h-5 mr-3 text-blue-400" />
                  <span className="font-medium">Continue with Google</span>
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gray-800/50 text-gray-400">Or continue with email</span>
                  </div>
                </div>

                {/* Email Login Form */}
                <form onSubmit={handleEmailLogin} className="space-y-5">
                  <div>
                    <Label htmlFor="email" className="text-gray-300 font-medium">
                      Email address
                    </Label>
                    <div className="mt-2 relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-11 h-12 bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-gray-300 font-medium">
                      Password
                    </Label>
                    <div className="mt-2 relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-11 pr-11 h-12 bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
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
                        className="h-4 w-4 text-blue-500 focus:ring-blue-500 bg-gray-900 border-gray-600 rounded"
                      />
                      <label htmlFor="remember-me" className="ml-2 text-sm text-gray-400">
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm">
                      <Link
                        href="/auth/forgot-password"
                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
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
                  <p className="text-sm text-gray-400">
                    Don't have an account?{' '}
                    <Link
                      href="/auth/signup"
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
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
          <p className="text-sm text-gray-500">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
} 