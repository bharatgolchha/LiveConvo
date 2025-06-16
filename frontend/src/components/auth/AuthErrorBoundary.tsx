'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';
import { isAuthError, clearAuthData } from '@/lib/auth-utils';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AuthErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's an auth error using our utility
    if (isAuthError(error)) {
      // Clear auth data immediately
      clearAuthData();
      return { hasError: true, error };
    }
    return { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth error caught by boundary:', error, errorInfo);
    
    // If it's an auth error, redirect to recovery page
    if (this.state.hasError && isAuthError(error)) {
      setTimeout(() => {
        window.location.href = '/auth/recovery';
      }, 1000);
    }
  }

  handleClearSession = () => {
    // Clear all auth-related storage using our utility
    clearAuthData();
    // Redirect to recovery page
    window.location.href = '/auth/recovery';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-card border border-border rounded-lg shadow-lg p-6 text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Authentication Error
              </h2>
              
              <p className="text-muted-foreground mb-6">
                Your session has expired or become invalid. Please sign in again to continue.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={this.handleClearSession}
                  className="w-full"
                  variant="primary"
                >
                  Sign In Again
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full"
                >
                  Go to Homepage
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground mt-4">
                Error: {this.state.error?.message || 'Invalid authentication token'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}