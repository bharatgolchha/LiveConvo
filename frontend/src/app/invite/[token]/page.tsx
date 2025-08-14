'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import Link from 'next/link';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { EmailAuthToggle, BackToGoogleButton } from '@/components/auth/EmailAuthToggle';

interface PageProps {
  params: { token: string };
}

interface InviteInfo {
  email: string;
  role: string;
  organization_name: string;
}

function InvitePageContent({ params }: PageProps) {
  const { token } = params;
  const { session, signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'need_auth' | 'ready' | 'error' | 'done'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('invite_token', token)
          }
        } catch {}
        // Resolve invite metadata for UI/UX
        const resMeta = await fetch(`/api/team/invitations/resolve?token=${encodeURIComponent(token)}`);
        const meta = await resMeta.json();
        if (resMeta.ok) {
          setInviteInfo({ 
            email: meta.email, 
            role: meta.role, 
            organization_name: meta.organization_name 
          });
          setEmail(meta.email); // Pre-fill email
        }

        // If not authenticated, ask to sign in
        if (!session?.access_token) {
          setState('need_auth');
          return;
        }

        // Call accept endpoint
        const res = await fetch('/api/team/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to accept invitation');
          setState('error');
          return;
        }
        setState('done');
          // Clear invite token to avoid loops into onboarding/invite again
          try { if (typeof window !== 'undefined') localStorage.removeItem('invite_token') } catch {}
          // Redirect into dashboard Settings → Team tab
          setTimeout(() => router.replace('/dashboard?tab=settings&settingsTab=team'), 2000);
      } catch (e) {
        console.error(e);
        setError('Unexpected error');
        setState('error');
      }
    };
    run();
  }, [session, token, router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);
    
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      // After sign-in, effect will re-run and process acceptance
      setState('loading');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    const { error: signInError } = await signInWithGoogle();
    
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
    // Note: Google sign-in redirects, so we don't need to handle success here
  };

  if (state === 'loading') {
    return (
      <AuthLayout
        title="Processing invitation..."
        subtitle="Please wait while we set up your access"
      >
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">
            {inviteInfo ? `Joining ${inviteInfo.organization_name}...` : 'Loading invitation details...'}
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (state === 'need_auth') {
    return (
      <AuthLayout
        title={`Join ${inviteInfo?.organization_name || 'Organization'}`}
        subtitle="Sign in to accept your team invitation"
      >
        {/* Invitation Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground text-sm">You're invited to join</h3>
              <p className="font-semibold text-foreground">{inviteInfo?.organization_name}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>Role: <span className="font-medium capitalize">{inviteInfo?.role}</span></span>
                <span>Email: <span className="font-medium">{inviteInfo?.email}</span></span>
              </div>
            </div>
          </div>
        </motion.div>

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

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg"
        >
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Important:</strong> Please sign in with <strong>{inviteInfo?.email}</strong> to accept this invitation.
          </p>
        </motion.div>

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
                onClick={handleGoogleSignIn}
                loading={loading}
                text="Continue with Google"
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
              onSubmit={handleEmailSignIn}
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

              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Sign in and join team'
                )}
              </Button>

              <BackToGoogleButton onClick={() => setIsEmailMode(false)} />
            </motion.form>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link 
            href={`/auth/signup?inviteToken=${encodeURIComponent(token)}&email=${encodeURIComponent(inviteInfo?.email || '')}`}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Create one here
          </Link>
        </p>
      </AuthLayout>
    );
  }

  if (state === 'done') {
    return (
      <AuthLayout
        title="Welcome to the team!"
        subtitle="You've successfully joined the organization"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </motion.div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            You're now part of {inviteInfo?.organization_name}!
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            Redirecting you to your team dashboard...
          </p>
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </motion.div>
      </AuthLayout>
    );
  }

  if (state === 'error') {
    return (
      <AuthLayout
        title="Unable to join team"
        subtitle="There was an issue processing your invitation"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </motion.div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Invitation Error</h3>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => router.push('/')}
              className="w-full"
            >
              Go to Home
            </Button>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  return null;
}

export default function InviteAcceptPage(props: PageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InvitePageContent {...props} />
    </Suspense>
  );
}