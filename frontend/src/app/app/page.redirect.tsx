'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Redirect component for old /app route
 * Redirects to the new conversation page structure
 */
export default function AppRedirect() {
  const router = useRouter();
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      // Create a new session and redirect to it
      router.replace('/dashboard');
    } else {
      // Not authenticated, go to login
      router.replace('/auth/login');
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to the new interface...</p>
      </div>
    </div>
  );
}